export const MAX_VIDEO_SIZE_MB = 20;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

export interface VideoValidationResult {
  valid: boolean;
  error?: string;
}

// Supported image MIME types
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

export function validateVideoFile(file: File): VideoValidationResult {
  const isVideo = file.type.startsWith("video/");
  const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase());

  if (!isVideo && !isImage) {
    return {
      valid: false,
      error: "Please select a valid video or image file (JPEG, PNG, GIF, WebP)",
    };
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_VIDEO_SIZE_MB}MB`,
    };
  }

  return { valid: true };
}

export function createVideoPreview(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeVideoPreview(previewUrl: string | null): void {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }
}

