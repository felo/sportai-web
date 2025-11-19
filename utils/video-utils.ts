export const MAX_VIDEO_SIZE_MB = 20;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

export interface VideoValidationResult {
  valid: boolean;
  error?: string;
}

export function validateVideoFile(file: File): VideoValidationResult {
  if (!file.type.startsWith("video/")) {
    return {
      valid: false,
      error: "Please select a valid video file",
    };
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return {
      valid: false,
      error: `Video file size must be less than ${MAX_VIDEO_SIZE_MB}MB`,
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

