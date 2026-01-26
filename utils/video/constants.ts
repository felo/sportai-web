/**
 * Video Utilities - Constants
 * 
 * Size limits, supported formats, and configuration values.
 */

// ============================================================================
// Size Limits
// ============================================================================

/** Maximum video size aligned with Gemini API limit (100MB) */
export const MAX_VIDEO_SIZE_MB = 100;

/** Maximum video size in bytes */
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

/** Extreme file size limit (10GB) - blocks uploads that would cause issues */
export const EXTREME_SIZE_GB = 10;

/** Extreme file size in bytes */
export const EXTREME_SIZE_BYTES = EXTREME_SIZE_GB * 1024 * 1024 * 1024;

// ============================================================================
// Supported Formats
// ============================================================================

/** Supported video file extensions for URL detection */
export const VIDEO_EXTENSIONS = [
  '.mp4', 
  '.mov', 
  '.webm', 
  '.avi', 
  '.mkv', 
  '.m4v', 
  '.wmv', 
  '.flv'
] as const;

/** Supported image MIME types */
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

// ============================================================================
// Timeouts
// ============================================================================

/** Timeout for URL validation (ms) */
export const URL_VALIDATION_TIMEOUT = 10000;

/** Timeout for frame extraction from file (ms) */
export const FRAME_EXTRACTION_TIMEOUT = 10000;

/** Timeout for frame extraction from URL (ms) */
export const FRAME_EXTRACTION_URL_TIMEOUT = 15000;

/** Timeout for codec compatibility check (ms) */
export const CODEC_CHECK_TIMEOUT = 5000;

// ============================================================================
// Frame Extraction Defaults
// ============================================================================

/** Default maximum width for extracted frames */
export const DEFAULT_FRAME_MAX_WIDTH = 640;

/** Default JPEG quality for extracted frames */
export const DEFAULT_FRAME_QUALITY = 0.8;
