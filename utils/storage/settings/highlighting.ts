import { storageLogger } from "@/lib/logger";
import { HIGHLIGHTING_PREFERENCES_KEY } from "../constants";
import { isSSR } from "../helpers";
import type { HighlightingPreferences } from "../types";

/** Default highlighting preferences */
const DEFAULT_PREFERENCES: HighlightingPreferences = {
  terminology: true,
  technique: true,
  timestamps: true,
  swings: true,
};

/**
 * Get highlighting preferences from localStorage
 * @returns Highlighting preferences object with all settings enabled by default
 */
export function getHighlightingPreferences(): HighlightingPreferences {
  if (isSSR()) {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    const stored = localStorage.getItem(HIGHLIGHTING_PREFERENCES_KEY);
    if (!stored) {
      // Default: all highlights enabled
      return { ...DEFAULT_PREFERENCES };
    }
    return JSON.parse(stored);
  } catch (error) {
    storageLogger.error("Failed to load highlighting preferences from storage:", error);
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Save highlighting preferences to localStorage
 * @param preferences - Highlighting preferences to save
 */
export function setHighlightingPreferences(preferences: HighlightingPreferences): void {
  if (isSSR()) {
    return;
  }

  try {
    localStorage.setItem(HIGHLIGHTING_PREFERENCES_KEY, JSON.stringify(preferences));
    // Dispatch custom event to notify components of highlighting preference changes
    window.dispatchEvent(new CustomEvent("highlighting-preferences-change"));
  } catch (error) {
    storageLogger.error("Failed to save highlighting preferences to storage:", error);
  }
}

/**
 * Update a single highlighting preference
 * @param key - The preference key to update
 * @param value - The new value for the preference
 */
export function updateHighlightingPreference(
  key: keyof HighlightingPreferences,
  value: boolean
): void {
  const preferences = getHighlightingPreferences();
  preferences[key] = value;
  setHighlightingPreferences(preferences);
}


