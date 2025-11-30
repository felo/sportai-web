import { useState, useCallback, useRef } from "react";
import type { 
  BallSequenceType, 
  PlayerTacticalData, 
  TacticalAnalysisState,
  BallTypeAnalysisData,
  PlayerAllBallTypesData,
} from "@/types/tactical-analysis";
import type { DomainExpertise } from "@/utils/storage";

interface UseTacticalAnalysisOptions {
  /** Sport domain for specialized analysis */
  sport?: DomainExpertise;
  /** Callback when analysis starts */
  onAnalysisStart?: () => void;
  /** Callback when analysis completes */
  onAnalysisComplete?: (analysis: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

interface AnalyzeParams {
  ballType: BallSequenceType;
  ballLabel: string;
  playerData: PlayerTacticalData;
  comparisonPlayerData?: PlayerTacticalData;
}

interface AnalyzeAllParams {
  players: PlayerAllBallTypesData[];
}

/**
 * Hook for tactical AI analysis of shot patterns
 * 
 * Uses Gemini Flash for fast, cost-effective text analysis of:
 * - Serve patterns
 * - Return patterns
 * - Third ball attacks
 * - Rally development
 * 
 * @example
 * ```tsx
 * const { analyze, isAnalyzing, analysis, error, reset } = useTacticalAnalysis({
 *   sport: "padel",
 *   onAnalysisComplete: (result) => console.log(result),
 * });
 * 
 * // Trigger analysis
 * await analyze({
 *   ballType: "serve",
 *   ballLabel: "Serve",
 *   playerData: { ... },
 * });
 * ```
 */
export function useTacticalAnalysis(options: UseTacticalAnalysisOptions = {}) {
  const { sport = "padel", onAnalysisStart, onAnalysisComplete, onError } = options;
  
  const [state, setState] = useState<TacticalAnalysisState>({
    isAnalyzing: false,
    analysis: null,
    error: null,
  });
  
  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  
  /**
   * Analyze player shot data with AI
   */
  const analyze = useCallback(async (params: AnalyzeParams) => {
    const { ballType, ballLabel, playerData, comparisonPlayerData } = params;
    
    // Cancel any in-progress analysis
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    // Reset state
    setState({
      isAnalyzing: true,
      analysis: null,
      error: null,
    });
    
    onAnalysisStart?.();
    
    try {
      const response = await fetch("/api/tactical-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ballType,
          ballLabel,
          playerData,
          comparisonPlayerData,
          sport,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(errorData.error || `Analysis failed (${response.status})`);
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          
          // Update state with accumulated text
          setState(prev => ({
            ...prev,
            analysis: accumulatedText,
          }));
        }
      }
      
      // Final state update
      setState({
        isAnalyzing: false,
        analysis: accumulatedText,
        error: null,
      });
      
      onAnalysisComplete?.(accumulatedText);
      
    } catch (error) {
      // Handle abort
      if (error instanceof Error && error.name === "AbortError") {
        setState(prev => ({
          ...prev,
          isAnalyzing: false,
        }));
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : "Analysis failed";
      
      setState({
        isAnalyzing: false,
        analysis: null,
        error: errorMessage,
      });
      
      onError?.(errorMessage);
    }
  }, [sport, onAnalysisStart, onAnalysisComplete, onError]);
  
  /**
   * Analyze all ball types for all players at once
   */
  const analyzeAll = useCallback(async (params: AnalyzeAllParams) => {
    const { players } = params;
    
    // Cancel any in-progress analysis
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    // Reset state
    setState({
      isAnalyzing: true,
      analysis: null,
      error: null,
    });
    
    onAnalysisStart?.();
    
    try {
      const response = await fetch("/api/tactical-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          players,
          sport,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(errorData.error || `Analysis failed (${response.status})`);
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          
          // Update state with accumulated text
          setState(prev => ({
            ...prev,
            analysis: accumulatedText,
          }));
        }
      }
      
      // Final state update
      setState({
        isAnalyzing: false,
        analysis: accumulatedText,
        error: null,
      });
      
      onAnalysisComplete?.(accumulatedText);
      
    } catch (error) {
      // Handle abort
      if (error instanceof Error && error.name === "AbortError") {
        setState(prev => ({
          ...prev,
          isAnalyzing: false,
        }));
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : "Analysis failed";
      
      setState({
        isAnalyzing: false,
        analysis: null,
        error: errorMessage,
      });
      
      onError?.(errorMessage);
    }
  }, [sport, onAnalysisStart, onAnalysisComplete, onError]);
  
  /**
   * Cancel in-progress analysis
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isAnalyzing: false,
    }));
  }, []);
  
  /**
   * Reset state
   */
  const reset = useCallback(() => {
    cancel();
    setState({
      isAnalyzing: false,
      analysis: null,
      error: null,
    });
  }, [cancel]);
  
  return {
    ...state,
    analyze,
    analyzeAll,
    cancel,
    reset,
  };
}

export type { AnalyzeParams, AnalyzeAllParams, UseTacticalAnalysisOptions };

