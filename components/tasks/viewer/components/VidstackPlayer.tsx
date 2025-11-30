"use client";

import { useState, forwardRef, useRef, useCallback, useEffect, useMemo } from "react";
import { Box, IconButton, Tooltip } from "@radix-ui/themes";
import { GearIcon, GridIcon, ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
} from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "@/styles/vidstack.css";

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

// Rally type for chapters
interface Rally {
  startTime: number;
  endTime: number;
  index: number;
}

interface VidstackPlayerProps {
  videoUrl: string;
  ballPositions?: BallPosition[];
  ballBounces?: BallBounce[];
  swings?: SwingWithPlayer[];
  rallies?: [number, number][]; // Array of [startTime, endTime] tuples
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
  // Thumbnail preview URL (VTT file)
  thumbnails?: string;
}

// Custom hook for frame stepping - Vidstack doesn't have built-in frame stepping
function useFrameStepping(playerRef: React.RefObject<MediaPlayerInstance | null>) {
  const FRAME_DURATION = 1 / 30; // Assuming 30fps
  
  const skipFrameBackward = useCallback(() => {
    const player = playerRef.current;
    if (player) {
      player.currentTime = Math.max(0, player.currentTime - FRAME_DURATION);
    }
  }, [playerRef]);
  
  const skipFrameForward = useCallback(() => {
    const player = playerRef.current;
    if (player) {
      const duration = player.duration || Infinity;
      player.currentTime = Math.min(duration, player.currentTime + FRAME_DURATION);
    }
  }, [playerRef]);
  
  return { skipFrameBackward, skipFrameForward };
}

// Convert rallies to Vidstack chapters format
function ralliesToChapters(rallies?: [number, number][], videoDuration?: number) {
  if (!rallies || rallies.length === 0) return undefined;
  
  const chapters: { startTime: number; endTime: number; title: string }[] = [];
  
  rallies.forEach((rally, index) => {
    const [startTime, endTime] = rally;
    chapters.push({
      startTime,
      endTime,
      title: `Rally ${index + 1}`,
    });
  });
  
  return chapters;
}

export const VidstackPlayer = forwardRef<HTMLVideoElement, VidstackPlayerProps>(
  ({ 
    videoUrl, 
    ballPositions, 
    ballBounces, 
    swings, 
    rallies,
    isFullWidth = false, 
    onFullWidthChange, 
    inferSwingBounces = true, 
    onInferSwingBouncesChange, 
    inferTrajectoryBounces = true, 
    onInferTrajectoryBouncesChange, 
    inferAudioBounces = false, 
    onInferAudioBouncesChange, 
    playerDisplayNames = {}, 
    showCalibrationButton = false, 
    isCalibrated = false, 
    onCalibrationComplete,
    thumbnails,
  }, ref) => {
    const [showVideoSettings, setShowVideoSettings] = useState(false);
    const [showBallTracker, setShowBallTracker] = useState(false);
    const [usePerspective, setUsePerspective] = useState(true);
    const [showTrail, setShowTrail] = useState(true);
    const [useSmoothing, setUseSmoothing] = useState(true);
    const [showBounceRipples, setShowBounceRipples] = useState(true);
    const [showVelocity, setShowVelocity] = useState(true);
    const [showPlayerBoxes, setShowPlayerBoxes] = useState(false);
    const [showPose, setShowPose] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [showCalibration, setShowCalibration] = useState(false);
    const [videoDuration, setVideoDuration] = useState<number | undefined>();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    
    // Vidstack player ref
    const playerRef = useRef<MediaPlayerInstance>(null);
    
    // Internal video element ref for overlay compatibility
    const internalVideoRef = useRef<HTMLVideoElement | null>(null);
    
    // Frame stepping hook
    const { skipFrameBackward, skipFrameForward } = useFrameStepping(playerRef);
    
    // Convert rallies to chapters format
    const chapters = useMemo(() => {
      return ralliesToChapters(rallies, videoDuration);
    }, [rallies, videoDuration]);
    
    // Show buttons when hovered or when settings panel is open
    const showButtons = isHovered || showVideoSettings;
    
    // Sync internal video ref with Vidstack's video element
    useEffect(() => {
      const player = playerRef.current;
      if (!player) return;
      
      const syncVideoRef = () => {
        const provider = player.provider;
        if (provider && 'video' in provider) {
          const videoEl = (provider as { video: HTMLVideoElement }).video;
          internalVideoRef.current = videoEl;
          
          // Forward to parent ref
          if (typeof ref === "function") {
            ref(videoEl);
          } else if (ref) {
            ref.current = videoEl;
          }
        }
      };
      
      // Initial sync and on provider change
      syncVideoRef();
      player.addEventListener("provider-change", syncVideoRef);
      
      return () => {
        player.removeEventListener("provider-change", syncVideoRef);
      };
    }, [ref]);
    
    // Track video duration for chapters
    useEffect(() => {
      const player = playerRef.current;
      if (!player) return;
      
      const handleDurationChange = () => {
        setVideoDuration(player.duration);
      };
      
      handleDurationChange();
      player.addEventListener("duration-change", handleDurationChange);
      
      return () => {
        player.removeEventListener("duration-change", handleDurationChange);
      };
    }, []);
    
    // Track fullscreen state
    useEffect(() => {
      const player = playerRef.current;
      if (!player) return;
      
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      
      return () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
      };
    }, []);
    
    // Track when video is ready (can play)
    useEffect(() => {
      const player = playerRef.current;
      if (!player) return;
      
      const handleCanPlay = () => {
        setIsVideoReady(true);
      };
      
      // Check if already ready
      if (player.state.canPlay) {
        setIsVideoReady(true);
      }
      
      player.addEventListener("can-play", handleCanPlay);
      
      return () => {
        player.removeEventListener("can-play", handleCanPlay);
      };
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
        <MediaPlayer
          ref={playerRef}
          src={videoUrl}
          viewType="video"
          crossOrigin="anonymous"
          playsInline
          keyShortcuts={{
            togglePaused: "k Space",
            toggleMuted: "m",
            toggleFullscreen: "f",
            togglePictureInPicture: "i",
            seekBackward: "ArrowLeft j",
            seekForward: "ArrowRight l",
            volumeUp: "ArrowUp",
            volumeDown: "ArrowDown",
          }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "var(--radius-3)",
          }}
        >
          <MediaProvider />
          
          {/* Ball Tracker Overlay - positioned above video but below controls */}
          {(showBallTracker || showTrail || showBounceRipples || showVelocity || showPlayerBoxes || showPose) && 
           (ballPositions || ballBounces || swings) && (
            <div data-overlay style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}>
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
                isFullscreen={isFullscreen}
              />
            </div>
          )}
          
          {/* Default Video Layout with all controls */}
          <DefaultVideoLayout
            icons={defaultLayoutIcons}
            thumbnails={thumbnails}
          />
        </MediaPlayer>

        {/* Top Left Button Group - Custom controls overlay (only show when video is ready) */}
        {isVideoReady && (
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
          {/* Frame Skip Backward */}
          <Tooltip content="Previous frame (frame-by-frame)">
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
          <Tooltip content="Next frame (frame-by-frame)">
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
        )}

        {/* Settings Button - Top Right (only show when video is ready) */}
        {isVideoReady && (
        <Box 
          style={{ 
            position: "absolute", 
            top: "12px", 
            right: "12px", 
            zIndex: 100,
          }}
        >
          <Tooltip content="Video overlay settings">
            <IconButton
              size="1"
              variant="solid"
              style={{
                backgroundColor: showVideoSettings ? "#7ADB8F" : "rgba(0, 0, 0, 0.6)",
                color: showVideoSettings ? "#1C1C1C" : "white",
                border: "2px solid white",
                borderRadius: "var(--radius-3)",
                width: 28,
                height: 28,
                backdropFilter: "blur(4px)",
                transition: "background-color 0.2s ease-in-out",
              }}
              onClick={() => setShowVideoSettings(!showVideoSettings)}
            >
              <GearIcon width={14} height={14} />
            </IconButton>
          </Tooltip>
        </Box>
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

VidstackPlayer.displayName = "VidstackPlayer";

// Export for programmatic control - expose player methods
export function useVidstackPlayer() {
  const playerRef = useRef<MediaPlayerInstance>(null);
  
  const seekTo = useCallback((time: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = time;
    }
  }, []);
  
  const play = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.play();
    }
  }, []);
  
  const pause = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
  }, []);
  
  const setPlaybackRate = useCallback((rate: number) => {
    if (playerRef.current) {
      playerRef.current.playbackRate = rate;
    }
  }, []);
  
  return {
    playerRef,
    seekTo,
    play,
    pause,
    setPlaybackRate,
  };
}

