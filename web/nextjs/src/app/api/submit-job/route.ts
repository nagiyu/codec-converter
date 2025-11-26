import { NextResponse } from "next/server";

/**
 * POST /api/submit-job
 * Submits a conversion job after upload is complete.
 *
 * Request body:
 *   - s3Key: string (required)
 *   - targetCodec: string (required)
 *
 * Response:
 *   - jobId: string
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { s3Key, targetCodec } = body;

    // Validate required fields
    if (!s3Key || typeof s3Key !== "string") {
      return NextResponse.json({ error: "s3Key is required" }, { status: 400 });
    }
    if (!targetCodec || typeof targetCodec !== "string") {
      return NextResponse.json(
        { error: "targetCodec is required" },
        { status: 400 }
      );
    }

    // TODO: Create ConversionJob entity in DynamoDB
    // TODO: Submit job to AWS Batch
    const jobId = `job-${Date.now()}-stub`;

    return NextResponse.json({ jobId }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
