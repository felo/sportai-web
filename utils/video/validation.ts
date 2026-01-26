/**
 * Video Utilities - File Validation
 * 
 * Functions for validating video and image files.
 */

import { 
  VIDEO_EXTENSIONS,
  SUPPORTED_IMAGE_TYPES, 
  MAX_VIDEO_SIZE_BYTES,
  EXTREME_SIZE_BYTES,
  EXTREME_SIZE_GB
} from "./constants";
import type { VideoValidationResult, ValidateVideoFileOptions } from "./types";

/**
 * Check if a URL points to a video file based on its extension
 */
export function isVideoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const pathWithoutQuery = pathname.split('?')[0];
    return VIDEO_EXTENSIONS.some(ext => pathWithoutQuery.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Check if a file is an image based on MIME type
 */
export function isImageFile(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase() as typeof SUPPORTED_IMAGE_TYPES[number]);
}

/**
 * Get the media type of a file
 */
export function getMediaType(file: File): 'video' | 'image' {
  return isImageFile(file) ? 'image' : 'video';
}

/**
 * Validate a video or image file for upload
 */
export function validateVideoFile(file: File, options?: ValidateVideoFileOptions): VideoValidationResult {
  const isVideo = file.type.startsWith("video/");
  const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase() as typeof SUPPORTED_IMAGE_TYPES[number]);

  if (!isVideo && !isImage) {
    return {
      valid: false,
      error: "Please select a valid video or image file (JPEG, PNG, GIF, WebP)",
      errorType: 'invalid_type',
    };
  }

  // For videos, enforce the 100MB limit (unless skipSizeLimit is true)
  if (isVideo && !options?.skipSizeLimit && file.size > MAX_VIDEO_SIZE_BYTES) {
    return {
      valid: false,
      errorType: 'file_size_limit',
    };
  }

  // Block extremely large files (> 10GB)
  if (file.size > EXTREME_SIZE_BYTES) {
    return {
      valid: false,
      error: `File is extremely large (${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB). Please use a file under ${EXTREME_SIZE_GB}GB.`,
      errorType: 'extreme_size',
    };
  }

  return { valid: true };
}

/**
 * Create a preview URL for a video file
 */
export function createVideoPreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a video preview URL to free memory
 */
export function revokeVideoPreview(previewUrl: string | null): void {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }
}
