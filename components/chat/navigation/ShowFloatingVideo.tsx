"use client";

import { useState, useEffect, useRef } from "react";
import { VideoIcon } from "@radix-ui/react-icons";
import { Tooltip } from "@radix-ui/themes";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useFloatingVideoContextOptional } from "@/components/chat/viewers/FloatingVideoContext";

interface ShowFloatingVideoProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Button to show the floating video popup.
 * Positioned on the left side, opposite to the scroll arrows.
 * Only visible when there's a video in the chat.
 */
export function ShowFloatingVideo({ scrollContainerRef }: ShowFloatingVideoProps) {
  const [hasVideo, setHasVideo] = useState(false);
  const isMobile = useIsMobile();
  const checkTimeoutRef = useRef<NodeJS.Timeout>();
  const floatingCtx = useFloatingVideoContextOptional();

  // Check if there are any videos in the chat
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const checkForVideos = () => {
      // Clear any pending timeout
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }

      // Debounce the check
      checkTimeoutRef.current = setTimeout(() => {
        // Find all video containers in the chat
        const videoContainers = scrollContainer.querySelectorAll('[data-video-container="true"]');
        setHasVideo(videoContainers.length > 0);
      }, 100);
    };

    // Check on mount
    checkForVideos();

    // Use MutationObserver to detect when videos are added/removed
    const observer = new MutationObserver(checkForVideos);
    observer.observe(scrollContainer, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [scrollContainerRef]);

  const handleClick = () => {
    if (!floatingCtx) return;
    
    // Use showFloatingVideoAtTime with 0 to bypass cooldown and show expanded
    // This will use the first registered video
    floatingCtx.showFloatingVideoAtTime(0);
  };

  // Don't show if no videos or if floating video is already visible
  if (!hasVideo) return null;
  
  // Hide button when floating video is already showing (not minimized)
  const isFloatingExpanded = floatingCtx?.isFloating && !floatingCtx?.isMinimized;
  if (isFloatingExpanded) return null;

  return (
    <Tooltip content="Show video">
      <button
        onClick={handleClick}
        aria-label="Show floating video"
        style={{
          position: "absolute",
          bottom: isMobile ? "calc(20px + env(safe-area-inset-bottom))" : "20px",
          left: isMobile ? "calc(16px + var(--space-3))" : "calc(16px + var(--space-3))",
          width: "36px",
          height: "36px",
          borderRadius: "9999px",
          backgroundColor: "#7ADB8F",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.3s ease-out",
          border: "2px solid white",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
          zIndex: 1001, // Above the fade overlay (which is 1000)
          animation: "fadeInUp 0.3s ease-out",
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = "#95E5A6";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(122, 219, 143, 0.6), 0 0 40px rgba(122, 219, 143, 0.4), 0 4px 16px rgba(122, 219, 143, 0.5)";
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.backgroundColor = "#7ADB8F";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)";
        }}
      >
        <VideoIcon width="18" height="18" color="#1C1C1C" />
      </button>
    </Tooltip>
  );
}

