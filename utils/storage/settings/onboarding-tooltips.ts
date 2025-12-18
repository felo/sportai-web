import { storageLogger } from "@/lib/logger";
import { isSSR } from "../helpers";

/** Storage key prefix for onboarding tooltip states */
const ONBOARDING_TOOLTIP_PREFIX = "onboarding-tooltip-";

/**
 * Available onboarding tooltip IDs
 * Add new tooltips here as you create them
 */
export type OnboardingTooltipId = 
  | "floating-video-button"
  | "scroll-to-video"
  | "chat-input-tip";

/**
 * Check if a specific onboarding tooltip has been shown
 * @param tooltipId - The unique identifier for the tooltip
 * @returns true if the tooltip has been shown/dismissed
 */
export function hasSeenOnboardingTooltip(tooltipId: OnboardingTooltipId): boolean {
  if (isSSR()) {
    return true; // Assume seen on server to prevent flash
  }

  try {
    return localStorage.getItem(`${ONBOARDING_TOOLTIP_PREFIX}${tooltipId}`) === "true";
  } catch (error) {
    storageLogger.error(`Failed to check onboarding tooltip status for ${tooltipId}:`, error);
    return true; // Fail silently by assuming it was seen
  }
}

/**
 * Mark a specific onboarding tooltip as seen/dismissed
 * @param tooltipId - The unique identifier for the tooltip
 */
export function markOnboardingTooltipSeen(tooltipId: OnboardingTooltipId): void {
  if (isSSR()) {
    return;
  }

  try {
    localStorage.setItem(`${ONBOARDING_TOOLTIP_PREFIX}${tooltipId}`, "true");
    // Dispatch event so other components can react if needed
    window.dispatchEvent(new CustomEvent("onboarding-tooltip-dismissed", { 
      detail: { tooltipId } 
    }));
  } catch (error) {
    storageLogger.error(`Failed to mark onboarding tooltip ${tooltipId} as seen:`, error);
  }
}

/**
 * Reset a specific onboarding tooltip (for testing or re-showing)
 * @param tooltipId - The unique identifier for the tooltip
 */
export function resetOnboardingTooltip(tooltipId: OnboardingTooltipId): void {
  if (isSSR()) {
    return;
  }

  try {
    localStorage.removeItem(`${ONBOARDING_TOOLTIP_PREFIX}${tooltipId}`);
  } catch (error) {
    storageLogger.error(`Failed to reset onboarding tooltip ${tooltipId}:`, error);
  }
}

/**
 * Reset all onboarding tooltips (for testing or complete re-onboarding)
 */
export function resetAllOnboardingTooltips(): void {
  if (isSSR()) {
    return;
  }

  const tooltipIds: OnboardingTooltipId[] = [
    "floating-video-button",
    "scroll-to-video",
    "chat-input-tip",
  ];

  tooltipIds.forEach(resetOnboardingTooltip);
}




