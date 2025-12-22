import { useState, useCallback, useRef } from "react";
import { logger } from "@/lib/logger";
import type {
  SwingProfile,
  SwingProfileData,
  SwingProfileResponse,
  SwingProfileState,
} from "@/types/swing-profile";

interface UseSwingProfilesOptions {
  /** Sport domain for context */
  sport?: string;
  /** Callback when generation completes */
  onComplete?: (profiles: SwingProfile[]) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

/**
 * Hook for generating AI-powered swing/technique analysis profiles
 *
 * Uses Gemini Flash for fast profile generation based on swing biomechanics data.
 * Returns structured data for radar chart visualization with AI-generated insights.
 *
 * @example
 * ```tsx
 * const { profiles, isGenerating, generate, error } = useSwingProfiles({
 *   sport: "padel",
 *   onComplete: (profiles) => logger.debug("Generated", profiles.length, "profiles"),
 * });
 *
 * // Trigger generation
 * generate(swingDataArray);
 * ```
 */
export function useSwingProfiles(options: UseSwingProfilesOptions = {}) {
  const { sport = "padel", onComplete, onError } = options;

  const [state, setState] = useState<SwingProfileState>({
    profiles: [],
    isGenerating: false,
    error: null,
  });

  // Track if we've already generated to prevent duplicate calls
  const hasGeneratedRef = useRef(false);

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Generate profiles for the provided swings
   */
  const generate = useCallback(
    async (swings: SwingProfileData[]) => {
      if (swings.length === 0) {
        setState((prev) => ({
          ...prev,
          error: "No swing data available",
        }));
        return;
      }

      // Cancel any in-progress generation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      hasGeneratedRef.current = true;

      setState({
        profiles: [],
        isGenerating: true,
        error: null,
      });

      try {
        const response = await fetch("/api/swing-profiles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            swings,
            sport,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Generation failed" }));
          throw new Error(
            errorData.error || `Generation failed (${response.status})`
          );
        }

        const data: SwingProfileResponse = await response.json();

        setState({
          profiles: data.profiles,
          isGenerating: false,
          error: null,
        });

        onComplete?.(data.profiles);
      } catch (error) {
        // Handle abort
        if (error instanceof Error && error.name === "AbortError") {
          setState((prev) => ({
            ...prev,
            isGenerating: false,
          }));
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : "Generation failed";

        setState({
          profiles: [],
          isGenerating: false,
          error: errorMessage,
        });

        onError?.(errorMessage);
      }
    },
    [sport, onComplete, onError]
  );

  /**
   * Cancel in-progress generation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isGenerating: false,
    }));
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    cancel();
    hasGeneratedRef.current = false;
    setState({
      profiles: [],
      isGenerating: false,
      error: null,
    });
  }, [cancel]);

  /**
   * Get profile for a specific swing by ID
   */
  const getProfileBySwingId = useCallback(
    (swingId: string): SwingProfile | undefined => {
      return state.profiles.find((p) => p.swingId === swingId);
    },
    [state.profiles]
  );

  return {
    ...state,
    generate,
    cancel,
    reset,
    getProfileBySwingId,
    hasGenerated: hasGeneratedRef.current,
  };
}

export type { UseSwingProfilesOptions };





