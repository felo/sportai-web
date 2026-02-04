/**
 * Video Utilities - Frame Extraction
 *
 * Functions for extracting thumbnail frames from videos.
 */

import { videoLogger } from "@/lib/logger";
import {
  FRAME_EXTRACTION_TIMEOUT,
  FRAME_EXTRACTION_URL_TIMEOUT,
  DEFAULT_FRAME_MAX_WIDTH,
  DEFAULT_FRAME_QUALITY
} from "./constants";
import { isImageFile } from "./validation";
import type { VideoFrameExtractionResult } from "./types";

/**
 * Extract the first frame from a video file as a JPEG blob, along with duration
 * Returns a low-resolution image (~640px wide) for efficient API calls
 *
 * @param file - Video file to extract frame from
 * @param maxWidth - Maximum width of the output image (default 640px)
 * @param quality - JPEG quality 0-1 (default 0.8)
 */
export async function extractFirstFrameWithDuration(
  file: File,
  maxWidth: number = DEFAULT_FRAME_MAX_WIDTH,
  quality: number = DEFAULT_FRAME_QUALITY
): Promise<VideoFrameExtractionResult> {
  return new Promise((resolve, reject) => {
    // Skip if it's an image file - just return the image itself with no duration
    if (isImageFile(file)) {
      file.arrayBuffer()
        .then(buffer => resolve({
          frameBlob: new Blob([buffer], { type: file.type }),
          durationSeconds: null
        }))
        .catch(reject);
      return;
    }

    const video = document.createElement('video');
    video.preload = 'auto'; // Use 'auto' to load more data upfront (iOS Photos app fix)
    video.muted = true;
    video.playsInline = true;

    let resolved = false;
    let videoDuration: number | null = null;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error('Timeout extracting first frame from video'));
      }
    }, FRAME_EXTRACTION_TIMEOUT);

    const cleanup = () => {
      video.removeEventListener('canplaythrough', onCanPlayThrough);
      video.removeEventListener('error', onError);
      video.removeEventListener('seeked', onSeeked);
      if (video.src) {
        URL.revokeObjectURL(video.src);
      }
      video.src = '';
    };

    const extractFrame = () => {
      try {
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        if (!videoWidth || !videoHeight) {
          throw new Error('Could not determine video dimensions');
        }

        // Calculate scaled dimensions maintaining aspect ratio
        let width = videoWidth;
        let height = videoHeight;

        if (width > maxWidth) {
          const scale = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * scale);
        }

        // Ensure even dimensions
        width = width % 2 === 0 ? width : width - 1;
        height = height % 2 === 0 ? height : height - 1;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not create canvas context');

        ctx.drawImage(video, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              videoLogger.debug(`[extractFirstFrameWithDuration] Extracted frame: ${width}x${height}, ${(blob.size / 1024).toFixed(1)}KB, duration: ${videoDuration}s`);
              resolve({ frameBlob: blob, durationSeconds: videoDuration });
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    const onSeeked = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      // Use requestAnimationFrame to ensure the frame is rendered before drawing (iOS Safari fix)
      requestAnimationFrame(() => {
        extractFrame();
        cleanup();
      });
    };

    // Use canplaythrough instead of loadeddata - waits for more data to be buffered
    // This fixes iOS Photos app which provides files progressively
    const onCanPlayThrough = () => {
      if (isFinite(video.duration) && video.duration > 0) {
        videoDuration = video.duration;
        videoLogger.debug(`[extractFirstFrameWithDuration] Video duration: ${videoDuration}s`);
      }
      // Seek to 0.1s instead of 0.001s for better iOS Safari compatibility
      video.currentTime = 0.1;
    };

    const onError = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      cleanup();
      reject(new Error('Error loading video for frame extraction'));
    };

    video.addEventListener('canplaythrough', onCanPlayThrough);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    if (video.readyState >= 4) { // HAVE_ENOUGH_DATA
      video.currentTime = 0.1;
    }

    const url = URL.createObjectURL(file);
    video.src = url;
    video.load(); // Explicitly trigger loading (iOS Photos app fix)
  });
}

/**
 * Extract the first frame from a video file as a JPEG blob
 * @deprecated Use extractFirstFrameWithDuration instead to also get duration
 */
export async function extractFirstFrame(
  file: File,
  maxWidth: number = DEFAULT_FRAME_MAX_WIDTH,
  quality: number = DEFAULT_FRAME_QUALITY
): Promise<Blob> {
  const result = await extractFirstFrameWithDuration(file, maxWidth, quality);
  if (!result.frameBlob) {
    throw new Error('Failed to extract frame');
  }
  return result.frameBlob;
}

/**
 * Estimate PRO analysis processing time based on video duration
 */
export function estimateProAnalysisTime(durationSeconds: number | null): string {
  if (!durationSeconds || durationSeconds <= 0) {
    return "~5-10 minutes";
  }

  const durationMinutes = durationSeconds / 60;

  if (durationMinutes <= 20) {
    return "~5-10 minutes";
  }

  const estimatedMinutes = Math.ceil(durationMinutes * 0.7);

  if (estimatedMinutes < 60) {
    return `~${estimatedMinutes} minutes`;
  }

  const hours = Math.floor(estimatedMinutes / 60);
  const mins = estimatedMinutes % 60;
  if (mins === 0) {
    return `~${hours} hour${hours > 1 ? 's' : ''}`;
  }
  return `~${hours}h ${mins}m`;
}

/**
 * Extract the first frame from a video URL as a JPEG blob
 * Returns null values if CORS blocks the request
 */
export async function extractFirstFrameFromUrl(
  videoUrl: string,
  maxWidth: number = DEFAULT_FRAME_MAX_WIDTH,
  quality: number = DEFAULT_FRAME_QUALITY
): Promise<VideoFrameExtractionResult> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto'; // Use 'auto' to load more data upfront (iOS Photos app fix)
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let resolved = false;
    let videoDuration: number | null = null;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        videoLogger.warn('[extractFirstFrameFromUrl] Timeout loading video URL');
        resolve({ frameBlob: null, durationSeconds: videoDuration });
      }
    }, FRAME_EXTRACTION_URL_TIMEOUT);

    const cleanup = () => {
      video.removeEventListener('canplaythrough', onCanPlayThrough);
      video.removeEventListener('error', onError);
      video.removeEventListener('seeked', onSeeked);
      video.src = '';
    };

    const extractFrame = () => {
      try {
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        if (!videoWidth || !videoHeight) {
          videoLogger.warn('[extractFirstFrameFromUrl] Could not determine video dimensions');
          resolve({ frameBlob: null, durationSeconds: videoDuration });
          return;
        }

        let width = videoWidth;
        let height = videoHeight;

        if (width > maxWidth) {
          const scale = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * scale);
        }

        width = width % 2 === 0 ? width : width - 1;
        height = height % 2 === 0 ? height : height - 1;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          videoLogger.warn('[extractFirstFrameFromUrl] Could not create canvas context');
          resolve({ frameBlob: null, durationSeconds: videoDuration });
          return;
        }

        try {
          ctx.drawImage(video, 0, 0, width, height);
        } catch (corsError) {
          videoLogger.warn('[extractFirstFrameFromUrl] CORS blocked canvas access:', corsError);
          resolve({ frameBlob: null, durationSeconds: videoDuration });
          return;
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              videoLogger.debug(`[extractFirstFrameFromUrl] Extracted frame: ${width}x${height}, ${(blob.size / 1024).toFixed(1)}KB, duration: ${videoDuration}s`);
              resolve({ frameBlob: blob, durationSeconds: videoDuration });
            } else {
              videoLogger.warn('[extractFirstFrameFromUrl] Failed to create blob from canvas');
              resolve({ frameBlob: null, durationSeconds: videoDuration });
            }
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        videoLogger.warn('[extractFirstFrameFromUrl] Error extracting frame:', err);
        resolve({ frameBlob: null, durationSeconds: videoDuration });
      }
    };

    const onSeeked = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      // Use requestAnimationFrame to ensure the frame is rendered before drawing (iOS Safari fix)
      requestAnimationFrame(() => {
        extractFrame();
        cleanup();
      });
    };

    // Use canplaythrough instead of loadeddata - waits for more data to be buffered
    // This fixes iOS Photos app which provides files progressively
    const onCanPlayThrough = () => {
      if (isFinite(video.duration) && video.duration > 0) {
        videoDuration = video.duration;
        videoLogger.debug(`[extractFirstFrameFromUrl] Video duration: ${videoDuration}s`);
      }
      // Seek to 0.1s instead of 0.001s for better iOS Safari compatibility
      video.currentTime = 0.1;
    };

    const onError = (e: Event) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      cleanup();
      videoLogger.warn('[extractFirstFrameFromUrl] Error loading video URL (likely CORS):', e);
      resolve({ frameBlob: null, durationSeconds: videoDuration });
    };

    video.addEventListener('canplaythrough', onCanPlayThrough);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    if (video.readyState >= 4) { // HAVE_ENOUGH_DATA
      video.currentTime = 0.1;
    }

    video.src = videoUrl;
    video.load(); // Explicitly trigger loading (iOS Photos app fix)
  });
}
