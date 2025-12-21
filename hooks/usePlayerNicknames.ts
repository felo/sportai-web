import { useState, useCallback, useRef, useEffect } from "react";
import type { PlayerTacticalData } from "@/types/tactical-analysis";
import type { DomainExpertise } from "@/utils/storage";

interface UsePlayerNicknamesOptions {
  /** Sport domain for context */
  sport?: DomainExpertise;
  /** Auto-generate on mount when players are provided */
  autoGenerate?: boolean;
  /** Callback when generation completes */
  onComplete?: (nicknames: Record<number, string>) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

interface UsePlayerNicknamesState {
  /** Map of playerId to nickname */
  nicknames: Record<number, string>;
  /** Whether nicknames are being generated */
  isGenerating: boolean;
  /** Error message if generation failed */
  error: string | null;
}

/**
 * Hook for generating creative player nicknames using LLM
 * 
 * Uses Gemini Flash for fast, creative nickname generation based on
 * player tactical data like shot patterns, speed, and playstyle.
 * 
 * @example
 * ```tsx
 * const { nicknames, isGenerating, generate } = usePlayerNicknames({
 *   sport: "padel",
 *   autoGenerate: true,
 * });
 * 
 * // Or manually trigger generation
 * generate(playerDataArray);
 * ```
 */
export function usePlayerNicknames(
  options: UsePlayerNicknamesOptions = {}
) {
  const { sport = "padel", autoGenerate = false, onComplete, onError } = options;
  
  const [state, setState] = useState<UsePlayerNicknamesState>({
    nicknames: {},
    isGenerating: false,
    error: null,
  });
  
  // Track if we've already generated to prevent duplicate calls
  const hasGeneratedRef = useRef(false);
  
  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  
  /**
   * Generate nicknames for the provided players
   */
  const generate = useCallback(async (players: PlayerTacticalData[]) => {
    // Filter to players with data
    const playersWithData = players.filter(p => p.totalShots > 0);
    
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
    
    setState({
      nicknames: {},
      isGenerating: true,
      error: null,
    });
    
    try {
      const response = await fetch("/api/player-nicknames", {
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
      
      const data = await response.json();
      
      // Convert array to map
      const nicknamesMap: Record<number, string> = {};
      (data.nicknames || []).forEach((n: { playerId: number; nickname: string }) => {
        nicknamesMap[n.playerId] = n.nickname;
      });
      
      setState({
        nicknames: nicknamesMap,
        isGenerating: false,
        error: null,
      });
      
      onComplete?.(nicknamesMap);
      
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
        nicknames: {},
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
      nicknames: {},
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

export type { UsePlayerNicknamesOptions };











