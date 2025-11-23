import { useState, useEffect, RefObject, useCallback } from "react";
import { DEFAULT_VIDEO_FPS, COMMON_FPS_VALUES } from "../constants";

export function useVideoFPS(videoRef: RefObject<HTMLVideoElement>) {
  const [videoFPS, setVideoFPS] = useState(DEFAULT_VIDEO_FPS);

  const detectVideoFPS = useCallback((video: HTMLVideoElement) => {
    // Check if requestVideoFrameCallback is available (Chrome/Edge)
    if ("requestVideoFrameCallback" in video) {
      let frameCount = 0;
      let startTime = 0;
      let lastMediaTime = 0;
      const maxFrames = 30; // Reduced from 60 for faster detection

      const callback = (now: number, metadata: any) => {
        if (frameCount === 0) {
          startTime = now;
          lastMediaTime = metadata.mediaTime || 0;
        }

        frameCount++;

        if (frameCount >= maxFrames) {
          const elapsed = (now - startTime) / 1000; // Convert to seconds
          let detectedFPS = Math.round(frameCount / elapsed);

          // Use metadata.mediaTime for more accurate FPS if available
          if (metadata.mediaTime && frameCount > 10) {
            const mediaTimeDiff = metadata.mediaTime - lastMediaTime;
            if (mediaTimeDiff > 0) {
              detectedFPS = Math.round(frameCount / mediaTimeDiff);
            }
          }

          // Clamp to common frame rates
          const closest = COMMON_FPS_VALUES.reduce((prev, curr) =>
            Math.abs(curr - detectedFPS) < Math.abs(prev - detectedFPS) ? curr : prev
          );

          setVideoFPS(closest);
          console.log(`Detected video FPS: ${closest} (raw: ${detectedFPS})`);
        } else if (!video.paused && !video.ended) {
          (video as any).requestVideoFrameCallback(callback);
        }
      };

      // Start detection when video plays
      const startDetection = () => {
        frameCount = 0;
        (video as any).requestVideoFrameCallback(callback);
      };

      video.addEventListener("play", startDetection, { once: true });
    } else {
      // Fallback: Try to estimate from common frame rates
      console.log("requestVideoFrameCallback not available, using default 30 FPS");
      setVideoFPS(DEFAULT_VIDEO_FPS);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      detectVideoFPS(video);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
  }, [videoRef, detectVideoFPS]);

  return videoFPS;
}

