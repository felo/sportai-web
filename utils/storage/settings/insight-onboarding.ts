import { storageLogger } from "@/lib/logger";
import { INSIGHT_ONBOARDING_KEY } from "../constants";
import { isSSR } from "../helpers";

/**
 * Check if user has completed the insight level onboarding
 * @returns true if onboarding is completed
 */
export function hasCompletedInsightOnboarding(): boolean {
  if (isSSR()) {
    return false;
  }

  try {
    return localStorage.getItem(INSIGHT_ONBOARDING_KEY) === "true";
  } catch (error) {
    storageLogger.error("Failed to check insight onboarding status:", error);
    return false;
  }
}

/**
 * Mark the insight level onboarding as completed
 */
export function setInsightOnboardingCompleted(): void {
  if (isSSR()) {
    return;
  }

  try {
    localStorage.setItem(INSIGHT_ONBOARDING_KEY, "true");
    // Dispatch event so greeting can update if needed
    window.dispatchEvent(new CustomEvent("insight-onboarding-completed"));
  } catch (error) {
    storageLogger.error("Failed to save insight onboarding status:", error);
  }
}

/**
 * Reset the insight level onboarding (for testing or re-onboarding)
 */
export function resetInsightOnboarding(): void {
  if (isSSR()) {
    return;
  }

  try {
    localStorage.removeItem(INSIGHT_ONBOARDING_KEY);
  } catch (error) {
    storageLogger.error("Failed to reset insight onboarding:", error);
  }
}






