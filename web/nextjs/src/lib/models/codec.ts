/**
 * Codec entity representing a supported video codec.
 */

/** Codec data model */
export interface Codec {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Codec code (e.g., 'h264', 'vp9', 'av1', 'hevc') */
  code: string;
  /** Recommended container format (e.g., 'mp4', 'webm') */
  recommended_container: string;
}
