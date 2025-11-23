/**
 * Unified detection type system for pose, object, and projectile detection
 * Supports multiple simultaneous detection types without conflicts
 */

import type { Keypoint } from "@tensorflow-models/pose-detection";

// ============================================================================
// Detection Type Enums
// ============================================================================

export type DetectionType = "pose" | "object" | "projectile";

// ============================================================================
// Base Detection Config
// ============================================================================

export interface BaseDetectionConfig {
  enabled: boolean;
  showOverlay: boolean;
}

// ============================================================================
// Pose Detection (Existing - for type compatibility)
// ============================================================================

export interface PoseDetectionConfig extends BaseDetectionConfig {
  type: "pose";
  model: "MoveNet" | "BlazePose";
  modelType?: string;
  showSkeleton: boolean;
  showAngles: boolean;
  showTrajectories?: boolean;
  selectedJoints?: number[];
  confidenceThreshold?: number;
}

export interface PoseDetectionResult {
  keypoints: Keypoint[];
  score?: number;
  keypoints3D?: Array<{ x: number; y: number; z: number; score?: number }>;
  id?: number;
  box?: { xMin: number; yMin: number; width: number; height: number; score?: number };
}

// ============================================================================
// Object Detection (YOLOv8n)
// ============================================================================

export type YOLOModelType = "YOLOv8n" | "YOLOv8s" | "YOLOv8m";

export interface ObjectDetectionConfig extends BaseDetectionConfig {
  type: "object";
  model: YOLOModelType;
  detectionClasses?: string[]; // Filter specific classes (e.g., ["person", "sports ball"])
  confidenceThreshold?: number; // Default: 0.5
  showBoundingBoxes: boolean;
  showLabels: boolean;
  trackObjects: boolean; // Enable multi-frame tracking
  maxDetections?: number; // Max objects to detect per frame
}

export interface ObjectDetectionResult {
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  class: string;
  classId: number;
  confidence: number;
  trackingId?: number; // For multi-frame tracking
}

export interface ObjectDrawOptions {
  boxColor?: string;
  lineWidth?: number;
  showLabel?: boolean;
  showConfidence?: boolean;
  fontSize?: number;
  labelBackground?: string;
}

// ============================================================================
// Projectile Detection (TrackNet)
// ============================================================================

export type ProjectileModelType = "TrackNet" | "TrackNetV2";
export type BallType = "tennis" | "pickleball" | "padel" | "auto";

export interface ProjectileDetectionConfig extends BaseDetectionConfig {
  type: "projectile";
  model: ProjectileModelType;
  showTrajectory: boolean;
  showPrediction: boolean; // Show predicted future positions
  ballType?: BallType;
  confidenceThreshold?: number;
  trajectoryLength?: number; // Number of frames to show in trajectory
}

export interface ProjectileDetectionResult {
  position: {
    x: number;
    y: number;
  };
  confidence: number;
  velocity?: {
    x: number;
    y: number;
    magnitude: number; // km/h or m/s
  };
  trajectory?: Array<{
    x: number;
    y: number;
    frame: number;
    timestamp: number;
  }>;
  predictedPath?: Array<{
    x: number;
    y: number;
    confidence: number;
  }>;
}

export interface ProjectileDrawOptions {
  ballColor?: string;
  ballRadius?: number;
  trajectoryColor?: string;
  trajectoryWidth?: number;
  predictionColor?: string;
  showVelocity?: boolean;
  velocityColor?: string;
}

// ============================================================================
// Unified Detection Config (Discriminated Union)
// ============================================================================

export type DetectionConfig =
  | PoseDetectionConfig
  | ObjectDetectionConfig
  | ProjectileDetectionConfig;

// ============================================================================
// Detection Results Union
// ============================================================================

export type DetectionResult =
  | { type: "pose"; results: PoseDetectionResult[] }
  | { type: "object"; results: ObjectDetectionResult[] }
  | { type: "projectile"; results: ProjectileDetectionResult[] };

// ============================================================================
// Multi-Detection Container (for components that support multiple detections)
// ============================================================================

export interface MultiDetectionState {
  pose?: {
    enabled: boolean;
    results: PoseDetectionResult[];
    isLoading: boolean;
    error: string | null;
  };
  object?: {
    enabled: boolean;
    results: ObjectDetectionResult[];
    isLoading: boolean;
    error: string | null;
  };
  projectile?: {
    enabled: boolean;
    results: ProjectileDetectionResult[];
    isLoading: boolean;
    error: string | null;
  };
}

// ============================================================================
// Common YOLO Classes (COCO dataset)
// ============================================================================

export const YOLO_CLASSES = {
  PERSON: "person",
  BICYCLE: "bicycle",
  CAR: "car",
  MOTORCYCLE: "motorcycle",
  SPORTS_BALL: "sports ball",
  TENNIS_RACKET: "tennis racket",
  BOTTLE: "bottle",
  CUP: "cup",
  BACKPACK: "backpack",
  // Add more as needed
} as const;

// Sports-specific class filters
export const SPORTS_DETECTION_CLASSES = [
  "person",
  "sports ball",
  "tennis racket",
  "baseball bat",
  "baseball glove",
  "skateboard",
  "surfboard",
  "frisbee",
];

