/**
 * Video Utilities - Codec Compatibility
 * 
 * Functions for checking video codec compatibility and detecting formats
 * that may need transcoding (HEVC, HDR, Apple QuickTime).
 */

import { videoLogger } from "@/lib/logger";
import { CODEC_CHECK_TIMEOUT } from "./constants";
import { isImageFile, isVideoUrl } from "./validation";
import type { VideoCompatibilityResult, VideoCompatibilityIssue } from "./types";

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

interface CodecDetectionResult {
  isHEVC: boolean;
  isHDR: boolean;
  hasDolbyVision: boolean;
  isAppleQuickTime: boolean;
}

/**
 * Scan bytes for codec markers
 */
function scanBytesForCodecs(bytes: Uint8Array, label: string): CodecDetectionResult {
  let isHEVC = false;
  let isHDR = false;
  let hasDolbyVision = false;
  let isAppleQuickTime = false;
  
  videoLogger.debug(`[VideoCodec] Scanning ${label}: ${bytes.length} bytes`);
  
  // HEVC codec identifiers
  if (findFourCC(bytes, 'hvc1')) { isHEVC = true; videoLogger.debug('[VideoCodec] ✓ Found hvc1 in', label); }
  if (findFourCC(bytes, 'hev1')) { isHEVC = true; videoLogger.debug('[VideoCodec] ✓ Found hev1 in', label); }
  if (findFourCC(bytes, 'hevc') || findFourCC(bytes, 'HEVC')) { isHEVC = true; videoLogger.debug('[VideoCodec] ✓ Found hevc/HEVC in', label); }
  
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
  if (findFourCC(bytes, 'qt  ')) { isAppleQuickTime = true; videoLogger.debug('[VideoCodec] ✓ Found QuickTime brand in', label); }
  if (findFourCC(bytes, 'apac')) { isAppleQuickTime = true; videoLogger.debug('[VideoCodec] ✓ Found Apple Positional Audio in', label); }
  if (findFourCC(bytes, 'mebx')) { isAppleQuickTime = true; videoLogger.debug('[VideoCodec] ✓ Found Apple metadata box in', label); }
  
  // Apple ProRes codecs
  if (findFourCC(bytes, 'apch') || findFourCC(bytes, 'apcn') || 
      findFourCC(bytes, 'apcs') || findFourCC(bytes, 'apco') || 
      findFourCC(bytes, 'ap4h') || findFourCC(bytes, 'ap4x')) {
    isAppleQuickTime = true;
    videoLogger.debug('[VideoCodec] ✓ Found Apple ProRes codec in', label);
  }
  
  return { isHEVC, isHDR, hasDolbyVision, isAppleQuickTime };
}

/**
 * Read a slice of a file as Uint8Array
 */
function readFileSlice(file: File, start: number, end: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(start, end));
  });
}

/**
 * Parse MP4/MOV file to detect codec information
 * Reads from both start and end of file since MOV files can have 
 * the "moov" atom at the end (common with iPhone recordings)
 */
async function detectCodecFromFile(file: File): Promise<CodecDetectionResult> {
  videoLogger.debug('[VideoCodec] detectCodecFromFile called for:', file.name, 'size:', file.size);
  
  const isMOVExtension = file.name.toLowerCase().endsWith('.mov');
  const isMOVMimeType = file.type === 'video/quicktime';
  
  try {
    // Read first 200KB
    const startBytes = await readFileSlice(file, 0, 200000);
    const startResult = scanBytesForCodecs(startBytes, 'file start');
    
    let isAppleQuickTime = startResult.isAppleQuickTime || isMOVExtension || isMOVMimeType;
    
    if (startResult.isHEVC) {
      videoLogger.debug('[VideoCodec] HEVC detected in file start');
      return { ...startResult, isAppleQuickTime };
    }
    
    // If not found at start, read last 500KB
    if (file.size > 500000) {
      const endBytes = await readFileSlice(file, file.size - 500000, file.size);
      const endResult = scanBytesForCodecs(endBytes, 'file end');
      
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
  
  // Detect codec from file header
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
        
        if (fileCodecInfo.isHEVC) {
          issues.push({
            type: 'hevc',
            description: 'This video uses HEVC (H.265) codec which may not play in all browsers',
            severity: 'error',
          });
        }
        
        if (fileCodecInfo.isHDR) {
          issues.push({ type: 'hdr', description: 'This video contains HDR content which may not display correctly', severity: 'warning' });
        }
        
        if (fileCodecInfo.hasDolbyVision) {
          issues.push({ type: 'dolby_vision', description: 'This video uses Dolby Vision HDR format', severity: 'warning' });
        }
        
        if (fileCodecInfo.isAppleQuickTime && !fileCodecInfo.isHEVC) {
          issues.push({ type: 'apple_quicktime', description: 'This Apple QuickTime video needs conversion for API compatibility', severity: 'warning' });
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
    }, CODEC_CHECK_TIMEOUT);
    
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
      
      video.currentTime = 0.1;
      
      const checkDecode = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(video, 0, 0, 1, 1);
            
            if (fileCodecInfo.isHEVC) {
              issues.push({ type: 'hevc', description: 'This video uses HEVC (H.265) codec. While it plays in your browser, it may not work in others.', severity: 'warning' });
            }
            if (fileCodecInfo.isHDR) {
              issues.push({ type: 'hdr', description: 'This video contains HDR content which may not display correctly in all browsers', severity: 'warning' });
            }
            if (fileCodecInfo.hasDolbyVision) {
              issues.push({ type: 'dolby_vision', description: 'This video uses Dolby Vision HDR format', severity: 'warning' });
            }
            if (fileCodecInfo.isAppleQuickTime && !fileCodecInfo.isHEVC) {
              videoLogger.debug('[VideoCodec] Apple QuickTime H.264 detected - converting for API compatibility');
              issues.push({ type: 'apple_quicktime', description: 'This Apple QuickTime video will be converted to MP4 for better compatibility', severity: 'warning' });
            }
          }
          
          const needsConversion = fileCodecInfo.isHEVC || fileCodecInfo.isAppleQuickTime;
          
          cleanup();
          resolve({
            compatible: !needsConversion,
            issues,
            isHEVC: fileCodecInfo.isHEVC,
            isHDR: fileCodecInfo.isHDR,
            isAppleQuickTime: fileCodecInfo.isAppleQuickTime,
            hasRotation: false,
            width,
            height,
            duration,
            canTranscode: isWebCodecsSupported(),
          });
        } catch {
          issues.push({ type: 'hevc', description: 'This video uses HEVC (H.265) codec which cannot be played in your browser', severity: 'error' });
          if (fileCodecInfo.isHDR) {
            issues.push({ type: 'hdr', description: 'This video contains HDR content', severity: 'warning' });
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
      video.addEventListener('error', () => checkDecode(), { once: true });
    };
    
    const onError = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      cleanup();
      
      if (fileCodecInfo.isHEVC) {
        issues.push({ type: 'hevc', description: 'This video uses HEVC (H.265) codec which is not supported in your browser', severity: 'error' });
      } else {
        issues.push({ type: 'unsupported_codec', description: 'This video format is not supported in your browser', severity: 'error' });
      }
      
      if (fileCodecInfo.isHDR) {
        issues.push({ type: 'hdr', description: 'This video contains HDR content', severity: 'warning' });
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
