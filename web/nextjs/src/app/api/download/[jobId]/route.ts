import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /api/download/{jobId}
 * Streams the converted output to the client (proxy download).
 *
 * Path parameters:
 *   - jobId: string (required)
 *
 * Response:
 *   - 200: Binary stream with Content-Disposition: attachment
 *   - 404: Job or output not found
 *   - 403: Access forbidden
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  // TODO: Fetch ConversionJob from DynamoDB and verify status is 'succeeded'
  // TODO: Stream S3 object to client

  // Stub: Return 404 as no actual output exists yet
  return NextResponse.json(
    { error: "Job or output not found" },
    { status: 404 }
  );
}
