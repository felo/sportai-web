"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowDownIcon } from "@radix-ui/react-icons";
import { Tooltip } from "@radix-ui/themes";
import { useIsMobile } from "@/hooks/useIsMobile";

interface ScrollToBottomProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  onScrollToBottom: () => void;
  threshold?: number; // Distance from bottom in pixels before hiding button
}

export function ScrollToBottom({ 
  scrollContainerRef, 
  onScrollToBottom,
  threshold = 200 
}: ScrollToBottomProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useIsMobile();
  const checkScrollTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const checkScroll = () => {
      // Clear any pending timeout
      if (checkScrollTimeoutRef.current) {
        clearTimeout(checkScrollTimeoutRef.current);
      }

      // Debounce the scroll check to avoid too many state updates
      checkScrollTimeoutRef.current = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        
        // Show button if user has scrolled up more than threshold
        setIsVisible(distanceFromBottom > threshold);
      }, 100);
    };

    // Check scroll position on mount
    checkScroll();

    // Listen for scroll events
    scrollContainer.addEventListener("scroll", checkScroll);
    
    // Also check on resize (in case content changes)
    window.addEventListener("resize", checkScroll);

    return () => {
      scrollContainer.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      if (checkScrollTimeoutRef.current) {
        clearTimeout(checkScrollTimeoutRef.current);
      }
    };
  }, [scrollContainerRef, threshold]);

  if (!isVisible) return null;

  return (
    <Tooltip content="Scroll to bottom">
      <button
        onClick={onScrollToBottom}
        aria-label="Scroll to bottom"
        style={{
          position: "absolute",
          bottom: isMobile ? "calc(20px + env(safe-area-inset-bottom))" : "20px",
          right: isMobile ? "calc(16px + var(--space-3))" : "calc(16px + var(--space-3))",
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
        <ArrowDownIcon width="18" height="18" color="#1C1C1C" />
      </button>
    </Tooltip>
  );
}

