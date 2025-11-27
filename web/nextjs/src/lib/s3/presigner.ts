/**
 * S3 service for generating presigned upload URLs.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Get the S3 bucket name from environment variables.
 */
export function getBucketName(): string {
  return process.env.S3_UPLOAD_BUCKET || "codec-converter-uploads-dev";
}

/**
 * Get the presigned URL expiration time in seconds.
 * Default is 15 minutes.
 */
export function getPresignedUrlExpiration(): number {
  const expiration = parseInt(process.env.S3_PRESIGNED_EXPIRATION || "900", 10);
  return isNaN(expiration) ? 900 : expiration;
}

/**
 * Create and configure the S3 client.
 */
function createS3Client(): S3Client {
  const config: ConstructorParameters<typeof S3Client>[0] = {
    region: process.env.AWS_REGION || "ap-northeast-1",
  };

  // Support local development with LocalStack
  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT;
    config.forcePathStyle = true;
  }

  return new S3Client(config);
}

/**
 * Singleton S3 client instance.
 */
let s3Client: S3Client | null = null;

/**
 * Get the S3 client singleton.
 */
export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = createS3Client();
  }
  return s3Client;
}

/**
 * Generate a presigned URL for uploading a file to S3.
 * @param s3Key - The S3 object key
 * @param contentType - The content type of the file
 * @returns The presigned upload URL
 */
export async function generatePresignedUploadUrl(
  s3Key: string,
  contentType: string
): Promise<string> {
  const client = getS3Client();
  const bucket = getBucketName();
  const expiresIn = getPresignedUrlExpiration();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}
