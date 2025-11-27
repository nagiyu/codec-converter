import { NextResponse } from "next/server";
import { getConversionJobById } from "@/lib/dynamodb";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /api/jobs/{jobId}
 * Retrieves the status of a conversion job.
 *
 * Path parameters:
 *   - jobId: string (required)
 *
 * Response:
 *   - jobId: string
 *   - status: string
 *   - progress_percent: number
 *   - outputUrl: string (optional, only when status is 'succeeded')
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  try {
    // Fetch ConversionJob from DynamoDB by jobId
    const job = await getConversionJobById(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found", jobId },
        { status: 404 }
      );
    }

    // Build response with job status
    const jobStatus: {
      jobId: string;
      status: string;
      progress_percent: number;
      outputUrl?: string;
      error_message?: string;
    } = {
      jobId: job.id,
      status: job.status,
      progress_percent: job.progress_percent,
    };

    // Include outputUrl only when job is succeeded and output exists
    if (job.status === "succeeded" && job.output_s3_key) {
      // Return the download proxy URL (not direct S3 URL for security)
      jobStatus.outputUrl = `/api/download/${job.id}`;
    }

    // Include error message if job failed
    if (job.status === "failed" && job.error_message) {
      jobStatus.error_message = job.error_message;
    }

    return NextResponse.json(jobStatus, { status: 200 });
  } catch (error) {
    console.error("Error fetching job status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
