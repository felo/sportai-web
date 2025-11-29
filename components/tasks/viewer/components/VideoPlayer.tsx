"use client";

import { useState, forwardRef, useRef, useCallback } from "react";
import { Box, Flex, IconButton, Tooltip } from "@radix-ui/themes";
import { GearIcon, EnterFullScreenIcon, ExitFullScreenIcon } from "@radix-ui/react-icons";
import { CONFIG } from "../constants";
import { VideoSettings } from "./VideoSettings";
import { ResizeHandle } from "./ResizeHandle";
import { BallTrackerOverlay } from "./BallTrackerOverlay";

interface BallPosition {
  timestamp: number;
  X: number;
  Y: number;
}

interface BallBounce {
  timestamp: number;
  court_pos: [number, number];
  player_id: number;
  type: string;
}

interface SwingAnnotation {
  bbox: [number, number, number, number];
  box_confidence: number;
}

interface SwingWithPlayer {
  start: { timestamp: number; frame_nr: number };
  end: { timestamp: number; frame_nr: number };
  swing_type: string;
  ball_speed: number;
  volley: boolean;
  serve: boolean;
  ball_hit: { timestamp: number; frame_nr: number };
  confidence?: number;
  annotations?: SwingAnnotation[];
  player_id: number;
}

interface VideoPlayerProps {
  videoUrl: string;
  videoWidth: number;
  onWidthChange: (width: number) => void;
  ballPositions?: BallPosition[];
  ballBounces?: BallBounce[];
  swings?: SwingWithPlayer[];
  isFullWidth?: boolean;
  onFullWidthChange?: (isFullWidth: boolean) => void;
  // Data enhancement (controlled from parent)
  inferSwingBounces?: boolean;
  onInferSwingBouncesChange?: (value: boolean) => void;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ videoUrl, videoWidth, onWidthChange, ballPositions, ballBounces, swings, isFullWidth = false, onFullWidthChange, inferSwingBounces = true, onInferSwingBouncesChange }, ref) => {
    const [isResizing, setIsResizing] = useState(false);
    const [showVideoSettings, setShowVideoSettings] = useState(false);
    const [showBallTracker, setShowBallTracker] = useState(false);
    const [usePerspective, setUsePerspective] = useState(true);
    const [showTrail, setShowTrail] = useState(true);
    const [useSmoothing, setUseSmoothing] = useState(true);
    const [showBounceRipples, setShowBounceRipples] = useState(true);
    const [showVelocity, setShowVelocity] = useState(true);
    const [showPlayerBoxes, setShowPlayerBoxes] = useState(false);
    
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
        {!isFullWidth && <Box style={{ flex: 1 }} />}

        <Box
          style={{
            position: "relative",
            width: isFullWidth ? "100%" : `${videoWidth}px`,
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

          {/* Expand Button - Top Left */}
          {onFullWidthChange && (
            <Box style={{ position: "absolute", top: "12px", left: "12px", zIndex: 100 }}>
              <Tooltip content={isFullWidth ? "Exit full width" : "Full width"}>
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
                  onClick={() => onFullWidthChange(!isFullWidth)}
                >
                  {isFullWidth ? (
                    <ExitFullScreenIcon width={14} height={14} />
                  ) : (
                    <EnterFullScreenIcon width={14} height={14} />
                  )}
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Settings Button - Top Right */}
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
          {(showBallTracker || showTrail || showBounceRipples || showVelocity || showPlayerBoxes) && (ballPositions || ballBounces || swings) && (
            <BallTrackerOverlay
              ballPositions={ballPositions || []}
              ballBounces={ballBounces || []}
              swings={swings || []}
              videoRef={internalVideoRef}
              usePerspective={usePerspective}
              showIndicator={showBallTracker}
              showTrail={showTrail}
              useSmoothing={useSmoothing}
              showBounceRipples={showBounceRipples}
              showVelocity={showVelocity}
              showPlayerBoxes={showPlayerBoxes}
            />
          )}

          {showVideoSettings && (
            <VideoSettings
              showBallTracker={showBallTracker}
              onBallTrackerChange={setShowBallTracker}
              usePerspective={usePerspective}
              onPerspectiveChange={setUsePerspective}
              showTrail={showTrail}
              onTrailChange={setShowTrail}
              useSmoothing={useSmoothing}
              onSmoothingChange={setUseSmoothing}
              showBounceRipples={showBounceRipples}
              onBounceRipplesChange={setShowBounceRipples}
              showVelocity={showVelocity}
              onVelocityChange={setShowVelocity}
              showPlayerBoxes={showPlayerBoxes}
              onPlayerBoxesChange={setShowPlayerBoxes}
              inferSwingBounces={inferSwingBounces}
              onInferSwingBouncesChange={onInferSwingBouncesChange || (() => {})}
              onClose={() => setShowVideoSettings(false)}
            />
          )}

          {!isFullWidth && (
            <>
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
            </>
          )}
        </Box>

        {!isFullWidth && <Box style={{ flex: 1 }} />}
      </Flex>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

