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
    // Use stored thumbnail if available (only on first load)
    if (thumbnailUrl && regenerateKey === 0) {
      setThumbnail(thumbnailUrl);
      return;
    }

    // Skip if already have thumbnail or had an error
    if (thumbnail || hasError) return;

    // Wait until in view before generating thumbnail
    if (!isInView) return;

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
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumbnail(canvas.toDataURL("image/jpeg", 0.7));
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
  }, [videoUrl, thumbnailUrl, thumbnail, hasError, regenerateKey, isInView]);

  return { thumbnail, hasError, isGenerating, regenerate, containerRef };
}


