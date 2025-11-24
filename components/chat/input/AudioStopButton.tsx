"use client";

import { useEffect, useState, useRef } from "react";
import { StopCircle, Volume2 } from "lucide-react";
import { Tooltip } from "@radix-ui/themes";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAudioPlayer } from "@/components/AudioPlayerContext";

interface AudioStopButtonProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  scrollButtonVisible?: boolean; // Whether the scroll-to-bottom button is visible
}

export function AudioStopButton({ 
  scrollContainerRef,
  scrollButtonVisible = false,
}: AudioStopButtonProps) {
  const { isPlaying, stopAudio } = useAudioPlayer();
  const isMobile = useIsMobile();

  if (!isPlaying) return null;

  // Position above scroll button if it's visible, otherwise same position
  const bottom = scrollButtonVisible 
    ? isMobile ? "calc(66px + env(safe-area-inset-bottom))" : "66px"
    : isMobile ? "calc(20px + env(safe-area-inset-bottom))" : "20px";

  return (
    <Tooltip content="Stop audio">
      <button
        onClick={stopAudio}
        aria-label="Stop audio playback"
        style={{
          position: "absolute",
          bottom,
          right: isMobile ? "calc(16px + var(--space-3))" : "calc(16px + var(--space-3))",
          width: "36px",
          height: "36px",
          borderRadius: "9999px",
          backgroundColor: "#FF6B6B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.3s ease-out",
          border: "2px solid white",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(255, 107, 107, 0.2)",
          zIndex: 1002, // Above scroll button (which is 1001)
          animation: "fadeInUp 0.3s ease-out",
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = "#FF8A8A";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(255, 107, 107, 0.6), 0 0 40px rgba(255, 107, 107, 0.4), 0 4px 16px rgba(255, 107, 107, 0.5)";
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = "#FF6B6B";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(255, 107, 107, 0.2)";
        }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Volume2 size={16} color="#FFFFFF" strokeWidth={2.5} />
          <StopCircle 
            size={10} 
            color="#FFFFFF" 
            fill="#FFFFFF" 
            style={{
              position: "absolute",
              bottom: "-2px",
              right: "-4px",
            }}
          />
        </div>
      </button>
    </Tooltip>
  );
}

