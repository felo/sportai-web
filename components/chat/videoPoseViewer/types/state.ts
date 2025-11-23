import type { SupportedModel } from "@/hooks/usePoseDetection";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";

export interface VelocityStats {
  current: number;
  peak: number;
}

export interface JointTrajectoryPoint {
  x: number;
  y: number;
  frame: number;
}

export interface LabelPositionState {
  multiplier: number;
  verticalOffset: number;
  framesSinceChange: number;
}

export interface WristPosition {
  x: number;
  y: number;
  frame: number;
  time: number;
}

