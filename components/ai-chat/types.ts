/**
 * Type definitions for AI Chat
 */

import type { Message, VideoPreAnalysis } from "@/types/chat";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";
import type { StarterPromptConfig } from "@/utils/prompts";

/**
 * Progress stage for video upload and analysis
 */
export type ProgressStage = "idle" | "uploading" | "processing" | "analyzing" | "generating";

/**
 * Chat settings state
 */
export interface ChatSettings {
  thinkingMode: ThinkingMode;
  mediaResolution: MediaResolution;
  domainExpertise: DomainExpertise;
}

/**
 * Video pre-analysis state
 */
export interface VideoPreAnalysisState {
  videoPreAnalysis: VideoPreAnalysis | null;
  isDetectingSport: boolean;
  videoSportDetected: DomainExpertise | null;
  detectedVideoUrl: string | null;
}

/**
 * Form submission state
 */
export interface SubmissionState {
  loading: boolean;
  progressStage: ProgressStage;
  uploadProgress: number;
  showingVideoSizeError: boolean;
  retryingMessageId: string | null;
}

/**
 * Props for starter prompt selection handler
 */
export interface StarterPromptSettings {
  thinkingMode?: ThinkingMode;
  mediaResolution?: MediaResolution;
  domainExpertise?: DomainExpertise;
  playbackSpeed?: number;
  poseSettings?: StarterPromptConfig["poseSettings"];
}

/**
 * Analysis options from pre-analysis
 */
export interface AnalysisOptionsData {
  preAnalysis: VideoPreAnalysis;
  selectedOption: "pro_plus_quick" | "quick_only" | null;
  videoUrl?: string;
  userPrompt?: string;
}

/**
 * Message update callback type
 */
export type MessageUpdateCallback = (id: string, updates: Partial<Message>) => void;


