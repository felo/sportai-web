/**
 * Hook to track joint position history over time for visualization.
 * Records relative metrics: segment lengths, joint angles, and normalized positions.
 * 
 * Uses relative positioning instead of absolute pixels because:
 * - Camera/person movement doesn't affect relative metrics
 * - Scale-independent (works regardless of distance from camera)
 * - Better at detecting actual pose corruption vs. legitimate movement
 */

import { useRef, useCallback } from "react";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";

// =========================================
// SEGMENT AND ANGLE DEFINITIONS
// =========================================

/** Body segment defined by two joint indices */
export interface SegmentDefinition {
  name: string;
  joint1: number;  // Parent joint
  joint2: number;  // Child joint
  category: "arm" | "leg" | "torso";
}

/** Joint angle defined by three joint indices (vertex is middle) */
export interface AngleDefinition {
  name: string;
  joint1: number;
  joint2: number;  // Vertex of the angle
  joint3: number;
}

/** MoveNet keypoint indices */
const KEYPOINTS = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_EAR: 3,
  RIGHT_EAR: 4,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
};

/** Body segments to track */
export const BODY_SEGMENTS: SegmentDefinition[] = [
  // Arms
  { name: "Left Upper Arm", joint1: KEYPOINTS.LEFT_SHOULDER, joint2: KEYPOINTS.LEFT_ELBOW, category: "arm" },
  { name: "Left Forearm", joint1: KEYPOINTS.LEFT_ELBOW, joint2: KEYPOINTS.LEFT_WRIST, category: "arm" },
  { name: "Right Upper Arm", joint1: KEYPOINTS.RIGHT_SHOULDER, joint2: KEYPOINTS.RIGHT_ELBOW, category: "arm" },
  { name: "Right Forearm", joint1: KEYPOINTS.RIGHT_ELBOW, joint2: KEYPOINTS.RIGHT_WRIST, category: "arm" },
  // Legs
  { name: "Left Thigh", joint1: KEYPOINTS.LEFT_HIP, joint2: KEYPOINTS.LEFT_KNEE, category: "leg" },
  { name: "Left Shin", joint1: KEYPOINTS.LEFT_KNEE, joint2: KEYPOINTS.LEFT_ANKLE, category: "leg" },
  { name: "Right Thigh", joint1: KEYPOINTS.RIGHT_HIP, joint2: KEYPOINTS.RIGHT_KNEE, category: "leg" },
  { name: "Right Shin", joint1: KEYPOINTS.RIGHT_KNEE, joint2: KEYPOINTS.RIGHT_ANKLE, category: "leg" },
  // Torso
  { name: "Shoulders", joint1: KEYPOINTS.LEFT_SHOULDER, joint2: KEYPOINTS.RIGHT_SHOULDER, category: "torso" },
  { name: "Hips", joint1: KEYPOINTS.LEFT_HIP, joint2: KEYPOINTS.RIGHT_HIP, category: "torso" },
  { name: "Left Torso", joint1: KEYPOINTS.LEFT_SHOULDER, joint2: KEYPOINTS.LEFT_HIP, category: "torso" },
  { name: "Right Torso", joint1: KEYPOINTS.RIGHT_SHOULDER, joint2: KEYPOINTS.RIGHT_HIP, category: "torso" },
];

/** Joint angles to track */
export const JOINT_ANGLES: AngleDefinition[] = [
  { name: "Left Elbow", joint1: KEYPOINTS.LEFT_SHOULDER, joint2: KEYPOINTS.LEFT_ELBOW, joint3: KEYPOINTS.LEFT_WRIST },
  { name: "Right Elbow", joint1: KEYPOINTS.RIGHT_SHOULDER, joint2: KEYPOINTS.RIGHT_ELBOW, joint3: KEYPOINTS.RIGHT_WRIST },
  { name: "Left Shoulder", joint1: KEYPOINTS.LEFT_ELBOW, joint2: KEYPOINTS.LEFT_SHOULDER, joint3: KEYPOINTS.LEFT_HIP },
  { name: "Right Shoulder", joint1: KEYPOINTS.RIGHT_ELBOW, joint2: KEYPOINTS.RIGHT_SHOULDER, joint3: KEYPOINTS.RIGHT_HIP },
  { name: "Left Knee", joint1: KEYPOINTS.LEFT_HIP, joint2: KEYPOINTS.LEFT_KNEE, joint3: KEYPOINTS.LEFT_ANKLE },
  { name: "Right Knee", joint1: KEYPOINTS.RIGHT_HIP, joint2: KEYPOINTS.RIGHT_KNEE, joint3: KEYPOINTS.RIGHT_ANKLE },
  { name: "Left Hip", joint1: KEYPOINTS.LEFT_SHOULDER, joint2: KEYPOINTS.LEFT_HIP, joint3: KEYPOINTS.LEFT_KNEE },
  { name: "Right Hip", joint1: KEYPOINTS.RIGHT_SHOULDER, joint2: KEYPOINTS.RIGHT_HIP, joint3: KEYPOINTS.RIGHT_KNEE },
];

// =========================================
// DATA STRUCTURES
// =========================================

/** History point for a segment */
export interface SegmentHistoryPoint {
  frame: number;
  timestamp: number;
  length: number;           // Segment length in pixels
  normalizedLength: number; // Length relative to torso height
  lengthChange: number;     // Change from previous frame (ratio, 1.0 = no change)
  isBanana: boolean;
}

/** History point for an angle */
export interface AngleHistoryPoint {
  frame: number;
  timestamp: number;
  angle: number;            // Angle in degrees (0-180)
  angleChange: number;      // Change from previous frame in degrees
  isBanana: boolean;
}

/** History point for joint acceleration (relative to body center) */
export interface AccelerationHistoryPoint {
  frame: number;
  timestamp: number;
  // Position relative to body center
  relativeX: number;
  relativeY: number;
  // Velocity (change in relative position)
  velocityX: number;
  velocityY: number;
  velocity: number;  // Magnitude
  // Acceleration (change in velocity)
  accelerationX: number;
  accelerationY: number;
  acceleration: number;  // Magnitude
  isBanana: boolean;
}

/** All history data */
export interface RelativeHistoryData {
  segments: { [segmentName: string]: SegmentHistoryPoint[] };
  angles: { [angleName: string]: AngleHistoryPoint[] };
  acceleration: { [jointName: string]: AccelerationHistoryPoint[] };
}

/** All trackable joints for acceleration */
export const TRACKABLE_JOINTS = [
  { name: "Nose", index: KEYPOINTS.NOSE },
  { name: "Left Shoulder", index: KEYPOINTS.LEFT_SHOULDER },
  { name: "Right Shoulder", index: KEYPOINTS.RIGHT_SHOULDER },
  { name: "Left Elbow", index: KEYPOINTS.LEFT_ELBOW },
  { name: "Right Elbow", index: KEYPOINTS.RIGHT_ELBOW },
  { name: "Left Wrist", index: KEYPOINTS.LEFT_WRIST },
  { name: "Right Wrist", index: KEYPOINTS.RIGHT_WRIST },
  { name: "Left Hip", index: KEYPOINTS.LEFT_HIP },
  { name: "Right Hip", index: KEYPOINTS.RIGHT_HIP },
  { name: "Left Knee", index: KEYPOINTS.LEFT_KNEE },
  { name: "Right Knee", index: KEYPOINTS.RIGHT_KNEE },
  { name: "Left Ankle", index: KEYPOINTS.LEFT_ANKLE },
  { name: "Right Ankle", index: KEYPOINTS.RIGHT_ANKLE },
];

// =========================================
// HELPER FUNCTIONS
// =========================================

interface Keypoint {
  x: number;
  y: number;
  score?: number | null;
}

/** Calculate distance between two points */
function distance(p1: Keypoint, p2: Keypoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Calculate angle at vertex (in degrees) */
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

/** Calculate torso height (average of left and right torso) for normalization */
function getTorsoHeight(keypoints: Keypoint[], minConfidence: number): number | null {
  const leftShoulder = keypoints[KEYPOINTS.LEFT_SHOULDER];
  const rightShoulder = keypoints[KEYPOINTS.RIGHT_SHOULDER];
  const leftHip = keypoints[KEYPOINTS.LEFT_HIP];
  const rightHip = keypoints[KEYPOINTS.RIGHT_HIP];
  
  const valid = [leftShoulder, rightShoulder, leftHip, rightHip].every(
    kp => kp && (kp.score ?? 0) >= minConfidence
  );
  
  if (!valid) return null;
  
  const leftTorso = distance(leftShoulder, leftHip);
  const rightTorso = distance(rightShoulder, rightHip);
  
  return (leftTorso + rightTorso) / 2;
}

/** Calculate body center (midpoint of shoulders and hips) */
function getBodyCenter(keypoints: Keypoint[], minConfidence: number): { x: number; y: number } | null {
  const leftShoulder = keypoints[KEYPOINTS.LEFT_SHOULDER];
  const rightShoulder = keypoints[KEYPOINTS.RIGHT_SHOULDER];
  const leftHip = keypoints[KEYPOINTS.LEFT_HIP];
  const rightHip = keypoints[KEYPOINTS.RIGHT_HIP];
  
  // Need at least shoulders or hips to compute center
  let sumX = 0, sumY = 0, count = 0;
  
  if (leftShoulder && (leftShoulder.score ?? 0) >= minConfidence) {
    sumX += leftShoulder.x;
    sumY += leftShoulder.y;
    count++;
  }
  if (rightShoulder && (rightShoulder.score ?? 0) >= minConfidence) {
    sumX += rightShoulder.x;
    sumY += rightShoulder.y;
    count++;
  }
  if (leftHip && (leftHip.score ?? 0) >= minConfidence) {
    sumX += leftHip.x;
    sumY += leftHip.y;
    count++;
  }
  if (rightHip && (rightHip.score ?? 0) >= minConfidence) {
    sumX += rightHip.x;
    sumY += rightHip.y;
    count++;
  }
  
  if (count < 2) return null; // Need at least 2 core joints
  
  return { x: sumX / count, y: sumY / count };
}

// =========================================
// HOOK
// =========================================

interface UseJointHistoryOptions {
  enabled: boolean;
  maxHistoryLength?: number;
  minConfidence?: number;
}

interface UseJointHistoryReturn {
  /** Record a new pose frame */
  recordFrame: (
    pose: PoseDetectionResult | null,
    frame: number,
    timestamp: number,
    isBanana?: boolean
  ) => void;
  /** Get segment history */
  getSegmentHistory: (segmentName: string) => SegmentHistoryPoint[];
  /** Get angle history */
  getAngleHistory: (angleName: string) => AngleHistoryPoint[];
  /** Get acceleration history for a joint */
  getAccelerationHistory: (jointName: string) => AccelerationHistoryPoint[];
  /** Get all history */
  getAllHistory: () => RelativeHistoryData;
  /** Clear all history */
  clearHistory: () => void;
  /** Get available segments */
  getSegments: () => SegmentDefinition[];
  /** Get available angles */
  getAngles: () => AngleDefinition[];
  /** Get available joints for acceleration */
  getTrackableJoints: () => typeof TRACKABLE_JOINTS;
  /** Legacy: Get joint history (for compatibility - returns empty) */
  getJointHistory: (jointIndex: number) => never[];
}

/**
 * Hook to track relative joint metrics over time
 */
export function useJointHistory({
  enabled,
  maxHistoryLength = 1000,
  minConfidence = 0.3,
}: UseJointHistoryOptions): UseJointHistoryReturn {
  // Store history
  const historyRef = useRef<RelativeHistoryData>({
    segments: {},
    angles: {},
    acceleration: {},
  });

  /**
   * Record a new pose frame
   */
  const recordFrame = useCallback(
    (
      pose: PoseDetectionResult | null,
      frame: number,
      timestamp: number,
      isBanana: boolean = false
    ) => {
      if (!enabled || !pose) return;

      const keypoints = pose.keypoints;
      const torsoHeight = getTorsoHeight(keypoints, minConfidence);

      // Record segment lengths
      BODY_SEGMENTS.forEach((segment) => {
        const kp1 = keypoints[segment.joint1];
        const kp2 = keypoints[segment.joint2];

        if (!kp1 || !kp2) return;
        if ((kp1.score ?? 0) < minConfidence || (kp2.score ?? 0) < minConfidence) return;

        const length = distance(kp1, kp2);
        const normalizedLength = torsoHeight ? length / torsoHeight : length / 100;

        // Initialize if needed
        if (!historyRef.current.segments[segment.name]) {
          historyRef.current.segments[segment.name] = [];
        }

        const history = historyRef.current.segments[segment.name];
        
        // Calculate change from previous frame
        let lengthChange = 1.0;
        if (history.length > 0) {
          const prevLength = history[history.length - 1].length;
          if (prevLength > 0) {
            lengthChange = length / prevLength;
          }
        }

        history.push({
          frame,
          timestamp,
          length,
          normalizedLength,
          lengthChange,
          isBanana,
        });

        // Trim history
        if (history.length > maxHistoryLength) {
          history.shift();
        }
      });

      // Record joint angles
      JOINT_ANGLES.forEach((angleDef) => {
        const kp1 = keypoints[angleDef.joint1];
        const kp2 = keypoints[angleDef.joint2];
        const kp3 = keypoints[angleDef.joint3];

        if (!kp1 || !kp2 || !kp3) return;
        if ((kp1.score ?? 0) < minConfidence || 
            (kp2.score ?? 0) < minConfidence || 
            (kp3.score ?? 0) < minConfidence) return;

        const angle = calculateAngle(kp1, kp2, kp3);

        // Initialize if needed
        if (!historyRef.current.angles[angleDef.name]) {
          historyRef.current.angles[angleDef.name] = [];
        }

        const history = historyRef.current.angles[angleDef.name];

        // Calculate change from previous frame
        let angleChange = 0;
        if (history.length > 0) {
          angleChange = Math.abs(angle - history[history.length - 1].angle);
        }

        history.push({
          frame,
          timestamp,
          angle,
          angleChange,
          isBanana,
        });

        // Trim history
        if (history.length > maxHistoryLength) {
          history.shift();
        }
      });

      // Record joint acceleration (relative to body center)
      const bodyCenter = getBodyCenter(keypoints, minConfidence);
      if (bodyCenter) {
        TRACKABLE_JOINTS.forEach((joint) => {
          const kp = keypoints[joint.index];
          if (!kp || (kp.score ?? 0) < minConfidence) return;

          // Position relative to body center
          const relativeX = kp.x - bodyCenter.x;
          const relativeY = kp.y - bodyCenter.y;

          // Initialize if needed
          if (!historyRef.current.acceleration[joint.name]) {
            historyRef.current.acceleration[joint.name] = [];
          }

          const history = historyRef.current.acceleration[joint.name];

          // Calculate velocity (change in relative position)
          let velocityX = 0, velocityY = 0, velocity = 0;
          if (history.length > 0) {
            const prev = history[history.length - 1];
            velocityX = relativeX - prev.relativeX;
            velocityY = relativeY - prev.relativeY;
            velocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
          }

          // Calculate acceleration (change in velocity)
          let accelerationX = 0, accelerationY = 0, acceleration = 0;
          if (history.length > 0) {
            const prev = history[history.length - 1];
            accelerationX = velocityX - prev.velocityX;
            accelerationY = velocityY - prev.velocityY;
            acceleration = Math.sqrt(accelerationX * accelerationX + accelerationY * accelerationY);
          }

          history.push({
            frame,
            timestamp,
            relativeX,
            relativeY,
            velocityX,
            velocityY,
            velocity,
            accelerationX,
            accelerationY,
            acceleration,
            isBanana,
          });

          // Trim history
          if (history.length > maxHistoryLength) {
            history.shift();
          }
        });
      }
    },
    [enabled, minConfidence, maxHistoryLength]
  );

  const getSegmentHistory = useCallback((segmentName: string): SegmentHistoryPoint[] => {
    return historyRef.current.segments[segmentName] || [];
  }, []);

  const getAngleHistory = useCallback((angleName: string): AngleHistoryPoint[] => {
    return historyRef.current.angles[angleName] || [];
  }, []);

  const getAccelerationHistory = useCallback((jointName: string): AccelerationHistoryPoint[] => {
    return historyRef.current.acceleration[jointName] || [];
  }, []);

  const getAllHistory = useCallback((): RelativeHistoryData => {
    return { ...historyRef.current };
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = { segments: {}, angles: {}, acceleration: {} };
  }, []);

  const getSegments = useCallback(() => BODY_SEGMENTS, []);
  const getAngles = useCallback(() => JOINT_ANGLES, []);
  const getTrackableJoints = useCallback(() => TRACKABLE_JOINTS, []);

  // Legacy compatibility (returns empty array)
  const getJointHistory = useCallback(() => [] as never[], []);

  return {
    recordFrame,
    getSegmentHistory,
    getAngleHistory,
    getAccelerationHistory,
    getAllHistory,
    clearHistory,
    getSegments,
    getAngles,
    getTrackableJoints,
    getJointHistory,
  };
}

// Re-export types for consumers
export type { SegmentDefinition, AngleDefinition };
