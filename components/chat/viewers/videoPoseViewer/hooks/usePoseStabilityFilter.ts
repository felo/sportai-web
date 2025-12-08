/**
 * Pose Stability Filter
 * 
 * Detects unstable/corrupted pose frames ("banana frames") and provides
 * smooth, stable pose output by freezing or simulating poses during
 * recovery periods.
 * 
 * Features:
 * - Joint displacement detection (sudden jumps)
 * - Cosine similarity checking
 * - Anthropometric ratio validation
 * - Recovery mode with configurable stability threshold
 * - Optional motion simulation for smooth aesthetics
 */

import { useRef, useCallback, useMemo } from "react";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";

// =========================================
// 1. DATA STRUCTURES
// =========================================

/** State machine states */
export enum StabilityState {
  NORMAL = "NORMAL",
  RECOVERY = "RECOVERY",
}

/** Configuration constants - TODO: Tune these values based on testing */
export interface StabilityConfig {
  /** Maximum segment length change ratio (1.3 = 30% change) - RELATIVE metric */
  MAX_SEGMENT_CHANGE: number;
  /** Maximum angle change per frame in degrees - RELATIVE metric */
  MAX_ANGLE_CHANGE: number;
  /** Minimum cosine similarity threshold */
  SIM_THRESHOLD: number;
  /** Maximum deviation from baseline anthropometric ratios */
  RATIO_TOLERANCE: number;
  /** Number of stable frames required to exit recovery */
  N_RECOVERY: number;
  /** Enable motion simulation during recovery */
  enableSimulation: boolean;
  /** Velocity decay factor for simulation (0-1) */
  simulationDecay: number;
  /** Minimum confidence score to consider a keypoint valid */
  minConfidence: number;
  /** Enable smart mirror recovery - use stable opposite side when one side is corrupted */
  enableMirrorRecovery: boolean;
  /** 
   * Mirror-only mode: Skip banana detection and recovery state machine.
   * Only applies joint loss detection + mirroring. Much simpler behavior.
   */
  mirrorOnlyMode: boolean;
  /** Legacy: MAX_JUMP for backwards compatibility (ignored, use MAX_SEGMENT_CHANGE) */
  MAX_JUMP?: number;
}

/** Default configuration */
export const DEFAULT_STABILITY_CONFIG: StabilityConfig = {
  MAX_SEGMENT_CHANGE: 1.25,  // 25% segment length change is suspicious
  MAX_ANGLE_CHANGE: 25,       // 25 degree change per frame is suspicious
  SIM_THRESHOLD: 0.8,
  RATIO_TOLERANCE: 0.35,
  N_RECOVERY: 4,
  enableSimulation: false,
  simulationDecay: 0.9,
  minConfidence: 0.3,
  enableMirrorRecovery: true,  // Use opposite side mirroring by default
  mirrorOnlyMode: false,       // Full stability filter by default
  MAX_JUMP: 40,  // Legacy, kept for UI compatibility
};

/** Keypoint with coordinates */
interface Keypoint {
  x: number;
  y: number;
  score?: number | null;
  name?: string;
}

/** Internal state of the stability filter */
interface StabilityFilterState {
  currentState: StabilityState;
  freezePose: PoseDetectionResult | null;
  prevFreezePose: PoseDetectionResult | null;
  stableCount: number;
  prevPose: PoseDetectionResult | null;
  baselineRatios: AnthropometricRatios | null;
  frameCount: number;
  /** Last known good position for each joint (for loss recovery) */
  lastKnownGood: Map<number, Keypoint>;
}

/** Anthropometric ratio measurements */
interface AnthropometricRatios {
  shoulderWidth: number;
  hipWidth: number;
  leftArmRatio: number;  // forearm / upper arm
  rightArmRatio: number;
  leftLegRatio: number;  // lower leg / upper leg
  rightLegRatio: number;
  torsoRatio: number;    // torso length / shoulder width
}

/** Result from the filter including state info */
export interface StabilityFilterResult {
  pose: PoseDetectionResult;
  state: StabilityState;
  isBananaFrame: boolean;
  stableCount: number;
  similarity: number | null;
}

// =========================================
// 2. HELPER FUNCTIONS
// =========================================

/**
 * Calculate Euclidean distance between two points
 */
function distance(p1: Keypoint, p2: Keypoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate cosine similarity between two poses
 * Treats each pose as a flattened vector of [x1, y1, x2, y2, ...]
 */
export function cosineSimilarity(
  poseA: PoseDetectionResult,
  poseB: PoseDetectionResult,
  minConfidence: number = 0.3
): number {
  const keypointsA = poseA.keypoints;
  const keypointsB = poseB.keypoints;
  
  if (keypointsA.length !== keypointsB.length) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  let validCount = 0;

  for (let i = 0; i < keypointsA.length; i++) {
    const kpA = keypointsA[i];
    const kpB = keypointsB[i];
    
    // Only compare keypoints where both have sufficient confidence
    if ((kpA.score ?? 0) >= minConfidence && (kpB.score ?? 0) >= minConfidence) {
      dotProduct += kpA.x * kpB.x + kpA.y * kpB.y;
      magnitudeA += kpA.x * kpA.x + kpA.y * kpA.y;
      magnitudeB += kpB.x * kpB.x + kpB.y * kpB.y;
      validCount++;
    }
  }

  if (validCount === 0 || magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

/**
 * Calculate segment length between two keypoints
 */
function segmentLength(
  keypoints: Keypoint[],
  idx1: number,
  idx2: number,
  minConfidence: number = 0.3
): number | null {
  const kp1 = keypoints[idx1];
  const kp2 = keypoints[idx2];
  
  if (!kp1 || !kp2) return null;
  if ((kp1.score ?? 0) < minConfidence || (kp2.score ?? 0) < minConfidence) {
    return null;
  }
  
  return distance(kp1, kp2);
}

/**
 * Compute anthropometric ratios from a pose
 * Uses MoveNet/BlazePose keypoint indices
 * 
 * MoveNet indices:
 * 5: left shoulder, 6: right shoulder
 * 7: left elbow, 8: right elbow
 * 9: left wrist, 10: right wrist
 * 11: left hip, 12: right hip
 * 13: left knee, 14: right knee
 * 15: left ankle, 16: right ankle
 */
export function computeAnthropometricRatios(
  pose: PoseDetectionResult,
  minConfidence: number = 0.3
): AnthropometricRatios | null {
  const kp = pose.keypoints;
  
  // Shoulder width
  const shoulderWidth = segmentLength(kp, 5, 6, minConfidence);
  if (!shoulderWidth || shoulderWidth < 1) return null;
  
  // Hip width
  const hipWidth = segmentLength(kp, 11, 12, minConfidence);
  
  // Left arm segments
  const leftUpperArm = segmentLength(kp, 5, 7, minConfidence);
  const leftForearm = segmentLength(kp, 7, 9, minConfidence);
  const leftArmRatio = (leftUpperArm && leftForearm && leftUpperArm > 0) 
    ? leftForearm / leftUpperArm 
    : 1;
  
  // Right arm segments
  const rightUpperArm = segmentLength(kp, 6, 8, minConfidence);
  const rightForearm = segmentLength(kp, 8, 10, minConfidence);
  const rightArmRatio = (rightUpperArm && rightForearm && rightUpperArm > 0)
    ? rightForearm / rightUpperArm
    : 1;
  
  // Left leg segments
  const leftUpperLeg = segmentLength(kp, 11, 13, minConfidence);
  const leftLowerLeg = segmentLength(kp, 13, 15, minConfidence);
  const leftLegRatio = (leftUpperLeg && leftLowerLeg && leftUpperLeg > 0)
    ? leftLowerLeg / leftUpperLeg
    : 1;
  
  // Right leg segments
  const rightUpperLeg = segmentLength(kp, 12, 14, minConfidence);
  const rightLowerLeg = segmentLength(kp, 14, 16, minConfidence);
  const rightLegRatio = (rightUpperLeg && rightLowerLeg && rightUpperLeg > 0)
    ? rightLowerLeg / rightUpperLeg
    : 1;
  
  // Torso length (average of left/right shoulder to hip)
  const leftTorso = segmentLength(kp, 5, 11, minConfidence);
  const rightTorso = segmentLength(kp, 6, 12, minConfidence);
  const torsoLength = (leftTorso && rightTorso) 
    ? (leftTorso + rightTorso) / 2 
    : (leftTorso || rightTorso || shoulderWidth);
  const torsoRatio = torsoLength / shoulderWidth;
  
  return {
    shoulderWidth,
    hipWidth: hipWidth || shoulderWidth * 0.8,
    leftArmRatio,
    rightArmRatio,
    leftLegRatio,
    rightLegRatio,
    torsoRatio,
  };
}

/**
 * Check if anthropometric ratios deviate too much from baseline
 */
function checkRatioDeviation(
  current: AnthropometricRatios,
  baseline: AnthropometricRatios,
  tolerance: number
): boolean {
  const checks = [
    Math.abs(current.leftArmRatio - baseline.leftArmRatio),
    Math.abs(current.rightArmRatio - baseline.rightArmRatio),
    Math.abs(current.leftLegRatio - baseline.leftLegRatio),
    Math.abs(current.rightLegRatio - baseline.rightLegRatio),
    Math.abs(current.torsoRatio - baseline.torsoRatio),
  ];
  
  // Also check relative shoulder/hip width changes
  const shoulderChange = Math.abs(current.shoulderWidth - baseline.shoulderWidth) / baseline.shoulderWidth;
  const hipChange = Math.abs(current.hipWidth - baseline.hipWidth) / baseline.hipWidth;
  
  return checks.some(diff => diff > tolerance) || 
         shoulderChange > tolerance || 
         hipChange > tolerance;
}

// =========================================
// 3. BANANA DETECTION FUNCTION
// =========================================

/** Key body segments to check for length changes */
const SEGMENTS_TO_CHECK: Array<[number, number, string]> = [
  [5, 7, "Left Upper Arm"],   // L Shoulder -> L Elbow
  [7, 9, "Left Forearm"],     // L Elbow -> L Wrist
  [6, 8, "Right Upper Arm"],  // R Shoulder -> R Elbow
  [8, 10, "Right Forearm"],   // R Elbow -> R Wrist
  [11, 13, "Left Thigh"],     // L Hip -> L Knee
  [13, 15, "Left Shin"],      // L Knee -> L Ankle
  [12, 14, "Right Thigh"],    // R Hip -> R Knee
  [14, 16, "Right Shin"],     // R Knee -> R Ankle
  [5, 6, "Shoulders"],        // L Shoulder -> R Shoulder
  [11, 12, "Hips"],           // L Hip -> R Hip
];

/** Key joint angles to check */
const ANGLES_TO_CHECK: Array<[number, number, number, string]> = [
  [5, 7, 9, "Left Elbow"],    // L Shoulder, L Elbow, L Wrist
  [6, 8, 10, "Right Elbow"],  // R Shoulder, R Elbow, R Wrist
  [11, 13, 15, "Left Knee"],  // L Hip, L Knee, L Ankle
  [12, 14, 16, "Right Knee"], // R Hip, R Knee, R Ankle
];

// =========================================
// MIRROR PAIRS FOR SMART RECOVERY
// =========================================

/** 
 * Mirror pairs: [leftIndex, rightIndex]
 * Used for mirroring stable side to corrupted side
 */
const MIRROR_PAIRS: Array<[number, number]> = [
  [5, 6],   // Left Shoulder <-> Right Shoulder
  [7, 8],   // Left Elbow <-> Right Elbow
  [9, 10],  // Left Wrist <-> Right Wrist
  [11, 12], // Left Hip <-> Right Hip
  [13, 14], // Left Knee <-> Right Knee
  [15, 16], // Left Ankle <-> Right Ankle
];

/** Limb groups for per-limb corruption detection */
const LIMB_GROUPS = {
  leftArm: [5, 7, 9],      // Shoulder, Elbow, Wrist
  rightArm: [6, 8, 10],
  leftLeg: [11, 13, 15],   // Hip, Knee, Ankle
  rightLeg: [12, 14, 16],
};

/** Corruption info for a specific joint/limb */
interface JointCorruption {
  jointIndex: number;
  isCorrupted: boolean;
  reason: string | null;
  changeValue: number;
}

/** Result of per-joint corruption detection */
interface PerJointCorruptionResult {
  corruptions: JointCorruption[];
  hasCorruption: boolean;
  canMirror: boolean;  // True if opposite side is stable
  mirrorSource: "left" | "right" | null;
}

/**
 * Calculate angle at vertex (in degrees)
 */
function calculateAngle(p1: Keypoint, vertex: Keypoint, p2: Keypoint): number {
  const v1x = p1.x - vertex.x;
  const v1y = p1.y - vertex.y;
  const v2x = p2.x - vertex.x;
  const v2y = p2.y - vertex.y;
  
  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * Detect if the current frame is a "banana frame" (unstable/corrupted)
 * 
 * Uses RELATIVE metrics instead of absolute pixel positions:
 * 1. Segment length change ratios (catches impossible limb stretching)
 * 2. Joint angle changes (catches impossible joint movements)
 * 3. Cosine similarity (overall pose shape)
 * 4. Anthropometric ratio deviations
 */
export function detectBanana(
  pose: PoseDetectionResult,
  prevPose: PoseDetectionResult | null,
  baselineRatios: AnthropometricRatios | null,
  config: StabilityConfig
): { isBanana: boolean; reason: string | null; similarity: number | null } {
  if (!prevPose) {
    return { isBanana: false, reason: null, similarity: null };
  }

  const keypointsCurrent = pose.keypoints;
  const keypointsPrev = prevPose.keypoints;
  const minConf = config.minConfidence;

  // Check 1: Segment length change ratios
  // If a limb suddenly becomes 25%+ longer or shorter, it's likely a banana frame
  for (const [idx1, idx2, name] of SEGMENTS_TO_CHECK) {
    const currLen = segmentLength(keypointsCurrent, idx1, idx2, minConf);
    const prevLen = segmentLength(keypointsPrev, idx1, idx2, minConf);
    
    if (currLen && prevLen && prevLen > 10) { // Need minimum length to compare
      const changeRatio = currLen / prevLen;
      const maxChange = config.MAX_SEGMENT_CHANGE || 1.25;
      
      // Check both stretching (>1) and shrinking (<1)
      if (changeRatio > maxChange || changeRatio < (1 / maxChange)) {
        return {
          isBanana: true,
          reason: `${name} length changed ${((changeRatio - 1) * 100).toFixed(0)}%`,
          similarity: null,
        };
      }
    }
  }

  // Check 2: Joint angle changes
  // If an elbow or knee angle changes more than 25 degrees in one frame, suspicious
  for (const [idx1, idx2, idx3, name] of ANGLES_TO_CHECK) {
    const kp1Curr = keypointsCurrent[idx1];
    const kp2Curr = keypointsCurrent[idx2];
    const kp3Curr = keypointsCurrent[idx3];
    const kp1Prev = keypointsPrev[idx1];
    const kp2Prev = keypointsPrev[idx2];
    const kp3Prev = keypointsPrev[idx3];
    
    const allValidCurr = [kp1Curr, kp2Curr, kp3Curr].every(kp => (kp?.score ?? 0) >= minConf);
    const allValidPrev = [kp1Prev, kp2Prev, kp3Prev].every(kp => (kp?.score ?? 0) >= minConf);
    
    if (allValidCurr && allValidPrev) {
      const angleCurr = calculateAngle(kp1Curr, kp2Curr, kp3Curr);
      const anglePrev = calculateAngle(kp1Prev, kp2Prev, kp3Prev);
      const angleChange = Math.abs(angleCurr - anglePrev);
      const maxAngleChange = config.MAX_ANGLE_CHANGE || 25;
      
      if (angleChange > maxAngleChange) {
        return {
          isBanana: true,
          reason: `${name} angle changed ${angleChange.toFixed(0)}° in one frame`,
          similarity: null,
        };
      }
    }
  }

  // Check 3: Cosine similarity (overall pose shape)
  const sim = cosineSimilarity(pose, prevPose, config.minConfidence);
  if (sim < config.SIM_THRESHOLD) {
    return { 
      isBanana: true, 
      reason: `Low similarity: ${(sim * 100).toFixed(0)}% < ${(config.SIM_THRESHOLD * 100).toFixed(0)}%`,
      similarity: sim 
    };
  }

  // Check 4: Anthropometric ratios (baseline comparison)
  if (baselineRatios) {
    const currentRatios = computeAnthropometricRatios(pose, config.minConfidence);
    if (currentRatios && checkRatioDeviation(currentRatios, baselineRatios, config.RATIO_TOLERANCE)) {
      return { 
        isBanana: true, 
        reason: `Body proportions deviated from baseline`,
        similarity: sim 
      };
    }
  }

  return { isBanana: false, reason: null, similarity: sim };
}

// =========================================
// 3B. PER-JOINT CORRUPTION DETECTION & MIRROR RECOVERY
// =========================================

/**
 * Detect which specific joints are corrupted and whether we can mirror from opposite side
 */
function detectPerJointCorruption(
  pose: PoseDetectionResult,
  prevPose: PoseDetectionResult | null,
  config: StabilityConfig
): PerJointCorruptionResult {
  const corruptions: JointCorruption[] = [];
  
  if (!prevPose) {
    return { corruptions: [], hasCorruption: false, canMirror: false, mirrorSource: null };
  }

  const keypointsCurrent = pose.keypoints;
  const keypointsPrev = prevPose.keypoints;
  const minConf = config.minConfidence;
  const maxAngleChange = config.MAX_ANGLE_CHANGE || 25;

  // Track corruption by side
  let leftArmCorrupted = false;
  let rightArmCorrupted = false;
  let leftLegCorrupted = false;
  let rightLegCorrupted = false;

  // Check each angle for corruption
  for (const [idx1, idx2, idx3, name] of ANGLES_TO_CHECK) {
    const kp1Curr = keypointsCurrent[idx1];
    const kp2Curr = keypointsCurrent[idx2];
    const kp3Curr = keypointsCurrent[idx3];
    const kp1Prev = keypointsPrev[idx1];
    const kp2Prev = keypointsPrev[idx2];
    const kp3Prev = keypointsPrev[idx3];

    const allValidCurr = [kp1Curr, kp2Curr, kp3Curr].every(kp => (kp?.score ?? 0) >= minConf);
    const allValidPrev = [kp1Prev, kp2Prev, kp3Prev].every(kp => (kp?.score ?? 0) >= minConf);

    if (allValidCurr && allValidPrev) {
      const angleCurr = calculateAngle(kp1Curr, kp2Curr, kp3Curr);
      const anglePrev = calculateAngle(kp1Prev, kp2Prev, kp3Prev);
      const angleChange = Math.abs(angleCurr - anglePrev);

      const isCorrupted = angleChange > maxAngleChange;

      // Track the vertex joint (idx2) as the corrupted joint
      corruptions.push({
        jointIndex: idx2,
        isCorrupted,
        reason: isCorrupted ? `${name} changed ${angleChange.toFixed(0)}°` : null,
        changeValue: angleChange,
      });

      // Track which side is corrupted
      if (isCorrupted) {
        if (name.includes("Left Elbow")) leftArmCorrupted = true;
        if (name.includes("Right Elbow")) rightArmCorrupted = true;
        if (name.includes("Left Knee")) leftLegCorrupted = true;
        if (name.includes("Right Knee")) rightLegCorrupted = true;
      }
    }
  }

  const hasCorruption = corruptions.some(c => c.isCorrupted);

  // Determine if we can mirror from the opposite side
  let canMirror = false;
  let mirrorSource: "left" | "right" | null = null;

  if (hasCorruption) {
    // Can mirror arms if only one side is corrupted
    if (leftArmCorrupted && !rightArmCorrupted) {
      canMirror = true;
      mirrorSource = "right";
    } else if (rightArmCorrupted && !leftArmCorrupted) {
      canMirror = true;
      mirrorSource = "left";
    }
    // Can mirror legs if only one side is corrupted
    if (leftLegCorrupted && !rightLegCorrupted) {
      canMirror = true;
      mirrorSource = "right";
    } else if (rightLegCorrupted && !leftLegCorrupted) {
      canMirror = true;
      mirrorSource = "left";
    }
  }

  return { corruptions, hasCorruption, canMirror, mirrorSource };
}

// =========================================
// 3C. JOINT LOSS DETECTION (OUT OF FRAME / OCCLUSION)
// =========================================

/** Result of joint loss detection */
interface JointLossResult {
  lostJoints: number[];
  hasLoss: boolean;
  canMirror: boolean;
  mirrorSource: "left" | "right" | null;
  /** Joints that need last-known-good fallback (can't be mirrored) */
  fallbackJoints: number[];
}

/** Limb joint indices for determining which side is affected */
const LEFT_ARM_JOINTS = [5, 7, 9];   // Shoulder, Elbow, Wrist
const RIGHT_ARM_JOINTS = [6, 8, 10];
const LEFT_LEG_JOINTS = [11, 13, 15]; // Hip, Knee, Ankle
const RIGHT_LEG_JOINTS = [12, 14, 16];

/**
 * Detect joints that have suddenly lost confidence (went out of frame or occluded)
 * This is different from "banana" detection - here the confidence drops, not the position jumps
 */
function detectJointLoss(
  pose: PoseDetectionResult,
  prevPose: PoseDetectionResult | null,
  lastKnownGood: Map<number, Keypoint> | null | undefined,
  config: StabilityConfig
): JointLossResult {
  const lostJoints: number[] = [];
  const minConf = config.minConfidence;
  
  if (!prevPose) {
    return { lostJoints: [], hasLoss: false, canMirror: false, mirrorSource: null, fallbackJoints: [] };
  }

  // Check each keypoint for confidence drop
  for (let i = 0; i < pose.keypoints.length; i++) {
    const currScore = pose.keypoints[i]?.score ?? 0;
    const prevScore = prevPose.keypoints[i]?.score ?? 0;
    
    // Joint was good in previous frame(s), now it's bad
    // Also check lastKnownGood for longer-term tracking
    const wasGood = prevScore >= minConf || 
                    (lastKnownGood?.get(i)?.score ?? 0) >= minConf;
    const isNowBad = currScore < minConf;
    
    if (wasGood && isNowBad) {
      lostJoints.push(i);
    }
  }

  if (lostJoints.length === 0) {
    return { lostJoints: [], hasLoss: false, canMirror: false, mirrorSource: null, fallbackJoints: [] };
  }

  // Determine which side(s) are affected
  const leftArmLost = lostJoints.some(j => LEFT_ARM_JOINTS.includes(j));
  const rightArmLost = lostJoints.some(j => RIGHT_ARM_JOINTS.includes(j));
  const leftLegLost = lostJoints.some(j => LEFT_LEG_JOINTS.includes(j));
  const rightLegLost = lostJoints.some(j => RIGHT_LEG_JOINTS.includes(j));

  // Check if the opposite side is available for mirroring
  let canMirror = false;
  let mirrorSource: "left" | "right" | null = null;
  const fallbackJoints: number[] = [];

  // For arms
  if (leftArmLost && !rightArmLost) {
    // Check if right arm has good confidence
    const rightArmGood = RIGHT_ARM_JOINTS.every(j => 
      (pose.keypoints[j]?.score ?? 0) >= minConf
    );
    if (rightArmGood) {
      canMirror = true;
      mirrorSource = "right";
    } else {
      // Can't mirror, need fallback for left arm joints
      fallbackJoints.push(...lostJoints.filter(j => LEFT_ARM_JOINTS.includes(j)));
    }
  } else if (rightArmLost && !leftArmLost) {
    const leftArmGood = LEFT_ARM_JOINTS.every(j => 
      (pose.keypoints[j]?.score ?? 0) >= minConf
    );
    if (leftArmGood) {
      canMirror = true;
      mirrorSource = "left";
    } else {
      fallbackJoints.push(...lostJoints.filter(j => RIGHT_ARM_JOINTS.includes(j)));
    }
  } else if (leftArmLost && rightArmLost) {
    // Both arms lost - need fallback
    fallbackJoints.push(...lostJoints.filter(j => 
      LEFT_ARM_JOINTS.includes(j) || RIGHT_ARM_JOINTS.includes(j)
    ));
  }

  // For legs
  if (leftLegLost && !rightLegLost) {
    const rightLegGood = RIGHT_LEG_JOINTS.every(j => 
      (pose.keypoints[j]?.score ?? 0) >= minConf
    );
    if (rightLegGood) {
      canMirror = true;
      mirrorSource = mirrorSource || "right"; // Keep existing if set for arms
    } else {
      fallbackJoints.push(...lostJoints.filter(j => LEFT_LEG_JOINTS.includes(j)));
    }
  } else if (rightLegLost && !leftLegLost) {
    const leftLegGood = LEFT_LEG_JOINTS.every(j => 
      (pose.keypoints[j]?.score ?? 0) >= minConf
    );
    if (leftLegGood) {
      canMirror = true;
      mirrorSource = mirrorSource || "left";
    } else {
      fallbackJoints.push(...lostJoints.filter(j => RIGHT_LEG_JOINTS.includes(j)));
    }
  } else if (leftLegLost && rightLegLost) {
    fallbackJoints.push(...lostJoints.filter(j => 
      LEFT_LEG_JOINTS.includes(j) || RIGHT_LEG_JOINTS.includes(j)
    ));
  }

  // Core joints (nose, eyes, ears, neck) can't be mirrored - need fallback
  const coreJoints = [0, 1, 2, 3, 4]; // Nose, eyes, ears
  fallbackJoints.push(...lostJoints.filter(j => coreJoints.includes(j)));

  return { 
    lostJoints, 
    hasLoss: true, 
    canMirror, 
    mirrorSource,
    fallbackJoints: [...new Set(fallbackJoints)] // Dedupe
  };
}

/**
 * Apply last-known-good positions for joints that can't be mirrored
 */
function applyLastKnownGood(
  pose: PoseDetectionResult,
  lostJoints: number[],
  lastKnownGood: Map<number, Keypoint> | undefined
): PoseDetectionResult {
  if (lostJoints.length === 0 || !lastKnownGood || lastKnownGood.size === 0) {
    return pose;
  }

  const keypoints = [...pose.keypoints.map(kp => ({ ...kp }))];

  for (const jointIdx of lostJoints) {
    const lastGood = lastKnownGood.get(jointIdx);
    if (lastGood && (lastGood.score ?? 0) > 0.3) {
      // Use last known good position but mark confidence as interpolated
      keypoints[jointIdx] = {
        ...lastGood,
        score: 0.5, // Mark as interpolated (lower than original but still usable)
      };
    }
  }

  return {
    ...pose,
    keypoints,
  };
}

/**
 * Update last-known-good map with current good keypoints
 */
function updateLastKnownGood(
  pose: PoseDetectionResult,
  lastKnownGood: Map<number, Keypoint> | undefined,
  minConfidence: number
): void {
  if (!lastKnownGood) return; // Safety check for uninitialized state
  
  for (let i = 0; i < pose.keypoints.length; i++) {
    const kp = pose.keypoints[i];
    if ((kp?.score ?? 0) >= minConfidence) {
      lastKnownGood.set(i, { ...kp });
    }
  }
}

/**
 * Mirror keypoints from one side of the body to the other
 * Uses the body center (midpoint between shoulders or hips) as the mirror axis
 */
function mirrorPose(
  pose: PoseDetectionResult,
  mirrorSource: "left" | "right",
  corruptedJoints: Set<number>
): PoseDetectionResult {
  const keypoints = [...pose.keypoints.map(kp => ({ ...kp }))];

  // Calculate body center X (average of shoulders and hips)
  const leftShoulder = keypoints[5];
  const rightShoulder = keypoints[6];
  const leftHip = keypoints[11];
  const rightHip = keypoints[12];

  let centerX = 0;
  let validCount = 0;

  if ((leftShoulder?.score ?? 0) > 0.3 && (rightShoulder?.score ?? 0) > 0.3) {
    centerX += (leftShoulder.x + rightShoulder.x) / 2;
    validCount++;
  }
  if ((leftHip?.score ?? 0) > 0.3 && (rightHip?.score ?? 0) > 0.3) {
    centerX += (leftHip.x + rightHip.x) / 2;
    validCount++;
  }

  if (validCount === 0) {
    // Can't determine center, return original pose
    return pose;
  }
  centerX /= validCount;

  // Mirror ONLY the specific corrupted joints, not the whole side
  for (const [leftIdx, rightIdx] of MIRROR_PAIRS) {
    const sourceIdx = mirrorSource === "left" ? leftIdx : rightIdx;
    const targetIdx = mirrorSource === "left" ? rightIdx : leftIdx;

    // Only mirror if THIS SPECIFIC target joint is in the corrupted set
    const targetIsCorrupted = corruptedJoints.has(targetIdx);

    const sourceKp = keypoints[sourceIdx];

    if ((sourceKp?.score ?? 0) > 0.3 && targetIsCorrupted) {
      // Mirror X coordinate around center, keep Y the same
      const mirroredX = centerX + (centerX - sourceKp.x);
      
      keypoints[targetIdx] = {
        ...keypoints[targetIdx],
        x: mirroredX,
        y: sourceKp.y,
        score: sourceKp.score, // Use source confidence
      };
    }
  }

  return {
    ...pose,
    keypoints,
  };
}

/**
 * Apply smart recovery: try mirroring first, fall back to freeze
 */
function applySmartRecovery(
  corruptedPose: PoseDetectionResult,
  prevPose: PoseDetectionResult | null,
  freezePose: PoseDetectionResult | null,
  perJointResult: PerJointCorruptionResult,
  config: StabilityConfig
): PoseDetectionResult {
  // If mirror recovery is enabled and we can mirror, do it
  if (config.enableMirrorRecovery && perJointResult.canMirror && perJointResult.mirrorSource) {
    const corruptedJoints = new Set(
      perJointResult.corruptions
        .filter(c => c.isCorrupted)
        .map(c => c.jointIndex)
    );
    
    return mirrorPose(corruptedPose, perJointResult.mirrorSource, corruptedJoints);
  }

  // Fall back to frozen pose
  if (freezePose) {
    return freezePose;
  }

  // Last resort: return previous pose
  return prevPose || corruptedPose;
}

// =========================================
// 4. SMOOTHING AND SIMULATION
// =========================================

/**
 * Apply simple exponential smoothing to a pose
 */
function smoothPose(
  pose: PoseDetectionResult,
  prevPose: PoseDetectionResult | null,
  alpha: number = 0.7
): PoseDetectionResult {
  if (!prevPose) {
    return pose;
  }

  const smoothedKeypoints = pose.keypoints.map((kp, i) => {
    const prevKp = prevPose.keypoints[i];
    if (!prevKp || (kp.score ?? 0) < 0.3) {
      return kp;
    }
    
    return {
      ...kp,
      x: alpha * kp.x + (1 - alpha) * prevKp.x,
      y: alpha * kp.y + (1 - alpha) * prevKp.y,
    };
  });

  return {
    ...pose,
    keypoints: smoothedKeypoints,
  };
}

/**
 * Simulate small motion for frozen pose (optional aesthetic improvement)
 * Applies velocity-based prediction with decay
 */
function simulatePose(
  freezePose: PoseDetectionResult,
  prevFreezePose: PoseDetectionResult | null,
  decay: number = 0.9
): PoseDetectionResult {
  if (!prevFreezePose) {
    return freezePose;
  }

  const simulatedKeypoints = freezePose.keypoints.map((kp, i) => {
    const prevKp = prevFreezePose.keypoints[i];
    if (!prevKp || (kp.score ?? 0) < 0.3) {
      return kp;
    }

    // Calculate velocity
    const vx = (kp.x - prevKp.x) * decay;
    const vy = (kp.y - prevKp.y) * decay;

    return {
      ...kp,
      x: kp.x + vx,
      y: kp.y + vy,
    };
  });

  return {
    ...freezePose,
    keypoints: simulatedKeypoints,
  };
}

// =========================================
// 5. MAIN HOOK
// =========================================

export interface UsePoseStabilityFilterOptions {
  enabled: boolean;
  config?: Partial<StabilityConfig>;
}

export interface UsePoseStabilityFilterReturn {
  /** Process a raw pose frame and return stabilized result */
  processFrame: (poseRaw: PoseDetectionResult) => StabilityFilterResult;
  /** Process multiple poses */
  processPoses: (posesRaw: PoseDetectionResult[]) => StabilityFilterResult[];
  /** Reset the filter state */
  reset: () => void;
  /** Get current state */
  getState: () => StabilityState;
  /** Get current config */
  config: StabilityConfig;
}

/**
 * Hook for pose stability filtering
 * 
 * Usage:
 * ```
 * const { processPoses, getState, reset } = usePoseStabilityFilter({
 *   enabled: true,
 *   config: { MAX_JUMP: 50 }
 * });
 * 
 * const stabilizedPoses = processPoses(rawPoses);
 * const currentState = getState(); // NORMAL or RECOVERY
 * ```
 */
export function usePoseStabilityFilter({
  enabled,
  config: configOverrides = {},
}: UsePoseStabilityFilterOptions): UsePoseStabilityFilterReturn {
  
  // Merge config with defaults
  const config = useMemo<StabilityConfig>(() => ({
    ...DEFAULT_STABILITY_CONFIG,
    ...configOverrides,
  }), [configOverrides]);

  // State ref (using ref to avoid re-renders on every frame)
  const stateRef = useRef<Map<number, StabilityFilterState>>(new Map());

  /**
   * Get or initialize state for a specific pose index
   */
  const getFilterState = useCallback((poseIndex: number): StabilityFilterState => {
    if (!stateRef.current.has(poseIndex)) {
      stateRef.current.set(poseIndex, {
        currentState: StabilityState.NORMAL,
        freezePose: null,
        prevFreezePose: null,
        stableCount: 0,
        prevPose: null,
        baselineRatios: null,
        frameCount: 0,
        lastKnownGood: new Map(),
      });
    }
    
    // Ensure existing state has lastKnownGood (for hot reload compatibility)
    const state = stateRef.current.get(poseIndex)!;
    if (!state.lastKnownGood) {
      state.lastKnownGood = new Map();
    }
    
    return state;
  }, []);

  /**
   * Process a single pose frame through the stability filter
   */
  const processFrame = useCallback((
    poseRaw: PoseDetectionResult,
    poseIndex: number = 0
  ): StabilityFilterResult => {
    if (!enabled) {
      return {
        pose: poseRaw,
        state: StabilityState.NORMAL,
        isBananaFrame: false,
        stableCount: 0,
        similarity: null,
      };
    }

    const state = getFilterState(poseIndex);
    state.frameCount++;

    // Establish baseline ratios from first few stable frames
    if (!state.baselineRatios && state.frameCount > 3) {
      state.baselineRatios = computeAnthropometricRatios(poseRaw, config.minConfidence);
    }

    // =========================================
    // STEP 1: Check for joint loss (out of frame / occlusion)
    // =========================================
    const jointLossResult = detectJointLoss(
      poseRaw, 
      state.prevPose, 
      state.lastKnownGood, 
      config
    );

    let poseToProcess = poseRaw;

    if (jointLossResult.hasLoss && config.enableMirrorRecovery) {
      // Some joints are lost - try to recover them
      if (jointLossResult.canMirror && jointLossResult.mirrorSource) {
        // Mirror from the stable opposite side
        const corruptedJoints = new Set(jointLossResult.lostJoints);
        poseToProcess = mirrorPose(poseRaw, jointLossResult.mirrorSource, corruptedJoints);
      }
      
      // Apply last-known-good fallback for joints that couldn't be mirrored
      if (jointLossResult.fallbackJoints.length > 0) {
        poseToProcess = applyLastKnownGood(
          poseToProcess, 
          jointLossResult.fallbackJoints, 
          state.lastKnownGood
        );
      }
    }

    // Update last-known-good with current good keypoints (before any corruption)
    updateLastKnownGood(poseRaw, state.lastKnownGood, config.minConfidence);

    // =========================================
    // MIRROR-ONLY MODE: Skip banana detection, just mirror and smooth
    // =========================================
    if (config.mirrorOnlyMode) {
      // Also check for per-joint corruption (sudden angle changes) and mirror
      const perJointResult = detectPerJointCorruption(poseToProcess, state.prevPose, config);
      
      if (perJointResult.hasCorruption && perJointResult.canMirror && perJointResult.mirrorSource) {
        const corruptedJoints = new Set(
          perJointResult.corruptions
            .filter(c => c.isCorrupted)
            .map(c => c.jointIndex)
        );
        poseToProcess = mirrorPose(poseToProcess, perJointResult.mirrorSource, corruptedJoints);
      }
      
      // Simple smoothing and return
      const smoothed = smoothPose(poseToProcess, state.prevPose);
      state.prevPose = poseToProcess;
      
      return {
        pose: smoothed,
        state: StabilityState.NORMAL,
        isBananaFrame: jointLossResult.hasLoss || perJointResult.hasCorruption,
        stableCount: 0,
        similarity: null,
      };
    }

    // =========================================
    // STEP 2: Check for banana frames (position corruption)
    // =========================================
    // State machine logic
    if (state.currentState === StabilityState.NORMAL) {
      const detection = detectBanana(poseToProcess, state.prevPose, state.baselineRatios, config);

      if (detection.isBanana) {
        // Detect per-joint corruption for smart mirror recovery
        const perJointResult = detectPerJointCorruption(poseToProcess, state.prevPose, config);
        
        // Try smart recovery (mirroring) first
        if (config.enableMirrorRecovery && perJointResult.canMirror) {
          // Apply mirror recovery without entering full RECOVERY state
          const mirroredPose = applySmartRecovery(
            poseToProcess,
            state.prevPose,
            state.freezePose,
            perJointResult,
            config
          );
          
          // Smooth the mirrored pose
          const smoothed = smoothPose(mirroredPose, state.prevPose);
          state.prevPose = smoothed; // Use mirrored pose as reference for next frame
          
          return {
            pose: smoothed,
            state: StabilityState.NORMAL, // Stay in normal mode with mirror fix
            isBananaFrame: true, // Still mark as banana for tracking
            stableCount: 0,
            similarity: detection.similarity,
          };
        }
        
        // Fall back to full recovery mode (freeze)
        state.currentState = StabilityState.RECOVERY;
        state.freezePose = state.prevPose ? smoothPose(state.prevPose, null, 1) : poseToProcess;
        state.prevFreezePose = state.freezePose;
        state.stableCount = 0;

        // Return frozen pose
        const outputPose = config.enableSimulation && state.prevFreezePose
          ? simulatePose(state.freezePose, state.prevFreezePose, config.simulationDecay)
          : state.freezePose;

        return {
          pose: outputPose,
          state: StabilityState.RECOVERY,
          isBananaFrame: true,
          stableCount: 0,
          similarity: detection.similarity,
        };
      } else {
        // Normal processing (including any joint loss recovery already applied)
        const smoothed = smoothPose(poseToProcess, state.prevPose);
        state.prevPose = poseToProcess;
        
        return {
          pose: smoothed,
          state: StabilityState.NORMAL,
          isBananaFrame: false,
          stableCount: 0,
          similarity: detection.similarity,
        };
      }
    } else {
      // RECOVERY state
      const detection = detectBanana(poseToProcess, state.freezePose, state.baselineRatios, config);
      const simToFreeze = state.freezePose 
        ? cosineSimilarity(poseToProcess, state.freezePose, config.minConfidence)
        : 0;

      if (!detection.isBanana && simToFreeze > config.SIM_THRESHOLD) {
        // Frame is stable, increment counter
        state.stableCount++;
      } else {
        // Reset stability counter
        state.stableCount = 0;
      }

      if (state.stableCount >= config.N_RECOVERY) {
        // Exit recovery mode
        state.currentState = StabilityState.NORMAL;
        state.prevPose = poseToProcess;
        state.freezePose = null;
        state.prevFreezePose = null;

        const smoothed = smoothPose(poseToProcess, state.prevPose);
        return {
          pose: smoothed,
          state: StabilityState.NORMAL,
          isBananaFrame: false,
          stableCount: state.stableCount,
          similarity: simToFreeze,
        };
      } else {
        // Still in recovery - try mirror recovery if available
        const perJointResult = detectPerJointCorruption(poseToProcess, state.freezePose, config);
        
        if (config.enableMirrorRecovery && perJointResult.canMirror) {
          // Apply mirror recovery
          const mirroredPose = applySmartRecovery(
            poseToProcess,
            state.freezePose,
            state.freezePose,
            perJointResult,
            config
          );
          
          return {
            pose: mirroredPose,
            state: StabilityState.RECOVERY,
            isBananaFrame: detection.isBanana,
            stableCount: state.stableCount,
            similarity: simToFreeze,
          };
        }
        
        // Fall back to frozen/simulated pose
        let outputPose = state.freezePose!;
        
        if (config.enableSimulation && state.prevFreezePose) {
          outputPose = simulatePose(state.freezePose!, state.prevFreezePose, config.simulationDecay);
          state.prevFreezePose = state.freezePose;
          state.freezePose = outputPose;
        }

        return {
          pose: outputPose,
          state: StabilityState.RECOVERY,
          isBananaFrame: detection.isBanana,
          stableCount: state.stableCount,
          similarity: simToFreeze,
        };
      }
    }
  }, [enabled, config, getFilterState]);

  /**
   * Process multiple poses
   */
  const processPoses = useCallback((
    posesRaw: PoseDetectionResult[]
  ): StabilityFilterResult[] => {
    return posesRaw.map((pose, index) => processFrame(pose, index));
  }, [processFrame]);

  /**
   * Reset all filter state
   */
  const reset = useCallback(() => {
    stateRef.current.clear();
  }, []);

  /**
   * Get the overall state (returns RECOVERY if any pose is in recovery)
   */
  const getState = useCallback((): StabilityState => {
    for (const state of stateRef.current.values()) {
      if (state.currentState === StabilityState.RECOVERY) {
        return StabilityState.RECOVERY;
      }
    }
    return StabilityState.NORMAL;
  }, []);

  return {
    processFrame: (pose) => processFrame(pose, 0),
    processPoses,
    reset,
    getState,
    config,
  };
}

