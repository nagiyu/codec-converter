import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { spawn as defaultSpawn, SpawnOptions, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export interface WorkerEnvironment {
  INPUT_S3_BUCKET: string;
  INPUT_S3_KEY: string;
  OUTPUT_S3_BUCKET: string;
  OUTPUT_S3_KEY: string;
  TARGET_CODEC: string;
  JOB_ID: string;
  DYNAMODB_TABLE: string;
  AWS_REGION: string;
}

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export const CODEC_CONFIG: Record<string, { encoder: string; extension: string }> = {
  h264: { encoder: 'libx264', extension: 'mp4' },
  hevc: { encoder: 'libx265', extension: 'mp4' },
  vp9: { encoder: 'libvpx-vp9', extension: 'webm' },
  av1: { encoder: 'libaom-av1', extension: 'webm' },
};

const MICROSECONDS_PER_SECOND = 1_000_000;
const PROGRESS_UPDATE_INTERVAL = 10;
export const WORK_DIR = '/tmp/worker';

/**
 * Update the job status in DynamoDB
 */
export async function updateJobStatus(
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
}

/**
 * Download a file from S3 to local disk
 */
export async function downloadFromS3(
  s3Client: S3Client,
  bucket: string,
  key: string,
  localPath: string
): Promise<void> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('Empty response body from S3');
  }

  const body = response.Body;
  if (typeof (body as Readable).pipe !== 'function') {
    throw new Error('S3 response body is not a readable stream');
  }

  const writeStream = fs.createWriteStream(localPath);
  await pipeline(body as Readable, writeStream);
}

/**
 * Upload a file from local disk to S3
 */
export async function uploadToS3(
  s3Client: S3Client,
  localPath: string,
  bucket: string,
  key: string
): Promise<void> {
  const fileStream = fs.createReadStream(localPath);
  const fileStats = fs.statSync(localPath);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileStream,
    ContentLength: fileStats.size,
  });

  await s3Client.send(command);
}

/**
 * Run ffmpeg to convert video to target codec
 * spawnFn can be injected for testing
 */
export function runFfmpeg(
  inputPath: string,
  outputPath: string,
  codec: string,
  spawnFn: typeof defaultSpawn = defaultSpawn,
  onProgress?: (percent: number) => void
): Promise<void> {
  const codecConfig = CODEC_CONFIG[codec];
  if (!codecConfig) {
    return Promise.reject(new Error(`Unsupported codec: ${codec}`));
  }

  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-c:v', codecConfig.encoder,
      '-c:a', 'copy',
      '-y',
      '-progress', 'pipe:1',
      outputPath,
    ];

    const ffmpeg = spawnFn('ffmpeg', args);
    let duration = 0;

    ffmpeg.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
      if (durationMatch) {
        duration =
          parseInt(durationMatch[1], 10) * 3600 +
          parseInt(durationMatch[2], 10) * 60 +
          parseInt(durationMatch[3], 10);
      }
    });

    ffmpeg.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
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
export function cleanup(files: string[]): void {
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Orchestrator for a single job. Dependencies injected for testability.
 */
export async function runJob(
  env: WorkerEnvironment,
  deps: {
    s3Client: S3Client;
    docClient: DynamoDBDocumentClient;
    spawnFn?: typeof defaultSpawn;
    workDir?: string;
    fsModule?: typeof fs;
  }
): Promise<void> {
  const { s3Client, docClient, spawnFn, workDir = WORK_DIR, fsModule = fs } = deps;

  if (!CODEC_CONFIG[env.TARGET_CODEC]) {
    throw new Error(`Unsupported target codec: ${env.TARGET_CODEC}`);
  }

  if (!fsModule.existsSync(workDir)) {
    fsModule.mkdirSync(workDir, { recursive: true });
  }

  const inputFilename = path.basename(env.INPUT_S3_KEY);
  const outputFilenameBase = `${path.parse(inputFilename).name}`;
  let outputFilename = `${outputFilenameBase}.${CODEC_CONFIG[env.TARGET_CODEC].extension}`;
  // avoid writing output to the same path as input (ffmpeg cannot edit files in-place)
  if (outputFilename === inputFilename) {
    outputFilename = `${outputFilenameBase}-converted.${CODEC_CONFIG[env.TARGET_CODEC].extension}`;
  }
  const inputPath = path.join(workDir, inputFilename);
  const outputPath = path.join(workDir, outputFilename);

  const filesToCleanup = [inputPath, outputPath];

  try {
    await updateJobStatus(docClient, env.DYNAMODB_TABLE, env.JOB_ID, 'running', {
      progress_percent: 0,
    });

    await downloadFromS3(s3Client, env.INPUT_S3_BUCKET, env.INPUT_S3_KEY, inputPath);

    let lastProgressUpdate = 0;
    await runFfmpeg(inputPath, outputPath, env.TARGET_CODEC, spawnFn, async (percent) => {
      if (percent >= lastProgressUpdate + PROGRESS_UPDATE_INTERVAL || percent === 100) {
        lastProgressUpdate = percent;
        try {
          await updateJobStatus(docClient, env.DYNAMODB_TABLE, env.JOB_ID, 'running', {
            progress_percent: percent,
          });
        } catch {
          // ignore
        }
      }
    });

    await uploadToS3(s3Client, outputPath, env.OUTPUT_S3_BUCKET, env.OUTPUT_S3_KEY);

    await updateJobStatus(docClient, env.DYNAMODB_TABLE, env.JOB_ID, 'succeeded', {
      progress_percent: 100,
      output_s3_key: env.OUTPUT_S3_KEY,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    try {
      await updateJobStatus(docClient, env.DYNAMODB_TABLE, env.JOB_ID, 'failed', {
        error_message: errorMessage,
      });
    } catch {
      // ignore
    }
    throw error;
  } finally {
    cleanup(filesToCleanup);
  }
}
