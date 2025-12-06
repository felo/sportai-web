/**
 * AI Chat module exports
 */

export { AIChatForm } from "./AIChatForm";

// Components
export { ChatLayout, NavigationDialog } from "./components";

// Hooks
export { 
  useChatSettings,
  useVideoPreAnalysis,
  useImageInsight,
  useAnalysisOptions,
  useChatTitle,
  useAutoScroll,
  useMessageRetry,
  useChatSubmission,
} from "./hooks";

// Utilities
export {
  generateMessageId,
  stripStreamMetadata,
  calculateUserMessageTokens,
  generateHelpQuestion,
} from "./utils";

// Types
export type {
  ProgressStage,
  ChatSettings,
  VideoPreAnalysisState,
  SubmissionState,
  StarterPromptSettings,
  AnalysisOptionsData,
  MessageUpdateCallback,
} from "./types";

