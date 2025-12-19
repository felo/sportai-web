/**
 * Types for Swing Detection V3
 */

import type { PoseDetectionResult, SupportedModel } from "@/hooks/usePoseDetection";

// ============================================================================
// Basic Types
// ============================================================================

export type SwingType = "forehand" | "backhand" | "backhand_two_hand" | "serve" | "unknown";
export type SwingPhase = "neutral" | "loading" | "swing" | "contact" | "follow" | "recovery";

/**
 * Which wrist(s) to use for velocity calculation
 */
export type WristMode = "both" | "max" | "dominant";

// ============================================================================
// Detected Swing
// ============================================================================

/**
 * A detected swing with orientation data
 */
export interface DetectedSwingV3 {
  id: string;
  frame: number;
  timestamp: number;
  
  // Velocity metrics
  peakVelocity: number;           // px/frame at contact
  velocityKmh: number;            // estimated real-world speed
  
  // Orientation metrics
  orientationAtContact: number;   // body orientation at peak (degrees)
  rotationRange: number;          // total rotation during swing (degrees)
  peakRotationVelocity: number;   // max rotation speed (degrees/frame)
  
  // Classification
  swingType: SwingType;
  dominantSide: "left" | "right" | "both";
  confidence: number;
  
  // Phase timing (frame numbers)
  loadingStart: number;
  swingStart: number;
  contactFrame: number;
  followEnd: number;
  
  // Loading position (max coil/backswing) - only for non-serve swings
  loadingPeakFrame: number | null;      // Frame with maximum body rotation (coiling)
  loadingPeakTimestamp: number | null;  // Timestamp of loading peak
  loadingPeakOrientation: number | null; // Body orientation at loading peak (degrees)
  
  // Serve-specific positions (only for serve swings)
  trophyFrame: number | null;           // Frame with highest arm position (trophy pose)
  trophyTimestamp: number | null;       // Timestamp of trophy position
  trophyArmHeight: number | null;       // How high arm was above shoulder (ratio to torso)
  contactPointFrame: number | null;     // Frame of ball contact (peak wrist height during forward swing)
  contactPointTimestamp: number | null; // Timestamp of contact
  contactPointHeight: number | null;    // How high contact was (ratio to torso above shoulder)
  landingFrame: number | null;          // Frame where player lands after serve
  landingTimestamp: number | null;      // Timestamp of landing
  
  // Clip boundaries for analysis (anchored to followEnd)
  clipStartTime: number;          // followEnd - clipLeadTime (seconds)
  clipEndTime: number;            // followEnd + clipTrailTime (seconds)
  clipStartFrame: number;         // clipStartTime * fps
  clipEndFrame: number;           // clipEndTime * fps
  clipDuration: number;           // clipEndTime - clipStartTime (seconds)
  
  // Combined score
  swingScore: number;             // velocity * rotation correlation
}

// ============================================================================
// Frame Data
// ============================================================================

/**
 * Per-frame data for analysis and visualization
 */
export interface SwingFrameDataV3 {
  frame: number;
  timestamp: number;
  
  // Velocity - combined (based on wristMode)
  wristVelocity: number | null;        // px/frame (processed: fillDrops + smoothing)
  wristVelocityKmh: number | null;     // km/h (processed, converted using torso height)
  rawWristVelocityKmh: number | null;  // km/h (RAW - before any processing)
  
  // Velocity - per wrist (raw px/frame)
  leftWristVelocity: number | null;
  rightWristVelocity: number | null;
  
  // Velocity - per wrist (km/h, raw and smoothed)
  rawLeftWristVelocityKmh: number | null;
  rawRightWristVelocityKmh: number | null;
  leftWristVelocityKmh: number | null;   // smoothed
  rightWristVelocityKmh: number | null;  // smoothed
  maxWristVelocityKmh: number | null;    // smoothed max(left, right)
  rawMaxWristVelocityKmh: number | null; // raw max(left, right)
  
  // Confidence scores (0-1, for visualizing where keypoint detection failed)
  leftWristConfidence: number | null;
  rightWristConfidence: number | null;
  leftElbowConfidence: number | null;
  rightElbowConfidence: number | null;
  leftShoulderConfidence: number | null;
  rightShoulderConfidence: number | null;
  leftHipConfidence: number | null;
  rightHipConfidence: number | null;
  leftKneeConfidence: number | null;
  rightKneeConfidence: number | null;
  leftAnkleConfidence: number | null;
  rightAnkleConfidence: number | null;
  
  // Ankle velocity (px/frame and km/h)
  rawLeftAnkleVelocity: number | null;
  rawRightAnkleVelocity: number | null;
  leftAnkleVelocity: number | null;      // smoothed
  rightAnkleVelocity: number | null;     // smoothed
  rawLeftAnkleVelocityKmh: number | null;
  rawRightAnkleVelocityKmh: number | null;
  leftAnkleVelocityKmh: number | null;   // smoothed
  rightAnkleVelocityKmh: number | null;  // smoothed
  
  // Knee velocity (px/frame and km/h)
  rawLeftKneeVelocity: number | null;
  rawRightKneeVelocity: number | null;
  leftKneeVelocity: number | null;       // smoothed
  rightKneeVelocity: number | null;      // smoothed
  rawLeftKneeVelocityKmh: number | null;
  rawRightKneeVelocityKmh: number | null;
  leftKneeVelocityKmh: number | null;    // smoothed
  rightKneeVelocityKmh: number | null;   // smoothed
  
  // Hip velocity (px/frame and km/h)
  rawLeftHipVelocity: number | null;
  rawRightHipVelocity: number | null;
  leftHipVelocity: number | null;        // smoothed
  rightHipVelocity: number | null;       // smoothed
  rawLeftHipVelocityKmh: number | null;
  rawRightHipVelocityKmh: number | null;
  leftHipVelocityKmh: number | null;     // smoothed
  rightHipVelocityKmh: number | null;    // smoothed
  
  // Shoulder velocity (px/frame and km/h)
  rawLeftShoulderVelocity: number | null;
  rawRightShoulderVelocity: number | null;
  leftShoulderVelocity: number | null;   // smoothed
  rightShoulderVelocity: number | null;  // smoothed
  rawLeftShoulderVelocityKmh: number | null;
  rawRightShoulderVelocityKmh: number | null;
  leftShoulderVelocityKmh: number | null;   // smoothed
  rightShoulderVelocityKmh: number | null;  // smoothed
  
  // Elbow velocity (px/frame and km/h)
  rawLeftElbowVelocity: number | null;
  rawRightElbowVelocity: number | null;
  leftElbowVelocity: number | null;      // smoothed
  rightElbowVelocity: number | null;     // smoothed
  rawLeftElbowVelocityKmh: number | null;
  rawRightElbowVelocityKmh: number | null;
  leftElbowVelocityKmh: number | null;   // smoothed
  rightElbowVelocityKmh: number | null;  // smoothed
  
  // Acceleration - per body part (km/h per second, derived from smoothed velocity)
  leftWristAcceleration: number | null;
  rightWristAcceleration: number | null;
  maxWristAcceleration: number | null;
  
  leftAnkleAcceleration: number | null;
  rightAnkleAcceleration: number | null;
  maxAnkleAcceleration: number | null;
  
  leftKneeAcceleration: number | null;
  rightKneeAcceleration: number | null;
  maxKneeAcceleration: number | null;
  
  leftHipAcceleration: number | null;
  rightHipAcceleration: number | null;
  maxHipAcceleration: number | null;
  
  leftShoulderAcceleration: number | null;
  rightShoulderAcceleration: number | null;
  maxShoulderAcceleration: number | null;
  
  leftElbowAcceleration: number | null;
  rightElbowAcceleration: number | null;
  maxElbowAcceleration: number | null;
  
  radialVelocity: number | null;
  
  // Knee bend (angle in degrees, 180 = straight, lower = more bent)
  rawLeftKneeBend: number | null;
  rawRightKneeBend: number | null;
  rawMaxKneeBend: number | null;        // max bend (min angle) of both knees
  leftKneeBend: number | null;          // smoothed
  rightKneeBend: number | null;         // smoothed
  maxKneeBend: number | null;           // smoothed max bend of both
  
  // Shoulder angle (angle at shoulder: hip-shoulder-elbow, in degrees)
  // 180 = arm straight down, 0 = arm straight up, ~90 = arm horizontal
  rawLeftShoulderAngle: number | null;
  rawRightShoulderAngle: number | null;
  leftShoulderAngle: number | null;     // smoothed
  rightShoulderAngle: number | null;    // smoothed
  
  // Elbow angle (angle at elbow: shoulder-elbow-wrist, in degrees)
  // 180 = arm straight, lower = more bent
  rawLeftElbowAngle: number | null;
  rawRightElbowAngle: number | null;
  leftElbowAngle: number | null;        // smoothed
  rightElbowAngle: number | null;       // smoothed
  
  // Hip angle (angle at hip: shoulder-hip-knee, in degrees)
  // 180 = standing straight, lower = more bent forward
  rawLeftHipAngle: number | null;
  rawRightHipAngle: number | null;
  leftHipAngle: number | null;          // smoothed
  rightHipAngle: number | null;         // smoothed
  
  // Orientation
  bodyOrientation: number | null;
  orientationVelocity: number | null;  // degrees/frame
  
  // Hip and Shoulder line angles (for measuring rotation of body segments)
  // These measure the angle of the line connecting left-to-right keypoints
  hipLineAngle: number | null;         // angle of left hip -> right hip line (degrees)
  shoulderLineAngle: number | null;    // angle of left shoulder -> right shoulder line (degrees)
  
  // Angular velocities (degrees/second) - how fast each segment is rotating
  hipAngularVelocity: number | null;       // rate of hip line rotation (deg/sec)
  shoulderAngularVelocity: number | null;  // rate of shoulder line rotation (deg/sec)
  
  // X-Factor: separation between shoulder and hip rotation (important for sports biomechanics)
  xFactor: number | null;              // shoulderLineAngle - hipLineAngle (degrees)
  
  // Combined metrics
  swingScore: number | null;           // velocity * |orientationVelocity|
  
  // Phase detection
  phase: SwingPhase;
}

// ============================================================================
// Results & Config
// ============================================================================

/**
 * Complete swing detection result
 */
export interface SwingDetectionResultV3 {
  swings: DetectedSwingV3[];
  frameData: SwingFrameDataV3[];
  
  // Summary
  totalSwings: number;
  forehandCount: number;
  backhandCount: number;
  serveCount: number;
  averageVelocity: number;
  maxVelocity: number;
  averageRotation: number;
  
  // Metadata
  framesAnalyzed: number;
  videoDuration: number;
  analysisTimestamp: string;
}

/**
 * Configuration for V3 detection
 */
export interface SwingDetectionConfigV3 {
  // Velocity thresholds
  minVelocityThreshold: number;      // Min wrist velocity to consider (px/frame)
  minVelocityKmh: number;            // Min velocity in km/h to count as valid swing
  velocityPercentile: number;        // Percentile for adaptive threshold
  
  // Wrist selection
  wristMode: WristMode;              // Which wrist(s) to use: "both" (sum), "max", or "dominant"
  
  // Rotation thresholds
  minRotationVelocity: number;       // Min rotation speed to count (degrees/frame)
  requireRotation: boolean;          // Reject peaks without body rotation
  rotationWeight: number;            // Weight for rotation in swing score (0-1)
  
  // Timing
  minSwingDuration: number;          // Min frames for a valid swing
  maxSwingDuration: number;          // Max frames for a valid swing
  minTimeBetweenSwings: number;      // Min seconds between consecutive swings
  
  // Phase detection
  loadingRotationThreshold: number;  // Rotation velocity threshold for loading phase
  contactVelocityRatio: number;      // Ratio of peak to count as contact
  
  // Filtering
  smoothingWindow: number;           // Moving average window size
  minConfidence: number;             // Min keypoint confidence
  
  // Classification
  classifySwingType: boolean;        // Enable forehand/backhand classification
  handedness: "right" | "left";      // Player's dominant hand
  
  // Clip boundaries (for analysis export)
  clipLeadTime: number;              // Seconds before followEnd to start clip
  clipTrailTime: number;             // Seconds after followEnd to end clip
}

// ============================================================================
// Hook Props
// ============================================================================

export interface UseSwingDetectionV3Props {
  preprocessedPoses: Map<number, PoseDetectionResult[]>;
  selectedModel: SupportedModel;
  videoFPS: number;
  selectedPoseIndex?: number;
  config?: Partial<SwingDetectionConfigV3>;
}

// ============================================================================
// Keypoint Indices
// ============================================================================

export interface KeypointIndices {
  leftWrist: number;
  rightWrist: number;
  leftElbow: number;
  rightElbow: number;
  leftShoulder: number;
  rightShoulder: number;
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
  leftAnkle: number;
  rightAnkle: number;
  nose: number;
}





