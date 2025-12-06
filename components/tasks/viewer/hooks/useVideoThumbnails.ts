"use client";

import { useState, useEffect, useRef } from "react";
import { videoLogger } from "@/lib/logger";

interface ThumbnailGeneratorOptions {
  /** Number of thumbnails to generate (default: 100) */
  count?: number;
  /** Width of each thumbnail (default: 160) */
  width?: number;
  /** Height of each thumbnail (default: 90) */
  height?: number;
  /** Number of columns in the sprite sheet (default: 10) */
  columns?: number;
}

interface ThumbnailResult {
  /** Blob URL of the VTT file */
  vttUrl: string | null;
  /** Whether thumbnails are being generated */
  loading: boolean;
  /** Any error during generation */
  error: string | null;
  /** Progress (0-1) */
  progress: number;
}

/**
 * Hook to generate video timeline thumbnails for Vidstack player.
 * Creates a sprite sheet and VTT file for timeline preview on hover.
 */
export function useVideoThumbnails(
  videoUrl: string | undefined,
  options: ThumbnailGeneratorOptions = {}
): ThumbnailResult {
  const {
    count = 100,
    width = 160,
    height = 90,
    columns = 10,
  } = options;

  const [vttUrl, setVttUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const generatedForUrl = useRef<string | null>(null);
  const spriteUrlRef = useRef<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!videoUrl) return;
    
    // Skip if already generated for this URL
    if (generatedForUrl.current === videoUrl && vttUrl) return;
    
    abortRef.current = false;
    
    const generateThumbnails = async () => {
      setLoading(true);
      setError(null);
      setProgress(0);
      
      try {
        // Create a hidden video element for extraction
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        
        // Load video metadata
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Video load timeout")), 30000);
          
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve();
          };
          video.onerror = () => {
            clearTimeout(timeout);
            reject(new Error("Failed to load video"));
          };
          video.src = videoUrl;
        });
        
        if (abortRef.current) return;
        
        const duration = video.duration;
        if (!duration || !isFinite(duration)) {
          throw new Error("Invalid video duration");
        }
        
        // Calculate sprite dimensions
        const rows = Math.ceil(count / columns);
        const spriteWidth = width * columns;
        const spriteHeight = height * rows;
        
        // Create canvas for sprite sheet
        const canvas = document.createElement("canvas");
        canvas.width = spriteWidth;
        canvas.height = spriteHeight;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          throw new Error("Failed to create canvas context");
        }
        
        // Generate VTT content
        let vttContent = "WEBVTT\n\n";
        
        // Extract frames at regular intervals
        const interval = duration / count;
        
        for (let i = 0; i < count; i++) {
          if (abortRef.current) return;
          
          const time = i * interval;
          const col = i % columns;
          const row = Math.floor(i / columns);
          
          // Seek to time
          video.currentTime = time;
          
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              resolve();
            };
            video.addEventListener("seeked", onSeeked);
          });
          
          // Small delay for frame to render
          await new Promise(resolve => setTimeout(resolve, 20));
          
          // Draw frame to sprite sheet
          const x = col * width;
          const y = row * height;
          
          ctx.drawImage(video, x, y, width, height);
          
          // Calculate timestamps for VTT
          const startTime = time;
          const endTime = Math.min(time + interval, duration);
          
          // Format timestamps (HH:MM:SS.mmm)
          const formatTime = (t: number) => {
            const hours = Math.floor(t / 3600);
            const mins = Math.floor((t % 3600) / 60);
            const secs = Math.floor(t % 60);
            const ms = Math.floor((t % 1) * 1000);
            return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
          };
          
          // Add VTT cue (coordinates will be added after we have the sprite URL)
          vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
          vttContent += `SPRITE_URL#xywh=${x},${y},${width},${height}\n\n`;
          
          setProgress((i + 1) / count);
        }
        
        if (abortRef.current) return;
        
        // Convert sprite to blob URL (more efficient than data URL)
        const spriteBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.7);
        });
        const spriteBlobUrl = URL.createObjectURL(spriteBlob);
        spriteUrlRef.current = spriteBlobUrl;
        
        // Replace placeholder with sprite blob URL
        vttContent = vttContent.replace(/SPRITE_URL/g, spriteBlobUrl);
        
        // Create VTT blob URL
        const vttBlob = new Blob([vttContent], { type: "text/vtt" });
        const vttBlobUrl = URL.createObjectURL(vttBlob);
        
        generatedForUrl.current = videoUrl;
        setVttUrl(vttBlobUrl);
        setLoading(false);
        
        // Cleanup video element
        video.src = "";
        
      } catch (err) {
        if (!abortRef.current) {
          videoLogger.error("Thumbnail generation error:", err);
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    };
    
    generateThumbnails();
    
    return () => {
      abortRef.current = true;
    };
  }, [videoUrl, count, width, height, columns]);
  
  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (vttUrl) {
        URL.revokeObjectURL(vttUrl);
      }
      if (spriteUrlRef.current) {
        URL.revokeObjectURL(spriteUrlRef.current);
      }
    };
  }, [vttUrl]);

  return { vttUrl, loading, error, progress };
}

