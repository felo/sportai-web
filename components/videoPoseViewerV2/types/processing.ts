/**
 * Processing Configuration Types
 * 
 * Types for post-processing, confidence thresholds, and resolution settings.
 */

// ============================================================================
// Post-Processing Configuration
// ============================================================================

export type SmoothingMethod = "temporal" | "exponential" | "kalman";

export interface PostProcessingConfig {
  /** Enable post-processing smoothing */
  smoothingEnabled: boolean;
  /** Smoothing algorithm to use */
  smoothingMethod: SmoothingMethod;
  /** Number of frames to consider for smoothing (1-10) */
  windowSize: number;
  /** Smoothing strength/factor (0-1) */
  smoothingStrength: number;
  /** Enable interpolation between frames */
  interpolationEnabled: boolean;
  /** Number of interpolated points between frames (1-10) */
  interpolationPoints: number;
  /** Minimum confidence to apply smoothing */
  minConfidenceForSmoothing: number;
  /** Enable velocity-based smoothing (reduces jitter on fast movements) */
  velocitySmoothing: boolean;
  /** Velocity threshold for adaptive smoothing */
  velocityThreshold: number;
}

export const DEFAULT_POST_PROCESSING_CONFIG: PostProcessingConfig = {
  smoothingEnabled: true,
  smoothingMethod: "temporal",
  windowSize: 3,
  smoothingStrength: 0.5,
  interpolationEnabled: false,
  interpolationPoints: 1,
  minConfidenceForSmoothing: 0.3,
  velocitySmoothing: false,
  velocityThreshold: 50,
};

// ============================================================================
// Confidence Configuration
// ============================================================================

export type ConfidencePreset = "low" | "standard" | "high" | "very-high" | "custom";

export interface ConfidenceConfig {
  /** Preset mode or custom */
  preset: ConfidencePreset;
  /** Minimum pose score threshold (0-1) */
  minPoseScore: number;
  /** Minimum keypoint score threshold (0-1) */
  minPartScore: number;
}

export const CONFIDENCE_PRESETS: Record<Exclude<ConfidencePreset, "custom">, { minPoseScore: number; minPartScore: number }> = {
  low: { minPoseScore: 0.1, minPartScore: 0.15 },
  standard: { minPoseScore: 0.25, minPartScore: 0.3 },
  high: { minPoseScore: 0.5, minPartScore: 0.5 },
  "very-high": { minPoseScore: 0.7, minPartScore: 0.7 },
};

export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  preset: "low",
  minPoseScore: 0.1,
  minPartScore: 0.15,
};

// ============================================================================
// Resolution Configuration
// ============================================================================

export type ResolutionPreset = "fastest" | "fast" | "balanced" | "accurate" | "high" | "maximum" | "ultra" | "custom";

export interface ResolutionConfig {
  /** Preset mode or custom */
  preset: ResolutionPreset;
  /** Input resolution width */
  width: number;
  /** Input resolution height */
  height: number;
}

export const RESOLUTION_PRESETS: Record<Exclude<ResolutionPreset, "custom">, { width: number; height: number }> = {
  fastest: { width: 128, height: 128 },
  fast: { width: 192, height: 192 },
  balanced: { width: 256, height: 256 },
  accurate: { width: 384, height: 384 },
  high: { width: 512, height: 512 },
  maximum: { width: 640, height: 640 },
  ultra: { width: 1024, height: 1024 },
};

export const DEFAULT_RESOLUTION_CONFIG: ResolutionConfig = {
  preset: "ultra",
  width: 1024,
  height: 1024,
};

// ============================================================================
// Stabilization Configuration
// ============================================================================

export interface StabilizationConfig {
  /** Enable joint position stabilization (reduces jitter) */
  enabled: boolean;
  /** Stabilization strength (0-1) */
  strength: number;
  /** Velocity threshold below which stabilization applies */
  velocityThreshold: number;
  /** Apply stabilization to all joints or specific ones */
  applyToAllJoints: boolean;
  /** Specific joints to stabilize (if applyToAllJoints is false) */
  stabilizedJoints: number[];
}

export const DEFAULT_STABILIZATION_CONFIG: StabilizationConfig = {
  enabled: false,
  strength: 0.5,
  velocityThreshold: 5,
  applyToAllJoints: true,
  stabilizedJoints: [],
};

// ============================================================================
// Pose Stability Filter Configuration
// ============================================================================

export interface PoseStabilityFilterConfig {
  /** Enable banana frame detection and recovery */
  enabled: boolean;
  /** Use simple mirror-only mode (skip state machine) */
  mirrorOnlyMode: boolean;
  /** Enable mirroring from stable opposite side */
  enableMirrorRecovery: boolean;
  /** Maximum segment length change per frame (ratio) */
  maxSegmentChange: number;
  /** Maximum angle change per frame (degrees) */
  maxAngleChange: number;
  /** Similarity threshold for recovery detection */
  similarityThreshold: number;
  /** Enable motion simulation during recovery */
  enableSimulation: boolean;
  /** Number of stable frames required to exit recovery */
  recoveryFrameCount: number;
}

export const DEFAULT_STABILITY_FILTER_CONFIG: PoseStabilityFilterConfig = {
  enabled: false,
  mirrorOnlyMode: true,
  enableMirrorRecovery: true,
  maxSegmentChange: 1.25,
  maxAngleChange: 25,
  similarityThreshold: 0.8,
  enableSimulation: false,
  recoveryFrameCount: 3,
};
