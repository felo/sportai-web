"use client";

import { useMemo, useEffect, useState } from "react";
import { VideoIcon } from "@radix-ui/react-icons";
import { Tooltip } from "@radix-ui/themes";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useFloatingVideoContextOptional } from "@/components/chat/viewers/FloatingVideoContext";
import { videoLogger } from "@/lib/logger";

interface ShowFloatingVideoProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Button to show the floating video popup.
 * Positioned on the left side, opposite to the scroll arrows.
 * Only visible when there's a video in the chat.
 */
export function ShowFloatingVideo({ scrollContainerRef }: ShowFloatingVideoProps) {
  const isMobile = useIsMobile();
  const floatingCtx = useFloatingVideoContextOptional();

  // Determine visibility: registered videos OR DOM fallback
  const [hasDomVideo, setHasDomVideo] = useState(false);
  const hasRegisteredVideo = useMemo(() => {
    return (floatingCtx?.registeredVideos?.size ?? 0) > 0;
  }, [floatingCtx?.registeredVideos]);
  const shouldShow = hasRegisteredVideo || hasDomVideo;

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

  useEffect(() => {
    videoLogger.debug("[ShowFloatingVideo] visibility state", {
      hasRegisteredVideo,
      registeredCount: floatingCtx?.registeredVideos?.size ?? 0,
      hasDomVideo,
      isFloating: floatingCtx?.isFloating,
      isMinimized: floatingCtx?.isMinimized,
    });
  }, [hasRegisteredVideo, hasDomVideo, floatingCtx?.registeredVideos?.size, floatingCtx?.isFloating, floatingCtx?.isMinimized]);

  const handleClick = () => {
    if (!floatingCtx) return;
    
    // If nothing registered yet, try to auto-register the most recent video in the DOM
    if ((floatingCtx.registeredVideos?.size ?? 0) === 0) {
      const videoEl = typeof document !== "undefined" ? document.querySelector('video') as HTMLVideoElement | null : null;
      if (videoEl) {
        const container = videoEl.closest('[data-video-container="true"]') as HTMLElement | null;
        const refObj = { current: container || (videoEl as unknown as HTMLElement) } as React.RefObject<HTMLElement>;
        const src = videoEl.currentSrc || videoEl.src || "dom-video";
        const autoId = `dom-video-${Date.now()}`;
        // Provide a proper renderContent that returns a video element (fallback will also work)
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
        videoLogger.debug("[ShowFloatingVideo] Auto-registered DOM video", { autoId, src, hasContainer: !!container });
      } else {
        videoLogger.warn("[ShowFloatingVideo] No DOM video found to register");
        return;
      }
    }
    
    // Use showFloatingVideoAtTime with 0 to bypass cooldown and show expanded
    // This will use the first registered video
    floatingCtx.showFloatingVideoAtTime(0);
  };

  // Don't show if no videos or if floating video is already visible
  if (!shouldShow) return null;
  
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

