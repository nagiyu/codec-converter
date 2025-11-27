/**
 * UploadService - Service for handling video upload operations.
 * Uses the presign-upload API contract.
 */

/** Request parameters for getting presigned upload URL */
export interface PresignUploadRequest {
  /** Original filename */
  filename: string;
  /** MIME content type (e.g., 'video/mp4') */
  contentType: string;
  /** File size in bytes (optional) */
  fileSize?: number;
}

/** Response from presign-upload API */
export interface PresignUploadResponse {
  /** Presigned S3 PUT URL for direct upload */
  uploadUrl: string;
  /** S3 object key where the file will be stored */
  s3Key: string;
}

/**
 * Get presigned upload information for uploading a video file to S3.
 *
 * @param params - The upload request parameters
 * @returns Promise resolving to presigned upload information
 * @throws Error if the request fails
 */
export async function getPresignedUploadUrl(
  params: PresignUploadRequest
): Promise<PresignUploadResponse> {
  const response = await fetch("/api/presign-upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: params.filename,
      contentType: params.contentType,
      fileSize: params.fileSize,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `Failed to get presigned upload URL: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Upload a file directly to S3 using a presigned URL.
 *
 * @param uploadUrl - The presigned S3 PUT URL
 * @param file - The file to upload
 * @param contentType - The MIME content type of the file
 * @returns Promise resolving when upload is complete
 * @throws Error if the upload fails
 */
export async function uploadFileToS3(
  uploadUrl: string,
  file: File | Blob,
  contentType: string
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file to S3: ${response.status} ${response.statusText}`);
  }
}

/**
 * Complete upload flow: get presigned URL and upload file.
 *
 * @param file - The file to upload
 * @returns Promise resolving to the S3 key where the file was uploaded
 * @throws Error if any step fails
 */
export async function uploadVideo(file: File): Promise<string> {
  // Step 1: Get presigned upload URL
  const presignResponse = await getPresignedUploadUrl({
    filename: file.name,
    contentType: file.type,
    fileSize: file.size,
  });

  // Step 2: Upload file to S3 using presigned URL
  await uploadFileToS3(presignResponse.uploadUrl, file, file.type);

  // Return the S3 key for use in job submission
  return presignResponse.s3Key;
}
