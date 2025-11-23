import { useState, useEffect, useCallback } from "react";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import type { JointTrajectoryPoint } from "../types";

interface UseJointTrajectoriesProps {
  currentPoses: PoseDetectionResult[];
  showTrajectories: boolean;
  selectedJoints: number[];
  currentFrame: number;
  dimensions: { width: number; height: number };
  maxPoints?: number;
}

/**
 * Hook to track and manage joint trajectories over time.
 * Automatically maintains trajectory history for selected joints.
 */
export function useJointTrajectories({
  currentPoses,
  showTrajectories,
  selectedJoints,
  currentFrame,
  dimensions,
  maxPoints = 300,
}: UseJointTrajectoriesProps) {
  const [jointTrajectories, setJointTrajectories] = useState<
    Map<number, JointTrajectoryPoint[]>
  >(new Map());

  // Update trajectories when poses change
  useEffect(() => {
    if (!showTrajectories || currentPoses.length === 0) return;

    setJointTrajectories((prev) => {
      const newTrajectories = new Map(prev);
      let hasChanges = false;

      const pose = currentPoses[0]; // Track first person
      if (!pose) return prev;

      // Video to Canvas scaling
      const scaleX = dimensions.width / (pose.keypoints3D?.length ? 1 : 1);
      const scaleY = dimensions.height / (pose.keypoints3D?.length ? 1 : 1);

      selectedJoints.forEach((jointIndex) => {
        const keypoint = pose.keypoints[jointIndex];
        if (!keypoint || (keypoint.score ?? 0) < 0.3) return;

        const trajectory = newTrajectories.get(jointIndex) || [];

        const newPoint: JointTrajectoryPoint = {
          x: keypoint.x * scaleX,
          y: keypoint.y * scaleY,
          frame: currentFrame,
        };

        // Only add if this is a new frame (avoid duplicates)
        const lastPoint = trajectory[trajectory.length - 1];
        if (!lastPoint || lastPoint.frame !== currentFrame) {
          trajectory.push(newPoint);
          hasChanges = true;

          // Keep last N points to avoid memory issues
          if (trajectory.length > maxPoints) {
            trajectory.shift();
          }

          newTrajectories.set(jointIndex, trajectory);
        }
      });

      // Only return new Map if we actually added points
      return hasChanges ? newTrajectories : prev;
    });
  }, [
    currentPoses,
    showTrajectories,
    selectedJoints,
    currentFrame,
    dimensions.width,
    dimensions.height,
    maxPoints,
  ]);

  const clearTrajectories = useCallback(() => {
    setJointTrajectories(new Map());
  }, []);

  return {
    jointTrajectories,
    clearTrajectories,
  };
}

