import { useState } from "react";
import type { SupportedModel } from "@/hooks/usePoseDetection";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";

interface UsePoseSettingsProps {
  initialModel?: SupportedModel;
  initialShowSkeleton?: boolean;
  initialUseAccurateMode?: boolean;
  initialConfidenceMode?: "standard" | "high" | "low";
  initialResolutionMode?: "fast" | "balanced" | "accurate";
  initialShowTrackingId?: boolean;
  initialShowTrajectories?: boolean;
  initialSelectedJoints?: number[];
  initialPoseEnabled?: boolean;
}

/**
 * usePoseSettings - Manages all pose detection related state
 * 
 * Groups pose detection settings to reduce clutter in main component.
 * Returns organized object with model, display, and detection settings.
 */
export function usePoseSettings({
  initialModel = "MoveNet",
  initialShowSkeleton = true,
  initialUseAccurateMode = false,
  initialConfidenceMode = "standard",
  initialResolutionMode = "balanced",
  initialShowTrackingId = false,
  initialShowTrajectories = false,
  initialSelectedJoints = [9, 10],
  initialPoseEnabled = false,
}: UsePoseSettingsProps = {}) {
  // Model Configuration
  const [isPoseEnabled, setIsPoseEnabled] = useState(initialPoseEnabled);
  const [selectedModel, setSelectedModel] = useState<SupportedModel>(initialModel);
  const [blazePoseModelType, setBlazePoseModelType] = useState<"lite" | "full" | "heavy">("full");
  const [useAccurateMode, setUseAccurateMode] = useState(initialUseAccurateMode);
  const [enableSmoothing, setEnableSmoothing] = useState(true);
  const [maxPoses, setMaxPoses] = useState(1);

  // Detection Quality Settings
  const [confidenceMode, setConfidenceMode] = useState<"standard" | "high" | "low">(initialConfidenceMode);
  const [resolutionMode, setResolutionMode] = useState<"fast" | "balanced" | "accurate">(initialResolutionMode);

  // Display Settings
  const [showSkeleton, setShowSkeleton] = useState(initialShowSkeleton);
  const [showTrackingId, setShowTrackingId] = useState(initialShowTrackingId);
  const [showFaceLandmarks, setShowFaceLandmarks] = useState(false);

  // Trajectory Settings
  const [showTrajectories, setShowTrajectories] = useState(initialShowTrajectories);
  const [smoothTrajectories, setSmoothTrajectories] = useState(true);
  const [selectedJoints, setSelectedJoints] = useState<number[]>(initialSelectedJoints);

  // Detection Results
  const [currentPoses, setCurrentPoses] = useState<PoseDetectionResult[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Preprocessing State
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preprocessProgress, setPreprocessProgress] = useState(0);
  const [preprocessedPoses, setPreprocessedPoses] = useState<Map<number, PoseDetectionResult[]>>(new Map());
  const [usePreprocessing, setUsePreprocessing] = useState(false);

  return {
    // Model settings
    model: {
      isPoseEnabled,
      setIsPoseEnabled,
      selectedModel,
      setSelectedModel,
      blazePoseModelType,
      setBlazePoseModelType,
      useAccurateMode,
      setUseAccurateMode,
      maxPoses,
      setMaxPoses,
    },
    // Quality settings
    quality: {
      enableSmoothing,
      setEnableSmoothing,
      confidenceMode,
      setConfidenceMode,
      resolutionMode,
      setResolutionMode,
    },
    // Display settings
    display: {
      showSkeleton,
      setShowSkeleton,
      showTrackingId,
      setShowTrackingId,
      showFaceLandmarks,
      setShowFaceLandmarks,
    },
    // Trajectory settings
    trajectories: {
      showTrajectories,
      setShowTrajectories,
      smoothTrajectories,
      setSmoothTrajectories,
      selectedJoints,
      setSelectedJoints,
    },
    // Detection results
    detection: {
      currentPoses,
      setCurrentPoses,
      currentFrame,
      setCurrentFrame,
    },
    // Preprocessing
    preprocessing: {
      isPreprocessing,
      setIsPreprocessing,
      preprocessProgress,
      setPreprocessProgress,
      preprocessedPoses,
      setPreprocessedPoses,
      usePreprocessing,
      setUsePreprocessing,
    },
  };
}

