import { useState, useEffect, RefObject } from "react";
import { CONFIG } from "../constants";

export function useVideoPlayback(videoRef: RefObject<HTMLVideoElement | null>) {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationId: number;
    let lastUpdate = 0;

    const updateTime = (timestamp: number) => {
      if (timestamp - lastUpdate >= CONFIG.PLAYHEAD_UPDATE_INTERVAL) {
        setCurrentTime(video.currentTime);
        lastUpdate = timestamp;
      }
      animationId = requestAnimationFrame(updateTime);
    };

    animationId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animationId);
  }, [videoRef.current]);

  return currentTime;
}








