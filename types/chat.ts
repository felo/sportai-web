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
  inputTokens?: number; // Input tokens used for this message
  outputTokens?: number; // Output tokens used for this message (assistant messages only)
  responseDuration?: number; // API response duration in milliseconds
  modelSettings?: {
    thinkingMode: string;
    mediaResolution: string;
    domainExpertise?: string;
  };
};

export type Chat = {
  id: string;
  title: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  messages: Message[];
};

