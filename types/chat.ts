import type { SharkFeature } from "./shark";

/**
 * Candidate option for interactive response selection
 */
export type CandidateOption = {
  id: string;
  text: string; // The text shown as user's message when selected
  description?: string; // Optional subtitle
  icon?: string; // emoji
  premadeResponse: string; // The AI's response when this option is selected
  followUpOptions?: CandidateOption[]; // Optional follow-up options to show after this response
  demoVideoUrl?: string; // If set, triggers video analysis with this URL (no upload needed)
  demoVideoS3Key?: string; // If set, fetches presigned URL from this S3 key before analysis
  demoPoseDataUrl?: string; // Optional direct URL to pose data JSON for demo videos (for public buckets)
  action?: "sign_in" | "set_insight_beginner" | "set_insight_developing" | "set_insight_advanced"; // If set, triggers a special action instead of showing premadeResponse
};

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
  messageType?: "standard" | "analysis_options" | "technique_studio_prompt" | "candidate_responses" | "profile_completion_prompt" | "shark_result"; // Type of message (default is standard)
  // Shark technique analysis result (for messageType === "shark_result")
  sharkResult?: {
    score: number; // Overall score 0-100
    categoryCount: number;
    featureCount: number;
    categories: Record<string, { average_score: number; feature_count: number }>;
    features?: SharkFeature[]; // Full feature data for rendering TechniqueFeatureCard components
    fps?: number; // Video FPS derived from feature event data (frame_nr / timestamp)
  };
  // Candidate responses (for messageType === "candidate_responses")
  candidateResponses?: {
    options: CandidateOption[];
    selectedIndex?: number; // undefined until user picks one
  };
  videoFile?: File | null;
  videoPreview?: string | null;
  videoUrl?: string | null; // S3 URL for video playback
  videoS3Key?: string | null; // S3 key for regenerating presigned URLs
  thumbnailUrl?: string | null; // S3 URL for video thumbnail (first frame)
  thumbnailS3Key?: string | null; // S3 key for thumbnail
  videoPlaybackSpeed?: number; // Video playback speed (0.25, 0.5, 1.0, 1.5, 2.0, etc.)
  videoDimensions?: { width: number; height: number }; // Cached video dimensions to prevent layout shift
  inputTokens?: number; // Input tokens used for this message
  outputTokens?: number; // Output tokens used for this message (assistant messages only)
  responseDuration?: number; // Total response duration in milliseconds (from request to stream complete)
  timeToFirstToken?: number; // Time to first token in milliseconds (from request to first stream chunk)
  isVideoSizeLimitError?: boolean; // Flag to indicate this is a video size limitation message
  isStreaming?: boolean; // Flag to indicate the message is currently streaming
  isIncomplete?: boolean; // Flag to indicate the response was interrupted or failed
  isGreeting?: boolean; // Flag to indicate this is the initial greeting message
  // Analysis options (for messageType === "analysis_options")
  analysisOptions?: {
    preAnalysis: VideoPreAnalysis;
    selectedOption?: "pro_plus_quick" | "quick_only" | null;
    // Store these directly to avoid stale closure issues when user clicks button
    videoUrl?: string;
    userPrompt?: string;
  };
  modelSettings?: {
    thinkingMode: string;
    mediaResolution: string;
    domainExpertise?: string;
    thinkingBudget?: number; // Thinking budget in tokens
  };
  contextUsage?: {
    messagesInContext: number; // Number of messages sent as context
    tokensUsed: number; // Estimated tokens used for context
    maxTokens: number; // Maximum allowed tokens
    complexity: "simple" | "complex"; // Detected query complexity
  };
  cacheName?: string; // Gemini cache name for video content (enables faster retries)
  cacheUsed?: boolean; // Whether this response used cached content
  modelUsed?: string; // Which LLM model was used (e.g., "gemini-2.0-flash", "gemini-2.5-pro")
  modelReason?: string; // Why that model was selected (e.g., "simple_followup", "video_analysis")
  hasVideo?: boolean; // Whether a video/image was present in the request
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
  poseDataS3Key?: string | null; // S3 key for preprocessed pose detection data
  // Technique LITE eligibility - enables pose preprocessing when true (side camera + < 20s)
  isTechniqueLiteEligible?: boolean;
  // Studio prompt (for messageType === "technique_studio_prompt")
  // Note: messageType is still "technique_studio_prompt" for backward compatibility,
  // but analysisType determines which studio (Technique or Match) to show
  techniqueStudioPrompt?: {
    videoUrl: string;
    taskId?: string; // If a task was already created
    analysisType?: "technique" | "match"; // Determines which studio to show
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

/**
 * Video pre-analysis result for PRO and Technique LITE eligibility check
 * This is populated before the user sends their message
 */
export type VideoPreAnalysis = {
  sport: "tennis" | "pickleball" | "padel" | "other";
  cameraAngle: "elevated_back_court" | "ground_behind" | "side" | "overhead" | "diagonal" | "other";
  fullCourtVisible: boolean;
  confidence: number;
  isProEligible: boolean;
  proEligibilityReason?: string;
  isAnalyzing: boolean; // True while detection is in progress
  durationSeconds?: number | null; // Video duration for time estimates
  // Technique LITE eligibility (side camera + < 20 seconds)
  isTechniqueLiteEligible?: boolean;
  techniqueLiteEligibilityReason?: string;
  // Thumbnail from first frame (stored in S3)
  thumbnailUrl?: string | null;
  thumbnailS3Key?: string | null;
};
