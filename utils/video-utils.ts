// Maximum video size aligned with Gemini API limit
// Files larger than this will receive a natural dialogue response from the LLM
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

  // Client-side validation allows files through - even if > 100MB
  // This ensures the server can respond with a natural dialogue message
  // Only block extremely large files (> 500MB) that would cause upload issues
  const EXTREME_SIZE_MB = 500;
  const EXTREME_SIZE_BYTES = EXTREME_SIZE_MB * 1024 * 1024;
  
  if (file.size > EXTREME_SIZE_BYTES) {
    return {
      valid: false,
      error: ` File is extremely large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please use a file under ${EXTREME_SIZE_MB}MB.`,
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
  hasRotation: boolean;
  rotationDegrees?: number;
  width?: number;
  height?: number;
  duration?: number;
  canTranscode: boolean; // Whether WebCodecs API is available
}

export interface VideoCompatibilityIssue {
  type: 'hevc' | 'hdr' | 'dolby_vision' | 'rotation' | 'unsupported_codec';
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
 * Parse MP4/MOV file to detect HEVC codec from the file
 * Reads from BOTH start and end of file since MOV files can have 
 * the "moov" atom at the end (common with iPhone recordings)
 */
async function detectCodecFromFile(file: File): Promise<{
  isHEVC: boolean;
  isHDR: boolean;
  hasDolbyVision: boolean;
}> {
  console.log('[VideoCodec] detectCodecFromFile called for:', file.name, 'size:', file.size);
  
  const scanBytes = async (bytes: Uint8Array, label: string): Promise<{
    isHEVC: boolean;
    isHDR: boolean;
    hasDolbyVision: boolean;
  }> => {
    let isHEVC = false;
    let isHDR = false;
    let hasDolbyVision = false;
    
    console.log(`[VideoCodec] Scanning ${label}: ${bytes.length} bytes`);
    
    // HEVC codec identifiers (FourCC codes)
    if (findFourCC(bytes, 'hvc1')) {
      isHEVC = true;
      console.log('[VideoCodec] ✓ Found hvc1 in', label);
    }
    if (findFourCC(bytes, 'hev1')) {
      isHEVC = true;
      console.log('[VideoCodec] ✓ Found hev1 in', label);
    }
    if (findFourCC(bytes, 'hevc') || findFourCC(bytes, 'HEVC')) {
      isHEVC = true;
      console.log('[VideoCodec] ✓ Found hevc/HEVC in', label);
    }
    
    // Dolby Vision indicators
    if (findFourCC(bytes, 'dvh1') || findFourCC(bytes, 'dvhe') || findFourCC(bytes, 'dovi') || findFourCC(bytes, 'dvvC')) {
      hasDolbyVision = true;
      isHDR = true;
      console.log('[VideoCodec] ✓ Found Dolby Vision in', label);
    }
    
    // HDR indicators
    if (findFourCC(bytes, 'arib') || findFourCC(bytes, 'smpt')) {
      isHDR = true;
      console.log('[VideoCodec] ✓ Found HDR indicator in', label);
    }
    
    return { isHEVC, isHDR, hasDolbyVision };
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
    
    if (startResult.isHEVC) {
      console.log('[VideoCodec] HEVC detected in file start');
      return startResult;
    }
    
    // If not found at start, read last 500KB (moov atom often at end for iPhone)
    if (file.size > 500000) {
      const endBytes = await readSlice(file.size - 500000, file.size);
      const endResult = await scanBytes(endBytes, 'file end');
      
      if (endResult.isHEVC) {
        console.log('[VideoCodec] HEVC detected in file end');
        return endResult;
      }
    }
    
    console.log('[VideoCodec] No HEVC detected in file');
    return { isHEVC: false, isHDR: false, hasDolbyVision: false };
    
  } catch (err) {
    console.error('[VideoCodec] Error reading file:', err);
    return { isHEVC: false, isHDR: false, hasDolbyVision: false };
  }
}

/**
 * Check video compatibility by attempting to play it
 * Returns detailed codec and compatibility information
 */
export async function checkVideoCodecCompatibility(file: File): Promise<VideoCompatibilityResult> {
  console.log('[VideoCodec] Starting compatibility check for:', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(1)}MB`);
  
  const issues: VideoCompatibilityIssue[] = [];
  
  // Skip check for images
  if (isImageFile(file)) {
    console.log('[VideoCodec] Skipping check - file is an image');
    return {
      compatible: true,
      issues: [],
      isHEVC: false,
      isHDR: false,
      hasRotation: false,
      canTranscode: isWebCodecsSupported(),
    };
  }
  
  // First, try to detect codec from file header
  console.log('[VideoCodec] Detecting codec from file header...');
  const fileCodecInfo = await detectCodecFromFile(file);
  console.log('[VideoCodec] File codec detection result:', fileCodecInfo);
  
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
        
        resolve({
          compatible: !fileCodecInfo.isHEVC,
          issues,
          isHEVC: fileCodecInfo.isHEVC,
          isHDR: fileCodecInfo.isHDR,
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
          }
          
          cleanup();
          resolve({
            compatible: !fileCodecInfo.isHEVC || issues.every(i => i.severity === 'warning'),
            issues,
            isHEVC: fileCodecInfo.isHEVC,
            isHDR: fileCodecInfo.isHDR,
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
    console.error('Error downloading video:', error);
    throw new Error('Failed to load demo video. Please try uploading your own video.');
  }
}

