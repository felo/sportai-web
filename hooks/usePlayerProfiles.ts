import { useState, useCallback, useRef } from "react";
import type { 
  PlayerProfile, 
  PlayerProfileData, 
  PlayerProfileResponse,
  PlayerProfileState,
} from "@/types/player-profile";

interface UsePlayerProfilesOptions {
  /** Sport domain for context */
  sport?: string;
  /** Callback when generation completes */
  onComplete?: (profiles: PlayerProfile[]) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

/**
 * Hook for generating AI-powered player performance profiles
 * 
 * Uses Gemini Flash for fast profile generation based on player statistics.
 * Returns structured data for spider/radar chart visualization.
 * 
 * @example
 * ```tsx
 * const { profiles, isGenerating, generate, error } = usePlayerProfiles({
 *   sport: "padel",
 *   onComplete: (profiles) => console.log("Generated", profiles.length, "profiles"),
 * });
 * 
 * // Trigger generation
 * generate(playerDataArray);
 * ```
 */
export function usePlayerProfiles(options: UsePlayerProfilesOptions = {}) {
  const { sport = "padel", onComplete, onError } = options;
  
  const [state, setState] = useState<PlayerProfileState>({
    profiles: [],
    isGenerating: false,
    error: null,
  });
  
  // Track if we've already generated to prevent duplicate calls
  const hasGeneratedRef = useRef(false);
  
  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  
  /**
   * Generate profiles for the provided players
   */
  const generate = useCallback(async (players: PlayerProfileData[]) => {
    // Filter to players with data
    const playersWithData = players.filter(p => p.stats.totalSwings > 0);
    
    if (playersWithData.length === 0) {
      setState(prev => ({
        ...prev,
        error: "No players with shot data",
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
      const response = await fetch("/api/player-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          players: playersWithData,
          sport,
        }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(errorData.error || `Generation failed (${response.status})`);
      }
      
      const data: PlayerProfileResponse = await response.json();
      
      setState({
        profiles: data.profiles,
        isGenerating: false,
        error: null,
      });
      
      onComplete?.(data.profiles);
      
    } catch (error) {
      // Handle abort
      if (error instanceof Error && error.name === "AbortError") {
        setState(prev => ({
          ...prev,
          isGenerating: false,
        }));
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : "Generation failed";
      
      setState({
        profiles: [],
        isGenerating: false,
        error: errorMessage,
      });
      
      onError?.(errorMessage);
    }
  }, [sport, onComplete, onError]);
  
  /**
   * Cancel in-progress generation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
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
  
  return {
    ...state,
    generate,
    cancel,
    reset,
    hasGenerated: hasGeneratedRef.current,
  };
}

export type { UsePlayerProfilesOptions };

