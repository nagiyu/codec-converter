#!/usr/bin/env node
/**
 * Batch worker for video codec conversion
 *
 * This script is executed by AWS Batch to perform video transcoding.
 * It downloads a video from S3, converts it using ffmpeg, and uploads
 * the result back to S3 while updating DynamoDB with progress.
 *
 * Environment variables expected:
 * - INPUT_S3_BUCKET: Source S3 bucket
 * - INPUT_S3_KEY: Source S3 object key
 * - OUTPUT_S3_BUCKET: Destination S3 bucket
 * - OUTPUT_S3_KEY: Destination S3 object key
 * - TARGET_CODEC: Target video codec (h264, vp9, av1, hevc)
 * - JOB_ID: Conversion job ID for DynamoDB updates
 * - DYNAMODB_TABLE: DynamoDB table name
 * - AWS_REGION: AWS region
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

interface WorkerEnvironment {
    INPUT_S3_BUCKET: string;
    INPUT_S3_KEY: string;
    OUTPUT_S3_BUCKET: string;
    OUTPUT_S3_KEY: string;
    TARGET_CODEC: string;
    JOB_ID: string;
    DYNAMODB_TABLE: string;
    AWS_REGION: string;
}

type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

// Codec configuration mapping
const CODEC_CONFIG: Record<string, { encoder: string; extension: string }> = {
    h264: { encoder: 'libx264', extension: 'mp4' },
    hevc: { encoder: 'libx265', extension: 'mp4' },
    vp9: { encoder: 'libvpx-vp9', extension: 'webm' },
    av1: { encoder: 'libaom-av1', extension: 'webm' },
};

// Temporary directory for processing
const WORK_DIR = '/tmp/worker';

// ffmpeg reports time in microseconds
const MICROSECONDS_PER_SECOND = 1_000_000;

// Progress update interval (percentage) to avoid excessive DynamoDB writes
const PROGRESS_UPDATE_INTERVAL = 10;

/**
 * Update the job status in DynamoDB
 */
async function updateJobStatus(
    docClient: DynamoDBDocumentClient,
    tableName: string,
    jobId: string,
    status: JobStatus,
    additionalAttributes: Record<string, unknown> = {}
): Promise<void> {
    const now = new Date().toISOString();
    const updateExpressionParts: string[] = ['#status = :status'];
    const expressionAttributeNames: Record<string, string> = { '#status': 'status' };
    const expressionAttributeValues: Record<string, unknown> = { ':status': status };

    if (status === 'running') {
        updateExpressionParts.push('started_at = :started_at');
        expressionAttributeValues[':started_at'] = now;
    }

    if (status === 'succeeded' || status === 'failed') {
        updateExpressionParts.push('finished_at = :finished_at');
        expressionAttributeValues[':finished_at'] = now;
    }

    for (const [key, value] of Object.entries(additionalAttributes)) {
        const attrName = `#${key}`;
        const attrValue = `:${key}`;
        updateExpressionParts.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
    }

    const command = new UpdateCommand({
        TableName: tableName,
        Key: {
            DataType: 'ConversionJob',
            id: jobId,
        },
        UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
    });

    await docClient.send(command);
    console.log(`Updated job ${jobId} status to ${status}`);
}

/**
 * Download a file from S3 to local disk
 */
async function downloadFromS3(
    s3Client: S3Client,
    bucket: string,
    key: string,
    localPath: string
): Promise<void> {
    console.log(`Downloading s3://${bucket}/${key} to ${localPath}`);

    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
        throw new Error('Empty response body from S3');
    }

    // The AWS SDK v3 returns SdkStream which extends Readable
    // We need to check if it's a Node.js Readable stream for pipeline
    const body = response.Body;
    if (typeof (body as Readable).pipe !== 'function') {
        throw new Error('S3 response body is not a readable stream');
    }

    const writeStream = fs.createWriteStream(localPath);
    await pipeline(body as Readable, writeStream);

    console.log(`Downloaded to ${localPath}`);
}

/**
 * Upload a file from local disk to S3
 */
async function uploadToS3(
    s3Client: S3Client,
    localPath: string,
    bucket: string,
    key: string
): Promise<void> {
    console.log(`Uploading ${localPath} to s3://${bucket}/${key}`);

    const fileStream = fs.createReadStream(localPath);
    const fileStats = fs.statSync(localPath);

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileStream,
        ContentLength: fileStats.size,
    });

    await s3Client.send(command);

    console.log(`Uploaded to s3://${bucket}/${key}`);
}

/**
 * Run ffmpeg to convert video to target codec
 */
async function runFfmpeg(
    inputPath: string,
    outputPath: string,
    codec: string,
    onProgress?: (percent: number) => void
): Promise<void> {
    const codecConfig = CODEC_CONFIG[codec];
    if (!codecConfig) {
        throw new Error(`Unsupported codec: ${codec}`);
    }

    console.log(`Converting ${inputPath} to ${outputPath} using ${codecConfig.encoder}`);

    return new Promise((resolve, reject) => {
        const args = [
            '-i', inputPath,
            '-c:v', codecConfig.encoder,
            '-c:a', 'copy',
            '-y',
            '-progress', 'pipe:1',
            outputPath,
        ];

        const ffmpeg = spawn('ffmpeg', args);
        let duration = 0;

        ffmpeg.stderr.on('data', (data: Buffer) => {
            const output = data.toString();
            console.log(`ffmpeg: ${output}`);

            // Parse duration from initial output
            const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
            if (durationMatch) {
                duration =
                    parseInt(durationMatch[1], 10) * 3600 +
                    parseInt(durationMatch[2], 10) * 60 +
                    parseInt(durationMatch[3], 10);
            }
        });

        ffmpeg.stdout.on('data', (data: Buffer) => {
            const output = data.toString();

            // Parse progress from stdout (ffmpeg reports out_time_ms in microseconds)
            const timeMatch = output.match(/out_time_ms=(\d+)/);
            if (timeMatch && duration > 0 && onProgress) {
                const currentTimeMicroseconds = parseInt(timeMatch[1], 10);
                const currentTimeSec = currentTimeMicroseconds / MICROSECONDS_PER_SECOND;
                const percent = Math.min(Math.round((currentTimeSec / duration) * 100), 100);
                onProgress(percent);
            }
        });

        ffmpeg.on('close', (code: number | null) => {
            if (code === 0) {
                console.log('ffmpeg conversion completed successfully');
                resolve();
            } else {
                reject(new Error(`ffmpeg exited with code ${code}`));
            }
        });

        ffmpeg.on('error', (err: Error) => {
            reject(new Error(`Failed to start ffmpeg: ${err.message}`));
        });
    });
}

/**
 * Clean up temporary files
 */
function cleanup(files: string[]): void {
    for (const file of files) {
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                console.log(`Cleaned up ${file}`);
            }
        } catch {
            console.warn(`Failed to clean up ${file}`);
        }
    }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
    console.log('Batch worker started');

    // Validate required environment variables
    const requiredEnvVars: (keyof WorkerEnvironment)[] = [
        'INPUT_S3_BUCKET',
        'INPUT_S3_KEY',
        'OUTPUT_S3_BUCKET',
        'OUTPUT_S3_KEY',
        'TARGET_CODEC',
        'JOB_ID',
        'DYNAMODB_TABLE',
        'AWS_REGION',
    ];

    const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
    if (missingVars.length > 0) {
        console.error('Missing required environment variables:', missingVars);
        process.exit(1);
    }

    const env: WorkerEnvironment = {
        INPUT_S3_BUCKET: process.env.INPUT_S3_BUCKET!,
        INPUT_S3_KEY: process.env.INPUT_S3_KEY!,
        OUTPUT_S3_BUCKET: process.env.OUTPUT_S3_BUCKET!,
        OUTPUT_S3_KEY: process.env.OUTPUT_S3_KEY!,
        TARGET_CODEC: process.env.TARGET_CODEC!,
        JOB_ID: process.env.JOB_ID!,
        DYNAMODB_TABLE: process.env.DYNAMODB_TABLE!,
        AWS_REGION: process.env.AWS_REGION!,
    };

    console.log('Environment:', {
        ...env,
        JOB_ID: env.JOB_ID,
    });

    // Validate target codec
    const codecConfig = CODEC_CONFIG[env.TARGET_CODEC];
    if (!codecConfig) {
        console.error(`Unsupported target codec: ${env.TARGET_CODEC}`);
        console.error(`Supported codecs: ${Object.keys(CODEC_CONFIG).join(', ')}`);
        process.exit(1);
    }

    // Initialize AWS clients
    const s3Client = new S3Client({ region: env.AWS_REGION });
    const dynamoDBClient = new DynamoDBClient({ region: env.AWS_REGION });
    const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

    // Setup working directory
    if (!fs.existsSync(WORK_DIR)) {
        fs.mkdirSync(WORK_DIR, { recursive: true });
    }

    const inputFilename = path.basename(env.INPUT_S3_KEY);
    const outputFilename = `${path.parse(inputFilename).name}.${codecConfig.extension}`;
    const inputPath = path.join(WORK_DIR, inputFilename);
    const outputPath = path.join(WORK_DIR, outputFilename);

    const filesToCleanup = [inputPath, outputPath];

    try {
        // Update status to running
        await updateJobStatus(docClient, env.DYNAMODB_TABLE, env.JOB_ID, 'running', {
            progress_percent: 0,
        });

        // Download input video from S3
        await downloadFromS3(s3Client, env.INPUT_S3_BUCKET, env.INPUT_S3_KEY, inputPath);

        // Run ffmpeg conversion with progress updates
        let lastProgressUpdate = 0;
        await runFfmpeg(inputPath, outputPath, env.TARGET_CODEC, async (percent) => {
            // Only update DynamoDB at configured intervals to avoid excessive writes
            if (percent >= lastProgressUpdate + PROGRESS_UPDATE_INTERVAL || percent === 100) {
                lastProgressUpdate = percent;
                try {
                    await updateJobStatus(docClient, env.DYNAMODB_TABLE, env.JOB_ID, 'running', {
                        progress_percent: percent,
                    });
                } catch (err) {
                    console.warn('Failed to update progress:', err);
                }
            }
        });

        // Upload converted video to S3
        await uploadToS3(s3Client, outputPath, env.OUTPUT_S3_BUCKET, env.OUTPUT_S3_KEY);

        // Update status to succeeded
        await updateJobStatus(docClient, env.DYNAMODB_TABLE, env.JOB_ID, 'succeeded', {
            progress_percent: 100,
            output_s3_key: env.OUTPUT_S3_KEY,
        });

        console.log('Batch worker completed successfully');
    } catch (error) {
        console.error('Worker failed:', error);

        // Update status to failed
        const errorMessage = error instanceof Error ? error.message : String(error);
        try {
            await updateJobStatus(docClient, env.DYNAMODB_TABLE, env.JOB_ID, 'failed', {
                error_message: errorMessage,
            });
        } catch (updateError) {
            console.error('Failed to update job status to failed:', updateError);
        }

        throw error;
    } finally {
        // Clean up temporary files
        cleanup(filesToCleanup);
    }
}

// Run main and handle errors
main().catch((error: Error) => {
    console.error('Worker failed:', error);
    process.exit(1);
});
