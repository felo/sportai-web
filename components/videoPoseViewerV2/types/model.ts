/**
 * Model Configuration Types
 * 
 * Types for pose detection model selection and configuration.
 */

import type { SupportedModel, MoveNetModelType, BlazePoseModelType } from "@/hooks/usePoseDetection";

// ============================================================================
// Model Configuration
// ============================================================================

export interface ModelConfig {
  /** Selected model: MoveNet or BlazePose */
  model: SupportedModel;
  /** MoveNet model variant */
  moveNetType: MoveNetModelType;
  /** BlazePose model variant */
  blazePoseType: BlazePoseModelType;
  /** Maximum number of poses to detect (1-6, only for MultiPose) */
  maxPoses: number;
  /** Enable temporal smoothing in the detector */
  enableSmoothing: boolean;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  model: "MoveNet",
  moveNetType: "SinglePose.Thunder",
  blazePoseType: "full",
  maxPoses: 1,
  enableSmoothing: false,
};
