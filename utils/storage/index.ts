/**
 * Storage Module
 * 
 * Handles all localStorage operations for the application.
 * This module is organized into submodules for better maintainability:
 * 
 * - messages/  - Message storage and video URL refresh
 * - chats/     - Chat CRUD operations and title generation
 * - settings/  - User preference settings (theatre mode, TTS, highlighting, etc.)
 * - user-data  - User data cleanup on sign out
 */

// ============================================
// Types
// ============================================
export type {
  ThinkingMode,
  MediaResolution,
  DomainExpertise,
  InsightLevel,
  TTSSettings,
  TTSVoiceQuality,
  TTSVoiceGender,
  TTSLanguage,
  HighlightingPreferences,
  SerializableMessage,
  SerializableChat,
} from "./types";

// ============================================
// Constants
// ============================================
export { MAX_MESSAGE_HISTORY } from "./constants";

// ============================================
// Messages
// ============================================
export {
  loadMessagesFromStorage,
  saveMessagesToStorage,
  clearMessagesFromStorage,
  refreshVideoUrls,
} from "./messages";

// ============================================
// Chats
// ============================================
export {
  loadChatsFromStorage,
  saveChatsToStorage,
  createChat,
  updateChat,
  deleteChat,
  updateChatSettings,
  getChatById,
  getCurrentChatId,
  setCurrentChatId,
  clearChatsFromStorage,
  generateChatTitle,
  generateAIChatTitle,
  // Serialization utilities
  serializeChat,
  deserializeChat,
  serializeMessage,
  deserializeMessage,
} from "./chats";

// ============================================
// Settings
// ============================================
export {
  // Developer mode
  getDeveloperMode,
  setDeveloperMode,
  // Theatre mode
  isShortScreen,
  getTheatreMode,
  setTheatreMode,
  initTheatreModeResizeListener,
  // Deprecated global settings
  getThinkingMode,
  setThinkingMode,
  getMediaResolution,
  setMediaResolution,
  getDomainExpertise,
  setDomainExpertise,
  // Highlighting preferences
  getHighlightingPreferences,
  setHighlightingPreferences,
  updateHighlightingPreference,
  // TTS settings
  getTTSSettings,
  setTTSSettings,
  updateTTSSetting,
  // AI Insight Level
  getInsightLevel,
  setInsightLevel,
  // Insight Level Onboarding
  hasCompletedInsightOnboarding,
  setInsightOnboardingCompleted,
  resetInsightOnboarding,
} from "./settings";

// ============================================
// User Data
// ============================================
export { clearUserDataFromStorage } from "./user-data";

// ============================================
// Guest Tasks
// ============================================
export {
  getGuestTasks,
  getGuestTask,
  saveGuestTask,
  updateGuestTask,
  deleteGuestTask,
  clearGuestTasks,
  isGuestTask,
  generateGuestTaskId,
  createGuestTechniqueTask,
  getGuestTaskCount,
  migrateGuestTasks,
} from "./guest-tasks";





