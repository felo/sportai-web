/**
 * Video Transcoder using WebCodecs API
 * Converts HEVC/H.265 videos to H.264 for browser compatibility
 */

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { isWebCodecsSupported } from './video-utils';

export interface TranscodeProgress {
  stage: 'initializing' | 'decoding' | 'encoding' | 'muxing' | 'complete' | 'error';
  percent: number;
  currentFrame?: number;
  totalFrames?: number;
  message?: string;
}

export interface TranscodeResult {
  success: boolean;
  file?: File;
  error?: string;
  originalSize?: number;
  newSize?: number;
}

/**
 * Extract video frames using MediaStreamTrackProcessor (if available)
 * or fallback to canvas-based extraction
 */
async function extractVideoInfo(file: File): Promise<{
  width: number;
  height: number;
  duration: number;
  frameRate: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    
    const url = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = video.duration;
      
      // Estimate frame rate (default to 30 if can't determine)
      // Most iPhone videos are 30fps or 60fps
      const frameRate = 30;
      
      URL.revokeObjectURL(url);
      resolve({ width, height, duration, frameRate });
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = url;
  });
}

/**
 * Create an H.264 encoder configuration
 */
function getEncoderConfig(width: number, height: number, frameRate: number): VideoEncoderConfig {
  // Ensure dimensions are even (required for H.264)
  const adjustedWidth = width % 2 === 0 ? width : width - 1;
  const adjustedHeight = height % 2 === 0 ? height : height - 1;
  
  // Calculate bitrate based on resolution
  // Target ~8 Mbps for 1080p, scale accordingly
  const pixels = adjustedWidth * adjustedHeight;
  const referenceBitrate = 8_000_000; // 8 Mbps for 1080p
  const referencePixels = 1920 * 1080;
  const bitrate = Math.round((pixels / referencePixels) * referenceBitrate);
  
  return {
    codec: 'avc1.640028', // H.264 High Profile, Level 4.0
    width: adjustedWidth,
    height: adjustedHeight,
    bitrate: Math.max(1_000_000, Math.min(bitrate, 15_000_000)), // 1-15 Mbps
    framerate: frameRate,
    latencyMode: 'quality',
    avc: { format: 'avc' }, // Use Annex B format for MP4
  };
}

/**
 * Transcode a video file from HEVC to H.264 using WebCodecs
 */
export async function transcodeToH264(
  file: File,
  onProgress: (progress: TranscodeProgress) => void,
  abortSignal?: AbortSignal
): Promise<TranscodeResult> {
  // Check WebCodecs support
  if (!isWebCodecsSupported()) {
    return {
      success: false,
      error: 'WebCodecs API is not supported in your browser. Please use Chrome, Edge, or Safari 16.4+.',
    };
  }
  
  onProgress({ stage: 'initializing', percent: 0, message: 'Preparing video...' });
  
  try {
    // Get video info
    const videoInfo = await extractVideoInfo(file);
    const { width, height, duration, frameRate } = videoInfo;
    
    // Ensure dimensions are even
    const adjustedWidth = width % 2 === 0 ? width : width - 1;
    const adjustedHeight = height % 2 === 0 ? height : height - 1;
    
    const totalFrames = Math.ceil(duration * frameRate);
    
    onProgress({
      stage: 'initializing',
      percent: 5,
      message: `Video: ${width}x${height}, ${duration.toFixed(1)}s, ~${totalFrames} frames`,
    });
    
    // Check if aborted
    if (abortSignal?.aborted) {
      return { success: false, error: 'Transcoding cancelled' };
    }
    
    // Set up MP4 muxer
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: adjustedWidth,
        height: adjustedHeight,
      },
      fastStart: 'in-memory',
    });
    
    // Set up encoder
    const encoderConfig = getEncoderConfig(adjustedWidth, adjustedHeight, frameRate);
    
    // Check if encoder is supported
    const encoderSupport = await VideoEncoder.isConfigSupported(encoderConfig);
    if (!encoderSupport.supported) {
      return {
        success: false,
        error: 'H.264 encoding is not supported in your browser.',
      };
    }
    
    let encodedFrames = 0;
    let encodingComplete = false;
    
    const encoder = new VideoEncoder({
      output: (chunk, meta) => {
        muxer.addVideoChunk(chunk, meta);
        encodedFrames++;
        
        const percent = Math.min(95, 10 + (encodedFrames / totalFrames) * 85);
        onProgress({
          stage: 'encoding',
          percent,
          currentFrame: encodedFrames,
          totalFrames,
          message: `Encoding frame ${encodedFrames}/${totalFrames}`,
        });
      },
      error: (error) => {
        console.error('Encoder error:', error);
      },
    });
    
    encoder.configure(encoderConfig);
    
    // Create video element for frame extraction
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
    });
    
    // Create canvas for frame extraction
    const canvas = document.createElement('canvas');
    canvas.width = adjustedWidth;
    canvas.height = adjustedHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      URL.revokeObjectURL(videoUrl);
      return { success: false, error: 'Failed to create canvas context' };
    }
    
    onProgress({ stage: 'decoding', percent: 10, message: 'Extracting frames...' });
    
    // Extract and encode frames
    const frameInterval = 1 / frameRate;
    let currentTime = 0;
    let frameIndex = 0;
    
    while (currentTime < duration) {
      // Check if aborted
      if (abortSignal?.aborted) {
        encoder.close();
        URL.revokeObjectURL(videoUrl);
        return { success: false, error: 'Transcoding cancelled' };
      }
      
      // Seek to frame
      video.currentTime = currentTime;
      
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        
        // Timeout fallback
        setTimeout(resolve, 100);
      });
      
      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, adjustedWidth, adjustedHeight);
      
      // Create VideoFrame from canvas
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round(currentTime * 1_000_000), // microseconds
        duration: Math.round(frameInterval * 1_000_000),
      });
      
      // Encode frame (keyframe every 2 seconds)
      const isKeyFrame = frameIndex % (frameRate * 2) === 0;
      encoder.encode(frame, { keyFrame: isKeyFrame });
      frame.close();
      
      currentTime += frameInterval;
      frameIndex++;
      
      // Yield to UI every 10 frames
      if (frameIndex % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    
    // Flush encoder
    await encoder.flush();
    encoder.close();
    encodingComplete = true;
    
    URL.revokeObjectURL(videoUrl);
    
    onProgress({ stage: 'muxing', percent: 96, message: 'Finalizing video...' });
    
    // Finalize muxer
    muxer.finalize();
    
    // Get the output buffer
    const { buffer } = muxer.target as ArrayBufferTarget;
    
    // Create output file
    const originalName = file.name.replace(/\.[^.]+$/, '');
    const outputFile = new File(
      [buffer],
      `${originalName}_converted.mp4`,
      { type: 'video/mp4' }
    );
    
    onProgress({ stage: 'complete', percent: 100, message: 'Conversion complete!' });
    
    return {
      success: true,
      file: outputFile,
      originalSize: file.size,
      newSize: outputFile.size,
    };
    
  } catch (error) {
    console.error('Transcoding error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown transcoding error';
    
    onProgress({
      stage: 'error',
      percent: 0,
      message: errorMessage,
    });
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if the browser can encode H.264 video
 */
export async function canEncodeH264(): Promise<boolean> {
  if (!isWebCodecsSupported()) {
    return false;
  }
  
  try {
    const config: VideoEncoderConfig = {
      codec: 'avc1.640028',
      width: 1280,
      height: 720,
      bitrate: 5_000_000,
      framerate: 30,
    };
    
    const support = await VideoEncoder.isConfigSupported(config);
    return support.supported === true;
  } catch {
    return false;
  }
}

/**
 * Get estimated transcoding time based on video duration and device
 */
export function estimateTranscodeTime(durationSeconds: number): string {
  // Rough estimate: transcoding is typically 0.5-2x real-time on modern devices
  const estimatedSeconds = durationSeconds * 1.5;
  
  if (estimatedSeconds < 60) {
    return `~${Math.ceil(estimatedSeconds)} seconds`;
  } else if (estimatedSeconds < 3600) {
    return `~${Math.ceil(estimatedSeconds / 60)} minutes`;
  } else {
    return `~${(estimatedSeconds / 3600).toFixed(1)} hours`;
  }
}

