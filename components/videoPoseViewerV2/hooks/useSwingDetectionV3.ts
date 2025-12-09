/**
 * Swing Detection V3
 * 
 * Enhanced swing detection using body orientation + wrist velocity.
 * Key improvements over V2:
 * - Correlates body rotation with wrist velocity for better swing detection
 * - Classifies swing type (forehand/backhand) based on rotation direction
 * - Detects swing phases (loading, swing, contact, follow-through, recovery)
 * - Reduces false positives by requiring coordinated rotation + velocity
 */

import { useState, useCallback, useMemo } from "react";
import type { PoseDetectionResult, SupportedModel } from "@/hooks/usePoseDetection";
import { calculateBodyOrientation } from "@/components/chat/viewers/videoPoseViewer/utils/canvasDrawing";

// ============================================================================
// Constants
// ============================================================================

/** Assumed average person height in meters for velocity normalization */
export const ASSUMED_PERSON_HEIGHT = 1.7;

/** Torso is approximately 30% of total body height */
export const TORSO_TO_HEIGHT_RATIO = 0.30;

// ============================================================================
// Velocity Conversion Utilities
// ============================================================================

/**
 * Calculate meters per pixel based on average torso height in the video.
 * Uses the assumption that torso height represents ~30% of a 1.7m person.
 * 
 * @param avgTorsoHeightPx - Average torso height in pixels (shoulder to hip distance)
 * @returns Meters per pixel conversion factor
 */
export function calculateMetersPerPixel(avgTorsoHeightPx: number): number {
  const torsoHeight = avgTorsoHeightPx > 0 ? avgTorsoHeightPx : 100; // fallback 100px
  return (ASSUMED_PERSON_HEIGHT * TORSO_TO_HEIGHT_RATIO) / torsoHeight;
}

/**
 * Convert velocity from pixels/frame to km/h.
 * 
 * Formula: velocity_kmh = velocity_px_per_frame * metersPerPixel * FPS * 3.6
 * 
 * @param velocityPxPerFrame - Velocity in pixels per frame
 * @param metersPerPixel - Conversion factor from calculateMetersPerPixel()
 * @param fps - Video frames per second
 * @returns Velocity in km/h
 */
export function convertVelocityToKmh(
  velocityPxPerFrame: number,
  metersPerPixel: number,
  fps: number
): number {
  const velocityMetersPerSecond = velocityPxPerFrame * metersPerPixel * fps;
  return velocityMetersPerSecond * 3.6;
}

// ============================================================================
// Types
// ============================================================================

export type SwingType = "forehand" | "backhand" | "backhand_two_hand" | "serve" | "unknown";
export type SwingPhase = "neutral" | "loading" | "swing" | "contact" | "follow" | "recovery";

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
  
  // Wrist confidence scores (0-1, for visualizing where wrist detection failed)
  leftWristConfidence: number | null;    // confidence score at this frame
  rightWristConfidence: number | null;   // confidence score at this frame
  
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
  
  // Acceleration - per wrist (km/h per second, derived from smoothed velocity)
  leftWristAcceleration: number | null;
  rightWristAcceleration: number | null;
  maxWristAcceleration: number | null;   // max(abs(left), abs(right))
  
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
  
  // Combined metrics
  swingScore: number | null;           // velocity * |orientationVelocity|
  
  // Phase detection
  phase: SwingPhase;
}

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
 * Which wrist(s) to use for velocity calculation
 */
export type WristMode = "both" | "max" | "dominant";

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

// ============================================================================
// Hook
// ============================================================================

interface UseSwingDetectionV3Props {
  preprocessedPoses: Map<number, PoseDetectionResult[]>;
  selectedModel: SupportedModel;
  videoFPS: number;
  selectedPoseIndex?: number;
  config?: Partial<SwingDetectionConfigV3>;
}

export function useSwingDetectionV3({
  preprocessedPoses,
  selectedModel,
  videoFPS,
  selectedPoseIndex = 0,
  config: userConfig,
}: UseSwingDetectionV3Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SwingDetectionResultV3 | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG_V3,
    ...userConfig,
  }), [userConfig]);

  // Get keypoint indices based on model
  const indices = useMemo(() => {
    if (selectedModel === "BlazePose") {
      return {
        leftWrist: 15,
        rightWrist: 16,
        leftElbow: 13,
        rightElbow: 14,
        leftShoulder: 11,
        rightShoulder: 12,
        leftHip: 23,
        rightHip: 24,
        leftKnee: 25,
        rightKnee: 26,
        leftAnkle: 27,
        rightAnkle: 28,
        nose: 0,
      };
    }
    return {
      leftWrist: 9,
      rightWrist: 10,
      leftElbow: 7,
      rightElbow: 8,
      leftShoulder: 5,
      rightShoulder: 6,
      leftHip: 11,
      rightHip: 12,
      leftKnee: 13,
      rightKnee: 14,
      leftAnkle: 15,
      rightAnkle: 16,
      nose: 0,
    };
  }, [selectedModel]);

  /**
   * Calculate body center from core keypoints
   */
  const getBodyCenter = useCallback((
    pose: PoseDetectionResult,
    minConfidence: number
  ): { x: number; y: number } | null => {
    const keypoints = pose.keypoints;
    const coreIndices = [
      indices.leftShoulder,
      indices.rightShoulder,
      indices.leftHip,
      indices.rightHip,
    ];

    let sumX = 0, sumY = 0, count = 0;
    for (const idx of coreIndices) {
      const kp = keypoints[idx];
      if (kp && (kp.score ?? 0) >= minConfidence) {
        sumX += kp.x;
        sumY += kp.y;
        count++;
      }
    }

    if (count < 2) return null;
    return { x: sumX / count, y: sumY / count };
  }, [indices]);

  /**
   * Calculate keypoint velocity relative to body center
   * Works for any keypoint: wrist, ankle, knee, hip, shoulder, elbow
   */
  const calculateKeypointVelocity = useCallback((
    currPose: PoseDetectionResult,
    prevPose: PoseDetectionResult,
    keypointIdx: number,
    currCenter: { x: number; y: number },
    prevCenter: { x: number; y: number },
    minConfidence: number
  ): number | null => {
    const currKeypoint = currPose.keypoints[keypointIdx];
    const prevKeypoint = prevPose.keypoints[keypointIdx];
    
    if (!currKeypoint || !prevKeypoint) return null;
    if ((currKeypoint.score ?? 0) < minConfidence) return null;
    if ((prevKeypoint.score ?? 0) < minConfidence) return null;
    
    // Relative positions
    const currRelX = currKeypoint.x - currCenter.x;
    const currRelY = currKeypoint.y - currCenter.y;
    const prevRelX = prevKeypoint.x - prevCenter.x;
    const prevRelY = prevKeypoint.y - prevCenter.y;
    
    // Velocity
    const dx = currRelX - prevRelX;
    const dy = currRelY - prevRelY;
    
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  /**
   * Calculate radial velocity (positive = extending, negative = retracting)
   */
  const calculateRadialVelocity = useCallback((
    currPose: PoseDetectionResult,
    prevPose: PoseDetectionResult,
    wristIdx: number,
    currCenter: { x: number; y: number },
    prevCenter: { x: number; y: number },
    minConfidence: number
  ): number | null => {
    const currWrist = currPose.keypoints[wristIdx];
    const prevWrist = prevPose.keypoints[wristIdx];
    
    if (!currWrist || !prevWrist) return null;
    if ((currWrist.score ?? 0) < minConfidence) return null;
    if ((prevWrist.score ?? 0) < minConfidence) return null;
    
    const currRelX = currWrist.x - currCenter.x;
    const currRelY = currWrist.y - currCenter.y;
    const prevRelX = prevWrist.x - prevCenter.x;
    const prevRelY = prevWrist.y - prevCenter.y;
    
    const velX = currRelX - prevRelX;
    const velY = currRelY - prevRelY;
    
    const radialDist = Math.sqrt(currRelX * currRelX + currRelY * currRelY);
    if (radialDist < 1) return 0;
    
    const radialX = currRelX / radialDist;
    const radialY = currRelY / radialDist;
    
    return velX * radialX + velY * radialY;
  }, []);

  /**
   * Calculate knee bend angle (angle at knee joint)
   * Returns angle in degrees: 180 = straight leg, lower = more bent
   */
  const calculateKneeAngle = useCallback((
    pose: PoseDetectionResult,
    hipIdx: number,
    kneeIdx: number,
    ankleIdx: number,
    minConfidence: number
  ): number | null => {
    const hip = pose.keypoints[hipIdx];
    const knee = pose.keypoints[kneeIdx];
    const ankle = pose.keypoints[ankleIdx];
    
    if (!hip || !knee || !ankle) return null;
    if ((hip.score ?? 0) < minConfidence) return null;
    if ((knee.score ?? 0) < minConfidence) return null;
    if ((ankle.score ?? 0) < minConfidence) return null;
    
    // Vector from knee to hip
    const v1x = hip.x - knee.x;
    const v1y = hip.y - knee.y;
    
    // Vector from knee to ankle
    const v2x = ankle.x - knee.x;
    const v2y = ankle.y - knee.y;
    
    // Magnitudes
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    
    if (mag1 < 1 || mag2 < 1) return null;
    
    // Dot product
    const dot = v1x * v2x + v1y * v2y;
    
    // Angle in degrees
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    const angle = Math.acos(cosAngle) * (180 / Math.PI);
    
    return angle;
  }, []);

  /**
   * Calculate shoulder angle (angle at shoulder joint: hip-shoulder-elbow)
   * Returns angle in degrees: 180 = arm straight down along body, 0 = arm straight up
   * ~90 = arm horizontal
   */
  const calculateShoulderAngle = useCallback((
    pose: PoseDetectionResult,
    hipIdx: number,
    shoulderIdx: number,
    elbowIdx: number,
    minConfidence: number
  ): number | null => {
    const hip = pose.keypoints[hipIdx];
    const shoulder = pose.keypoints[shoulderIdx];
    const elbow = pose.keypoints[elbowIdx];
    
    if (!hip || !shoulder || !elbow) return null;
    if ((hip.score ?? 0) < minConfidence) return null;
    if ((shoulder.score ?? 0) < minConfidence) return null;
    if ((elbow.score ?? 0) < minConfidence) return null;
    
    // Vector from shoulder to hip
    const v1x = hip.x - shoulder.x;
    const v1y = hip.y - shoulder.y;
    
    // Vector from shoulder to elbow
    const v2x = elbow.x - shoulder.x;
    const v2y = elbow.y - shoulder.y;
    
    // Magnitudes
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    
    if (mag1 < 1 || mag2 < 1) return null;
    
    // Dot product
    const dot = v1x * v2x + v1y * v2y;
    
    // Angle in degrees
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    const angle = Math.acos(cosAngle) * (180 / Math.PI);
    
    return angle;
  }, []);

  /**
   * Calculate elbow angle (angle at elbow joint: shoulder-elbow-wrist)
   * Returns angle in degrees: 180 = arm straight, lower = more bent
   */
  const calculateElbowAngle = useCallback((
    pose: PoseDetectionResult,
    shoulderIdx: number,
    elbowIdx: number,
    wristIdx: number,
    minConfidence: number
  ): number | null => {
    const shoulder = pose.keypoints[shoulderIdx];
    const elbow = pose.keypoints[elbowIdx];
    const wrist = pose.keypoints[wristIdx];
    
    if (!shoulder || !elbow || !wrist) return null;
    if ((shoulder.score ?? 0) < minConfidence) return null;
    if ((elbow.score ?? 0) < minConfidence) return null;
    if ((wrist.score ?? 0) < minConfidence) return null;
    
    // Vector from elbow to shoulder
    const v1x = shoulder.x - elbow.x;
    const v1y = shoulder.y - elbow.y;
    
    // Vector from elbow to wrist
    const v2x = wrist.x - elbow.x;
    const v2y = wrist.y - elbow.y;
    
    // Magnitudes
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    
    if (mag1 < 1 || mag2 < 1) return null;
    
    // Dot product
    const dot = v1x * v2x + v1y * v2y;
    
    // Angle in degrees
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    const angle = Math.acos(cosAngle) * (180 / Math.PI);
    
    return angle;
  }, []);

  /**
   * Calculate hip angle (angle at hip joint: shoulder-hip-knee)
   * Returns angle in degrees: 180 = standing straight, lower = more bent/leaning
   */
  const calculateHipAngle = useCallback((
    pose: PoseDetectionResult,
    shoulderIdx: number,
    hipIdx: number,
    kneeIdx: number,
    minConfidence: number
  ): number | null => {
    const shoulder = pose.keypoints[shoulderIdx];
    const hip = pose.keypoints[hipIdx];
    const knee = pose.keypoints[kneeIdx];
    
    if (!shoulder || !hip || !knee) return null;
    if ((shoulder.score ?? 0) < minConfidence) return null;
    if ((hip.score ?? 0) < minConfidence) return null;
    if ((knee.score ?? 0) < minConfidence) return null;
    
    // Vector from hip to shoulder
    const v1x = shoulder.x - hip.x;
    const v1y = shoulder.y - hip.y;
    
    // Vector from hip to knee
    const v2x = knee.x - hip.x;
    const v2y = knee.y - hip.y;
    
    // Magnitudes
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    
    if (mag1 < 1 || mag2 < 1) return null;
    
    // Dot product
    const dot = v1x * v2x + v1y * v2y;
    
    // Angle in degrees
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    const angle = Math.acos(cosAngle) * (180 / Math.PI);
    
    return angle;
  }, []);

  /**
   * Fill in dropped measurements (pose detection artifacts) and smooth.
   * 
   * Strategy:
   * 1. Fill ONLY obvious single-frame artifact drops (physically implausible sudden drops)
   * 2. Apply light Gaussian smoothing for a cleaner curve
   * 
   * IMPORTANT: We do NOT interpolate between peaks or fill valleys.
   * Real motion data has legitimate peaks AND valleys - we must preserve them.
   * Only single-frame drops that are physically impossible are filled.
   */
  const fillDrops = useCallback((
    data: (number | null)[],
    _dropThreshold: number = 0.6  // Unused, kept for API compatibility
  ): (number | null)[] => {
    if (data.length < 5) return [...data];
    
    let result = [...data];
    
    // Pass 1: Fill ONLY single-frame artifact drops
    // These are sudden single-frame decreases that are physically impossible
    // (e.g., wrist velocity can't drop 80% and recover in one frame)
    for (let i = 1; i < result.length - 1; i++) {
      const prev = result[i - 1];
      const curr = result[i];
      const next = result[i + 1];
      
      if (prev === null || curr === null || next === null) continue;
      
      // Only fill if:
      // 1. Current value is very low compared to BOTH neighbors (artifact, not real valley)
      // 2. Both neighbors are similar (ruling out transitions)
      // 3. The drop is severe (< 30% of neighbor average)
      const neighborAvg = (prev + next) / 2;
      const neighborDiff = Math.abs(prev - next);
      const isSevereArtifact = curr < neighborAvg * 0.3 && 
                               neighborDiff < neighborAvg * 0.5 && // Neighbors are similar
                               neighborAvg > 5; // Only meaningful signals
      
      if (isSevereArtifact) {
        result[i] = neighborAvg;
      }
    }
    
    // Pass 2: Light Gaussian smoothing (single pass, smaller kernel)
    // This reduces noise without distorting the signal shape
    const smoothed: (number | null)[] = [];
    const weights = [0.1, 0.2, 0.4, 0.2, 0.1]; // 5-frame kernel (lighter than before)
    const halfKernel = Math.floor(weights.length / 2);
    
    for (let i = 0; i < result.length; i++) {
      if (result[i] === null) {
        smoothed.push(null);
        continue;
      }
      
      let sum = 0;
      let weightSum = 0;
      
      for (let k = -halfKernel; k <= halfKernel; k++) {
        const idx = i + k;
        if (idx >= 0 && idx < result.length && result[idx] !== null) {
          const weight = weights[k + halfKernel];
          sum += result[idx]! * weight;
          weightSum += weight;
        }
      }
      
      smoothed.push(weightSum > 0 ? sum / weightSum : result[i]);
    }
    
    return smoothed;
  }, []);

  /**
   * Apply moving average smoothing
   */
  const smoothData = useCallback((
    data: (number | null)[],
    windowSize: number
  ): (number | null)[] => {
    const result: (number | null)[] = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < data.length; i++) {
      if (data[i] === null) {
        result.push(null);
        continue;
      }

      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - halfWindow); j <= Math.min(data.length - 1, i + halfWindow); j++) {
        if (data[j] !== null) {
          sum += data[j]!;
          count++;
        }
      }
      result.push(count > 0 ? sum / count : null);
    }

    return result;
  }, []);

  /**
   * Find local maxima (peaks) in data
   */
  const findPeaks = useCallback((
    data: (number | null)[],
    minValue: number,
    minDistance: number
  ): number[] => {
    const peaks: number[] = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      const curr = data[i];
      const prev = data[i - 1];
      const next = data[i + 1];
      
      if (curr === null || prev === null || next === null) continue;
      if (curr < minValue) continue;
      if (curr <= prev || curr <= next) continue;
      
      // Check distance from last peak
      if (peaks.length > 0) {
        const lastPeak = peaks[peaks.length - 1];
        if (i - lastPeak < minDistance) {
          // Keep the higher peak
          if (curr > (data[lastPeak] ?? 0)) {
            peaks.pop();
            peaks.push(i);
          }
          continue;
        }
      }
      
      peaks.push(i);
    }
    
    return peaks;
  }, []);

  /**
   * Check if the arm is in a serve position (wrist significantly above shoulder)
   * In image coordinates, Y increases downward, so "above" means smaller Y values
   * Returns the maximum "height ratio" found in the window around the peak
   * (how far above the shoulder the wrist goes, as a ratio of torso height)
   * 
   * For serves, we need to look much further back in time because:
   * - The trophy position (high arm) happens 0.5-1s before ball contact
   * - Peak wrist velocity is at contact, but high arm is during loading
   * - We check BOTH arms since tossing arm also goes high
   */
  const checkServePosture = useCallback((
    frameData: SwingFrameDataV3[],
    peakFrame: number,
    windowSize: number,
    handedness: "right" | "left",
    minConfidence: number
  ): { isServe: boolean; maxHeightRatio: number } => {
    const frames = Array.from(preprocessedPoses.keys()).sort((a, b) => a - b);
    
    let maxHeightRatio = 0;
    
    // For serves, look much further back - trophy position can be 30-45 frames (1-1.5s) before contact
    // Also look slightly ahead in case we catch the motion mid-swing
    const serveWindowBack = Math.max(windowSize * 4, 45); // Look back ~1.5s at 30fps
    const serveWindowForward = Math.floor(windowSize / 2);
    
    for (let i = Math.max(0, peakFrame - serveWindowBack); i <= Math.min(frames.length - 1, peakFrame + serveWindowForward); i++) {
      const frame = frames[i];
      const poses = preprocessedPoses.get(frame);
      const pose = poses?.[selectedPoseIndex];
      if (!pose) continue;
      
      const keypoints = pose.keypoints;
      
      // Check BOTH wrists - in a serve, both arms go up (toss + hitting arm)
      // Use the average of both shoulders and hips for stable torso measurement
      const leftShoulder = keypoints[indices.leftShoulder];
      const rightShoulder = keypoints[indices.rightShoulder];
      const leftHip = keypoints[indices.leftHip];
      const rightHip = keypoints[indices.rightHip];
      const leftWrist = keypoints[indices.leftWrist];
      const rightWrist = keypoints[indices.rightWrist];
      
      // Need at least one shoulder and one hip for torso reference
      const validLeftShoulder = leftShoulder && (leftShoulder.score ?? 0) >= minConfidence;
      const validRightShoulder = rightShoulder && (rightShoulder.score ?? 0) >= minConfidence;
      const validLeftHip = leftHip && (leftHip.score ?? 0) >= minConfidence;
      const validRightHip = rightHip && (rightHip.score ?? 0) >= minConfidence;
      
      if (!validLeftShoulder && !validRightShoulder) continue;
      if (!validLeftHip && !validRightHip) continue;
      
      // Calculate average shoulder and hip positions
      let shoulderY = 0, shoulderCount = 0;
      let hipY = 0, hipCount = 0;
      
      if (validLeftShoulder) { shoulderY += leftShoulder.y; shoulderCount++; }
      if (validRightShoulder) { shoulderY += rightShoulder.y; shoulderCount++; }
      if (validLeftHip) { hipY += leftHip.y; hipCount++; }
      if (validRightHip) { hipY += rightHip.y; hipCount++; }
      
      shoulderY /= shoulderCount;
      hipY /= hipCount;
      
      // Calculate torso height for normalization
      const torsoHeight = Math.abs(hipY - shoulderY);
      if (torsoHeight < 10) continue; // Too small to be reliable
      
      // Check both wrists for high position
      const wristsToCheck = [
        { wrist: leftWrist, valid: leftWrist && (leftWrist.score ?? 0) >= minConfidence },
        { wrist: rightWrist, valid: rightWrist && (rightWrist.score ?? 0) >= minConfidence },
      ];
      
      for (const { wrist, valid } of wristsToCheck) {
        if (!valid || !wrist) continue;
        
        // Calculate how far above the shoulder line the wrist is
        // Positive = wrist is above shoulder (remember Y is inverted in image coords)
        const heightAboveShoulder = shoulderY - wrist.y;
        const heightRatio = heightAboveShoulder / torsoHeight;
        
        maxHeightRatio = Math.max(maxHeightRatio, heightRatio);
      }
    }
    
    // Consider it a serve if either wrist goes at least 0.4x torso height above shoulder line
    // This catches the trophy position where the arm is roughly at head level or above
    const SERVE_HEIGHT_THRESHOLD = 0.4;
    
    return {
      isServe: maxHeightRatio >= SERVE_HEIGHT_THRESHOLD,
      maxHeightRatio,
    };
  }, [preprocessedPoses, selectedPoseIndex, indices]);

  /**
   * Check if a backhand is two-handed by measuring only the distance between wrists.
   * In a two-handed backhand, both wrists are close together gripping the racket.
   * Distance is normalized by shoulder width for scale-independence.
   */
  const checkTwoHandedBackhand = useCallback((
    peakFrame: number,
    windowSize: number,
    minConfidence: number
  ): { isTwoHanded: boolean; minDistanceRatio: number } => {
    const frames = Array.from(preprocessedPoses.keys()).sort((a, b) => a - b);
    
    let minDistanceRatio = Infinity;
    
    // Look in a window around the peak - during the swing both hands are on the racket
    for (let i = Math.max(0, peakFrame - windowSize); i <= Math.min(frames.length - 1, peakFrame + windowSize); i++) {
      const frame = frames[i];
      const poses = preprocessedPoses.get(frame);
      const pose = poses?.[selectedPoseIndex];
      if (!pose) continue;
      
      const keypoints = pose.keypoints;
      
      // Only need both wrists
      const leftWrist = keypoints[indices.leftWrist];
      const rightWrist = keypoints[indices.rightWrist];
      
      if (!leftWrist || !rightWrist) continue;
      if ((leftWrist.score ?? 0) < minConfidence) continue;
      if ((rightWrist.score ?? 0) < minConfidence) continue;
      
      // Calculate distance between wrists
      const wristDistance = Math.sqrt(
        Math.pow(rightWrist.x - leftWrist.x, 2) +
        Math.pow(rightWrist.y - leftWrist.y, 2)
      );
      
      // Get shoulder width for normalization (if available)
      const leftShoulder = keypoints[indices.leftShoulder];
      const rightShoulder = keypoints[indices.rightShoulder];
      
      let shoulderWidth = 150; // Default fallback in pixels
      if (leftShoulder && rightShoulder &&
          (leftShoulder.score ?? 0) >= minConfidence &&
          (rightShoulder.score ?? 0) >= minConfidence) {
        shoulderWidth = Math.sqrt(
          Math.pow(rightShoulder.x - leftShoulder.x, 2) +
          Math.pow(rightShoulder.y - leftShoulder.y, 2)
        );
        if (shoulderWidth < 10) shoulderWidth = 150; // Fallback if too small
      }
      
      // Ratio of wrist distance to shoulder width
      const distanceRatio = wristDistance / shoulderWidth;
      minDistanceRatio = Math.min(minDistanceRatio, distanceRatio);
    }
    
    // Two-handed if wrists are within ~60% of shoulder width at any point
    const TWO_HANDED_THRESHOLD = 0.6;
    
    return {
      isTwoHanded: minDistanceRatio <= TWO_HANDED_THRESHOLD,
      minDistanceRatio: minDistanceRatio === Infinity ? -1 : minDistanceRatio,
    };
  }, [preprocessedPoses, selectedPoseIndex, indices]);

  /**
   * Determine swing type based on rotation direction, body orientation, and arm position
   */
  const classifySwingType = useCallback((
    orientationVelocities: (number | null)[],
    peakFrame: number,
    windowSize: number,
    handedness: "right" | "left",
    frameData: SwingFrameDataV3[],
    minConfidence: number
  ): SwingType => {
    // First, check if this is a serve (arm goes high above shoulder)
    const serveCheck = checkServePosture(frameData, peakFrame, windowSize, handedness, minConfidence);
    if (serveCheck.isServe) {
      return "serve";
    }
    
    // Helper to determine if backhand is one-handed or two-handed
    const classifyBackhand = (): SwingType => {
      const twoHandedCheck = checkTwoHandedBackhand(peakFrame, windowSize, minConfidence);
      return twoHandedCheck.isTwoHanded ? "backhand_two_hand" : "backhand";
    };
    
    // Method 1: Look at average rotation velocity around the peak
    let sumRotation = 0;
    let rotationCount = 0;
    
    for (let i = Math.max(0, peakFrame - windowSize); i <= Math.min(orientationVelocities.length - 1, peakFrame + windowSize); i++) {
      const rot = orientationVelocities[i];
      if (rot !== null) {
        sumRotation += rot;
        rotationCount++;
      }
    }
    
    const avgRotation = rotationCount > 0 ? sumRotation / rotationCount : 0;
    
    // For right-handed player:
    // - Forehand: rotating toward right (positive orientation velocity)
    // - Backhand: rotating toward left (negative orientation velocity)
    // For left-handed player: opposite
    
    if (handedness === "right") {
      if (avgRotation > 0.5) return "forehand";
      if (avgRotation < -0.5) return classifyBackhand();
    } else {
      if (avgRotation < -0.5) return "forehand";
      if (avgRotation > 0.5) return classifyBackhand();
    }
    
    // Method 2: If rotation velocity is inconclusive, use absolute body orientation
    // This helps when we catch the swing during follow-through where rotation has slowed
    // Look at body orientation during the swing (from loading to contact)
    let sumOrientation = 0;
    let orientationCount = 0;
    
    // Look at a window centered around the peak, weighted toward before peak (loading/swing phases)
    const orientationWindowBack = windowSize * 2;
    const orientationWindowForward = windowSize;
    
    for (let i = Math.max(0, peakFrame - orientationWindowBack); i <= Math.min(frameData.length - 1, peakFrame + orientationWindowForward); i++) {
      const orientation = frameData[i]?.bodyOrientation;
      if (orientation !== null && orientation !== undefined) {
        sumOrientation += orientation;
        orientationCount++;
      }
    }
    
    if (orientationCount > 0) {
      const avgOrientation = sumOrientation / orientationCount;
      
      // Body orientation interpretation (assuming 0° is facing camera/baseline):
      // - Negative angles: body rotated toward backhand side
      // - Positive angles: body rotated toward forehand side
      // Use a threshold to avoid classifying neutral stances
      const ORIENTATION_THRESHOLD = 15; // degrees
      
      if (handedness === "right") {
        // Right-handed: negative orientation = backhand side, positive = forehand side
        if (avgOrientation < -ORIENTATION_THRESHOLD) return classifyBackhand();
        if (avgOrientation > ORIENTATION_THRESHOLD) return "forehand";
      } else {
        // Left-handed: opposite
        if (avgOrientation > ORIENTATION_THRESHOLD) return classifyBackhand();
        if (avgOrientation < -ORIENTATION_THRESHOLD) return "forehand";
      }
    }
    
    return "unknown";
  }, [checkServePosture, checkTwoHandedBackhand]);

  /**
   * Detect swing phases around a peak
   * @param minFrame - The earliest frame to consider (e.g., followEnd of previous swing)
   *                   This prevents loading phase from extending into previous swing's territory
   */
  const detectPhases = useCallback((
    frameData: SwingFrameDataV3[],
    peakFrame: number,
    config: SwingDetectionConfigV3,
    minFrame: number = 0
  ): { loadingStart: number; swingStart: number; followEnd: number } => {
    const peakVelocity = frameData[peakFrame]?.wristVelocity ?? 0;
    const threshold = peakVelocity * config.contactVelocityRatio;
    
    // Find loading start (where rotation begins)
    // Constrained to not go before minFrame (previous swing's followEnd)
    let loadingStart = peakFrame;
    for (let i = peakFrame - 1; i >= minFrame; i--) {
      const data = frameData[i];
      if (!data || data.orientationVelocity === null) break;
      if (Math.abs(data.orientationVelocity) < config.loadingRotationThreshold) {
        loadingStart = i + 1;
        break;
      }
      loadingStart = i;
    }
    // Ensure loadingStart doesn't go below minFrame
    loadingStart = Math.max(loadingStart, minFrame);
    
    // Find swing start (where velocity starts rising significantly)
    let swingStart = peakFrame;
    for (let i = peakFrame - 1; i >= loadingStart; i--) {
      const data = frameData[i];
      if (!data || data.wristVelocity === null) break;
      if (data.wristVelocity < threshold * 0.3) {
        swingStart = i + 1;
        break;
      }
      swingStart = i;
    }
    
    // Find follow-through end (where velocity drops and rotation stops)
    let followEnd = peakFrame;
    for (let i = peakFrame + 1; i < frameData.length; i++) {
      const data = frameData[i];
      if (!data || data.wristVelocity === null) break;
      if (data.wristVelocity < threshold * 0.2) {
        followEnd = i;
        break;
      }
      followEnd = i;
    }
    
    return { loadingStart, swingStart, followEnd };
  }, []);

  /**
   * Main analysis function
   */
  const analyzeSwings = useCallback(async () => {
    if (preprocessedPoses.size === 0) {
      setError("No preprocessed poses available");
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const frames = Array.from(preprocessedPoses.keys()).sort((a, b) => a - b);
      const totalFrames = frames.length;
      const frameData: SwingFrameDataV3[] = [];
      
      // Track torso heights for velocity normalization
      let totalTorsoHeight = 0;
      let torsoHeightCount = 0;
      
      // First pass: calculate per-frame metrics
      for (let i = 0; i < totalFrames; i++) {
        const frame = frames[i];
        const poses = preprocessedPoses.get(frame);
        const pose = poses?.[selectedPoseIndex];
        
        const timestamp = frame / videoFPS;
        const dataPoint: SwingFrameDataV3 = {
          frame,
          timestamp,
          wristVelocity: null,
          wristVelocityKmh: null,
          rawWristVelocityKmh: null,
          leftWristVelocity: null,
          rightWristVelocity: null,
          rawLeftWristVelocityKmh: null,
          rawRightWristVelocityKmh: null,
          leftWristVelocityKmh: null,
          rightWristVelocityKmh: null,
          maxWristVelocityKmh: null,
          rawMaxWristVelocityKmh: null,
          leftWristConfidence: null,
          rightWristConfidence: null,
          // Ankle velocity
          rawLeftAnkleVelocity: null,
          rawRightAnkleVelocity: null,
          leftAnkleVelocity: null,
          rightAnkleVelocity: null,
          rawLeftAnkleVelocityKmh: null,
          rawRightAnkleVelocityKmh: null,
          leftAnkleVelocityKmh: null,
          rightAnkleVelocityKmh: null,
          // Knee velocity
          rawLeftKneeVelocity: null,
          rawRightKneeVelocity: null,
          leftKneeVelocity: null,
          rightKneeVelocity: null,
          rawLeftKneeVelocityKmh: null,
          rawRightKneeVelocityKmh: null,
          leftKneeVelocityKmh: null,
          rightKneeVelocityKmh: null,
          // Hip velocity
          rawLeftHipVelocity: null,
          rawRightHipVelocity: null,
          leftHipVelocity: null,
          rightHipVelocity: null,
          rawLeftHipVelocityKmh: null,
          rawRightHipVelocityKmh: null,
          leftHipVelocityKmh: null,
          rightHipVelocityKmh: null,
          // Shoulder velocity
          rawLeftShoulderVelocity: null,
          rawRightShoulderVelocity: null,
          leftShoulderVelocity: null,
          rightShoulderVelocity: null,
          rawLeftShoulderVelocityKmh: null,
          rawRightShoulderVelocityKmh: null,
          leftShoulderVelocityKmh: null,
          rightShoulderVelocityKmh: null,
          // Elbow velocity
          rawLeftElbowVelocity: null,
          rawRightElbowVelocity: null,
          leftElbowVelocity: null,
          rightElbowVelocity: null,
          rawLeftElbowVelocityKmh: null,
          rawRightElbowVelocityKmh: null,
          leftElbowVelocityKmh: null,
          rightElbowVelocityKmh: null,
          // Acceleration
          leftWristAcceleration: null,
          rightWristAcceleration: null,
          maxWristAcceleration: null,
          radialVelocity: null,
          rawLeftKneeBend: null,
          rawRightKneeBend: null,
          rawMaxKneeBend: null,
          leftKneeBend: null,
          rightKneeBend: null,
          maxKneeBend: null,
          rawLeftShoulderAngle: null,
          rawRightShoulderAngle: null,
          leftShoulderAngle: null,
          rightShoulderAngle: null,
          rawLeftElbowAngle: null,
          rawRightElbowAngle: null,
          leftElbowAngle: null,
          rightElbowAngle: null,
          rawLeftHipAngle: null,
          rawRightHipAngle: null,
          leftHipAngle: null,
          rightHipAngle: null,
          bodyOrientation: null,
          orientationVelocity: null,
          swingScore: null,
          phase: "neutral",
        };
        
        if (!pose) {
          frameData.push(dataPoint);
          continue;
        }
        
        // Track wrist confidence scores for visualization
        const leftWrist = pose.keypoints[indices.leftWrist];
        const rightWrist = pose.keypoints[indices.rightWrist];
        dataPoint.leftWristConfidence = leftWrist?.score ?? null;
        dataPoint.rightWristConfidence = rightWrist?.score ?? null;
        
        // Track torso height for velocity normalization
        // Torso = shoulder to hip distance
        const leftShoulder = pose.keypoints[indices.leftShoulder];
        const rightShoulder = pose.keypoints[indices.rightShoulder];
        const leftHip = pose.keypoints[indices.leftHip];
        const rightHip = pose.keypoints[indices.rightHip];
        
        if (leftShoulder && rightShoulder && leftHip && rightHip &&
            (leftShoulder.score ?? 0) >= config.minConfidence &&
            (rightShoulder.score ?? 0) >= config.minConfidence &&
            (leftHip.score ?? 0) >= config.minConfidence &&
            (rightHip.score ?? 0) >= config.minConfidence) {
          const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
          const hipMidY = (leftHip.y + rightHip.y) / 2;
          const torsoHeight = Math.abs(hipMidY - shoulderMidY);
          if (torsoHeight > 20) { // Minimum threshold to avoid noise
            totalTorsoHeight += torsoHeight;
            torsoHeightCount++;
          }
        }
        
        // Calculate body orientation
        const orientation = calculateBodyOrientation(
          pose.keypoints,
          selectedModel === "BlazePose" ? "BlazePose" : "MoveNet",
          config.minConfidence
        );
        dataPoint.bodyOrientation = orientation?.angle ?? null;
        
        // Calculate knee bend angles
        const leftKneeAngle = calculateKneeAngle(
          pose, indices.leftHip, indices.leftKnee, indices.leftAnkle, config.minConfidence
        );
        const rightKneeAngle = calculateKneeAngle(
          pose, indices.rightHip, indices.rightKnee, indices.rightAnkle, config.minConfidence
        );
        
        dataPoint.rawLeftKneeBend = leftKneeAngle;
        dataPoint.rawRightKneeBend = rightKneeAngle;
        
        // For "max bend", we want the most bent knee (lowest angle)
        if (leftKneeAngle !== null || rightKneeAngle !== null) {
          dataPoint.rawMaxKneeBend = Math.min(leftKneeAngle ?? 180, rightKneeAngle ?? 180);
        }
        
        // Calculate shoulder angles (hip-shoulder-elbow angle)
        const leftShoulderAngle = calculateShoulderAngle(
          pose, indices.leftHip, indices.leftShoulder, indices.leftElbow, config.minConfidence
        );
        const rightShoulderAngle = calculateShoulderAngle(
          pose, indices.rightHip, indices.rightShoulder, indices.rightElbow, config.minConfidence
        );
        
        dataPoint.rawLeftShoulderAngle = leftShoulderAngle;
        dataPoint.rawRightShoulderAngle = rightShoulderAngle;
        
        // Calculate elbow angles (shoulder-elbow-wrist angle)
        const leftElbowAngle = calculateElbowAngle(
          pose, indices.leftShoulder, indices.leftElbow, indices.leftWrist, config.minConfidence
        );
        const rightElbowAngle = calculateElbowAngle(
          pose, indices.rightShoulder, indices.rightElbow, indices.rightWrist, config.minConfidence
        );
        
        dataPoint.rawLeftElbowAngle = leftElbowAngle;
        dataPoint.rawRightElbowAngle = rightElbowAngle;
        
        // Calculate hip angles (shoulder-hip-knee angle)
        const leftHipAngle = calculateHipAngle(
          pose, indices.leftShoulder, indices.leftHip, indices.leftKnee, config.minConfidence
        );
        const rightHipAngle = calculateHipAngle(
          pose, indices.rightShoulder, indices.rightHip, indices.rightKnee, config.minConfidence
        );
        
        dataPoint.rawLeftHipAngle = leftHipAngle;
        dataPoint.rawRightHipAngle = rightHipAngle;
        
        // Calculate velocities (need previous frame)
        if (i > 0) {
          const prevFrame = frames[i - 1];
          const prevPoses = preprocessedPoses.get(prevFrame);
          const prevPose = prevPoses?.[selectedPoseIndex];
          
          if (prevPose) {
            const currCenter = getBodyCenter(pose, config.minConfidence);
            const prevCenter = getBodyCenter(prevPose, config.minConfidence);
            
            if (currCenter && prevCenter) {
              // Wrist velocities
              const leftWristVel = calculateKeypointVelocity(
                pose, prevPose, indices.leftWrist, currCenter, prevCenter, config.minConfidence
              );
              const rightWristVel = calculateKeypointVelocity(
                pose, prevPose, indices.rightWrist, currCenter, prevCenter, config.minConfidence
              );
              
              dataPoint.leftWristVelocity = leftWristVel;
              dataPoint.rightWristVelocity = rightWristVel;
              
              // Calculate combined wrist velocity based on mode
              if (leftWristVel !== null || rightWristVel !== null) {
                switch (config.wristMode) {
                  case "both":
                    // Sum of both wrists (default)
                    dataPoint.wristVelocity = (leftWristVel ?? 0) + (rightWristVel ?? 0);
                    break;
                  case "max":
                    // Maximum of the two wrists
                    dataPoint.wristVelocity = Math.max(leftWristVel ?? 0, rightWristVel ?? 0);
                    break;
                  case "dominant":
                    // Only use the dominant hand based on handedness setting
                    dataPoint.wristVelocity = config.handedness === "right" 
                      ? (rightWristVel ?? 0) 
                      : (leftWristVel ?? 0);
                    break;
                  default:
                    dataPoint.wristVelocity = (leftWristVel ?? 0) + (rightWristVel ?? 0);
                }
              }
              
              // Ankle velocities
              dataPoint.rawLeftAnkleVelocity = calculateKeypointVelocity(
                pose, prevPose, indices.leftAnkle, currCenter, prevCenter, config.minConfidence
              );
              dataPoint.rawRightAnkleVelocity = calculateKeypointVelocity(
                pose, prevPose, indices.rightAnkle, currCenter, prevCenter, config.minConfidence
              );
              
              // Knee velocities
              dataPoint.rawLeftKneeVelocity = calculateKeypointVelocity(
                pose, prevPose, indices.leftKnee, currCenter, prevCenter, config.minConfidence
              );
              dataPoint.rawRightKneeVelocity = calculateKeypointVelocity(
                pose, prevPose, indices.rightKnee, currCenter, prevCenter, config.minConfidence
              );
              
              // Hip velocities
              dataPoint.rawLeftHipVelocity = calculateKeypointVelocity(
                pose, prevPose, indices.leftHip, currCenter, prevCenter, config.minConfidence
              );
              dataPoint.rawRightHipVelocity = calculateKeypointVelocity(
                pose, prevPose, indices.rightHip, currCenter, prevCenter, config.minConfidence
              );
              
              // Shoulder velocities
              dataPoint.rawLeftShoulderVelocity = calculateKeypointVelocity(
                pose, prevPose, indices.leftShoulder, currCenter, prevCenter, config.minConfidence
              );
              dataPoint.rawRightShoulderVelocity = calculateKeypointVelocity(
                pose, prevPose, indices.rightShoulder, currCenter, prevCenter, config.minConfidence
              );
              
              // Elbow velocities
              dataPoint.rawLeftElbowVelocity = calculateKeypointVelocity(
                pose, prevPose, indices.leftElbow, currCenter, prevCenter, config.minConfidence
              );
              dataPoint.rawRightElbowVelocity = calculateKeypointVelocity(
                pose, prevPose, indices.rightElbow, currCenter, prevCenter, config.minConfidence
              );
              
              // Radial velocity (use dominant wrist)
              const radialLeft = calculateRadialVelocity(
                pose, prevPose, indices.leftWrist, currCenter, prevCenter, config.minConfidence
              );
              const radialRight = calculateRadialVelocity(
                pose, prevPose, indices.rightWrist, currCenter, prevCenter, config.minConfidence
              );
              dataPoint.radialVelocity = Math.max(radialLeft ?? 0, radialRight ?? 0);
            }
            
            // Orientation velocity
            const prevOrientation = calculateBodyOrientation(
              prevPose.keypoints,
              selectedModel === "BlazePose" ? "BlazePose" : "MoveNet",
              config.minConfidence
            );
            
            if (orientation && prevOrientation) {
              let orientDiff = orientation.angle - prevOrientation.angle;
              // Handle wrap-around
              if (orientDiff > 180) orientDiff -= 360;
              if (orientDiff < -180) orientDiff += 360;
              dataPoint.orientationVelocity = orientDiff;
            }
          }
        }
        
        // Calculate swing score
        if (dataPoint.wristVelocity !== null && dataPoint.orientationVelocity !== null) {
          const velocityComponent = dataPoint.wristVelocity;
          const rotationComponent = Math.abs(dataPoint.orientationVelocity);
          dataPoint.swingScore = velocityComponent * (1 - config.rotationWeight) + 
                                  velocityComponent * rotationComponent * config.rotationWeight;
        }
        
        frameData.push(dataPoint);
      }
      
      // Calculate meters per pixel based on average torso height
      const avgTorsoHeight = torsoHeightCount > 0 ? totalTorsoHeight / torsoHeightCount : 100;
      const metersPerPixel = calculateMetersPerPixel(avgTorsoHeight);
      
      // ========================================================================
      // STEP 1: Calculate RAW km/h values for all wrists (before any processing)
      // ========================================================================
      for (let i = 0; i < frameData.length; i++) {
        const fd = frameData[i];
        
        // Raw combined velocity
        if (fd.wristVelocity !== null) {
          fd.rawWristVelocityKmh = convertVelocityToKmh(fd.wristVelocity, metersPerPixel, videoFPS);
        }
        
        // Raw left wrist velocity
        if (fd.leftWristVelocity !== null) {
          fd.rawLeftWristVelocityKmh = convertVelocityToKmh(fd.leftWristVelocity, metersPerPixel, videoFPS);
        }
        
        // Raw right wrist velocity
        if (fd.rightWristVelocity !== null) {
          fd.rawRightWristVelocityKmh = convertVelocityToKmh(fd.rightWristVelocity, metersPerPixel, videoFPS);
        }
        
        // Raw max of both wrists
        if (fd.leftWristVelocity !== null || fd.rightWristVelocity !== null) {
          const maxVel = Math.max(fd.leftWristVelocity ?? 0, fd.rightWristVelocity ?? 0);
          fd.rawMaxWristVelocityKmh = convertVelocityToKmh(maxVel, metersPerPixel, videoFPS);
        }
        
        // Raw ankle velocities km/h
        if (fd.rawLeftAnkleVelocity !== null) {
          fd.rawLeftAnkleVelocityKmh = convertVelocityToKmh(fd.rawLeftAnkleVelocity, metersPerPixel, videoFPS);
        }
        if (fd.rawRightAnkleVelocity !== null) {
          fd.rawRightAnkleVelocityKmh = convertVelocityToKmh(fd.rawRightAnkleVelocity, metersPerPixel, videoFPS);
        }
        
        // Raw knee velocities km/h
        if (fd.rawLeftKneeVelocity !== null) {
          fd.rawLeftKneeVelocityKmh = convertVelocityToKmh(fd.rawLeftKneeVelocity, metersPerPixel, videoFPS);
        }
        if (fd.rawRightKneeVelocity !== null) {
          fd.rawRightKneeVelocityKmh = convertVelocityToKmh(fd.rawRightKneeVelocity, metersPerPixel, videoFPS);
        }
        
        // Raw hip velocities km/h
        if (fd.rawLeftHipVelocity !== null) {
          fd.rawLeftHipVelocityKmh = convertVelocityToKmh(fd.rawLeftHipVelocity, metersPerPixel, videoFPS);
        }
        if (fd.rawRightHipVelocity !== null) {
          fd.rawRightHipVelocityKmh = convertVelocityToKmh(fd.rawRightHipVelocity, metersPerPixel, videoFPS);
        }
        
        // Raw shoulder velocities km/h
        if (fd.rawLeftShoulderVelocity !== null) {
          fd.rawLeftShoulderVelocityKmh = convertVelocityToKmh(fd.rawLeftShoulderVelocity, metersPerPixel, videoFPS);
        }
        if (fd.rawRightShoulderVelocity !== null) {
          fd.rawRightShoulderVelocityKmh = convertVelocityToKmh(fd.rawRightShoulderVelocity, metersPerPixel, videoFPS);
        }
        
        // Raw elbow velocities km/h
        if (fd.rawLeftElbowVelocity !== null) {
          fd.rawLeftElbowVelocityKmh = convertVelocityToKmh(fd.rawLeftElbowVelocity, metersPerPixel, videoFPS);
        }
        if (fd.rawRightElbowVelocity !== null) {
          fd.rawRightElbowVelocityKmh = convertVelocityToKmh(fd.rawRightElbowVelocity, metersPerPixel, videoFPS);
        }
      }
      
      // ========================================================================
      // STEP 2: Apply fillDrops to each data stream separately
      // ========================================================================
      const dropFilledCombined = fillDrops(frameData.map(d => d.wristVelocity), 0.5);
      const dropFilledLeft = fillDrops(frameData.map(d => d.leftWristVelocity), 0.5);
      const dropFilledRight = fillDrops(frameData.map(d => d.rightWristVelocity), 0.5);
      const dropFilledScores = fillDrops(frameData.map(d => d.swingScore), 0.5);
      const dropFilledOrientation = fillDrops(frameData.map(d => d.bodyOrientation), 0.5);
      
      // Knee bend (use inverted threshold since lower angle = more bend)
      const dropFilledLeftKnee = fillDrops(frameData.map(d => d.rawLeftKneeBend), 0.5);
      const dropFilledRightKnee = fillDrops(frameData.map(d => d.rawRightKneeBend), 0.5);
      
      // Shoulder angles
      const dropFilledLeftShoulder = fillDrops(frameData.map(d => d.rawLeftShoulderAngle), 0.5);
      const dropFilledRightShoulder = fillDrops(frameData.map(d => d.rawRightShoulderAngle), 0.5);
      
      // Elbow angles
      const dropFilledLeftElbow = fillDrops(frameData.map(d => d.rawLeftElbowAngle), 0.5);
      const dropFilledRightElbow = fillDrops(frameData.map(d => d.rawRightElbowAngle), 0.5);
      
      // Hip angles
      const dropFilledLeftHipAngle = fillDrops(frameData.map(d => d.rawLeftHipAngle), 0.5);
      const dropFilledRightHipAngle = fillDrops(frameData.map(d => d.rawRightHipAngle), 0.5);
      
      // Body part velocities (ankle, knee, hip, shoulder, elbow)
      const dropFilledLeftAnkleVel = fillDrops(frameData.map(d => d.rawLeftAnkleVelocity), 0.5);
      const dropFilledRightAnkleVel = fillDrops(frameData.map(d => d.rawRightAnkleVelocity), 0.5);
      const dropFilledLeftKneeVel = fillDrops(frameData.map(d => d.rawLeftKneeVelocity), 0.5);
      const dropFilledRightKneeVel = fillDrops(frameData.map(d => d.rawRightKneeVelocity), 0.5);
      const dropFilledLeftHipVel = fillDrops(frameData.map(d => d.rawLeftHipVelocity), 0.5);
      const dropFilledRightHipVel = fillDrops(frameData.map(d => d.rawRightHipVelocity), 0.5);
      const dropFilledLeftShoulderVel = fillDrops(frameData.map(d => d.rawLeftShoulderVelocity), 0.5);
      const dropFilledRightShoulderVel = fillDrops(frameData.map(d => d.rawRightShoulderVelocity), 0.5);
      const dropFilledLeftElbowVel = fillDrops(frameData.map(d => d.rawLeftElbowVelocity), 0.5);
      const dropFilledRightElbowVel = fillDrops(frameData.map(d => d.rawRightElbowVelocity), 0.5);
      
      // Calculate max from drop-filled individual wrists
      const dropFilledMax = dropFilledLeft.map((left, i) => {
        const right = dropFilledRight[i];
        if (left === null && right === null) return null;
        return Math.max(left ?? 0, right ?? 0);
      });
      
      // Calculate max knee bend (min angle = most bent)
      const dropFilledMaxKnee = dropFilledLeftKnee.map((left, i) => {
        const right = dropFilledRightKnee[i];
        if (left === null && right === null) return null;
        return Math.min(left ?? 180, right ?? 180);
      });
      
      // ========================================================================
      // STEP 3: Apply smoothing to each stream
      // ========================================================================
      const smoothedCombined = smoothData(dropFilledCombined, config.smoothingWindow);
      const smoothedLeft = smoothData(dropFilledLeft, config.smoothingWindow);
      const smoothedRight = smoothData(dropFilledRight, config.smoothingWindow);
      const smoothedMax = smoothData(dropFilledMax, config.smoothingWindow);
      const smoothedScores = smoothData(dropFilledScores, config.smoothingWindow);
      const smoothedOrientation = smoothData(dropFilledOrientation, config.smoothingWindow);
      const smoothedLeftKnee = smoothData(dropFilledLeftKnee, config.smoothingWindow);
      const smoothedRightKnee = smoothData(dropFilledRightKnee, config.smoothingWindow);
      const smoothedMaxKnee = smoothData(dropFilledMaxKnee, config.smoothingWindow);
      const smoothedLeftShoulder = smoothData(dropFilledLeftShoulder, config.smoothingWindow);
      const smoothedRightShoulder = smoothData(dropFilledRightShoulder, config.smoothingWindow);
      const smoothedLeftElbow = smoothData(dropFilledLeftElbow, config.smoothingWindow);
      const smoothedRightElbow = smoothData(dropFilledRightElbow, config.smoothingWindow);
      const smoothedLeftHipAngle = smoothData(dropFilledLeftHipAngle, config.smoothingWindow);
      const smoothedRightHipAngle = smoothData(dropFilledRightHipAngle, config.smoothingWindow);
      
      // Body part velocities smoothing
      const smoothedLeftAnkleVel = smoothData(dropFilledLeftAnkleVel, config.smoothingWindow);
      const smoothedRightAnkleVel = smoothData(dropFilledRightAnkleVel, config.smoothingWindow);
      const smoothedLeftKneeVel = smoothData(dropFilledLeftKneeVel, config.smoothingWindow);
      const smoothedRightKneeVel = smoothData(dropFilledRightKneeVel, config.smoothingWindow);
      const smoothedLeftHipVel = smoothData(dropFilledLeftHipVel, config.smoothingWindow);
      const smoothedRightHipVel = smoothData(dropFilledRightHipVel, config.smoothingWindow);
      const smoothedLeftShoulderVel = smoothData(dropFilledLeftShoulderVel, config.smoothingWindow);
      const smoothedRightShoulderVel = smoothData(dropFilledRightShoulderVel, config.smoothingWindow);
      const smoothedLeftElbowVel = smoothData(dropFilledLeftElbowVel, config.smoothingWindow);
      const smoothedRightElbowVel = smoothData(dropFilledRightElbowVel, config.smoothingWindow);
      
      // ========================================================================
      // STEP 4: Update frameData with processed values and convert to km/h
      // ========================================================================
      for (let i = 0; i < frameData.length; i++) {
        const fd = frameData[i];
        
        // Combined velocity (processed)
        if (smoothedCombined[i] !== null) {
          fd.wristVelocity = smoothedCombined[i];
          fd.wristVelocityKmh = convertVelocityToKmh(smoothedCombined[i]!, metersPerPixel, videoFPS);
        }
        
        // Left wrist (processed)
        if (smoothedLeft[i] !== null) {
          fd.leftWristVelocity = smoothedLeft[i];
          fd.leftWristVelocityKmh = convertVelocityToKmh(smoothedLeft[i]!, metersPerPixel, videoFPS);
        }
        
        // Right wrist (processed)
        if (smoothedRight[i] !== null) {
          fd.rightWristVelocity = smoothedRight[i];
          fd.rightWristVelocityKmh = convertVelocityToKmh(smoothedRight[i]!, metersPerPixel, videoFPS);
        }
        
        // Max of both wrists (processed)
        if (smoothedMax[i] !== null) {
          fd.maxWristVelocityKmh = convertVelocityToKmh(smoothedMax[i]!, metersPerPixel, videoFPS);
        }
        
        // Calculate acceleration (derivative of velocity in km/h per second)
        // Use central difference for smoother derivative: (v[i+1] - v[i-1]) / (2 * dt)
        const dt = 1 / videoFPS; // time between frames in seconds
        if (i > 0 && i < frameData.length - 1) {
          // Left wrist acceleration
          const prevLeftV = frameData[i - 1]?.leftWristVelocityKmh;
          const nextLeftV = smoothedLeft[i + 1] !== null 
            ? convertVelocityToKmh(smoothedLeft[i + 1]!, metersPerPixel, videoFPS) 
            : null;
          if (prevLeftV !== null && nextLeftV !== null) {
            fd.leftWristAcceleration = (nextLeftV - prevLeftV) / (2 * dt);
          }
          
          // Right wrist acceleration
          const prevRightV = frameData[i - 1]?.rightWristVelocityKmh;
          const nextRightV = smoothedRight[i + 1] !== null 
            ? convertVelocityToKmh(smoothedRight[i + 1]!, metersPerPixel, videoFPS) 
            : null;
          if (prevRightV !== null && nextRightV !== null) {
            fd.rightWristAcceleration = (nextRightV - prevRightV) / (2 * dt);
          }
          
          // Max acceleration (max absolute value, preserving sign of the larger one)
          if (fd.leftWristAcceleration !== null || fd.rightWristAcceleration !== null) {
            const leftAbs = Math.abs(fd.leftWristAcceleration ?? 0);
            const rightAbs = Math.abs(fd.rightWristAcceleration ?? 0);
            fd.maxWristAcceleration = leftAbs >= rightAbs 
              ? fd.leftWristAcceleration 
              : fd.rightWristAcceleration;
          }
        }
        
        // Swing score (processed)
        if (smoothedScores[i] !== null) {
          fd.swingScore = smoothedScores[i];
        }
        
        // Body orientation (processed)
        if (smoothedOrientation[i] !== null) {
          fd.bodyOrientation = smoothedOrientation[i];
        }
        
        // Knee bend (processed)
        if (smoothedLeftKnee[i] !== null) {
          fd.leftKneeBend = smoothedLeftKnee[i];
        }
        if (smoothedRightKnee[i] !== null) {
          fd.rightKneeBend = smoothedRightKnee[i];
        }
        if (smoothedMaxKnee[i] !== null) {
          fd.maxKneeBend = smoothedMaxKnee[i];
        }
        
        // Shoulder angles (processed)
        if (smoothedLeftShoulder[i] !== null) {
          fd.leftShoulderAngle = smoothedLeftShoulder[i];
        }
        if (smoothedRightShoulder[i] !== null) {
          fd.rightShoulderAngle = smoothedRightShoulder[i];
        }
        
        // Elbow angles (processed)
        if (smoothedLeftElbow[i] !== null) {
          fd.leftElbowAngle = smoothedLeftElbow[i];
        }
        if (smoothedRightElbow[i] !== null) {
          fd.rightElbowAngle = smoothedRightElbow[i];
        }
        
        // Hip angles (processed)
        if (smoothedLeftHipAngle[i] !== null) {
          fd.leftHipAngle = smoothedLeftHipAngle[i];
        }
        if (smoothedRightHipAngle[i] !== null) {
          fd.rightHipAngle = smoothedRightHipAngle[i];
        }
        
        // Ankle velocities (processed)
        if (smoothedLeftAnkleVel[i] !== null) {
          fd.leftAnkleVelocity = smoothedLeftAnkleVel[i];
          fd.leftAnkleVelocityKmh = convertVelocityToKmh(smoothedLeftAnkleVel[i]!, metersPerPixel, videoFPS);
        }
        if (smoothedRightAnkleVel[i] !== null) {
          fd.rightAnkleVelocity = smoothedRightAnkleVel[i];
          fd.rightAnkleVelocityKmh = convertVelocityToKmh(smoothedRightAnkleVel[i]!, metersPerPixel, videoFPS);
        }
        
        // Knee velocities (processed)
        if (smoothedLeftKneeVel[i] !== null) {
          fd.leftKneeVelocity = smoothedLeftKneeVel[i];
          fd.leftKneeVelocityKmh = convertVelocityToKmh(smoothedLeftKneeVel[i]!, metersPerPixel, videoFPS);
        }
        if (smoothedRightKneeVel[i] !== null) {
          fd.rightKneeVelocity = smoothedRightKneeVel[i];
          fd.rightKneeVelocityKmh = convertVelocityToKmh(smoothedRightKneeVel[i]!, metersPerPixel, videoFPS);
        }
        
        // Hip velocities (processed)
        if (smoothedLeftHipVel[i] !== null) {
          fd.leftHipVelocity = smoothedLeftHipVel[i];
          fd.leftHipVelocityKmh = convertVelocityToKmh(smoothedLeftHipVel[i]!, metersPerPixel, videoFPS);
        }
        if (smoothedRightHipVel[i] !== null) {
          fd.rightHipVelocity = smoothedRightHipVel[i];
          fd.rightHipVelocityKmh = convertVelocityToKmh(smoothedRightHipVel[i]!, metersPerPixel, videoFPS);
        }
        
        // Shoulder velocities (processed)
        if (smoothedLeftShoulderVel[i] !== null) {
          fd.leftShoulderVelocity = smoothedLeftShoulderVel[i];
          fd.leftShoulderVelocityKmh = convertVelocityToKmh(smoothedLeftShoulderVel[i]!, metersPerPixel, videoFPS);
        }
        if (smoothedRightShoulderVel[i] !== null) {
          fd.rightShoulderVelocity = smoothedRightShoulderVel[i];
          fd.rightShoulderVelocityKmh = convertVelocityToKmh(smoothedRightShoulderVel[i]!, metersPerPixel, videoFPS);
        }
        
        // Elbow velocities (processed)
        if (smoothedLeftElbowVel[i] !== null) {
          fd.leftElbowVelocity = smoothedLeftElbowVel[i];
          fd.leftElbowVelocityKmh = convertVelocityToKmh(smoothedLeftElbowVel[i]!, metersPerPixel, videoFPS);
        }
        if (smoothedRightElbowVel[i] !== null) {
          fd.rightElbowVelocity = smoothedRightElbowVel[i];
          fd.rightElbowVelocityKmh = convertVelocityToKmh(smoothedRightElbowVel[i]!, metersPerPixel, videoFPS);
        }
      }
      
      // Calculate adaptive threshold
      const validScores = frameData
        .map(d => d.swingScore)
        .filter((s): s is number => s !== null)
        .sort((a, b) => a - b);
      
      const percentileIdx = Math.floor(validScores.length * config.velocityPercentile / 100);
      const adaptiveThreshold = validScores[percentileIdx] ?? config.minVelocityThreshold;
      const threshold = Math.max(adaptiveThreshold, config.minVelocityThreshold);
      
      // Find peaks in swing score
      const minDistanceFrames = Math.floor(config.minTimeBetweenSwings * videoFPS);
      const peakFrameIndices = findPeaks(
        frameData.map(d => d.swingScore),
        threshold,
        minDistanceFrames
      );
      
      // Build swing objects
      const swings: DetectedSwingV3[] = [];
      const orientationVelocities = frameData.map(d => d.orientationVelocity);
      
      // Track the previous swing's followEnd to constrain the next swing's loading phase
      let previousSwingFollowEndIdx = 0;
      
      for (const peakIdx of peakFrameIndices) {
        const peakData = frameData[peakIdx];
        if (!peakData || peakData.swingScore === null) continue;
        
        // Filter by rotation requirement
        if (config.requireRotation) {
          const rotVel = peakData.orientationVelocity;
          if (rotVel === null || Math.abs(rotVel) < config.minRotationVelocity) {
            continue;
          }
        }
        
        // Detect phases, constrained to not extend into previous swing's territory
        const phases = detectPhases(frameData, peakIdx, config, previousSwingFollowEndIdx);
        
        // Calculate rotation range during swing
        let minOrientation = Infinity;
        let maxOrientation = -Infinity;
        let peakRotationVel = 0;
        
        for (let i = phases.loadingStart; i <= phases.followEnd; i++) {
          const orient = frameData[i]?.bodyOrientation;
          const rotVel = frameData[i]?.orientationVelocity;
          if (orient !== null) {
            minOrientation = Math.min(minOrientation, orient);
            maxOrientation = Math.max(maxOrientation, orient);
          }
          if (rotVel !== null) {
            peakRotationVel = Math.max(peakRotationVel, Math.abs(rotVel));
          }
        }
        
        const rotationRange = maxOrientation !== -Infinity ? maxOrientation - minOrientation : 0;
        
        // Classify swing type (forehand, backhand, or serve)
        const swingType = config.classifySwingType
          ? classifySwingType(orientationVelocities, peakIdx, 10, config.handedness, frameData, config.minConfidence)
          : "unknown";
        
        // Determine dominant side
        const leftVel = peakData.leftWristVelocity ?? 0;
        const rightVel = peakData.rightWristVelocity ?? 0;
        const symmetry = Math.min(leftVel, rightVel) / Math.max(leftVel, rightVel, 0.001);
        let dominantSide: "left" | "right" | "both" = "both";
        if (symmetry < 0.5) {
          dominantSide = leftVel > rightVel ? "left" : "right";
        }
        
        // Calculate real-world velocity using torso-normalized measurement
        const velocityKmh = convertVelocityToKmh(
          peakData.wristVelocity ?? 0,
          metersPerPixel,
          videoFPS
        );
        
        // Filter by minimum km/h threshold
        if (velocityKmh < config.minVelocityKmh) {
          continue;
        }
        
        // Calculate clip boundaries (anchored to followEnd)
        const followEndFrame = frameData[phases.followEnd]?.frame ?? peakData.frame;
        const followEndTime = followEndFrame / videoFPS;
        const videoDuration = totalFrames / videoFPS;
        
        // Clip start = followEnd - leadTime (clamped to 0)
        const clipStartTime = Math.max(0, followEndTime - config.clipLeadTime);
        const clipStartFrame = Math.floor(clipStartTime * videoFPS);
        
        // Clip end = followEnd + trailTime (clamped to video duration)
        const clipEndTime = Math.min(videoDuration, followEndTime + config.clipTrailTime);
        const clipEndFrame = Math.floor(clipEndTime * videoFPS);
        
        const clipDuration = clipEndTime - clipStartTime;
        
        // Find loading peak position (max coil) for non-serve swings
        // This is the frame where body orientation is most opposite to contact orientation
        let loadingPeakFrame: number | null = null;
        let loadingPeakTimestamp: number | null = null;
        let loadingPeakOrientation: number | null = null;
        
        // Serve-specific positions
        let trophyFrame: number | null = null;
        let trophyTimestamp: number | null = null;
        let trophyArmHeight: number | null = null;
        let contactPointFrame: number | null = null;
        let contactPointTimestamp: number | null = null;
        let contactPointHeight: number | null = null;
        let landingFrame: number | null = null;
        let landingTimestamp: number | null = null;
        
        if (swingType === "serve") {
          // For serves, find key positions within the serve timeframe
          // SIMPLE APPROACH:
          // 1. Contact = highest wrist position (arm fully extended at ball strike)
          // 2. Trophy = fixed time offset (~0.4s) before contact
          // 3. Landing = lowest ankle position after contact
          
          let maxWristHeight = -Infinity;
          let lowestAnkleY = -Infinity;
          let contactIdx = -1;
          
          // Get keypoint indices
          const shoulderIdx = config.handedness === "right" ? indices.rightShoulder : indices.leftShoulder;
          const wristIdx = config.handedness === "right" ? indices.rightWrist : indices.leftWrist;
          const hipIdx = config.handedness === "right" ? indices.rightHip : indices.leftHip;
          const frontAnkleIdx = config.handedness === "right" ? indices.leftAnkle : indices.rightAnkle;
          
          // Step 1: Find CONTACT POINT (highest wrist position in the serve window)
          // Search the ENTIRE clip range since peak velocity might be during follow-through, not at contact
          for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            // Skip frames outside clip boundaries
            if (frame < clipStartFrame || frame > clipEndFrame) continue;
            
            const poses = preprocessedPoses.get(frame);
            const pose = poses?.[selectedPoseIndex];
            if (!pose) continue;
            
            const keypoints = pose.keypoints;
            const shoulder = keypoints[shoulderIdx];
            const wrist = keypoints[wristIdx];
            const hip = keypoints[hipIdx];
            
            if (!shoulder || !wrist || !hip) continue;
            if ((shoulder.score ?? 0) < config.minConfidence) continue;
            if ((wrist.score ?? 0) < config.minConfidence) continue;
            if ((hip.score ?? 0) < config.minConfidence) continue;
            
            const torsoHeight = Math.abs(hip.y - shoulder.y);
            if (torsoHeight < 10) continue;
            
            const heightAboveShoulder = shoulder.y - wrist.y;
            const heightRatio = heightAboveShoulder / torsoHeight;
            
            if (heightRatio > maxWristHeight) {
              maxWristHeight = heightRatio;
              contactPointFrame = frame;
              contactPointTimestamp = frameData[i]?.timestamp ?? frame / videoFPS;
              contactPointHeight = heightRatio;
              contactIdx = i;
            }
          }
          
          // Step 2: Find TROPHY POSITION (fixed offset ~0.4s before contact)
          if (contactPointTimestamp !== null && contactPointFrame !== null) {
            const TROPHY_OFFSET_SECONDS = 0.4; // Trophy is ~0.4s before contact
            const trophyTargetTime = contactPointTimestamp - TROPHY_OFFSET_SECONDS;
            
            // Find the frame closest to trophy target time (must be before contact)
            let closestDiff = Infinity;
            for (let i = 0; i < frames.length; i++) {
              const frame = frames[i];
              // Only search before contact point
              if (frame >= contactPointFrame) continue;
              
              const fd = frameData[i];
              if (!fd) continue;
              
              const timeDiff = Math.abs(fd.timestamp - trophyTargetTime);
              if (timeDiff < closestDiff) {
                closestDiff = timeDiff;
                trophyFrame = fd.frame;
                trophyTimestamp = fd.timestamp;
                
                // Get arm height at this frame for display
                const poses = preprocessedPoses.get(frame);
                const pose = poses?.[selectedPoseIndex];
                if (pose) {
                  const keypoints = pose.keypoints;
                  const shoulder = keypoints[shoulderIdx];
                  const wrist = keypoints[wristIdx];
                  const hip = keypoints[hipIdx];
                  if (shoulder && wrist && hip) {
                    const torsoHeight = Math.abs(hip.y - shoulder.y);
                    if (torsoHeight > 10) {
                      trophyArmHeight = (shoulder.y - wrist.y) / torsoHeight;
                    }
                  }
                }
              }
            }
          }
          
          // Step 3: Find LANDING (lowest front ankle position after contact)
          // Search from contact point to end of clip
          for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            // Only search after contact point (or after clip midpoint if no contact found)
            const searchStart = contactPointFrame ?? clipStartFrame + (clipEndFrame - clipStartFrame) / 2;
            if (frame < searchStart || frame > clipEndFrame) continue;
            
            const poses = preprocessedPoses.get(frame);
            const pose = poses?.[selectedPoseIndex];
            if (!pose) continue;
            
            const keypoints = pose.keypoints;
            const frontAnkle = keypoints[frontAnkleIdx];
            
            if (!frontAnkle) continue;
            if ((frontAnkle.score ?? 0) < config.minConfidence) continue;
            
            // In image coords, higher Y = lower position
            if (frontAnkle.y > lowestAnkleY) {
              lowestAnkleY = frontAnkle.y;
              landingFrame = frame;
              landingTimestamp = frameData[i]?.timestamp ?? frame / videoFPS;
            }
          }
        } else {
          // For non-serve swings, find loading peak (max coil)
          const contactOrientation = peakData.bodyOrientation ?? 0;
          let maxOrientationDiff = 0;
          
          // Look from clip start (or loadingStart) to just before contact
          // to find when the body was most "coiled" (rotated away from contact position)
          for (let i = phases.loadingStart; i < peakIdx; i++) {
            const fd = frameData[i];
            if (!fd || fd.bodyOrientation === null) continue;
            
            // Calculate how different this orientation is from contact orientation
            let orientDiff = fd.bodyOrientation - contactOrientation;
            // Handle wrap-around
            if (orientDiff > 180) orientDiff -= 360;
            if (orientDiff < -180) orientDiff += 360;
            
            const absDiff = Math.abs(orientDiff);
            
            if (absDiff > maxOrientationDiff) {
              maxOrientationDiff = absDiff;
              loadingPeakFrame = fd.frame;
              loadingPeakTimestamp = fd.timestamp;
              loadingPeakOrientation = fd.bodyOrientation;
            }
          }
        }
        
        swings.push({
          id: `swing-${peakData.frame}`,
          frame: peakData.frame,
          timestamp: peakData.timestamp,
          peakVelocity: peakData.wristVelocity ?? 0,
          velocityKmh,
          orientationAtContact: peakData.bodyOrientation ?? 0,
          rotationRange,
          peakRotationVelocity: peakRotationVel,
          swingType,
          dominantSide,
          confidence: peakData.swingScore! / (validScores[validScores.length - 1] ?? 1),
          loadingStart: frameData[phases.loadingStart]?.frame ?? peakData.frame,
          swingStart: frameData[phases.swingStart]?.frame ?? peakData.frame,
          contactFrame: peakData.frame,
          followEnd: followEndFrame,
          loadingPeakFrame,
          loadingPeakTimestamp,
          loadingPeakOrientation,
          trophyFrame,
          trophyTimestamp,
          trophyArmHeight,
          contactPointFrame,
          contactPointTimestamp,
          contactPointHeight,
          landingFrame,
          landingTimestamp,
          clipStartTime,
          clipEndTime,
          clipStartFrame,
          clipEndFrame,
          clipDuration,
          swingScore: peakData.swingScore!,
        });
        
        // Update the boundary for the next swing's loading phase detection
        // Use followEnd index (not frame number) to constrain the next swing
        previousSwingFollowEndIdx = phases.followEnd;
      }
      
      // Merge overlapping swings (if one covers 70% or more of the other)
      const mergedSwings: DetectedSwingV3[] = [];
      const OVERLAP_THRESHOLD = 0.7; // 70% overlap triggers merge
      
      for (const swing of swings) {
        let shouldMerge = false;
        let mergeTargetIdx = -1;
        
        for (let i = 0; i < mergedSwings.length; i++) {
          const existing = mergedSwings[i];
          
          // Calculate overlap between clip ranges
          const overlapStart = Math.max(swing.clipStartFrame, existing.clipStartFrame);
          const overlapEnd = Math.min(swing.clipEndFrame, existing.clipEndFrame);
          const overlapFrames = Math.max(0, overlapEnd - overlapStart);
          
          // Calculate coverage for each swing
          const swingDuration = swing.clipEndFrame - swing.clipStartFrame;
          const existingDuration = existing.clipEndFrame - existing.clipStartFrame;
          
          const swingCoverage = swingDuration > 0 ? overlapFrames / swingDuration : 0;
          const existingCoverage = existingDuration > 0 ? overlapFrames / existingDuration : 0;
          
          // If either swing covers 70%+ of the other, merge them
          if (swingCoverage >= OVERLAP_THRESHOLD || existingCoverage >= OVERLAP_THRESHOLD) {
            shouldMerge = true;
            mergeTargetIdx = i;
            break;
          }
        }
        
        if (shouldMerge && mergeTargetIdx >= 0) {
          const existing = mergedSwings[mergeTargetIdx];
          // Keep the swing with higher swing score (peak velocity * rotation)
          if (swing.swingScore > existing.swingScore) {
            // Replace with new swing but extend clip boundaries to cover both
            const mergedSwing: DetectedSwingV3 = {
              ...swing,
              clipStartFrame: Math.min(swing.clipStartFrame, existing.clipStartFrame),
              clipEndFrame: Math.max(swing.clipEndFrame, existing.clipEndFrame),
              clipStartTime: Math.min(swing.clipStartTime, existing.clipStartTime),
              clipEndTime: Math.max(swing.clipEndTime, existing.clipEndTime),
              clipDuration: Math.max(swing.clipEndTime, existing.clipEndTime) - Math.min(swing.clipStartTime, existing.clipStartTime),
              loadingStart: Math.min(swing.loadingStart, existing.loadingStart),
              followEnd: Math.max(swing.followEnd, existing.followEnd),
            };
            mergedSwings[mergeTargetIdx] = mergedSwing;
          } else {
            // Keep existing but extend clip boundaries
            mergedSwings[mergeTargetIdx] = {
              ...existing,
              clipStartFrame: Math.min(swing.clipStartFrame, existing.clipStartFrame),
              clipEndFrame: Math.max(swing.clipEndFrame, existing.clipEndFrame),
              clipStartTime: Math.min(swing.clipStartTime, existing.clipStartTime),
              clipEndTime: Math.max(swing.clipEndTime, existing.clipEndTime),
              clipDuration: Math.max(swing.clipEndTime, existing.clipEndTime) - Math.min(swing.clipStartTime, existing.clipStartTime),
              loadingStart: Math.min(swing.loadingStart, existing.loadingStart),
              followEnd: Math.max(swing.followEnd, existing.followEnd),
            };
          }
        } else {
          mergedSwings.push(swing);
        }
      }
      
      // Use merged swings for the rest of the analysis
      const finalSwings = mergedSwings;
      
      // Mark phases in frame data
      for (const swing of finalSwings) {
        for (let i = 0; i < frameData.length; i++) {
          const fd = frameData[i];
          if (fd.frame >= swing.loadingStart && fd.frame < swing.swingStart) {
            fd.phase = "loading";
          } else if (fd.frame >= swing.swingStart && fd.frame < swing.contactFrame) {
            fd.phase = "swing";
          } else if (fd.frame === swing.contactFrame) {
            fd.phase = "contact";
          } else if (fd.frame > swing.contactFrame && fd.frame <= swing.followEnd) {
            fd.phase = "follow";
          }
        }
      }
      
      // Calculate summary stats
      const velocities = finalSwings.map(s => s.peakVelocity);
      const rotations = finalSwings.map(s => s.rotationRange);
      
      const analysisResult: SwingDetectionResultV3 = {
        swings: finalSwings,
        frameData,
        totalSwings: finalSwings.length,
        forehandCount: finalSwings.filter(s => s.swingType === "forehand").length,
        backhandCount: finalSwings.filter(s => s.swingType === "backhand").length,
        serveCount: finalSwings.filter(s => s.swingType === "serve").length,
        averageVelocity: velocities.length > 0 
          ? velocities.reduce((a, b) => a + b, 0) / velocities.length 
          : 0,
        maxVelocity: velocities.length > 0 ? Math.max(...velocities) : 0,
        averageRotation: rotations.length > 0
          ? rotations.reduce((a, b) => a + b, 0) / rotations.length
          : 0,
        framesAnalyzed: totalFrames,
        videoDuration: totalFrames / videoFPS,
        analysisTimestamp: new Date().toISOString(),
      };
      
      setResult(analysisResult);
      return analysisResult;
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    preprocessedPoses,
    selectedModel,
    videoFPS,
    selectedPoseIndex,
    config,
    indices,
    getBodyCenter,
    calculateKeypointVelocity,
    calculateRadialVelocity,
    fillDrops,
    smoothData,
    findPeaks,
    classifySwingType,
    detectPhases,
  ]);

  /**
   * Clear results
   */
  const clearResults = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    analyzeSwings,
    clearResults,
    isAnalyzing,
    result,
    error,
    config,
  };
}

