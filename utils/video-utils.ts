import { videoLogger } from "@/lib/logger";

// Maximum video size aligned with Gemini API limit
// Files larger than this will receive a natural dialogue response from the LLM
export const MAX_VIDEO_SIZE_MB = 100;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

export interface VideoValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Video URL Detection
// ============================================================================

// Supported video file extensions for URL detection
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.wmv', '.flv'];

/**
 * Extract all URLs from a text string
 */
export function extractUrls(text: string): string[] {
  // Match URLs - basic pattern that catches most common URLs
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  return text.match(urlRegex) || [];
}

/**
 * Check if a URL points to a video file based on its extension
 */
export function isVideoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    // Remove query params for extension check
    const pathWithoutQuery = pathname.split('?')[0];
    // Check for video extensions
    return VIDEO_EXTENSIONS.some(ext => pathWithoutQuery.endsWith(ext));
  } catch {
    return false;
  }
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
 * Video URL validation result
 */
export interface VideoUrlValidation {
  valid: boolean;
  url: string;
  accessible: boolean;
  contentType?: string;
  contentLength?: number;
  error?: string;
  errorType?: 'cors' | 'auth' | 'not-found' | 'not-video' | 'too-large' | 'timeout' | 'network';
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
    // First, try a HEAD request to check accessibility without downloading
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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
          // Some servers return octet-stream for videos, so we'll still try
          // if it has a video extension
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
          // CORS error - the URL might still work server-side
          result.error = 'Cannot verify this video directly (CORS restricted)';
          result.errorType = 'cors';
          // Mark as valid anyway - we'll try to use it
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

  // Client-side validation allows files through - even if > 100MB
  // This ensures the server can respond with a natural dialogue message
  // Only block extremely large files (> 10GB) that would cause upload issues
  const EXTREME_SIZE_GB = 10;
  const EXTREME_SIZE_BYTES = EXTREME_SIZE_GB * 1024 * 1024 * 1024;
  
  if (file.size > EXTREME_SIZE_BYTES) {
    return {
      valid: false,
      error: ` File is extremely large (${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB). Please use a file under ${EXTREME_SIZE_GB}GB.`,
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
 * Video codec compatibility check result
 */
export interface VideoCompatibilityResult {
  compatible: boolean;
  issues: VideoCompatibilityIssue[];
  codec?: string;
  isHEVC: boolean;
  isHDR: boolean;
  isAppleQuickTime: boolean; // Apple-specific QuickTime format that may need conversion
  hasRotation: boolean;
  rotationDegrees?: number;
  width?: number;
  height?: number;
  duration?: number;
  canTranscode: boolean; // Whether WebCodecs API is available
}

export interface VideoCompatibilityIssue {
  type: 'hevc' | 'hdr' | 'dolby_vision' | 'rotation' | 'unsupported_codec' | 'apple_quicktime';
  description: string;
  severity: 'error' | 'warning';
}

/**
 * Check if the browser supports WebCodecs API for transcoding
 */
export function isWebCodecsSupported(): boolean {
  return typeof VideoDecoder !== 'undefined' && 
         typeof VideoEncoder !== 'undefined' &&
         typeof VideoFrame !== 'undefined';
}

/**
 * Search for a 4-byte pattern (FourCC code) in a byte array
 */
function findFourCC(bytes: Uint8Array, fourcc: string): boolean {
  const pattern = [
    fourcc.charCodeAt(0),
    fourcc.charCodeAt(1),
    fourcc.charCodeAt(2),
    fourcc.charCodeAt(3),
  ];
  
  for (let i = 0; i <= bytes.length - 4; i++) {
    if (bytes[i] === pattern[0] &&
        bytes[i + 1] === pattern[1] &&
        bytes[i + 2] === pattern[2] &&
        bytes[i + 3] === pattern[3]) {
      return true;
    }
  }
  return false;
}

/**
 * Parse MP4/MOV file to detect codec information from the file
 * Reads from BOTH start and end of file since MOV files can have 
 * the "moov" atom at the end (common with iPhone recordings)
 */
async function detectCodecFromFile(file: File): Promise<{
  isHEVC: boolean;
  isHDR: boolean;
  hasDolbyVision: boolean;
  isAppleQuickTime: boolean;
}> {
  videoLogger.debug('[VideoCodec] detectCodecFromFile called for:', file.name, 'size:', file.size);
  
  // Check file extension and MIME type for MOV
  const isMOVExtension = file.name.toLowerCase().endsWith('.mov');
  const isMOVMimeType = file.type === 'video/quicktime';
  
  const scanBytes = async (bytes: Uint8Array, label: string): Promise<{
    isHEVC: boolean;
    isHDR: boolean;
    hasDolbyVision: boolean;
    isAppleQuickTime: boolean;
  }> => {
    let isHEVC = false;
    let isHDR = false;
    let hasDolbyVision = false;
    let isAppleQuickTime = false;
    
    videoLogger.debug(`[VideoCodec] Scanning ${label}: ${bytes.length} bytes`);
    
    // HEVC codec identifiers (FourCC codes)
    if (findFourCC(bytes, 'hvc1')) {
      isHEVC = true;
      videoLogger.debug('[VideoCodec] ✓ Found hvc1 in', label);
    }
    if (findFourCC(bytes, 'hev1')) {
      isHEVC = true;
      videoLogger.debug('[VideoCodec] ✓ Found hev1 in', label);
    }
    if (findFourCC(bytes, 'hevc') || findFourCC(bytes, 'HEVC')) {
      isHEVC = true;
      videoLogger.debug('[VideoCodec] ✓ Found hevc/HEVC in', label);
    }
    
    // Dolby Vision indicators
    if (findFourCC(bytes, 'dvh1') || findFourCC(bytes, 'dvhe') || findFourCC(bytes, 'dovi') || findFourCC(bytes, 'dvvC')) {
      hasDolbyVision = true;
      isHDR = true;
      videoLogger.debug('[VideoCodec] ✓ Found Dolby Vision in', label);
    }
    
    // HDR indicators
    if (findFourCC(bytes, 'arib') || findFourCC(bytes, 'smpt')) {
      isHDR = true;
      videoLogger.debug('[VideoCodec] ✓ Found HDR indicator in', label);
    }
    
    // Apple QuickTime indicators
    // "qt  " is Apple QuickTime brand (with two trailing spaces)
    if (findFourCC(bytes, 'qt  ')) {
      isAppleQuickTime = true;
      videoLogger.debug('[VideoCodec] ✓ Found QuickTime brand (qt  ) in', label);
    }
    
    // Apple Positional Audio Codec (spatial audio) - not browser compatible
    if (findFourCC(bytes, 'apac')) {
      isAppleQuickTime = true;
      videoLogger.debug('[VideoCodec] ✓ Found Apple Positional Audio (apac) in', label);
    }
    
    // Apple metadata boxes (mebx) - indicates Apple-specific format
    if (findFourCC(bytes, 'mebx')) {
      isAppleQuickTime = true;
      videoLogger.debug('[VideoCodec] ✓ Found Apple metadata box (mebx) in', label);
    }
    
    // Apple ProRes codecs
    if (findFourCC(bytes, 'apch') || findFourCC(bytes, 'apcn') || 
        findFourCC(bytes, 'apcs') || findFourCC(bytes, 'apco') || 
        findFourCC(bytes, 'ap4h') || findFourCC(bytes, 'ap4x')) {
      isAppleQuickTime = true;
      videoLogger.debug('[VideoCodec] ✓ Found Apple ProRes codec in', label);
    }
    
    return { isHEVC, isHDR, hasDolbyVision, isAppleQuickTime };
  };
  
  const readSlice = (start: number, end: number): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file.slice(start, end));
    });
  };
  
  try {
    // Read first 200KB
    const startBytes = await readSlice(0, 200000);
    const startResult = await scanBytes(startBytes, 'file start');
    
    // Track if we found Apple QuickTime markers
    let isAppleQuickTime = startResult.isAppleQuickTime || isMOVExtension || isMOVMimeType;
    
    if (startResult.isHEVC) {
      videoLogger.debug('[VideoCodec] HEVC detected in file start');
      return { ...startResult, isAppleQuickTime };
    }
    
    // If not found at start, read last 500KB (moov atom often at end for iPhone)
    if (file.size > 500000) {
      const endBytes = await readSlice(file.size - 500000, file.size);
      const endResult = await scanBytes(endBytes, 'file end');
      
      // Combine Apple QuickTime detection from both scans
      isAppleQuickTime = isAppleQuickTime || endResult.isAppleQuickTime;
      
      if (endResult.isHEVC) {
        videoLogger.debug('[VideoCodec] HEVC detected in file end');
        return { ...endResult, isAppleQuickTime };
      }
    }
    
    videoLogger.debug('[VideoCodec] No HEVC detected in file, isAppleQuickTime:', isAppleQuickTime);
    return { isHEVC: false, isHDR: false, hasDolbyVision: false, isAppleQuickTime };
    
  } catch (err) {
    videoLogger.error('[VideoCodec] Error reading file:', err);
    return { isHEVC: false, isHDR: false, hasDolbyVision: false, isAppleQuickTime: isMOVExtension || isMOVMimeType };
  }
}

/**
 * Check video compatibility by attempting to play it
 * Returns detailed codec and compatibility information
 */
export async function checkVideoCodecCompatibility(file: File): Promise<VideoCompatibilityResult> {
  videoLogger.debug('[VideoCodec] Starting compatibility check for:', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(1)}MB`);
  
  const issues: VideoCompatibilityIssue[] = [];
  
  // Skip check for images
  if (isImageFile(file)) {
    videoLogger.debug('[VideoCodec] Skipping check - file is an image');
    return {
      compatible: true,
      issues: [],
      isHEVC: false,
      isHDR: false,
      isAppleQuickTime: false,
      hasRotation: false,
      canTranscode: isWebCodecsSupported(),
    };
  }
  
  // First, try to detect codec from file header
  videoLogger.debug('[VideoCodec] Detecting codec from file header...');
  const fileCodecInfo = await detectCodecFromFile(file);
  videoLogger.debug('[VideoCodec] File codec detection result:', fileCodecInfo);
  
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        
        // If we timeout but detected HEVC from file, report it
        if (fileCodecInfo.isHEVC) {
          issues.push({
            type: 'hevc',
            description: 'This video uses HEVC (H.265) codec which may not play in all browsers',
            severity: 'error',
          });
        }
        
        if (fileCodecInfo.isHDR) {
          issues.push({
            type: 'hdr',
            description: 'This video contains HDR content which may not display correctly',
            severity: 'warning',
          });
        }
        
        if (fileCodecInfo.hasDolbyVision) {
          issues.push({
            type: 'dolby_vision',
            description: 'This video uses Dolby Vision HDR format',
            severity: 'warning',
          });
        }
        
        // Both HEVC and Apple QuickTime need conversion for Gemini API
        if (fileCodecInfo.isAppleQuickTime && !fileCodecInfo.isHEVC) {
          issues.push({
            type: 'apple_quicktime',
            description: 'This Apple QuickTime video needs conversion for API compatibility',
            severity: 'warning',
          });
        }
        
        resolve({
          compatible: !fileCodecInfo.isHEVC && !fileCodecInfo.isAppleQuickTime,
          issues,
          isHEVC: fileCodecInfo.isHEVC,
          isHDR: fileCodecInfo.isHDR,
          isAppleQuickTime: fileCodecInfo.isAppleQuickTime,
          hasRotation: false,
          canTranscode: isWebCodecsSupported(),
        });
      }
    }, 5000);
    
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('error', onError);
      video.src = '';
      URL.revokeObjectURL(video.src);
    };
    
    const onMetadata = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      
      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = video.duration;
      
      // Try to get more info by seeking
      video.currentTime = 0.1;
      
      // Check if we can actually decode frames
      const checkDecode = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(video, 0, 0, 1, 1);
            // If we get here, the video can be decoded
            
            // Even if playable, check if it's HEVC (some browsers support it)
            if (fileCodecInfo.isHEVC) {
              issues.push({
                type: 'hevc',
                description: 'This video uses HEVC (H.265) codec. While it plays in your browser, it may not work in others.',
                severity: 'warning',
              });
            }
            
            if (fileCodecInfo.isHDR) {
              issues.push({
                type: 'hdr',
                description: 'This video contains HDR content which may not display correctly in all browsers',
                severity: 'warning',
              });
            }
            
            if (fileCodecInfo.hasDolbyVision) {
              issues.push({
                type: 'dolby_vision',
                description: 'This video uses Dolby Vision HDR format',
                severity: 'warning',
              });
            }
            
            // Check for Apple QuickTime format - needs conversion for Gemini API compatibility
            if (fileCodecInfo.isAppleQuickTime && !fileCodecInfo.isHEVC) {
              videoLogger.debug('[VideoCodec] Apple QuickTime H.264 detected - converting for API compatibility');
              issues.push({
                type: 'apple_quicktime',
                description: 'This Apple QuickTime video will be converted to MP4 for better compatibility',
                severity: 'warning',
              });
            }
          }
          
          // Both HEVC and Apple QuickTime need conversion for Gemini API compatibility
          const needsConversion = fileCodecInfo.isHEVC || fileCodecInfo.isAppleQuickTime;
          
          cleanup();
          resolve({
            compatible: !needsConversion,
            issues,
            isHEVC: fileCodecInfo.isHEVC,
            isHDR: fileCodecInfo.isHDR,
            isAppleQuickTime: fileCodecInfo.isAppleQuickTime,
            hasRotation: false, // Would need more complex detection
            width,
            height,
            duration,
            canTranscode: isWebCodecsSupported(),
          });
        } catch {
          // Can't decode - likely HEVC on unsupported browser
          issues.push({
            type: 'hevc',
            description: 'This video uses HEVC (H.265) codec which cannot be played in your browser',
            severity: 'error',
          });
          
          if (fileCodecInfo.isHDR) {
            issues.push({
              type: 'hdr',
              description: 'This video contains HDR content',
              severity: 'warning',
            });
          }
          
          cleanup();
          resolve({
            compatible: false,
            issues,
            isHEVC: true,
            isHDR: fileCodecInfo.isHDR,
            isAppleQuickTime: fileCodecInfo.isAppleQuickTime,
            hasRotation: false,
            width,
            height,
            duration,
            canTranscode: isWebCodecsSupported(),
          });
        }
      };
      
      video.addEventListener('seeked', checkDecode, { once: true });
      video.addEventListener('error', () => {
        // Seek failed, try check anyway
        checkDecode();
      }, { once: true });
    };
    
    const onError = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      cleanup();
      
      // Video element error - likely unsupported codec
      if (fileCodecInfo.isHEVC) {
        issues.push({
          type: 'hevc',
          description: 'This video uses HEVC (H.265) codec which is not supported in your browser',
          severity: 'error',
        });
      } else {
        issues.push({
          type: 'unsupported_codec',
          description: 'This video format is not supported in your browser',
          severity: 'error',
        });
      }
      
      if (fileCodecInfo.isHDR) {
        issues.push({
          type: 'hdr',
          description: 'This video contains HDR content',
          severity: 'warning',
        });
      }
      
      resolve({
        compatible: false,
        issues,
        isHEVC: fileCodecInfo.isHEVC,
        isHDR: fileCodecInfo.isHDR,
        isAppleQuickTime: fileCodecInfo.isAppleQuickTime,
        hasRotation: false,
        canTranscode: isWebCodecsSupported(),
      });
    };
    
    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('error', onError);
    
    const url = URL.createObjectURL(file);
    video.src = url;
  });
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
    videoLogger.error('Error downloading video:', error);
    throw new Error('Failed to load demo video. Please try uploading your own video.');
  }
}

/**
 * Extract the first frame from a video file as a JPEG blob, along with duration
 * Returns a low-resolution image (~640px wide) for efficient API calls
 * 
 * @param file - Video file to extract frame from
 * @param maxWidth - Maximum width of the output image (default 640px)
 * @param quality - JPEG quality 0-1 (default 0.8)
 * @returns Promise with frameBlob and durationSeconds
 */
export async function extractFirstFrameWithDuration(
  file: File,
  maxWidth: number = 640,
  quality: number = 0.8
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
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    let resolved = false;
    let videoDuration: number | null = null;
    
    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error('Timeout extracting first frame from video'));
      }
    }, 10000);
    
    const cleanup = () => {
      video.removeEventListener('loadeddata', onLoadedData);
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
        
        // Ensure even dimensions (required for some codecs)
        width = width % 2 === 0 ? width : width - 1;
        height = height % 2 === 0 ? height : height - 1;
        
        // Create canvas and draw the frame
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not create canvas context');
        }
        
        ctx.drawImage(video, 0, 0, width, height);
        
        // Convert to JPEG blob
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
      extractFrame();
      cleanup();
    };
    
    const onLoadedData = () => {
      // Capture duration when metadata is available
      if (isFinite(video.duration) && video.duration > 0) {
        videoDuration = video.duration;
        videoLogger.debug(`[extractFirstFrameWithDuration] Video duration: ${videoDuration}s`);
      }
      // Video has enough data to display first frame
      // Seek to a tiny offset to ensure frame is ready
      video.currentTime = 0.001;
    };
    
    const onError = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      cleanup();
      reject(new Error('Error loading video for frame extraction'));
    };
    
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    
    // Handle case where video is already loaded (cached)
    if (video.readyState >= 2) {
      video.currentTime = 0.001;
    }
    
    const url = URL.createObjectURL(file);
    video.src = url;
  });
}

/**
 * Extract the first frame from a video file as a JPEG blob
 * Returns a low-resolution image (~640px wide) for efficient API calls
 * 
 * @param file - Video file to extract frame from
 * @param maxWidth - Maximum width of the output image (default 640px)
 * @param quality - JPEG quality 0-1 (default 0.8)
 * @returns Promise<Blob> - JPEG blob of the first frame
 * @deprecated Use extractFirstFrameWithDuration instead to also get duration
 */
export async function extractFirstFrame(
  file: File,
  maxWidth: number = 640,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Skip if it's an image file - just return the image itself
    if (isImageFile(file)) {
      // For images, we could resize but for simplicity just return as-is
      // The API will handle the image directly
      file.arrayBuffer()
        .then(buffer => resolve(new Blob([buffer], { type: file.type })))
        .catch(reject);
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    let resolved = false;
    
    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error('Timeout extracting first frame from video'));
      }
    }, 10000);
    
    const cleanup = () => {
      video.removeEventListener('loadeddata', onLoadedData);
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
        
        // Ensure even dimensions (required for some codecs)
        width = width % 2 === 0 ? width : width - 1;
        height = height % 2 === 0 ? height : height - 1;
        
        // Create canvas and draw the frame
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not create canvas context');
        }
        
        ctx.drawImage(video, 0, 0, width, height);
        
        // Convert to JPEG blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              videoLogger.debug(`[extractFirstFrame] Extracted frame: ${width}x${height}, ${(blob.size / 1024).toFixed(1)}KB`);
              resolve(blob);
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
      extractFrame();
      cleanup();
    };
    
    const onLoadedData = () => {
      // Video has enough data to display first frame
      // Seek to a tiny offset to ensure frame is ready
      video.currentTime = 0.001;
    };
    
    const onError = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      cleanup();
      reject(new Error('Error loading video for frame extraction'));
    };
    
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    
    // Handle case where video is already loaded (cached)
    if (video.readyState >= 2) {
      video.currentTime = 0.001;
    }
    
    const url = URL.createObjectURL(file);
    video.src = url;
  });
}

/**
 * Result from extracting first frame from a video URL
 */
export interface VideoFrameExtractionResult {
  frameBlob: Blob | null;
  durationSeconds: number | null;
}

/**
 * Estimate PRO analysis processing time based on video duration
 * - Videos up to 20 minutes: ~5-10 minutes
 * - Videos over 20 minutes: ~70% of video duration
 * 
 * @param durationSeconds - Video duration in seconds
 * @returns Human-readable estimate string
 */
export function estimateProAnalysisTime(durationSeconds: number | null): string {
  if (!durationSeconds || durationSeconds <= 0) {
    return "~5-10 minutes"; // Default when duration unknown
  }
  
  const durationMinutes = durationSeconds / 60;
  
  if (durationMinutes <= 20) {
    return "~5-10 minutes";
  }
  
  // For longer videos: 70% of video duration
  const estimatedMinutes = Math.ceil(durationMinutes * 0.7);
  
  if (estimatedMinutes < 60) {
    return `~${estimatedMinutes} minutes`;
  }
  
  // Format as hours and minutes for very long videos
  const hours = Math.floor(estimatedMinutes / 60);
  const mins = estimatedMinutes % 60;
  if (mins === 0) {
    return `~${hours} hour${hours > 1 ? 's' : ''}`;
  }
  return `~${hours}h ${mins}m`;
}

/**
 * Extract the first frame from a video URL as a JPEG blob
 * This attempts client-side extraction which may fail due to CORS.
 * Returns null values if CORS blocks the request, allowing fallback to server-side.
 * 
 * @param videoUrl - URL of the video to extract frame from
 * @param maxWidth - Maximum width of the output image (default 640px)
 * @param quality - JPEG quality 0-1 (default 0.8)
 * @returns Promise with frameBlob and durationSeconds (either may be null if CORS blocked)
 */
export async function extractFirstFrameFromUrl(
  videoUrl: string,
  maxWidth: number = 640,
  quality: number = 0.8
): Promise<VideoFrameExtractionResult> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    // Enable CORS - will fail for non-CORS URLs
    video.crossOrigin = 'anonymous';
    
    let resolved = false;
    let videoDuration: number | null = null;
    
    // Timeout after 15 seconds (URLs may be slower than local files)
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        videoLogger.warn('[extractFirstFrameFromUrl] Timeout loading video URL');
        resolve({ frameBlob: null, durationSeconds: videoDuration });
      }
    }, 15000);
    
    const cleanup = () => {
      video.removeEventListener('loadeddata', onLoadedData);
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
        
        // Create canvas and draw the frame
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          videoLogger.warn('[extractFirstFrameFromUrl] Could not create canvas context');
          resolve({ frameBlob: null, durationSeconds: videoDuration });
          return;
        }
        
        // This will throw a security error if CORS is blocked
        try {
          ctx.drawImage(video, 0, 0, width, height);
        } catch (corsError) {
          videoLogger.warn('[extractFirstFrameFromUrl] CORS blocked canvas access:', corsError);
          resolve({ frameBlob: null, durationSeconds: videoDuration });
          return;
        }
        
        // Convert to JPEG blob
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
      extractFrame();
      cleanup();
    };
    
    const onLoadedData = () => {
      // Capture duration when metadata is available
      if (isFinite(video.duration) && video.duration > 0) {
        videoDuration = video.duration;
        videoLogger.debug(`[extractFirstFrameFromUrl] Video duration: ${videoDuration}s`);
      }
      // Video has enough data to display first frame
      // Seek to a tiny offset to ensure frame is ready
      video.currentTime = 0.001;
    };
    
    const onError = (e: Event) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      cleanup();
      // CORS errors often manifest as video load errors
      videoLogger.warn('[extractFirstFrameFromUrl] Error loading video URL (likely CORS):', e);
      resolve({ frameBlob: null, durationSeconds: videoDuration });
    };
    
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    
    // Handle case where video is already loaded (cached)
    if (video.readyState >= 2) {
      video.currentTime = 0.001;
    }
    
    video.src = videoUrl;
  });
}

// ============================================================================
// Thumbnail Upload Utility
// ============================================================================

export interface ThumbnailUploadResult {
  thumbnailUrl: string;
  thumbnailS3Key: string;
}

/**
 * Upload a thumbnail blob to S3
 * Reusable utility for uploading video thumbnails
 * 
 * @param frameBlob - JPEG blob of the thumbnail
 * @returns Promise with thumbnailUrl and thumbnailS3Key
 */
export async function uploadThumbnailToS3(
  frameBlob: Blob
): Promise<ThumbnailUploadResult | null> {
  try {
    videoLogger.debug("[uploadThumbnailToS3] Uploading thumbnail to S3...");
    const thumbnailFile = new File([frameBlob], `thumbnail_${Date.now()}.jpg`, { type: "image/jpeg" });
    
    // Get presigned upload URL
    const urlResponse = await fetch("/api/s3/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: thumbnailFile.name,
        contentType: thumbnailFile.type,
      }),
    });
    
    if (!urlResponse.ok) {
      videoLogger.warn("[uploadThumbnailToS3] Failed to get upload URL for thumbnail");
      return null;
    }
    
    const { url: presignedUrl, downloadUrl, key: s3Key } = await urlResponse.json();
    
    // Upload to S3
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.addEventListener("load", () => {
        if (xhr.status === 200 || xhr.status === 204) {
          resolve();
        } else {
          reject(new Error(`Thumbnail upload failed: ${xhr.status}`));
        }
      });
      xhr.addEventListener("error", () => reject(new Error("Thumbnail upload failed")));
      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", thumbnailFile.type);
      xhr.send(thumbnailFile);
    });
    
    videoLogger.debug("[uploadThumbnailToS3] ✅ Thumbnail uploaded to S3:", s3Key);
    return { thumbnailUrl: downloadUrl, thumbnailS3Key: s3Key };
  } catch (err) {
    videoLogger.warn("[uploadThumbnailToS3] Thumbnail upload failed (non-blocking):", err);
    return null;
  }
}

