"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Extracts single frame thumbnails at specific timestamps.
 * Uses a single hidden video element to avoid memory bloat.
 * 
 * Memory efficient: creates one hidden video, extracts all frames, then cleans up.
 */
export function useHighlightThumbnails(
  videoUrl: string | undefined,
  timestamps: number[]
) {
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const extractionStartedRef = useRef(false);
  const timestampsKey = timestamps.sort().join(",");

  useEffect(() => {
    if (!videoUrl || timestamps.length === 0) return;
    if (extractionStartedRef.current) return;
    extractionStartedRef.current = true;

    const extractThumbnails = async () => {
      setLoading(true);
      const newThumbnails: Record<number, string> = {};

      // Create single hidden video element
      const hiddenVideo = document.createElement("video");
      hiddenVideo.style.display = "none";
      hiddenVideo.crossOrigin = "anonymous";
      hiddenVideo.muted = true;
      hiddenVideo.preload = "auto";
      hiddenVideo.src = videoUrl;
      document.body.appendChild(hiddenVideo);

      try {
        // Wait for video to load metadata
        await new Promise<void>((resolve, reject) => {
          hiddenVideo.onloadedmetadata = () => resolve();
          hiddenVideo.onerror = () => reject(new Error("Video load failed"));
          setTimeout(() => reject(new Error("Video load timeout")), 15000);
        });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          throw new Error("Canvas context failed");
        }

        // Set canvas to 16:9 thumbnail size (higher quality)
        canvas.width = 480;
        canvas.height = 270;

        for (const timestamp of timestamps) {
          try {
            // Seek to timestamp
            hiddenVideo.currentTime = Math.max(0, timestamp);

            await new Promise<void>((resolve) => {
              const onSeeked = () => {
                hiddenVideo.removeEventListener("seeked", onSeeked);
                resolve();
              };
              hiddenVideo.addEventListener("seeked", onSeeked);
            });

            // Small delay for frame to render
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Draw frame to canvas (cover mode - fill and crop)
            const videoAspect = hiddenVideo.videoWidth / hiddenVideo.videoHeight;
            const canvasAspect = canvas.width / canvas.height;

            let drawWidth, drawHeight, offsetX, offsetY;
            if (videoAspect > canvasAspect) {
              // Video is wider - fit height, crop sides
              drawHeight = canvas.height;
              drawWidth = drawHeight * videoAspect;
              offsetX = (canvas.width - drawWidth) / 2;
              offsetY = 0;
            } else {
              // Video is taller - fit width, crop top/bottom
              drawWidth = canvas.width;
              drawHeight = drawWidth / videoAspect;
              offsetX = 0;
              offsetY = (canvas.height - drawHeight) / 2;
            }

            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(hiddenVideo, offsetX, offsetY, drawWidth, drawHeight);

            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            newThumbnails[timestamp] = dataUrl;
          } catch (error) {
            console.warn(`Failed to extract thumbnail at ${timestamp}:`, error);
          }
        }
      } catch (error) {
        console.warn("Thumbnail extraction failed:", error);
      } finally {
        // Cleanup
        document.body.removeChild(hiddenVideo);
        setThumbnails(newThumbnails);
        setLoading(false);
      }
    };

    extractThumbnails();
  }, [videoUrl, timestampsKey]);

  return { thumbnails, loading };
}

