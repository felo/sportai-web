/**
 * Free Tier Limitations
 * 
 * Centralized configuration for all usage limits.
 * Easy to tweak and extend as we add more limitations.
 */

// ============================================
// Feature Flags
// ============================================

/** Show "Want more accuracy and deeper insights?" PRO upsell banner */
export const SHOW_PRO_UPSELL_BANNER = false;

// ============================================
// Conversation Limits
// ============================================

/** Maximum user messages per conversation (free tier) */
export const FREE_TIER_MESSAGE_LIMIT = 20;

// ============================================
// Video Limits (re-exported from video-size-messages for convenience)
// ============================================

/** Maximum video file size in MB (free tier) */
export { LARGE_VIDEO_LIMIT_MB as FREE_TIER_VIDEO_SIZE_MB } from "./video-size-messages";

/** Maximum video file size in MB (PRO tier) */
export { PRO_VIDEO_LIMIT_MB } from "./video-size-messages";

// ============================================
// Future Limitations (placeholders)
// ============================================

// /** Maximum chats per day (free tier) */
// export const FREE_TIER_DAILY_CHAT_LIMIT = 10;

// /** Maximum video analyses per day (free tier) */
// export const FREE_TIER_DAILY_VIDEO_LIMIT = 5;

// /** Maximum total storage in MB (free tier) */
// export const FREE_TIER_STORAGE_LIMIT_MB = 500;

