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
};

