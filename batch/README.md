# Batch Worker - Video Codec Converter

This directory contains the AWS Batch worker implementation for video codec conversion.

## Overview

The batch worker is a Docker container that runs on AWS Batch to perform video transcoding operations using ffmpeg. It downloads videos from S3, converts them to the target codec, and uploads the results back to S3 while updating job status in DynamoDB.

## Structure

```
batch/
├── Dockerfile          # Multi-stage container image with ffmpeg and Node.js runtime
├── package.json        # Node.js dependencies
├── tsconfig.json       # TypeScript configuration
├── src/
│   └── worker.ts       # Main entry point for batch jobs (TypeScript)
└── jobs/               # Job definitions and CI helpers (future)
```

## Development

Build TypeScript locally:

```bash
npm install
npm run build
```

Run locally (after building):

```bash
npm start
```

## Building

Build the Docker image:

```bash
docker build -t codec-converter-batch:latest .
```

## Running Locally

Set required environment variables and run:

```bash
docker run --rm \
  -e INPUT_S3_BUCKET=my-bucket \
  -e INPUT_S3_KEY=input/video.mp4 \
  -e OUTPUT_S3_BUCKET=my-bucket \
  -e OUTPUT_S3_KEY=output/video-converted.mp4 \
  -e TARGET_CODEC=h264 \
  -e JOB_ID=job-123 \
  -e DYNAMODB_TABLE=Entities \
  -e AWS_REGION=us-east-1 \
  -e AWS_ACCESS_KEY_ID=... \
  -e AWS_SECRET_ACCESS_KEY=... \
  codec-converter-batch:latest
```

## Environment Variables

Required environment variables for the worker:

- `INPUT_S3_BUCKET`: Source S3 bucket name
- `INPUT_S3_KEY`: Source S3 object key
- `OUTPUT_S3_BUCKET`: Destination S3 bucket name
- `OUTPUT_S3_KEY`: Destination S3 object key
- `TARGET_CODEC`: Target video codec (h264, vp9, av1, hevc)
- `JOB_ID`: Conversion job ID for tracking in DynamoDB
- `DYNAMODB_TABLE`: DynamoDB table name (default: Entities)
- `AWS_REGION`: AWS region

## Deployment

The image is built and pushed to ECR by the CI/CD pipeline and referenced in AWS Batch job definitions.

See `specs/001-video-codec-converter/quickstart.md` for deployment instructions.

## Implementation Status

- [x] Directory structure created (T002)
- [x] Dockerfile with ffmpeg
- [x] Entry point script scaffold
- [ ] Full conversion implementation (T019)
