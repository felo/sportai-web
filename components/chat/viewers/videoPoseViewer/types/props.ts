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
  theatreMode?: boolean;
  hideTheatreToggle?: boolean;
  // Controlled pose enabled state - when provided, component operates in controlled mode
  poseEnabled?: boolean;
  onPoseEnabledChange?: (enabled: boolean) => void;
  // Callback when video metadata is loaded - provides actual video dimensions
  onVideoMetadataLoaded?: (width: number, height: number) => void;
  // Compact mode - hides button text, used when video is floating/docked
  compactMode?: boolean;
}




