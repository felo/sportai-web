import { useState } from "react";

interface UseDetectionStateProps {
  // Object Detection
  initialObjectDetectionEnabled?: boolean;
  initialObjectModel?: "YOLOv8n" | "YOLOv8s" | "YOLOv8m";
  initialObjectConfidence?: number;
  initialObjectIoU?: number;
  initialSportFilter?: "all" | "tennis" | "pickleball" | "basketball" | "baseball" | "skating";
  initialShowObjectLabels?: boolean;
  initialEnableObjectTracking?: boolean;

  // Projectile Detection
  initialProjectileDetectionEnabled?: boolean;
  initialProjectileModel?: "TrackNet" | "TrackNetV2";
  initialProjectileConfidence?: number;
  initialShowProjectileTrajectory?: boolean;
  initialShowProjectilePrediction?: boolean;
}

/**
 * useDetectionState - Manages object and projectile detection state
 * 
 * Groups all detection-related state for:
 * - Object Detection (YOLO)
 * - Projectile/Ball Tracking
 * 
 * Returns organized structure with settings and results.
 */
export function useDetectionState({
  // Object Detection defaults
  initialObjectDetectionEnabled = false,
  initialObjectModel = "YOLOv8n",
  initialObjectConfidence = 0.5,
  initialObjectIoU = 0.45,
  initialSportFilter = "all",
  initialShowObjectLabels = true,
  initialEnableObjectTracking = true,

  // Projectile Detection defaults
  initialProjectileDetectionEnabled = false,
  initialProjectileModel = "TrackNet",
  initialProjectileConfidence = 0.5,
  initialShowProjectileTrajectory = true,
  initialShowProjectilePrediction = false,
}: UseDetectionStateProps = {}) {
  // Object Detection State
  const [isObjectDetectionEnabled, setIsObjectDetectionEnabled] = useState(initialObjectDetectionEnabled);
  const [selectedObjectModel, setSelectedObjectModel] = useState<"YOLOv8n" | "YOLOv8s" | "YOLOv8m">(initialObjectModel);
  const [objectConfidenceThreshold, setObjectConfidenceThreshold] = useState(initialObjectConfidence);
  const [objectIoUThreshold, setObjectIoUThreshold] = useState(initialObjectIoU);
  const [sportFilter, setSportFilter] = useState<"all" | "tennis" | "pickleball" | "basketball" | "baseball" | "skating">(initialSportFilter);
  const [showObjectLabels, setShowObjectLabels] = useState(initialShowObjectLabels);
  const [enableObjectTracking, setEnableObjectTracking] = useState(initialEnableObjectTracking);
  const [currentObjects, setCurrentObjects] = useState<any[]>([]);

  // Projectile Detection State
  const [isProjectileDetectionEnabled, setIsProjectileDetectionEnabled] = useState(initialProjectileDetectionEnabled);
  const [selectedProjectileModel, setSelectedProjectileModel] = useState<"TrackNet" | "TrackNetV2">(initialProjectileModel);
  const [projectileConfidenceThreshold, setProjectileConfidenceThreshold] = useState(initialProjectileConfidence);
  const [showProjectileTrajectory, setShowProjectileTrajectory] = useState(initialShowProjectileTrajectory);
  const [showProjectilePrediction, setShowProjectilePrediction] = useState(initialShowProjectilePrediction);
  const [currentProjectile, setCurrentProjectile] = useState<any | null>(null);

  return {
    // Object Detection
    objectDetection: {
      isEnabled: isObjectDetectionEnabled,
      setIsEnabled: setIsObjectDetectionEnabled,
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
    projectileDetection: {
      isEnabled: isProjectileDetectionEnabled,
      setIsEnabled: setIsProjectileDetectionEnabled,
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

