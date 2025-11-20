import { useEffect, useRef, useState, useCallback } from "react";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

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
   * Returns a Promise that resolves to true if user confirmed, false if cancelled
   */
  const confirmNavigation = useCallback(async (message: string = "A response is being generated. Are you sure you want to leave?"): Promise<boolean> => {
    if (!isThinkingRef.current) {
      return true; // Not thinking, allow navigation
    }
    
    // Return a promise that resolves when the user interacts with the dialog
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setDialogOpen(true);
    });
  }, []);

  /**
   * Handle dialog confirmation
   */
  const handleConfirm = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
    setDialogOpen(false);
  }, []);

  /**
   * Handle dialog cancellation
   */
  const handleCancel = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setDialogOpen(false);
  }, []);

  return {
    isThinking,
    confirmNavigation,
    dialogOpen,
    handleConfirm,
    handleCancel,
  };
}

