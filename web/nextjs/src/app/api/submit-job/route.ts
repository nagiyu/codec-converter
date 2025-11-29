import { NextResponse } from "next/server";
import { BatchClient, SubmitJobCommand } from "@aws-sdk/client-batch";
import { v4 as uuidv4 } from "uuid";
import { saveConversionJob, getVideoFileByS3Key } from "@/lib/dynamodb";
import type { ConversionJob, TargetCodec } from "@/lib/models/conversionJob";

/** Supported target codecs */
const SUPPORTED_CODECS: TargetCodec[] = ["h264", "vp9", "av1", "hevc"];

/** Recommended container for each codec */
const CODEC_CONTAINERS: Record<TargetCodec, string> = {
  h264: "mp4",
  hevc: "mp4",
  vp9: "webm",
  av1: "webm",
};

/**
 * Validate that the S3 key matches the expected format.
 * @param s3Key - The S3 key to validate
 * @returns True if valid, false otherwise
 */
function isValidS3Key(s3Key: string): boolean {
  // S3 key should start with 'uploads/' and contain valid characters
  // Prevent path traversal attacks
  if (!s3Key.startsWith("uploads/")) {
    return false;
  }

  // Check for path traversal attempts
  if (s3Key.includes("..") || s3Key.includes("\0")) {
    return false;
  }

  return true;
}

/**
 * POST /api/submit-job
 * Submits a conversion job after upload is complete.
 *
 * Request body:
 *   - s3Key: string (required, must match uploaded file)
 *   - targetCodec: string (required, one of: h264, vp9, av1, hevc)
 *
 * Response:
 *   - jobId: string (UUID of the created ConversionJob)
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { s3Key, targetCodec } = body;

    // Validate s3Key
    if (!s3Key || typeof s3Key !== "string") {
      return NextResponse.json({ error: "s3Key is required" }, { status: 400 });
    }

    if (!isValidS3Key(s3Key)) {
      return NextResponse.json({ error: "Invalid s3Key format" }, { status: 400 });
    }

    // Validate targetCodec
    if (!targetCodec || typeof targetCodec !== "string") {
      return NextResponse.json(
        { error: "targetCodec is required" },
        { status: 400 }
      );
    }

    if (!SUPPORTED_CODECS.includes(targetCodec as TargetCodec)) {
      return NextResponse.json(
        {
          error: `Unsupported target codec. Supported codecs: ${SUPPORTED_CODECS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const codec = targetCodec as TargetCodec;

    // Verify that the VideoFile exists
    const videoFile = await getVideoFileByS3Key(s3Key);
    if (!videoFile) {
      return NextResponse.json(
        { error: "Video file not found. Please upload the file first." },
        { status: 404 }
      );
    }

    // Generate unique job ID
    const jobId = uuidv4();

    // Create and save ConversionJob entity
    const conversionJob: ConversionJob = {
      id: jobId,
      video_file_id: videoFile.id,
      target_codec: codec,
      container_hint: CODEC_CONTAINERS[codec],
      status: "queued",
      progress_percent: 0,
      submitted_at: new Date().toISOString(),
    };

    await saveConversionJob(conversionJob);

    // Submit to AWS Batch if configured (development mode skips submission)
    const jobQueue = process.env.AWS_BATCH_JOB_QUEUE;
    const jobDefinition = process.env.AWS_BATCH_JOB_DEFINITION;
    const region =
      process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";

    if (jobQueue && jobDefinition) {
      try {
        const batchClient = new BatchClient({ region });

        const submitParams = {
          jobName: jobId,
          jobQueue,
          jobDefinition,
          containerOverrides: {
            environment: [
              { name: "JOB_ID", value: jobId },
              { name: "S3_KEY", value: s3Key },
              { name: "TARGET_CODEC", value: codec },
              { name: "OUTPUT_PREFIX", value: `outputs/${jobId}/` },
            ],
          },
        };

        await batchClient.send(new SubmitJobCommand(submitParams));
      } catch (batchError) {
        console.error("Failed to submit AWS Batch job:", batchError);

        // Mark job as failed in DynamoDB
        conversionJob.status = "failed";
        conversionJob.error_message = String(batchError);
        await saveConversionJob(conversionJob);

        return NextResponse.json(
          { error: "Failed to submit batch job" },
          { status: 500 }
        );
      }
    } else {
      console.log(
        "AWS Batch not configured; skipping submission (development mode)."
      );
    }

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (error) {
    console.error("Error in submit-job:", error);

    // Check if it's a JSON parse error
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
