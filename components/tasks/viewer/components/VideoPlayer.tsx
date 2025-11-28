"use client";

import { useState, forwardRef, useRef, useCallback } from "react";
import { Box, Flex, IconButton, Tooltip } from "@radix-ui/themes";
import { GearIcon } from "@radix-ui/react-icons";
import { CONFIG } from "../constants";
import { VideoSettings } from "./VideoSettings";
import { ResizeHandle } from "./ResizeHandle";
import { BallTrackerOverlay } from "./BallTrackerOverlay";

interface BallPosition {
  timestamp: number;
  X: number;
  Y: number;
}

interface VideoPlayerProps {
  videoUrl: string;
  videoWidth: number;
  onWidthChange: (width: number) => void;
  ballPositions?: BallPosition[];
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ videoUrl, videoWidth, onWidthChange, ballPositions }, ref) => {
    const [isResizing, setIsResizing] = useState(false);
    const [showVideoSettings, setShowVideoSettings] = useState(false);
    const [showBallTracker, setShowBallTracker] = useState(true);
    const [usePerspective, setUsePerspective] = useState(true);
    
    // Internal ref for ball tracker
    const internalVideoRef = useRef<HTMLVideoElement | null>(null);
    
    // Callback ref that sets both the forwarded ref and internal ref
    const setVideoRef = useCallback((element: HTMLVideoElement | null) => {
      internalVideoRef.current = element;
      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    }, [ref]);

    const handleResizeStart = (startX: number, startWidth: number, side: "left" | "right") => {
      setIsResizing(true);

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = side === "left" ? startX - moveEvent.clientX : moveEvent.clientX - startX;
        const newWidth = Math.max(
          CONFIG.VIDEO_MIN_WIDTH,
          Math.min(CONFIG.VIDEO_MAX_WIDTH, startWidth + delta * 2)
        );
        onWidthChange(newWidth);
      };

      const onMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    return (
      <Flex justify="center" style={{ marginBottom: "var(--space-4)" }}>
        <Box style={{ flex: 1 }} />

        <Box
          style={{
            position: "relative",
            width: `${videoWidth}px`,
            maxWidth: "100%",
            minWidth: `${CONFIG.VIDEO_MIN_WIDTH}px`,
            aspectRatio: "16 / 9",
            backgroundColor: "var(--gray-3)",
            borderRadius: "var(--radius-3)",
            overflow: "hidden",
          }}
        >
          <video
            ref={setVideoRef}
            src={videoUrl}
            controls
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: "var(--radius-3)",
            }}
          />

          {/* Settings Button */}
          <Box style={{ position: "absolute", top: "12px", right: "12px", zIndex: 100 }}>
            <Tooltip content="Video settings">
              <IconButton
                size="1"
                variant="solid"
                style={{
                  backgroundColor: "#7ADB8F",
                  color: "#1C1C1C",
                  border: "2px solid white",
                  borderRadius: "var(--radius-3)",
                  width: 28,
                  height: 28,
                }}
                onClick={() => setShowVideoSettings(!showVideoSettings)}
              >
                <GearIcon width={14} height={14} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Ball Tracker Overlay */}
          {showBallTracker && ballPositions && (
            <BallTrackerOverlay
              ballPositions={ballPositions}
              videoRef={internalVideoRef}
              usePerspective={usePerspective}
            />
          )}

          {showVideoSettings && (
            <VideoSettings
              showBallTracker={showBallTracker}
              onBallTrackerChange={setShowBallTracker}
              usePerspective={usePerspective}
              onPerspectiveChange={setUsePerspective}
              onClose={() => setShowVideoSettings(false)}
            />
          )}

          <ResizeHandle
            side="left"
            isResizing={isResizing}
            videoWidth={videoWidth}
            onResizeStart={handleResizeStart}
          />
          <ResizeHandle
            side="right"
            isResizing={isResizing}
            videoWidth={videoWidth}
            onResizeStart={handleResizeStart}
          />
        </Box>

        <Box style={{ flex: 1 }} />
      </Flex>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

