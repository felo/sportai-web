"use client";

import { Box } from "@radix-ui/themes";
import { CONFIG } from "../constants";

interface ResizeHandleProps {
  side: "left" | "right";
  isResizing: boolean;
  videoWidth: number;
  onResizeStart: (startX: number, startWidth: number, side: "left" | "right") => void;
}

export function ResizeHandle({ side, isResizing, videoWidth, onResizeStart }: ResizeHandleProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onResizeStart(e.clientX, videoWidth, side);
  };

  return (
    <Box
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        [side]: "-4px",
        top: "50%",
        transform: "translateY(-50%)",
        width: "8px",
        height: "60px",
        backgroundColor: isResizing ? "var(--mint-9)" : "var(--gray-8)",
        borderRadius: "4px",
        cursor: "ew-resize",
        opacity: 0.6,
        transition: "opacity 0.2s, background-color 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.backgroundColor = "var(--mint-9)";
      }}
      onMouseLeave={(e) => {
        if (!isResizing) {
          e.currentTarget.style.opacity = "0.6";
          e.currentTarget.style.backgroundColor = "var(--gray-8)";
        }
      }}
    />
  );
}



