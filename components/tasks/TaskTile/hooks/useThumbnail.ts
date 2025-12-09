"use client";

import { useState, useEffect, useCallback } from "react";

interface UseThumbnailOptions {
  videoUrl: string;
  thumbnailUrl: string | null;
}

interface UseThumbnailReturn {
  thumbnail: string | null;
  hasError: boolean;
  isGenerating: boolean;
  regenerate: () => void;
}

/**
 * Hook to manage video thumbnails
 * Uses stored thumbnail if available, otherwise generates from video
 */
export function useThumbnail({
  videoUrl,
  thumbnailUrl,
}: UseThumbnailOptions): UseThumbnailReturn {
  const [thumbnail, setThumbnail] = useState<string | null>(thumbnailUrl);
  const [hasError, setHasError] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regenerateKey, setRegenerateKey] = useState(0);

  const regenerate = useCallback(() => {
    setThumbnail(null);
    setHasError(false);
    setRegenerateKey((k) => k + 1);
  }, []);

  useEffect(() => {
    // Use stored thumbnail if available (only on first load)
    if (thumbnailUrl && regenerateKey === 0) {
      setThumbnail(thumbnailUrl);
      return;
    }

    // Skip if already have thumbnail or had an error
    if (thumbnail || hasError) return;

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
  }, [videoUrl, thumbnailUrl, thumbnail, hasError, regenerateKey]);

  return { thumbnail, hasError, isGenerating, regenerate };
}


