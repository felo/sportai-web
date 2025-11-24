import { useState, useRef, useEffect, useCallback } from "react";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import type { SupportedModel } from "@/hooks/usePoseDetection";
import type { VelocityStats, WristPosition } from "../types";
import { MAX_VELOCITY_KMH, VELOCITY_HISTORY_LENGTH, DEFAULT_PERSON_HEIGHT_METERS } from "../constants";

interface UseVelocityTrackingProps {
  currentPoses: PoseDetectionResult[];
  measuredAngles: Array<[number, number, number]>;
  selectedModel: SupportedModel;
  currentFrame: number;
  currentTime: number;
  enabled: boolean;
}

export function useVelocityTracking({
  currentPoses,
  measuredAngles,
  selectedModel,
  currentFrame,
  currentTime,
  enabled,
}: UseVelocityTrackingProps) {
  const [velocityStatsLeft, setVelocityStatsLeft] = useState<VelocityStats>({ current: 0, peak: 0 });
  const [velocityStatsRight, setVelocityStatsRight] = useState<VelocityStats>({ current: 0, peak: 0 });
  
  const lastWristPosLeftRef = useRef<WristPosition | null>(null);
  const lastWristPosRightRef = useRef<WristPosition | null>(null);
  const velocityHistoryLeftRef = useRef<number[]>([]);
  const velocityHistoryRightRef = useRef<number[]>([]);

  // Reset velocity stats when toggling feature
  useEffect(() => {
    if (!enabled) {
      setVelocityStatsLeft({ current: 0, peak: 0 });
      setVelocityStatsRight({ current: 0, peak: 0 });
      lastWristPosLeftRef.current = null;
      lastWristPosRightRef.current = null;
      velocityHistoryLeftRef.current = [];
      velocityHistoryRightRef.current = [];
    }
  }, [enabled]);

  // Calculate person height in pixels for scaling
  const calculatePixelsPerMeter = useCallback((pose: PoseDetectionResult): number => {
    let personHeightPx = 0;
    if (pose.box) {
      personHeightPx = pose.box.height;
    } else {
      const validKps = pose.keypoints.filter(k => (k.score ?? 0) > 0.3);
      if (validKps.length > 0) {
        const ys = validKps.map(k => k.y);
        personHeightPx = Math.max(...ys) - Math.min(...ys);
      }
    }
    return personHeightPx > 0 ? personHeightPx / DEFAULT_PERSON_HEIGHT_METERS : 100;
  }, []);

  // Check which elbows are active based on measured angles
  const checkActiveElbows = useCallback(() => {
    const hasLeftElbow = measuredAngles.some(([a, b, c]) => 
      (a === 5 && b === 7 && c === 9) || (a === 9 && b === 7 && c === 5)
    );
    const hasRightElbow = measuredAngles.some(([a, b, c]) => 
      (a === 6 && b === 8 && c === 10) || (a === 10 && b === 8 && c === 6)
    );
    return { hasLeftElbow, hasRightElbow };
  }, [measuredAngles]);

  // Calculate velocity for both wrists
  useEffect(() => {
    if (!enabled || currentPoses.length === 0) return;

    const pose = currentPoses[0];
    if (!pose) return;

    const { hasLeftElbow, hasRightElbow } = checkActiveElbows();
    const pixelsPerMeter = calculatePixelsPerMeter(pose);

    // Calculate left wrist velocity if left elbow is active
    if (hasLeftElbow) {
      const leftWristIndex = selectedModel === "BlazePose" ? 15 : 9;
      const leftWristKp = pose.keypoints[leftWristIndex];
      
      if (leftWristKp && (leftWristKp.score ?? 0) >= 0.3) {
        const currentX = leftWristKp.x;
        const currentY = leftWristKp.y;

        if (lastWristPosLeftRef.current) {
          const { x: lastX, y: lastY, time: lastTime, frame: lastFrame } = lastWristPosLeftRef.current;
          const dt = currentTime - lastTime;
          const frameDiff = Math.abs(currentFrame - lastFrame);
          
          if (frameDiff > 0 && dt > 0 && dt < 0.5) {
            const dx = currentX - lastX;
            const dy = currentY - lastY;
            const distPx = Math.sqrt(dx * dx + dy * dy);
            const distM = distPx / pixelsPerMeter;
            const velocityKmh = (distM / dt) * 3.6;

            if (velocityKmh < MAX_VELOCITY_KMH) {
              velocityHistoryLeftRef.current.push(velocityKmh);
              if (velocityHistoryLeftRef.current.length > VELOCITY_HISTORY_LENGTH) {
                velocityHistoryLeftRef.current.shift();
              }
              const smoothedVelocity = velocityHistoryLeftRef.current.reduce((a, b) => a + b, 0) / velocityHistoryLeftRef.current.length;
              setVelocityStatsLeft(prev => ({
                current: smoothedVelocity,
                peak: Math.max(prev.peak, smoothedVelocity)
              }));
            }
          }
        } else {
          velocityHistoryLeftRef.current = [];
        }
        lastWristPosLeftRef.current = { x: currentX, y: currentY, time: currentTime, frame: currentFrame };
      }
    }

    // Calculate right wrist velocity if right elbow is active
    if (hasRightElbow) {
      const rightWristIndex = selectedModel === "BlazePose" ? 16 : 10;
      const rightWristKp = pose.keypoints[rightWristIndex];
      
      if (rightWristKp && (rightWristKp.score ?? 0) >= 0.3) {
        const currentX = rightWristKp.x;
        const currentY = rightWristKp.y;

        if (lastWristPosRightRef.current) {
          const { x: lastX, y: lastY, time: lastTime, frame: lastFrame } = lastWristPosRightRef.current;
          const dt = currentTime - lastTime;
          const frameDiff = Math.abs(currentFrame - lastFrame);
          
          if (frameDiff > 0 && dt > 0 && dt < 0.5) {
            const dx = currentX - lastX;
            const dy = currentY - lastY;
            const distPx = Math.sqrt(dx * dx + dy * dy);
            const distM = distPx / pixelsPerMeter;
            const velocityKmh = (distM / dt) * 3.6;

            if (velocityKmh < MAX_VELOCITY_KMH) {
              velocityHistoryRightRef.current.push(velocityKmh);
              if (velocityHistoryRightRef.current.length > VELOCITY_HISTORY_LENGTH) {
                velocityHistoryRightRef.current.shift();
              }
              const smoothedVelocity = velocityHistoryRightRef.current.reduce((a, b) => a + b, 0) / velocityHistoryRightRef.current.length;
              setVelocityStatsRight(prev => ({
                current: smoothedVelocity,
                peak: Math.max(prev.peak, smoothedVelocity)
              }));
            }
          }
        } else {
          velocityHistoryRightRef.current = [];
        }
        lastWristPosRightRef.current = { x: currentX, y: currentY, time: currentTime, frame: currentFrame };
      }
    }
  }, [enabled, currentPoses, selectedModel, currentFrame, currentTime, checkActiveElbows, calculatePixelsPerMeter]);

  return {
    velocityStatsLeft,
    velocityStatsRight,
    hasLeftElbow: checkActiveElbows().hasLeftElbow,
    hasRightElbow: checkActiveElbows().hasRightElbow,
  };
}




