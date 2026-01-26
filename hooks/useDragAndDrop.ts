import { useState, useRef } from "react";
import { track } from "@/lib/analytics";

interface UseDragAndDropOptions {
  onFileDrop: (file: File, source: 'drag_drop') => void;
  onError?: (error: string) => void;
}

export function useDragAndDrop({
  onFileDrop,
  onError,
}: UseDragAndDropOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [hasJustDropped, setHasJustDropped] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    // Only show drag state if dragging files (not text/elements)
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only show drag state if dragging files (not text/elements)
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;

    // Only hide when we've actually left the container (counter reaches 0)
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    setHasJustDropped(true);

    const files = Array.from(e.dataTransfer.files);
    // Accept both videos and images
    const mediaFile = files.find((file) => 
      file.type.startsWith("video/") || 
      file.type.startsWith("image/")
    );

    if (mediaFile) {
      // Track upload intent when file is dropped
      track('video_upload_intent', {
        fileSizeMB: Math.round(mediaFile.size / 1024 / 1024 * 100) / 100,
        fileType: mediaFile.type,
        source: 'drag_drop',
      });
      onFileDrop(mediaFile, 'drag_drop');
    } else if (files.length > 0) {
      onError?.("Please drop a valid video or image file");
    }

    // Reset the flag after a short delay to re-enable tooltips
    setTimeout(() => {
      setHasJustDropped(false);
    }, 500);
  };

  return {
    isDragging,
    hasJustDropped,
    handlers: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
