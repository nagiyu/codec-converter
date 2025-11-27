import { NextResponse } from "next/server";

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
 *   - outputUrl: string (optional)
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  // TODO: Fetch ConversionJob from DynamoDB by jobId
  // Stub response
  const jobStatus = {
    jobId,
    status: "queued",
    progress_percent: 0,
    outputUrl: undefined,
  };

  return NextResponse.json(jobStatus, { status: 200 });
}
