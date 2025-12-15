export {
  useSwingDetectionV3,
  DEFAULT_CONFIG_V3,
  // Velocity conversion utilities
  ASSUMED_PERSON_HEIGHT,
  TORSO_TO_HEIGHT_RATIO,
  calculateMetersPerPixel,
  convertVelocityToKmh,
  // Types
  type DetectedSwingV3,
  type SwingFrameDataV3,
  type SwingDetectionResultV3,
  type SwingDetectionConfigV3,
  type SwingType,
  type SwingPhase,
} from "./useSwingDetectionV3/index";

export {
  useHandednessDetection,
  DEFAULT_HANDEDNESS_CONFIG,
  type HandednessResult,
  type HandednessSignals,
  type HandednessConfig,
} from "./useHandednessDetection";

