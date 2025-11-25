import { useState, useEffect, RefObject } from "react";

interface UseVideoDimensionsProps {
  videoRef: RefObject<HTMLVideoElement>;
  containerRef: RefObject<HTMLDivElement>;
  initialWidth: number;
  initialHeight: number;
  playbackSpeed: number;
}

/**
 * Hook to get the video's intrinsic dimensions for canvas sizing.
 * CSS handles the visual scaling - this provides pixel dimensions for drawing.
 */
export function useVideoDimensions({
  videoRef,
  containerRef,
  initialWidth,
  initialHeight,
  playbackSpeed,
}: UseVideoDimensionsProps) {
  // Use video's intrinsic dimensions for canvas, defaults to initial values
  const [dimensions, setDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  });
  const [isPortraitVideo, setIsPortraitVideo] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      // Use the video's actual pixel dimensions for the canvas
      // CSS will handle the visual scaling via width: 100%, height: 100%
      const videoWidth = video.videoWidth || initialWidth;
      const videoHeight = video.videoHeight || initialHeight;
      
      setDimensions({ 
        width: videoWidth, 
        height: videoHeight 
      });
      
      // Detect if video is portrait (vertical)
      setIsPortraitVideo(videoHeight > videoWidth);

      // Ensure playback speed is set when metadata loads
      video.playbackRate = playbackSpeed;
    };

    // Also handle if metadata is already loaded
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
  }, [videoRef, containerRef, initialWidth, initialHeight, playbackSpeed]);

  return { dimensions, isPortraitVideo };
}
