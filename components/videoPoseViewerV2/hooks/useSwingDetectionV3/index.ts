/**
 * Swing Detection V3
 * 
 * Enhanced swing detection using body orientation + wrist velocity.
 */

// Main hook
export { useSwingDetectionV3 } from "./useSwingDetectionV3";

// Types
export type {
  SwingType,
  SwingPhase,
  WristMode,
  DetectedSwingV3,
  SwingFrameDataV3,
  SwingDetectionResultV3,
  SwingDetectionConfigV3,
  UseSwingDetectionV3Props,
  KeypointIndices,
} from "./types";

// Constants
export {
  ASSUMED_PERSON_HEIGHT,
  TORSO_TO_HEIGHT_RATIO,
  DEFAULT_CONFIG_V3,
} from "./constants";

// Utilities (for external use if needed)
export {
  calculateMetersPerPixel,
  convertVelocityToKmh,
} from "./utils/velocityConversion";
