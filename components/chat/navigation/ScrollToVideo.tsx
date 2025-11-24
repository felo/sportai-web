"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUpIcon } from "@radix-ui/react-icons";
import { Tooltip } from "@radix-ui/themes";
import { useIsMobile } from "@/hooks/useIsMobile";

interface ScrollToVideoProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

export function ScrollToVideo({ scrollContainerRef }: ScrollToVideoProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useIsMobile();
  const checkTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const checkVideoVisibility = () => {
      // Clear any pending timeout
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }

      // Debounce the check
      checkTimeoutRef.current = setTimeout(() => {
        // Find all video elements in the chat
        const videos = Array.from(scrollContainer.querySelectorAll('video'));
        
        if (videos.length === 0) {
          setIsVisible(false);
          return;
        }

        // Check if any video is currently in view (at least partially)
        const containerRect = scrollContainer.getBoundingClientRect();
        const isAnyVideoVisible = videos.some((video) => {
          const videoRect = video.getBoundingClientRect();
          
          // Check if video is at least partially visible in the viewport
          // A video is visible if any part of it overlaps with the container
          const isInView = 
            videoRect.bottom > containerRect.top &&
            videoRect.top < containerRect.bottom &&
            videoRect.right > containerRect.left &&
            videoRect.left < containerRect.right;
          
          // Only consider it "visible" if a significant portion is in view
          // Calculate how much of the video is visible
          if (isInView) {
            const visibleTop = Math.max(videoRect.top, containerRect.top);
            const visibleBottom = Math.min(videoRect.bottom, containerRect.bottom);
            const visibleHeight = visibleBottom - visibleTop;
            const videoHeight = videoRect.height;
            
            // Consider visible if at least 30% of the video is showing
            return visibleHeight / videoHeight > 0.3;
          }
          
          return false;
        });

        // Show button only if there are videos but none are currently visible
        setIsVisible(videos.length > 0 && !isAnyVideoVisible);
      }, 100);
    };

    // Check on mount
    checkVideoVisibility();

    // Listen for scroll events
    scrollContainer.addEventListener("scroll", checkVideoVisibility);

    // Use MutationObserver to detect when videos are added/removed
    const observer = new MutationObserver(checkVideoVisibility);
    observer.observe(scrollContainer, {
      childList: true,
      subtree: true,
    });

    // Also check on resize
    window.addEventListener("resize", checkVideoVisibility);

    return () => {
      scrollContainer.removeEventListener("scroll", checkVideoVisibility);
      observer.disconnect();
      window.removeEventListener("resize", checkVideoVisibility);
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [scrollContainerRef]);

  const scrollToNearestVideo = () => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // Find all video elements in the chat
    const videos = Array.from(scrollContainer.querySelectorAll('video'));
    if (videos.length === 0) return;

    // Simply scroll to the first video (or nearest video)
    const firstVideo = videos[0] as HTMLVideoElement;
    if (firstVideo) {
      firstVideo.scrollIntoView({ 
        behavior: "smooth", 
        block: "center" 
      });
    }
  };

  if (!isVisible) return null;

  return (
    <Tooltip content="Jump to video">
      <button
        onClick={scrollToNearestVideo}
        aria-label="Scroll to nearest video"
        style={{
          position: "absolute",
          // On mobile, add extra spacing to clear the fixed header (57px header + safe area + 20px spacing)
          top: isMobile ? "calc(77px + env(safe-area-inset-top))" : "20px",
          right: isMobile ? "calc(16px + var(--space-4))" : "calc(16px + var(--space-4))",
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
          animation: "fadeInDown 0.3s ease-out",
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
        <ArrowUpIcon width="18" height="18" color="#1C1C1C" />
      </button>
    </Tooltip>
  );
}

