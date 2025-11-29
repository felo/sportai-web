"use client";

import { useState, forwardRef, useRef, useCallback } from "react";
import { Box, IconButton, Tooltip } from "@radix-ui/themes";
import { GearIcon, EnterFullScreenIcon, ExitFullScreenIcon, GridIcon, ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { VideoSettings } from "./VideoSettings";
import { BallTrackerOverlay } from "./BallTrackerOverlay";
import { CourtCalibration } from "./CourtCalibration";

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
  ballPositions?: BallPosition[];
  ballBounces?: BallBounce[];
  swings?: SwingWithPlayer[];
  isFullWidth?: boolean;
  onFullWidthChange?: (isFullWidth: boolean) => void;
  // Data enhancement (controlled from parent)
  inferSwingBounces?: boolean;
  onInferSwingBouncesChange?: (value: boolean) => void;
  inferTrajectoryBounces?: boolean;
  onInferTrajectoryBouncesChange?: (value: boolean) => void;
  inferAudioBounces?: boolean;
  onInferAudioBouncesChange?: (value: boolean) => void;
  // Player display names (e.g., { 0: "Player 1", 3: "Player 2" })
  playerDisplayNames?: Record<number, string>;
  // Court calibration
  showCalibrationButton?: boolean;
  isCalibrated?: boolean;
  onCalibrationComplete?: (matrix: number[][]) => void;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ videoUrl, ballPositions, ballBounces, swings, isFullWidth = false, onFullWidthChange, inferSwingBounces = true, onInferSwingBouncesChange, inferTrajectoryBounces = true, onInferTrajectoryBouncesChange, inferAudioBounces = false, onInferAudioBouncesChange, playerDisplayNames = {}, showCalibrationButton = false, isCalibrated = false, onCalibrationComplete }, ref) => {
    const [showVideoSettings, setShowVideoSettings] = useState(false);
    const [showBallTracker, setShowBallTracker] = useState(false);
    const [usePerspective, setUsePerspective] = useState(true);
    const [showTrail, setShowTrail] = useState(true);
    const [useSmoothing, setUseSmoothing] = useState(true);
    const [showBounceRipples, setShowBounceRipples] = useState(true);
    const [showVelocity, setShowVelocity] = useState(true);
    const [showPlayerBoxes, setShowPlayerBoxes] = useState(false);
    const [showPose, setShowPose] = useState(false); // Default OFF
    const [isHovered, setIsHovered] = useState(false);
    const [showCalibration, setShowCalibration] = useState(false);
    
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

    // Show buttons when hovered or when settings panel is open
    const showButtons = isHovered || showVideoSettings;
    
    // Frame skip functions (assuming ~30fps, 1 frame ≈ 0.033s)
    const FRAME_DURATION = 1 / 30;
    
    const skipFrameBackward = useCallback(() => {
      if (internalVideoRef.current) {
        internalVideoRef.current.currentTime = Math.max(0, internalVideoRef.current.currentTime - FRAME_DURATION);
      }
    }, []);
    
    const skipFrameForward = useCallback(() => {
      if (internalVideoRef.current) {
        const duration = internalVideoRef.current.duration || Infinity;
        internalVideoRef.current.currentTime = Math.min(duration, internalVideoRef.current.currentTime + FRAME_DURATION);
      }
    }, []);

    return (
      <Box
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
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

          {/* Top Left Button Group */}
          <Box 
            style={{ 
              position: "absolute", 
              top: "12px", 
              left: "12px", 
              zIndex: 100,
              opacity: showButtons ? 1 : 0,
              transition: "opacity 0.2s ease-in-out",
              pointerEvents: showButtons ? "auto" : "none",
              display: "flex",
              gap: "6px",
            }}
          >
            {/* Expand Button */}
            {onFullWidthChange && (
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
            )}

            {/* Frame Skip Backward */}
            <Tooltip content="Previous frame">
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
                onClick={skipFrameBackward}
              >
                <ChevronLeftIcon width={14} height={14} />
              </IconButton>
            </Tooltip>

            {/* Frame Skip Forward */}
            <Tooltip content="Next frame">
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
                onClick={skipFrameForward}
              >
                <ChevronRightIcon width={14} height={14} />
              </IconButton>
            </Tooltip>

            {/* Calibration Button */}
            {showCalibrationButton && onCalibrationComplete && (
              <Tooltip content={isCalibrated ? "Court calibrated ✓ (click to recalibrate)" : "Calibrate court"}>
                <IconButton
                  size="1"
                  variant="solid"
                  style={{
                    backgroundColor: isCalibrated ? "#7ADB8F" : "#FFD700",
                    color: "#1C1C1C",
                    border: "2px solid white",
                    borderRadius: "var(--radius-3)",
                    width: 28,
                    height: 28,
                  }}
                  onClick={() => setShowCalibration(true)}
                >
                  <GridIcon width={14} height={14} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Settings Button - Top Right */}
          <Box 
            style={{ 
              position: "absolute", 
              top: "12px", 
              right: "12px", 
              zIndex: 100,
              opacity: showButtons ? 1 : 0,
              transition: "opacity 0.2s ease-in-out",
              pointerEvents: showButtons ? "auto" : "none",
            }}
          >
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
          {(showBallTracker || showTrail || showBounceRipples || showVelocity || showPlayerBoxes || showPose) && (ballPositions || ballBounces || swings) && (
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
              showPose={showPose}
              playerDisplayNames={playerDisplayNames}
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
              showPose={showPose}
              onPoseChange={setShowPose}
              inferSwingBounces={inferSwingBounces}
              onInferSwingBouncesChange={onInferSwingBouncesChange || (() => {})}
              inferTrajectoryBounces={inferTrajectoryBounces}
              onInferTrajectoryBouncesChange={onInferTrajectoryBouncesChange || (() => {})}
              inferAudioBounces={inferAudioBounces}
              onInferAudioBouncesChange={onInferAudioBouncesChange || (() => {})}
              onClose={() => setShowVideoSettings(false)}
            />
          )}

          {/* Court Calibration Overlay */}
          {showCalibration && onCalibrationComplete && (
            <CourtCalibration
              videoRef={internalVideoRef}
              onCalibrationComplete={(matrix) => {
                onCalibrationComplete(matrix);
                setShowCalibration(false);
              }}
              onClose={() => setShowCalibration(false)}
            />
          )}

        </Box>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

