/**
 * Constants for Swing Detection V3
 */

import type { SwingDetectionConfigV3 } from "./types";

// ============================================================================
// Physical Constants
// ============================================================================

/** Assumed average person height in meters for velocity normalization */
export const ASSUMED_PERSON_HEIGHT = 1.7;

/** Torso is approximately 30% of total body height */
export const TORSO_TO_HEIGHT_RATIO = 0.30;

// ============================================================================
// Detection Thresholds
// ============================================================================

/** Height ratio threshold for serve detection (wrist above shoulder) */
export const SERVE_HEIGHT_THRESHOLD = 0.4;

/** Wrist distance ratio threshold for two-handed backhand detection */
export const TWO_HANDED_THRESHOLD = 0.6;

/** Orientation threshold for forehand/backhand classification (degrees) */
export const ORIENTATION_THRESHOLD = 15;

/** Overlap threshold for merging swings (70%) */
export const OVERLAP_THRESHOLD = 0.7;

/** Time offset for trophy position before contact (seconds) */
export const TROPHY_OFFSET_SECONDS = 0.4;

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_CONFIG_V3: SwingDetectionConfigV3 = {
  minVelocityThreshold: 1,
  minVelocityKmh: 3,
  velocityPercentile: 75,
  wristMode: "both",
  minRotationVelocity: 0.5,
  requireRotation: true,
  rotationWeight: 0.3,
  minSwingDuration: 5,
  maxSwingDuration: 60,
  minTimeBetweenSwings: 0.8,
  loadingRotationThreshold: 1.5,
  contactVelocityRatio: 0.9,
  smoothingWindow: 3,
  minConfidence: 0.3,
  classifySwingType: true,
  handedness: "right",
  clipLeadTime: 2.0,
  clipTrailTime: 1.0,
};



