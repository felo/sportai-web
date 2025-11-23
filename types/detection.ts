/**
 * Unified detection type system for pose, object, and projectile detection
 * Supports multiple simultaneous detection types without conflicts
 */

import type { Keypoint } from "@tensorflow-models/pose-detection";

// ============================================================================
// Detection Type Enums
// ============================================================================

export type DetectionType = "pose" | "object" | "projectile" | "sam2";

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
// SAM 2 Segmentation (Segment Anything Model 2)
// ============================================================================

export type SAM2ModelType = "tiny" | "small" | "base" | "large";

export interface SAM2DetectionConfig extends BaseDetectionConfig {
  type: "sam2";
  model: SAM2ModelType;
  showMask: boolean;
  showBoundingBox: boolean;
  maskOpacity?: number; // 0-1, default: 0.5
  maskColor?: string; // Hex color, default: auto
  confidenceThreshold?: number;
  imageSize?: number; // Model input size, default: 1024
  interactiveMode?: boolean; // Allow user to click for prompts
}

export interface SAM2Point {
  x: number;
  y: number;
  label: 1 | 0; // 1 = foreground, 0 = background
}

export interface SAM2Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SAM2Mask {
  data: Uint8Array; // Binary mask (0 or 255)
  width: number;
  height: number;
  score: number;
}

export interface SAM2DetectionResult {
  masks: SAM2Mask[];
  bbox?: SAM2Box;
  confidence: number;
  prompt?: {
    points?: SAM2Point[];
    box?: SAM2Box;
  };
}

export interface SAM2DrawOptions {
  maskColor?: string;
  maskOpacity?: number;
  boundingBoxColor?: string;
  lineWidth?: number;
  showPromptPoints?: boolean;
  promptPointColor?: string;
  promptPointRadius?: number;
}

// ============================================================================
// Unified Detection Config (Discriminated Union)
// ============================================================================

export type DetectionConfig =
  | PoseDetectionConfig
  | ObjectDetectionConfig
  | ProjectileDetectionConfig
  | SAM2DetectionConfig;

// ============================================================================
// Detection Results Union
// ============================================================================

export type DetectionResult =
  | { type: "pose"; results: PoseDetectionResult[] }
  | { type: "object"; results: ObjectDetectionResult[] }
  | { type: "projectile"; results: ProjectileDetectionResult[] }
  | { type: "sam2"; results: SAM2DetectionResult[] };

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
  sam2?: {
    enabled: boolean;
    results: SAM2DetectionResult[];
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

// COCO class IDs for sports-related objects
export const SPORTS_CLASS_IDS = {
  PERSON: 0,
  BICYCLE: 1,
  CAR: 2,
  MOTORCYCLE: 3,
  FRISBEE: 29,
  SKIS: 30,
  SNOWBOARD: 31,
  SPORTS_BALL: 32,
  KITE: 33,
  BASEBALL_BAT: 34,
  BASEBALL_GLOVE: 35,
  SKATEBOARD: 36,
  SURFBOARD: 37,
  TENNIS_RACKET: 38,
} as const;

// Predefined sport-specific filters
export const SPORT_FILTERS = {
  all: [] as number[], // Empty means no filter (all classes)
  tennis: [SPORTS_CLASS_IDS.PERSON, SPORTS_CLASS_IDS.SPORTS_BALL, SPORTS_CLASS_IDS.TENNIS_RACKET],
  pickleball: [SPORTS_CLASS_IDS.PERSON, SPORTS_CLASS_IDS.SPORTS_BALL],
  basketball: [SPORTS_CLASS_IDS.PERSON, SPORTS_CLASS_IDS.SPORTS_BALL],
  baseball: [SPORTS_CLASS_IDS.PERSON, SPORTS_CLASS_IDS.SPORTS_BALL, SPORTS_CLASS_IDS.BASEBALL_BAT, SPORTS_CLASS_IDS.BASEBALL_GLOVE],
  skating: [SPORTS_CLASS_IDS.PERSON, SPORTS_CLASS_IDS.SKATEBOARD],
  surfing: [SPORTS_CLASS_IDS.PERSON, SPORTS_CLASS_IDS.SURFBOARD],
  skiing: [SPORTS_CLASS_IDS.PERSON, SPORTS_CLASS_IDS.SKIS],
  snowboarding: [SPORTS_CLASS_IDS.PERSON, SPORTS_CLASS_IDS.SNOWBOARD],
} as const;

export type SportFilter = keyof typeof SPORT_FILTERS;

