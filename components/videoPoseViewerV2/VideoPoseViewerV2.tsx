"use client";

/**
 * VideoPoseViewerV2
 * 
 * A clean, modular, externally-controllable pose detection video player.
 * All configuration is passed via props, making it easy to integrate with
 * external UI controls and state management.
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
  ReactNode,
} from "react";
import { Box, Flex, Text, Badge } from "@radix-ui/themes";
import { PlayIcon, ActivityLogIcon } from "@radix-ui/react-icons";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import type { PoseDetectionResult, SupportedModel } from "@/hooks/usePoseDetection";
import { detectionLogger } from "@/lib/logger";
import { calculateAngle } from "@/types/pose";
import {
  drawPoses,
  drawAngles,
  drawTrajectories,
  drawBodyOrientation,
  resetOrientationTracking,
  type LabelPositionState,
  type TrajectoryPoint,
} from "@/components/chat/viewers/videoPoseViewer/utils";

import { useSwingDetection } from "@/components/chat/viewers/videoPoseViewer/hooks/useSwingDetection";
import { useSwingDetectionV3, type SwingDetectionResultV3 } from "./hooks/useSwingDetectionV3";
import { useHandednessDetection, type HandednessResult } from "./hooks/useHandednessDetection";
import { SwingCurveView, type MetricType, type WristType, type KneeType, type AngleType, type VelocityBodyPart, type OrientationType } from "./SwingCurveView";

import type {
  ViewerConfig,
  ViewerState,
  ViewerCallbacks,
  ViewerActions,
  DEFAULT_VIEWER_CONFIG,
  ProtocolEvent,
} from "./types";
import {
  CONFIDENCE_PRESETS,
  RESOLUTION_PRESETS,
  PROTOCOL_EVENT_COLORS,
} from "./types";

// ============================================================================
// Tab Navigation Types & Component
// ============================================================================

interface TabDefinition {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  disabled?: boolean;
}

interface TabNavigationProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <Box
      style={{
        borderBottom: "1px solid var(--gray-6)",
        backgroundColor: "var(--gray-2)",
        position: "relative",
        zIndex: 30,
      }}
    >
      <Flex
        gap="0"
        style={{
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = tab.disabled;

          return (
            <Box
              key={tab.id}
              onClick={() => !isDisabled && onTabChange(tab.id)}
              style={{
                padding: "12px 20px",
                cursor: isDisabled ? "not-allowed" : "pointer",
                borderBottom: isActive ? "2px solid var(--mint-9)" : "2px solid transparent",
                backgroundColor: isActive ? "var(--gray-1)" : "transparent",
                opacity: isDisabled ? 0.4 : 1,
                transition: "all 0.15s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!isActive && !isDisabled) {
                  e.currentTarget.style.backgroundColor = "var(--gray-3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive && !isDisabled) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <Flex align="center" gap="2">
                <Box
                  style={{
                    color: isActive ? "var(--mint-11)" : "var(--gray-10)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {tab.icon}
                </Box>
                <Text
                  size="2"
                  weight={isActive ? "medium" : "regular"}
                  style={{
                    color: isActive ? "var(--gray-12)" : "var(--gray-11)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.label}
                </Text>
                {tab.badge !== undefined && (
                  <Badge size="1" color={isActive ? "mint" : "gray"} variant="soft">
                    {tab.badge}
                  </Badge>
                )}
                {isDisabled && (
                  <Badge size="1" color="gray" variant="outline">
                    Soon
                  </Badge>
                )}
              </Flex>
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}

// ============================================================================
// Props
// ============================================================================

interface VideoPoseViewerV2Props {
  /** Video URL to play */
  videoUrl: string;
  /** Configuration object - externally controlled */
  config: ViewerConfig;
  /** Pose detection enabled */
  poseEnabled: boolean;
  /** Callbacks for events */
  callbacks?: ViewerCallbacks;
  /** Custom class name */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
  /** Lite mode - hides debug overlay for minimal UI embedding */
  lite?: boolean;
  /** Developer mode - shows additional debug info like swing score */
  developerMode?: boolean;
  /** Confidence threshold for highlighting low-confidence frames in data analysis (0-1) */
  confidenceThreshold?: number;
  /** Callback when confidence threshold changes */
  onConfidenceThresholdChange?: (threshold: number) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_VIDEO_FPS = 30;
const COMMON_FPS_VALUES = [24, 25, 30, 50, 60, 120];

// ============================================================================
// Helper Functions
// ============================================================================

function shouldUseCrossOrigin(url: string): boolean {
  // blob: and data: URLs don't need CORS
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    return false;
  }
  // For all http/https URLs, use crossOrigin to enable canvas operations
  // The Statistics viewer uses this successfully with S3
  return true;
}

// ============================================================================
// Component
// ============================================================================

export const VideoPoseViewerV2 = forwardRef<ViewerActions, VideoPoseViewerV2Props>(
  function VideoPoseViewerV2(
    { videoUrl, config, poseEnabled, callbacks, className, style, lite = false, developerMode = false, confidenceThreshold, onConfidenceThresholdChange },
    ref
  ) {
    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const labelPositionStateRef = useRef<Map<string, LabelPositionState>>(new Map());
    
    // Store callbacks in ref to avoid re-render loops
    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    // Video state
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDetectingFPS, setIsDetectingFPS] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [videoFPS, setVideoFPS] = useState(DEFAULT_VIDEO_FPS);
    const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 });
    const [isPortrait, setIsPortrait] = useState(false);

    // Pose state
    const [currentPoses, setCurrentPoses] = useState<PoseDetectionResult[]>([]);
    const [selectedPoseIndex, setSelectedPoseIndex] = useState(0);

    // Preprocessing state
    const [isPreprocessing, setIsPreprocessing] = useState(false);
    const [preprocessProgress, setPreprocessProgress] = useState(0);
    const [preprocessedPoses, setPreprocessedPoses] = useState<Map<number, PoseDetectionResult[]>>(new Map());
    const [preprocessingFPS, setPreprocessingFPS] = useState(DEFAULT_VIDEO_FPS);
    const preprocessAbortRef = useRef(false);
    // Ref to track poses synchronously (state updates are async)
    const preprocessedPosesRef = useRef<Map<number, PoseDetectionResult[]>>(new Map());
    
    // Track if video is ready for display (after FPS detection completes)
    const [isVideoReadyForDisplay, setIsVideoReadyForDisplay] = useState(false);
    
    // Track how FPS was detected: 'default' | 'counted' | 'metadata'
    const [fpsDetectionMethod, setFpsDetectionMethod] = useState<'default' | 'counted' | 'metadata'>('default');

    // Trajectory state
    const [jointTrajectories, setJointTrajectories] = useState<Map<number, TrajectoryPoint[]>>(new Map());

    // Protocol events state
    const [protocolEvents, setProtocolEvents] = useState<ProtocolEvent[]>([]);

    // Tab state
    const [activeTab, setActiveTab] = useState<"swings" | "data-analysis">("swings");
    
    // Data Analysis metric state (persists across tab switches)
    const [selectedMetric, setSelectedMetric] = useState<MetricType>("velocity");
    const [selectedWrist, setSelectedWrist] = useState<WristType>("both");
    const [selectedKnee, setSelectedKnee] = useState<KneeType>("both");
    const [selectedAngleType, setSelectedAngleType] = useState<AngleType>("knee");
    const [selectedVelocityBodyPart, setSelectedVelocityBodyPart] = useState<VelocityBodyPart>("wrist");
    const [selectedOrientationType, setSelectedOrientationType] = useState<OrientationType>("body");

    // Notify parent when active tab changes
    useEffect(() => {
      callbacksRef.current?.onActiveTabChange?.(activeTab);
    }, [activeTab]);

    // Tab definitions
    const tabs: TabDefinition[] = useMemo(() => [
      { id: "swings", label: "Swings", icon: <PlayIcon width={16} height={16} /> },
      { id: "data-analysis", label: "Data Analysis", icon: <ActivityLogIcon width={16} height={16} /> },
    ], []);

    // Swing detection V1 hook
    const {
      isAnalyzing: isSwingAnalyzing,
      result: swingResult,
      detectSwings,
      clearResult: clearSwingResult,
    } = useSwingDetection({
      preprocessedPoses,
      selectedModel: config.model.model,
      videoFPS: preprocessingFPS,
      selectedPoseIndex,
    });

    // Swing detection V3 hook (orientation-enhanced)
    const {
      isAnalyzing: isSwingAnalyzingV3,
      result: swingResultV3,
      analyzeSwings: analyzeSwingsV3,
      clearResults: clearSwingResultV3,
      error: swingErrorV3,
    } = useSwingDetectionV3({
      preprocessedPoses,
      selectedModel: config.model.model,
      videoFPS: preprocessingFPS,
      selectedPoseIndex,
      config: {
        minVelocityThreshold: config.swingDetectionV3.minVelocityThreshold,
        minVelocityKmh: config.swingDetectionV3.minVelocityKmh,
        velocityPercentile: config.swingDetectionV3.velocityPercentile,
        minRotationVelocity: config.swingDetectionV3.minRotationVelocity,
        requireRotation: config.swingDetectionV3.requireRotation,
        rotationWeight: config.swingDetectionV3.rotationWeight,
        minSwingDuration: config.swingDetectionV3.minSwingDuration,
        maxSwingDuration: config.swingDetectionV3.maxSwingDuration,
        minTimeBetweenSwings: config.swingDetectionV3.minTimeBetweenSwings,
        loadingRotationThreshold: config.swingDetectionV3.loadingRotationThreshold,
        contactVelocityRatio: config.swingDetectionV3.contactVelocityRatio,
        smoothingWindow: config.swingDetectionV3.smoothingWindow,
        minConfidence: config.swingDetectionV3.minConfidence,
        classifySwingType: config.swingDetectionV3.classifySwingType,
        handedness: config.swingDetectionV3.handedness,
        clipLeadTime: config.swingDetectionV3.clipLeadTime,
        clipTrailTime: config.swingDetectionV3.clipTrailTime,
      },
    });

    // Handedness detection hook
    const {
      isAnalyzing: isHandednessAnalyzing,
      result: handednessResult,
      analyzeHandedness,
      clearResult: clearHandednessResult,
    } = useHandednessDetection({
      preprocessedPoses,
      selectedModel: config.model.model,
      videoFPS: preprocessingFPS,
      selectedPoseIndex,
    });

    // Computed values
    const currentFrame = useMemo(() => Math.floor(currentTime * videoFPS), [currentTime, videoFPS]);
    const totalFrames = useMemo(() => Math.floor(duration * videoFPS), [duration, videoFPS]);
    const usingPreprocessedPoses = preprocessedPoses.size > 0;

    // Get effective model type
    const effectiveModelType = useMemo(() => {
      if (config.model.model === "BlazePose") {
        return config.model.blazePoseType;
      }
      return config.model.maxPoses > 1 
        ? "MultiPose.Lightning" 
        : config.model.moveNetType;
    }, [config.model]);

    // Get confidence thresholds
    const confidenceThresholds = useMemo(() => {
      if (config.confidence.preset === "custom") {
        return {
          minPoseScore: config.confidence.minPoseScore,
          minPartScore: config.confidence.minPartScore,
        };
      }
      return CONFIDENCE_PRESETS[config.confidence.preset];
    }, [config.confidence]);

    // Get input resolution
    const inputResolution = useMemo(() => {
      if (config.resolution.preset === "custom") {
        return { width: config.resolution.width, height: config.resolution.height };
      }
      return RESOLUTION_PRESETS[config.resolution.preset];
    }, [config.resolution]);

    // Initialize pose detection
    const {
      isLoading: isModelLoading,
      error: modelError,
      isDetecting,
      detectPose,
      startDetection,
      stopDetection,
    } = usePoseDetection({
      model: config.model.model,
      modelType: effectiveModelType,
      enableSmoothing: config.model.enableSmoothing,
      minPoseScore: confidenceThresholds.minPoseScore,
      minPartScore: confidenceThresholds.minPartScore,
      inputResolution: config.model.model === "MoveNet" ? inputResolution : undefined,
      maxPoses: config.model.model === "MoveNet" ? config.model.maxPoses : 1,
      enabled: poseEnabled,
    });

    // Unified "initializing" state - covers model loading, FPS detection, and preprocessing
    const isInitializing = isModelLoading || isDetectingFPS || isPreprocessing;

    // Selected pose
    const selectedPose = useMemo(() => {
      if (currentPoses.length === 0) return null;
      return currentPoses[Math.min(selectedPoseIndex, currentPoses.length - 1)];
    }, [currentPoses, selectedPoseIndex]);

    // ========================================================================
    // Video FPS Detection
    // ========================================================================

    // Track if FPS has been detected
    const fpsDetectedRef = useRef(false);

    /**
     * Detect FPS by briefly playing the video and counting frames.
     * Returns a promise that resolves with the detected FPS.
     */
    const detectVideoFPSAsync = useCallback(async (video: HTMLVideoElement): Promise<number> => {
      setIsDetectingFPS(true);
      
      return new Promise((resolve) => {
        const finish = (fps: number, method: 'default' | 'counted' = 'counted') => {
          setIsDetectingFPS(false);
          setIsVideoReadyForDisplay(true); // Video can now be shown
          setFpsDetectionMethod(method);
          callbacksRef.current?.onFPSDetected?.(fps, method);
          resolve(fps);
        };

        if (!("requestVideoFrameCallback" in video)) {
          detectionLogger.debug("No requestVideoFrameCallback support, using default FPS: 30");
          finish(DEFAULT_VIDEO_FPS, 'default');
          return;
        }

        let frameCount = 0;
        let firstMediaTime: number | null = null;
        const maxFrames = 15; // Need enough frames for accurate detection
        const originalTime = video.currentTime;
        const wasMuted = video.muted;

        const callback = (_now: number, metadata: { mediaTime?: number }) => {
          if (frameCount === 0) {
            firstMediaTime = metadata.mediaTime ?? 0;
          }
          frameCount++;

          if (frameCount >= maxFrames) {
            // Stop playback
            video.pause();
            video.currentTime = originalTime;
            video.muted = wasMuted;

            const mediaTimeDiff = (metadata.mediaTime ?? 0) - (firstMediaTime ?? 0);
            let fps = DEFAULT_VIDEO_FPS;
            if (mediaTimeDiff > 0) {
              fps = Math.round(frameCount / mediaTimeDiff);
              fps = COMMON_FPS_VALUES.reduce((prev, curr) =>
                Math.abs(curr - fps) < Math.abs(prev - fps) ? curr : prev
              );
            }
            detectionLogger.debug(`Detected FPS: ${fps} (${frameCount} frames in ${mediaTimeDiff.toFixed(3)}s)`);
            finish(fps);
          } else if (!video.paused && !video.ended) {
            (video as any).requestVideoFrameCallback(callback);
          } else {
            // Video stopped unexpectedly, use default
            finish(DEFAULT_VIDEO_FPS, 'default');
          }
        };

        // Mute and play briefly to detect FPS
        video.muted = true;
        video.currentTime = 0;
        
        const onCanPlay = () => {
          video.removeEventListener("canplay", onCanPlay);
          (video as any).requestVideoFrameCallback(callback);
          video.play().catch(() => {
            // If play fails, use default
            video.muted = wasMuted;
            finish(DEFAULT_VIDEO_FPS, 'default');
          });
        };

        if (video.readyState >= 3) {
          onCanPlay();
        } else {
          video.addEventListener("canplay", onCanPlay, { once: true });
        }

        // Timeout fallback
        setTimeout(() => {
          if (frameCount < maxFrames) {
            video.pause();
            video.currentTime = originalTime;
            video.muted = wasMuted;
            finish(DEFAULT_VIDEO_FPS, 'default');
          }
        }, 2000);
      });
    }, []);

    // Legacy sync detection for when video is already playing
    const detectVideoFPS = useCallback((video: HTMLVideoElement) => {
      if (fpsDetectedRef.current) return;

      if ("requestVideoFrameCallback" in video) {
        let frameCount = 0;
        let firstMediaTime: number | null = null;
        const maxFrames = 15;

        const callback = (_now: number, metadata: { mediaTime?: number }) => {
          if (fpsDetectedRef.current) return;

          if (frameCount === 0) {
            firstMediaTime = metadata.mediaTime ?? 0;
          }
          frameCount++;

          if (frameCount >= maxFrames) {
            const mediaTimeDiff = (metadata.mediaTime ?? 0) - (firstMediaTime ?? 0);
            let fps = DEFAULT_VIDEO_FPS;
            if (mediaTimeDiff > 0) {
              fps = Math.round(frameCount / mediaTimeDiff);
              fps = COMMON_FPS_VALUES.reduce((prev, curr) =>
                Math.abs(curr - fps) < Math.abs(prev - fps) ? curr : prev
              );
            }
            fpsDetectedRef.current = true;
            setVideoFPS(fps);
            detectionLogger.debug(`Detected FPS on play: ${fps}`);
          } else if (!video.paused && !video.ended) {
            (video as any).requestVideoFrameCallback(callback);
          }
        };

        const startFPSDetection = () => {
          if (fpsDetectedRef.current) return;
          frameCount = 0;
          firstMediaTime = null;
          (video as any).requestVideoFrameCallback(callback);
        };

        video.addEventListener("play", startFPSDetection, { once: true });
      }
    }, []);

    // ========================================================================
    // Video Event Handlers
    // ========================================================================

    const handleLoadedMetadata = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;

      const width = video.videoWidth;
      const height = video.videoHeight;
      const dur = video.duration;

      detectionLogger.debug(`Video loaded: ${width}x${height}, duration: ${dur}s`);

      setVideoDimensions({ width, height });
      setIsPortrait(height > width);
      setDuration(dur);
      setIsVideoReady(true);

      // Set canvas dimensions
      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }

      // Detect FPS
      detectVideoFPS(video);

      // Notify callback
      callbacksRef.current?.onVideoLoad?.(width, height, dur, videoFPS);
    }, [detectVideoFPS, videoFPS]);

    const handleTimeUpdate = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      
      setCurrentTime(video.currentTime);
      const frame = Math.floor(video.currentTime * videoFPS);
      callbacksRef.current?.onTimeUpdate?.(video.currentTime, frame);
    }, [videoFPS]);

    const handlePlay = useCallback(() => {
      setIsPlaying(true);
      callbacksRef.current?.onPlaybackChange?.(true);
    }, []);

    const handlePause = useCallback(() => {
      setIsPlaying(false);
      callbacksRef.current?.onPlaybackChange?.(false);
    }, []);

    const handleEnded = useCallback(() => {
      setIsPlaying(false);
      stopDetection();
      callbacksRef.current?.onPlaybackChange?.(false);
    }, [stopDetection]);

    const handleError = useCallback((event: any) => {
      console.error("Video error:", event);
      detectionLogger.error("Video loading error:", event?.detail || event);
      callbacksRef.current?.onError?.("Video failed to load");
    }, []);


    // ========================================================================
    // Pose Detection During Playback
    // ========================================================================

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !poseEnabled || isModelLoading || !isVideoReady) {
        stopDetection();
        return;
      }

      // Don't run detection during FPS detection
      if (isDetectingFPS) {
        stopDetection();
        return;
      }

      // If using preprocessed poses, sync from cache instead of running detection
      if (usingPreprocessedPoses) {
        stopDetection();
        return;
      }

      if (!isPlaying) {
        stopDetection();
        return;
      }

      if (!video.videoWidth || !video.videoHeight) {
        stopDetection();
        return;
      }

      startDetection(video, (poses) => {
        setCurrentPoses(poses);
        callbacksRef.current?.onPoseChange?.(poses, currentFrame);
      });

      return () => stopDetection();
    }, [
      poseEnabled,
      isPlaying,
      isModelLoading,
      isVideoReady,
      isDetectingFPS,
      usingPreprocessedPoses,
      currentFrame,
      startDetection,
      stopDetection,
    ]);

    // Sync preprocessed poses during playback
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !usingPreprocessedPoses || !isPlaying) return;

      let rafId: number;
      let lastFrame = -1;

      const syncPoses = () => {
        if (!video.paused && !video.ended) {
          const frame = Math.floor(video.currentTime * preprocessingFPS);
          if (frame !== lastFrame && preprocessedPoses.has(frame)) {
            const poses = preprocessedPoses.get(frame);
            if (poses?.length) {
              setCurrentPoses(poses);
              callbacksRef.current?.onPoseChange?.(poses, frame);
              lastFrame = frame;
            }
          }
          rafId = requestAnimationFrame(syncPoses);
        }
      };

      syncPoses();
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
      };
    }, [usingPreprocessedPoses, isPlaying, preprocessingFPS, preprocessedPoses]);

    // ========================================================================
    // Trajectory Tracking
    // ========================================================================

    useEffect(() => {
      if (!config.trajectories.showTrajectories || currentPoses.length === 0) return;

      const pose = currentPoses[selectedPoseIndex] || currentPoses[0];
      if (!pose) return;

      setJointTrajectories((prev) => {
        const next = new Map(prev);

        for (const jointIndex of config.trajectories.selectedJoints) {
          const keypoint = pose.keypoints[jointIndex];
          if (!keypoint || (keypoint.score ?? 0) < confidenceThresholds.minPartScore) continue;

          const points = next.get(jointIndex) || [];
          const newPoint: TrajectoryPoint = {
            x: keypoint.x,
            y: keypoint.y,
            frame: currentFrame,
          };

          // Add point and limit history
          const newPoints = [...points, newPoint].slice(-config.trajectories.maxTrajectoryPoints);
          next.set(jointIndex, newPoints);
        }

        return next;
      });
    }, [
      currentPoses,
      selectedPoseIndex,
      currentFrame,
      config.trajectories,
      confidenceThresholds.minPartScore,
    ]);

    // Clear trajectories when config changes
    useEffect(() => {
      if (!config.trajectories.showTrajectories) {
        setJointTrajectories(new Map());
      }
    }, [config.trajectories.showTrajectories, config.trajectories.selectedJoints]);

    // ========================================================================
    // Canvas Drawing
    // ========================================================================

    useEffect(() => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!poseEnabled) return;

      // Draw trajectories first (behind skeleton)
      if (config.trajectories.showTrajectories && jointTrajectories.size > 0) {
        const scaleX = canvas.width / video.videoWidth;
        const scaleY = canvas.height / video.videoHeight;

        drawTrajectories({
          ctx,
          jointTrajectories,
          scaleX,
          scaleY,
          smoothEnabled: config.trajectories.smoothTrajectories,
        });
      }

      // Draw poses
      if (currentPoses.length > 0 && config.skeleton.showSkeleton) {
        drawPoses({
          ctx,
          canvas,
          video,
          currentPoses,
          selectedModel: config.model.model,
          showSkeleton: config.skeleton.showConnections,
          showFaceLandmarks: config.skeleton.showFaceLandmarks,
          showTrackingId: config.skeleton.showTrackingId,
        });
      }

      // Draw angles
      if (config.angles.showAngles && selectedPose) {
        const newLabelState = drawAngles({
          ctx,
          canvas,
          video,
          selectedPose,
          selectedModel: config.model.model,
          measuredAngles: config.angles.measuredAngles,
          selectedAngleJoints: config.angles.selectedAngleJoints,
          labelPositionState: labelPositionStateRef.current,
          isPlaying,
          useComplementaryAngles: config.angles.useComplementaryAngles,
        });
        labelPositionStateRef.current = newLabelState;
      }

      // Draw body orientation
      if (config.bodyOrientation.showOrientation && selectedPose) {
        // Calculate scale factors
        let scaleX: number, scaleY: number;
        if (config.model.model === "BlazePose") {
          scaleX = canvas.width / 800;
          scaleY = canvas.height / 450;
        } else {
          scaleX = canvas.width / video.videoWidth;
          scaleY = canvas.height / video.videoHeight;
        }

        drawBodyOrientation(
          ctx,
          selectedPose.keypoints,
          config.model.model === "BlazePose" ? "BlazePose" : "MoveNet",
          scaleX,
          scaleY,
          {
            showEllipse: config.bodyOrientation.showEllipse,
            showDirectionLine: config.bodyOrientation.showDirectionLine,
            showAngleValue: config.bodyOrientation.showAngleValue,
            ellipseColor: config.bodyOrientation.ellipseColor,
            lineColor: config.bodyOrientation.lineColor,
            textColor: config.bodyOrientation.textColor,
            ellipseSize: config.bodyOrientation.ellipseSize,
            lineLength: config.bodyOrientation.lineLength,
            minConfidence: config.bodyOrientation.minConfidence,
          }
        );
      }

      // Draw V3 swing phase indicator
      if (
        config.swingDetectionV3.showSwingOverlay &&
        swingResultV3 &&
        config.protocols.enabledProtocols.includes("swing-detection-v3")
      ) {
        const frameData = swingResultV3.frameData.find(fd => fd.frame === currentFrame);
        if (frameData && frameData.phase !== "neutral") {
          const phaseColors: Record<string, string> = {
            loading: "#6366F1",  // Indigo
            swing: "#F59E0B",    // Amber
            contact: "#EF4444", // Red
            follow: "#10B981",  // Green
            recovery: "#6B7280", // Gray
          };
          
          const color = config.swingDetectionV3.showPhaseColors 
            ? phaseColors[frameData.phase] ?? "#8B5CF6"
            : "#8B5CF6";
          
          // Draw phase label in top-right
          ctx.save();
          ctx.font = "bold 16px Inter, system-ui, sans-serif";
          const phaseLabel = frameData.phase.toUpperCase();
          const metrics = ctx.measureText(phaseLabel);
          const padding = 8;
          const x = canvas.width - metrics.width - padding * 3;
          const y = 40;
          
          // Background
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(x - padding, y - 16, metrics.width + padding * 2, 24, 4);
          ctx.fill();
          
          // Text
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText(phaseLabel, x, y);
          
          // Draw swing score if available
          if (frameData.swingScore !== null) {
            ctx.font = "12px Inter, system-ui, sans-serif";
            const scoreText = `Score: ${frameData.swingScore.toFixed(1)}`;
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.fillText(scoreText, x, y + 18);
          }
          
          ctx.restore();
        }
      }
    }, [
      poseEnabled,
      currentPoses,
      selectedPose,
      config.model.model,
      config.skeleton,
      config.angles,
      config.bodyOrientation,
      config.trajectories,
      config.swingDetectionV3,
      config.protocols.enabledProtocols,
      jointTrajectories,
      isPlaying,
      videoDimensions,
      swingResultV3,
      currentFrame,
    ]);

    // ========================================================================
    // Playback Speed
    // ========================================================================

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      video.playbackRate = config.playback.speed;
    }, [config.playback.speed]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      video.loop = config.playback.loop;
    }, [config.playback.loop]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = config.playback.muted;
    }, [config.playback.muted]);

    // ========================================================================
    // Preprocessing
    // ========================================================================

    const startPreprocessing = useCallback(async () => {
      const video = videoRef.current;
      if (!video || !detectPose || isModelLoading) return;

      setIsPreprocessing(true);
      setPreprocessProgress(0);
      setPreprocessedPoses(new Map());
      preprocessedPosesRef.current = new Map();
      preprocessAbortRef.current = false;

      // Pause video during preprocessing
      if (!video.paused) {
        video.pause();
        setIsPlaying(false);
      }

      const originalTime = video.currentTime;

      try {
        // FIRST: Detect actual video FPS before preprocessing
        let fps: number;
        if (config.preprocessing.targetFPS) {
          // User explicitly set a target FPS
          fps = config.preprocessing.targetFPS;
          detectionLogger.debug(`Using user-specified FPS: ${fps}`);
        } else if (!fpsDetectedRef.current) {
          // Detect actual FPS from video
          detectionLogger.debug("Detecting video FPS before preprocessing...");
          fps = await detectVideoFPSAsync(video);
          fpsDetectedRef.current = true;
          setVideoFPS(fps);
        } else {
          fps = videoFPS;
        }

        const dur = video.duration;
        const total = Math.floor(dur * fps);
        const allPoses = new Map<number, PoseDetectionResult[]>();

        detectionLogger.debug(`Preprocessing ${total} frames at ${fps} FPS (duration: ${dur.toFixed(2)}s)...`);

        for (let frame = 0; frame < total; frame += config.preprocessing.frameSkip) {
          if (preprocessAbortRef.current) {
            detectionLogger.debug("Preprocessing aborted");
            break;
          }

          const targetTime = frame / fps;
          video.currentTime = targetTime;

          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              resolve();
            };
            video.addEventListener("seeked", onSeeked);
          });

          const poses = await detectPose(video);
          allPoses.set(frame, poses);
          
          // Show current pose during preprocessing (real-time feedback)
          if (poses.length > 0) {
            setCurrentPoses(poses);
          }

          const progress = ((frame + 1) / total) * 100;
          setPreprocessProgress(progress);

          // Yield to main thread periodically
          if (frame % 5 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        if (!preprocessAbortRef.current) {
          detectionLogger.debug(`Preprocessing complete: ${allPoses.size} frames at ${fps} FPS`);
          setPreprocessedPoses(allPoses);
          preprocessedPosesRef.current = allPoses;
          setPreprocessingFPS(fps);
          // Ensure FPS is set consistently
          setVideoFPS(fps);
          fpsDetectedRef.current = true;
          callbacksRef.current?.onPreprocessComplete?.(allPoses.size, fps);

          // Restore position and show first frame poses
          video.currentTime = originalTime;
          const frameAtTime = Math.floor(originalTime * fps);
          const posesAtFrame = allPoses.get(frameAtTime) || allPoses.get(0);
          if (posesAtFrame) {
            setCurrentPoses(posesAtFrame);
          }
        } else {
          video.currentTime = originalTime;
        }
      } catch (err) {
        detectionLogger.error("Preprocessing error:", err);
        callbacksRef.current?.onError?.(err instanceof Error ? err.message : "Preprocessing failed");
        const video = videoRef.current;
        if (video) video.currentTime = originalTime;
      } finally {
        setIsPreprocessing(false);
        setPreprocessProgress(0);
      }
    }, [detectPose, isModelLoading, videoFPS, config.preprocessing, detectVideoFPSAsync]);

    const cancelPreprocessing = useCallback(() => {
      preprocessAbortRef.current = true;
    }, []);

    const clearPreprocessing = useCallback(() => {
      setPreprocessedPoses(new Map());
      preprocessedPosesRef.current = new Map();
      setCurrentPoses([]);
      // Don't reset fpsDetectedRef or videoFPS - keep the detected FPS
    }, []);

    // Reset state when video URL changes
    useEffect(() => {
      fpsDetectedRef.current = false;
      setVideoFPS(DEFAULT_VIDEO_FPS);
      setPreprocessedPoses(new Map());
      preprocessedPosesRef.current = new Map();
      setCurrentPoses([]);
      setProtocolEvents([]);
      setIsVideoReadyForDisplay(false); // Hide video until FPS detection completes
      setFpsDetectionMethod('default');
      resetOrientationTracking(); // Reset orientation momentum for new video
      clearSwingResult();
      clearSwingResultV3();
      clearHandednessResult();
      protocolsRunRef.current.clear();
    }, [videoUrl, clearSwingResult, clearSwingResultV3, clearHandednessResult]);

    // Auto-start preprocessing when enabled
    useEffect(() => {
      if (
        poseEnabled &&
        !isModelLoading &&
        !isPreprocessing &&
        preprocessedPoses.size === 0 &&
        isVideoReady &&
        config.preprocessing.allowAutoPreprocess
      ) {
        const timer = setTimeout(() => {
          startPreprocessing();
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [
      poseEnabled,
      isModelLoading,
      isPreprocessing,
      preprocessedPoses.size,
      isVideoReady,
      config.preprocessing.allowAutoPreprocess,
      startPreprocessing,
    ]);

    // ========================================================================
    // Protocol Execution (after preprocessing)
    // ========================================================================

    // Track which protocols have been run to avoid re-running
    const protocolsRunRef = useRef<Set<string>>(new Set());

    // Run enabled protocols after preprocessing completes or when protocols change
    useEffect(() => {
      if (
        usingPreprocessedPoses &&
        preprocessedPoses.size > 0 &&
        !isPreprocessing &&
        !isSwingAnalyzing &&
        !isSwingAnalyzingV3
      ) {
        const swingV1Enabled = config.protocols.enabledProtocols.includes("swing-detection-v1");
        const swingV1Ran = protocolsRunRef.current.has("swing-detection-v1");
        const swingV3Enabled = config.protocols.enabledProtocols.includes("swing-detection-v3");
        const swingV3Ran = protocolsRunRef.current.has("swing-detection-v3");

        // Run swing detection v1 if enabled and not yet run
        if (swingV1Enabled && !swingV1Ran) {
          detectionLogger.info("🔄 Running Swing Detection V1 protocol...");
          protocolsRunRef.current.add("swing-detection-v1");
          detectSwings({ requireOutwardMotion: true });
        }
        
        // Clear swing v1 results if disabled
        if (!swingV1Enabled && swingV1Ran) {
          protocolsRunRef.current.delete("swing-detection-v1");
          clearSwingResult();
        }

        // Run swing detection v3 if enabled and not yet run
        if (swingV3Enabled && !swingV3Ran) {
          detectionLogger.info("🔄 Running Swing Detection V3 protocol (orientation-enhanced)...");
          protocolsRunRef.current.add("swing-detection-v3");
          analyzeSwingsV3();
        }
        
        // Clear swing v3 results if disabled
        if (!swingV3Enabled && swingV3Ran) {
          protocolsRunRef.current.delete("swing-detection-v3");
          clearSwingResultV3();
        }

        // Run handedness detection if enabled and not yet run
        const handednessEnabled = config.protocols.enabledProtocols.includes("handedness-detection");
        const handednessRan = protocolsRunRef.current.has("handedness-detection");

        if (handednessEnabled && !handednessRan && !isHandednessAnalyzing) {
          detectionLogger.info("🔄 Running Handedness Detection protocol...");
          protocolsRunRef.current.add("handedness-detection");
          analyzeHandedness();
        }

        // Clear handedness results if disabled
        if (!handednessEnabled && handednessRan) {
          protocolsRunRef.current.delete("handedness-detection");
          clearHandednessResult();
        }
      }
    }, [
      usingPreprocessedPoses,
      preprocessedPoses.size,
      isPreprocessing,
      isSwingAnalyzing,
      isSwingAnalyzingV3,
      isHandednessAnalyzing,
      config.protocols.enabledProtocols,
      detectSwings,
      clearSwingResult,
      analyzeSwingsV3,
      clearSwingResultV3,
      analyzeHandedness,
      clearHandednessResult,
    ]);

    // Convert swing results to ProtocolEvents and update timeline
    useEffect(() => {
      // Build events from all protocol results based on what's enabled
      const events: ProtocolEvent[] = [];

      // Add swing v1 events if enabled and has results
      if (
        config.protocols.enabledProtocols.includes("swing-detection-v1") &&
        swingResult &&
        swingResult.swings.length > 0
      ) {
        swingResult.swings.forEach((swing, i) => {
          events.push({
            id: `swing-v1-${swing.frame}-${i}`,
            protocolId: "swing-detection-v1" as const,
            type: "swing",
            startFrame: swing.frame,
            endFrame: swing.frame,
            startTime: swing.timestamp,
            endTime: swing.timestamp,
            label: `Swing ${i + 1} (${swing.velocityKmh >= 20 ? `${swing.velocityKmh.toFixed(0)} km/h` : "N/A"})`,
            color: PROTOCOL_EVENT_COLORS["swing-detection-v1"],
            metadata: {
              velocity: swing.velocity,
              velocityKmh: swing.velocityKmh,
              dominantSide: swing.dominantSide,
              symmetry: swing.symmetry,
              confidence: swing.confidence,
            },
          });
        });
      }

      // Add swing v3 events if enabled and has results
      if (
        config.protocols.enabledProtocols.includes("swing-detection-v3") &&
        swingResultV3 &&
        swingResultV3.swings.length > 0
      ) {
        swingResultV3.swings.forEach((swing, i) => {
          // Add main swing event using full clip boundaries
          events.push({
            id: `swing-v3-${swing.frame}-${i}`,
            protocolId: "swing-detection-v3" as const,
            type: "swing",
            startFrame: swing.clipStartFrame,
            endFrame: swing.clipEndFrame,
            startTime: swing.clipStartTime,
            endTime: swing.clipEndTime,
            label: `Swing ${i + 1} (${swing.velocityKmh >= 20 ? `${swing.velocityKmh.toFixed(0)} km/h` : "N/A"}, ${swing.clipDuration.toFixed(1)}s)`,
            color: PROTOCOL_EVENT_COLORS["swing-detection-v3"],
            metadata: {
              swingType: swing.swingType,
              peakVelocity: swing.peakVelocity,
              velocityKmh: swing.velocityKmh,
              orientationAtContact: swing.orientationAtContact,
              rotationRange: swing.rotationRange,
              peakRotationVelocity: swing.peakRotationVelocity,
              dominantSide: swing.dominantSide,
              confidence: swing.confidence,
              swingScore: swing.swingScore,
              loadingStart: swing.loadingStart,
              swingStart: swing.swingStart,
              contactFrame: swing.contactFrame,
              followEnd: swing.followEnd,
              // Loading peak (max coil position)
              loadingPeakFrame: swing.loadingPeakFrame,
              loadingPeakTimestamp: swing.loadingPeakTimestamp,
              loadingPeakOrientation: swing.loadingPeakOrientation,
              // Clip boundaries for analysis export
              clipStartTime: swing.clipStartTime,
              clipEndTime: swing.clipEndTime,
              clipStartFrame: swing.clipStartFrame,
              clipEndFrame: swing.clipEndFrame,
              clipDuration: swing.clipDuration,
            },
          });
          
          // Add loading position event (point event) for non-serve swings
          if (swing.loadingPeakFrame !== null && swing.loadingPeakTimestamp !== null) {
            events.push({
              id: `loading-v3-${swing.frame}-${i}`,
              protocolId: "loading-position" as const,
              type: "loading",
              startFrame: swing.loadingPeakFrame,
              endFrame: swing.loadingPeakFrame,
              startTime: swing.loadingPeakTimestamp,
              endTime: swing.loadingPeakTimestamp,
              label: `Load ${i + 1} (${swing.loadingPeakOrientation?.toFixed(0)}°)`,
              color: "#F59E0B", // Amber color for loading positions
              metadata: {
                swingType: swing.swingType,
                loadingPeakFrame: swing.loadingPeakFrame,
                loadingPeakTimestamp: swing.loadingPeakTimestamp,
                loadingPeakOrientation: swing.loadingPeakOrientation,
                orientationAtContact: swing.orientationAtContact,
                rotationFromLoadingToContact: swing.loadingPeakOrientation !== null 
                  ? swing.orientationAtContact - swing.loadingPeakOrientation 
                  : null,
                parentSwingId: `swing-v3-${swing.frame}-${i}`,
              },
            });
          }
          
          // Add serve preparation event (conditional - only for serves)
          if (swing.swingType === "serve" && swing.trophyFrame !== null && swing.trophyTimestamp !== null) {
            events.push({
              id: `prep-v3-${swing.frame}-${i}`,
              protocolId: "serve-preparation" as const,
              type: "preparation",
              startFrame: swing.trophyFrame,
              endFrame: swing.trophyFrame,
              startTime: swing.trophyTimestamp,
              endTime: swing.trophyTimestamp,
              label: `Prep ${i + 1} (${swing.trophyArmHeight?.toFixed(1)}x)`,
              color: "#F59E0B", // Amber color for preparation
              metadata: {
                swingType: swing.swingType,
                preparationFrame: swing.trophyFrame,
                preparationTimestamp: swing.trophyTimestamp,
                armHeight: swing.trophyArmHeight,
                contactFrame: swing.contactFrame,
                parentSwingId: `swing-v3-${swing.frame}-${i}`,
              },
            });
          }
          
          // Add serve contact point event (conditional - only for serves)
          if (swing.swingType === "serve" && swing.contactPointFrame !== null && swing.contactPointTimestamp !== null) {
            events.push({
              id: `contact-v3-${swing.frame}-${i}`,
              protocolId: "tennis-contact-point" as const,
              type: "contact",
              startFrame: swing.contactPointFrame,
              endFrame: swing.contactPointFrame,
              startTime: swing.contactPointTimestamp,
              endTime: swing.contactPointTimestamp,
              label: `Contact ${i + 1} (${swing.contactPointHeight?.toFixed(1)}x)`,
              color: "#FFE66D", // Yellow/gold color for contact point
              metadata: {
                swingType: swing.swingType,
                contactPointFrame: swing.contactPointFrame,
                contactPointTimestamp: swing.contactPointTimestamp,
                contactPointHeight: swing.contactPointHeight,
                parentSwingId: `swing-v3-${swing.frame}-${i}`,
              },
            });
          }
          
          // Add serve follow-through event (conditional - only for serves)
          if (swing.swingType === "serve" && swing.landingFrame !== null && swing.landingTimestamp !== null) {
            events.push({
              id: `followthrough-v3-${swing.frame}-${i}`,
              protocolId: "serve-follow-through" as const,
              type: "follow-through",
              startFrame: swing.landingFrame,
              endFrame: swing.landingFrame,
              startTime: swing.landingTimestamp,
              endTime: swing.landingTimestamp,
              label: `Follow ${i + 1}`,
              color: "#95E1D3", // Mint/teal color for follow-through
              metadata: {
                swingType: swing.swingType,
                followThroughFrame: swing.landingFrame,
                followThroughTimestamp: swing.landingTimestamp,
                parentSwingId: `swing-v3-${swing.frame}-${i}`,
              },
            });
          }
        });
      }

      // Update events state and notify callback
      setProtocolEvents(events);
      callbacksRef.current?.onProtocolEvents?.(events);
      
      if (config.protocols.logExecution && events.length > 0) {
        detectionLogger.info(`📊 Protocol events updated: ${events.length} total events`);
      }
    }, [swingResult, swingResultV3, config.protocols.enabledProtocols, config.protocols.logExecution, preprocessingFPS]);

    // Notify when handedness is detected
    useEffect(() => {
      if (handednessResult) {
        callbacksRef.current?.onHandednessDetected?.(
          handednessResult.dominantHand,
          handednessResult.confidence
        );
        if (config.protocols.logExecution) {
          detectionLogger.info(
            `🖐️ Handedness detected: ${handednessResult.dominantHand}-handed (${(handednessResult.confidence * 100).toFixed(0)}% confidence)`
          );
        }
      }
    }, [handednessResult, config.protocols.logExecution]);

    // Clear protocol events when preprocessed poses are cleared
    useEffect(() => {
      if (preprocessedPoses.size === 0) {
        setProtocolEvents([]);
        clearSwingResult();
        clearSwingResultV3();
        clearHandednessResult();
        protocolsRunRef.current.clear();
      }
    }, [preprocessedPoses.size, clearSwingResult, clearSwingResultV3, clearHandednessResult]);

    // ========================================================================
    // Imperative Handle (ViewerActions)
    // ========================================================================

    useImperativeHandle(ref, () => ({
      play: () => {
        const video = videoRef.current;
        if (video) {
          video.play();
        }
      },
      pause: () => {
        const video = videoRef.current;
        if (video) {
          video.pause();
        }
      },
      togglePlay: () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      },
      seekTo: async (time: number) => {
        const video = videoRef.current;
        if (!video) return;
        
        const clampedTime = Math.max(0, Math.min(time, video.duration || 0));
        video.currentTime = clampedTime;
        
        // Manually update state and call callback
        setCurrentTime(clampedTime);
        const newFrame = Math.floor(clampedTime * videoFPS);
        callbacksRef.current?.onTimeUpdate?.(clampedTime, newFrame);

        // Get pose for new frame from preprocessed data
        const lookupFPS = usingPreprocessedPoses ? preprocessingFPS : videoFPS;
        const poseFrame = Math.floor(clampedTime * lookupFPS);
        if (usingPreprocessedPoses && preprocessedPoses.has(poseFrame)) {
          setCurrentPoses(preprocessedPoses.get(poseFrame) || []);
        } else if (detectPose && poseEnabled && video) {
          try {
            const poses = await detectPose(video);
            setCurrentPoses(poses);
          } catch (err) {
            detectionLogger.error("Error detecting pose on seek:", err);
          }
        }
      },
      seekToFrame: async (frame: number) => {
        const video = videoRef.current;
        if (!video) return;
        
        const newTime = frame / videoFPS;
        const clampedTime = Math.max(0, Math.min(newTime, video.duration || 0));
        video.currentTime = clampedTime;
        
        if (!video.paused) {
          video.pause();
          setIsPlaying(false);
        }
        
        // Manually update state and call callback
        setCurrentTime(clampedTime);
        callbacksRef.current?.onTimeUpdate?.(clampedTime, frame);

        // Get pose for new frame from preprocessed data
        const lookupFPS = usingPreprocessedPoses ? preprocessingFPS : videoFPS;
        const poseFrame = Math.floor(clampedTime * lookupFPS);
        if (usingPreprocessedPoses && preprocessedPoses.has(poseFrame)) {
          setCurrentPoses(preprocessedPoses.get(poseFrame) || []);
        } else if (detectPose && poseEnabled && video) {
          try {
            const poses = await detectPose(video);
            setCurrentPoses(poses);
          } catch (err) {
            detectionLogger.error("Error detecting pose on seekToFrame:", err);
          }
        }
      },
      stepForward: async () => {
        const video = videoRef.current;
        if (!video) return;
        if (!video.paused) {
          video.pause();
          setIsPlaying(false);
        }
        const frameDuration = 1 / videoFPS;
        const newTime = Math.min(video.currentTime + frameDuration, video.duration || 0);
        video.currentTime = newTime;
        
        // Manually update state and call callback (timeupdate doesn't always fire on seek)
        setCurrentTime(newTime);
        const newFrame = Math.floor(newTime * videoFPS);
        callbacksRef.current?.onTimeUpdate?.(newTime, newFrame);

        // Get pose for new frame
        const lookupFPS = usingPreprocessedPoses ? preprocessingFPS : videoFPS;
        const poseFrame = Math.floor(newTime * lookupFPS);
        if (usingPreprocessedPoses && preprocessedPoses.has(poseFrame)) {
          setCurrentPoses(preprocessedPoses.get(poseFrame) || []);
        } else if (detectPose && poseEnabled && video) {
          try {
            const poses = await detectPose(video);
            setCurrentPoses(poses);
          } catch (err) {
            detectionLogger.error("Error detecting pose:", err);
          }
        }
      },
      stepBackward: async () => {
        const video = videoRef.current;
        if (!video) return;
        if (!video.paused) {
          video.pause();
          setIsPlaying(false);
        }
        const frameDuration = 1 / videoFPS;
        const newTime = Math.max(video.currentTime - frameDuration, 0);
        video.currentTime = newTime;
        
        // Manually update state and call callback (timeupdate doesn't always fire on seek)
        setCurrentTime(newTime);
        const newFrame = Math.floor(newTime * videoFPS);
        callbacksRef.current?.onTimeUpdate?.(newTime, newFrame);

        // Get pose for new frame
        const lookupFPS = usingPreprocessedPoses ? preprocessingFPS : videoFPS;
        const poseFrame = Math.floor(newTime * lookupFPS);
        if (usingPreprocessedPoses && preprocessedPoses.has(poseFrame)) {
          setCurrentPoses(preprocessedPoses.get(poseFrame) || []);
        } else if (detectPose && poseEnabled && video) {
          try {
            const poses = await detectPose(video);
            setCurrentPoses(poses);
          } catch (err) {
            detectionLogger.error("Error detecting pose:", err);
          }
        }
      },
      startPreprocessing,
      cancelPreprocessing,
      clearPreprocessing,
      captureFrame: async (): Promise<Blob | null> => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return null;

        return new Promise((resolve) => {
          const composite = document.createElement("canvas");
          composite.width = video.videoWidth;
          composite.height = video.videoHeight;
          const ctx = composite.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(video, 0, 0);
          ctx.drawImage(canvas, 0, 0, video.videoWidth, video.videoHeight);
          composite.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
        });
      },
      getCurrentPoses: () => currentPoses,
      setSelectedPose: (index: number) => setSelectedPoseIndex(index),
      rerunProtocols: () => {
        // Clear all protocol results and run refs to trigger re-execution
        protocolsRunRef.current.clear();
        clearSwingResult();
        clearSwingResultV3();
        clearHandednessResult();
        setProtocolEvents([]);
        detectionLogger.info("🔄 Protocols cleared - will re-run on next cycle");
      },
      getPreprocessedPoses: () => preprocessedPosesRef.current,
      setPreprocessedPoses: (poses: Map<number, PoseDetectionResult[]>, fps: number) => {
        setPreprocessedPoses(poses);
        preprocessedPosesRef.current = poses;
        setPreprocessingFPS(fps);
        // Also set the video FPS and mark as ready (bypassing FPS detection)
        setVideoFPS(fps);
        fpsDetectedRef.current = true;
        setIsVideoReadyForDisplay(true);
        setFpsDetectionMethod('metadata'); // Indicate FPS came from stored data
        callbacksRef.current?.onFPSDetected?.(fps, 'metadata');
        detectionLogger.info(`📥 Loaded ${poses.size} frames of pose data from server (${fps} FPS)`);
        // Notify parent that preprocessing is "complete" (loaded from server)
        callbacksRef.current?.onPreprocessComplete?.(poses.size, fps);
      },
    }), [
      videoFPS,
      usingPreprocessedPoses,
      preprocessingFPS,
      preprocessedPoses,
      detectPose,
      poseEnabled,
      currentPoses,
      startPreprocessing,
      cancelPreprocessing,
      clearPreprocessing,
      clearSwingResult,
      clearSwingResultV3,
      clearHandednessResult,
    ]);

    // ========================================================================
    // Error Reporting
    // ========================================================================

    useEffect(() => {
      if (modelError) {
        callbacksRef.current?.onError?.(modelError);
      }
    }, [modelError]);

    // ========================================================================
    // Render
    // ========================================================================

    return (
      <Box
        ref={containerRef}
        className={className}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          backgroundColor: "var(--gray-1)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          ...style,
        }}
      >
        {/* Tab Navigation */}
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as "swings" | "data-analysis")}
        />

        {/* Swings Tab Content */}
        <Box
          style={{
            position: "relative",
            flex: 1,
            display: activeTab === "swings" ? "block" : "none",
            minHeight: 0, // Allow flex child to shrink
          }}
        >
          {/* Native HTML5 Video Player */}
          <video
          ref={videoRef}
          src={videoUrl}
          crossOrigin={shouldUseCrossOrigin(videoUrl) ? "anonymous" : undefined}
          controls
          playsInline
          muted={config.playback.muted}
          loop={config.playback.loop}
          autoPlay={config.playback.autoPlay}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={(e) => handleError(e)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />

        {/* Canvas Overlay - hidden until video is ready for display */}
        <canvas
          ref={canvasRef}
          width={videoDimensions.width}
          height={videoDimensions.height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
            zIndex: 10,
            // Hide canvas until video is ready for display
            opacity: isVideoReadyForDisplay ? 1 : 0,
          }}
        />

        {/* Loading Overlay - solid background before video is ready */}
        {poseEnabled && !isVideoReadyForDisplay && (
          <Flex
            align="center"
            justify="center"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "var(--gray-1)",
              zIndex: 20,
              pointerEvents: "none", // Allow clicks through to video controls
            }}
          >
            <Flex direction="column" align="center" gap="3">
              {/* Bouncing Tennis Ball */}
              <Box style={{ position: "relative", width: "80px", height: "80px" }}>
                <Box
                  style={{
                    position: "absolute",
                    width: "40px",
                    height: "40px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    borderRadius: "50%",
                    background: "linear-gradient(160deg, #d4e34a 0%, #c5d43e 30%, #a8bc32 60%, #8fa328 100%)",
                    boxShadow: "inset -3px -3px 6px rgba(0, 0, 0, 0.2), inset 3px 3px 6px rgba(255, 255, 255, 0.25), 0 8px 32px rgba(122, 219, 143, 0.4)",
                    animation: "taskLoaderBallBounce 1.1s linear infinite",
                    overflow: "hidden",
                  }}
                >
                  {/* Ball shine */}
                  <Box
                    style={{
                      position: "absolute",
                      inset: "3px",
                      borderRadius: "50%",
                      background: "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.4), transparent 45%)",
                    }}
                  />
                  {/* Tennis ball seam - top curve */}
                  <Box
                    style={{
                      position: "absolute",
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                      border: "none",
                      borderTop: "2px solid rgba(255, 255, 255, 0.9)",
                      top: "-8px",
                      left: "50%",
                      transform: "translateX(-50%) rotate(-30deg)",
                    }}
                  />
                  {/* Tennis ball seam - bottom curve */}
                  <Box
                    style={{
                      position: "absolute",
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                      border: "none",
                      borderBottom: "2px solid rgba(255, 255, 255, 0.9)",
                      bottom: "-8px",
                      left: "50%",
                      transform: "translateX(-50%) rotate(-30deg)",
                    }}
                  />
                </Box>
                {/* Ball Shadow */}
                <Box
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "32px",
                    height: "6px",
                    background: "radial-gradient(ellipse, rgba(0, 0, 0, 0.3) 0%, transparent 70%)",
                    borderRadius: "50%",
                    animation: "taskLoaderShadowPulse 1.1s linear infinite",
                  }}
                />
              </Box>
              <Text size="2" color="gray" style={{ textAlign: "center" }}>
                {isModelLoading ? "Loading pose model..." : "Detecting video framerate..."}
              </Text>
            </Flex>
          </Flex>
        )}

        {/* Preprocessing Overlay - semi-transparent to show video */}
        {poseEnabled && isVideoReadyForDisplay && isPreprocessing && config.preprocessing.showProgress && (
          <Box
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "color-mix(in srgb, var(--gray-1) 60%, transparent)",
              zIndex: 20,
              pointerEvents: "none",
            }}
          >
            {/* Loading indicator positioned in top quarter */}
            <Flex 
              direction="column" 
              align="center" 
              gap="3" 
              style={{ 
                position: "absolute",
                top: "12.5%", // Center of first quarter (25% / 2)
                left: "50%",
                transform: "translateX(-50%)",
                width: "80%", 
                maxWidth: "300px",
              }}
            >
              <Text size="2" weight="medium" color="gray">
                Processing video frames...
              </Text>
              <Box
                style={{
                  width: "100%",
                  height: "8px",
                  backgroundColor: "var(--gray-a4)",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <Box
                  style={{
                    width: `${preprocessProgress}%`,
                    height: "100%",
                    backgroundColor: "var(--accent-9)",
                    transition: "width 0.1s",
                  }}
                />
              </Box>
              <Text size="1" color="gray">
                {preprocessProgress.toFixed(0)}%
              </Text>
            </Flex>
          </Box>
        )}

        {/* Debug Overlay - hidden in lite mode */}
        {!lite && config.debug.showDebugOverlay && (
          <Flex
            direction="column"
            gap="1"
            style={{
              position: "absolute",
              top: "8px",
              left: "8px",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              padding: "8px 12px",
              borderRadius: "6px",
              zIndex: 25,
            }}
          >
            {config.debug.showFPS && (
              <Text size="1" style={{ color: "#7ADB8F", fontFamily: "monospace" }}>
                FPS: {videoFPS}
              </Text>
            )}
            {config.debug.showPreprocessingStats && (
              <>
                <Text size="1" style={{ color: "white", fontFamily: "monospace" }}>
                  Frame: {currentFrame} / {totalFrames}
                </Text>
                {usingPreprocessedPoses && (
                  <Text size="1" style={{ color: "#4ECDC4", fontFamily: "monospace" }}>
                    Preprocessed: {preprocessedPoses.size} frames
                  </Text>
                )}
              </>
            )}
            {config.debug.showVideoMetadata && (
              <>
                <Text size="1" style={{ color: "white", fontFamily: "monospace" }}>
                  Size: {videoDimensions.width}×{videoDimensions.height}
                </Text>
                <Text size="1" style={{ color: "white", fontFamily: "monospace" }}>
                  Duration: {duration.toFixed(2)}s
                </Text>
              </>
            )}
            {currentPoses.length > 0 && (
              <Text size="1" style={{ color: "#FFE66D", fontFamily: "monospace" }}>
                Poses: {currentPoses.length}
              </Text>
            )}
          </Flex>
        )}

        {/* Error Display - more compact in lite mode */}
        {modelError && (
          <Flex
            align="center"
            justify="center"
            style={{
              position: "absolute",
              bottom: lite ? "4px" : "8px",
              left: lite ? "4px" : "8px",
              right: lite ? "4px" : "8px",
              backgroundColor: "rgba(220, 38, 38, 0.9)",
              padding: lite ? "4px 8px" : "8px 12px",
              borderRadius: "6px",
              zIndex: 25,
            }}
          >
            <Text size="1" style={{ color: "white" }}>
              {modelError}
            </Text>
          </Flex>
        )}
        </Box>

        {/* Data Analysis Tab Content */}
        {activeTab === "data-analysis" && (
          <SwingCurveView
            swingResult={swingResultV3}
            videoFPS={usingPreprocessedPoses ? preprocessingFPS : videoFPS}
            currentFrame={currentFrame}
            totalFrames={totalFrames}
            developerMode={developerMode}
            selectedMetric={selectedMetric}
            onMetricChange={setSelectedMetric}
            selectedWrist={selectedWrist}
            onWristChange={setSelectedWrist}
            selectedKnee={selectedKnee}
            onKneeChange={setSelectedKnee}
            selectedAngleType={selectedAngleType}
            onAngleTypeChange={setSelectedAngleType}
            selectedVelocityBodyPart={selectedVelocityBodyPart}
            onVelocityBodyPartChange={setSelectedVelocityBodyPart}
            selectedOrientationType={selectedOrientationType}
            onOrientationTypeChange={setSelectedOrientationType}
            confidenceThreshold={confidenceThreshold}
            onConfidenceThresholdChange={onConfidenceThresholdChange}
            onSeekToFrame={(frame) => {
              const video = videoRef.current;
              if (!video) return;
              const time = frame / (usingPreprocessedPoses ? preprocessingFPS : videoFPS);
              video.currentTime = Math.max(0, Math.min(time, video.duration || 0));
              setCurrentTime(time);
              // Get pose for new frame from preprocessed data
              if (usingPreprocessedPoses && preprocessedPoses.has(frame)) {
                setCurrentPoses(preprocessedPoses.get(frame) || []);
              }
            }}
            isAnalyzing={isSwingAnalyzingV3}
            style={{ flex: 1, minHeight: 0 }}
          />
        )}
      </Box>
    );
  }
);

export default VideoPoseViewerV2;

