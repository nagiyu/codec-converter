/**
 * ConversionJob entity representing a video conversion job.
 */

/** Status of the ConversionJob */
export type ConversionJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

/** Supported target codecs */
export type TargetCodec = 'h264' | 'vp9' | 'av1' | 'hevc';

/** ConversionJob data model */
export interface ConversionJob {
  /** Unique identifier (UUID) */
  id: string;
  /** Reference to the source VideoFile */
  video_file_id: string;
  /** Target codec for conversion */
  target_codec: TargetCodec;
  /** Container format hint (e.g., 'mp4', 'webm') (optional) */
  container_hint?: string;
  /** Status of the conversion job */
  status: ConversionJobStatus;
  /** Progress percentage (0-100) */
  progress_percent: number;
  /** Job submission timestamp (ISO 8601) */
  submitted_at: string;
  /** Job start timestamp (ISO 8601) (optional) */
  started_at?: string;
  /** Job finish timestamp (ISO 8601) (optional) */
  finished_at?: string;
  /** S3 object key for the output file (optional) */
  output_s3_key?: string;
  /** Error message if job failed (optional) */
  error_message?: string;
}
