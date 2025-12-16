"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ArrowDownIcon, ArrowUpIcon, VideoIcon } from "@radix-ui/react-icons";
import { Tooltip } from "@radix-ui/themes";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useFloatingVideoContextOptional } from "@/components/chat/viewers/FloatingVideoContext";
import { videoLogger } from "@/lib/logger";
import { OnboardingTooltip } from "@/components/ui";

interface ChatNavigationButtonsProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  onScrollToBottom: () => void;
  scrollThreshold?: number;
}

/**
 * Unified navigation buttons component that dynamically positions buttons.
 * Buttons stack from bottom to top based on visibility:
 * - Bottom: Scroll to bottom (down arrow) - when scrolled up
 * - Middle: Scroll to video (up arrow) - when video is out of view
 * - Top: Show floating video (video icon) - when video exists and not already floating
 */
export function ChatNavigationButtons({
  scrollContainerRef,
  onScrollToBottom,
  scrollThreshold = 200,
}: ChatNavigationButtonsProps) {
  const isMobile = useIsMobile();
  const floatingCtx = useFloatingVideoContextOptional();
  
  // Visibility states
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showScrollToVideo, setShowScrollToVideo] = useState(false);
  const [hasDomVideo, setHasDomVideo] = useState(false);
  
  const checkScrollTimeoutRef = useRef<NodeJS.Timeout>();
  const checkVideoTimeoutRef = useRef<NodeJS.Timeout>();
  const videoButtonRef = useRef<HTMLButtonElement>(null);
  
  // Track if this is the first time the video button appeared
  const [showVideoTooltip, setShowVideoTooltip] = useState(false);
  const videoButtonWasVisible = useRef(false);

  // Check if there are registered videos
  const hasRegisteredVideo = useMemo(() => {
    return (floatingCtx?.registeredVideos?.size ?? 0) > 0;
  }, [floatingCtx?.registeredVideos]);

  // Should show video button?
  const showVideoButton = useMemo(() => {
    const hasVideo = hasRegisteredVideo || hasDomVideo;
    const isFloatingExpanded = floatingCtx?.isFloating && !floatingCtx?.isMinimized;
    return hasVideo && !isFloatingExpanded;
  }, [hasRegisteredVideo, hasDomVideo, floatingCtx?.isFloating, floatingCtx?.isMinimized]);

  // Show onboarding tooltip when video button first appears
  useEffect(() => {
    if (showVideoButton && !videoButtonWasVisible.current) {
      // Video button just appeared - show the tooltip after a short delay
      const timer = setTimeout(() => {
        setShowVideoTooltip(true);
      }, 500);
      videoButtonWasVisible.current = true;
      return () => clearTimeout(timer);
    }
  }, [showVideoButton]);

  // Dismiss tooltip when video button is clicked
  const handleVideoTooltipDismiss = useCallback(() => {
    setShowVideoTooltip(false);
  }, []);

  // Monitor DOM for video elements
  useEffect(() => {
    const update = () => {
      if (typeof document === "undefined") return;
      const videoEl = document.querySelector("video");
      setHasDomVideo(!!videoEl);
    };
    update();
    const observer = typeof MutationObserver !== "undefined"
      ? new MutationObserver(update)
      : null;
    if (observer) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
    return () => observer?.disconnect();
  }, []);

  // Check scroll position for "scroll to bottom" button
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const checkScroll = () => {
      if (checkScrollTimeoutRef.current) {
        clearTimeout(checkScrollTimeoutRef.current);
      }

      checkScrollTimeoutRef.current = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        setShowScrollToBottom(distanceFromBottom > scrollThreshold);
      }, 100);
    };

    checkScroll();
    scrollContainer.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    return () => {
      scrollContainer.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      if (checkScrollTimeoutRef.current) {
        clearTimeout(checkScrollTimeoutRef.current);
      }
    };
  }, [scrollContainerRef, scrollThreshold]);

  // Check video visibility for "scroll to video" button
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const checkVideoVisibility = () => {
      if (checkVideoTimeoutRef.current) {
        clearTimeout(checkVideoTimeoutRef.current);
      }

      checkVideoTimeoutRef.current = setTimeout(() => {
        const videoContainers = Array.from(scrollContainer.querySelectorAll('[data-video-container="true"]'));
        
        if (videoContainers.length === 0) {
          setShowScrollToVideo(false);
          return;
        }

        const containerRect = scrollContainer.getBoundingClientRect();
        const isAnyVideoVisible = videoContainers.some((container) => {
          const videoRect = container.getBoundingClientRect();
          
          const isInView = 
            videoRect.bottom > containerRect.top &&
            videoRect.top < containerRect.bottom &&
            videoRect.right > containerRect.left &&
            videoRect.left < containerRect.right;
          
          if (isInView) {
            const visibleTop = Math.max(videoRect.top, containerRect.top);
            const visibleBottom = Math.min(videoRect.bottom, containerRect.bottom);
            const visibleHeight = visibleBottom - visibleTop;
            const videoHeight = videoRect.height;
            
            return videoHeight > 0 && visibleHeight / videoHeight > 0.3;
          }
          
          return false;
        });

        setShowScrollToVideo(videoContainers.length > 0 && !isAnyVideoVisible);
      }, 100);
    };

    checkVideoVisibility();
    scrollContainer.addEventListener("scroll", checkVideoVisibility);
    
    const observer = new MutationObserver(checkVideoVisibility);
    observer.observe(scrollContainer, { childList: true, subtree: true });
    
    window.addEventListener("resize", checkVideoVisibility);

    return () => {
      scrollContainer.removeEventListener("scroll", checkVideoVisibility);
      observer.disconnect();
      window.removeEventListener("resize", checkVideoVisibility);
      if (checkVideoTimeoutRef.current) {
        clearTimeout(checkVideoTimeoutRef.current);
      }
    };
  }, [scrollContainerRef]);

  // Handlers
  const handleScrollToVideo = () => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const videoContainers = Array.from(scrollContainer.querySelectorAll('[data-video-container="true"]'));
    if (videoContainers.length === 0) return;

    const firstContainer = videoContainers[0] as HTMLElement;
    if (firstContainer) {
      firstContainer.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleShowFloatingVideo = useCallback(() => {
    if (!floatingCtx) return;
    
    // Dismiss onboarding tooltip when clicked
    setShowVideoTooltip(false);
    
    // If nothing registered yet, try to auto-register the most recent video in the DOM
    if ((floatingCtx.registeredVideos?.size ?? 0) === 0) {
      const videoEl = typeof document !== "undefined" ? document.querySelector('video') as HTMLVideoElement | null : null;
      if (videoEl) {
        const container = videoEl.closest('[data-video-container="true"]') as HTMLElement | null;
        const refObj = { current: container || (videoEl as unknown as HTMLElement) } as React.RefObject<HTMLElement>;
        const src = videoEl.currentSrc || videoEl.src || "dom-video";
        const autoId = `dom-video-${Date.now()}`;
        floatingCtx.registerVideo(autoId, refObj, src, () => (
          <video
            key={autoId}
            src={src}
            controls
            autoPlay
            playsInline
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              width: "100%",
              height: "100%",
              objectFit: "contain",
              backgroundColor: "#000",
            }}
          />
        ));
        videoLogger.debug("[ChatNavigationButtons] Auto-registered DOM video", { autoId, src, hasContainer: !!container });
      } else {
        videoLogger.warn("[ChatNavigationButtons] No DOM video found to register");
        return;
      }
    }
    
    floatingCtx.showFloatingVideoAtTime(0);
  }, [floatingCtx]);

  // Build list of visible buttons (in order from bottom to top)
  const visibleButtons: Array<{
    id: string;
    icon: React.ReactNode;
    tooltip: string;
    onClick: () => void;
    ariaLabel: string;
  }> = [];

  if (showScrollToBottom) {
    visibleButtons.push({
      id: "scroll-bottom",
      icon: <ArrowDownIcon width="18" height="18" color="#1C1C1C" />,
      tooltip: "Scroll to bottom",
      onClick: onScrollToBottom,
      ariaLabel: "Scroll to bottom",
    });
  }

  if (showScrollToVideo && !isMobile) {
    visibleButtons.push({
      id: "scroll-video",
      icon: <ArrowUpIcon width="18" height="18" color="#1C1C1C" />,
      tooltip: "Scroll to video",
      onClick: handleScrollToVideo,
      ariaLabel: "Scroll to video",
    });
  }

  if (showVideoButton) {
    visibleButtons.push({
      id: "show-video",
      icon: <VideoIcon width="18" height="18" color="#1C1C1C" />,
      tooltip: "Show video",
      onClick: handleShowFloatingVideo,
      ariaLabel: "Show floating video",
    });
  }

  // Don't render anything if no buttons are visible
  if (visibleButtons.length === 0) return null;

  const BUTTON_SIZE = 36;
  const BUTTON_GAP = 8;
  const BASE_BOTTOM = isMobile ? "calc(20px + env(safe-area-inset-bottom))" : "20px";
  const RIGHT_POSITION = isMobile ? "calc(16px + var(--space-3))" : "calc(16px + var(--space-3))";

  return (
    <>
      <div
        style={{
          position: "absolute",
          bottom: BASE_BOTTOM,
          right: RIGHT_POSITION,
          display: "flex",
          flexDirection: "column-reverse", // Stack from bottom to top
          gap: `${BUTTON_GAP}px`,
          zIndex: 1001,
        }}
      >
        {visibleButtons.map((button) => {
          const isVideoButton = button.id === "show-video";
          return (
            <Tooltip key={button.id} content={button.tooltip}>
              <button
                ref={isVideoButton ? videoButtonRef : undefined}
                onClick={button.onClick}
                aria-label={button.ariaLabel}
                style={{
                  width: `${BUTTON_SIZE}px`,
                  height: `${BUTTON_SIZE}px`,
                  borderRadius: "9999px",
                  backgroundColor: "#7ADB8F",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease-out",
                  border: "2px solid white",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
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
                {button.icon}
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Onboarding tooltip for floating video button */}
      {showVideoButton && (
        <OnboardingTooltip
          tooltipId="floating-video-button"
          targetRef={videoButtonRef}
          message="Enable this to view your video while reading."
          position="left"
          offset={12}
          show={showVideoTooltip}
          onDismiss={handleVideoTooltipDismiss}
          autoDismissMs={12000}
        />
      )}
    </>
  );
}
