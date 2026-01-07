/**
 * Swing Classification Utilities
 * 
 * Functions for classifying swing types (forehand, backhand, serve)
 * and detecting swing phases.
 */

import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import type { 
  SwingType, 
  SwingFrameDataV3, 
  SwingDetectionConfigV3,
  KeypointIndices 
} from "../types";
import {
  SERVE_HEIGHT_THRESHOLD,
  TWO_HANDED_THRESHOLD,
  ORIENTATION_THRESHOLD,
} from "../constants";

// ============================================================================
// Serve Detection
// ============================================================================

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
export function checkServePosture(
  frameData: SwingFrameDataV3[],
  peakFrame: number,
  windowSize: number,
  handedness: "right" | "left",
  minConfidence: number,
  preprocessedPoses: Map<number, PoseDetectionResult[]>,
  selectedPoseIndex: number,
  indices: KeypointIndices
): { isServe: boolean; maxHeightRatio: number } {
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
  return {
    isServe: maxHeightRatio >= SERVE_HEIGHT_THRESHOLD,
    maxHeightRatio,
  };
}

// ============================================================================
// Two-Handed Backhand Detection
// ============================================================================

/**
 * Check if a backhand is two-handed by measuring only the distance between wrists.
 * In a two-handed backhand, both wrists are close together gripping the racket.
 * Distance is normalized by shoulder width for scale-independence.
 */
export function checkTwoHandedBackhand(
  peakFrame: number,
  windowSize: number,
  minConfidence: number,
  preprocessedPoses: Map<number, PoseDetectionResult[]>,
  selectedPoseIndex: number,
  indices: KeypointIndices
): { isTwoHanded: boolean; minDistanceRatio: number } {
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
  return {
    isTwoHanded: minDistanceRatio <= TWO_HANDED_THRESHOLD,
    minDistanceRatio: minDistanceRatio === Infinity ? -1 : minDistanceRatio,
  };
}

// ============================================================================
// Swing Type Classification
// ============================================================================

/**
 * Determine swing type based on rotation direction, body orientation, and arm position
 */
export function classifySwingType(
  orientationVelocities: (number | null)[],
  peakFrame: number,
  windowSize: number,
  handedness: "right" | "left",
  frameData: SwingFrameDataV3[],
  minConfidence: number,
  preprocessedPoses: Map<number, PoseDetectionResult[]>,
  selectedPoseIndex: number,
  indices: KeypointIndices
): SwingType {
  // First, check if this is a serve (arm goes high above shoulder)
  const serveCheck = checkServePosture(
    frameData, peakFrame, windowSize, handedness, minConfidence,
    preprocessedPoses, selectedPoseIndex, indices
  );
  if (serveCheck.isServe) {
    return "serve";
  }
  
  // Helper to determine if backhand is one-handed or two-handed
  const classifyBackhand = (): SwingType => {
    const twoHandedCheck = checkTwoHandedBackhand(
      peakFrame, windowSize, minConfidence,
      preprocessedPoses, selectedPoseIndex, indices
    );
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
}

// ============================================================================
// Phase Detection
// ============================================================================

/**
 * Detect swing phases around a peak
 * @param minFrame - The earliest frame to consider (e.g., followEnd of previous swing)
 *                   This prevents loading phase from extending into previous swing's territory
 */
export function detectPhases(
  frameData: SwingFrameDataV3[],
  peakFrame: number,
  config: SwingDetectionConfigV3,
  minFrame: number = 0
): { loadingStart: number; swingStart: number; followEnd: number } {
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
}









