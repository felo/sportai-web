"use client";

/**
 * Hook for generating AI chat titles
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
  // Use ref to track if we've already generated for this chat
  const hasGeneratedRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!isHydrated) return;
    
    // Check if there's been a real video analysis (not just premade responses)
    // A real analysis requires: user sent a video + got a substantial response
    const userMessagesWithVideo = messages.filter(m => 
      m.role === "user" && 
      (m.videoUrl || m.videoFile || m.videoPreview)
    );
    
    // Real analysis response = assistant message that's substantial, not greeting, not streaming
    const realAnalysisResponses = messages.filter(m => 
      m.role === "assistant" && 
      !m.isGreeting && // Not part of the greeting flow
      m.messageType !== "analysis_options" &&
      m.messageType !== "candidate_responses" &&
      m.content.trim().length > 200 && // Substantial response (premade responses are shorter)
      !m.isStreaming
    );
    
    // Only generate title if:
    // 1. User has sent at least one video
    // 2. There's at least one real analysis response
    // 3. Not currently loading
    if (userMessagesWithVideo.length >= 1 && 
        realAnalysisResponses.length >= 1 && 
        !loading) { 
      
      const currentChatId = getCurrentChatId();
      if (!currentChatId) return;
      
      // Skip if we've already triggered title generation for this chat
      if (hasGeneratedRef.current === currentChatId) return;
      if (titleGenerationInProgress.has(currentChatId)) return;
      
      // Mark as generating
      hasGeneratedRef.current = currentChatId;
      titleGenerationInProgress.add(currentChatId);
      
      chatLogger.debug("[useChatTitle] Generating title for video analysis chat");
      
      (async () => {
        try {
          const chat = await loadChat(currentChatId);
          
          // Only regenerate if title looks auto-generated
          if (chat && (
            chat.title === "New Chat" || 
            chat.title === "Video Analysis"
          )) {
            const title = await generateAIChatTitle(messages);
            const stillCurrentChatId = getCurrentChatId();
            if (stillCurrentChatId === currentChatId) {
              await updateExistingChat(currentChatId, { title }, false);
            }
          }
        } catch (error) {
          chatLogger.error("Failed to generate AI title:", error);
        } finally {
          // Remove from in-progress after a delay to prevent immediate re-triggers
          setTimeout(() => {
            titleGenerationInProgress.delete(currentChatId);
          }, 5000);
        }
      })();
    }
  }, [messages, isHydrated, loading]);
}

