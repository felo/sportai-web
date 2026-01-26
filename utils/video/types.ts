/**
 * Video Utilities - Type Definitions
 * 
 * All interfaces and types for video processing utilities.
 */

// ============================================================================
// Validation Types
// ============================================================================

export type VideoValidationErrorType = 'file_size_limit' | 'invalid_type' | 'extreme_size';

export interface VideoValidationResult {
  valid: boolean;
  error?: string;
  errorType?: VideoValidationErrorType;
}

export interface ValidateVideoFileOptions {
  /** 
   * Skip the 100MB size limit check (still enforces 10GB max).
   * Used for developer mode uploads where larger files are allowed.
   */
  skipSizeLimit?: boolean;
}

// ============================================================================
// URL Validation Types
// ============================================================================

export interface VideoUrlValidation {
  valid: boolean;
  url: string;
  accessible: boolean;
  contentType?: string;
  contentLength?: number;
  error?: string;
  errorType?: 'cors' | 'auth' | 'not-found' | 'not-video' | 'too-large' | 'timeout' | 'network';
}

// ============================================================================
// Codec Compatibility Types
// ============================================================================

export interface VideoCompatibilityResult {
  compatible: boolean;
  issues: VideoCompatibilityIssue[];
  codec?: string;
  isHEVC: boolean;
  isHDR: boolean;
  isAppleQuickTime: boolean;
  hasRotation: boolean;
  rotationDegrees?: number;
  width?: number;
  height?: number;
  duration?: number;
  canTranscode: boolean;
}

export interface VideoCompatibilityIssue {
  type: 'hevc' | 'hdr' | 'dolby_vision' | 'rotation' | 'unsupported_codec' | 'apple_quicktime';
  description: string;
  severity: 'error' | 'warning';
}

// ============================================================================
// Frame Extraction Types
// ============================================================================

export interface VideoFrameExtractionResult {
  frameBlob: Blob | null;
  durationSeconds: number | null;
}

// ============================================================================
// Thumbnail Types
// ============================================================================

export interface ThumbnailUploadResult {
  thumbnailUrl: string;
  thumbnailS3Key: string;
}
