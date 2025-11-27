/**
 * JobService - Client-side service for submitting conversion jobs and polling job status.
 * Calls `/api/submit-job` to create jobs and `/api/jobs/{jobId}` to poll status.
 */

import type { ConversionJobStatus, TargetCodec } from "../models";

/** Request payload for submitting a job */
export interface SubmitJobRequest {
  /** S3 key of the uploaded video file */
  s3Key: string;
  /** Target codec for conversion */
  targetCodec: TargetCodec;
}

/** Response from submit-job endpoint */
export interface SubmitJobResponse {
  /** Unique identifier for the created job */
  jobId: string;
}

/** Response from jobs/{jobId} endpoint */
export interface JobStatusResponse {
  /** Job identifier */
  jobId: string;
  /** Current status of the job */
  status: ConversionJobStatus;
  /** Progress percentage (0-100) */
  progress_percent: number;
  /** URL to download the output file (available when status is 'succeeded') */
  outputUrl?: string;
  /** Error message if the job failed */
  error_message?: string;
}

/** Options for polling job status */
export interface PollOptions {
  /** Polling interval in milliseconds (default: 2000) */
  intervalMs?: number;
  /** Maximum polling duration in milliseconds (default: 300000 = 5 minutes) */
  timeoutMs?: number;
  /** Callback function called on each status update */
  onProgress?: (status: JobStatusResponse) => void;
}

/**
 * Submit a conversion job.
 * @param request - The job submission request
 * @returns The job ID
 */
export async function submitJob(
  request: SubmitJobRequest
): Promise<SubmitJobResponse> {
  const response = await fetch("/api/submit-job", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `Failed to submit job: ${response.status}`
    );
  }

  return response.json() as Promise<SubmitJobResponse>;
}

/**
 * Get the current status of a job.
 * @param jobId - The job ID to query
 * @returns The current job status
 */
export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `Failed to get job status: ${response.status}`
    );
  }

  return response.json() as Promise<JobStatusResponse>;
}

/**
 * Poll job status until completion or timeout.
 * @param jobId - The job ID to poll
 * @param options - Polling options
 * @returns The final job status
 */
export async function pollJobStatus(
  jobId: string,
  options: PollOptions = {}
): Promise<JobStatusResponse> {
  const { intervalMs = 2000, timeoutMs = 300000, onProgress } = options;

  const startTime = Date.now();

  while (true) {
    const status = await getJobStatus(jobId);

    if (onProgress) {
      onProgress(status);
    }

    // Check for terminal states
    if (status.status === "succeeded" || status.status === "failed") {
      return status;
    }

    // Check for timeout
    if (Date.now() - startTime >= timeoutMs) {
      throw new Error(`Polling timed out after ${timeoutMs}ms`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * JobService object providing all job-related operations.
 */
export const JobService = {
  submitJob,
  getJobStatus,
  pollJobStatus,
};

export default JobService;
