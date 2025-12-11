import type { Message, Chat } from "@/types/chat";

/**
 * Thinking mode type
 */
export type ThinkingMode = "fast" | "deep";

/**
 * Media resolution type
 */
export type MediaResolution = "low" | "medium" | "high";

/**
 * Domain expertise type
 */
export type DomainExpertise = "all-sports" | "tennis" | "pickleball" | "padel";

/**
 * TTS voice quality type
 */
export type TTSVoiceQuality = "standard" | "wavenet" | "neural2" | "studio";

/**
 * TTS voice gender type
 */
export type TTSVoiceGender = "male" | "female" | "neutral";

/**
 * TTS language/accent type
 */
export type TTSLanguage = "en-US" | "en-GB" | "en-AU" | "en-IN";

/**
 * TTS settings interface
 */
export interface TTSSettings {
  enabled: boolean; // Master on/off switch for TTS
  quality: TTSVoiceQuality;
  gender: TTSVoiceGender;
  language: TTSLanguage;
  speakingRate: number; // 0.25 to 4.0
  pitch: number; // -20.0 to 20.0
}

/**
 * Highlighting preferences type
 */
export interface HighlightingPreferences {
  terminology: boolean;
  technique: boolean;
  timestamps: boolean;
  swings: boolean;
}

/**
 * Serializable version of Message (without File objects and blob URLs)
 */
export type SerializableMessage = Omit<Message, "videoFile" | "videoPreview">;

/**
 * Serializable version of Chat (without File objects and blob URLs)
 */
export type SerializableChat = Omit<Chat, "messages"> & {
  messages: SerializableMessage[];
};



