import { useRef, useCallback, useMemo } from "react";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";

interface JointHistory {
  positions: Array<{ x: number; y: number; timestamp: number }>;
  lockedPosition: { x: number; y: number } | null;
  velocity: number;
}

interface UseJointStabilizationOptions {
  enabled: boolean;
  /** Stabilization strength from 0 (off) to 1 (maximum) */
  strength: number;
  /** Number of frames to use for velocity calculation */
  historyLength?: number;
  /** Velocity threshold below which joints are considered stationary (pixels/frame) */
  velocityThreshold?: number;
}

interface UseJointStabilizationReturn {
  stabilizePoses: (poses: PoseDetectionResult[]) => PoseDetectionResult[];
  resetStabilization: () => void;
  getJointVelocities: () => Map<string, number>;
}

/**
 * Hook for stabilizing pose detection results by locking stationary joints
 * Reduces visual noise/shakiness in joints that aren't actually moving
 */
export function useJointStabilization({
  enabled,
  strength,
  historyLength = 5,
  velocityThreshold = 3,
}: UseJointStabilizationOptions): UseJointStabilizationReturn {
  // Track history for each joint across all poses
  // Key format: "poseIndex-jointIndex"
  const jointHistories = useRef<Map<string, JointHistory>>(new Map());
  const lastFrameTime = useRef<number>(0);

  // Adaptive threshold based on strength
  // Higher strength = lower threshold = more joints considered "stationary"
  const adaptiveThreshold = useMemo(() => {
    // At strength 0: threshold is high (10px), few joints locked
    // At strength 1: threshold is low (1px), many joints locked
    return velocityThreshold * (1 - strength * 0.8);
  }, [strength, velocityThreshold]);

  // Smoothing factor for locked positions
  // Higher strength = slower return to detected position when moving again
  const smoothingFactor = useMemo(() => {
    // At strength 0: 1.0 (no smoothing, instant)
    // At strength 1: 0.1 (heavy smoothing)
    return 1 - strength * 0.9;
  }, [strength]);

  const stabilizePoses = useCallback(
    (poses: PoseDetectionResult[]): PoseDetectionResult[] => {
      if (!enabled || strength === 0 || poses.length === 0) {
        return poses;
      }

      const now = performance.now();
      const deltaTime = now - lastFrameTime.current;
      lastFrameTime.current = now;

      // Skip if too much time has passed (e.g., video paused)
      if (deltaTime > 200) {
        jointHistories.current.clear();
        return poses;
      }

      return poses.map((pose, poseIndex) => {
        const stabilizedKeypoints = pose.keypoints.map((kp, jointIndex) => {
          const key = `${poseIndex}-${jointIndex}`;
          let history = jointHistories.current.get(key);

          // Skip low-confidence keypoints
          if ((kp.score ?? 0) < 0.3) {
            if (history) {
              history.lockedPosition = null;
              history.positions = [];
            }
            return kp;
          }

          // Initialize history if needed
          if (!history) {
            history = {
              positions: [],
              lockedPosition: null,
              velocity: 0,
            };
            jointHistories.current.set(key, history);
          }

          // Add current position to history
          history.positions.push({ x: kp.x, y: kp.y, timestamp: now });

          // Keep only recent positions
          while (history.positions.length > historyLength) {
            history.positions.shift();
          }

          // Calculate velocity (average movement per frame)
          if (history.positions.length >= 2) {
            let totalMovement = 0;
            for (let i = 1; i < history.positions.length; i++) {
              const prev = history.positions[i - 1];
              const curr = history.positions[i];
              const dx = curr.x - prev.x;
              const dy = curr.y - prev.y;
              totalMovement += Math.sqrt(dx * dx + dy * dy);
            }
            history.velocity = totalMovement / (history.positions.length - 1);
          }

          // Determine if joint is stationary
          const isStationary = history.velocity < adaptiveThreshold;

          let stabilizedX = kp.x;
          let stabilizedY = kp.y;

          if (isStationary) {
            // Lock to current position if not already locked
            if (!history.lockedPosition) {
              // Use average of recent positions for initial lock
              const avgX =
                history.positions.reduce((sum, p) => sum + p.x, 0) /
                history.positions.length;
              const avgY =
                history.positions.reduce((sum, p) => sum + p.y, 0) /
                history.positions.length;
              history.lockedPosition = { x: avgX, y: avgY };
            }

            // Interpolate towards locked position based on strength
            const lockStrength = Math.min(1, strength * 1.5); // Boost lock effect
            stabilizedX =
              kp.x + (history.lockedPosition.x - kp.x) * lockStrength;
            stabilizedY =
              kp.y + (history.lockedPosition.y - kp.y) * lockStrength;
          } else {
            // Joint is moving - gradually release lock
            if (history.lockedPosition) {
              // Smoothly transition from locked to detected position
              stabilizedX =
                history.lockedPosition.x +
                (kp.x - history.lockedPosition.x) * smoothingFactor;
              stabilizedY =
                history.lockedPosition.y +
                (kp.y - history.lockedPosition.y) * smoothingFactor;

              // Update locked position for smooth transition
              history.lockedPosition = { x: stabilizedX, y: stabilizedY };

              // Release lock if velocity is significantly above threshold
              if (history.velocity > adaptiveThreshold * 2) {
                history.lockedPosition = null;
              }
            }
          }

          return {
            ...kp,
            x: stabilizedX,
            y: stabilizedY,
          };
        });

        return {
          ...pose,
          keypoints: stabilizedKeypoints,
        };
      });
    },
    [enabled, strength, historyLength, adaptiveThreshold, smoothingFactor]
  );

  const resetStabilization = useCallback(() => {
    jointHistories.current.clear();
    lastFrameTime.current = 0;
  }, []);

  const getJointVelocities = useCallback(() => {
    const velocities = new Map<string, number>();
    jointHistories.current.forEach((history, key) => {
      velocities.set(key, history.velocity);
    });
    return velocities;
  }, []);

  return {
    stabilizePoses,
    resetStabilization,
    getJointVelocities,
  };
}


