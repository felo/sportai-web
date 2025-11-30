"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Box } from "@radix-ui/themes";
import { formatDuration } from "../utils";

interface DraggablePlayheadProps {
  currentTime: number;
  position: number; // percentage (0-100)
  onSeek: (time: number) => void;
  // Function to convert a percentage position to a time value
  positionToTime: (percentage: number) => number;
  // Reference to the timeline container for calculating drag positions
  timelineRef: React.RefObject<HTMLDivElement | null>;
  // Optional custom display time (e.g., elapsed rally time instead of absolute time)
  displayTime?: number;
  // Optional label prefix (e.g., "Rally: ")
  displayPrefix?: string;
}

export function DraggablePlayhead({
  currentTime,
  position,
  onSeek,
  positionToTime,
  timelineRef,
  displayTime,
  displayPrefix = "",
}: DraggablePlayheadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handlePlayheadDrag = useCallback((clientX: number) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = positionToTime(percentage);
    
    onSeek(targetTime);
  }, [timelineRef, positionToTime, onSeek]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    handlePlayheadDrag(e.clientX);
  }, [handlePlayheadDrag]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handlePlayheadDrag(e.clientX);
  }, [isDragging, handlePlayheadDrag]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global mouse listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    }
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <Box
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        left: `${position}%`,
        top: "-24px",
        bottom: 0,
        width: "24px",
        transform: "translateX(-50%)",
        cursor: isDragging ? "grabbing" : "grab",
        zIndex: 25,
      }}
    >
      {/* Time badge (the "nail head") - scales up while dragging */}
      <Box
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: `translateX(-50%) scale(${isDragging ? 1.3 : 1})`,
          transformOrigin: "center bottom",
          backgroundColor: "var(--red-9)",
          color: "white",
          padding: isDragging ? "3px 8px" : "2px 6px",
          borderRadius: "4px",
          fontSize: isDragging ? "12px" : "10px",
          fontWeight: isDragging ? 600 : 400,
          whiteSpace: "nowrap",
          boxShadow: isDragging 
            ? "0 4px 12px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.3)" 
            : "none",
          transition: "transform 0.15s ease, box-shadow 0.15s ease, padding 0.15s ease, font-size 0.15s ease",
          zIndex: 30,
        }}
      >
        {displayPrefix}{formatDuration(displayTime ?? currentTime)}
      </Box>
      {/* The nail stem */}
      <Box
        style={{
          position: "absolute",
          top: isDragging ? "24px" : "20px",
          left: "50%",
          transform: "translateX(-50%)",
          width: isDragging ? "3px" : "2px",
          height: `calc(100% - ${isDragging ? "20px" : "16px"})`,
          backgroundColor: "var(--red-9)",
          boxShadow: isDragging ? "0 0 8px rgba(239, 68, 68, 0.5)" : "none",
          transition: "width 0.15s ease, top 0.15s ease, box-shadow 0.15s ease",
        }}
      />
    </Box>
  );
}

// Hook to provide the isDragging state for parent components that need it
export function useDraggablePlayhead() {
  const [isDragging, setIsDragging] = useState(false);
  return { isDragging, setIsDragging };
}

