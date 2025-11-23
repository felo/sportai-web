import type { SupportedModel } from "@/hooks/usePoseDetection";

export interface VideoPoseViewerProps {
  videoUrl: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  showControls?: boolean;
  initialModel?: SupportedModel;
  initialShowSkeleton?: boolean;
  initialShowAngles?: boolean;
  initialMeasuredAngles?: number[][];
  initialPlaybackSpeed?: number;
  initialUseAccurateMode?: boolean;
  initialConfidenceMode?: "standard" | "high" | "low";
  initialResolutionMode?: "fast" | "balanced" | "accurate";
  initialShowTrackingId?: boolean;
  initialShowTrajectories?: boolean;
  initialSelectedJoints?: number[];
  initialShowVelocity?: boolean;
  initialVelocityWrist?: "left" | "right";
  initialPoseEnabled?: boolean;
}

