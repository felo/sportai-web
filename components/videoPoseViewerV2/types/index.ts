/**
 * VideoPoseViewerV2 Types
 * 
 * Comprehensive type definitions for the externally-controllable pose viewer.
 * All configuration is exposed through props for external management.
 */

// ============================================================================
// Model Configuration
// ============================================================================

export type { ModelConfig } from "./model";
export { DEFAULT_MODEL_CONFIG } from "./model";

// ============================================================================
// Processing Configuration
// ============================================================================

export type { 
  SmoothingMethod,
  PostProcessingConfig,
  ConfidencePreset,
  ConfidenceConfig,
  ResolutionPreset,
  ResolutionConfig,
  StabilizationConfig,
  PoseStabilityFilterConfig,
} from "./processing";

export {
  DEFAULT_POST_PROCESSING_CONFIG,
  CONFIDENCE_PRESETS,
  DEFAULT_CONFIDENCE_CONFIG,
  RESOLUTION_PRESETS,
  DEFAULT_RESOLUTION_CONFIG,
  DEFAULT_STABILIZATION_CONFIG,
  DEFAULT_STABILITY_FILTER_CONFIG,
} from "./processing";

// ============================================================================
// Display Configuration
// ============================================================================

export type {
  SkeletonDisplayConfig,
  AngleConfig,
  BodyOrientationConfig,
  TrajectoryConfig,
} from "./display";

export {
  DEFAULT_SKELETON_DISPLAY,
  ANGLE_PRESETS,
  DEFAULT_ANGLE_CONFIG,
  DEFAULT_BODY_ORIENTATION_CONFIG,
  DEFAULT_TRAJECTORY_CONFIG,
} from "./display";

// ============================================================================
// Velocity Configuration
// ============================================================================

export type { VelocityConfig } from "./velocity";
export { DEFAULT_VELOCITY_CONFIG } from "./velocity";

// ============================================================================
// Protocols Configuration
// ============================================================================

export type {
  ProtocolId,
  ProtocolDefinition,
  ProtocolsConfig,
  WristMode,
  SwingDetectionV3Config,
  SwingPhase,
  ProtocolEvent,
  SwingEvent,
} from "./protocols";

export {
  AVAILABLE_PROTOCOLS,
  DEFAULT_PROTOCOLS_CONFIG,
  DEFAULT_SWING_DETECTION_V3_CONFIG,
  PROTOCOL_EVENT_COLORS,
} from "./protocols";

// ============================================================================
// Playback Configuration
// ============================================================================

export type {
  PreprocessingConfig,
  PlaybackConfig,
  DebugConfig,
} from "./playback";

export {
  DEFAULT_PREPROCESSING_CONFIG,
  PLAYBACK_SPEEDS,
  DEFAULT_PLAYBACK_CONFIG,
  DEFAULT_DEBUG_CONFIG,
} from "./playback";

// ============================================================================
// Viewer Types
// ============================================================================

export type {
  ViewerConfig,
  ViewerState,
  ViewerCallbacks,
  ViewerActions,
} from "./viewer";

// ============================================================================
// Moments Types
// ============================================================================

export type {
  CustomEvent,
  VideoComment,
  MomentReport,
  MomentsConfig,
} from "./moments";

// ============================================================================
// Joint Names
// ============================================================================

export {
  MOVENET_JOINT_NAMES,
  BLAZEPOSE_JOINT_NAMES,
  getJointName,
  getJointCount,
} from "./joints";

// ============================================================================
// Combined Default Configuration
// ============================================================================

import { DEFAULT_MODEL_CONFIG } from "./model";
import { 
  DEFAULT_POST_PROCESSING_CONFIG,
  DEFAULT_CONFIDENCE_CONFIG,
  DEFAULT_RESOLUTION_CONFIG,
  DEFAULT_STABILIZATION_CONFIG,
  DEFAULT_STABILITY_FILTER_CONFIG,
} from "./processing";
import {
  DEFAULT_SKELETON_DISPLAY,
  DEFAULT_ANGLE_CONFIG,
  DEFAULT_BODY_ORIENTATION_CONFIG,
  DEFAULT_TRAJECTORY_CONFIG,
} from "./display";
import { DEFAULT_VELOCITY_CONFIG } from "./velocity";
import { DEFAULT_PROTOCOLS_CONFIG, DEFAULT_SWING_DETECTION_V3_CONFIG } from "./protocols";
import { DEFAULT_PREPROCESSING_CONFIG, DEFAULT_PLAYBACK_CONFIG, DEFAULT_DEBUG_CONFIG } from "./playback";
import type { ViewerConfig } from "./viewer";

export const DEFAULT_VIEWER_CONFIG: ViewerConfig = {
  model: DEFAULT_MODEL_CONFIG,
  postProcessing: DEFAULT_POST_PROCESSING_CONFIG,
  confidence: DEFAULT_CONFIDENCE_CONFIG,
  resolution: DEFAULT_RESOLUTION_CONFIG,
  skeleton: DEFAULT_SKELETON_DISPLAY,
  angles: DEFAULT_ANGLE_CONFIG,
  bodyOrientation: DEFAULT_BODY_ORIENTATION_CONFIG,
  trajectories: DEFAULT_TRAJECTORY_CONFIG,
  velocity: DEFAULT_VELOCITY_CONFIG,
  stabilization: DEFAULT_STABILIZATION_CONFIG,
  stabilityFilter: DEFAULT_STABILITY_FILTER_CONFIG,
  preprocessing: DEFAULT_PREPROCESSING_CONFIG,
  playback: DEFAULT_PLAYBACK_CONFIG,
  protocols: DEFAULT_PROTOCOLS_CONFIG,
  swingDetectionV3: DEFAULT_SWING_DETECTION_V3_CONFIG,
  debug: DEFAULT_DEBUG_CONFIG,
};
