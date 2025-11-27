import { NextResponse } from "next/server";

/**
 * POST /api/presign-upload
 * Creates a presigned S3 PUT URL for video upload.
 *
 * Request body:
 *   - filename: string (required)
 *   - contentType: string (required)
 *   - fileSize: number (optional)
 *
 * Response:
 *   - uploadUrl: string
 *   - s3Key: string
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { filename, contentType } = body;

    // Validate required fields
    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        { error: "filename is required" },
        { status: 400 }
      );
    }
    if (!contentType || typeof contentType !== "string") {
      return NextResponse.json(
        { error: "contentType is required" },
        { status: 400 }
      );
    }

    // TODO: Generate presigned S3 URL using AWS SDK
    // TODO: Store VideoFile entity in DynamoDB
    const s3Key = `uploads/${Date.now()}-${filename}`;
    const uploadUrl = `https://example-bucket.s3.amazonaws.com/${s3Key}?presigned=stub`;

    return NextResponse.json(
      {
        uploadUrl,
        s3Key,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
