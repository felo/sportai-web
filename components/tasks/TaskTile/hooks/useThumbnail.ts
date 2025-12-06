"use client";

import { useState, useEffect } from "react";

interface UseThumbnailOptions {
  videoUrl: string;
  thumbnailUrl: string | null;
}

interface UseThumbnailReturn {
  thumbnail: string | null;
  hasError: boolean;
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

  useEffect(() => {
    // Use stored thumbnail if available
    if (thumbnailUrl) {
      setThumbnail(thumbnailUrl);
      return;
    }

    // Skip if already have thumbnail or had an error
    if (thumbnail || hasError) return;

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
    };

    video.onerror = () => {
      setHasError(true);
    };

    video.src = videoUrl;

    return () => {
      video.pause();
      video.src = "";
    };
  }, [videoUrl, thumbnailUrl, thumbnail, hasError]);

  return { thumbnail, hasError };
}

