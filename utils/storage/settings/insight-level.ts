import { storageLogger } from "@/lib/logger";
import { INSIGHT_LEVEL_KEY } from "../constants";
import { isSSR } from "../helpers";
import type { InsightLevel } from "../types";

/** Default insight level - balanced detail for new users */
const DEFAULT_INSIGHT_LEVEL: InsightLevel = "developing";

/**
 * Get AI Insight Level from localStorage
 * @returns Current insight level setting
 */
export function getInsightLevel(): InsightLevel {
  if (isSSR()) {
    return DEFAULT_INSIGHT_LEVEL;
  }

  try {
    const stored = localStorage.getItem(INSIGHT_LEVEL_KEY);
    if (!stored) {
      return DEFAULT_INSIGHT_LEVEL;
    }
    // Validate the stored value
    if (stored === "beginner" || stored === "developing" || stored === "advanced") {
      return stored;
    }
    return DEFAULT_INSIGHT_LEVEL;
  } catch (error) {
    storageLogger.error("Failed to load insight level from storage:", error);
    return DEFAULT_INSIGHT_LEVEL;
  }
}

/**
 * Save AI Insight Level to localStorage
 * @param level - Insight level to save
 */
export function setInsightLevel(level: InsightLevel): void {
  if (isSSR()) {
    return;
  }

  try {
    localStorage.setItem(INSIGHT_LEVEL_KEY, level);
    // Dispatch custom event to notify components of insight level changes
    window.dispatchEvent(new CustomEvent("insight-level-change"));
  } catch (error) {
    storageLogger.error("Failed to save insight level to storage:", error);
  }
}
