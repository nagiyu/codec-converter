/**
 * GET /api/download/[jobId]
 *
 * Returns a short-lived presigned GET URL for the converted output file.
 */

import { NextRequest, NextResponse } from "next/server";
import { getConversionJobById } from "@/lib/dynamodb";
import { generatePresignedDownloadUrl } from "@/lib/s3/presigner";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { jobId } = await context.params;

  if (!jobId || typeof jobId !== "string" || jobId.length === 0) {
    return NextResponse.json(
      { error: "Invalid jobId parameter" },
      { status: 400 }
    );
  }

  try {
    const job = await getConversionJobById(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found", jobId },
        { status: 404 }
      );
    }

    if (job.status !== "succeeded") {
      return NextResponse.json(
        {
          error: "Job is not ready for download",
          jobId,
          status: job.status,
        },
        { status: 403 }
      );
    }

    if (!job.output_s3_key) {
      return NextResponse.json(
        { error: "Output file not available", jobId },
        { status: 404 }
      );
    }

    const expiresIn = parseInt(
      process.env.S3_PRESIGNED_DOWNLOAD_EXPIRATION || "60",
      10
    );

    const url = await generatePresignedDownloadUrl(
      job.output_s3_key,
      process.env.OUTPUT_S3_BUCKET,
      expiresIn
    );

    // Redirect the client to the presigned S3 URL so the browser downloads the file directly.
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Error generating presigned download URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
