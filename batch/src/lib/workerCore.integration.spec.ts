import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { runJob, WorkerEnvironment } from './workerCore';

jest.setTimeout(300000); // 5 minutes for integration run

const requiredEnv = [
  'INPUT_S3_BUCKET',
  'OUTPUT_S3_BUCKET',
  'DYNAMODB_TABLE',
  'AWS_REGION',
];

const hasEnv = requiredEnv.every((k) => !!process.env[k]);

if (!hasEnv) {
  test.skip('Integration test skipped - set required AWS env vars', () => {
    // To run this test, set the following env vars:
    // INPUT_S3_BUCKET, INPUT_S3_KEY, OUTPUT_S3_BUCKET, OUTPUT_S3_KEY,
    // TARGET_CODEC, DYNAMODB_TABLE, AWS_REGION
  });
} else {
  test('integration: runJob against real S3/DynamoDB (requires AWS credentials)', async () => {
    const env: WorkerEnvironment = {
      INPUT_S3_BUCKET: process.env.INPUT_S3_BUCKET!,
      INPUT_S3_KEY: 'op.mp4',
      OUTPUT_S3_BUCKET: process.env.OUTPUT_S3_BUCKET!,
      // make output key unique to avoid collisions
      OUTPUT_S3_KEY: `${Date.now()}.mp4`,
      TARGET_CODEC: 'h264',
      JOB_ID: process.env.JOB_ID || `integration-${Date.now()}`,
      DYNAMODB_TABLE: process.env.DYNAMODB_TABLE!,
      AWS_REGION: process.env.AWS_REGION!,
    };

    const s3 = new S3Client({ region: env.AWS_REGION });
    const dynamo = new DynamoDBClient({ region: env.AWS_REGION });
    const doc = DynamoDBDocumentClient.from(dynamo);

    // verify input exists
    try {
      await s3.send(new HeadObjectCommand({ Bucket: env.INPUT_S3_BUCKET, Key: env.INPUT_S3_KEY }));
    } catch (err) {
      throw new Error(`Input object not found: s3://${env.INPUT_S3_BUCKET}/${env.INPUT_S3_KEY}`);
    }

    // run the job (will download, run ffmpeg in-container, upload)
    await runJob(env, { s3Client: s3, docClient: doc, workDir: '/tmp/worker-integration' });

    // verify output exists
    await s3.send(new HeadObjectCommand({ Bucket: env.OUTPUT_S3_BUCKET, Key: env.OUTPUT_S3_KEY }));
  }, 300000);
}
