/**
 * Video Utilities Module
 * 
 * Comprehensive utilities for video file handling:
 * - File validation and type checking
 * - URL detection and validation
 * - Codec compatibility checking
 * - Frame extraction for thumbnails
 * - S3 thumbnail upload
 */

// ============================================================================
// Types
// ============================================================================

export type {
  VideoValidationErrorType,
  VideoValidationResult,
  ValidateVideoFileOptions,
  VideoUrlValidation,
  VideoCompatibilityResult,
  VideoCompatibilityIssue,
  VideoFrameExtractionResult,
  ThumbnailUploadResult,
} from "./types";

// ============================================================================
// Constants
// ============================================================================

export {
  MAX_VIDEO_SIZE_MB,
  MAX_VIDEO_SIZE_BYTES,
  EXTREME_SIZE_GB,
  EXTREME_SIZE_BYTES,
  VIDEO_EXTENSIONS,
  SUPPORTED_IMAGE_TYPES,
  URL_VALIDATION_TIMEOUT,
  FRAME_EXTRACTION_TIMEOUT,
  FRAME_EXTRACTION_URL_TIMEOUT,
  CODEC_CHECK_TIMEOUT,
  DEFAULT_FRAME_MAX_WIDTH,
  DEFAULT_FRAME_QUALITY,
} from "./constants";

// ============================================================================
// Validation Functions
// ============================================================================

export {
  isVideoUrl,
  isImageFile,
  getMediaType,
  validateVideoFile,
  createVideoPreview,
  revokeVideoPreview,
} from "./validation";

// ============================================================================
// URL Detection Functions
// ============================================================================

export {
  extractUrls,
  extractVideoUrls,
  validateVideoUrl,
  downloadVideoFromUrl,
} from "./url-detection";

// ============================================================================
// Codec Compatibility Functions
// ============================================================================

export {
  isWebCodecsSupported,
  checkVideoCodecCompatibility,
} from "./codec-compatibility";

// ============================================================================
// Frame Extraction Functions
// ============================================================================

export {
  extractFirstFrameWithDuration,
  extractFirstFrame,
  estimateProAnalysisTime,
  extractFirstFrameFromUrl,
} from "./frame-extraction";

// ============================================================================
// Thumbnail Functions
// ============================================================================

export {
  uploadThumbnailToS3,
} from "./thumbnail";
