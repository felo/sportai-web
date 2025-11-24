import { useState } from "react";
import type { SupportedModel } from "@/hooks/usePoseDetection";

interface UseDetectionSettingsProps {
  initialPoseEnabled?: boolean;
  initialModel?: SupportedModel;
  initialShowSkeleton?: boolean;
  initialObjectDetectionEnabled?: boolean;
  initialProjectileDetectionEnabled?: boolean;
}

/**
 * Hook to manage all detection-related settings.
 * Groups pose, object, and projectile detection state into organized groups.
 */
export function useDetectionSettings({
  initialPoseEnabled = false, // Changed: Don't load pose model until user enables overlay
  initialModel = "MoveNet",
  initialShowSkeleton = true,
  initialObjectDetectionEnabled = false,
  initialProjectileDetectionEnabled = false,
}: UseDetectionSettingsProps = {}) {
  // Pose Detection State
  const [isPoseEnabled, setIsPoseEnabled] = useState(initialPoseEnabled);
  const [selectedModel, setSelectedModel] = useState<SupportedModel>(initialModel);
  const [blazePoseModelType, setBlazePoseModelType] = useState<"lite" | "full" | "heavy">("full");
  const [showSkeleton, setShowSkeleton] = useState(initialShowSkeleton);
  const [useAccurateMode, setUseAccurateMode] = useState(false);
  const [enableSmoothing, setEnableSmoothing] = useState(true);
  const [confidenceMode, setConfidenceMode] = useState<"standard" | "high" | "low">("standard");
  const [resolutionMode, setResolutionMode] = useState<"fast" | "balanced" | "accurate">("balanced");
  const [maxPoses, setMaxPoses] = useState(1);
  const [showFaceLandmarks, setShowFaceLandmarks] = useState(false);

  // Object Detection State (YOLOv8)
  const [isObjectDetectionEnabled, setIsObjectDetectionEnabled] = useState(initialObjectDetectionEnabled);
  const [selectedObjectModel, setSelectedObjectModel] = useState<"YOLOv8n" | "YOLOv8s" | "YOLOv8m">("YOLOv8n");
  const [objectConfidenceThreshold, setObjectConfidenceThreshold] = useState(0.5);
  const [objectIoUThreshold, setObjectIoUThreshold] = useState(0.45);
  const [sportFilter, setSportFilter] = useState<"all" | "tennis" | "pickleball" | "basketball" | "baseball" | "skating">("all");
  const [showObjectLabels, setShowObjectLabels] = useState(true);
  const [enableObjectTracking, setEnableObjectTracking] = useState(true);
  const [currentObjects, setCurrentObjects] = useState<any[]>([]);

  // Projectile Detection State (TrackNet)
  const [isProjectileDetectionEnabled, setIsProjectileDetectionEnabled] = useState(initialProjectileDetectionEnabled);
  const [selectedProjectileModel, setSelectedProjectileModel] = useState<"TrackNet" | "TrackNetV2">("TrackNet");
  const [projectileConfidenceThreshold, setProjectileConfidenceThreshold] = useState(0.5);
  const [showProjectileTrajectory, setShowProjectileTrajectory] = useState(true);
  const [showProjectilePrediction, setShowProjectilePrediction] = useState(false);
  const [currentProjectile, setCurrentProjectile] = useState<any | null>(null);

  return {
    // Pose Detection
    pose: {
      enabled: isPoseEnabled,
      setEnabled: setIsPoseEnabled,
      model: selectedModel,
      setModel: setSelectedModel,
      blazePoseModelType,
      setBlazePoseModelType,
      showSkeleton,
      setShowSkeleton,
      useAccurateMode,
      setUseAccurateMode,
      enableSmoothing,
      setEnableSmoothing,
      confidenceMode,
      setConfidenceMode,
      resolutionMode,
      setResolutionMode,
      maxPoses,
      setMaxPoses,
      showFaceLandmarks,
      setShowFaceLandmarks,
    },
    
    // Object Detection
    objectDetection: {
      enabled: isObjectDetectionEnabled,
      setEnabled: setIsObjectDetectionEnabled,
      model: selectedObjectModel,
      setModel: setSelectedObjectModel,
      confidenceThreshold: objectConfidenceThreshold,
      setConfidenceThreshold: setObjectConfidenceThreshold,
      iouThreshold: objectIoUThreshold,
      setIoUThreshold: setObjectIoUThreshold,
      sportFilter,
      setSportFilter,
      showLabels: showObjectLabels,
      setShowLabels: setShowObjectLabels,
      enableTracking: enableObjectTracking,
      setEnableTracking: setEnableObjectTracking,
      currentObjects,
      setCurrentObjects,
    },
    
    // Projectile Detection
    projectile: {
      enabled: isProjectileDetectionEnabled,
      setEnabled: setIsProjectileDetectionEnabled,
      model: selectedProjectileModel,
      setModel: setSelectedProjectileModel,
      confidenceThreshold: projectileConfidenceThreshold,
      setConfidenceThreshold: setProjectileConfidenceThreshold,
      showTrajectory: showProjectileTrajectory,
      setShowTrajectory: setShowProjectileTrajectory,
      showPrediction: showProjectilePrediction,
      setShowPrediction: setShowProjectilePrediction,
      currentProjectile,
      setCurrentProjectile,
    },
  };
}




