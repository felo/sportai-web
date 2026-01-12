// ============================================
// Storage Keys
// ============================================

/** Legacy message storage key */
export const STORAGE_KEY = "sportai-chat-messages";

/** Chats storage key */
export const CHATS_STORAGE_KEY = "sportai-chats";

/** Current chat ID storage key */
export const CURRENT_CHAT_ID_KEY = "sportai-current-chat-id";

/** Developer mode storage key */
export const DEVELOPER_MODE_KEY = "developer-mode";

/** Theatre mode storage key */
export const THEATRE_MODE_KEY = "theatre-mode";

/** Thinking mode storage key */
export const THINKING_MODE_KEY = "thinking-mode";

/** Media resolution storage key */
export const MEDIA_RESOLUTION_KEY = "media-resolution";

/** Domain expertise storage key */
export const DOMAIN_EXPERTISE_KEY = "domain-expertise";

/** Highlighting preferences storage key */
export const HIGHLIGHTING_PREFERENCES_KEY = "highlighting-preferences";

/** TTS settings storage key */
export const TTS_SETTINGS_KEY = "tts-settings";

/** AI Insight Level storage key */
export const INSIGHT_LEVEL_KEY = "insight-level";

/** Insight level onboarding completed storage key */
export const INSIGHT_ONBOARDING_KEY = "insight-onboarding-completed";

// ============================================
// Config Constants
// ============================================

/**
 * Maximum number of messages to keep in history
 * This prevents localStorage from growing too large and maintains performance.
 * 
 * Rationale:
 * - Average message: ~1-5KB (user prompts + AI responses)
 * - 100 messages ≈ 100-500KB (well under localStorage 5-10MB limit)
 * - Keeps ~50 conversations (user + assistant pairs)
 * - Maintains good performance for rendering and scrolling
 */
export const MAX_MESSAGE_HISTORY = 100;

/**
 * Estimated size per message in bytes (rough approximation)
 */
export const ESTIMATED_BYTES_PER_MESSAGE = 3000;

/**
 * Maximum storage size in bytes (conservative: ~2MB to leave room for other data)
 */
export const MAX_STORAGE_SIZE_BYTES = 2 * 1024 * 1024;

/**
 * Height breakpoint below which theatre mode is force-disabled
 */
export const THEATRE_MODE_HEIGHT_BREAKPOINT = 768;
