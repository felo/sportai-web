/**
 * Joint Angle Calculation Utilities
 * 
 * Pure functions for calculating angles between body joints.
 */

import type { PoseDetectionResult } from "@/hooks/usePoseDetection";

/**
 * Calculate knee bend angle (angle at knee joint)
 * Returns angle in degrees: 180 = straight leg, lower = more bent
 */
export function calculateKneeAngle(
  pose: PoseDetectionResult,
  hipIdx: number,
  kneeIdx: number,
  ankleIdx: number,
  minConfidence: number
): number | null {
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
}

/**
 * Calculate shoulder angle (angle at shoulder joint: hip-shoulder-elbow)
 * Returns angle in degrees: 180 = arm straight down along body, 0 = arm straight up
 * ~90 = arm horizontal
 */
export function calculateShoulderAngle(
  pose: PoseDetectionResult,
  hipIdx: number,
  shoulderIdx: number,
  elbowIdx: number,
  minConfidence: number
): number | null {
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
}

/**
 * Calculate elbow angle (angle at elbow joint: shoulder-elbow-wrist)
 * Returns angle in degrees: 180 = arm straight, lower = more bent
 */
export function calculateElbowAngle(
  pose: PoseDetectionResult,
  shoulderIdx: number,
  elbowIdx: number,
  wristIdx: number,
  minConfidence: number
): number | null {
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
}

/**
 * Calculate hip angle (angle at hip joint: shoulder-hip-knee)
 * Returns angle in degrees: 180 = standing straight, lower = more bent/leaning
 */
export function calculateHipAngle(
  pose: PoseDetectionResult,
  shoulderIdx: number,
  hipIdx: number,
  kneeIdx: number,
  minConfidence: number
): number | null {
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
}



