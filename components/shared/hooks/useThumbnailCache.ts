"use client";

/**
 * Unified Thumbnail Cache
 *
 * Provides video frame thumbnail capture with caching and queuing.
 * Supports both frame-based and time-based cache keys.
 *
 * Features:
 * - Efficient batch processing with queue
 * - Prevents duplicate captures
 * - Restores video state after capture
 * - Module-level cache persists across component instances
 */

import { useState, useEffect, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export interface ThumbnailOptions {
  /** Width of the thumbnail (height calculated from aspect ratio) */
  width?: number;
  /** JPEG quality (0-1) */
  quality?: number;
}

interface CaptureRequest {
  key: string;
  time: number;
}

// ============================================================================
// Module-level Cache State
// ============================================================================

const DEBUG = false;

function log(...args: unknown[]) {
  if (DEBUG) console.log("[ThumbnailCache]", ...args);
}

// Cache: key -> data URL
const thumbnailCache = new Map<string, string>();

// Pending promises: components waiting for their thumbnail
const pendingCallbacks = new Map<string, Array<(url: string | null) => void>>();

// Queue for sequential capture
let captureQueue: CaptureRequest[] = [];
let isProcessingQueue = false;
let currentVideoElement: HTMLVideoElement | null = null;
let currentOptions: ThumbnailOptions = {};

// ============================================================================
// Cache Key Generation
// ============================================================================

/**
 * Generate a cache key from video source and time.
 */
export function getCacheKey(videoSrc: string, time: number): string {
  const srcKey = videoSrc.split("/").pop() || videoSrc.slice(-50);
  return `thumb:${srcKey}:${time.toFixed(3)}`;
}

/**
 * Generate a cache key from video source and frame number.
 */
export function getCacheKeyByFrame(videoSrc: string, frame: number): string {
  const srcKey = videoSrc.split("/").pop() || videoSrc.slice(-50);
  return `thumb:${srcKey}:f${frame}`;
}

// ============================================================================
// Cache Access
// ============================================================================

/**
 * Get cached thumbnail synchronously by time.
 */
export function getCachedThumbnail(videoSrc: string, time: number): string | null {
  return thumbnailCache.get(getCacheKey(videoSrc, time)) ?? null;
}

/**
 * Get cached thumbnail synchronously by frame.
 */
export function getCachedThumbnailByFrame(videoSrc: string, frame: number): string | null {
  return thumbnailCache.get(getCacheKeyByFrame(videoSrc, frame)) ?? null;
}

/**
 * Check if a thumbnail is cached.
 */
export function hasCachedThumbnail(videoSrc: string, time: number): boolean {
  return thumbnailCache.has(getCacheKey(videoSrc, time));
}

// ============================================================================
// Thumbnail Request
// ============================================================================

/**
 * Request thumbnail capture - returns a promise that resolves when ready.
 */
export function requestThumbnailCapture(
  videoElement: HTMLVideoElement,
  time: number,
  options: ThumbnailOptions = {}
): Promise<string | null> {
  const key = getCacheKey(videoElement.src, time);
  log(`Request: time=${time.toFixed(2)}, key=${key}`);

  // Already cached - return immediately
  if (thumbnailCache.has(key)) {
    log(`  -> Already cached`);
    return Promise.resolve(thumbnailCache.get(key)!);
  }

  // Create promise for this request
  return new Promise((resolve) => {
    // Add callback to pending list
    if (!pendingCallbacks.has(key)) {
      pendingCallbacks.set(key, []);
    }
    pendingCallbacks.get(key)!.push(resolve);

    // Add to queue if not already there
    if (!captureQueue.some((r) => r.key === key)) {
      captureQueue.push({ key, time });
      currentVideoElement = videoElement;
      currentOptions = options;
      processQueue();
    }
  });
}

/**
 * Request thumbnail capture by frame number.
 */
export function requestThumbnailCaptureByFrame(
  videoElement: HTMLVideoElement,
  frame: number,
  fps: number,
  options: ThumbnailOptions = {}
): Promise<string | null> {
  const time = frame / fps;
  const key = getCacheKeyByFrame(videoElement.src, frame);

  // Check frame-based cache first
  if (thumbnailCache.has(key)) {
    return Promise.resolve(thumbnailCache.get(key)!);
  }

  // Request capture and store with frame key
  return requestThumbnailCapture(videoElement, time, options).then((url) => {
    if (url) {
      thumbnailCache.set(key, url);
    }
    return url;
  });
}

// ============================================================================
// Queue Processing
// ============================================================================

async function processQueue(): Promise<void> {
  if (isProcessingQueue || captureQueue.length === 0 || !currentVideoElement) {
    return;
  }

  isProcessingQueue = true;
  const videoElement = currentVideoElement;
  const options = currentOptions;
  log(`processQueue: Starting, queue length: ${captureQueue.length}`);

  // Wait for video to be ready if needed
  if (videoElement.readyState < 2) {
    await waitForVideoReady(videoElement);
  }

  // Store original state
  const originalTime = videoElement.currentTime;
  const wasPlaying = !videoElement.paused;
  if (wasPlaying) videoElement.pause();

  // Process all requests
  let processed = 0;
  while (captureQueue.length > 0) {
    const request = captureQueue.shift()!;

    // Skip if already cached
    if (thumbnailCache.has(request.key)) {
      notifyCallbacks(request.key, thumbnailCache.get(request.key)!);
      continue;
    }

    try {
      // Seek to target time
      videoElement.currentTime = request.time;
      await waitForSeek(videoElement);

      // Small delay for frame render
      await new Promise((r) => setTimeout(r, 50));

      // Capture frame
      const dataUrl = captureFrame(videoElement, options);
      if (dataUrl) {
        thumbnailCache.set(request.key, dataUrl);
        notifyCallbacks(request.key, dataUrl);
        processed++;
      } else {
        notifyCallbacks(request.key, null);
      }
    } catch (error) {
      log(`  -> Error:`, error);
      notifyCallbacks(request.key, null);
    }
  }

  // Restore original state
  videoElement.currentTime = originalTime;
  if (wasPlaying) videoElement.play();

  log(`processQueue: Done, processed ${processed} items`);
  isProcessingQueue = false;

  // Continue if more items were added
  if (captureQueue.length > 0) {
    setTimeout(processQueue, 10);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function waitForVideoReady(videoElement: HTMLVideoElement): Promise<void> {
  return new Promise<void>((resolve) => {
    const checkReady = () => {
      if (videoElement.readyState >= 2) {
        videoElement.removeEventListener("canplay", checkReady);
        videoElement.removeEventListener("loadeddata", checkReady);
        resolve();
      }
    };
    videoElement.addEventListener("canplay", checkReady);
    videoElement.addEventListener("loadeddata", checkReady);
    checkReady();
    setTimeout(resolve, 2000); // Timeout fallback
  });
}

function waitForSeek(videoElement: HTMLVideoElement): Promise<void> {
  return new Promise<void>((resolve) => {
    let resolved = false;
    const handleSeeked = () => {
      if (!resolved) {
        resolved = true;
        videoElement.removeEventListener("seeked", handleSeeked);
        resolve();
      }
    };
    videoElement.addEventListener("seeked", handleSeeked);
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        videoElement.removeEventListener("seeked", handleSeeked);
        resolve();
      }
    }, 200);
  });
}

function captureFrame(
  videoElement: HTMLVideoElement,
  options: ThumbnailOptions
): string | null {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx || videoElement.videoWidth <= 0) {
    return null;
  }

  const width = options.width ?? 200;
  const quality = options.quality ?? 0.7;
  const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;

  canvas.width = width;
  canvas.height = Math.round(width / aspectRatio);
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", quality);
}

function notifyCallbacks(key: string, url: string | null): void {
  const callbacks = pendingCallbacks.get(key);
  if (callbacks && callbacks.length > 0) {
    callbacks.forEach((cb) => cb(url));
    pendingCallbacks.delete(key);
  }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear all cached thumbnails.
 */
export function clearThumbnailCache(): void {
  thumbnailCache.clear();
  pendingCallbacks.clear();
  captureQueue = [];
}

/**
 * Get the current cache size.
 */
export function getThumbnailCacheSize(): number {
  return thumbnailCache.size;
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook for thumbnail capture with automatic state management.
 *
 * @param videoElement - Video element to capture from
 * @param time - Time in seconds to capture
 * @param options - Capture options
 * @returns [thumbnailUrl, isLoading]
 *
 * @example
 * const [thumbnail, isLoading] = useThumbnail(videoRef.current, 5.5);
 */
export function useThumbnail(
  videoElement: HTMLVideoElement | null,
  time: number,
  options: ThumbnailOptions = {}
): [string | null, boolean] {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => {
    if (!videoElement) return null;
    return getCachedThumbnail(videoElement.src, time);
  });
  const [isLoading, setIsLoading] = useState(!thumbnailUrl);

  useEffect(() => {
    if (!videoElement || thumbnailUrl) return;

    // Check cache again
    const cached = getCachedThumbnail(videoElement.src, time);
    if (cached) {
      setThumbnailUrl(cached);
      setIsLoading(false);
      return;
    }

    // Request capture
    setIsLoading(true);
    requestThumbnailCapture(videoElement, time, options).then((url) => {
      if (url) setThumbnailUrl(url);
      setIsLoading(false);
    });
  }, [videoElement, time, thumbnailUrl, options]);

  return [thumbnailUrl, isLoading];
}

/**
 * React hook for thumbnail capture by frame number.
 */
export function useThumbnailByFrame(
  videoElement: HTMLVideoElement | null,
  frame: number,
  fps: number,
  options: ThumbnailOptions = {}
): [string | null, boolean] {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => {
    if (!videoElement) return null;
    return getCachedThumbnailByFrame(videoElement.src, frame);
  });
  const [isLoading, setIsLoading] = useState(!thumbnailUrl);

  useEffect(() => {
    if (!videoElement || thumbnailUrl) return;

    const cached = getCachedThumbnailByFrame(videoElement.src, frame);
    if (cached) {
      setThumbnailUrl(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    requestThumbnailCaptureByFrame(videoElement, frame, fps, options).then((url) => {
      if (url) setThumbnailUrl(url);
      setIsLoading(false);
    });
  }, [videoElement, frame, fps, thumbnailUrl, options]);

  return [thumbnailUrl, isLoading];
}
