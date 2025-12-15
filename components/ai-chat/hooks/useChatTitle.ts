"use client";

/**
 * Hook for generating AI chat titles after video analysis completes.
 * Triggers title generation once when a substantial analysis response is received.
 */

import { useEffect, useRef } from "react";
import { chatLogger } from "@/lib/logger";
import type { Message } from "@/types/chat";
import { generateAIChatTitle } from "@/utils/storage";
import { getCurrentChatId, loadChat, updateExistingChat } from "@/utils/storage-unified";

interface UseChatTitleOptions {
  messages: Message[];
  loading: boolean;
  isHydrated: boolean;
}

// Track which chats have already had title generation triggered
const titleGenerationInProgress = new Set<string>();

export function useChatTitle({ messages, loading, isHydrated }: UseChatTitleOptions): void {
  const hasGeneratedRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!isHydrated || loading) return;
    
    // Check if there's a completed analysis (substantial assistant response, not streaming)
    const hasCompletedAnalysis = messages.some(
      (m) =>
        m.role === "assistant" &&
        !m.isGreeting &&
        !m.isStreaming &&
        m.content.trim().length > 200
    );
    
    if (!hasCompletedAnalysis) return;
    
    const currentChatId = getCurrentChatId();
    if (!currentChatId) return;
    
    // Skip if already triggered for this chat
    if (hasGeneratedRef.current === currentChatId) return;
    if (titleGenerationInProgress.has(currentChatId)) return;
    
    // Mark as generating
    hasGeneratedRef.current = currentChatId;
    titleGenerationInProgress.add(currentChatId);
    
    chatLogger.debug("[useChatTitle] Generating title after analysis completed");
    
    (async () => {
      try {
        const chat = await loadChat(currentChatId);
        
        // Only generate if title is still a placeholder
        if (chat && (chat.title === "New Chat" || chat.title === "Video Analysis")) {
          const title = await generateAIChatTitle(messages);
          const stillCurrentChatId = getCurrentChatId();
          if (stillCurrentChatId === currentChatId) {
            await updateExistingChat(currentChatId, { title }, false);
          }
        }
      } catch (error) {
        chatLogger.error("Failed to generate AI title:", error);
      } finally {
        setTimeout(() => {
          titleGenerationInProgress.delete(currentChatId);
        }, 5000);
      }
    })();
  }, [messages, isHydrated, loading]);
}

