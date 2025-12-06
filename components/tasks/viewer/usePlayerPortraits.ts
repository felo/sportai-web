import { useState, useEffect, useRef } from "react";
import { videoLogger } from "@/lib/logger";
import type { ThumbnailCrop } from "./types";

/**
 * Crop size variants available in thumbnail_crops.
 * 0: face only (smallest)
 * 1: head + chest
 * 2: head + torso
 * 3: full person (largest)
 */
export type CropSize = 0 | 1 | 2 | 3;

interface UsePlayerPortraitsOptions {
  /** Which crop size to use (0-3, default: 3 for full person - shows most context) */
  cropSize?: CropSize;
}

/**
 * Hook to extract player portrait images from video frames using the API's
 * thumbnail_crops data which provides pre-selected best frames per player.
 * 
 * Uses a hidden video element to avoid seeking the visible player.
 * 
 * @see https://sportai.mintlify.app/api-reference/statistics/padel/result#thumbnail-crops
 */
export function usePlayerPortraits(
  thumbnailCrops: Record<string, ThumbnailCrop[]> | undefined,
  videoUrl: string | undefined,
  options: UsePlayerPortraitsOptions = {}
) {
  const { cropSize = 3 } = options; // Default to full person (largest, shows most context)
  const [portraits, setPortraits] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const extractionStartedRef = useRef(false);

  useEffect(() => {
    if (!videoUrl || !thumbnailCrops || Object.keys(thumbnailCrops).length === 0) return;
    
    // Prevent duplicate extractions
    if (extractionStartedRef.current) return;
    extractionStartedRef.current = true;

    const extractPortraits = async (hiddenVideo: HTMLVideoElement) => {
      setLoading(true);
      const newPortraits: Record<number, string> = {};

      for (const [playerIdStr, crops] of Object.entries(thumbnailCrops)) {
        const playerId = parseInt(playerIdStr, 10);
        if (isNaN(playerId) || !crops || crops.length === 0) continue;

        try {
          // Use the best thumbnail (first one, highest score)
          const bestCrop = crops[0];
          if (!bestCrop?.bbox || bestCrop.bbox.length <= cropSize) continue;

          const bbox = bestCrop.bbox[cropSize];
          if (!bbox || bbox.length !== 4) continue;

          const timestamp = bestCrop.timestamp;

          // Seek hidden video to timestamp
          hiddenVideo.currentTime = timestamp;
          
          // Wait for video to seek
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              hiddenVideo.removeEventListener("seeked", onSeeked);
              resolve();
            };
            hiddenVideo.addEventListener("seeked", onSeeked);
          });

          // Small delay to ensure frame is rendered
          await new Promise(resolve => setTimeout(resolve, 50));

          // Create canvas for extraction
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) continue;

          // Get video dimensions
          const videoWidth = hiddenVideo.videoWidth;
          const videoHeight = hiddenVideo.videoHeight;

          // Convert normalized bbox [xmin, ymin, xmax, ymax] to pixel coordinates
          const x1 = bbox[0] * videoWidth;
          const y1 = bbox[1] * videoHeight;
          const x2 = bbox[2] * videoWidth;
          const y2 = bbox[3] * videoHeight;
          const width = x2 - x1;
          const height = y2 - y1;

          // Ensure valid dimensions
          if (width <= 0 || height <= 0) continue;

          // Set canvas size to bbox size
          canvas.width = width;
          canvas.height = height;

          try {
            // Draw the cropped region
            ctx.drawImage(
              hiddenVideo,
              x1, y1, width, height,  // source
              0, 0, width, height      // destination
            );

            // Convert to data URL (will throw if CORS blocked)
            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            newPortraits[playerId] = dataUrl;
          } catch (corsError) {
            // Canvas is tainted by cross-origin video - silently skip
            videoLogger.warn(`CORS blocked portrait extraction for player ${playerId}`);
            break; // Exit loop, no point trying other players
          }
        } catch (error) {
          videoLogger.error(`Failed to extract portrait for player ${playerId}:`, error);
        }
      }

      setPortraits(newPortraits);
      setLoading(false);
    };

    // Create hidden video element for extraction (doesn't affect visible player)
    const hiddenVideo = document.createElement("video");
    hiddenVideo.style.display = "none";
    hiddenVideo.crossOrigin = "anonymous";
    hiddenVideo.muted = true;
    hiddenVideo.preload = "auto";
    hiddenVideo.src = videoUrl;
    document.body.appendChild(hiddenVideo);
    hiddenVideoRef.current = hiddenVideo;

    const onLoadedData = () => {
      extractPortraits(hiddenVideo);
    };

    if (hiddenVideo.readyState >= 2) {
      extractPortraits(hiddenVideo);
    } else {
      hiddenVideo.addEventListener("loadeddata", onLoadedData);
    }

    // Cleanup: remove hidden video element
    return () => {
      hiddenVideo.removeEventListener("loadeddata", onLoadedData);
      hiddenVideo.pause();
      hiddenVideo.src = "";
      hiddenVideo.remove();
      hiddenVideoRef.current = null;
      extractionStartedRef.current = false;
    };
  }, [thumbnailCrops, videoUrl, cropSize]);

  return { portraits, loading };
}
