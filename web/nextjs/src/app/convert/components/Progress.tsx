"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./Progress.module.css";
import { getJobStatus, type JobStatusResponse } from "@/lib/services/jobService";

/** Props for the Progress component */
export interface ProgressProps {
  /** The job ID to track */
  jobId: string;
  /** Polling interval in milliseconds (default: 2000) */
  pollingInterval?: number;
  /** Callback when job completes successfully */
  onComplete?: (status: JobStatusResponse) => void;
  /** Callback when job fails */
  onError?: (error: Error) => void;
  /** Callback to close/dismiss the progress view */
  onDismiss?: () => void;
}

/** Status labels for display */
const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  running: "Converting...",
  succeeded: "Complete",
  failed: "Failed",
};

/**
 * Progress component for tracking conversion job status.
 * Polls the `/api/jobs/{jobId}` endpoint and displays progress.
 * Shows a download button when the job succeeds.
 */
export function Progress({
  jobId,
  pollingInterval = 2000,
  onComplete,
  onError,
  onDismiss,
}: ProgressProps) {
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set up polling
  useEffect(() => {
    let isMounted = true;

    async function poll() {
      if (!isMounted || !isPolling) return;

      try {
        const status = await getJobStatus(jobId);
        if (!isMounted) return;
        
        setJobStatus(status);

        // Stop polling on terminal states
        if (status.status === "succeeded") {
          setIsPolling(false);
          onComplete?.(status);
        } else if (status.status === "failed") {
          setIsPolling(false);
          setError(status.error_message || "Conversion failed");
          onError?.(new Error(status.error_message || "Conversion failed"));
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error polling job status:", err);
        setError(err instanceof Error ? err.message : "Failed to get job status");
        setIsPolling(false);
        onError?.(err instanceof Error ? err : new Error("Failed to get job status"));
      }
    }

    // Initial poll
    poll();

    // Set up interval for subsequent polls
    const intervalId = setInterval(poll, pollingInterval);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [jobId, pollingInterval, isPolling, onComplete, onError]);

  // Handle download button click
  const handleDownload = useCallback(() => {
    if (jobStatus?.outputUrl) {
      // Open download in a new window/tab to trigger file download
      window.location.href = jobStatus.outputUrl;
    }
  }, [jobStatus]);

  // Determine display values
  const status = jobStatus?.status || "queued";
  const progressPercent = jobStatus?.progress_percent ?? 0;
  const statusLabel = STATUS_LABELS[status] || status;
  const isComplete = status === "succeeded";
  const isFailed = status === "failed";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Conversion Progress</h3>
        {onDismiss && (
          <button
            type="button"
            className={styles.dismissButton}
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>

      {/* Job ID */}
      <div className={styles.jobInfo}>
        <span className={styles.jobLabel}>Job ID:</span>
        <span className={styles.jobId}>{jobId}</span>
      </div>

      {/* Progress bar */}
      <div className={styles.progressContainer}>
        <div
          className={`${styles.progressBar} ${isFailed ? styles.progressBarFailed : ""} ${isComplete ? styles.progressBarComplete : ""}`}
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Status and percentage */}
      <div className={styles.statusRow}>
        <span className={`${styles.status} ${isFailed ? styles.statusFailed : ""} ${isComplete ? styles.statusComplete : ""}`}>
          {statusLabel}
        </span>
        <span className={styles.percentage}>{progressPercent}%</span>
      </div>

      {/* Error message */}
      {error && (
        <div className={styles.errorMessage} role="alert">
          {error}
        </div>
      )}

      {/* Download button */}
      {isComplete && jobStatus?.outputUrl && (
        <button
          type="button"
          className={styles.downloadButton}
          onClick={handleDownload}
          aria-label="Download converted file"
        >
          <svg
            className={styles.downloadIcon}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M10 13L10 3M10 13L6 9M10 13L14 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 17H17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Download Converted Video
        </button>
      )}
    </div>
  );
}

export default Progress;
