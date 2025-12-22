import { storageLogger } from "@/lib/logger";
import { DEVELOPER_MODE_KEY } from "../constants";
import { isSSR } from "../helpers";

/**
 * Check if we're running in production environment
 * Developer mode is always disabled and hidden in production
 */
function isProduction(): boolean {
  return process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
}

/**
 * Check if developer mode should be available in the UI
 * Returns false in production (developer mode is hidden entirely)
 */
export function isDeveloperModeAvailable(): boolean {
  return !isProduction();
}

/**
 * Get developer mode setting from localStorage
 * @returns true if developer mode is enabled, false otherwise
 * Always returns false in production environment
 */
export function getDeveloperMode(): boolean {
  // Developer mode is always disabled in production
  if (isProduction()) {
    return false;
  }

  if (isSSR()) {
    return false;
  }

  try {
    const stored = localStorage.getItem(DEVELOPER_MODE_KEY);
    return stored === "true";
  } catch (error) {
    storageLogger.error("Failed to load developer mode from storage:", error);
    return false;
  }
}

/**
 * Save developer mode setting to localStorage
 * @param enabled - Whether developer mode should be enabled
 */
export function setDeveloperMode(enabled: boolean): void {
  if (isSSR()) {
    return;
  }

  try {
    localStorage.setItem(DEVELOPER_MODE_KEY, enabled ? "true" : "false");
  } catch (error) {
    storageLogger.error("Failed to save developer mode to storage:", error);
  }
}











