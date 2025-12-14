import { storageLogger } from "@/lib/logger";
import { TTS_SETTINGS_KEY } from "../constants";
import { isSSR } from "../helpers";
import type { TTSSettings } from "../types";

/** Default TTS settings */
const DEFAULT_SETTINGS: TTSSettings = {
  enabled: false,
  quality: "studio",
  gender: "male",
  language: "en-GB",
  speakingRate: 0.75,
  pitch: 0.0,
};

/**
 * Get TTS settings from localStorage
 * @returns TTS settings object with defaults
 */
export function getTTSSettings(): TTSSettings {
  if (isSSR()) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const stored = localStorage.getItem(TTS_SETTINGS_KEY);
    if (!stored) {
      // Default: TTS disabled, Studio male UK voice with slower speed
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(stored);
    // Ensure enabled property exists (for backwards compatibility)
    return {
      enabled: parsed.enabled ?? false,
      quality: parsed.quality ?? "studio",
      gender: parsed.gender ?? "male",
      language: parsed.language ?? "en-GB",
      speakingRate: parsed.speakingRate ?? 0.75,
      pitch: parsed.pitch ?? 0.0,
    };
  } catch (error) {
    storageLogger.error("Failed to load TTS settings from storage:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save TTS settings to localStorage
 * @param settings - TTS settings to save
 */
export function setTTSSettings(settings: TTSSettings): void {
  if (isSSR()) {
    return;
  }

  try {
    localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(settings));
    // Dispatch custom event to notify components of TTS settings changes
    window.dispatchEvent(new CustomEvent("tts-settings-change"));
  } catch (error) {
    storageLogger.error("Failed to save TTS settings to storage:", error);
  }
}

/**
 * Update a single TTS setting
 * @param key - The setting key to update
 * @param value - The new value for the setting
 */
export function updateTTSSetting<K extends keyof TTSSettings>(
  key: K,
  value: TTSSettings[K]
): void {
  const settings = getTTSSettings();
  settings[key] = value;
  setTTSSettings(settings);
}





