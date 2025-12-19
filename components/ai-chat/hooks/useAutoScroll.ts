"use client";

/**
 * Hook for managing auto-scroll behavior
 */

import { useState, useEffect } from "react";
import type { Message } from "@/types/chat";

interface UseAutoScrollOptions {
  messages: Message[];
  scrollToBottom: () => void;
}

interface UseAutoScrollReturn {
  shouldAutoScroll: boolean;
  setShouldAutoScroll: (value: boolean) => void;
  showingVideoSizeError: boolean;
  setShowingVideoSizeError: (value: boolean) => void;
}

export function useAutoScroll({
  messages,
  scrollToBottom,
}: UseAutoScrollOptions): UseAutoScrollReturn {
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const [showingVideoSizeError, setShowingVideoSizeError] = useState(false);

  // Auto-scroll logic
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isVideoSizeLimitError = lastMessage?.isVideoSizeLimitError;
    
    if (shouldAutoScroll && !isVideoSizeLimitError) {
      scrollToBottom();
    }
    
    if (isVideoSizeLimitError !== showingVideoSizeError) {
      setShowingVideoSizeError(!!isVideoSizeLimitError);
    }
  }, [messages, scrollToBottom, shouldAutoScroll, showingVideoSizeError]);

  return {
    shouldAutoScroll,
    setShouldAutoScroll,
    showingVideoSizeError,
    setShowingVideoSizeError,
  };
}










