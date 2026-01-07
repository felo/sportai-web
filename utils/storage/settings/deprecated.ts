/**
 * DEPRECATED: Global settings
 * 
 * These global settings are deprecated in favor of per-chat settings.
 * They are kept for backward compatibility but should not be used in new code.
 * Use chat.thinkingMode, chat.mediaResolution, chat.domainExpertise instead.
 */

import { storageLogger } from "@/lib/logger";
import { THINKING_MODE_KEY, MEDIA_RESOLUTION_KEY, DOMAIN_EXPERTISE_KEY } from "../constants";
import { isSSR } from "../helpers";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "../types";

/**
 * Get thinking mode setting from localStorage
 * @deprecated Global settings are deprecated. Use per-chat settings instead.
 * @returns "fast" or "deep", defaults to "fast"
 */
export function getThinkingMode(): ThinkingMode {
  if (isSSR()) {
    return "fast";
  }

  try {
    const stored = localStorage.getItem(THINKING_MODE_KEY);
    return (stored === "deep" || stored === "fast") ? stored : "fast";
  } catch (error) {
    storageLogger.error("Failed to load thinking mode from storage:", error);
    return "fast";
  }
}

/**
 * Save thinking mode setting to localStorage
 * @deprecated Global settings are deprecated. Use per-chat settings instead.
 * @param mode - "fast" or "deep"
 */
export function setThinkingMode(mode: ThinkingMode): void {
  if (isSSR()) {
    return;
  }

  try {
    localStorage.setItem(THINKING_MODE_KEY, mode);
  } catch (error) {
    storageLogger.error("Failed to save thinking mode to storage:", error);
  }
}

/**
 * Get media resolution setting from localStorage
 * @deprecated Global settings are deprecated. Use per-chat settings instead.
 * @returns "low", "medium", or "high", defaults to "medium"
 */
export function getMediaResolution(): MediaResolution {
  if (isSSR()) {
    return "medium";
  }

  try {
    const stored = localStorage.getItem(MEDIA_RESOLUTION_KEY);
    return (stored === "low" || stored === "medium" || stored === "high") ? stored : "medium";
  } catch (error) {
    storageLogger.error("Failed to load media resolution from storage:", error);
    return "medium";
  }
}

/**
 * Save media resolution setting to localStorage
 * @deprecated Global settings are deprecated. Use per-chat settings instead.
 * @param resolution - "low", "medium", or "high"
 */
export function setMediaResolution(resolution: MediaResolution): void {
  if (isSSR()) {
    return;
  }

  try {
    localStorage.setItem(MEDIA_RESOLUTION_KEY, resolution);
  } catch (error) {
    storageLogger.error("Failed to save media resolution to storage:", error);
  }
}

/**
 * Get domain expertise setting from localStorage
 * @deprecated Global settings are deprecated. Use per-chat settings instead.
 * @returns "all-sports", "tennis", "pickleball", or "padel", defaults to "all-sports"
 */
export function getDomainExpertise(): DomainExpertise {
  if (isSSR()) {
    return "all-sports";
  }

  try {
    const stored = localStorage.getItem(DOMAIN_EXPERTISE_KEY);
    return (stored === "all-sports" || stored === "tennis" || stored === "pickleball" || stored === "padel") 
      ? stored 
      : "all-sports";
  } catch (error) {
    storageLogger.error("Failed to load domain expertise from storage:", error);
    return "all-sports";
  }
}

/**
 * Save domain expertise setting to localStorage
 * @deprecated Global settings are deprecated. Use per-chat settings instead.
 * @param expertise - "all-sports", "tennis", "pickleball", or "padel"
 */
export function setDomainExpertise(expertise: DomainExpertise): void {
  if (isSSR()) {
    return;
  }

  try {
    localStorage.setItem(DOMAIN_EXPERTISE_KEY, expertise);
  } catch (error) {
    storageLogger.error("Failed to save domain expertise to storage:", error);
  }
}














