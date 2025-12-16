"use client";

import { useState, useRef, useEffect, forwardRef, ReactNode, cloneElement, isValidElement } from "react";
import { Box, Flex } from "@radix-ui/themes";
import { useIsMobile } from "@/hooks/useIsMobile";

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
    const isMobile = useIsMobile();

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
    const courtAspectRatioVertical = 0.5; // Court is 10m wide x 20m tall = 1:2
    const courtAspectRatioHorizontal = 2; // Rotated court is 20m wide x 10m tall = 2:1
    const videoAspectRatio = 16 / 9;

    const showCourtNow = showCourt && !isFullWidth && courtComponent;
    
    let videoWidth: number;
    let videoHeight: number;
    let courtWidth: number;
    let courtHeight: number;

    if (isMobile) {
      // Mobile: full-width video, horizontal court above
      videoWidth = containerWidth;
      videoHeight = Math.floor(containerWidth / videoAspectRatio);
      
      if (showCourtNow && containerWidth > 0) {
        // Horizontal court: full width, height based on 2:1 aspect ratio
        courtWidth = containerWidth;
        courtHeight = Math.floor(containerWidth / courtAspectRatioHorizontal);
      } else {
        courtWidth = 0;
        courtHeight = 0;
      }
    } else {
      // Desktop: side-by-side layout
      // When showing court: video takes remaining space after court width
      // Court width = height * 0.5, and height = videoWidth / videoAspectRatio
      // So we need to solve: containerWidth = videoWidth + gap + (videoWidth / videoAspectRatio * courtAspectRatio)
      // containerWidth = videoWidth * (1 + courtAspectRatio / videoAspectRatio) + gap
      // videoWidth = (containerWidth - gap) / (1 + courtAspectRatio / videoAspectRatio)
      
      if (showCourtNow && containerWidth > 0) {
        const factor = 1 + (courtAspectRatioVertical / videoAspectRatio);
        videoWidth = Math.floor((containerWidth - gap) / factor);
        videoHeight = Math.floor(videoWidth / videoAspectRatio);
        courtHeight = videoHeight;
        courtWidth = Math.floor(courtHeight * courtAspectRatioVertical);
      } else {
        videoWidth = containerWidth;
        videoHeight = Math.floor(containerWidth / videoAspectRatio);
        courtWidth = 0;
        courtHeight = 0;
      }
    }

    // Clone court component with horizontal prop for mobile
    const courtComponentWithOrientation = showCourtNow && isValidElement(courtComponent)
      ? cloneElement(courtComponent as React.ReactElement<{ horizontal?: boolean }>, { 
          horizontal: isMobile 
        })
      : courtComponent;

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
          marginBottom: isMobile ? "var(--space-2)" : "var(--space-4)",
        }}
      >
        <Flex 
          gap={isMobile ? "2" : "4"} 
          align="start"
          direction={isMobile ? "column" : "row"}
        >
          {/* Court Container - shown first (above) on mobile */}
          {isMobile && showCourtNow && courtWidth > 0 && (
            <Box
              style={{
                width: `${courtWidth}px`,
                height: `${courtHeight}px`,
                flexShrink: 0,
              }}
            >
              {courtComponentWithOrientation}
            </Box>
          )}

          {/* Video Container */}
          <Box
            style={{
              width: isFullWidth || isMobile ? "100%" : `${videoWidth}px`,
              aspectRatio: "16 / 9",
              flexShrink: 0,
            }}
          >
            {videoPlayer}
          </Box>

          {/* Court Container - shown second (right) on desktop */}
          {!isMobile && showCourtNow && courtWidth > 0 && (
            <Box
              style={{
                width: `${courtWidth}px`,
                height: `${courtHeight}px`,
                flexShrink: 0,
              }}
            >
              {courtComponentWithOrientation}
            </Box>
          )}
        </Flex>
      </Box>
    );
  }
);

VideoCourtLayout.displayName = "VideoCourtLayout";

