"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as React from "react";
import { Box, Flex, Button, Text, Select, Tooltip, Spinner, Switch, Slider } from "@radix-ui/themes";
import {
  PlayIcon,
  PauseIcon,
  MagicWandIcon,
  CrossCircledIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EnterFullScreenIcon,
  ExitFullScreenIcon,
  ExternalLinkIcon,
  CameraIcon,
} from "@radix-ui/react-icons";
import { detectionLogger } from "@/lib/logger";
import { usePoseDetection, type SupportedModel } from "@/hooks/usePoseDetection";
import { useObjectDetection } from "@/hooks/useObjectDetection";
import { useProjectileDetection } from "@/hooks/useProjectileDetection";
import { useFrameAnalysis } from "@/hooks/useFrameAnalysis";
import { calculateAngle } from "@/types/pose";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import buttonStyles from "@/styles/buttons.module.css";
import selectStyles from "@/styles/selects.module.css";
import { useIsMobile } from "@/hooks/useIsMobile";

// Hooks
import {
  useVideoDimensions,
  useVideoFPS,
  useVelocityTracking,
  useJointTrajectories,
  useTrophyDetection,
  useContactPointDetection,
  useLandingDetection,
  useCanvasDrawing,
  useVideoPreprocessing,
  useJointStabilization,
  usePoseStabilityFilter,
  StabilityState,
  useJointHistory,
  useSwingDetection,
  useSwingDetectionV2,
} from "./hooks";

// Components
import {
  VelocityDisplay,
  CollapsibleSection,
  PlaybackControls,
  PoseSettingsPanel,
  ObjectDetectionSettingsPanel,
  ProjectileDetectionSettingsPanel,
  FrameAnalysisSettingsPanel,
  AnglesDropdownMenu,
  StatsOverlay,
  Pose3DSection,
  LoadingOverlay,
  PreprocessingProgress,
  BottomGradientMask,
  StabilityStateOverlay,
  JointDisplacementChart,
  JointAccelerationChart,
} from "./components";

// Constants
import { CONFIDENCE_PRESETS, RESOLUTION_PRESETS, DEFAULT_VIDEO_FPS } from "./constants";

// Types
import type { ObjectDetectionResult, ProjectileDetectionResult } from "@/types/detection";

// Pose data persistence
import { loadPoseData, savePoseData, convertToPreprocessedPoses } from "@/lib/poseDataService";

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
  poseEnabled?: boolean;
  onPoseEnabledChange?: (enabled: boolean) => void;
  onVideoMetadataLoaded?: (width: number, height: number) => void;
  // Callback when pose detection results change - for external consumers
  onPoseChange?: (poses: PoseDetectionResult[]) => void;
  compactMode?: boolean;
  allowPreprocessing?: boolean;
  // S3 storage for pose data caching
  videoS3Key?: string;
  poseDataS3Key?: string;
  onPoseDataSaved?: (s3Key: string) => void;
  // Skip preprocessing - used when video is floating (just playback, no analysis)
  skipPreprocessing?: boolean;
}

// Helper to determine if crossOrigin should be used for a URL
function shouldUseCrossOrigin(url: string): boolean {
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    return false;
  }
  if (typeof window !== "undefined" && (url.startsWith("http://") || url.startsWith("https://"))) {
    try {
      const videoOrigin = new URL(url).origin;
      const currentOrigin = window.location.origin;
      return videoOrigin !== currentOrigin;
    } catch {
      return true;
    }
  }
  return false;
}

// Joint name mapping
function getJointName(index: number, selectedModel: SupportedModel): string {
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
  const jointNames: { [key: number]: string } = {
    0: "Nose", 1: "L Eye", 2: "R Eye", 3: "L Ear", 4: "R Ear",
    5: "L Shoulder", 6: "R Shoulder", 7: "L Elbow", 8: "R Elbow", 9: "L Wrist", 10: "R Wrist",
    11: "L Hip", 12: "R Hip", 13: "L Knee", 14: "R Knee", 15: "L Ankle", 16: "R Ankle",
  };
  return jointNames[index] || `Joint ${index}`;
}

// All 4 angle presets
const ALL_ANGLE_PRESETS: Array<[number, number, number]> = [
  [5, 7, 9], [6, 8, 10], [11, 13, 15], [12, 14, 16],
];

export function VideoPoseViewer({
  videoUrl,
  width = 640,
  height = 480,
  autoPlay = false,
  showControls = true,
  initialModel = "MoveNet",
  initialShowSkeleton = true,
  initialShowAngles = true,
  initialMeasuredAngles = [[6, 8, 10], [12, 14, 16]],
  initialPlaybackSpeed = 1.0,
  initialUseAccurateMode = false,
  initialConfidenceMode = "standard",
  initialResolutionMode = "balanced",
  initialShowTrackingId = false,
  initialShowTrajectories = false,
  initialSelectedJoints = [9, 10],
  initialShowVelocity = false,
  initialVelocityWrist = "right",
  initialPoseEnabled = false,
  theatreMode = true,
  hideTheatreToggle = false,
  poseEnabled: controlledPoseEnabled,
  onPoseEnabledChange,
  onVideoMetadataLoaded,
  onPoseChange,
  compactMode = false,
  allowPreprocessing = true,
  videoS3Key,
  poseDataS3Key,
  onPoseDataSaved,
  skipPreprocessing = false,
}: VideoPoseViewerProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const confidenceStats = useRef<Map<number, { sum: number; count: number }>>(new Map());

  // Core state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoMetadataLoaded, setIsVideoMetadataLoaded] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentPoses, setCurrentPoses] = useState<PoseDetectionResult[]>([]);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  // Pose enabled state (controlled/uncontrolled)
  const isControlled = controlledPoseEnabled !== undefined;
  const [internalPoseEnabled, setInternalPoseEnabled] = useState(initialPoseEnabled);
  const [hasEverEnabledOverlay, setHasEverEnabledOverlay] = useState(initialPoseEnabled);
  const isPoseEnabled = isControlled ? controlledPoseEnabled : internalPoseEnabled;
  const setIsPoseEnabled = useCallback((enabled: boolean) => {
    if (!isControlled) setInternalPoseEnabled(enabled);
    if (enabled) setHasEverEnabledOverlay(true);
    onPoseEnabledChange?.(enabled);
  }, [isControlled, onPoseEnabledChange]);

  // Model settings
  const [selectedModel, setSelectedModel] = useState<SupportedModel>(initialModel);
  const [blazePoseModelType, setBlazePoseModelType] = useState<"lite" | "full" | "heavy">("full");
  const [useAccurateMode, setUseAccurateMode] = useState(initialUseAccurateMode);
  const [enableSmoothing, setEnableSmoothing] = useState(true);
  const [confidenceMode, setConfidenceMode] = useState<"standard" | "high" | "low">(initialConfidenceMode);
  const [resolutionMode, setResolutionMode] = useState<"fast" | "balanced" | "accurate">(initialResolutionMode);
  const [maxPoses, setMaxPoses] = useState(1);
  const [selectedPoseIndex, setSelectedPoseIndex] = useState(0);

  // Display settings
  const [showSkeleton, setShowSkeleton] = useState(initialShowSkeleton);
  const [showTrajectories, setShowTrajectories] = useState(initialShowTrajectories);
  const [smoothTrajectories, setSmoothTrajectories] = useState(true);
  const [showFaceLandmarks, setShowFaceLandmarks] = useState(false);
  const [showTrackingId, setShowTrackingId] = useState(initialShowTrackingId);
  const [playbackSpeed, setPlaybackSpeed] = useState(initialPlaybackSpeed);
  const [selectedJoints, setSelectedJoints] = useState<number[]>(initialSelectedJoints);

  // Angle measurement
  const [showAngles, setShowAngles] = useState(initialShowAngles);
  const [enableAngleClicking, setEnableAngleClicking] = useState(false);
  const [selectedAngleJoints, setSelectedAngleJoints] = useState<number[]>([]);
  const [measuredAngles, setMeasuredAngles] = useState<Array<[number, number, number]>>(
    initialMeasuredAngles as [number, number, number][]
  );
  const [angleMenuOpen, setAngleMenuOpen] = useState(false);

  // Velocity
  const [showVelocity, setShowVelocity] = useState(initialShowVelocity);
  const [velocityWrist, setVelocityWrist] = useState<"left" | "right">(initialVelocityWrist);

  // Joint stabilization (legacy - simple noise reduction)
  const [stabilizationEnabled, setStabilizationEnabled] = useState(false);
  const [stabilizationStrength, setStabilizationStrength] = useState(0.5);

  // Pose stability filter (advanced - banana frame detection)
  const [stabilityFilterEnabled, setStabilityFilterEnabled] = useState(false);
  const [stabilityFilterConfig, setStabilityFilterConfig] = useState({
    MAX_SEGMENT_CHANGE: 1.25,  // 25% segment length change
    MAX_ANGLE_CHANGE: 25,       // 25 degree angle change
    SIM_THRESHOLD: 0.8,
    enableSimulation: false,
    enableMirrorRecovery: true,  // Use stable opposite side when one side is corrupted
    mirrorOnlyMode: true,        // Simple mode: just mirror, skip state machine
  });
  const [stabilityState, setStabilityState] = useState<StabilityState>(StabilityState.NORMAL);
  const [stabilityStableCount, setStabilityStableCount] = useState(0);
  const [stabilitySimilarity, setStabilitySimilarity] = useState<number | null>(null);

  // Joint displacement chart
  const [showDisplacementChart, setShowDisplacementChart] = useState(false);
  // Joint acceleration chart
  const [showAccelerationChart, setShowAccelerationChart] = useState(false);

  // Pose data persistence (S3 cache)
  const [serverPoseDataLoaded, setServerPoseDataLoaded] = useState(false);
  const [serverPoseDataChecked, setServerPoseDataChecked] = useState(false);
  const [poseDataSaved, setPoseDataSaved] = useState(false);

  // Object detection
  const [isObjectDetectionEnabled, setIsObjectDetectionEnabled] = useState(false);
  const [selectedObjectModel, setSelectedObjectModel] = useState<"YOLOv8n" | "YOLOv8s" | "YOLOv8m">("YOLOv8n");
  const [objectConfidenceThreshold, setObjectConfidenceThreshold] = useState(0.5);
  const [objectIoUThreshold, setObjectIoUThreshold] = useState(0.45);
  const [sportFilter, setSportFilter] = useState<"all" | "tennis" | "pickleball" | "basketball" | "baseball" | "skating">("pickleball");
  const [showObjectLabels, setShowObjectLabels] = useState(true);
  const [enableObjectTracking, setEnableObjectTracking] = useState(true);
  const [currentObjects, setCurrentObjects] = useState<ObjectDetectionResult[]>([]);

  // Projectile detection
  const [isProjectileDetectionEnabled, setIsProjectileDetectionEnabled] = useState(false);
  const [selectedProjectileModel, setSelectedProjectileModel] = useState<"TrackNet" | "TrackNetV2">("TrackNet");
  const [projectileConfidenceThreshold, setProjectileConfidenceThreshold] = useState(0.5);
  const [showProjectileTrajectory, setShowProjectileTrajectory] = useState(true);
  const [showProjectilePrediction, setShowProjectilePrediction] = useState(false);
  const [currentProjectile, setCurrentProjectile] = useState<ProjectileDetectionResult | null>(null);

  // Frame analysis
  const [showCourtOverlay, setShowCourtOverlay] = useState(true);

  // Image insight
  const [isImageInsightLoading, setIsImageInsightLoading] = useState(false);
  const [imageInsightError, setImageInsightError] = useState<string | null>(null);

  // UI state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  const [localTheatreMode, setLocalTheatreMode] = useState(theatreMode);
  const [isShortScreenView, setIsShortScreenView] = useState(false);
  const [baseMaxHeight, setBaseMaxHeight] = useState("720px");
  const isMobile = useIsMobile();

  // Hooks
  const { dimensions, isPortraitVideo } = useVideoDimensions({
    videoRef,
    containerRef,
    initialWidth: width,
    initialHeight: height,
    playbackSpeed,
  });
  const videoFPS = useVideoFPS(videoRef);

  const { velocityStatsLeft, velocityStatsRight, hasLeftElbow, hasRightElbow } = useVelocityTracking({
    currentPoses,
    measuredAngles,
    selectedModel,
    currentFrame,
    currentTime: videoRef.current?.currentTime || 0,
    enabled: showVelocity,
  });

  const { jointTrajectories, clearTrajectories } = useJointTrajectories({
    currentPoses,
    showTrajectories,
    selectedJoints,
    currentFrame,
    dimensions,
  });

  const { stabilizePoses, resetStabilization } = useJointStabilization({
    enabled: stabilizationEnabled,
    strength: stabilizationStrength,
  });

  const { processPoses: processStabilityFilter, reset: resetStabilityFilter, config: stabilityConfig } = 
    usePoseStabilityFilter({
      enabled: stabilityFilterEnabled,
      config: stabilityFilterConfig,
    });

  const { recordFrame: recordJointFrame, getSegmentHistory, getAngleHistory, getAccelerationHistory, clearHistory: clearJointHistory } = 
    useJointHistory({
      enabled: showDisplacementChart || showAccelerationChart,
    });

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

  const {
    isAnalyzing: isTrophyAnalyzing,
    result: trophyResult,
    detectTrophyPosition,
    clearResult: clearTrophyResult,
  } = useTrophyDetection({ preprocessedPoses: new Map(), selectedModel, videoFPS, selectedPoseIndex });

  const {
    isAnalyzing: isContactAnalyzing,
    result: contactResult,
    detectContactPoint,
    clearResult: clearContactResult,
  } = useContactPointDetection({ preprocessedPoses: new Map(), selectedModel, videoFPS, selectedPoseIndex });

  const {
    isAnalyzing: isLandingAnalyzing,
    result: landingResult,
    detectLanding,
    clearResult: clearLandingResult,
  } = useLandingDetection({ preprocessedPoses: new Map(), selectedModel, videoFPS, selectedPoseIndex });

  // Protocol selector state
  const [selectedProtocol, setSelectedProtocol] = useState<"serve" | "swings" | "swings-v2">("serve");
  
  // Swing detection config
  const [swingRequireOutwardMotion, setSwingRequireOutwardMotion] = useState(true);

  // Computed values
  const videoMaxHeight = compactMode ? "100%" : (isPortraitVideo ? "min(450px, 50vh)" : baseMaxHeight);
  
  // Apply stability filter and stabilization to poses for display
  const displayPoses = useMemo(() => {
    if (currentPoses.length === 0) {
      return currentPoses;
    }

    let processedPoses = currentPoses;

    // First apply banana frame detection/recovery
    if (stabilityFilterEnabled) {
      const results = processStabilityFilter(currentPoses);
      processedPoses = results.map(r => r.pose);
      
      // Update state for UI (use first pose's state)
      if (results.length > 0) {
        const firstResult = results[0];
        // Only update if changed to avoid unnecessary re-renders
        if (firstResult.state !== stabilityState) {
          setStabilityState(firstResult.state);
        }
        if (firstResult.stableCount !== stabilityStableCount) {
          setStabilityStableCount(firstResult.stableCount);
        }
        if (firstResult.similarity !== stabilitySimilarity) {
          setStabilitySimilarity(firstResult.similarity);
        }
      }
    }

    // Then apply simple joint stabilization if enabled
    if (stabilizationEnabled) {
      processedPoses = stabilizePoses(processedPoses);
    }

    return processedPoses;
  }, [
    currentPoses, 
    stabilityFilterEnabled, 
    processStabilityFilter, 
    stabilizationEnabled, 
    stabilizePoses,
    stabilityState,
    stabilityStableCount,
    stabilitySimilarity,
  ]);
  
  const selectedPose = displayPoses.length > 0 
    ? displayPoses[Math.min(selectedPoseIndex, displayPoses.length - 1)] 
    : null;
  const currentConfidence = CONFIDENCE_PRESETS[confidenceMode];
  const currentResolution = useMemo(() => RESOLUTION_PRESETS[resolutionMode], [resolutionMode]);

  const effectiveModelType = useMemo(() => {
    if (selectedModel === "BlazePose") return blazePoseModelType;
    return maxPoses > 1 ? "MultiPose.Lightning" : (useAccurateMode ? "SinglePose.Thunder" : "SinglePose.Lightning");
  }, [selectedModel, blazePoseModelType, maxPoses, useAccurateMode]);

  // Pose detection hook
  const { isLoading, error, isDetecting, detectPose, startDetection, stopDetection, clearModelCache } =
    usePoseDetection({
      model: selectedModel,
      modelType: effectiveModelType,
      enableSmoothing,
      minPoseScore: currentConfidence.minPoseScore,
      minPartScore: currentConfidence.minPartScore,
      inputResolution: selectedModel === "MoveNet" ? currentResolution : undefined,
      maxPoses: selectedModel === "MoveNet" ? maxPoses : 1,
      enabled: isPoseEnabled,
    });

  // Preprocessing hook
  const preprocessing = useVideoPreprocessing({
    videoRef,
    detectPose,
    videoFPS,
    isLoading,
    isPoseEnabled,
    isVideoMetadataLoaded,
    compactMode,
    allowPreprocessing,
    setCurrentPoses,
    setIsPlaying,
    // Disable smoothing during preprocessing for deterministic results
    onSetSmoothing: setEnableSmoothing,
  });

  // Swing detection protocol V1 (velocity-based)
  const {
    isAnalyzing: isSwingAnalyzing,
    result: swingResult,
    detectSwings,
    clearResult: clearSwingResult,
  } = useSwingDetection({ 
    preprocessedPoses: preprocessing.preprocessedPoses, 
    selectedModel, 
    videoFPS, 
    selectedPoseIndex 
  });

  // Swing detection protocol V2 (acceleration-based with prominence)
  const {
    isAnalyzing: isSwingV2Analyzing,
    result: swingV2Result,
    detectSwings: detectSwingsV2,
    clearResult: clearSwingV2Result,
  } = useSwingDetectionV2({ 
    preprocessedPoses: preprocessing.preprocessedPoses, 
    selectedModel, 
    videoFPS, 
    selectedPoseIndex 
  });

  // Object detection hook
  const objectClassFilter = useMemo(() => {
    const { SPORT_FILTERS } = require("@/types/detection");
    return sportFilter === "all" ? undefined : SPORT_FILTERS[sportFilter];
  }, [sportFilter]);

  const { detector: objectDetector, isLoading: isObjectDetectionLoading, error: objectDetectionError, detectObjects } =
    useObjectDetection({
      model: selectedObjectModel,
      confidenceThreshold: objectConfidenceThreshold,
      iouThreshold: objectIoUThreshold,
      classFilter: objectClassFilter,
      enableTracking: enableObjectTracking,
      enabled: isObjectDetectionEnabled || isProjectileDetectionEnabled,
      useYOLOv8: true,
    });

  // Projectile detection hook
  const { isLoading: isProjectileDetectionLoading, error: projectileDetectionError, detectProjectile } =
    useProjectileDetection({
      model: selectedProjectileModel,
      confidenceThreshold: projectileConfidenceThreshold,
      trajectoryLength: showProjectileTrajectory ? 30 : 10,
      videoFPS,
      enabled: isProjectileDetectionEnabled,
      useYOLODetections: true,
    });

  // Canvas drawing hook
  // Hide pose overlay during preprocessing - user shouldn't see the scanning
  const drawingPoses = preprocessing.isBackgroundPreprocessing ? [] : displayPoses;
  const drawingSelectedPose = preprocessing.isBackgroundPreprocessing ? null : selectedPose;
  
  useCanvasDrawing({
    canvasRef,
    videoRef,
    currentPoses: drawingPoses,
    selectedPose: drawingSelectedPose,
    selectedModel,
    showSkeleton,
    showFaceLandmarks,
    showTrackingId,
    showAngles,
    measuredAngles,
    selectedAngleJoints,
    showTrajectories,
    smoothTrajectories,
    jointTrajectories,
    isObjectDetectionEnabled,
    currentObjects: currentObjects as any,
    showObjectLabels,
    isProjectileDetectionEnabled,
    currentProjectile: currentProjectile as any,
    showCourtOverlay,
    courtResult,
    isPlaying,
    dimensions,
  });

  // 3D Pose for BlazePose
  const pose3D = useMemo(() => {
    if (isPoseEnabled && selectedModel === "BlazePose" && selectedPose?.keypoints3D?.length) {
      return selectedPose;
    }
    return null;
  }, [isPoseEnabled, selectedModel, selectedPose]);

  // Effects
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

  useEffect(() => {
    import("@/utils/storage").then(({ getDeveloperMode, getTheatreMode }) => {
      setDeveloperMode(getDeveloperMode());
      setLocalTheatreMode(getTheatreMode());
    });
    const handleDeveloperModeChange = () => {
      import("@/utils/storage").then(({ getDeveloperMode }) => setDeveloperMode(getDeveloperMode()));
    };
    const handleTheatreModeChange = () => {
      import("@/utils/storage").then(({ getTheatreMode }) => setLocalTheatreMode(getTheatreMode()));
    };
    window.addEventListener("developer-mode-change", handleDeveloperModeChange);
    window.addEventListener("theatre-mode-change", handleTheatreModeChange);
    return () => {
      window.removeEventListener("developer-mode-change", handleDeveloperModeChange);
      window.removeEventListener("theatre-mode-change", handleTheatreModeChange);
    };
  }, []);

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

  useEffect(() => {
    if (currentPoses.length > 0 && selectedPoseIndex >= currentPoses.length) {
      setSelectedPoseIndex(currentPoses.length - 1);
    }
  }, [currentPoses.length, selectedPoseIndex]);

  // Notify external consumers when poses change (use stabilized poses)
  useEffect(() => {
    onPoseChange?.(displayPoses);
  }, [displayPoses, onPoseChange]);

  useEffect(() => {
    setIsVideoMetadataLoaded(false);
    // Reset pose data state when video URL changes
    setServerPoseDataLoaded(false);
    setServerPoseDataChecked(false);
    setPoseDataSaved(false);
  }, [videoUrl]);

  // Load pose data from S3 if available (runs once when video is ready)
  useEffect(() => {
    async function loadFromServer() {
      // Only try once, need videoS3Key and video must be ready
      if (!videoS3Key || serverPoseDataChecked || !isVideoMetadataLoaded || skipPreprocessing) return;
      
      try {
        detectionLogger.info(`[VideoPoseViewer] Checking for cached pose data: ${videoS3Key}`);
        const result = await loadPoseData(videoS3Key);
        
        if (result.success && result.data) {
          // Convert stored data to Map format
          const posesMap = convertToPreprocessedPoses(result.data);
          
          if (posesMap.size > 0) {
            // Load cached poses into preprocessing hook
            preprocessing.loadExternalPoses(posesMap, result.data.videoFPS || 30);
            setServerPoseDataLoaded(true);
            // Auto-enable movement analysis since cached data loads instantly
            setIsPoseEnabled(true);
            detectionLogger.info(`[VideoPoseViewer] Loaded ${posesMap.size} frames from S3 cache at ${result.data.videoFPS} FPS, auto-enabled overlay`);
          }
        } else {
          detectionLogger.debug(`[VideoPoseViewer] No cached pose data found for ${videoS3Key}`);
        }
      } catch (error) {
        detectionLogger.error(`[VideoPoseViewer] Failed to load pose data:`, error);
      } finally {
        setServerPoseDataChecked(true);
      }
    }
    
    loadFromServer();
  }, [videoS3Key, serverPoseDataChecked, isVideoMetadataLoaded, skipPreprocessing]);

  // Save pose data to S3 after preprocessing completes
  useEffect(() => {
    async function saveToServer() {
      // Only save if: we have videoS3Key, preprocessing completed, and haven't saved yet
      if (!videoS3Key || 
          !preprocessing.usePreprocessing || 
          preprocessing.preprocessedPoses.size === 0 ||
          poseDataSaved ||
          serverPoseDataLoaded ||  // Don't save if we loaded from server (already saved)
          skipPreprocessing) {
        return;
      }
      
      try {
        detectionLogger.info(`[VideoPoseViewer] Saving ${preprocessing.preprocessedPoses.size} frames to S3...`);
        const result = await savePoseData(
          videoS3Key,
          preprocessing.preprocessedPoses,
          preprocessing.preprocessingFPS,
          selectedModel
        );
        
        if (result.success) {
          setPoseDataSaved(true);
          onPoseDataSaved?.(result.s3Key || "");
          detectionLogger.info(`[VideoPoseViewer] Pose data saved to S3 successfully`);
        } else {
          detectionLogger.error(`[VideoPoseViewer] Failed to save pose data:`, result.error);
        }
      } catch (error) {
        detectionLogger.error(`[VideoPoseViewer] Error saving pose data:`, error);
      }
    }
    
    saveToServer();
  }, [videoS3Key, preprocessing.usePreprocessing, preprocessing.preprocessedPoses.size, preprocessing.preprocessingFPS, poseDataSaved, serverPoseDataLoaded, selectedModel, onPoseDataSaved, skipPreprocessing]);

  // Pose detection during playback
  useEffect(() => {
    const video = videoRef.current;
    if (preprocessing.usePreprocessing) {
      stopDetection();
      return;
    }
    if (!video || !showSkeleton || !isPlaying || isLoading || !isPoseEnabled || !isVideoMetadataLoaded) {
      stopDetection();
      return;
    }
    if (!video.videoWidth || !video.videoHeight) {
      stopDetection();
      return;
    }
    startDetection(video, (poses: PoseDetectionResult[]) => setCurrentPoses(poses));
    return () => stopDetection();
  }, [isPlaying, showSkeleton, isLoading, preprocessing.usePreprocessing, isPoseEnabled, isVideoMetadataLoaded, startDetection, stopDetection]);

  // Object detection during playback
  useEffect(() => {
    const video = videoRef.current;
    const shouldRun = (isObjectDetectionEnabled || isProjectileDetectionEnabled) && 
                      !isObjectDetectionLoading && objectDetector !== null && detectObjects !== undefined;
    if (!video || !shouldRun || !isPlaying) return;

    let rafId: number;
    let lastDetectionTime = 0;
    const detectionInterval = 100;

    const detectLoop = async () => {
      if (!video.paused && !video.ended) {
        const now = performance.now();
        if (now - lastDetectionTime >= detectionInterval) {
          try {
            const objects = await detectObjects(video);
            if (isObjectDetectionEnabled) setCurrentObjects(objects);
            if (isProjectileDetectionEnabled && detectProjectile) {
              const frame = Math.floor(video.currentTime * videoFPS);
              const projectile = detectProjectile(objects, frame, video.currentTime);
              setCurrentProjectile(projectile);
            }
            lastDetectionTime = now;
          } catch (err) {
            detectionLogger.error("Error detecting objects:", err);
          }
        }
        rafId = requestAnimationFrame(detectLoop);
      }
    };
    detectLoop();
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [isPlaying, isObjectDetectionEnabled, isObjectDetectionLoading, isProjectileDetectionEnabled, objectDetector, detectObjects, detectProjectile, videoFPS]);

  // Sync preprocessed poses during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !preprocessing.usePreprocessing || !isPlaying) return;

    let rafId: number;
    let lastFrame = -1;

    const syncPoses = () => {
      if (!video.paused && !video.ended) {
        const frame = Math.floor(video.currentTime * preprocessing.preprocessingFPS);
        if (frame !== lastFrame && preprocessing.preprocessedPoses.has(frame)) {
          const poses = preprocessing.preprocessedPoses.get(frame);
          if (poses?.length) {
            setCurrentPoses(poses);
            lastFrame = frame;
          }
        }
        rafId = requestAnimationFrame(syncPoses);
      }
    };
    syncPoses();
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [preprocessing.usePreprocessing, isPlaying, preprocessing.preprocessingFPS, preprocessing.preprocessedPoses]);

  // Sync poses when user seeks/scrubs the timeline (works when paused)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !preprocessing.usePreprocessing) return;

    const handleSeeked = () => {
      const frame = Math.floor(video.currentTime * preprocessing.preprocessingFPS);
      if (preprocessing.preprocessedPoses.has(frame)) {
        const poses = preprocessing.preprocessedPoses.get(frame);
        if (poses?.length) {
          setCurrentPoses(poses);
        }
      }
    };

    video.addEventListener("seeked", handleSeeked);
    return () => video.removeEventListener("seeked", handleSeeked);
  }, [preprocessing.usePreprocessing, preprocessing.preprocessingFPS, preprocessing.preprocessedPoses]);

  // Auto-play
  useEffect(() => {
    if (!isLoading && autoPlay && videoRef.current?.paused) {
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.play().then(() => {
        if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
        setIsPlaying(true);
        setHasStartedPlaying(true);
      }).catch((e) => { if (e.name !== "AbortError") detectionLogger.error("Video play error:", e); });
    }
  }, [isLoading, autoPlay, playbackSpeed]);

  // Auto-run key frame detections based on selected protocol
  useEffect(() => {
    if (!preprocessing.usePreprocessing || preprocessing.preprocessedPoses.size === 0) return;
    
    if (selectedProtocol === "serve") {
      // Serve protocol: detect trophy, contact, landing
      if (!trophyResult && !contactResult && !landingResult) {
        detectionLogger.debug("🎯 Auto-detecting serve key frames...");
        detectTrophyPosition("auto");
        detectContactPoint("auto");
        detectLanding();
      }
    } else if (selectedProtocol === "swings") {
      // Swings protocol V1: detect swings and contact point
      if (!swingResult) {
        detectionLogger.debug("🎯 Auto-detecting swings (V1)...");
        detectSwings({ requireOutwardMotion: swingRequireOutwardMotion });
      }
      if (!contactResult) {
        detectionLogger.debug("🎯 Auto-detecting contact point...");
        detectContactPoint("auto");
      }
    } else if (selectedProtocol === "swings-v2") {
      // Swings protocol V2: acceleration-based detection
      if (!swingV2Result) {
        detectionLogger.debug("🎯 Auto-detecting swings (V2 - acceleration)...");
        detectSwingsV2();
      }
      if (!contactResult) {
        detectionLogger.debug("🎯 Auto-detecting contact point...");
        detectContactPoint("auto");
      }
    }
  }, [
    preprocessing.usePreprocessing, 
    preprocessing.preprocessedPoses.size, 
    selectedProtocol,
    trophyResult, 
    contactResult, 
    landingResult, 
    swingResult,
    swingV2Result,
    swingRequireOutwardMotion,
    detectTrophyPosition, 
    detectContactPoint, 
    detectLanding,
    detectSwings,
    detectSwingsV2,
  ]);

  // Trajectory speed adjustment
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = showTrajectories ? 0.25 : playbackSpeed;
  }, [showTrajectories, playbackSpeed]);

  // Track frame number
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const updateFrame = () => setCurrentFrame(Math.floor(video.currentTime * videoFPS));
    video.addEventListener("timeupdate", updateFrame);
    return () => video.removeEventListener("timeupdate", updateFrame);
  }, [videoFPS]);

  // Record frames for displacement/acceleration chart (works independently of stability filter)
  useEffect(() => {
    if ((!showDisplacementChart && !showAccelerationChart) || currentPoses.length === 0) return;
    
    const video = videoRef.current;
    const timestamp = video?.currentTime || 0;
    // Only mark as banana if stability filter is enabled and in recovery
    const isBanana = stabilityFilterEnabled && stabilityState === StabilityState.RECOVERY;
    
    // Record the first pose for charting
    recordJointFrame(currentPoses[0], currentFrame, timestamp, isBanana);
  }, [showDisplacementChart, showAccelerationChart, currentPoses, currentFrame, stabilityFilterEnabled, stabilityState, recordJointFrame]);

  // Handlers
  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch((e) => { if (e.name !== "AbortError") detectionLogger.error("Video play error:", e); });
      setIsPlaying(true);
      setHasStartedPlaying(true);
    }
  }, [isPlaying]);

  const handleReset = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setCurrentPoses([]);
    clearTrajectories();
    confidenceStats.current.clear();
  }, [clearTrajectories]);

  const handleSeekToFrame = useCallback((frame: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = frame / videoFPS;
    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
    }
  }, [videoFPS]);

  const handleFrameStep = useCallback(async (direction: "forward" | "backward") => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) { video.pause(); setIsPlaying(false); }
    const frameDuration = 1 / videoFPS;
    video.currentTime = direction === "forward" 
      ? Math.min(video.currentTime + frameDuration, video.duration)
      : Math.max(video.currentTime - frameDuration, 0);
    const lookupFPS = preprocessing.usePreprocessing ? preprocessing.preprocessingFPS : videoFPS;
    const newFrame = Math.floor(video.currentTime * lookupFPS);
    setCurrentFrame(newFrame);
    if (preprocessing.usePreprocessing && preprocessing.preprocessedPoses.has(newFrame)) {
      setCurrentPoses(preprocessing.preprocessedPoses.get(newFrame) || []);
    } else if (detectPose && showSkeleton && !isLoading && isPoseEnabled) {
      try {
        const poses = await detectPose(video);
        setCurrentPoses(poses);
      } catch (err) {
        detectionLogger.error("Error detecting pose on frame step:", err);
      }
    }
  }, [videoFPS, preprocessing, detectPose, showSkeleton, isLoading, isPoseEnabled]);

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    stopDetection();
  }, [stopDetection]);

  const handleTogglePose = useCallback(() => {
    if (isPoseEnabled) {
      setIsPoseEnabled(false);
      setIsExpanded(false);
      setCurrentPoses([]);
      clearTrajectories();
      resetStabilization();
      resetStabilityFilter();
      clearJointHistory();
      setStabilityState(StabilityState.NORMAL);
      stopDetection();
    } else {
      setIsPoseEnabled(true);
      setIsExpanded(true);
      if (!initialPoseEnabled) {
        setUseAccurateMode(true);
        setConfidenceMode("low");
        setResolutionMode("accurate");
        setShowTrackingId(true);
        setShowAngles(true);
        setMeasuredAngles([[6, 8, 10], [12, 14, 16]]);
        setShowVelocity(false);
        setVelocityWrist("right");
        setSelectedJoints([10]);
        setShowTrajectories(false);
      }
      confidenceStats.current.clear();
    }
  }, [isPoseEnabled, setIsPoseEnabled, clearTrajectories, resetStabilization, resetStabilityFilter, clearJointHistory, stopDetection, initialPoseEnabled]);

  const handlePrevPose = useCallback(() => {
    setSelectedPoseIndex((prev) => (prev > 0 ? prev - 1 : currentPoses.length - 1));
  }, [currentPoses.length]);

  const handleNextPose = useCallback(() => {
    setSelectedPoseIndex((prev) => (prev < currentPoses.length - 1 ? prev + 1 : 0));
  }, [currentPoses.length]);

  const toggleAnglePreset = useCallback((angle: [number, number, number]) => {
    const [idxA, idxB, idxC] = angle;
    const existingIndex = measuredAngles.findIndex(
      ([a, b, c]) => (a === idxA && b === idxB && c === idxC) || (a === idxC && b === idxB && c === idxA)
    );
    if (existingIndex !== -1) {
      setMeasuredAngles(measuredAngles.filter((_, i) => i !== existingIndex));
    } else {
      setMeasuredAngles([...measuredAngles, angle]);
    }
  }, [measuredAngles]);

  const captureAnnotatedFrame = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const poseCanvas = canvasRef.current;
      if (!video || !poseCanvas) { resolve(null); return; }
      const compositeCanvas = document.createElement("canvas");
      compositeCanvas.width = video.videoWidth;
      compositeCanvas.height = video.videoHeight;
      const ctx = compositeCanvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(video, 0, 0);
      ctx.drawImage(poseCanvas, 0, 0, video.videoWidth, video.videoHeight);
      compositeCanvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    });
  }, []);

  const handleImageInsight = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !selectedPose) {
      setImageInsightError("No pose detected. Enable Analyse Movement and ensure a player is visible.");
      return;
    }
    setIsImageInsightLoading(true);
    setImageInsightError(null);
    try {
      const previousAngles = [...measuredAngles];
      setMeasuredAngles(ALL_ANGLE_PRESETS);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const frameBlob = await captureAnnotatedFrame();
      if (!frameBlob) throw new Error("Failed to capture frame");
      setMeasuredAngles(previousAngles);
      window.dispatchEvent(new CustomEvent("image-insight-request", {
        detail: { imageBlob: frameBlob, domainExpertise: sportFilter !== "all" ? sportFilter : "all-sports", timestamp: Date.now() }
      }));
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
    } catch (error) {
      detectionLogger.error("❌ Image Insight error:", error);
      setImageInsightError(error instanceof Error ? error.message : "Failed to analyze frame");
    } finally {
      setIsImageInsightLoading(false);
    }
  }, [selectedPose, measuredAngles, captureAnnotatedFrame, sportFilter]);

  const handleAnalyzeCourt = useCallback(async () => {
    const video = videoRef.current;
    if (video) await analyzeFrame(video, "court");
  }, [analyzeFrame]);

  const handleAnalyzeCameraAngle = useCallback(async () => {
    const video = videoRef.current;
    if (video) await analyzeFrame(video, "camera-angle");
  }, [analyzeFrame]);

  const handleAnalyzeBoth = useCallback(async () => {
    const video = videoRef.current;
    if (video) await analyzeFrameMultiple(video, ["court", "camera-angle"]);
  }, [analyzeFrameMultiple]);

  const handleDetectTrophy = useCallback(async () => {
    const result = await detectTrophyPosition("auto");
    if (result && videoRef.current) videoRef.current.currentTime = result.trophyTimestamp;
  }, [detectTrophyPosition]);

  const handleDetectContact = useCallback(async () => {
    const result = await detectContactPoint("auto");
    if (result && videoRef.current) videoRef.current.currentTime = result.contactTimestamp;
  }, [detectContactPoint]);

  const handleDetectLanding = useCallback(async () => {
    const result = await detectLanding();
    if (result && videoRef.current) videoRef.current.currentTime = result.landingTimestamp;
  }, [detectLanding]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!enableAngleClicking || currentPoses.length === 0) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !selectedPose) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const vidScaleX = canvas.width / video.videoWidth;
    const vidScaleY = canvas.height / video.videoHeight;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    let minDist = Infinity;
    let nearestJoint = -1;
    selectedPose.keypoints.forEach((kp, index) => {
      if ((kp.score ?? 0) < 0.3) return;
      const kx = kp.x * vidScaleX;
      const ky = kp.y * vidScaleY;
      const dist = Math.sqrt((kx - clickX) ** 2 + (ky - clickY) ** 2);
      if (dist < 30 && dist < minDist) { minDist = dist; nearestJoint = index; }
    });

    if (nearestJoint !== -1) {
      const newSelection = [...selectedAngleJoints, nearestJoint];
      if (newSelection.length === 3) {
        setMeasuredAngles([...measuredAngles, [newSelection[0], newSelection[1], newSelection[2]]]);
        setSelectedAngleJoints([]);
      } else {
        setSelectedAngleJoints(newSelection);
      }
    }
  }, [enableAngleClicking, currentPoses, selectedPose, selectedAngleJoints, measuredAngles]);

  const getCurrentAngleValue = useCallback((angle: [number, number, number]): number | null => {
    if (!selectedPose) return null;
    const [idxA, idxB, idxC] = angle;
    const pointA = selectedPose.keypoints[idxA];
    const pointB = selectedPose.keypoints[idxB];
    const pointC = selectedPose.keypoints[idxC];
    if (!pointA || !pointB || !pointC) return null;
    if ((pointA.score ?? 0) < 0.3 || (pointB.score ?? 0) < 0.3 || (pointC.score ?? 0) < 0.3) return null;
    return calculateAngle(pointA, pointB, pointC);
  }, [selectedPose]);

  return (
    <Flex direction="column" gap="0" style={compactMode ? { height: "100%", width: "100%" } : { width: "fit-content" }}>
      {/* 3D Pose Viewer */}
      {isPoseEnabled && selectedModel === "BlazePose" && (
        <Pose3DSection
          pose3D={pose3D}
          currentPoses={currentPoses}
          dimensions={dimensions}
          showFaceLandmarks={showFaceLandmarks}
        />
      )}

      {/* Video Container */}
      <Box
        ref={containerRef}
        style={{
          position: "relative",
          width: compactMode ? "100%" : "auto",
          height: compactMode ? "100%" : "auto",
          maxWidth: "100%",
          maxHeight: compactMode ? "100%" : videoMaxHeight,
          backgroundColor: "transparent",
          borderRadius: compactMode ? 0 : (showControls && (isExpanded || preprocessing.usePreprocessing) ? "var(--radius-3) var(--radius-3) 0 0" : "var(--radius-3)"),
          overflow: "hidden",
          margin: "0 auto",
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
            if (video && canvasRef.current) {
              canvasRef.current.width = video.videoWidth;
              canvasRef.current.height = video.videoHeight;
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
            objectFit: "contain",
            pointerEvents: enableAngleClicking ? "auto" : "none",
            zIndex: 10,
            cursor: enableAngleClicking ? "crosshair" : "default",
          }}
        />

        {/* Top-Left Buttons */}
        <Flex
          gap={isPortraitVideo || isMobile ? "1" : "2"}
          style={{
            position: "absolute",
            top: compactMode ? "4px" : (isPortraitVideo ? "8px" : "12px"),
            left: compactMode ? "4px" : (isPortraitVideo ? "8px" : "12px"),
            zIndex: 30,
          }}
        >
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

          {!compactMode && (
            <Tooltip content={isPoseEnabled ? "Disable Movement Analysis" : "Analyse Movement"}>
              <Button
                className={`${buttonStyles.actionButtonSquare} ${!preprocessing.usePreprocessing ? buttonStyles.actionButtonPulse : ""}`}
                onClick={handleTogglePose}
                style={{
                  height: isPortraitVideo || isMobile ? "24px" : "28px",
                  padding: isPortraitVideo || isMobile ? "0 8px" : "0 10px",
                  fontSize: isMobile ? "10px" : "11px",
                  minWidth: preprocessing.usePreprocessing ? (isPortraitVideo || isMobile ? "24px" : "28px") : undefined,
                }}
              >
                {preprocessing.usePreprocessing ? (
                  <MagicWandIcon width={isPortraitVideo || isMobile ? 12 : 14} height={isPortraitVideo || isMobile ? 12 : 14} />
                ) : (
                  <Text size="2" weight="medium" style={{ fontSize: isMobile ? "10px" : "11px" }}>
                    Analyse Movement
                  </Text>
                )}
              </Button>
            </Tooltip>
          )}
        </Flex>

        {/* Stats Overlay */}
        {!compactMode && (
          <StatsOverlay
            currentFrame={currentFrame}
            videoFPS={videoFPS}
            currentPoses={currentPoses}
            selectedPoseIndex={selectedPoseIndex}
            isPoseEnabled={isPoseEnabled}
            isObjectDetectionEnabled={isObjectDetectionEnabled}
            isProjectileDetectionEnabled={isProjectileDetectionEnabled}
            currentObjects={currentObjects}
            currentProjectile={currentProjectile}
            isPortraitVideo={isPortraitVideo}
            isMobile={isMobile}
            confidenceStats={confidenceStats}
            onPrevPose={handlePrevPose}
            onNextPose={handleNextPose}
          />
        )}

        {/* Velocity Display */}
        <Flex
          direction="column"
          gap={isPortraitVideo ? "1" : "2"}
          style={{
            position: "absolute",
            top: isPortraitVideo ? "8px" : "12px",
            right: isPortraitVideo ? "8px" : "12px",
            zIndex: 15,
            pointerEvents: "none",
            alignItems: "flex-end",
          }}
        >
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

        {/* Overlays */}
        {isPoseEnabled && (
          <LoadingOverlay
            isLoading={isLoading}
            autoPlay={autoPlay}
            isPlaying={isPlaying}
            hasStartedPlaying={hasStartedPlaying}
          />
        )}

        <PreprocessingProgress
          isBackgroundPreprocessing={preprocessing.isBackgroundPreprocessing}
          backgroundPreprocessProgress={preprocessing.backgroundPreprocessProgress}
          isPortraitVideo={isPortraitVideo}
          compactMode={compactMode}
        />

        {/* Stability Filter State Overlay */}
        <StabilityStateOverlay
          state={stabilityState}
          stableCount={stabilityStableCount}
          requiredStableFrames={stabilityConfig.N_RECOVERY}
          similarity={stabilitySimilarity}
          isEnabled={stabilityFilterEnabled && isPoseEnabled}
          isPortraitVideo={isPortraitVideo}
          isMobile={isMobile}
        />

        <BottomGradientMask showControls={showControls} isExpanded={isExpanded || preprocessing.usePreprocessing} />
      </Box>

      {/* Controls Panel - Always visible when preprocessing is done */}
      {showControls && (isExpanded || preprocessing.usePreprocessing) && (
        <Flex
          direction="column"
          gap="2"
          style={{
            backgroundColor: "black",
            padding: "var(--space-3)",
            borderRadius: "0 0 var(--radius-3) var(--radius-3)",
          }}
        >
          <Flex direction="column" gap="2">
            <Flex gap="2" align="center" wrap="wrap">
              <PlaybackControls
                isPlaying={isPlaying}
                isLoading={isLoading}
                isPreprocessing={preprocessing.isPreprocessing}
                onPlayPause={handlePlayPause}
                onReset={handleReset}
                isPortraitVideo={isPortraitVideo}
              />

              {!preprocessing.isPreprocessing && !preprocessing.usePreprocessing && (
                <>
                  {developerMode && (
                    <Tooltip content="Pre-process all frames">
                      <Button onClick={preprocessing.handlePreprocess} disabled={isLoading} className={buttonStyles.actionButtonSquare} size="2">
                        <MagicWandIcon width="16" height="16" />
                      </Button>
                    </Tooltip>
                  )}
                  <Tooltip content="Previous Frame">
                    <Button onClick={() => handleFrameStep("backward")} disabled={isLoading || preprocessing.isPreprocessing} className={buttonStyles.actionButtonSquare} size="2">
                      <ChevronLeftIcon width="16" height="16" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Next Frame">
                    <Button onClick={() => handleFrameStep("forward")} disabled={isLoading || preprocessing.isPreprocessing} className={buttonStyles.actionButtonSquare} size="2">
                      <ChevronRightIcon width="16" height="16" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Frame Insight – Analyze this frame with AI">
                    <Button
                      onClick={handleImageInsight}
                      disabled={isImageInsightLoading || !selectedPose}
                      className={buttonStyles.actionButtonSquare}
                      size="2"
                      style={{ opacity: selectedPose ? 1 : 0.5 }}
                    >
                      {isImageInsightLoading ? <Spinner size="1" /> : <CameraIcon width="16" height="16" />}
                    </Button>
                  </Tooltip>
                  <AnglesDropdownMenu
                    measuredAngles={measuredAngles}
                    isOpen={angleMenuOpen}
                    onOpenChange={setAngleMenuOpen}
                    onToggleAnglePreset={toggleAnglePreset}
                    onVelocityWristChange={setVelocityWrist}
                  />
                </>
              )}

              {preprocessing.usePreprocessing && (
                <>
                  {developerMode && (
                    <Tooltip content="Disable pre-processed frames">
                      <Button onClick={preprocessing.clearPreprocessedPoses} className={buttonStyles.actionButtonSquare} size="2">
                        <CrossCircledIcon width="16" height="16" />
                      </Button>
                    </Tooltip>
                  )}
                  <Tooltip content="Previous Frame">
                    <Button onClick={() => handleFrameStep("backward")} disabled={isLoading} className={buttonStyles.actionButtonSquare} size="2">
                      <ChevronLeftIcon width="16" height="16" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Next Frame">
                    <Button onClick={() => handleFrameStep("forward")} disabled={isLoading} className={buttonStyles.actionButtonSquare} size="2">
                      <ChevronRightIcon width="16" height="16" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Frame Insight – Analyze this frame with AI">
                    <Button
                      onClick={handleImageInsight}
                      disabled={isImageInsightLoading || !selectedPose}
                      className={`${buttonStyles.actionButtonSquare} ${buttonStyles.actionButtonPulse}`}
                      size="2"
                      style={{ opacity: selectedPose ? 1 : 0.5 }}
                    >
                      {isImageInsightLoading ? <Spinner size="1" /> : <CameraIcon width="16" height="16" />}
                    </Button>
                  </Tooltip>
                  <AnglesDropdownMenu
                    measuredAngles={measuredAngles}
                    isOpen={angleMenuOpen}
                    onOpenChange={setAngleMenuOpen}
                    onToggleAnglePreset={toggleAnglePreset}
                    onVelocityWristChange={setVelocityWrist}
                  />
                </>
              )}
            </Flex>

            {/* Advanced Settings */}
            <CollapsibleSection
              title="Advanced Settings"
              isExpanded={isAdvancedExpanded}
              onToggle={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
              showWhen={developerMode}
            >
              <Flex direction="column" gap="3" p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-3)" }}>
                {/* Protocol Selector */}
                <Flex direction="column" gap="2" p="3" style={{ backgroundColor: "var(--gray-3)", borderRadius: "var(--radius-2)" }}>
                  <Text size="2" weight="medium">Detection Protocol</Text>
                  <Flex align="center" gap="2">
                    <Select.Root
                      value={selectedProtocol}
                      onValueChange={(value) => setSelectedProtocol(value as "serve" | "swings")}
                    >
                      <Select.Trigger 
                        className={selectStyles.selectTriggerStyled} 
                        style={{ flex: 1 }} 
                      />
                      <Select.Content>
                        <Select.Group>
                          <Select.Label>Serve Protocols</Select.Label>
                          <Select.Item value="serve">
                            Serve Analysis (Trophy, Contact, Landing)
                          </Select.Item>
                        </Select.Group>
                        <Select.Separator />
                        <Select.Group>
                          <Select.Label>Rally Protocols</Select.Label>
                          <Select.Item value="swings">
                            Multi-Swing V1 (Velocity)
                          </Select.Item>
                          <Select.Item value="swings-v2">
                            Multi-Swing V2 (Acceleration)
                          </Select.Item>
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>
                    {selectedProtocol === "swings" && (
                      <Button
                        size="2"
                        variant="soft"
                        onClick={() => detectSwings({ requireOutwardMotion: swingRequireOutwardMotion })}
                        disabled={!preprocessing.usePreprocessing || preprocessing.preprocessedPoses.size === 0 || isSwingAnalyzing}
                      >
                        {isSwingAnalyzing ? (
                          <Spinner size="1" />
                        ) : (
                          "Detect"
                        )}
                      </Button>
                    )}
                    {selectedProtocol === "swings-v2" && (
                      <Button
                        size="2"
                        variant="soft"
                        onClick={() => detectSwingsV2()}
                        disabled={!preprocessing.usePreprocessing || preprocessing.preprocessedPoses.size === 0 || isSwingV2Analyzing}
                      >
                        {isSwingV2Analyzing ? (
                          <Spinner size="1" />
                        ) : (
                          "Detect"
                        )}
                      </Button>
                    )}
                  </Flex>
                  {selectedProtocol === "swings" && (
                    <Flex align="center" gap="2" py="1">
                      <Switch
                        size="1"
                        checked={swingRequireOutwardMotion}
                        onCheckedChange={setSwingRequireOutwardMotion}
                      />
                      <Text size="1" color="gray">
                        Outward motion only (filter recovery movements)
                      </Text>
                    </Flex>
                  )}
                  {selectedProtocol === "swings-v2" && (
                    <Text size="1" color="gray">
                      Uses acceleration peaks with prominence detection. Simpler, finds clear spikes.
                    </Text>
                  )}
                  {selectedProtocol === "swings" && swingResult && (
                    <Flex direction="column" gap="2" p="2" style={{ backgroundColor: "var(--gray-4)", borderRadius: "var(--radius-2)" }}>
                      <Flex align="center" justify="between">
                        <Text size="2" weight="medium" style={{ color: "var(--mint-11)" }}>
                          ⚡ {swingResult.totalSwings} swings detected
                        </Text>
                        <Button size="1" variant="ghost" onClick={clearSwingResult}>
                          Clear
                        </Button>
                      </Flex>
                      <Flex wrap="wrap" gap="2">
                        {swingResult.swings.map((swing, i) => (
                          <Button
                            key={i}
                            size="1"
                            variant="soft"
                            onClick={() => handleSeekToFrame(swing.frame)}
                            style={{
                              backgroundColor: swing.dominantSide === "left" ? "rgba(78, 205, 196, 0.2)" : 
                                              swing.dominantSide === "right" ? "rgba(255, 107, 107, 0.2)" : 
                                              "rgba(168, 85, 247, 0.2)",
                            }}
                          >
                            {i + 1}. {swing.timestamp.toFixed(2)}s ({swing.velocityKmh.toFixed(0)}km/h)
                          </Button>
                        ))}
                      </Flex>
                      <Text size="1" color="gray">
                        Max: {swingResult.maxVelocity.toFixed(1)}px/f • 
                        Gaps: {swingResult.framesWithGaps} frames
                      </Text>
                    </Flex>
                  )}
                  {selectedProtocol === "swings-v2" && swingV2Result && (
                    <Flex direction="column" gap="2" p="2" style={{ backgroundColor: "var(--gray-4)", borderRadius: "var(--radius-2)" }}>
                      <Flex align="center" justify="between">
                        <Text size="2" weight="medium" style={{ color: "var(--orange-11)" }}>
                          ⚡ {swingV2Result.totalSwings} swings detected (V2)
                        </Text>
                        <Button size="1" variant="ghost" onClick={clearSwingV2Result}>
                          Clear
                        </Button>
                      </Flex>
                      <Flex wrap="wrap" gap="2">
                        {swingV2Result.swings.map((swing, i) => (
                          <Button
                            key={i}
                            size="1"
                            variant="soft"
                            onClick={() => handleSeekToFrame(swing.frame)}
                            style={{
                              backgroundColor: `rgba(255, 165, 0, ${0.2 + swing.confidence * 0.3})`,
                            }}
                          >
                            {i + 1}. {swing.timestamp.toFixed(2)}s ({swing.prominence.toFixed(1)}x)
                          </Button>
                        ))}
                      </Flex>
                      <Text size="1" color="gray">
                        Max accel: {swingV2Result.maxAcceleration.toFixed(1)}px/f²
                      </Text>
                    </Flex>
                  )}
                  {selectedProtocol === "serve" && (
                    <Text size="1" color="gray">
                      Serve protocols detect Trophy, Contact Point, and Landing automatically after preprocessing.
                    </Text>
                  )}
                </Flex>

                {/* Joint Position Chart */}
                <Flex direction="column" gap="2" p="3" style={{ backgroundColor: "var(--gray-3)", borderRadius: "var(--radius-2)" }}>
                  <Flex align="center" justify="between">
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="medium">Joint Position Chart</Text>
                      <Text size="1" color="gray">Track X/Y position of any joint over time</Text>
                    </Flex>
                    <Switch
                      checked={showDisplacementChart}
                      onCheckedChange={setShowDisplacementChart}
                      size="2"
                    />
                  </Flex>
                {showDisplacementChart && (
                  <JointDisplacementChart
                    getSegmentHistory={getSegmentHistory}
                    getAngleHistory={getAngleHistory}
                    currentFrame={currentFrame}
                    onFrameClick={handleSeekToFrame}
                    onClear={clearJointHistory}
                    isEnabled={showDisplacementChart}
                    videoFPS={videoFPS}
                  />
                )}
                </Flex>

                {/* Joint Acceleration Chart */}
                <Flex direction="column" gap="2" p="3" style={{ backgroundColor: "var(--gray-3)", borderRadius: "var(--radius-2)" }}>
                  <Flex align="center" justify="between">
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="medium">Joint Acceleration Chart</Text>
                      <Text size="1" color="gray">Track velocity/acceleration relative to body center</Text>
                    </Flex>
                    <Switch
                      checked={showAccelerationChart}
                      onCheckedChange={setShowAccelerationChart}
                      size="2"
                    />
                  </Flex>
                  {showAccelerationChart && (
                    <JointAccelerationChart
                      getAccelerationHistory={getAccelerationHistory}
                      currentFrame={currentFrame}
                      onFrameClick={handleSeekToFrame}
                      onClear={clearJointHistory}
                      isEnabled={showAccelerationChart}
                      videoFPS={videoFPS}
                    />
                  )}
                </Flex>

                {/* Playback Speed */}
                <Flex direction="column" gap="1">
                  <Text size="2" color="gray" weight="medium">Playback speed</Text>
                  <Select.Root
                    value={playbackSpeed.toString()}
                    onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}
                    disabled={isLoading || showTrajectories}
                  >
                    <Select.Trigger className={selectStyles.selectTriggerStyled} style={{ width: "100%" }} />
                    <Select.Content>
                      <Select.Item value="0.25">0.25× (Slowest)</Select.Item>
                      <Select.Item value="0.5">0.5× (Slow)</Select.Item>
                      <Select.Item value="1.0">1.0× (Normal)</Select.Item>
                      <Select.Item value="2.0">2.0× (Fast)</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>

                {/* Joint Stabilization */}
                <Flex direction="column" gap="2" p="3" style={{ backgroundColor: "var(--gray-3)", borderRadius: "var(--radius-2)" }}>
                  <Flex align="center" justify="between">
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="medium">Joint Stabilization</Text>
                      <Text size="1" color="gray">Reduces noise by locking stationary joints</Text>
                    </Flex>
                    <Switch
                      checked={stabilizationEnabled}
                      onCheckedChange={setStabilizationEnabled}
                      size="2"
                    />
                  </Flex>
                  {stabilizationEnabled && (
                    <Flex direction="column" gap="2" style={{ marginTop: "var(--space-2)" }}>
                      <Flex align="center" justify="between">
                        <Text size="2" color="gray">Strength</Text>
                        <Text size="1" color="gray">{Math.round(stabilizationStrength * 100)}%</Text>
                      </Flex>
                      <Slider
                        value={[stabilizationStrength]}
                        onValueChange={(values) => setStabilizationStrength(values[0])}
                        min={0}
                        max={1}
                        step={0.05}
                        size="1"
                      />
                      <Flex justify="between">
                        <Text size="1" color="gray">Subtle</Text>
                        <Text size="1" color="gray">Strong</Text>
                      </Flex>
                    </Flex>
                  )}
                </Flex>

                {/* Pose Stability Filter (Banana Detection) */}
                <Flex direction="column" gap="2" p="3" style={{ backgroundColor: "var(--gray-3)", borderRadius: "var(--radius-2)" }}>
                  <Flex align="center" justify="between">
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="medium">Pose Stability Filter</Text>
                      <Text size="1" color="gray">Detects and recovers from corrupted frames</Text>
                    </Flex>
                    <Switch
                      checked={stabilityFilterEnabled}
                      onCheckedChange={setStabilityFilterEnabled}
                      size="2"
                    />
                  </Flex>
                  {stabilityFilterEnabled && (
                    <Flex direction="column" gap="3" style={{ marginTop: "var(--space-2)" }}>
                      {/* Advanced threshold settings (hidden in mirror-only mode) */}
                      {!stabilityFilterConfig.mirrorOnlyMode && (
                        <>
                          {/* Max Segment Change - RELATIVE metric */}
                          <Flex direction="column" gap="1">
                            <Flex align="center" justify="between">
                              <Text size="1" color="gray">Max Segment Change</Text>
                              <Text size="1" color="gray">{((stabilityFilterConfig.MAX_SEGMENT_CHANGE - 1) * 100).toFixed(0)}%</Text>
                            </Flex>
                            <Slider
                              value={[stabilityFilterConfig.MAX_SEGMENT_CHANGE]}
                              onValueChange={(values) => setStabilityFilterConfig(prev => ({ ...prev, MAX_SEGMENT_CHANGE: values[0] }))}
                              min={1.1}
                              max={1.5}
                              step={0.05}
                              size="1"
                            />
                            <Text size="1" style={{ color: "var(--gray-9)", fontSize: "9px" }}>
                              Max limb length change per frame (relative)
                            </Text>
                          </Flex>

                          {/* Max Angle Change - RELATIVE metric */}
                          <Flex direction="column" gap="1">
                            <Flex align="center" justify="between">
                              <Text size="1" color="gray">Max Angle Change</Text>
                              <Text size="1" color="gray">{stabilityFilterConfig.MAX_ANGLE_CHANGE}°</Text>
                            </Flex>
                            <Slider
                              value={[stabilityFilterConfig.MAX_ANGLE_CHANGE]}
                              onValueChange={(values) => setStabilityFilterConfig(prev => ({ ...prev, MAX_ANGLE_CHANGE: values[0] }))}
                              min={10}
                              max={45}
                              step={5}
                              size="1"
                            />
                            <Text size="1" style={{ color: "var(--gray-9)", fontSize: "9px" }}>
                              Max joint angle change per frame (degrees)
                            </Text>
                          </Flex>
                          
                          {/* Similarity Threshold */}
                          <Flex direction="column" gap="1">
                            <Flex align="center" justify="between">
                              <Text size="1" color="gray">Similarity Threshold</Text>
                              <Text size="1" color="gray">{(stabilityFilterConfig.SIM_THRESHOLD * 100).toFixed(0)}%</Text>
                            </Flex>
                            <Slider
                              value={[stabilityFilterConfig.SIM_THRESHOLD]}
                              onValueChange={(values) => setStabilityFilterConfig(prev => ({ ...prev, SIM_THRESHOLD: values[0] }))}
                              min={0.5}
                              max={0.99}
                              step={0.01}
                              size="1"
                            />
                          </Flex>

                          {/* Enable Simulation */}
                          <Flex align="center" justify="between">
                            <Text size="1" color="gray">Motion Simulation</Text>
                            <Switch
                              checked={stabilityFilterConfig.enableSimulation}
                              onCheckedChange={(checked) => setStabilityFilterConfig(prev => ({ ...prev, enableSimulation: checked }))}
                              size="1"
                            />
                          </Flex>
                        </>
                      )}
                      
                      {/* In mirror-only mode, show Max Angle Change as it's still used */}
                      {stabilityFilterConfig.mirrorOnlyMode && (
                        <Flex direction="column" gap="1">
                          <Flex align="center" justify="between">
                            <Text size="1" color="gray">Corruption Threshold</Text>
                            <Text size="1" color="gray">{stabilityFilterConfig.MAX_ANGLE_CHANGE}°</Text>
                          </Flex>
                          <Slider
                            value={[stabilityFilterConfig.MAX_ANGLE_CHANGE]}
                            onValueChange={(values) => setStabilityFilterConfig(prev => ({ ...prev, MAX_ANGLE_CHANGE: values[0] }))}
                            min={10}
                            max={60}
                            step={5}
                            size="1"
                          />
                          <Text size="1" style={{ color: "var(--gray-9)", fontSize: "9px" }}>
                            Angle change threshold to trigger mirroring
                          </Text>
                        </Flex>
                      )}

                      {/* Mirror Only Mode */}
                      <Flex direction="column" gap="1" p="2" style={{ 
                        backgroundColor: stabilityFilterConfig.mirrorOnlyMode ? "rgba(76, 175, 80, 0.15)" : "transparent",
                        borderRadius: "var(--radius-2)",
                        border: stabilityFilterConfig.mirrorOnlyMode ? "1px solid rgba(76, 175, 80, 0.3)" : "1px solid transparent",
                      }}>
                        <Flex align="center" justify="between">
                          <Flex direction="column" gap="0">
                            <Text size="1" color="gray" weight="medium">Mirror Only Mode</Text>
                            <Text size="1" color="gray" style={{ opacity: 0.7 }}>
                              Simple: just mirror lost/corrupted joints, skip state machine
                            </Text>
                          </Flex>
                          <Switch
                            checked={stabilityFilterConfig.mirrorOnlyMode ?? false}
                            onCheckedChange={(checked) => setStabilityFilterConfig(prev => ({ 
                              ...prev, 
                              mirrorOnlyMode: checked,
                              enableMirrorRecovery: true // Ensure mirroring is on
                            }))}
                            size="1"
                          />
                        </Flex>
                      </Flex>

                      {/* Advanced settings (hidden in mirror-only mode) */}
                      {!stabilityFilterConfig.mirrorOnlyMode && (
                        <>
                          {/* Smart Mirror Recovery */}
                          <Flex direction="column" gap="1">
                            <Flex align="center" justify="between">
                              <Flex direction="column" gap="0">
                                <Text size="1" color="gray">Smart Mirror Recovery</Text>
                                <Text size="1" color="gray" style={{ opacity: 0.7 }}>
                                  Mirror stable opposite side when one side is corrupted
                                </Text>
                              </Flex>
                              <Switch
                                checked={stabilityFilterConfig.enableMirrorRecovery ?? true}
                                onCheckedChange={(checked) => setStabilityFilterConfig(prev => ({ ...prev, enableMirrorRecovery: checked }))}
                                size="1"
                              />
                            </Flex>
                          </Flex>

                          {/* Current State Display */}
                          <Flex align="center" gap="2" p="2" style={{ 
                            backgroundColor: stabilityState === StabilityState.RECOVERY 
                              ? "rgba(255, 152, 0, 0.2)" 
                              : "rgba(76, 175, 80, 0.2)",
                            borderRadius: "var(--radius-2)",
                          }}>
                            <Box
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: stabilityState === StabilityState.RECOVERY 
                                  ? "#FF9800" 
                                  : "#4CAF50",
                              }}
                            />
                            <Text size="1" weight="medium">
                              {stabilityState === StabilityState.RECOVERY 
                                ? `Recovery Mode (${stabilityStableCount}/${stabilityConfig.N_RECOVERY})` 
                                : "Normal Mode"}
                            </Text>
                          </Flex>
                        </>
                      )}

                    </Flex>
                  )}
                </Flex>

                {/* Preprocessing Progress */}
                {preprocessing.isPreprocessing && (
                  <Flex direction="column" gap="2" p="3" style={{ backgroundColor: "var(--gray-3)", borderRadius: "var(--radius-2)" }}>
                    <Flex align="center" gap="2">
                      <Spinner size="2" />
                      <Text size="2" weight="medium">Pre-processing video frames...</Text>
                    </Flex>
                    <Box style={{ width: "100%", height: "8px", backgroundColor: "var(--gray-6)", borderRadius: "4px", overflow: "hidden" }}>
                      <Box style={{ width: `${preprocessing.preprocessProgress}%`, height: "100%", backgroundColor: "var(--mint-9)", transition: "width 0.1s" }} />
                    </Box>
                  </Flex>
                )}

                {/* Settings Panels */}
                <PoseSettingsPanel
                  isLoading={isLoading}
                  isDetecting={isDetecting}
                  isPreprocessing={preprocessing.isPreprocessing}
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

                {/* Open in Technique Viewer */}
                <Flex direction="column" gap="2" p="3" style={{ backgroundColor: "var(--gray-3)", borderRadius: "var(--radius-2)" }}>
                  <Text size="2" weight="medium">Technique Viewer</Text>
                  <Text size="1" color="gray">Open this video in fullscreen technique analysis mode</Text>
                  <Button
                    size="2"
                    className={buttonStyles.actionButton}
                    onClick={() => {
                      const encodedUrl = encodeURIComponent(videoUrl);
                      window.open(`/technique?video=${encodedUrl}&from=chat`, "_blank");
                    }}
                  >
                    <ExternalLinkIcon width={14} height={14} />
                    Open in Technique Viewer
                  </Button>
                </Flex>

                {/* Error Display */}
                {error && (
                  <Flex direction="column" gap="2">
                    <Text size="2" color="red">Error: {error}</Text>
                    <Button
                      size="1"
                      className={buttonStyles.actionButtonSquare}
                      data-accent-color="red"
                      onClick={async () => {
                        const cleared = await clearModelCache();
                        if (cleared > 0) window.location.reload();
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
