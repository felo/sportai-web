import { useState, useEffect, RefObject } from "react";

interface UseVideoDimensionsProps {
  videoRef: RefObject<HTMLVideoElement>;
  containerRef: RefObject<HTMLDivElement>;
  initialWidth: number;
  initialHeight: number;
  playbackSpeed: number;
}

export function useVideoDimensions({
  videoRef,
  containerRef,
  initialWidth,
  initialHeight,
  playbackSpeed,
}: UseVideoDimensionsProps) {
  const [dimensions, setDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  });
  const [isPortraitVideo, setIsPortraitVideo] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const aspectRatio = video.videoWidth / video.videoHeight;
      const containerWidth = containerRef.current?.clientWidth || initialWidth;

      // Detect if video is portrait (vertical)
      setIsPortraitVideo(video.videoHeight > video.videoWidth);

      // Calculate max height: 720px for portrait videos in theatre mode
      const maxHeight = 720;

      let newWidth = containerWidth;
      let newHeight = containerWidth / aspectRatio;

      // Constrain height if needed
      const effectiveMaxHeight = Math.min(initialHeight, maxHeight);
      if (newHeight > effectiveMaxHeight) {
        newHeight = effectiveMaxHeight;
        newWidth = effectiveMaxHeight * aspectRatio;
      }

      setDimensions({ width: newWidth, height: newHeight });

      // Ensure playback speed is set when metadata loads
      video.playbackRate = playbackSpeed;
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
  }, [videoRef, containerRef, initialWidth, initialHeight, playbackSpeed]);

  return { dimensions, isPortraitVideo };
}

