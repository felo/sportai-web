import { useState, useEffect } from "react";

interface PlayerSwing {
  ball_hit: { timestamp: number };
  confidence: number;
  annotations: Array<{
    bbox: [number, number, number, number]; // [x1, y1, x2, y2] normalized
    box_confidence: number;
  }>;
}

interface Player {
  player_id: number;
  swings: PlayerSwing[];
}

export function usePlayerPortraits(
  players: Player[],
  videoElement: HTMLVideoElement | null
) {
  const [portraits, setPortraits] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!videoElement || !players || players.length === 0) return;

    const extractPortraits = async () => {
      setLoading(true);
      const newPortraits: Record<number, string> = {};

      for (const player of players) {
        try {
          // Find the best swing (highest confidence with valid bbox)
          const bestSwing = player.swings
            .filter(s => s.annotations && s.annotations.length > 0)
            .sort((a, b) => b.confidence - a.confidence)[0];

          if (!bestSwing || !bestSwing.annotations[0]) continue;

          const annotation = bestSwing.annotations[0];
          const timestamp = bestSwing.ball_hit.timestamp;
          const bbox = annotation.bbox;

          // Seek to timestamp
          videoElement.currentTime = timestamp;
          
          // Wait for video to seek
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              videoElement.removeEventListener("seeked", onSeeked);
              resolve();
            };
            videoElement.addEventListener("seeked", onSeeked);
          });

          // Small delay to ensure frame is rendered
          await new Promise(resolve => setTimeout(resolve, 100));

          // Create canvas for extraction
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) continue;

          // Get video dimensions
          const videoWidth = videoElement.videoWidth;
          const videoHeight = videoElement.videoHeight;

          // Convert normalized bbox to pixel coordinates
          const x1 = bbox[0] * videoWidth;
          const y1 = bbox[1] * videoHeight;
          const x2 = bbox[2] * videoWidth;
          const y2 = bbox[3] * videoHeight;
          const width = x2 - x1;
          const height = y2 - y1;

          // Set canvas size to bbox size
          canvas.width = width;
          canvas.height = height;

          try {
            // Draw the cropped region
            ctx.drawImage(
              videoElement,
              x1, y1, width, height,  // source
              0, 0, width, height      // destination
            );

            // Convert to data URL (will throw if CORS blocked)
            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            newPortraits[player.player_id] = dataUrl;
          } catch (corsError) {
            // Canvas is tainted by cross-origin video - silently skip
            console.warn(`CORS blocked portrait extraction for player ${player.player_id}`);
            break; // Exit loop, no point trying other players
          }
        } catch (error) {
          console.error(`Failed to extract portrait for player ${player.player_id}:`, error);
        }
      }

      setPortraits(newPortraits);
      setLoading(false);
    };

    // Only extract if video is loaded and ready
    if (videoElement.readyState >= 2) {
      extractPortraits();
    } else {
      const onLoadedData = () => {
        extractPortraits();
        videoElement.removeEventListener("loadeddata", onLoadedData);
      };
      videoElement.addEventListener("loadeddata", onLoadedData);
      return () => videoElement.removeEventListener("loadeddata", onLoadedData);
    }
  }, [players, videoElement]);

  return { portraits, loading };
}

