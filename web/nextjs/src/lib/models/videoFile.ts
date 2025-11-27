/**
 * VideoFile entity representing an uploaded video file.
 */

/** Status of the VideoFile */
export type VideoFileStatus = 'uploaded' | 'processing' | 'ready' | 'failed';

/** VideoFile data model */
export interface VideoFile {
  /** Unique identifier (UUID) */
  id: string;
  /** Original filename */
  filename: string;
  /** S3 object key */
  s3_key: string;
  /** Container format (e.g., 'mp4', 'webm') */
  container: string;
  /** Video codec (e.g., 'h264', 'vp9', 'av1') - populated after analysis */
  video_codec?: string;
  /** Audio codec (optional) */
  audio_codec?: string;
  /** Duration in seconds - populated after analysis */
  duration_seconds?: number;
  /** Resolution (e.g., '1920x1080') - populated after analysis */
  resolution?: string;
  /** File size in bytes */
  file_size_bytes: number;
  /** Upload timestamp (ISO 8601) */
  upload_timestamp: string;
  /** Owner ID (optional) */
  owner_id?: string;
  /** Status of the video file */
  status: VideoFileStatus;
}
