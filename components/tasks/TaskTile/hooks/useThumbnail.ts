"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseThumbnailOptions {
  videoUrl: string;
  thumbnailUrl: string | null;
}

interface UseThumbnailReturn {
  thumbnail: string | null;
  hasError: boolean;
  isGenerating: boolean;
  regenerate: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hook to manage video thumbnails with lazy loading
 * Uses stored thumbnail if available, otherwise generates from video when in view
 */
export function useThumbnail({
  videoUrl,
  thumbnailUrl,
}: UseThumbnailOptions): UseThumbnailReturn {
  const [thumbnail, setThumbnail] = useState<string | null>(thumbnailUrl);
  const [hasError, setHasError] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regenerateKey, setRegenerateKey] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const regenerate = useCallback(() => {
    setThumbnail(null);
    setHasError(false);
    setRegenerateKey((k) => k + 1);
  }, []);

  // Track previous video URL to detect changes
  const prevVideoUrlRef = useRef(videoUrl);
  
  // Reset error state when video URL changes (e.g., when presigned URL is refreshed)
  // Only reset if we had an error AND don't already have a thumbnail
  useEffect(() => {
    const videoUrlChanged = prevVideoUrlRef.current !== videoUrl;
    prevVideoUrlRef.current = videoUrl;
    
    if (videoUrlChanged && hasError && !thumbnail) {
      setHasError(false);
    }
  }, [videoUrl, hasError, thumbnail]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    // If we already have a stored thumbnail, no need to observe
    if (thumbnailUrl) {
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
      { rootMargin: "200px" } // Start loading 200px before entering viewport
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [thumbnailUrl]);

  useEffect(() => {
    console.log("[Thumbnail] Effect running:", { thumbnailUrl, thumbnail, hasError, isInView, regenerateKey, videoUrl: videoUrl?.substring(0, 50) });
    
    // Use stored thumbnail if available (only on first load)
    if (thumbnailUrl && regenerateKey === 0) {
      console.log("[Thumbnail] Using stored thumbnail URL");
      setThumbnail(thumbnailUrl);
      return;
    }

    // Skip if already have thumbnail or had an error
    if (thumbnail || hasError) {
      console.log("[Thumbnail] Skipping - already have thumbnail or error:", { hasThumbnail: !!thumbnail, hasError });
      return;
    }

    // Wait until in view before generating thumbnail
    if (!isInView) {
      console.log("[Thumbnail] Skipping - not in view yet");
      return;
    }
    
    // Skip thumbnail generation for private S3 URLs that aren't presigned (they won't work)
    // Presigned URLs contain query parameters like X-Amz-Signature
    // Public bucket URLs (containing '-public') work without presigning
    const isS3Url = videoUrl.includes('.s3.') && videoUrl.includes('amazonaws.com');
    const isPresigned = videoUrl.includes('X-Amz-');
    const isPublicBucket = videoUrl.includes('-public');
    console.log("[Thumbnail] URL check:", { isS3Url, isPresigned, isPublicBucket, videoUrl: videoUrl.substring(0, 80) });
    if (isS3Url && !isPresigned && !isPublicBucket) {
      console.log("[Thumbnail] Skipping - private S3 URL without presigning");
      // Don't try to generate - wait for URL to be refreshed
      return;
    }

    setIsGenerating(true);
    console.log("[Thumbnail] Starting generation for:", videoUrl);

    // Generate thumbnail from video
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";

    video.onloadeddata = () => {
      console.log("[Thumbnail] Video loaded, duration:", video.duration);
      video.currentTime = Math.min(1, video.duration / 4);
    };

    video.onseeked = () => {
      console.log("[Thumbnail] Seeked to:", video.currentTime);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          console.log("[Thumbnail] Generated successfully, length:", dataUrl.length);
          setThumbnail(dataUrl);
        }
      } catch (err) {
        console.error("[Thumbnail] Canvas error (likely CORS):", err);
        setHasError(true);
      }
      setIsGenerating(false);
    };

    video.onerror = (e) => {
      console.error("[Thumbnail] Video load error:", e, video.error);
      setHasError(true);
      setIsGenerating(false);
    };

    video.src = videoUrl;

    return () => {
      video.pause();
      video.src = "";
    };
  }, [videoUrl, thumbnailUrl, thumbnail, hasError, regenerateKey, isInView]);

  return { thumbnail, hasError, isGenerating, regenerate, containerRef };
}


