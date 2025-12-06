"use client";

/**
 * Hook for generating AI chat titles
 */

import { useEffect } from "react";
import { chatLogger } from "@/lib/logger";
import type { Message } from "@/types/chat";
import { generateAIChatTitle } from "@/utils/storage";
import { getCurrentChatId, loadChat, updateExistingChat } from "@/utils/storage-unified";

interface UseChatTitleOptions {
  messages: Message[];
  loading: boolean;
  isHydrated: boolean;
}

export function useChatTitle({ messages, loading, isHydrated }: UseChatTitleOptions): void {
  useEffect(() => {
    if (!isHydrated) return;
    
    // Only generate title after first real exchange
    const userMessages = messages.filter(m => m.role === "user");
    const realAnalysisMessages = messages.filter(m => 
      m.role === "assistant" && 
      m.messageType !== "analysis_options" &&
      m.content.trim().length > 100
    );
    
    if (userMessages.length >= 1 && 
        realAnalysisMessages.length >= 1 && 
        !realAnalysisMessages[0].isStreaming &&
        !loading) { 
      
      const currentChatId = getCurrentChatId();
      if (currentChatId) {
        (async () => {
          const chat = await loadChat(currentChatId);
          const firstUserContent = userMessages[0].content.trim().slice(0, 50);
          
          // Only regenerate if title looks auto-generated
          if (chat && (
            chat.title === "New Chat" || 
            chat.title === "Video Analysis" || 
            (firstUserContent && chat.title.startsWith(firstUserContent))
          )) {
            generateAIChatTitle(messages).then(title => {
              const stillCurrentChatId = getCurrentChatId();
              if (stillCurrentChatId === currentChatId) {
                updateExistingChat(currentChatId, { title }, false);
              }
            }).catch(error => {
              chatLogger.error("Failed to generate AI title:", error);
            });
          }
        })();
      }
    }
  }, [messages, isHydrated, loading]);
}

