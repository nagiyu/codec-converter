"use client";

import { useState, useRef, useCallback, useEffect, ChangeEvent } from "react";
import styles from "./page.module.css";
import { Progress } from "./components";

/** Codec option from API */
interface CodecOption {
  code: string;
  name: string;
}

/** Format file size for display */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/** Supported video MIME types */
const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];

export default function ConvertPage() {
  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCodec, setSelectedCodec] = useState<string>("");
  const [codecs, setCodecs] = useState<CodecOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available codecs on mount
  useEffect(() => {
    async function fetchCodecs() {
      try {
        const response = await fetch("/api/codecs");
        if (!response.ok) {
          throw new Error("Failed to fetch codecs");
        }
        const data: CodecOption[] = await response.json();
        setCodecs(data);
        if (data.length > 0) {
          setSelectedCodec(data[0].code);
        }
      } catch (err) {
        console.error("Error fetching codecs:", err);
        setError("Failed to load available codecs. Please refresh the page.");
      }
    }
    fetchCodecs();
  }, []);

  // Handle file selection
  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        // Validate file type
        if (!SUPPORTED_VIDEO_TYPES.includes(file.type)) {
          setError(
            "Unsupported file type. Please select a video file (MP4, WebM, MOV, AVI, MKV)."
          );
          return;
        }
        setSelectedFile(file);
        setError(null);
      }
    },
    []
  );

  // Handle codec selection
  const handleCodecChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setSelectedCodec(event.target.value);
    },
    []
  );

  // Open file picker
  const handleFilePickerClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Clear selected file
  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Handle convert button click
  const handleConvert = useCallback(async () => {
    if (!selectedFile || !selectedCodec) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setActiveJobId(null);

    try {
      // Step 1: Get presigned upload URL
      const presignResponse = await fetch("/api/presign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          fileSize: selectedFile.size,
        }),
      });

      if (!presignResponse.ok) {
        const errorData = await presignResponse.json();
        throw new Error(errorData.error || "Failed to get upload URL");
      }

      const { uploadUrl, s3Key } = await presignResponse.json();

      // Step 2: Upload file to S3 using presigned URL
      // Note: In production, this will use the UploadService (T012) to upload
      // the file with progress tracking. For now, we skip the actual S3 upload
      // since the presigned URL is a stub.
      if (uploadUrl) {
        // TODO: Implement actual file upload via UploadService (T012)
        console.log("Presigned URL received:", uploadUrl);
      }

      // Step 3: Submit conversion job
      const submitResponse = await fetch("/api/submit-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3Key,
          targetCodec: selectedCodec,
        }),
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        throw new Error(errorData.error || "Failed to submit conversion job");
      }

      const { jobId } = await submitResponse.json();

      // Set active job ID to show progress tracking
      setActiveJobId(jobId);

      // Clear the form after successful submission
      handleClearFile();
    } catch (err) {
      console.error("Error during conversion:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, selectedCodec, handleClearFile]);

  // Determine if convert button should be disabled
  const isConvertDisabled = !selectedFile || !selectedCodec || isLoading;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Video Codec Converter</h1>
        <p className={styles.description}>
          Upload a video file and convert it to a different codec
        </p>

        {/* Error display */}
        {error && (
          <div
            role="alert"
            style={{
              padding: "12px 16px",
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {/* Progress tracking for active job */}
        {activeJobId && (
          <Progress
            jobId={activeJobId}
            onDismiss={() => setActiveJobId(null)}
            onError={(err) => {
              console.error("Job error:", err);
            }}
          />
        )}

        {/* File Picker */}
        {!selectedFile ? (
          <div
            className={styles.filePicker}
            onClick={handleFilePickerClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleFilePickerClick();
              }
            }}
          >
            <span className={styles.filePickerLabel}>
              Click or drag a video file here
            </span>
            <button type="button" className={styles.filePickerButton}>
              Choose File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className={styles.fileInput}
              aria-label="Select video file"
            />
          </div>
        ) : (
          /* File Info Display */
          <div className={styles.fileInfo}>
            <div className={styles.fileInfoRow}>
              <span className={styles.fileInfoLabel}>File name:</span>
              <span className={styles.fileInfoValue}>{selectedFile.name}</span>
            </div>
            <div className={styles.fileInfoRow}>
              <span className={styles.fileInfoLabel}>Size:</span>
              <span className={styles.fileInfoValue}>
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
            <div className={styles.fileInfoRow}>
              <span className={styles.fileInfoLabel}>Type:</span>
              <span className={styles.fileInfoValue}>
                {selectedFile.type || "Unknown"}
              </span>
            </div>
          </div>
        )}

        {/* Codec Selector */}
        <div className={styles.codecSelector}>
          <label htmlFor="codec-select" className={styles.codecLabel}>
            Target Codec
          </label>
          <select
            id="codec-select"
            className={styles.codecSelect}
            value={selectedCodec}
            onChange={handleCodecChange}
            disabled={codecs.length === 0}
          >
            {codecs.length === 0 ? (
              <option value="">Loading codecs...</option>
            ) : (
              codecs.map((codec) => (
                <option key={codec.code} value={codec.code}>
                  {codec.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.convertButton}
            disabled={isConvertDisabled}
            onClick={handleConvert}
          >
            {isLoading ? "Processing..." : "Convert"}
          </button>
          {selectedFile && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={handleClearFile}
            >
              Clear Selection
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
