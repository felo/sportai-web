"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as React from "react";
import { Box, Flex, Button, Text, Switch, Spinner, Select, Grid, Tooltip, DropdownMenu } from "@radix-ui/themes";
import { PlayIcon, PauseIcon, ResetIcon, ChevronLeftIcon, ChevronRightIcon, MagicWandIcon, RulerSquareIcon, CrossCircledIcon, ChevronDownIcon, ChevronUpIcon, EnterFullScreenIcon, ExitFullScreenIcon, CameraIcon, RocketIcon, Crosshair2Icon, ArrowDownIcon } from "@radix-ui/react-icons";
import { usePoseDetection, type SupportedModel } from "@/hooks/usePoseDetection";
import { useObjectDetection } from "@/hooks/useObjectDetection";
import { useProjectileDetection } from "@/hooks/useProjectileDetection";
import { useFrameAnalysis } from "@/hooks/useFrameAnalysis";
import type { CourtCorners } from "@/types/frame-analysis";
import { drawPose, drawAngle, calculateAngle, POSE_KEYPOINTS, BLAZEPOSE_CONNECTIONS_2D } from "@/types/pose";
import { drawDetectedObjects } from "@/types/object-detection";
import { drawProjectile } from "@/types/projectile-detection";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import type { ObjectDetectionResult } from "@/types/detection";
import type { ProjectileDetectionResult } from "@/types/detection";
import { Pose3DViewer } from "../Pose3DViewer";
import buttonStyles from "@/styles/buttons.module.css";
import selectStyles from "@/styles/selects.module.css";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useVideoDimensions, useVideoFPS, useVelocityTracking, useJointTrajectories, useDetectionSettings, useTrophyDetection, useContactPointDetection, useLandingDetection } from "./hooks";
import { VelocityDisplay, CollapsibleSection, PlaybackControls, DescriptiveSelect, PoseSettingsPanel, ObjectDetectionSettingsPanel, ProjectileDetectionSettingsPanel, FrameAnalysisSettingsPanel } from "./components";
import { LABEL_POSITION_STABILITY_FRAMES, CONFIDENCE_PRESETS, RESOLUTION_PRESETS, PLAYBACK_SPEEDS, DEFAULT_VIDEO_FPS } from "./constants";

interface VideoPoseViewerProps {
  videoUrl: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  showControls?: boolean;
  initialModel?: SupportedModel;
  initialShowSkeleton?: boolean;
  initialShowAngles?: boolean;
  initialMeasuredAngles?: number[][];
  initialPlaybackSpeed?: number;
  initialUseAccurateMode?: boolean;
  initialConfidenceMode?: "standard" | "high" | "low";
  initialResolutionMode?: "fast" | "balanced" | "accurate";
  initialShowTrackingId?: boolean;
  initialShowTrajectories?: boolean;
  initialSelectedJoints?: number[];
  initialShowVelocity?: boolean;
  initialVelocityWrist?: "left" | "right";
  initialPoseEnabled?: boolean;
  theatreMode?: boolean;
  hideTheatreToggle?: boolean;
  // Controlled pose enabled state - when provided, component operates in controlled mode
  poseEnabled?: boolean;
  onPoseEnabledChange?: (enabled: boolean) => void;
  // Callback when video metadata is loaded - provides actual video dimensions
  onVideoMetadataLoaded?: (width: number, height: number) => void;
  // Compact mode - hides button text, used when video is floating/docked
  compactMode?: boolean;
}

// Helper to determine if crossOrigin should be used for a URL
// crossOrigin is needed for external URLs but can cause issues with blob/data URLs
function shouldUseCrossOrigin(url: string): boolean {
  // Blob URLs and data URLs don't need crossOrigin
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    return false;
  }
  // For http/https URLs, check if same origin
  if (typeof window !== "undefined" && (url.startsWith("http://") || url.startsWith("https://"))) {
    try {
      const videoOrigin = new URL(url).origin;
      const currentOrigin = window.location.origin;
      return videoOrigin !== currentOrigin;
    } catch {
      return true; // Default to using crossOrigin if URL parsing fails
    }
  }
  // For relative URLs, same origin - no crossOrigin needed
  return false;
}

export function VideoPoseViewer({
  videoUrl,
  width = 640,
  height = 480,
  autoPlay = false,
  showControls = true,
  initialModel = "MoveNet",
  initialShowSkeleton = true,
  initialShowAngles = true,
  initialMeasuredAngles = [[6, 8, 10], [12, 14, 16]], // Right elbow and right knee angles by default
  initialPlaybackSpeed = 1.0,
  initialUseAccurateMode = false,
  initialConfidenceMode = "standard",
  initialResolutionMode = "balanced",
  initialShowTrackingId = false,
  initialShowTrajectories = false,
  initialSelectedJoints = [9, 10],
  initialShowVelocity = false,
  initialVelocityWrist = "right",
  initialPoseEnabled = false, // Auto-enable AI overlay - preprocessing starts automatically
  theatreMode = true,
  hideTheatreToggle = false,
  // Controlled mode props
  poseEnabled: controlledPoseEnabled,
  onPoseEnabledChange,
  onVideoMetadataLoaded,
  compactMode = false,
}: VideoPoseViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoMetadataLoaded, setIsVideoMetadataLoaded] = useState(false);
  
  // Pose enabled state - supports both controlled and uncontrolled modes
  const isControlled = controlledPoseEnabled !== undefined;
  const [internalPoseEnabled, setInternalPoseEnabled] = useState(initialPoseEnabled);
  const isPoseEnabled = isControlled ? controlledPoseEnabled : internalPoseEnabled;
  
  // Unified setter that handles both modes
  const setIsPoseEnabled = useCallback((enabled: boolean) => {
    if (!isControlled) {
      setInternalPoseEnabled(enabled);
    }
    onPoseEnabledChange?.(enabled);
  }, [isControlled, onPoseEnabledChange]);
  const [selectedModel, setSelectedModel] = useState<SupportedModel>(initialModel);
  const [blazePoseModelType, setBlazePoseModelType] = useState<"lite" | "full" | "heavy">("full");
  const [showSkeleton, setShowSkeleton] = useState(initialShowSkeleton);
  const [useAccurateMode, setUseAccurateMode] = useState(initialUseAccurateMode);
  const [enableSmoothing, setEnableSmoothing] = useState(true);
  const [confidenceMode, setConfidenceMode] = useState<"standard" | "high" | "low">(initialConfidenceMode);
  const [resolutionMode, setResolutionMode] = useState<"fast" | "balanced" | "accurate">(initialResolutionMode);
  const [currentPoses, setCurrentPoses] = useState<PoseDetectionResult[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showTrajectories, setShowTrajectories] = useState(initialShowTrajectories);
  const [showTrackingId, setShowTrackingId] = useState(initialShowTrackingId);
  const [smoothTrajectories, setSmoothTrajectories] = useState(true);
  const [showFaceLandmarks, setShowFaceLandmarks] = useState(false);
  const [selectedJoints, setSelectedJoints] = useState<number[]>(initialSelectedJoints); // Default: wrists
  const [playbackSpeed, setPlaybackSpeed] = useState(initialPlaybackSpeed);
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preprocessProgress, setPreprocessProgress] = useState(0);
  const [preprocessedPoses, setPreprocessedPoses] = useState<Map<number, PoseDetectionResult[]>>(new Map());
  const [preprocessingFPS, setPreprocessingFPS] = useState<number>(30); // FPS used during preprocessing
  const [usePreprocessing, setUsePreprocessing] = useState(false);
  
  // Background preprocessing state (runs while live detection is active)
  const [isBackgroundPreprocessing, setIsBackgroundPreprocessing] = useState(false);
  const [backgroundPreprocessProgress, setBackgroundPreprocessProgress] = useState(0);
  const backgroundPreprocessAbortRef = useRef<boolean>(false);
  // backgroundVideoRef removed - now using main video for preprocessing
  const [maxPoses, setMaxPoses] = useState(1); // Default to 1 player
  const [selectedPoseIndex, setSelectedPoseIndex] = useState(0); // Which person to analyze
  
  // Angle Measurement State
  const [showAngles, setShowAngles] = useState(initialShowAngles);
  const [enableAngleClicking, setEnableAngleClicking] = useState(false);
  const [selectedAngleJoints, setSelectedAngleJoints] = useState<number[]>([]);
  const [measuredAngles, setMeasuredAngles] = useState<Array<[number, number, number]>>(initialMeasuredAngles as [number, number, number][]);
  const [angleMenuOpen, setAngleMenuOpen] = useState(false);

  // Velocity Measurement State
  const [showVelocity, setShowVelocity] = useState(initialShowVelocity);
  const [velocityWrist, setVelocityWrist] = useState<'left' | 'right'>(initialVelocityWrist);

  // Object Detection State (YOLOv8n)
  const [isObjectDetectionEnabled, setIsObjectDetectionEnabled] = useState(false);
  const [selectedObjectModel, setSelectedObjectModel] = useState<"YOLOv8n" | "YOLOv8s" | "YOLOv8m">("YOLOv8n");
  const [objectConfidenceThreshold, setObjectConfidenceThreshold] = useState(0.5);
  const [objectIoUThreshold, setObjectIoUThreshold] = useState(0.45);
  const [sportFilter, setSportFilter] = useState<"all" | "tennis" | "pickleball" | "basketball" | "baseball" | "skating">("pickleball"); // Default to pickleball (person + ball)
  const [showObjectLabels, setShowObjectLabels] = useState(true);
  const [enableObjectTracking, setEnableObjectTracking] = useState(true);
  const [currentObjects, setCurrentObjects] = useState<any[]>([]);

  // Projectile Detection State (TrackNet)
  const [isProjectileDetectionEnabled, setIsProjectileDetectionEnabled] = useState(false);
  const [selectedProjectileModel, setSelectedProjectileModel] = useState<"TrackNet" | "TrackNetV2">("TrackNet");
  const [projectileConfidenceThreshold, setProjectileConfidenceThreshold] = useState(0.5);
  const [showProjectileTrajectory, setShowProjectileTrajectory] = useState(true);
  const [showProjectilePrediction, setShowProjectilePrediction] = useState(false);
  const [currentProjectile, setCurrentProjectile] = useState<any | null>(null);

  // Frame Analysis State (Gemini)
  const [showCourtOverlay, setShowCourtOverlay] = useState(true);
  
  // Image Insight State
  const [isImageInsightLoading, setIsImageInsightLoading] = useState(false);
  const [imageInsightError, setImageInsightError] = useState<string | null>(null);

  // Label stability - prevents jitter by locking position for N frames after a change
  const labelPositionStateRef = useRef<Map<string, { multiplier: number; verticalOffset: number; framesSinceChange: number }>>(new Map());

  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  const [localTheatreMode, setLocalTheatreMode] = useState(theatreMode);
  const [isShortScreenView, setIsShortScreenView] = useState(false);
  const isMobile = useIsMobile();
  
  // Responsive max height for short screens
  const [baseMaxHeight, setBaseMaxHeight] = useState("720px");
  
  useEffect(() => {
    const updateMaxHeight = () => {
      const isShortScreen = window.innerHeight <= 768;
      setIsShortScreenView(isShortScreen);
      setBaseMaxHeight(isShortScreen ? `${Math.min(window.innerHeight * 0.35, 400)}px` : "720px");
    };
    
    updateMaxHeight();
    window.addEventListener("resize", updateMaxHeight);
    return () => window.removeEventListener("resize", updateMaxHeight);
  }, []);

  // Use custom hooks for video dimensions and FPS
  const { dimensions, isPortraitVideo } = useVideoDimensions({
    videoRef,
    containerRef,
    initialWidth: width,
    initialHeight: height,
    playbackSpeed,
  });
  const videoFPS = useVideoFPS(videoRef);
  
  // Portrait videos get a shorter max height by default to avoid taking too much vertical space
  // In compact mode (floating), let the container control the size instead
  const videoMaxHeight = compactMode ? "100%" : (isPortraitVideo ? "min(450px, 50vh)" : baseMaxHeight);

  // Use velocity tracking hook
  const { 
    velocityStatsLeft, 
    velocityStatsRight, 
    hasLeftElbow, 
    hasRightElbow 
  } = useVelocityTracking({
    currentPoses,
    measuredAngles,
    selectedModel,
    currentFrame,
    currentTime: videoRef.current?.currentTime || 0,
    enabled: showVelocity,
  });

  // Use joint trajectories hook
  const { jointTrajectories, clearTrajectories } = useJointTrajectories({
    currentPoses,
    showTrajectories,
    selectedJoints,
    currentFrame,
    dimensions,
  });

  // Use frame analysis hook (Gemini)
  // Pass sport filter to improve detection accuracy
  const {
    analyzeFrame,
    analyzeFrameMultiple,
    isAnalyzing: isFrameAnalyzing,
    analyzingTypes,
    courtResult,
    cameraAngleResult,
    error: frameAnalysisError,
    clearResults: clearFrameAnalysisResults,
  } = useFrameAnalysis({
    sport: sportFilter !== "all" ? sportFilter : undefined,
  });

  // Trophy, Contact Point, and Landing Detection hooks
  const {
    isAnalyzing: isTrophyAnalyzing,
    result: trophyResult,
    error: trophyError,
    detectTrophyPosition,
    clearResult: clearTrophyResult,
  } = useTrophyDetection({
    preprocessedPoses,
    selectedModel,
    videoFPS,
    selectedPoseIndex,
  });

  const {
    isAnalyzing: isContactAnalyzing,
    result: contactResult,
    error: contactError,
    detectContactPoint,
    clearResult: clearContactResult,
  } = useContactPointDetection({
    preprocessedPoses,
    selectedModel,
    videoFPS,
    selectedPoseIndex,
  });

  const {
    isAnalyzing: isLandingAnalyzing,
    result: landingResult,
    error: landingError,
    detectLanding,
    clearResult: clearLandingResult,
  } = useLandingDetection({
    preprocessedPoses,
    selectedModel,
    videoFPS,
    selectedPoseIndex,
  });

  // Frame analysis handlers
  const handleAnalyzeCourt = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    await analyzeFrame(video, "court");
  }, [analyzeFrame]);

  const handleAnalyzeCameraAngle = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    await analyzeFrame(video, "camera-angle");
  }, [analyzeFrame]);

  const handleAnalyzeBoth = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    await analyzeFrameMultiple(video, ["court", "camera-angle"]);
  }, [analyzeFrameMultiple]);

  // Trophy Position Detection handler
  const handleDetectTrophy = useCallback(async () => {
    const result = await detectTrophyPosition("auto");
    if (result && videoRef.current) {
      // Seek to trophy frame
      videoRef.current.currentTime = result.trophyTimestamp;
    }
  }, [detectTrophyPosition]);

  // Contact Point Detection handler
  const handleDetectContact = useCallback(async () => {
    const result = await detectContactPoint("auto");
    if (result && videoRef.current) {
      // Seek to contact frame
      videoRef.current.currentTime = result.contactTimestamp;
    }
  }, [detectContactPoint]);

  // Landing Detection handler
  const handleDetectLanding = useCallback(async () => {
    const result = await detectLanding();
    if (result && videoRef.current) {
      // Seek to landing frame
      videoRef.current.currentTime = result.landingTimestamp;
    }
  }, [detectLanding]);

  // All 4 angle presets: both elbows and both knees
  const ALL_ANGLE_PRESETS: Array<[number, number, number]> = [
    [5, 7, 9],   // Left elbow (shoulder-elbow-wrist)
    [6, 8, 10],  // Right elbow (shoulder-elbow-wrist)
    [11, 13, 15], // Left knee (hip-knee-ankle)
    [12, 14, 16], // Right knee (hip-knee-ankle)
  ];

  // Capture current frame with pose overlay and all angles drawn
  const captureAnnotatedFrame = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const poseCanvas = canvasRef.current;
      if (!video || !poseCanvas) {
        resolve(null);
        return;
      }

      // Create a new canvas to composite video + overlay
      const compositeCanvas = document.createElement("canvas");
      compositeCanvas.width = video.videoWidth;
      compositeCanvas.height = video.videoHeight;
      const ctx = compositeCanvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }

      // Draw the video frame first
      ctx.drawImage(video, 0, 0);

      // Draw the pose overlay on top (from the existing canvas)
      // Scale the pose canvas to match video dimensions
      ctx.drawImage(poseCanvas, 0, 0, video.videoWidth, video.videoHeight);

      // Convert to blob
      compositeCanvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        0.9
      );
    });
  }, []);

  useEffect(() => {
    // Dynamic import to avoid SSR issues with storage utility
    import("@/utils/storage").then(({ getDeveloperMode, getTheatreMode }) => {
      setDeveloperMode(getDeveloperMode());
      setLocalTheatreMode(getTheatreMode());
    });

    const handleDeveloperModeChange = () => {
      import("@/utils/storage").then(({ getDeveloperMode }) => {
        setDeveloperMode(getDeveloperMode());
      });
    };

    const handleTheatreModeChange = () => {
      import("@/utils/storage").then(({ getTheatreMode }) => {
        setLocalTheatreMode(getTheatreMode());
      });
    };

    window.addEventListener("developer-mode-change", handleDeveloperModeChange);
    window.addEventListener("theatre-mode-change", handleTheatreModeChange);
    return () => {
      window.removeEventListener("developer-mode-change", handleDeveloperModeChange);
      window.removeEventListener("theatre-mode-change", handleTheatreModeChange);
    };
  }, []);

  // Velocity tracking is now handled by useVelocityTracking hook

  // Clean up label position state when angles are removed
  useEffect(() => {
    const currentAngleKeys = new Set(
      measuredAngles.map(([a, b, c]) => `${a}-${b}-${c}`)
    );
    
    // Remove any tracked positions for angles that no longer exist
    const keysToRemove: string[] = [];
    labelPositionStateRef.current.forEach((_, key) => {
      if (!currentAngleKeys.has(key)) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => labelPositionStateRef.current.delete(key));
  }, [measuredAngles]);

  // Track average confidence stats: Map<personIndex, { sum: number, count: number }>
  const confidenceStats = useRef<Map<number, { sum: number; count: number }>>(new Map());

  // Update confidence stats when poses change
  useEffect(() => {
    if (currentPoses.length === 0) return;
    
    currentPoses.forEach((pose, idx) => {
      if (pose.score !== null && pose.score !== undefined) {
        const stats = confidenceStats.current.get(idx) || { sum: 0, count: 0 };
        stats.sum += pose.score;
        stats.count += 1;
        confidenceStats.current.set(idx, stats);
      }
    });
  }, [currentPoses]);

  // Keep selectedPoseIndex in bounds when number of detected poses changes
  useEffect(() => {
    if (currentPoses.length > 0 && selectedPoseIndex >= currentPoses.length) {
      setSelectedPoseIndex(currentPoses.length - 1);
    }
  }, [currentPoses.length, selectedPoseIndex]);

  // Get the currently selected pose (with bounds checking)
  const selectedPose = currentPoses.length > 0 
    ? currentPoses[Math.min(selectedPoseIndex, currentPoses.length - 1)] 
    : null;

  // Handle Image Insight - capture frame and dispatch event for chat integration
  const handleImageInsight = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !selectedPose) {
      setImageInsightError("No pose detected. Enable AI Overlay and ensure a player is visible.");
      return;
    }

    setIsImageInsightLoading(true);
    setImageInsightError(null);

    try {
      // Temporarily set all angle presets for the capture
      const previousAngles = [...measuredAngles];
      setMeasuredAngles(ALL_ANGLE_PRESETS);
      
      // Wait for next frame to render the angles
      await new Promise(resolve => setTimeout(resolve, 150));

      // Capture the annotated frame
      const frameBlob = await captureAnnotatedFrame();
      if (!frameBlob) {
        throw new Error("Failed to capture frame");
      }

      // Restore previous angles
      setMeasuredAngles(previousAngles);

      console.log("📸 Frame captured with pose overlay and angles");
      console.log("📐 Angles:", ALL_ANGLE_PRESETS.map(a => `[${a.join("-")}]`).join(", "));

      // Dispatch event to trigger chat integration
      // AIChatForm will listen for this and handle adding messages
      window.dispatchEvent(new CustomEvent("image-insight-request", {
        detail: {
          imageBlob: frameBlob,
          domainExpertise: sportFilter !== "all" ? sportFilter : "all-sports",
          timestamp: Date.now(),
        }
      }));

      // Scroll to bottom to show the new messages
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }, 100);

    } catch (error) {
      console.error("❌ Image Insight error:", error);
      setImageInsightError(error instanceof Error ? error.message : "Failed to analyze frame");
    } finally {
      setIsImageInsightLoading(false);
    }
  }, [selectedPose, measuredAngles, setMeasuredAngles, captureAnnotatedFrame, sportFilter, ALL_ANGLE_PRESETS]);

  // Navigation handlers for pose selection
  const handlePrevPose = useCallback(() => {
    setSelectedPoseIndex(prev => prev > 0 ? prev - 1 : currentPoses.length - 1);
  }, [currentPoses.length]);

  const handleNextPose = useCallback(() => {
    setSelectedPoseIndex(prev => prev < currentPoses.length - 1 ? prev + 1 : 0);
  }, [currentPoses.length]);

  // Confidence and resolution presets imported from constants
  const currentConfidence = CONFIDENCE_PRESETS[confidenceMode];
  const currentResolution = React.useMemo(() => RESOLUTION_PRESETS[resolutionMode], [resolutionMode]);

  // Determine model type based on selected model
  const effectiveModelType = React.useMemo(() => {
    if (selectedModel === "BlazePose") {
      return blazePoseModelType;
    } else {
      // MoveNet: automatically switch to MultiPose when maxPoses > 1
      return maxPoses > 1 
        ? "MultiPose.Lightning" 
        : (useAccurateMode ? "SinglePose.Thunder" : "SinglePose.Lightning");
    }
  }, [selectedModel, blazePoseModelType, maxPoses, useAccurateMode]);

  const { isLoading, loadingFromCache, error, isDetecting, detectPose, startDetection, stopDetection, clearModelCache } =
    usePoseDetection({
      model: selectedModel,
      modelType: effectiveModelType,
      enableSmoothing: enableSmoothing,
      minPoseScore: currentConfidence.minPoseScore,
      minPartScore: currentConfidence.minPartScore,
      inputResolution: selectedModel === "MoveNet" ? currentResolution : undefined,
      maxPoses: selectedModel === "MoveNet" ? maxPoses : 1,
      enabled: isPoseEnabled,
    });

  // Get class filter based on sport selection
  const objectClassFilter = React.useMemo(() => {
    const { SPORT_FILTERS } = require("@/types/detection");
    return sportFilter === "all" ? undefined : SPORT_FILTERS[sportFilter];
  }, [sportFilter]);

  // Object Detection Hook
  // Note: Object detection must run if either object detection OR ball tracking is enabled
  // because ball tracking depends on YOLO detections
  const { 
    detector: objectDetector,
    isLoading: isObjectDetectionLoading, 
    error: objectDetectionError, 
    detectObjects 
  } = useObjectDetection({
    model: selectedObjectModel,
    confidenceThreshold: objectConfidenceThreshold,
    iouThreshold: objectIoUThreshold,
    classFilter: objectClassFilter,
    enableTracking: enableObjectTracking,
    enabled: isObjectDetectionEnabled || isProjectileDetectionEnabled, // Enable if either is active
    useYOLOv8: true, // Try to use YOLOv8, fallback to COCO-SSD
  });

  // Projectile Detection Hook
  const { 
    isLoading: isProjectileDetectionLoading, 
    error: projectileDetectionError, 
    detectProjectile 
  } = useProjectileDetection({
    model: selectedProjectileModel,
    confidenceThreshold: projectileConfidenceThreshold,
    trajectoryLength: showProjectileTrajectory ? 30 : 10,
    videoFPS: videoFPS,
    enabled: isProjectileDetectionEnabled,
    useYOLODetections: true, // Use YOLO detections for ball tracking
  });

  // Video dimensions and FPS detection are now handled by custom hooks

  // Reset metadata loaded state when video URL changes
  useEffect(() => {
    setIsVideoMetadataLoaded(false);
    console.log("Video URL changed, waiting for new video metadata to load...");
  }, [videoUrl]);

  // Memoized callback for pose detection
  const handlePosesDetected = useCallback((poses: PoseDetectionResult[]) => {
    setCurrentPoses(poses);
  }, []);

  // Handle continuous pose detection while playing (only if not using preprocessed mode)
  useEffect(() => {
    const video = videoRef.current;
    
    // Skip real-time detection if using preprocessed poses
    if (usePreprocessing) {
      stopDetection();
      return;
    }
    
    // CRITICAL: Check video metadata is loaded before attempting detection
    if (!video || !showSkeleton || !isPlaying || isLoading || !isPoseEnabled || !isVideoMetadataLoaded) {
      stopDetection();
      return;
    }

    // CRITICAL: Verify video has valid dimensions before starting detection
    // This prevents the "Requested texture size [0x0] is invalid" error
    if (!video.videoWidth || !video.videoHeight || video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("Video dimensions not ready for pose detection, waiting for metadata...");
      stopDetection();
      return;
    }

    startDetection(video, handlePosesDetected);

    return () => {
      stopDetection();
    };
  }, [isPlaying, showSkeleton, isLoading, usePreprocessing, isPoseEnabled, isVideoMetadataLoaded, startDetection, stopDetection, handlePosesDetected]);

  // Handle continuous object detection while playing (also handles ball tracking)
  useEffect(() => {
    const video = videoRef.current;
    
    // Run if either object detection or ball tracking is enabled
    // IMPORTANT: Must wait for detector to be fully ready!
    const shouldRun = (isObjectDetectionEnabled || isProjectileDetectionEnabled) && 
                      !isObjectDetectionLoading && 
                      objectDetector !== null && 
                      detectObjects !== undefined;
    
    if (!video || !shouldRun || !isPlaying) {
      return;
    }

    let rafId: number;
    let lastDetectionTime = 0;
    const detectionInterval = 100; // Detect every 100ms (10 FPS) to balance performance

    const detectLoop = async () => {
      if (!video.paused && !video.ended) {
        const now = performance.now();
        
        if (now - lastDetectionTime >= detectionInterval) {
          try {
            // Run object detection (needed for both object detection and ball tracking)
            // Note: detectObjects returns empty array if detector not ready yet
            const objects = await detectObjects(video);
            
            // Update object detections if object detection is enabled
            if (isObjectDetectionEnabled) {
              setCurrentObjects(objects);
            }
            
            // Run ball tracking if enabled (uses same object detections)
            if (isProjectileDetectionEnabled && detectProjectile) {
              const currentFrame = Math.floor(video.currentTime * videoFPS);
              const projectile = detectProjectile(objects, currentFrame, video.currentTime);
              setCurrentProjectile(projectile);
            }
            
            lastDetectionTime = now;
          } catch (err) {
            console.error('Error detecting objects:', err);
          }
        }
        
        rafId = requestAnimationFrame(detectLoop);
      }
    };

    detectLoop();

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isPlaying, isObjectDetectionEnabled, isObjectDetectionLoading, isProjectileDetectionEnabled, objectDetector, detectObjects, detectProjectile, videoFPS]);

  // Run object detection once when paused (for static frame analysis)
  useEffect(() => {
    const video = videoRef.current;
    
    if (!video || isPlaying || !isObjectDetectionEnabled || isObjectDetectionLoading || !detectObjects) {
      return;
    }

    // Run detection once on the paused frame
    const runDetection = async () => {
      try {
        const objects = await detectObjects(video);
        setCurrentObjects(objects);
      } catch (err) {
        console.error('Error detecting objects on paused frame:', err);
      }
    };

    // Small delay to ensure video frame is ready
    const timeoutId = setTimeout(runDetection, 100);
    
    return () => clearTimeout(timeoutId);
  }, [isPlaying, isObjectDetectionEnabled, isObjectDetectionLoading, detectObjects]);

  // Note: Projectile detection is now integrated with object detection loop above
  // No separate loop needed - ball tracking uses YOLO detections

  // Auto-play video when model finishes loading
  useEffect(() => {
    if (!isLoading && autoPlay && videoRef.current) {
      // Set playback speed explicitly before playing
      videoRef.current.playbackRate = playbackSpeed;
      
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => {
          // Re-apply playback speed after play promise resolves (some browsers reset it)
          if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed;
          }
          setIsPlaying(true);
          setHasStartedPlaying(true);
        }).catch((e) => {
          // Ignore AbortError - happens when play() is interrupted
          if (e.name !== "AbortError") {
            console.error("Video play error:", e);
          }
        });
      }
    }
  }, [isLoading, autoPlay, playbackSpeed]);

  // Handle pose detection when scrubbing (seeked event) while paused
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showSkeleton || isLoading || !isPoseEnabled) return;

    const handleSeeked = async () => {
      // Update frame number (use preprocessingFPS for lookup when using preprocessed poses)
      const lookupFPS = usePreprocessing ? preprocessingFPS : videoFPS;
      const frame = Math.floor(video.currentTime * lookupFPS);
      setCurrentFrame(frame);
      
      if (video.paused) {
        // Use preprocessed poses if available
        if (usePreprocessing && preprocessedPoses.has(frame)) {
          setCurrentPoses(preprocessedPoses.get(frame) || []);
        } else if (detectPose) {
          // Otherwise detect in real-time
          try {
            const poses = await detectPose(video);
            setCurrentPoses(poses);
          } catch (err) {
            console.error('Error detecting pose on seek:', err);
          }
        }
      }
    };

    video.addEventListener('seeked', handleSeeked);
    return () => video.removeEventListener('seeked', handleSeeked);
  }, [showSkeleton, isLoading, detectPose, videoFPS, usePreprocessing, preprocessedPoses, preprocessingFPS, isPoseEnabled]);

  // Track current frame number during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateFrameNumber = () => {
      setCurrentFrame(Math.floor(video.currentTime * videoFPS));
    };

    video.addEventListener('timeupdate', updateFrameNumber);
    return () => video.removeEventListener('timeupdate', updateFrameNumber);
  }, [videoFPS]);

  // Sync preprocessed poses during playback using requestAnimationFrame for smooth updates
  // CRITICAL: Use preprocessingFPS (the FPS used when poses were indexed) not videoFPS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !usePreprocessing || !isPlaying) return;

    console.log(`🎯 Starting pose sync: ${preprocessedPoses.size} frames available at ${preprocessingFPS} FPS`);
    
    let rafId: number;
    let lastFrame = -1;

    const syncPoses = () => {
      if (!video.paused && !video.ended) {
        // Use preprocessingFPS to calculate frame - this matches how poses were indexed
        const currentFrame = Math.floor(video.currentTime * preprocessingFPS);
        
        // Only update if we're on a new frame
        if (currentFrame !== lastFrame) {
          if (preprocessedPoses.has(currentFrame)) {
            const poses = preprocessedPoses.get(currentFrame);
            if (poses && poses.length > 0) {
              setCurrentPoses(poses);
              lastFrame = currentFrame;
            }
          } else {
            // Try nearby frames if exact frame not found (timing variance)
            const nearbyFrames = [currentFrame - 1, currentFrame + 1];
            for (const f of nearbyFrames) {
              if (preprocessedPoses.has(f)) {
                const poses = preprocessedPoses.get(f);
                if (poses && poses.length > 0) {
                  setCurrentPoses(poses);
                  lastFrame = currentFrame;
                  break;
                }
              }
            }
          }
        }
        
        rafId = requestAnimationFrame(syncPoses);
      }
    };

    syncPoses();

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usePreprocessing, isPlaying, preprocessingFPS, preprocessedPoses, preprocessedPoses.size]);

  // Show preprocessed pose for current frame when paused or when preprocessing completes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !usePreprocessing || preprocessedPoses.size === 0) return;

    console.log(`🎯 Paused pose sync active: ${preprocessedPoses.size} frames, video at ${video.currentTime.toFixed(2)}s`);

    // Immediately show pose for current frame
    const showCurrentPose = () => {
      const currentFrame = Math.floor(video.currentTime * videoFPS);
      let poses = preprocessedPoses.get(currentFrame);
      
      // Try nearby frames if exact frame not found
      if (!poses || poses.length === 0) {
        const nearbyFrames = [currentFrame - 1, currentFrame + 1, currentFrame - 2, currentFrame + 2];
        for (const f of nearbyFrames) {
          poses = preprocessedPoses.get(f);
          if (poses && poses.length > 0) break;
        }
      }
      
      if (poses && poses.length > 0) {
        setCurrentPoses(poses);
      }
    };

    // Show immediately
    showCurrentPose();

    // Also update when time changes (e.g., scrubbing while paused)
    const handleTimeUpdate = () => {
      if (video.paused) {
        showCurrentPose();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usePreprocessing, preprocessedPoses, preprocessedPoses.size, videoFPS]);

  // Auto-adjust playback speed for accurate trajectory tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // When trajectories enabled, slow down for deterministic frame capture
    if (showTrajectories) {
      video.playbackRate = 0.25; // 4x slower for accurate tracking
    } else {
      video.playbackRate = playbackSpeed; // Normal speed
    }
  }, [showTrajectories, playbackSpeed]);

  // Handle canvas clicks for angle measurement
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!enableAngleClicking || currentPoses.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Video to Canvas scaling
    const video = videoRef.current;
    if (!video) return;
    const vidScaleX = canvas.width / video.videoWidth;
    const vidScaleY = canvas.height / video.videoHeight;

    // Scale click to canvas coordinates (if canvas CSS size differs from internal size)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clickX = x * scaleX;
    const clickY = y * scaleY;

    const pose = selectedPose; // Use selected person
    if (!pose) return;

    // First, check if clicking directly on a joint (highest priority)
    let minDist = Infinity;
    let nearestJoint = -1;

    pose.keypoints.forEach((kp, index) => {
      if ((kp.score ?? 0) < 0.3) return;
      
      const kx = kp.x * vidScaleX;
      const ky = kp.y * vidScaleY;
      
      const dist = Math.sqrt(Math.pow(kx - clickX, 2) + Math.pow(ky - clickY, 2));
      if (dist < 30) { // 30px hit radius for joints
        if (dist < minDist) {
          minDist = dist;
          nearestJoint = index;
        }
      }
    });

    // If clicking on a joint, prioritize joint selection
    if (nearestJoint !== -1) {
      // Add to selection
      const newSelection = [...selectedAngleJoints, nearestJoint];
      
      if (newSelection.length === 3) {
        // We have a complete angle (A-B-C)
        setMeasuredAngles([...measuredAngles, [newSelection[0], newSelection[1], newSelection[2]]]);
        setSelectedAngleJoints([]);
      } else {
        setSelectedAngleJoints(newSelection);
      }
      return; // Don't check for angle toggling
    }

    // If not clicking on a joint, check if clicking on an existing angle arc to toggle its order
    if (measuredAngles.length > 0) {
      for (let i = 0; i < measuredAngles.length; i++) {
        const [idxA, idxB, idxC] = measuredAngles[i];
        const pointA = pose.keypoints[idxA];
        const pointB = pose.keypoints[idxB];
        const pointC = pose.keypoints[idxC];

        if (!pointA || !pointB || !pointC) continue;

        // Scale keypoints to canvas coordinates
        const scaledB = {
          x: pointB.x * vidScaleX,
          y: pointB.y * vidScaleY,
        };

        // Calculate arc radius (same as in drawAngle)
        const distAB = Math.sqrt(
          Math.pow((pointA.x - pointB.x) * vidScaleX, 2) + 
          Math.pow((pointA.y - pointB.y) * vidScaleY, 2)
        );
        const distBC = Math.sqrt(
          Math.pow((pointC.x - pointB.x) * vidScaleX, 2) + 
          Math.pow((pointC.y - pointB.y) * vidScaleY, 2)
        );
        const radius = Math.min(distAB, distBC) * 0.5;

        // Check if click is within the arc area (near the vertex and within radius)
        const distToVertex = Math.sqrt(
          Math.pow(clickX - scaledB.x, 2) + 
          Math.pow(clickY - scaledB.y, 2)
        );

        // Click is within the arc area if it's within the radius from the vertex
        // Make it smaller to avoid conflicts with joint selection
        if (distToVertex < radius * 0.8) {
          // Toggle the angle order: [A, B, C] -> [C, B, A]
          const newAngles = [...measuredAngles];
          newAngles[i] = [idxC, idxB, idxA];
          setMeasuredAngles(newAngles);
          return;
        }
      }
    }
  };

  // Draw skeleton on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw trajectories first (behind skeleton)
    if (showTrajectories && jointTrajectories.size > 0) {
      // Use same scaling as pose drawing
      let scaleX, scaleY;
      if (selectedModel === "BlazePose") {
        const blazePoseInputWidth = 830 * 1.2;
        const blazePoseInputHeight = 467 * 1.2;
        scaleX = canvas.width / blazePoseInputWidth;
        scaleY = canvas.height / blazePoseInputHeight;
      } else {
        scaleX = canvas.width / video.videoWidth;
        scaleY = canvas.height / video.videoHeight;
      }
      
      const jointColors = [
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
        "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B88B", "#B8E994",
        "#FDA7DF", "#82CCDD", "#F6A6D1", "#A29BFE", "#FD79A8",
        "#FDCB6E", "#6C5CE7"
      ];

      jointTrajectories.forEach((trajectory, jointIndex) => {
        if (trajectory.length < 2) return;
        
        const color = jointColors[jointIndex % jointColors.length];
        
        // Scale trajectory points to canvas coordinates
        const scaledTrajectory = trajectory.map(point => ({
          x: point.x * scaleX,
          y: point.y * scaleY,
          frame: point.frame, // Keep frame info for smoothing
        }));
        
        // Apply smoothing if enabled
        const pointsToDraw = smoothTrajectories 
          ? smoothTrajectory(scaledTrajectory) // Adaptive smoothing for realistic human movement
          : scaledTrajectory;
        
        // Draw trajectory line with smooth curves
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        if (smoothTrajectories && pointsToDraw.length > 2) {
          // Use quadratic curves for even smoother, more natural paths
          ctx.beginPath();
          ctx.moveTo(pointsToDraw[0].x, pointsToDraw[0].y);
          
          // Draw smooth curves through points
          for (let i = 1; i < pointsToDraw.length - 1; i++) {
            const current = pointsToDraw[i];
            const next = pointsToDraw[i + 1];
            const midX = (current.x + next.x) / 2;
            const midY = (current.y + next.y) / 2;
            
            if (i === 1) {
              ctx.lineTo(current.x, current.y);
            } else {
              ctx.quadraticCurveTo(current.x, current.y, midX, midY);
            }
          }
          
          // Connect to last point
          const lastPoint = pointsToDraw[pointsToDraw.length - 1];
          ctx.lineTo(lastPoint.x, lastPoint.y);
        } else {
          // Simple line drawing for non-smoothed paths
          ctx.beginPath();
          ctx.moveTo(pointsToDraw[0].x, pointsToDraw[0].y);
          for (let i = 1; i < pointsToDraw.length; i++) {
            ctx.lineTo(pointsToDraw[i].x, pointsToDraw[i].y);
          }
        }
        
        ctx.stroke();
        
        // Draw dots along original trajectory (not smoothed) to show actual data points
        trajectory.forEach((point, index) => {
          if (index % 5 === 0) { // Draw every 5th point to reduce clutter
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            ctx.fill();
          }
        });
      });
    }

    // Draw poses and tracking boxes
    if (currentPoses.length > 0) {
      for (const pose of currentPoses) {
        let scaledKeypoints;
        let scaleX: number, scaleY: number;
        
        if (selectedModel === "BlazePose") {
          // BlazePose uses an internal input resolution
          // Fine-tuned to match the person's size
          const blazePoseInputWidth = 850;
          const blazePoseInputHeight = 478;
          
          scaleX = canvas.width / blazePoseInputWidth;
          scaleY = canvas.height / blazePoseInputHeight;
          
          scaledKeypoints = pose.keypoints.map(kp => ({
            ...kp,
            x: kp.x * scaleX,
            y: kp.y * scaleY,
          }));
        } else {
          // MoveNet returns coordinates in video pixel space
          scaleX = canvas.width / video.videoWidth;
          scaleY = canvas.height / video.videoHeight;
          scaledKeypoints = pose.keypoints.map(kp => ({
            ...kp,
            x: kp.x * scaleX,
            y: kp.y * scaleY,
          }));
        }
        
        // Calculate dynamic keypoint radius based on bounding box size
        let keypointRadius = 4; // Default radius
        let angleFontSize = 14; // Default font size for angle text
        
        // Try to get bounding box dimensions
        if (pose.box) {
          // Use bounding box height to scale the radius
          const boxHeight = pose.box.height * scaleY;
          // Scale factor: normalize to a reference height (e.g., 400px = normal person)
          // Adjust the 0.01 factor to make dots larger/smaller
          keypointRadius = Math.max(2, Math.min(8, boxHeight * 0.01));
          // Scale font size proportionally (0.035 factor for text, larger than joints)
          angleFontSize = Math.max(10, Math.min(20, boxHeight * 0.035));
        } else {
          // Fallback: calculate from keypoints
          const validKeypoints = scaledKeypoints.filter(kp => (kp.score ?? 0) > 0.3);
          if (validKeypoints.length > 0) {
            const yCoords = validKeypoints.map(kp => kp.y);
            const estimatedHeight = Math.max(...yCoords) - Math.min(...yCoords);
            keypointRadius = Math.max(2, Math.min(8, estimatedHeight * 0.01));
            angleFontSize = Math.max(10, Math.min(20, estimatedHeight * 0.035));
          }
        }
        
        // Draw skeleton if enabled
        if (showSkeleton) {
          // Use BlazePose connections if using BlazePose model, otherwise use MoveNet connections
          const connections = selectedModel === "BlazePose" ? BLAZEPOSE_CONNECTIONS_2D : undefined;
          const faceIndices = selectedModel === "BlazePose" 
            ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // BlazePose face indices
            : undefined; // Default MoveNet indices
          
          drawPose(ctx, scaledKeypoints, {
            keypointColor: "#FF9800", // Orange center
            keypointOutlineColor: "#7ADB8F", // Mint green outline
            keypointRadius: keypointRadius,
            connectionColor: "#7ADB8F",
            connectionWidth: 3,
            minConfidence: 0.3,
            showFace: showFaceLandmarks,
            faceIndices: faceIndices,
          }, connections);
        }

        // Draw Tracking ID & Bounding Box (independent of skeleton)
        if (showTrackingId) {
          let boxX = 0, boxY = 0, boxW = 0, boxH = 0;
          let hasBox = false;

          // 1. Try to use the model's bounding box if available
          if (pose.box) {
            boxX = pose.box.xMin * scaleX;
            boxY = pose.box.yMin * scaleY;
            boxW = pose.box.width * scaleX;
            boxH = pose.box.height * scaleY;
            hasBox = true;
          } 
          // 2. Fallback: Calculate bounding box from keypoints
          else {
            const validKeypoints = scaledKeypoints.filter(kp => (kp.score ?? 0) > 0.3);
            if (validKeypoints.length > 0) {
              const xCoords = validKeypoints.map(kp => kp.x);
              const yCoords = validKeypoints.map(kp => kp.y);
              const minX = Math.min(...xCoords);
              const maxX = Math.max(...xCoords);
              const minY = Math.min(...yCoords);
              const maxY = Math.max(...yCoords);
              
              const padding = 20;
              boxX = minX - padding;
              boxY = minY - padding;
              boxW = maxX - minX + padding * 2;
              boxH = maxY - minY + padding * 2;
              hasBox = true;
            }
          }

          if (hasBox) {
            // Draw Bounding Box
            ctx.strokeStyle = "#00E676"; // Bright Green
            ctx.lineWidth = 2;
            ctx.strokeRect(boxX, boxY, boxW, boxH);

            // Draw ID Label - always show, use index if no ID
            const personIndex = currentPoses.indexOf(pose) + 1;
            const idText = pose.id !== undefined 
              ? `ID: ${pose.id}` 
              : (currentPoses.length === 1 ? "Player" : `Player ${personIndex}`);
            const labelFontSize = angleFontSize; // Use same dynamic size as angle text
            ctx.font = `bold ${labelFontSize}px sans-serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            
            const textMetrics = ctx.measureText(idText);
            const textWidth = textMetrics.width;
            const padding = Math.max(4, labelFontSize * 0.4);
            const cornerRadius = Math.max(3, labelFontSize * 0.25);
            const boxHeight = labelFontSize + padding * 1.5;
            
            // Draw label at top-left of box
            const labelX = boxX;
            const labelY = boxY - (boxHeight + 6); // Above box, with small gap

            // Draw dark background mask behind text (rounded rectangle) - same style as angles
            ctx.fillStyle = "rgba(0, 0, 0, 0.25)"; // Semi-transparent black background
            ctx.beginPath();
            ctx.moveTo(labelX + cornerRadius, labelY);
            ctx.lineTo(labelX + textWidth + padding * 2 - cornerRadius, labelY);
            ctx.quadraticCurveTo(labelX + textWidth + padding * 2, labelY, labelX + textWidth + padding * 2, labelY + cornerRadius);
            ctx.lineTo(labelX + textWidth + padding * 2, labelY + boxHeight - cornerRadius);
            ctx.quadraticCurveTo(labelX + textWidth + padding * 2, labelY + boxHeight, labelX + textWidth + padding * 2 - cornerRadius, labelY + boxHeight);
            ctx.lineTo(labelX + cornerRadius, labelY + boxHeight);
            ctx.quadraticCurveTo(labelX, labelY + boxHeight, labelX, labelY + boxHeight - cornerRadius);
            ctx.lineTo(labelX, labelY + cornerRadius);
            ctx.quadraticCurveTo(labelX, labelY, labelX + cornerRadius, labelY);
            ctx.closePath();
            ctx.fill();

            // Draw text outline/stroke for extra visibility (same as angles)
            ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
            ctx.lineWidth = Math.max(2, labelFontSize * 0.2);
            ctx.lineJoin = "round";
            ctx.strokeText(idText, labelX + padding, labelY + padding * 0.5);

            // Draw text on top
            ctx.fillStyle = "#00E676"; // Bright green text to match box color
            ctx.fillText(idText, labelX + padding, labelY + padding * 0.5);
          }
        }
      }
    }

      // Draw angles
      if (showAngles && currentPoses.length > 0) {
        const pose = selectedPose; // Use selected person for angle measurement
        if (pose) {
          // Use same scaling as pose drawing
          let scaleX, scaleY;
          if (selectedModel === "BlazePose") {
            const blazePoseInputWidth = 800;
            const blazePoseInputHeight = 450;
            scaleX = canvas.width / blazePoseInputWidth;
            scaleY = canvas.height / blazePoseInputHeight;
          } else {
            scaleX = canvas.width / video.videoWidth;
            scaleY = canvas.height / video.videoHeight;
          }
          
          const scaledKeypoints = pose.keypoints.map(kp => ({
            ...kp,
            x: kp.x * scaleX,
            y: kp.y * scaleY,
          }));

          // Calculate dynamic font size for angle text based on bounding box
          let angleFontSize = 20; // Default font size (increased for better readability)
          if (pose.box) {
            const boxHeight = pose.box.height * scaleY;
            angleFontSize = Math.max(16, Math.min(32, boxHeight * 0.05));
          } else {
            // Fallback: calculate from keypoints
            const validKeypoints = scaledKeypoints.filter(kp => (kp.score ?? 0) > 0.3);
            if (validKeypoints.length > 0) {
              const yCoords = validKeypoints.map(kp => kp.y);
              const estimatedHeight = Math.max(...yCoords) - Math.min(...yCoords);
              angleFontSize = Math.max(16, Math.min(32, estimatedHeight * 0.05));
            }
          }

        // Draw selected joints (in progress)
        if (selectedAngleJoints.length >= 2) {
          // Draw lines connecting selected joints
          ctx.strokeStyle = "#A855F7"; // Purple
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          
          for (let i = 0; i < selectedAngleJoints.length - 1; i++) {
            const idx1 = selectedAngleJoints[i];
            const idx2 = selectedAngleJoints[i + 1];
            const kp1 = scaledKeypoints[idx1];
            const kp2 = scaledKeypoints[idx2];
            
            if (kp1 && kp2 && (kp1.score ?? 0) > 0.3 && (kp2.score ?? 0) > 0.3) {
              ctx.beginPath();
              ctx.moveTo(kp1.x, kp1.y);
              ctx.lineTo(kp2.x, kp2.y);
              ctx.stroke();
            }
          }
          
          ctx.setLineDash([]);
        }

        // Draw completed angles with collision detection and stability
        const labelBounds: import('@/types/pose').LabelBounds[] = [];
        measuredAngles.forEach(([idxA, idxB, idxC]) => {
          const angleKey = `${idxA}-${idxB}-${idxC}`;
          const labelState = labelPositionStateRef.current.get(angleKey);
          
          const result = drawAngle(ctx, scaledKeypoints, [idxA, idxB, idxC], {
            lineColor: "#A855F7", // Purple
            arcColor: "rgba(168, 85, 247, 0.3)", // Semi-transparent purple
            textColor: "#FFFFFF", // White
            lineWidth: 2,
            fontSize: angleFontSize,
            minConfidence: 0.3,
            existingLabels: labelBounds,
            currentMultiplier: labelState?.multiplier,
            currentVerticalOffset: labelState?.verticalOffset,
            framesSinceChange: labelState?.framesSinceChange ?? 0,
            stabilityFrames: LABEL_POSITION_STABILITY_FRAMES,
            isPlaying: isPlaying,
          });
          
          if (result) {
            labelBounds.push(result.bounds);
            
            // Update label state
            const prevState = labelPositionStateRef.current.get(angleKey);
            const positionChanged = prevState?.multiplier !== result.multiplier || 
                                   prevState?.verticalOffset !== result.verticalOffset;
            
            if (prevState && !positionChanged) {
              // Same position, increment frames
              labelPositionStateRef.current.set(angleKey, {
                multiplier: result.multiplier,
                verticalOffset: result.verticalOffset,
                framesSinceChange: prevState.framesSinceChange + 1,
              });
            } else {
              // Position changed or new label, reset counter
              labelPositionStateRef.current.set(angleKey, {
                multiplier: result.multiplier,
                verticalOffset: result.verticalOffset,
                framesSinceChange: 0,
              });
            }
          }
        });
      }
    }

    // Draw object detection results (YOLO)
    if (isObjectDetectionEnabled && currentObjects.length > 0) {
      // Scale object bounding boxes to canvas coordinates
      // Object detection happens on video element, so we need to scale from video dimensions to canvas
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;
      
      const scaledObjects = currentObjects.map(obj => ({
        ...obj,
        bbox: {
          x: obj.bbox.x * scaleX,
          y: obj.bbox.y * scaleY,
          width: obj.bbox.width * scaleX,
          height: obj.bbox.height * scaleY,
        },
      }));
      
      drawDetectedObjects(ctx, scaledObjects, {
        showLabel: showObjectLabels,
        showConfidence: true,
        lineWidth: 3,
        fontSize: 14,
      });
    }

    // Draw projectile detection results (TrackNet)
    if (isProjectileDetectionEnabled && currentProjectile) {
      // Scale projectile position to canvas coordinates
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;
      
      const scaledProjectile = {
        ...currentProjectile,
        position: {
          x: currentProjectile.position.x * scaleX,
          y: currentProjectile.position.y * scaleY,
        },
        trajectory: currentProjectile.trajectory?.map((point: { x: number; y: number; frame: number; timestamp: number }) => ({
          ...point,
          x: point.x * scaleX,
          y: point.y * scaleY,
        })),
        predictedPath: currentProjectile.predictedPath?.map((point: { x: number; y: number; confidence: number }) => ({
          ...point,
          x: point.x * scaleX,
          y: point.y * scaleY,
        })),
      };
      
      drawProjectile(ctx, scaledProjectile, {
        ballColor: "#FFEB3B",
        ballRadius: 8, // Slightly larger for visibility
        trajectoryColor: "rgba(255, 235, 59, 0.8)", // More opaque
        trajectoryWidth: 3, // Thicker for visibility
        predictionColor: "rgba(255, 235, 59, 0.5)", // More visible
        showVelocity: true,
      });
    }

    // Draw court overlay (from Gemini frame analysis)
    if (showCourtOverlay && courtResult?.found && courtResult.corners) {
      const corners = courtResult.corners;
      
      // Scale normalized coordinates (0-1) to canvas coordinates
      const scaleCorner = (corner: { x: number; y: number }) => ({
        x: corner.x * canvas.width,
        y: corner.y * canvas.height,
      });
      
      const topLeft = scaleCorner(corners.topLeft);
      const topRight = scaleCorner(corners.topRight);
      const bottomLeft = scaleCorner(corners.bottomLeft);
      const bottomRight = scaleCorner(corners.bottomRight);
      
      // Draw court boundary lines
      ctx.strokeStyle = "#00D4FF"; // Cyan color for court
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 4]); // Dashed line
      
      ctx.beginPath();
      ctx.moveTo(topLeft.x, topLeft.y);
      ctx.lineTo(topRight.x, topRight.y);
      ctx.lineTo(bottomRight.x, bottomRight.y);
      ctx.lineTo(bottomLeft.x, bottomLeft.y);
      ctx.closePath();
      ctx.stroke();
      
      ctx.setLineDash([]); // Reset dash
      
      // Draw corner markers
      const cornerRadius = 6;
      const cornerColor = "#00D4FF";
      
      [topLeft, topRight, bottomLeft, bottomRight].forEach((corner, index) => {
        // Outer circle
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, cornerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = cornerColor;
        ctx.fill();
        
        // Inner circle (white dot)
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, cornerRadius - 2, 0, 2 * Math.PI);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
      });
      
      // Draw court type label
      if (courtResult.courtType && courtResult.courtType !== "unknown") {
        const labelText = `${courtResult.courtType.toUpperCase()} COURT`;
        ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
        const textMetrics = ctx.measureText(labelText);
        const labelX = topLeft.x;
        const labelY = topLeft.y - 10;
        
        // Background
        ctx.fillStyle = "rgba(0, 212, 255, 0.85)";
        const padding = 4;
        ctx.fillRect(
          labelX - padding,
          labelY - 12,
          textMetrics.width + padding * 2,
          16
        );
        
        // Text
        ctx.fillStyle = "#000000";
        ctx.fillText(labelText, labelX, labelY);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPoses, showSkeleton, showTrajectories, jointTrajectories, dimensions.width, dimensions.height, showFaceLandmarks, showAngles, selectedAngleJoints, measuredAngles, smoothTrajectories, selectedModel, showTrackingId, isObjectDetectionEnabled, currentObjects, showObjectLabels, isProjectileDetectionEnabled, currentProjectile, isPlaying, showCourtOverlay, courtResult]);

  // Catmull-Rom spline interpolation for smooth trajectories
  // Creates smooth curves through points, simulating higher FPS
  const catmullRomSpline = (
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    t: number
  ): { x: number; y: number } => {
    // Catmull-Rom spline formula
    const t2 = t * t;
    const t3 = t2 * t;
    
    return {
      x: 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      ),
      y: 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      )
    };
  };

  // Calculate velocity between two points
  const calculateVelocity = (
    p1: { x: number; y: number; frame: number },
    p2: { x: number; y: number; frame: number }
  ): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dt = p2.frame - p1.frame || 1; // Avoid division by zero
    return Math.sqrt(dx * dx + dy * dy) / dt;
  };

  // Generate smoothed trajectory points using adaptive Catmull-Rom splines
  // Adapts smoothing based on movement velocity for more realistic human motion
  const smoothTrajectory = (points: Array<{x: number, y: number, frame: number}>): Array<{x: number, y: number}> => {
    if (points.length < 2) return points.map(p => ({ x: p.x, y: p.y }));
    if (points.length === 2) {
      // Use cubic Bezier for 2 points with estimated control points
      const segments = 10;
      const smoothed: Array<{x: number, y: number}> = [];
      const p0 = points[0];
      const p1 = points[1];
      
      // Estimate control points based on direction
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const cp1x = p0.x + dx * 0.3;
      const cp1y = p0.y + dy * 0.3;
      const cp2x = p1.x - dx * 0.3;
      const cp2y = p1.y - dy * 0.3;
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;
        
        smoothed.push({
          x: mt3 * p0.x + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * p1.x,
          y: mt3 * p0.y + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * p1.y
        });
      }
      return smoothed;
    }

    const smoothed: Array<{x: number, y: number}> = [];
    
    // Add first point
    smoothed.push({ x: points[0].x, y: points[0].y });
    
    // Calculate velocities for adaptive smoothing
    const velocities: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      velocities.push(calculateVelocity(points[i], points[i + 1]));
    }
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    
    // Interpolate between each pair of points with adaptive segment count
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];
      
      // Adaptive segment count based on velocity
      // Faster movements get more segments for smoother curves
      // Slower movements get fewer segments to maintain natural feel
      const velocity = velocities[i] || avgVelocity;
      const velocityRatio = Math.min(velocity / (avgVelocity || 1), 3); // Cap at 3x
      const baseSegments = 8; // Base number of segments
      const segments = Math.max(5, Math.round(baseSegments * (1 + velocityRatio * 0.5)));
      
      // Generate interpolated points between p1 and p2
      for (let j = 1; j <= segments; j++) {
        const t = j / segments;
        const interpolated = catmullRomSpline(p0, p1, p2, p3, t);
        smoothed.push(interpolated);
      }
    }
    
    return smoothed;
  };

  // Get joint name from index
  const getJointName = (index: number): string => {
    // BlazePose mapping
    if (selectedModel === "BlazePose") {
      const blazePoseNames: { [key: number]: string } = {
        0: "Nose", 1: "L Eye (In)", 2: "L Eye", 3: "L Eye (Out)", 4: "R Eye (In)", 5: "R Eye", 6: "R Eye (Out)",
        7: "L Ear", 8: "R Ear", 9: "Mouth (L)", 10: "Mouth (R)",
        11: "L Shoulder", 12: "R Shoulder", 13: "L Elbow", 14: "R Elbow", 15: "L Wrist", 16: "R Wrist",
        17: "L Pinky", 18: "R Pinky", 19: "L Index", 20: "R Index", 21: "L Thumb", 22: "R Thumb",
        23: "L Hip", 24: "R Hip", 25: "L Knee", 26: "R Knee", 27: "L Ankle", 28: "R Ankle",
        29: "L Heel", 30: "R Heel", 31: "L Foot", 32: "R Foot"
      };
      return blazePoseNames[index] || `Joint ${index}`;
    }

    // MoveNet mapping
    const jointNames: { [key: number]: string } = {
      0: "Nose",
      1: "L Eye",
      2: "R Eye",
      3: "L Ear",
      4: "R Ear",
      5: "L Shoulder",
      6: "R Shoulder",
      7: "L Elbow",
      8: "R Elbow",
      9: "L Wrist",
      10: "R Wrist",
      11: "L Hip",
      12: "R Hip",
      13: "L Knee",
      14: "R Knee",
      15: "L Ankle",
      16: "R Ankle",
    };
    return jointNames[index] || `Joint ${index}`;
  };

  // Calculate current angle value from current poses
  const getCurrentAngleValue = (angle: [number, number, number]): number | null => {
    if (currentPoses.length === 0 || !selectedPose) return null;
    const pose = selectedPose;
    const [idxA, idxB, idxC] = angle;
    
    const pointA = pose.keypoints[idxA];
    const pointB = pose.keypoints[idxB];
    const pointC = pose.keypoints[idxC];
    
    if (!pointA || !pointB || !pointC) return null;
    if ((pointA.score ?? 0) < 0.3 || (pointB.score ?? 0) < 0.3 || (pointC.score ?? 0) < 0.3) return null;
    
    return calculateAngle(pointA, pointB, pointC);
  };

  // Toggle angle preset: add if not exists, remove if exists (check both orders)
  const toggleAnglePreset = (angle: [number, number, number]) => {
    const [idxA, idxB, idxC] = angle;
    const reverseAngle: [number, number, number] = [idxC, idxB, idxA];
    
    // Check if angle exists in either order
    const existingIndex = measuredAngles.findIndex(
      ([a, b, c]) =>
        (a === idxA && b === idxB && c === idxC) ||
        (a === idxC && b === idxB && c === idxA)
    );
    
    if (existingIndex !== -1) {
      // Remove existing angle
      setMeasuredAngles(measuredAngles.filter((_, i) => i !== existingIndex));
    } else {
      // Add new angle
      setMeasuredAngles([...measuredAngles, angle]);
    }
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch((e) => {
        // Ignore AbortError - happens when play() is interrupted (normal behavior)
        if (e.name !== "AbortError") {
          console.error("Video play error:", e);
        }
      });
      setIsPlaying(true);
      setHasStartedPlaying(true);
    }
  };

  const handleReset = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    setCurrentPoses([]);
    clearTrajectories(); // Clear trajectories using hook
    confidenceStats.current.clear(); // Clear confidence stats
    // Velocity stats are now managed by useVelocityTracking hook
  };

  const handlePreprocess = async () => {
    const video = videoRef.current;
    if (!video || !detectPose || isLoading) return;

    setIsPreprocessing(true);
    setPreprocessProgress(0);
    setPreprocessedPoses(new Map());

    // Pause video
    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
    }

    try {
      const fps = videoFPS;
      const duration = video.duration;
      const totalFrames = Math.floor(duration * fps);
      const allPoses = new Map<number, PoseDetectionResult[]>();
      
      console.log(`Pre-processing ${totalFrames} frames at ${fps} FPS...`);

      for (let frame = 0; frame < totalFrames; frame++) {
        // Seek to exact frame
        const targetTime = frame / fps;
        video.currentTime = targetTime;
        
        // Wait for seek to complete
        await new Promise<void>(resolve => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });

        // Detect pose on this frame
        const poses = await detectPose(video);
        allPoses.set(frame, poses);

        // Update progress
        const progress = ((frame + 1) / totalFrames) * 100;
        setPreprocessProgress(progress);

        // Small delay to prevent browser freezing
        if (frame % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      console.log(`Pre-processing complete! Processed ${totalFrames} frames.`);
      setPreprocessedPoses(allPoses);
      setIsPreprocessing(false);
      setPreprocessProgress(100);
      setUsePreprocessing(true); // Auto-enable preprocessed mode

      // Reset to start and load first frame's pose
      video.currentTime = 0;
      const firstPoses = allPoses.get(0);
      if (firstPoses) {
        setCurrentPoses(firstPoses);
      }

    } catch (err) {
      console.error('Pre-processing error:', err);
      setIsPreprocessing(false);
      setPreprocessProgress(0);
    }
  };

  // Auto preprocessing - uses main video with blocking overlay
  // Includes quick FPS detection before preprocessing for accuracy
  const startAutoPreprocess = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !detectPose || isBackgroundPreprocessing) return;

    console.log("🎬 Starting auto preprocessing...");
    setIsBackgroundPreprocessing(true);
    setBackgroundPreprocessProgress(0);
    backgroundPreprocessAbortRef.current = false;

    // Remember current position
    const originalTime = video.currentTime;
    
    try {
      // Step 1: Quick FPS detection by briefly playing the video (hidden behind overlay)
      let detectedFPS = videoFPS;
      
      // Only detect if we haven't already (still at default)
      if (videoFPS === DEFAULT_VIDEO_FPS && "requestVideoFrameCallback" in video) {
        console.log("🔍 Detecting FPS (video plays briefly behind overlay)...");
        
        detectedFPS = await new Promise<number>((resolve) => {
          let frameCount = 0;
          let startMediaTime = 0;
          const maxFrames = 20; // Quick detection - only need ~20 frames
          const timeout = setTimeout(() => {
            video.pause();
            console.log("⏱️ FPS detection timeout, using default");
            resolve(DEFAULT_VIDEO_FPS);
          }, 1500); // 1.5s max
          
          const callback = (_now: number, metadata: any) => {
            if (frameCount === 0) {
              startMediaTime = metadata.mediaTime || 0;
            }
            frameCount++;
            
            if (frameCount >= maxFrames) {
              clearTimeout(timeout);
              video.pause();
              
              // Calculate FPS from media time
              const mediaTimeDiff = metadata.mediaTime - startMediaTime;
              let fps = DEFAULT_VIDEO_FPS;
              if (mediaTimeDiff > 0) {
                fps = Math.round(frameCount / mediaTimeDiff);
                // Snap to common values
                const COMMON_FPS = [24, 25, 30, 50, 60, 120];
                fps = COMMON_FPS.reduce((prev, curr) =>
                  Math.abs(curr - fps) < Math.abs(prev - fps) ? curr : prev
                );
              }
              console.log(`🔍 Detected FPS: ${fps} (from ${frameCount} frames in ${mediaTimeDiff.toFixed(3)}s)`);
              resolve(fps);
            } else if (!video.paused && !video.ended) {
              (video as any).requestVideoFrameCallback(callback);
            }
          };
          
          // Start from beginning for consistent detection
          video.currentTime = 0;
          video.play().then(() => {
            (video as any).requestVideoFrameCallback(callback);
          }).catch(() => {
            clearTimeout(timeout);
            resolve(DEFAULT_VIDEO_FPS);
          });
        });
        
        // Ensure video is paused after detection
        video.pause();
        setIsPlaying(false);
      } else {
        // Already detected or API not available
        video.pause();
        setIsPlaying(false);
      }
      
      // Step 2: Preprocessing with detected FPS
      const fps = detectedFPS;
      const duration = video.duration;
      const totalFrames = Math.floor(duration * fps);
      const allPoses = new Map<number, PoseDetectionResult[]>();

      console.log(`🎬 Processing ${totalFrames} frames at ${fps} FPS...`);

      for (let frame = 0; frame < totalFrames; frame++) {
        // Check if aborted
        if (backgroundPreprocessAbortRef.current) {
          console.log("🎬 Preprocessing aborted");
          break;
        }

        // Seek to exact frame
        const targetTime = frame / fps;
        video.currentTime = targetTime;

        // Wait for seek to complete
        await new Promise<void>(resolve => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });

        // Detect pose on this frame
        const poses = await detectPose(video);
        allPoses.set(frame, poses);

        // Update progress
        const progress = ((frame + 1) / totalFrames) * 100;
        setBackgroundPreprocessProgress(progress);

        // Log progress every 10%
        if (frame % Math.max(1, Math.floor(totalFrames / 10)) === 0) {
          console.log(`🎬 Preprocessing: ${progress.toFixed(0)}% (frame ${frame}/${totalFrames})`);
        }

        // Yield to browser (every 10 frames like manual preprocessing)
        if (frame % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Only complete if not aborted
      if (!backgroundPreprocessAbortRef.current) {
        console.log(`✅ Preprocessing complete! Processed ${allPoses.size} frames at ${fps} FPS.`);
        
        setPreprocessedPoses(allPoses);
        setPreprocessingFPS(fps);
        setUsePreprocessing(true);

        // Return to original position
        video.currentTime = originalTime;
        const currentFrame = Math.round(originalTime * fps);
        const framePoses = allPoses.get(currentFrame) || allPoses.get(0);
        if (framePoses) {
          setCurrentPoses(framePoses);
        }

      } else {
        // Aborted - return to original position
        video.currentTime = originalTime;
      }
    } catch (err) {
      console.error('Preprocessing error:', err);
      // Return to original position on error
      video.currentTime = originalTime;
    } finally {
      setIsBackgroundPreprocessing(false);
      setBackgroundPreprocessProgress(0);
    }
  }, [detectPose, isBackgroundPreprocessing, videoFPS]);

  // Cancel background preprocessing
  const cancelBackgroundPreprocess = useCallback(() => {
    backgroundPreprocessAbortRef.current = true;
  }, []);

  // Auto-start preprocessing when AI overlay is enabled and model is loaded
  // FPS detection is built into startAutoPreprocess, so we start immediately
  // Skip preprocessing in compact/floating mode
  useEffect(() => {
    // All conditions for preprocessing
    const canPreprocess = isPoseEnabled && 
                          !isLoading && // Main detector must be loaded
                          !isBackgroundPreprocessing && 
                          !usePreprocessing && 
                          preprocessedPoses.size === 0 && 
                          isVideoMetadataLoaded &&
                          !compactMode; // Don't preprocess in floating mode
    
    if (!canPreprocess) return;
    
    // Start immediately - FPS detection happens inside startAutoPreprocess
    console.log("🎬 AI overlay enabled, starting preprocessing...");
    const timer = setTimeout(() => {
      startAutoPreprocess();
    }, 100); // Small delay to ensure UI is ready
    return () => clearTimeout(timer);
    
  }, [isPoseEnabled, isLoading, isBackgroundPreprocessing, usePreprocessing, preprocessedPoses.size, isVideoMetadataLoaded, startAutoPreprocess, compactMode]);

  // Cancel background preprocessing when AI overlay is disabled
  useEffect(() => {
    if (!isPoseEnabled && isBackgroundPreprocessing) {
      cancelBackgroundPreprocess();
    }
  }, [isPoseEnabled, isBackgroundPreprocessing, cancelBackgroundPreprocess]);

  // Auto-run key frame detections when preprocessing completes
  useEffect(() => {
    if (usePreprocessing && preprocessedPoses.size > 0 && !trophyResult && !contactResult && !landingResult) {
      console.log('🎯 Auto-detecting key frames...');
      // Run all detections - they won't seek since we're not using the handlers
      detectTrophyPosition("auto");
      detectContactPoint("auto");
      detectLanding();
    }
  }, [usePreprocessing, preprocessedPoses.size, trophyResult, contactResult, landingResult, detectTrophyPosition, detectContactPoint, detectLanding]);

  const handleVideoEnded = () => {
    setIsPlaying(false);
    stopDetection();
  };

  const handleFrameStep = async (direction: 'forward' | 'backward') => {
    const video = videoRef.current;
    if (!video) return;

    // Pause the video if playing
    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
    }

    // Calculate frame duration based on detected FPS
    const frameDuration = 1 / videoFPS; // seconds per frame

    // Step forward or backward by one frame
    if (direction === 'forward') {
      video.currentTime = Math.min(video.currentTime + frameDuration, video.duration);
    } else {
      video.currentTime = Math.max(video.currentTime - frameDuration, 0);
    }

    // Update frame and pose (use preprocessingFPS for lookup when using preprocessed poses)
    const lookupFPS = usePreprocessing ? preprocessingFPS : videoFPS;
    const newFrame = Math.floor(video.currentTime * lookupFPS);
    setCurrentFrame(newFrame);

    // Use preprocessed poses if available, otherwise detect in real-time
    if (usePreprocessing && preprocessedPoses.has(newFrame)) {
      setCurrentPoses(preprocessedPoses.get(newFrame) || []);
    } else if (detectPose && showSkeleton && !isLoading && isPoseEnabled) {
      try {
        const poses = await detectPose(video);
        setCurrentPoses(poses);
      } catch (err) {
        console.error('Error detecting pose on frame step:', err);
      }
    }
  };

  // Get first pose with 3D keypoints for visualization
  const pose3D = React.useMemo(() => {
    if (isPoseEnabled && selectedModel === "BlazePose" && currentPoses.length > 0 && selectedPose) {
      const pose = selectedPose;
      if (pose && pose.keypoints3D && pose.keypoints3D.length > 0) {
        return pose;
      }
    }
    return null;
  }, [currentPoses, selectedModel, isPoseEnabled]);

  // Toggle Pose Detection (Enable/Disable) and controls visibility
  const handleTogglePose = () => {
    if (isPoseEnabled) {
      // Disabling - also hide controls
      setIsPoseEnabled(false);
      setIsExpanded(false);
      setCurrentPoses([]);
      clearTrajectories();
      stopDetection();
    } else {
      // Enabling - also show controls
      setIsPoseEnabled(true);
      setIsExpanded(true);
      
      // If enabling for the first time on a standard video (not a preset card), 
      // apply the "Technique Analysis" default settings
      if (!initialPoseEnabled) {
        // Apply Technique preset
        setUseAccurateMode(true); // Thunder
        setConfidenceMode("low"); // Challenging conditions
        setResolutionMode("accurate"); // 384x384
        setShowTrackingId(true);
        setShowAngles(true); // Show angles by default
        setMeasuredAngles([[6, 8, 10], [12, 14, 16]]); // Right elbow and right knee angles by default
        setShowVelocity(false); // Don't show velocity by default
        setVelocityWrist("right");
        setSelectedJoints([10]); // Right Wrist
        setShowTrajectories(false);
      }
      
      // Reset stats
      confidenceStats.current.clear();
      // Velocity stats are now managed by useVelocityTracking hook

      // Pause and resume the video to trigger immediate overlay refresh
      const video = videoRef.current;
      if (video) {
        const wasPlaying = !video.paused;
        video.pause();
        setTimeout(() => {
          if (video && wasPlaying) {
            video.play().catch((e) => {
              // Ignore AbortError - happens when play() is interrupted
              if (e.name !== "AbortError") {
                console.error("Video play error:", e);
              }
            });
          }
        }, 50); // Small delay to ensure pause event is processed
      }
    }
  };

  return (
    <Flex direction="column" gap="0" style={compactMode ? { height: "100%", width: "100%" } : undefined}>
      {/* 3D Pose Viewer (shown when BlazePose is selected and 3D data is available) */}
      {isPoseEnabled && selectedModel === "BlazePose" && (
        <Box style={{ 
          width: "100%", 
          backgroundColor: "var(--gray-2)", 
          borderRadius: "var(--radius-3)", 
          // padding: "8px", // Removed padding for better alignment
          overflow: "hidden", // Ensure content stays within border radius
          position: "relative",
        }}>
          {/* Floating Header */}
          <Box style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 5,
            background: "rgba(0, 0, 0, 0.5)",
            padding: "4px 8px",
            borderRadius: "6px",
            backdropFilter: "blur(4px)"
          }}>
            <Text size="1" style={{ color: "white" }} weight="medium">
              3D Pose Visualization
            </Text>
          </Box>

          {pose3D ? (
            <Box style={{ 
              width: "100%", 
              position: "relative",
              touchAction: "none", 
            }}>
              <Pose3DViewer 
                pose={pose3D} 
                width={dimensions.width} 
                height={dimensions.height} 
                showFace={showFaceLandmarks}
              />
            </Box>
          ) : (
            <Box style={{ 
              width: "100%", 
              height: `${dimensions.height}px`, 
              backgroundColor: "var(--gray-3)", 
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Text size="2" color="gray">
                {currentPoses.length > 0 
                  ? "Waiting for 3D keypoints..." 
                  : "No pose detected yet"}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Video Container with Canvas Overlay - Pure CSS layout */}
      {/* In compact mode (floating), fill the container completely */}
      {/* On mobile with portrait video, constrain width to avoid full-width stretch */}
      <Box
        ref={containerRef}
        style={{
          position: "relative",
          width: compactMode ? "100%" : "auto",
          height: compactMode ? "100%" : "auto",
          maxWidth: "100%",
          maxHeight: compactMode ? "100%" : videoMaxHeight,
          backgroundColor: "transparent",
          borderRadius: compactMode ? 0 : (showControls && isExpanded ? "var(--radius-3) var(--radius-3) 0 0" : "var(--radius-3)"),
          overflow: "hidden",
          margin: "0 auto",
          // Let the video drive the container's aspect ratio
          display: "inline-flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay={autoPlay && !isLoading}
          crossOrigin={shouldUseCrossOrigin(videoUrl) ? "anonymous" : undefined}
          onLoadedMetadata={() => {
            setIsVideoMetadataLoaded(true);
            const video = videoRef.current;
            console.log("Video metadata loaded, dimensions:", video?.videoWidth, "x", video?.videoHeight);
            // Update canvas dimensions to match video
            if (video && canvasRef.current) {
              canvasRef.current.width = video.videoWidth;
              canvasRef.current.height = video.videoHeight;
              // Notify parent of video dimensions for aspect ratio handling
              onVideoMetadataLoaded?.(video.videoWidth, video.videoHeight);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleVideoEnded}
          controls
          style={{
            display: "block",
            width: compactMode ? "100%" : "auto",
            height: compactMode ? "100%" : "auto",
            maxWidth: "100%",
            maxHeight: compactMode ? "100%" : videoMaxHeight,
            objectFit: "contain",
          }}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onClick={handleCanvasClick}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: enableAngleClicking ? "auto" : "none",
            zIndex: 10,
            cursor: enableAngleClicking ? "crosshair" : "default",
          }}
        />

        {/* Toggle Pose Button and Config Button (Top Left) */}
        <Flex
          gap={isPortraitVideo || isMobile ? "1" : "2"}
          style={{
            position: "absolute",
            top: compactMode ? "4px" : (isPortraitVideo ? "8px" : "12px"),
            left: compactMode ? "4px" : (isPortraitVideo ? "8px" : "12px"),
            zIndex: 30, // Higher than overlays (and drag zone in compact mode)
          }}
        >
          {/* Theatre Mode Button - Hidden on mobile, short screens, and when floating */}
          {!isMobile && !isShortScreenView && !hideTheatreToggle && (
            <Tooltip content={localTheatreMode ? "Exit Theatre Mode" : "Enter Theatre Mode"}>
              <Button
                className={buttonStyles.actionButtonSquare}
                onClick={async () => {
                  const { setTheatreMode } = await import("@/utils/storage");
                  setTheatreMode(!localTheatreMode);
                }}
                style={{
                  height: isPortraitVideo ? "24px" : "28px",
                  width: isPortraitVideo ? "24px" : "28px",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: localTheatreMode ? 1 : 0.7,
                }}
              >
                {localTheatreMode ? (
                  <ExitFullScreenIcon width={isPortraitVideo ? 12 : 14} height={isPortraitVideo ? 12 : 14} />
                ) : (
                  <EnterFullScreenIcon width={isPortraitVideo ? 12 : 14} height={isPortraitVideo ? 12 : 14} />
                )}
              </Button>
            </Tooltip>
          )}

          {/* AI Overlay Toggle Button - hidden in compact/floating mode */}
          {!compactMode && (
            <Tooltip content={isPoseEnabled ? "Disable AI Overlay" : "Enable AI Overlay"}>
              <Button
                className={buttonStyles.actionButtonSquare}
                onClick={handleTogglePose}
                style={{
                  height: isPortraitVideo || isMobile ? "24px" : "28px",
                  padding: isPortraitVideo || isMobile ? "0 8px" : "0 10px",
                  fontSize: isMobile ? "10px" : "11px",
                  opacity: isPoseEnabled ? 1 : 0.7,
                }}
              >
                <Text size="2" weight="medium" style={{ fontSize: isMobile ? "10px" : "11px" }}>
                  AI Overlay
                </Text>
              </Button>
            </Tooltip>
          )}

        </Flex>

        {/* Stats Overlay - hidden in compact/floating mode */}
        {!isMobile && !compactMode && ((isPoseEnabled && showSkeleton && currentPoses.length > 0) || (isObjectDetectionEnabled && currentObjects.length > 0) || (isProjectileDetectionEnabled && currentProjectile)) && (
          <Box
            style={{
              position: "absolute",
              top: isPortraitVideo ? "38px" : "52px", // Shifted down to make room for Toggle Button
              left: isPortraitVideo ? "8px" : "12px",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
              padding: isPortraitVideo ? "6px 8px" : "8px 12px",
              borderRadius: "var(--radius-3)",
              zIndex: 15,
              pointerEvents: "none",
              fontSize: isMobile ? "9px" : "10px",
            }}
          >
            <Flex direction="column" gap="1">
              <Text size="1" weight="medium" style={{ color: "white", fontFamily: "var(--font-mono)", fontSize: isMobile ? "9px" : "10px" }}>
                Frame {currentFrame} • {videoFPS} FPS
              </Text>
              {/* Pose Detection Stats */}
              {isPoseEnabled && currentPoses.length > 0 && (
                <>
                  {!isMobile && currentPoses.length === 1 && (
                    <Text size="1" style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "10px" }}>
                      Tracking player
                    </Text>
                  )}
                  {/* Player Toggle - show when multiple players detected */}
                  {!isMobile && currentPoses.length > 1 && (
                    <Flex align="center" gap="2">
                      <Button
                        size="1"
                        variant="ghost"
                        onClick={handlePrevPose}
                        style={{ 
                          padding: "2px 6px", 
                          minWidth: "auto",
                          color: "white",
                          cursor: "pointer",
                        }}
                      >
                        <ChevronLeftIcon width={12} height={12} />
                      </Button>
                      <Text size="1" style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "10px", minWidth: "70px", textAlign: "center" }}>
                        Player {selectedPoseIndex + 1}/{currentPoses.length}
                      </Text>
                      <Button
                        size="1"
                        variant="ghost"
                        onClick={handleNextPose}
                        style={{ 
                          padding: "2px 6px", 
                          minWidth: "auto",
                          color: "white",
                          cursor: "pointer",
                        }}
                      >
                        <ChevronRightIcon width={12} height={12} />
                      </Button>
                    </Flex>
                  )}
                  {selectedPose && (() => {
                    // Calculate average accuracy for selected player
                    const stats = confidenceStats.current.get(selectedPoseIndex);
                    const avg = stats && stats.count > 0 ? (stats.sum / stats.count) : 0;
                    
                    return (
                      <Text size="1" style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: isMobile ? "9px" : "10px" }}>
                        Confidence {(avg * 100).toFixed(0)}%
                      </Text>
                    );
                  })()}
                </>
              )}
              {/* Object Detection Stats */}
              {isObjectDetectionEnabled && currentObjects.length > 0 && !isMobile && (
                <Text size="1" style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "10px" }}>
                  Objects: {currentObjects.length}
                </Text>
              )}
              {/* Ball Tracking Stats */}
              {isProjectileDetectionEnabled && currentProjectile && !isMobile && (
                <Text size="1" style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "10px" }}>
                  Ball tracked • {(currentProjectile.confidence * 100).toFixed(0)}% confidence
                </Text>
              )}
            </Flex>
          </Box>
        )}

        {/* Top-Right Overlays Container */}
        <Flex 
            direction="column" 
            gap={isPortraitVideo ? "1" : "2"}
            style={{ 
                position: "absolute", 
                top: isPortraitVideo ? "8px" : "12px", 
                right: isPortraitVideo ? "8px" : "12px", 
                zIndex: 15,
                pointerEvents: "none",
                alignItems: "flex-end"
            }}
        >
        {/* Angles Overlay - Hidden on mobile and in portrait/vertical mode */}
        {isPoseEnabled && showAngles && measuredAngles.length > 0 && currentPoses.length > 0 && !isMobile && !isPortraitVideo && (
              <Box
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                  backdropFilter: "blur(4px)",
                  padding: isPortraitVideo ? "6px 8px" : "8px 12px",
                  borderRadius: "var(--radius-3)",
                  width: "fit-content",
                  display: "none",
                }}
              >
                <Flex direction="column" gap="1" align="end">
                  <Text size="1" weight="medium" style={{ color: "white", fontFamily: "var(--font-mono)", textAlign: "right", fontSize: isMobile ? "9px" : "10px" }}>
                    Angles
                  </Text>
                  {measuredAngles.map((angle, idx) => {
                    const [idxA, idxB, idxC] = angle;
                    const angleValue = getCurrentAngleValue(angle);
                    const jointB = getJointName(idxB); // Vertex joint name
                    
                    return (
                      <Text key={idx} size="1" style={{ color: "rgba(255, 255, 255, 0.9)", textAlign: "right", fontSize: isMobile ? "9px" : "10px" }}>
                        {jointB}:{" "}
                        <span style={{ color: "#A855F7", fontWeight: "bold" }}>
                          {angleValue !== null ? `${angleValue.toFixed(1)}°` : "N/A"}
                        </span>
                      </Text>
                    );
                  })}
                </Flex>
              </Box>
            )}

            {/* Velocity Overlays - Show based on active elbow angles */}
            {isPoseEnabled && currentPoses.length > 0 && showVelocity && (
              <VelocityDisplay
                velocityStatsLeft={velocityStatsLeft}
                velocityStatsRight={velocityStatsRight}
                hasLeftElbow={hasLeftElbow}
                hasRightElbow={hasRightElbow}
                isPortraitVideo={isPortraitVideo}
                isMobile={isMobile}
              />
            )}
        </Flex>
        
              {/* Loading Overlay */}
        {isPoseEnabled && (isLoading || (autoPlay && !isPlaying && !hasStartedPlaying)) && (
          <Flex
            align="center"
            justify="center"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 20,
              transition: "opacity 0.3s ease",
            }}
          >
            <Flex align="center" gap="2" direction="column" style={{ color: "white" }}>
              <Flex align="center" gap="2">
                <Spinner size="3" />
                <Text size="4">
                  {isLoading 
                    ? "Preparing AI overlay..."
                    : "Starting playback..."}
                </Text>
              </Flex>
            </Flex>
          </Flex>
        )}

        {/* Preprocessing blocking overlay - blocks interaction during analysis */}
        {isBackgroundPreprocessing && (
          <Box
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "transparent",
              zIndex: 24,
            }}
          />
        )}
        
        {/* Background Preprocessing Progress - Shows at top center while analyzing */}
        {isBackgroundPreprocessing && (
          <Box
            style={{
              position: "absolute",
              top: compactMode ? "4px" : (isPortraitVideo ? "8px" : "12px"),
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              borderRadius: "var(--radius-2)",
              padding: "4px 10px",
              zIndex: 25,
            }}
          >
            <Flex align="center" gap="2">
              <Text size="1" style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "10px" }}>
                Analysing movement
              </Text>
              {/* Progress Bar */}
              <Box
                style={{
                  width: "50px",
                  height: "3px",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <Box
                  style={{
                    width: `${backgroundPreprocessProgress}%`,
                    height: "100%",
                    backgroundColor: "var(--accent-9)",
                    transition: "width 0.1s ease-out",
                  }}
                />
              </Box>
            </Flex>
          </Box>
        )}

        {/* Bottom gradient mask for smooth transition to controls */}
        {showControls && isExpanded && (
          <Box
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "12px",
              background: "linear-gradient(to bottom, transparent 0%, black 100%)",
              pointerEvents: "none",
              zIndex: 5,
            }}
          />
        )}
      </Box>

      {/* Controls */}
      {showControls && isExpanded && (
        <Flex direction="column" gap="2" style={{
          backgroundColor: "black",
          padding: "var(--space-3)",
          borderRadius: "0 0 var(--radius-3) var(--radius-3)",
        }}>
          {/* Playback Controls - Always visible */}
          <Flex direction="column" gap="2">
            <Flex gap="2" align="center" wrap="wrap">
              <PlaybackControls
                isPlaying={isPlaying}
                isLoading={isLoading}
                isPreprocessing={isPreprocessing}
                onPlayPause={handlePlayPause}
                onReset={handleReset}
                isPortraitVideo={isPortraitVideo}
              />
            {!isPreprocessing && !usePreprocessing && (
              <>
                {developerMode && (
                  <Tooltip content="Pre-process all frames in the video for smoother playback and analysis">
                    <Button
                      onClick={handlePreprocess}
                      disabled={isLoading}
                      className={buttonStyles.actionButtonSquare}
                      size="2"
                    >
                      <MagicWandIcon width="16" height="16" />
                    </Button>
                  </Tooltip>
                )}
                <Tooltip content="Previous Frame">
                  <Button
                    onClick={() => handleFrameStep('backward')}
                    disabled={isLoading || isPreprocessing}
                    className={buttonStyles.actionButtonSquare}
                    size="2"
                  >
                    <ChevronLeftIcon width="16" height="16" />
                  </Button>
                </Tooltip>
                <Tooltip content="Next Frame">
                  <Button
                    onClick={() => handleFrameStep('forward')}
                    disabled={isLoading || isPreprocessing}
                    className={buttonStyles.actionButtonSquare}
                    size="2"
                  >
                    <ChevronRightIcon width="16" height="16" />
                  </Button>
                </Tooltip>
                
                {/* Angles Dropdown Menu */}
                <Box style={{ marginLeft: 'auto' }}>
                  <DropdownMenu.Root open={angleMenuOpen} onOpenChange={setAngleMenuOpen}>
                    <Tooltip content="Add or remove joint angle measurements">
                      <DropdownMenu.Trigger>
                        <Button
                          className={buttonStyles.actionButtonSquare}
                          size="2"
                          style={{
                            opacity: measuredAngles.length > 0 ? 1 : 0.5
                          }}
                        >
                          <RulerSquareIcon width="16" height="16" />
                        </Button>
                      </DropdownMenu.Trigger>
                    </Tooltip>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item 
                        onSelect={(e) => {
                          e.preventDefault();
                          const hasLeftElbow = measuredAngles.some(([a, b, c]) => 
                            (a === 5 && b === 7 && c === 9) || (a === 9 && b === 7 && c === 5)
                          );
                          if (!hasLeftElbow) {
                            setVelocityWrist('left');
                          }
                          toggleAnglePreset([5, 7, 9]);
                        }}
                      >
                        <Text>Left Elbow</Text>
                        {measuredAngles.some(([a, b, c]) => 
                          (a === 5 && b === 7 && c === 9) || (a === 9 && b === 7 && c === 5)
                        ) && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item 
                        onSelect={(e) => {
                          e.preventDefault();
                          const hasRightElbow = measuredAngles.some(([a, b, c]) => 
                            (a === 6 && b === 8 && c === 10) || (a === 10 && b === 8 && c === 6)
                          );
                          if (!hasRightElbow) {
                            setVelocityWrist('right');
                          }
                          toggleAnglePreset([6, 8, 10]);
                        }}
                      >
                        <Text>Right Elbow</Text>
                        {measuredAngles.some(([a, b, c]) => 
                          (a === 6 && b === 8 && c === 10) || (a === 10 && b === 8 && c === 6)
                        ) && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item 
                        onSelect={(e) => {
                          e.preventDefault();
                          toggleAnglePreset([11, 13, 15]);
                        }}
                      >
                        <Text>Left Knee</Text>
                        {measuredAngles.some(([a, b, c]) => 
                          (a === 11 && b === 13 && c === 15) || (a === 15 && b === 13 && c === 11)
                        ) && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item 
                        onSelect={(e) => {
                          e.preventDefault();
                          toggleAnglePreset([12, 14, 16]);
                        }}
                      >
                        <Text>Right Knee</Text>
                        {measuredAngles.some(([a, b, c]) => 
                          (a === 12 && b === 14 && c === 16) || (a === 16 && b === 14 && c === 12)
                        ) && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </Box>
              </>
            )}
            {usePreprocessing && (
              <>
                {developerMode && (
                  <Tooltip content="Disable pre-processed frames">
                    <Button
                      onClick={() => {
                        setUsePreprocessing(false);
                        setPreprocessedPoses(new Map());
                      }}
                      className={buttonStyles.actionButtonSquare}
                      size="2"
                    >
                      <CrossCircledIcon width="16" height="16" />
                    </Button>
                  </Tooltip>
                )}
                <Tooltip content="Previous Frame">
                  <Button
                    onClick={() => handleFrameStep('backward')}
                    disabled={isLoading || isPreprocessing}
                    className={buttonStyles.actionButtonSquare}
                    size="2"
                  >
                    <ChevronLeftIcon width="16" height="16" />
                  </Button>
                </Tooltip>
                <Tooltip content="Next Frame">
                  <Button
                    onClick={() => handleFrameStep('forward')}
                    disabled={isLoading || isPreprocessing}
                    className={buttonStyles.actionButtonSquare}
                    size="2"
                  >
                    <ChevronRightIcon width="16" height="16" />
                  </Button>
                </Tooltip>
                
                {/* Angles Dropdown Menu */}
                <Box style={{ marginLeft: 'auto' }}>
                  <DropdownMenu.Root open={angleMenuOpen} onOpenChange={setAngleMenuOpen}>
                    <Tooltip content="Add or remove joint angle measurements">
                      <DropdownMenu.Trigger>
                        <Button
                          className={buttonStyles.actionButtonSquare}
                          size="2"
                          style={{
                            opacity: measuredAngles.length > 0 ? 1 : 0.5
                          }}
                        >
                          <RulerSquareIcon width="16" height="16" />
                        </Button>
                      </DropdownMenu.Trigger>
                    </Tooltip>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item 
                        onSelect={(e) => {
                          e.preventDefault();
                          const hasLeftElbow = measuredAngles.some(([a, b, c]) => 
                            (a === 5 && b === 7 && c === 9) || (a === 9 && b === 7 && c === 5)
                          );
                          if (!hasLeftElbow) {
                            setVelocityWrist('left');
                          }
                          toggleAnglePreset([5, 7, 9]);
                        }}
                      >
                        <Text>Left Elbow</Text>
                        {measuredAngles.some(([a, b, c]) => 
                          (a === 5 && b === 7 && c === 9) || (a === 9 && b === 7 && c === 5)
                        ) && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item 
                        onSelect={(e) => {
                          e.preventDefault();
                          const hasRightElbow = measuredAngles.some(([a, b, c]) => 
                            (a === 6 && b === 8 && c === 10) || (a === 10 && b === 8 && c === 6)
                          );
                          if (!hasRightElbow) {
                            setVelocityWrist('right');
                          }
                          toggleAnglePreset([6, 8, 10]);
                        }}
                      >
                        <Text>Right Elbow</Text>
                        {measuredAngles.some(([a, b, c]) => 
                          (a === 6 && b === 8 && c === 10) || (a === 10 && b === 8 && c === 6)
                        ) && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item 
                        onSelect={(e) => {
                          e.preventDefault();
                          toggleAnglePreset([11, 13, 15]);
                        }}
                      >
                        <Text>Left Knee</Text>
                        {measuredAngles.some(([a, b, c]) => 
                          (a === 11 && b === 13 && c === 15) || (a === 15 && b === 13 && c === 11)
                        ) && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item 
                        onSelect={(e) => {
                          e.preventDefault();
                          toggleAnglePreset([12, 14, 16]);
                        }}
                      >
                        <Text>Right Knee</Text>
                        {measuredAngles.some(([a, b, c]) => 
                          (a === 12 && b === 14 && c === 16) || (a === 16 && b === 14 && c === 12)
                        ) && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </Box>
              </>
            )}
            </Flex>

            {/* Second Row: Key Frame Timeline */}
            {!isPreprocessing && usePreprocessing && (() => {
              // Calculate marker positions with overlap prevention
              const duration = videoRef.current?.duration || 1;
              const currentTime = videoRef.current?.currentTime || 0;
              const currentTimePercent = (currentTime / duration) * 100;
              const markerSize = 28;
              const minGap = 0; // Minimum gap between markers
              const minDistance = markerSize + minGap; // 32px minimum between marker centers
              
              // Threshold for "active" state (within 0.1 seconds of key frame)
              const activeThreshold = 0.1;
              const isTrophyActive = trophyResult && Math.abs(currentTime - trophyResult.trophyTimestamp) < activeThreshold;
              const isContactActive = contactResult && Math.abs(currentTime - contactResult.contactTimestamp) < activeThreshold;
              const isLandingActive = landingResult && Math.abs(currentTime - landingResult.landingTimestamp) < activeThreshold;
              
              // Green glow styles for active markers
              const activeGlowStyle = {
                border: '2px solid #7ADB8F',
                boxShadow: '0 0 20px rgba(122, 219, 143, 0.6), 0 0 40px rgba(122, 219, 143, 0.4), 0 4px 16px rgba(122, 219, 143, 0.5)',
              };
              
              // Get raw positions (as percentages 0-100)
              const rawPositions = {
                trophy: trophyResult ? (trophyResult.trophyTimestamp / duration) * 100 : 0,
                contact: contactResult ? (contactResult.contactTimestamp / duration) * 100 : 50,
                landing: landingResult ? (landingResult.landingTimestamp / duration) * 100 : 100,
              };
              
              // Sort markers by position for overlap calculation
              const markers = [
                { key: 'trophy', pos: rawPositions.trophy, detected: !!trophyResult },
                { key: 'contact', pos: rawPositions.contact, detected: !!contactResult },
                { key: 'landing', pos: rawPositions.landing, detected: !!landingResult },
              ].sort((a, b) => a.pos - b.pos);
              
              // Adjust positions to prevent overlaps (working in percentage space)
              // Assuming timeline is roughly 300px wide, 32px = ~10.7% of width
              const minDistancePercent = 12; // ~12% minimum distance
              
              const adjustedPositions: Record<string, number> = {};
              markers.forEach((marker, i) => {
                if (i === 0) {
                  adjustedPositions[marker.key] = marker.pos;
                } else {
                  const prevKey = markers[i - 1].key;
                  const prevPos = adjustedPositions[prevKey];
                  const minPos = prevPos + minDistancePercent;
                  adjustedPositions[marker.key] = Math.max(marker.pos, minPos);
                }
              });
              
              // Clamp positions to valid range (0-100)
              Object.keys(adjustedPositions).forEach(key => {
                adjustedPositions[key] = Math.min(Math.max(adjustedPositions[key], 0), 100);
              });
              
              return (
              <Flex gap="2" align="center">
                {/* Timeline with key frame markers */}
                <Box style={{ 
                  flex: 1, 
                  position: 'relative', 
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {/* Timeline track */}
                  <Box style={{
                    position: 'absolute',
                    left: '24px',
                    right: '24px',
                    height: '2px',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: '1px',
                  }} />
                  
                  {/* Airborne indicator line (above main track) */}
                  {landingResult && (
                    <Box style={{
                      position: 'absolute',
                      top: '12px',
                      left: `calc(24px + (100% - 48px) * ${(landingResult.takeoffTimestamp / duration)})`,
                      width: `calc((100% - 48px) * ${(landingResult.landingTimestamp - landingResult.takeoffTimestamp) / duration})`,
                      height: '3px',
                      backgroundColor: 'rgba(255, 255, 255, 0.6)',
                      borderRadius: '1.5px',
                      boxShadow: '0 0 4px rgba(255, 255, 255, 0.4)',
                      pointerEvents: 'none',
                    }} />
                  )}
                  
                  {/* Current position playhead (green dot) */}
                  <Box style={{
                    position: 'absolute',
                    // Constrain to track area: track goes from 24px to (100% - 24px)
                    // Dot is 10px wide, so center it within that range
                    left: `calc(19px + (100% - 48px) * ${currentTimePercent / 100})`,
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#7ADB8F',
                    boxShadow: '0 0 8px rgba(122, 219, 143, 0.8)',
                    zIndex: 1,
                    transition: 'left 0.05s linear',
                    pointerEvents: 'none',
                  }} />
                  
                  {/* Trophy marker */}
                  <Tooltip content={trophyResult ? `Trophy at ${trophyResult.trophyTimestamp.toFixed(2)}s` : "Detect trophy position"}>
                    <Box
                      onClick={handleDetectTrophy}
                      style={{
                        position: 'absolute',
                        left: `calc(10px + (100% - 48px) * ${adjustedPositions.trophy / 100})`,
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: trophyResult ? 'white' : 'rgba(255, 255, 255, 0.2)',
                        border: isTrophyActive ? activeGlowStyle.border : '2px solid white',
                        boxShadow: isTrophyActive ? activeGlowStyle.boxShadow : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        zIndex: 2,
                      }}
                    >
                      {isTrophyAnalyzing ? (
                        <Spinner size="1" />
                      ) : (
                        <RocketIcon width="14" height="14" style={{ color: trophyResult ? 'black' : 'white' }} />
                      )}
                    </Box>
                  </Tooltip>

                  {/* Contact/Hit marker */}
                  <Tooltip content={contactResult ? `Contact at ${contactResult.contactTimestamp.toFixed(2)}s` : "Detect contact point"}>
                    <Box
                      onClick={handleDetectContact}
                      style={{
                        position: 'absolute',
                        left: `calc(10px + (100% - 48px) * ${adjustedPositions.contact / 100})`,
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: contactResult ? 'white' : 'rgba(255, 255, 255, 0.2)',
                        border: isContactActive ? activeGlowStyle.border : '2px solid white',
                        boxShadow: isContactActive ? activeGlowStyle.boxShadow : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        zIndex: 2,
                      }}
                    >
                      {isContactAnalyzing ? (
                        <Spinner size="1" />
                      ) : (
                        <Crosshair2Icon width="14" height="14" style={{ color: contactResult ? 'black' : 'white' }} />
                      )}
                    </Box>
                  </Tooltip>

                  {/* Landing marker */}
                  <Tooltip content={landingResult ? `Landing at ${landingResult.landingTimestamp.toFixed(2)}s` : "Detect landing position"}>
                    <Box
                      onClick={handleDetectLanding}
                      style={{
                        position: 'absolute',
                        left: `calc(10px + (100% - 48px) * ${adjustedPositions.landing / 100})`,
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: landingResult ? 'white' : 'rgba(255, 255, 255, 0.2)',
                        border: isLandingActive ? activeGlowStyle.border : '2px solid white',
                        boxShadow: isLandingActive ? activeGlowStyle.boxShadow : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        zIndex: 2,
                      }}
                    >
                      {isLandingAnalyzing ? (
                        <Spinner size="1" />
                      ) : (
                        <ArrowDownIcon width="14" height="14" style={{ color: landingResult ? 'black' : 'white' }} />
                      )}
                    </Box>
                  </Tooltip>
                </Box>

                {/* Frame Insight Button - right aligned */}
                <Tooltip content="Frame Insight – Analyze this frame with AI">
                  <Button
                    onClick={handleImageInsight}
                    disabled={isImageInsightLoading || !selectedPose}
                    className={buttonStyles.actionButtonSquare}
                    size="2"
                    style={{
                      opacity: selectedPose ? 1 : 0.5,
                    }}
                  >
                    {isImageInsightLoading ? (
                      <Spinner size="1" />
                    ) : (
                      <CameraIcon width="16" height="16" />
                    )}
                  </Button>
                </Tooltip>
              </Flex>
              );
            })()}

            {/* Advanced Settings Toggle - Only in Developer Mode */}
            <CollapsibleSection
              title="Advanced Settings"
              isExpanded={isAdvancedExpanded}
              onToggle={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
              showWhen={developerMode}
            >
              <Flex direction="column" gap="3" p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-3)" }}>
                {/* Playback Speed Selector */}
            <Flex direction="column" gap="1">
              <Text size="2" color="gray" weight="medium">
                Playback speed
              </Text>
              <Select.Root
                value={playbackSpeed.toString()}
                onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}
                disabled={isLoading || showTrajectories}
              >
                <Select.Trigger 
                  className={selectStyles.selectTriggerStyled}
                  style={{ width: "100%", height: "70px", padding: "12px" }}
                  placeholder="Select speed..."
                >
                  <Flex direction="column" gap="1" align="start">
                    <Text weight="medium" size="2">
                      {playbackSpeed === 0.25 && "0.25× (Slowest)"}
                      {playbackSpeed === 0.5 && "0.5× (Slow)"}
                      {playbackSpeed === 1.0 && "1.0× (Normal)"}
                      {playbackSpeed === 2.0 && "2.0× (Fast)"}
                    </Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5", textAlign: "left" }}>
                      {playbackSpeed === 0.25 && "Frame-perfect tracking, no skipped frames"}
                      {playbackSpeed === 0.5 && "Good balance for most analysis"}
                      {playbackSpeed === 1.0 && "Standard playback speed"}
                      {playbackSpeed === 2.0 && "Quick review (may skip some frames)"}
                    </Text>
                  </Flex>
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="0.25" style={{ minHeight: "70px", padding: "12px" }}>
                    <Flex direction="column" gap="1">
                      <Text weight="medium" size="2">0.25× (Slowest)</Text>
                      <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                        Frame-perfect tracking, no skipped frames
                      </Text>
                    </Flex>
                  </Select.Item>
                  <Select.Item value="0.5" style={{ minHeight: "70px", padding: "12px" }}>
                    <Flex direction="column" gap="1">
                      <Text weight="medium" size="2">0.5× (Slow)</Text>
                      <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                        Good balance for most analysis
                      </Text>
                    </Flex>
                  </Select.Item>
                  <Select.Item value="1.0" style={{ minHeight: "70px", padding: "12px" }}>
                    <Flex direction="column" gap="1">
                      <Text weight="medium" size="2">1.0× (Normal)</Text>
                      <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                        Standard playback speed
                      </Text>
                    </Flex>
                  </Select.Item>
                  <Select.Item value="2.0" style={{ minHeight: "70px", padding: "12px" }}>
                    <Flex direction="column" gap="1">
                      <Text weight="medium" size="2">2.0× (Fast)</Text>
                      <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                        Quick review (may skip some frames)
                      </Text>
                    </Flex>
                  </Select.Item>
                </Select.Content>
              </Select.Root>
              <Text size="1" color="gray" style={{ opacity: 0.7 }}>
                {showTrajectories 
                  ? "Auto-set to 0.25× for accurate trajectory tracking"
                  : `Current speed: ${playbackSpeed}×`}
              </Text>
            </Flex>

          {/* Pre-processing Progress */}
          {isPreprocessing && (
            <Flex direction="column" gap="2" p="3" style={{
              backgroundColor: "var(--gray-3)",
              borderRadius: "var(--radius-2)",
            }}>
              <Flex align="center" gap="2">
                <Spinner size="2" />
                <Text size="2" weight="medium">
                  Pre-processing video frames...
                </Text>
              </Flex>
              <Box style={{ width: "100%", height: "8px", backgroundColor: "var(--gray-6)", borderRadius: "4px", overflow: "hidden" }}>
                <Box style={{ 
                  width: `${preprocessProgress}%`, 
                  height: "100%", 
                  backgroundColor: "var(--mint-9)",
                  transition: "width 0.1s"
                }} />
              </Box>
              <Text size="1" color="gray">
                {preprocessProgress.toFixed(1)}% complete • This may take 30-60 seconds for longer videos
              </Text>
            </Flex>
          )}


          {/* Pose Settings Panel - Extracted Component */}
          <PoseSettingsPanel
            isLoading={isLoading}
            isDetecting={isDetecting}
            isPreprocessing={isPreprocessing}
            showSkeleton={showSkeleton}
            setShowSkeleton={setShowSkeleton}
            showTrajectories={showTrajectories}
            setShowTrajectories={setShowTrajectories}
            smoothTrajectories={smoothTrajectories}
            setSmoothTrajectories={setSmoothTrajectories}
            showAngles={showAngles}
            setShowAngles={setShowAngles}
            enableAngleClicking={enableAngleClicking}
            setEnableAngleClicking={setEnableAngleClicking}
            showVelocity={showVelocity}
            setShowVelocity={setShowVelocity}
            velocityWrist={velocityWrist}
            setVelocityWrist={setVelocityWrist}
            showTrackingId={showTrackingId}
            setShowTrackingId={setShowTrackingId}
            showFaceLandmarks={showFaceLandmarks}
            setShowFaceLandmarks={setShowFaceLandmarks}
            enableSmoothing={enableSmoothing}
            setEnableSmoothing={setEnableSmoothing}
            useAccurateMode={useAccurateMode}
            setUseAccurateMode={setUseAccurateMode}
            measuredAngles={measuredAngles}
            setMeasuredAngles={setMeasuredAngles}
            selectedAngleJoints={selectedAngleJoints}
            setSelectedAngleJoints={setSelectedAngleJoints}
            toggleAnglePreset={toggleAnglePreset}
            selectedJoints={selectedJoints}
            setSelectedJoints={setSelectedJoints}
            clearTrajectories={clearTrajectories}
            maxPoses={maxPoses}
            setMaxPoses={setMaxPoses}
            isPoseEnabled={isPoseEnabled}
            setIsPoseEnabled={setIsPoseEnabled}
            confidenceMode={confidenceMode}
            setConfidenceMode={setConfidenceMode}
            resolutionMode={resolutionMode}
            setResolutionMode={setResolutionMode}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            blazePoseModelType={blazePoseModelType}
            setBlazePoseModelType={setBlazePoseModelType}
            setCurrentPoses={setCurrentPoses}
          />

          {/* Object Detection Settings Panel - Extracted Component */}
          <ObjectDetectionSettingsPanel
            isObjectDetectionEnabled={isObjectDetectionEnabled}
            setIsObjectDetectionEnabled={setIsObjectDetectionEnabled}
            isObjectDetectionLoading={isObjectDetectionLoading}
            objectDetectionError={objectDetectionError}
            selectedObjectModel={selectedObjectModel}
            setSelectedObjectModel={setSelectedObjectModel}
            setCurrentObjects={setCurrentObjects}
            sportFilter={sportFilter}
            setSportFilter={setSportFilter}
            objectConfidenceThreshold={objectConfidenceThreshold}
            setObjectConfidenceThreshold={setObjectConfidenceThreshold}
            objectIoUThreshold={objectIoUThreshold}
            setObjectIoUThreshold={setObjectIoUThreshold}
            showObjectLabels={showObjectLabels}
            setShowObjectLabels={setShowObjectLabels}
            enableObjectTracking={enableObjectTracking}
            setEnableObjectTracking={setEnableObjectTracking}
          />

          {/* Projectile Detection Settings Panel - Extracted Component */}
          <ProjectileDetectionSettingsPanel
            isProjectileDetectionEnabled={isProjectileDetectionEnabled}
            setIsProjectileDetectionEnabled={setIsProjectileDetectionEnabled}
            isProjectileDetectionLoading={isProjectileDetectionLoading}
            projectileDetectionError={projectileDetectionError}
            currentProjectile={currentProjectile}
            isPlaying={isPlaying}
            projectileConfidenceThreshold={projectileConfidenceThreshold}
            setProjectileConfidenceThreshold={setProjectileConfidenceThreshold}
            showProjectileTrajectory={showProjectileTrajectory}
            setShowProjectileTrajectory={setShowProjectileTrajectory}
            showProjectilePrediction={showProjectilePrediction}
            setShowProjectilePrediction={setShowProjectilePrediction}
          />

          {/* Frame Analysis Settings Panel - Gemini AI */}
          <FrameAnalysisSettingsPanel
            isAnalyzing={isFrameAnalyzing}
            analyzingTypes={analyzingTypes}
            courtResult={courtResult}
            cameraAngleResult={cameraAngleResult}
            showCourtOverlay={showCourtOverlay}
            setShowCourtOverlay={setShowCourtOverlay}
            onAnalyzeCourt={handleAnalyzeCourt}
            onAnalyzeCameraAngle={handleAnalyzeCameraAngle}
            onAnalyzeBoth={handleAnalyzeBoth}
            onClearResults={clearFrameAnalysisResults}
            videoRef={videoRef}
            error={frameAnalysisError}
            onImageInsight={handleImageInsight}
            isImageInsightLoading={isImageInsightLoading}
            imageInsightError={imageInsightError}
            developerMode={developerMode}
            hasPose={!!selectedPose}
          />

          {/* Error Display */}
          {error && (
            <Flex direction="column" gap="2">
              <Text size="2" color="red">
                Error: {error}
              </Text>
              <Button
                size="1"
                className={buttonStyles.actionButtonSquare}
                data-accent-color="red"
                onClick={async () => {
                  const cleared = await clearModelCache();
                  if (cleared > 0) {
                    window.location.reload();
                  }
                }}
              >
                Clear Cache & Reload
              </Button>
            </Flex>
          )}
          
              </Flex>
            </CollapsibleSection>
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}
