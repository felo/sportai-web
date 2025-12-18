"use client";

/**
 * URL-based Thumbnail Hook
 *
 * Provides thumbnail loading with:
 * - Stored thumbnail URL support
 * - Fallback video frame generation
 * - Lazy loading via IntersectionObserver
 * - S3 presigned URL expiration handling
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================================
// Types
// ============================================================================

export interface UseUrlThumbnailOptions {
  /** Video URL to generate thumbnail from */
  videoUrl: string;
  /** Pre-stored thumbnail URL (takes priority) */
  thumbnailUrl?: string | null;
  /** Whether to use lazy loading via IntersectionObserver */
  lazy?: boolean;
  /** Root margin for IntersectionObserver (default: "200px") */
  rootMargin?: string;
  /** Thumbnail width (default: 320) */
  width?: number;
  /** Thumbnail height (default: 180) */
  height?: number;
  /** JPEG quality 0-1 (default: 0.7) */
  quality?: number;
}

export interface UseUrlThumbnailReturn {
  /** The thumbnail data URL or stored URL */
  thumbnail: string | null;
  /** Whether thumbnail generation had an error */
  hasError: boolean;
  /** Whether thumbnail is currently being generated */
  isGenerating: boolean;
  /** Trigger regeneration of thumbnail */
  regenerate: () => void;
  /** Ref to attach to container for lazy loading */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to manage video thumbnails with lazy loading.
 * Uses stored thumbnail if available, otherwise generates from video when in view.
 *
 * @example
 * const { thumbnail, isGenerating, containerRef } = useUrlThumbnail({
 *   videoUrl: task.video_url,
 *   thumbnailUrl: task.thumbnail_url,
 * });
 */
export function useUrlThumbnail({
  videoUrl,
  thumbnailUrl = null,
  lazy = true,
  rootMargin = "200px",
  width = 320,
  height = 180,
  quality = 0.7,
}: UseUrlThumbnailOptions): UseUrlThumbnailReturn {
  const [thumbnail, setThumbnail] = useState<string | null>(thumbnailUrl);
  const [hasError, setHasError] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regenerateKey, setRegenerateKey] = useState(0);
  const [isInView, setIsInView] = useState(!lazy);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Track previous video URL to detect changes
  const prevVideoUrlRef = useRef(videoUrl);

  // Regenerate function
  const regenerate = useCallback(() => {
    setThumbnail(null);
    setHasError(false);
    setRegenerateKey((k) => k + 1);
  }, []);

  // Reset error state when video URL changes (e.g., presigned URL refresh)
  useEffect(() => {
    const videoUrlChanged = prevVideoUrlRef.current !== videoUrl;
    prevVideoUrlRef.current = videoUrl;

    if (videoUrlChanged && hasError && !thumbnail) {
      setHasError(false);
    }
  }, [videoUrl, hasError, thumbnail]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    // If we already have a stored thumbnail or not using lazy loading, skip
    if (thumbnailUrl || !lazy) {
      setIsInView(true);
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [thumbnailUrl, lazy, rootMargin]);

  // Thumbnail generation effect
  useEffect(() => {
    // Use stored thumbnail if available (only on first load)
    if (thumbnailUrl && regenerateKey === 0) {
      setThumbnail(thumbnailUrl);
      return;
    }

    // Skip if already have thumbnail or had an error
    if (thumbnail || hasError) return;

    // Wait until in view before generating thumbnail
    if (!isInView) return;

    // Skip thumbnail generation for non-presigned S3 URLs
    const isS3Url = videoUrl.includes(".s3.") && videoUrl.includes("amazonaws.com");
    const isPresigned = videoUrl.includes("X-Amz-");
    if (isS3Url && !isPresigned) {
      // Don't try to generate - wait for URL to be refreshed
      return;
    }

    setIsGenerating(true);

    // Generate thumbnail from video
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 4);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumbnail(canvas.toDataURL("image/jpeg", quality));
      }
      setIsGenerating(false);
    };

    video.onerror = () => {
      setHasError(true);
      setIsGenerating(false);
    };

    video.src = videoUrl;

    return () => {
      video.pause();
      video.src = "";
    };
  }, [videoUrl, thumbnailUrl, thumbnail, hasError, regenerateKey, isInView, width, height, quality]);

  return { thumbnail, hasError, isGenerating, regenerate, containerRef };
}



