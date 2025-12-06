import { useState, useEffect, RefObject, useCallback } from "react";
import { videoLogger } from "@/lib/logger";
import { DEFAULT_VIDEO_FPS, COMMON_FPS_VALUES } from "../constants";

export function useVideoFPS(videoRef: RefObject<HTMLVideoElement>) {
  const [videoFPS, setVideoFPS] = useState(DEFAULT_VIDEO_FPS);

  const detectVideoFPS = useCallback((video: HTMLVideoElement) => {
    // Check if requestVideoFrameCallback is available (Chrome/Edge)
    if ("requestVideoFrameCallback" in video) {
      let frameCount = 0;
      let startMediaTime = 0;
      const maxFrames = 30; // Reduced from 60 for faster detection

      const callback = (_now: number, metadata: any) => {
        if (frameCount === 0) {
          // Use mediaTime which is the actual video time, not wall-clock time
          // This is CRITICAL for accurate FPS detection when playback speed is not 1.0
          startMediaTime = metadata.mediaTime || 0;
        }

        frameCount++;

        if (frameCount >= maxFrames) {
          let detectedFPS: number;

          // ALWAYS use metadata.mediaTime for FPS calculation
          // This correctly handles any playback speed (0.25x, 0.5x, 2x, etc.)
          // because mediaTime represents actual video time, not wall-clock time
          if (metadata.mediaTime !== undefined && startMediaTime !== undefined) {
            const mediaTimeDiff = metadata.mediaTime - startMediaTime;
            if (mediaTimeDiff > 0) {
              detectedFPS = Math.round(frameCount / mediaTimeDiff);
            } else {
              // Fallback if mediaTime didn't advance (shouldn't happen)
              detectedFPS = DEFAULT_VIDEO_FPS;
            }
          } else {
            // Fallback if mediaTime not available
            detectedFPS = DEFAULT_VIDEO_FPS;
          }

          // Clamp to common frame rates
          const closest = COMMON_FPS_VALUES.reduce((prev, curr) =>
            Math.abs(curr - detectedFPS) < Math.abs(prev - detectedFPS) ? curr : prev
          );

          setVideoFPS(closest);
          videoLogger.debug(`Detected video FPS: ${closest} (raw: ${detectedFPS}, playbackRate: ${video.playbackRate})`);
        } else if (!video.paused && !video.ended) {
          (video as any).requestVideoFrameCallback(callback);
        }
      };

      // Start detection when video plays
      const startDetection = () => {
        frameCount = 0;
        startMediaTime = 0;
        (video as any).requestVideoFrameCallback(callback);
      };

      video.addEventListener("play", startDetection, { once: true });
    } else {
      // Fallback: Try to estimate from common frame rates
      videoLogger.debug("requestVideoFrameCallback not available, using default 30 FPS");
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




