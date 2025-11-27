import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { saveVideoFile } from "@/lib/dynamodb";
import { generatePresignedUploadUrl } from "@/lib/s3";
import type { VideoFile } from "@/lib/models/videoFile";

/** Supported video content types */
const SUPPORTED_CONTENT_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];

/** Maximum filename length */
const MAX_FILENAME_LENGTH = 255;

/** Maximum file size in bytes (500 MB) */
const MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * Sanitize filename to prevent path traversal and invalid characters.
 * @param filename - The original filename
 * @returns The sanitized filename
 */
function sanitizeFilename(filename: string): string {
  // Remove path separators and null bytes
  return filename
    .replace(/[/\\]/g, "_")
    .replace(/\0/g, "")
    .trim();
}

/**
 * Extract container format from content type.
 * @param contentType - The MIME content type
 * @returns The container format
 */
function getContainerFromContentType(contentType: string): string {
  const mapping: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/x-matroska": "mkv",
  };
  return mapping[contentType] || "unknown";
}

/**
 * POST /api/presign-upload
 * Creates a presigned S3 PUT URL for video upload.
 *
 * Request body:
 *   - filename: string (required, max 255 chars)
 *   - contentType: string (required, must be supported video type)
 *   - fileSize: number (optional, max 500 MB)
 *
 * Response:
 *   - uploadUrl: string (presigned S3 PUT URL)
 *   - s3Key: string (S3 object key)
 *   - videoFileId: string (UUID of the created VideoFile entity)
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { filename, contentType, fileSize } = body;

    // Validate filename
    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        { error: "filename is required" },
        { status: 400 }
      );
    }

    if (filename.length > MAX_FILENAME_LENGTH) {
      return NextResponse.json(
        { error: `filename must be at most ${MAX_FILENAME_LENGTH} characters` },
        { status: 400 }
      );
    }

    const sanitizedFilename = sanitizeFilename(filename);
    if (!sanitizedFilename) {
      return NextResponse.json(
        { error: "filename is invalid" },
        { status: 400 }
      );
    }

    // Validate contentType
    if (!contentType || typeof contentType !== "string") {
      return NextResponse.json(
        { error: "contentType is required" },
        { status: 400 }
      );
    }

    if (!SUPPORTED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        {
          error: `Unsupported content type. Supported types: ${SUPPORTED_CONTENT_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate fileSize if provided
    if (fileSize !== undefined) {
      if (typeof fileSize !== "number" || fileSize <= 0) {
        return NextResponse.json(
          { error: "fileSize must be a positive number" },
          { status: 400 }
        );
      }

      if (fileSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024} MB`,
          },
          { status: 400 }
        );
      }
    }

    // Generate unique ID and S3 key
    const videoFileId = uuidv4();
    const s3Key = `uploads/${videoFileId}/${sanitizedFilename}`;

    // Generate presigned upload URL
    const uploadUrl = await generatePresignedUploadUrl(s3Key, contentType);

    // Create and save VideoFile entity
    const videoFile: VideoFile = {
      id: videoFileId,
      filename: sanitizedFilename,
      s3_key: s3Key,
      container: getContainerFromContentType(contentType),
      video_codec: "", // Will be populated after upload and analysis
      audio_codec: undefined,
      duration_seconds: 0, // Will be populated after analysis
      resolution: "", // Will be populated after analysis
      file_size_bytes: fileSize || 0,
      upload_timestamp: new Date().toISOString(),
      owner_id: undefined, // Could be populated from auth context
      status: "uploaded",
    };

    await saveVideoFile(videoFile);

    return NextResponse.json(
      {
        uploadUrl,
        s3Key,
        videoFileId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in presign-upload:", error);

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
