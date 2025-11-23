export type ProgressStage =
  | "idle"
  | "uploading"
  | "processing"
  | "analyzing"
  | "generating"
  | "complete";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  videoFile?: File | null;
  videoPreview?: string | null;
  videoUrl?: string | null; // S3 URL for video playback
  videoS3Key?: string | null; // S3 key for regenerating presigned URLs
  videoPlaybackSpeed?: number; // Video playback speed (0.25, 0.5, 1.0, 1.5, 2.0, etc.)
  inputTokens?: number; // Input tokens used for this message
  outputTokens?: number; // Output tokens used for this message (assistant messages only)
  responseDuration?: number; // API response duration in milliseconds
  isVideoSizeLimitError?: boolean; // Flag to indicate this is a video size limitation message
  modelSettings?: {
    thinkingMode: string;
    mediaResolution: string;
    domainExpertise?: string;
  };
  poseData?: {
    enabled: boolean;
    model: "MoveNet" | "BlazePose";
    showSkeleton: boolean;
    showAngles: boolean;
    defaultAngles?: number[][];
    useAccurateMode?: boolean;
    confidenceMode?: "standard" | "high" | "low";
    resolutionMode?: "fast" | "balanced" | "accurate";
    showTrackingId?: boolean;
    showTrajectories?: boolean;
    selectedJoints?: number[];
    showVelocity?: boolean;
    velocityWrist?: "left" | "right";
  };
};

export type Chat = {
  id: string;
  title: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  messages: Message[];
  // Per-chat settings
  thinkingMode?: "fast" | "deep";
  mediaResolution?: "low" | "medium" | "high";
  domainExpertise?: "all-sports" | "tennis" | "pickleball" | "padel";
};

