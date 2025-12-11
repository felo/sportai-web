"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { uploadThumbnailToS3 } from "@/utils/video-utils";
import { logger } from "@/lib/logger";

interface UseThumbnailOptions {
  videoUrl: string;
  thumbnailUrl: string | null;
  /** Task ID for persisting thumbnail to database */
  taskId?: string;
  /** User ID for API authentication */
  userId?: string;
  /** Callback when thumbnail is successfully persisted */
  onThumbnailPersisted?: (thumbnailUrl: string) => void;
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
 * Can optionally persist generated thumbnails to S3 and database
 */
export function useThumbnail({
  videoUrl,
  thumbnailUrl,
  taskId,
  userId,
  onThumbnailPersisted,
}: UseThumbnailOptions): UseThumbnailReturn {
  const [thumbnail, setThumbnail] = useState<string | null>(thumbnailUrl);
  const [hasError, setHasError] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regenerateKey, setRegenerateKey] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const [shouldPersist, setShouldPersist] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const regenerate = useCallback(() => {
    setThumbnail(null);
    setHasError(false);
    setShouldPersist(true); // Mark that this regeneration should be persisted
    setRegenerateKey((k) => k + 1);
  }, []);
  
  /**
   * Persist a generated thumbnail to S3 and update the task in the database
   */
  const persistThumbnail = useCallback(async (dataUrl: string) => {
    if (!taskId || !userId) {
      logger.debug("[useThumbnail] Cannot persist - missing taskId or userId");
      return;
    }
    
    try {
      logger.debug("[useThumbnail] Persisting thumbnail for task:", taskId);
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Upload to S3
      const uploadResult = await uploadThumbnailToS3(blob);
      if (!uploadResult) {
        logger.warn("[useThumbnail] Failed to upload thumbnail to S3");
        return;
      }
      
      // Update task in database
      const updateResponse = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
        },
        body: JSON.stringify({
          thumbnail_url: uploadResult.thumbnailUrl,
          thumbnail_s3_key: uploadResult.thumbnailS3Key,
        }),
      });
      
      if (!updateResponse.ok) {
        logger.warn("[useThumbnail] Failed to update task with thumbnail");
        return;
      }
      
      logger.info("[useThumbnail] ✅ Thumbnail persisted for task:", taskId);
      onThumbnailPersisted?.(uploadResult.thumbnailUrl);
    } catch (err) {
      logger.warn("[useThumbnail] Error persisting thumbnail:", err);
    }
  }, [taskId, userId, onThumbnailPersisted]);

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
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setThumbnail(dataUrl);
        
        // Persist thumbnail if this was a manual regeneration
        if (shouldPersist) {
          persistThumbnail(dataUrl);
          setShouldPersist(false);
        }
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
  }, [videoUrl, thumbnailUrl, thumbnail, hasError, regenerateKey, isInView, shouldPersist, persistThumbnail]);

  return { thumbnail, hasError, isGenerating, regenerate, containerRef };
}


