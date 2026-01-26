/**
 * Video Utilities - URL Detection
 * 
 * Functions for extracting and validating video URLs from text.
 */

import { videoLogger } from "@/lib/logger";
import { 
  VIDEO_EXTENSIONS, 
  MAX_VIDEO_SIZE_BYTES, 
  MAX_VIDEO_SIZE_MB,
  URL_VALIDATION_TIMEOUT 
} from "./constants";
import type { VideoUrlValidation } from "./types";
import { isVideoUrl } from "./validation";

/**
 * Extract all URLs from a text string
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  return text.match(urlRegex) || [];
}

/**
 * Extract video URLs from text
 * Returns an array of URLs that appear to be video files
 */
export function extractVideoUrls(text: string): string[] {
  const urls = extractUrls(text);
  return urls.filter(isVideoUrl);
}

/**
 * Validate that a video URL is accessible and points to a valid video
 * Uses a HEAD request to check without downloading the entire file
 */
export async function validateVideoUrl(url: string): Promise<VideoUrlValidation> {
  const result: VideoUrlValidation = {
    valid: false,
    url,
    accessible: false,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), URL_VALIDATION_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          result.error = 'This video requires authentication';
          result.errorType = 'auth';
        } else if (response.status === 404) {
          result.error = 'Video not found at this URL';
          result.errorType = 'not-found';
        } else {
          result.error = `Failed to access video (HTTP ${response.status})`;
          result.errorType = 'network';
        }
        return result;
      }

      result.accessible = true;

      // Check content type
      const contentType = response.headers.get('content-type');
      if (contentType) {
        result.contentType = contentType;
        if (!contentType.startsWith('video/') && !contentType.includes('octet-stream')) {
          if (!isVideoUrl(url)) {
            result.error = 'This URL does not point to a video file';
            result.errorType = 'not-video';
            return result;
          }
        }
      }

      // Check content length
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const sizeBytes = parseInt(contentLength, 10);
        result.contentLength = sizeBytes;
        
        if (sizeBytes > MAX_VIDEO_SIZE_BYTES) {
          const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
          result.error = `Video is too large (${sizeMB}MB). Maximum size is ${MAX_VIDEO_SIZE_MB}MB.`;
          result.errorType = 'too-large';
          return result;
        }
      }

      result.valid = true;
      return result;

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          result.error = 'Video server is taking too long to respond';
          result.errorType = 'timeout';
        } else if (fetchError.message.includes('CORS') || fetchError.message.includes('cors')) {
          result.error = 'Cannot verify this video directly (CORS restricted)';
          result.errorType = 'cors';
          result.valid = true;
          result.accessible = true;
        } else {
          result.error = 'Could not access this video URL';
          result.errorType = 'network';
        }
      }
      return result;
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error validating URL';
    result.errorType = 'network';
    return result;
  }
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
    
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1] || 'demo-video.mp4';
    
    const file = new File([blob], filename, { type: blob.type || 'video/mp4' });
    
    return file;
  } catch (error) {
    videoLogger.error('Error downloading video:', error);
    throw new Error('Failed to load demo video. Please try uploading your own video.');
  }
}
