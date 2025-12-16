import { storageLogger } from "@/lib/logger";
import { DEVELOPER_MODE_KEY } from "../constants";
import { isSSR } from "../helpers";

/**
 * Get developer mode setting from localStorage
 * @returns true if developer mode is enabled, false otherwise
 */
export function getDeveloperMode(): boolean {
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







