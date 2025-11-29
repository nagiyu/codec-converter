#!/usr/bin/env node
/**
 * Thin entrypoint that constructs real AWS clients and delegates to workerCore.runJob
 */

import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { runJob, WorkerEnvironment, WORK_DIR } from './lib/workerCore';
import * as fs from 'fs';

async function main(): Promise<void> {
  console.log('Batch worker started');

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

  // Ensure work dir exists
  if (!fs.existsSync(WORK_DIR)) {
    fs.mkdirSync(WORK_DIR, { recursive: true });
  }

  // Construct real AWS clients
  const s3Client = new S3Client({ region: env.AWS_REGION });
  const dynamoDBClient = new DynamoDBClient({ region: env.AWS_REGION });
  const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

  try {
    await runJob(env, { s3Client, docClient, workDir: WORK_DIR });
    console.log('Batch worker completed successfully');
  } catch (err) {
    console.error('Worker failed:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
