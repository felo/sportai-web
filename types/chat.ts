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
  videoDimensions?: { width: number; height: number }; // Cached video dimensions to prevent layout shift
  inputTokens?: number; // Input tokens used for this message
  outputTokens?: number; // Output tokens used for this message (assistant messages only)
  responseDuration?: number; // Total response duration in milliseconds (from request to stream complete)
  timeToFirstToken?: number; // Time to first token in milliseconds (from request to first stream chunk)
  isVideoSizeLimitError?: boolean; // Flag to indicate this is a video size limitation message
  isStreaming?: boolean; // Flag to indicate the message is currently streaming
  isIncomplete?: boolean; // Flag to indicate the response was interrupted or failed
  modelSettings?: {
    thinkingMode: string;
    mediaResolution: string;
    domainExpertise?: string;
    thinkingBudget?: number; // Thinking budget in tokens
  };
  ttsUsage?: {
    totalCharacters: number; // Total characters converted to speech
    totalCost: number; // Total cost in USD
    requestCount: number; // Number of TTS requests made
    voiceQuality: string; // Voice quality used (for reference)
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

