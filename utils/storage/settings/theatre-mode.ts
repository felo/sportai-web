import { storageLogger } from "@/lib/logger";
import { THEATRE_MODE_KEY, THEATRE_MODE_HEIGHT_BREAKPOINT } from "../constants";
import { isSSR } from "../helpers";

/**
 * Check if screen height is below the theatre mode breakpoint
 */
export function isShortScreen(): boolean {
  if (isSSR()) {
    return false;
  }
  return window.innerHeight <= THEATRE_MODE_HEIGHT_BREAKPOINT;
}

/**
 * Get theatre mode setting from localStorage
 * Note: Returns false automatically on short screens (height <= 768px)
 * @returns true if theatre mode is enabled AND screen is tall enough, false otherwise
 */
export function getTheatreMode(): boolean {
  if (isSSR()) {
    return true;
  }

  // Force disable theatre mode on short screens
  if (isShortScreen()) {
    return false;
  }

  try {
    const stored = localStorage.getItem(THEATRE_MODE_KEY);
    // Default to true if not set
    if (stored === null) {
      return true;
    }
    return stored === "true";
  } catch (error) {
    storageLogger.error("Failed to load theatre mode from storage:", error);
    return true;
  }
}

/**
 * Save theatre mode setting to localStorage
 * Note: Cannot enable theatre mode on short screens (height <= 768px)
 * @param enabled - Whether theatre mode should be enabled
 */
export function setTheatreMode(enabled: boolean): void {
  if (isSSR()) {
    return;
  }

  // Prevent enabling theatre mode on short screens
  if (enabled && isShortScreen()) {
    storageLogger.info("Theatre mode cannot be enabled on short screens");
    return;
  }

  try {
    localStorage.setItem(THEATRE_MODE_KEY, enabled ? "true" : "false");
    // Dispatch custom event to notify components of theatre mode changes
    window.dispatchEvent(new CustomEvent("theatre-mode-change"));
  } catch (error) {
    storageLogger.error("Failed to save theatre mode to storage:", error);
  }
}

/**
 * Initialize theatre mode resize listener
 * Dispatches theatre-mode-change event when crossing the height breakpoint
 * Call this once on app initialization
 */
let theatreModeResizeListenerInitialized = false;
export function initTheatreModeResizeListener(): void {
  if (isSSR() || theatreModeResizeListenerInitialized) {
    return;
  }

  let wasShortScreen = isShortScreen();

  const handleResize = () => {
    const nowShortScreen = isShortScreen();
    
    // If we crossed the breakpoint, dispatch the theatre mode change event
    if (wasShortScreen !== nowShortScreen) {
      wasShortScreen = nowShortScreen;
      window.dispatchEvent(new CustomEvent("theatre-mode-change"));
    }
  };

  window.addEventListener("resize", handleResize);
  theatreModeResizeListenerInitialized = true;
}










