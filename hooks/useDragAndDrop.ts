import { useState, useRef } from "react";

interface UseDragAndDropOptions {
  onFileDrop: (file: File) => void;
  onError?: (error: string) => void;
}

export function useDragAndDrop({
  onFileDrop,
  onError,
}: UseDragAndDropOptions) {
  const [isDragging, setIsDragging] = useState(false);
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

    const files = Array.from(e.dataTransfer.files);
    // Accept both videos and images
    const mediaFile = files.find((file) => 
      file.type.startsWith("video/") || 
      file.type.startsWith("image/")
    );

    if (mediaFile) {
      onFileDrop(mediaFile);
    } else if (files.length > 0) {
      onError?.("Please drop a valid video or image file");
    }
  };

  return {
    isDragging,
    handlers: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}

