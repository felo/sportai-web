export const MAX_VIDEO_SIZE_MB = 100;
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
      error: " Please select a valid video or image file (JPEG, PNG, GIF, WebP)",
    };
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return {
      valid: false,
      error: ` File size must be less than ${MAX_VIDEO_SIZE_MB}MB`,
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

export function isImageFile(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase());
}

export function getMediaType(file: File): 'video' | 'image' {
  return isImageFile(file) ? 'image' : 'video';
}

/**
 * Downloads a video from a URL and converts it to a File object
 */
export async function downloadVideoFromUrl(url: string): Promise<File> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Extract filename from URL or use a default
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1] || 'demo-video.mp4';
    
    // Create a File object from the blob
    const file = new File([blob], filename, { type: blob.type || 'video/mp4' });
    
    return file;
  } catch (error) {
    console.error('Error downloading video:', error);
    throw new Error('Failed to load demo video. Please try uploading your own video.');
  }
}

