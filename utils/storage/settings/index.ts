// Developer mode
export { getDeveloperMode, setDeveloperMode, isDeveloperModeAvailable } from "./developer-mode";

// Theatre mode
export {
  isShortScreen,
  getTheatreMode,
  setTheatreMode,
  initTheatreModeResizeListener,
} from "./theatre-mode";

// Deprecated global settings (prefer per-chat settings)
export {
  getThinkingMode,
  setThinkingMode,
  getMediaResolution,
  setMediaResolution,
  getDomainExpertise,
  setDomainExpertise,
} from "./deprecated";

// Highlighting preferences
export {
  getHighlightingPreferences,
  setHighlightingPreferences,
  updateHighlightingPreference,
} from "./highlighting";

// TTS settings
export { getTTSSettings, setTTSSettings, updateTTSSetting } from "./tts";

// AI Insight Level
export { getInsightLevel, setInsightLevel } from "./insight-level";

// Insight Level Onboarding
export {
  hasCompletedInsightOnboarding,
  setInsightOnboardingCompleted,
  resetInsightOnboarding,
} from "./insight-onboarding";











