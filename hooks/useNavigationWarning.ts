import { useEffect, useRef } from "react";
import type { ProgressStage } from "@/types/chat";

interface UseNavigationWarningOptions {
  isLoading: boolean;
  progressStage: ProgressStage;
}

/**
 * Hook to warn users when they try to navigate away while a chat is "thinking"
 * (i.e., loading or processing)
 */
export function useNavigationWarning({ isLoading, progressStage }: UseNavigationWarningOptions) {
  const isThinkingRef = useRef(false);

  // Update ref when thinking state changes
  useEffect(() => {
    isThinkingRef.current = isLoading || progressStage !== "idle";
  }, [isLoading, progressStage]);

  // Handle browser navigation (closing tab, refreshing, navigating away)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isThinkingRef.current) {
        // Modern browsers ignore custom messages and show their own
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  /**
   * Check if chat is currently thinking
   */
  const isThinking = () => {
    return isThinkingRef.current;
  };

  /**
   * Show a confirmation dialog if chat is thinking
   * Returns true if user confirmed, false if cancelled
   */
  const confirmNavigation = (message: string = "A response is being generated. Are you sure you want to leave?"): boolean => {
    if (!isThinkingRef.current) {
      return true; // Not thinking, allow navigation
    }
    return window.confirm(message);
  };

  return {
    isThinking,
    confirmNavigation,
  };
}

