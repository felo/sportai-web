"use client";

import { useState, useRef, useEffect, forwardRef, ReactNode } from "react";
import { Box, Flex } from "@radix-ui/themes";

interface VideoCourtLayoutProps {
  videoPlayer: ReactNode;
  courtComponent?: ReactNode;
  showCourt?: boolean;
  isFullWidth?: boolean;
  gap?: number;
}

export const VideoCourtLayout = forwardRef<HTMLDivElement, VideoCourtLayoutProps>(
  ({ videoPlayer, courtComponent, showCourt = true, isFullWidth = false, gap = 16 }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    // Observe container width changes
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const updateWidth = () => {
        setContainerWidth(container.offsetWidth);
      };

      // Initial measurement
      updateWidth();

      // Use ResizeObserver for responsive updates
      const resizeObserver = new ResizeObserver(updateWidth);
      resizeObserver.observe(container);

      return () => resizeObserver.disconnect();
    }, []);

    // Calculate dimensions
    const courtAspectRatio = 0.5; // Court is 10m wide x 20m tall = 1:2
    const videoAspectRatio = 16 / 9;

    // When showing court: video takes remaining space after court width
    // Court width = height * 0.5, and height = videoWidth / videoAspectRatio
    // So we need to solve: containerWidth = videoWidth + gap + (videoWidth / videoAspectRatio * courtAspectRatio)
    // containerWidth = videoWidth * (1 + courtAspectRatio / videoAspectRatio) + gap
    // videoWidth = (containerWidth - gap) / (1 + courtAspectRatio / videoAspectRatio)
    
    const showCourtNow = showCourt && !isFullWidth && courtComponent;
    
    let videoWidth: number;
    let videoHeight: number;
    let courtWidth: number;
    let courtHeight: number;

    if (showCourtNow && containerWidth > 0) {
      const factor = 1 + (courtAspectRatio / videoAspectRatio);
      videoWidth = Math.floor((containerWidth - gap) / factor);
      videoHeight = Math.floor(videoWidth / videoAspectRatio);
      courtHeight = videoHeight;
      courtWidth = Math.floor(courtHeight * courtAspectRatio);
    } else {
      videoWidth = containerWidth;
      videoHeight = Math.floor(containerWidth / videoAspectRatio);
      courtWidth = 0;
      courtHeight = 0;
    }

    return (
      <Box
        ref={(el) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (typeof ref === "function") {
            ref(el);
          } else if (ref) {
            ref.current = el;
          }
        }}
        style={{ 
          width: "100%",
          marginBottom: "var(--space-4)",
        }}
      >
        <Flex gap="4" align="start">
          {/* Video Container */}
          <Box
            style={{
              width: isFullWidth ? "100%" : `${videoWidth}px`,
              aspectRatio: "16 / 9",
              flexShrink: 0,
            }}
          >
            {videoPlayer}
          </Box>

          {/* Court Container */}
          {showCourtNow && courtWidth > 0 && (
            <Box
              style={{
                width: `${courtWidth}px`,
                height: `${courtHeight}px`,
                flexShrink: 0,
              }}
            >
              {courtComponent}
            </Box>
          )}
        </Flex>
      </Box>
    );
  }
);

VideoCourtLayout.displayName = "VideoCourtLayout";

