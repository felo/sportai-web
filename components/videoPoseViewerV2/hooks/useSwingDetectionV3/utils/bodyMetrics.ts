/**
 * Body Metrics Utilities
 * 
 * Pure functions for calculating body center and keypoint velocities.
 */

import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import type { KeypointIndices } from "../types";

/**
 * Calculate body center from core keypoints
 */
export function getBodyCenter(
  pose: PoseDetectionResult,
  indices: KeypointIndices,
  minConfidence: number
): { x: number; y: number } | null {
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
}

/**
 * Calculate keypoint velocity relative to body center
 * Works for any keypoint: wrist, ankle, knee, hip, shoulder, elbow
 */
export function calculateKeypointVelocity(
  currPose: PoseDetectionResult,
  prevPose: PoseDetectionResult,
  keypointIdx: number,
  currCenter: { x: number; y: number },
  prevCenter: { x: number; y: number },
  minConfidence: number
): number | null {
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
}

/**
 * Calculate radial velocity (positive = extending, negative = retracting)
 */
export function calculateRadialVelocity(
  currPose: PoseDetectionResult,
  prevPose: PoseDetectionResult,
  wristIdx: number,
  currCenter: { x: number; y: number },
  prevCenter: { x: number; y: number },
  minConfidence: number
): number | null {
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
}



