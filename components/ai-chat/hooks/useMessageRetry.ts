"use client";

/**
 * Hook for handling message retry logic
 */

import { useState, useCallback, useRef } from "react";
import { chatLogger } from "@/lib/logger";
import type { Message } from "@/types/chat";
import type { ThinkingMode, MediaResolution, DomainExpertise, InsightLevel } from "@/utils/storage";
import { getInsightLevel } from "@/utils/storage";
import { getCurrentChatId, loadChat } from "@/utils/storage-unified";
import { stripStreamMetadata } from "../utils";
import type { ProgressStage } from "../types";

interface UseMessageRetryOptions {
  messages: Message[];
  thinkingMode: ThinkingMode;
  mediaResolution: MediaResolution;
  domainExpertise: DomainExpertise;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setProgressStage: (stage: ProgressStage) => void;
  setApiError: (error: string | null) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  sendTextOnlyQuery: (
    prompt: string,
    messageId: string,
    onUpdate: (id: string, updates: Partial<Message>) => void,
    history: Message[],
    abortController: AbortController,
    thinkingMode: ThinkingMode,
    mediaResolution: MediaResolution,
    domainExpertise: DomainExpertise,
    insightLevel: InsightLevel
  ) => Promise<void>;
}

interface UseMessageRetryReturn {
  retryingMessageId: string | null;
  handleRetryMessage: (assistantMessageId: string) => Promise<void>;
  retryAbortRef: React.MutableRefObject<AbortController | null>;
}

export function useMessageRetry({
  messages,
  thinkingMode,
  mediaResolution,
  domainExpertise,
  loading,
  setLoading,
  setProgressStage,
  setApiError,
  updateMessage,
  sendTextOnlyQuery,
}: UseMessageRetryOptions): UseMessageRetryReturn {
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const retryAbortRef = useRef<AbortController | null>(null);

  const handleRetryMessage = useCallback(async (assistantMessageId: string) => {
    if (loading || retryingMessageId) return;
    
    const assistantMessageIndex = messages.findIndex(m => m.id === assistantMessageId);
    if (assistantMessageIndex === -1) {
      chatLogger.error("Cannot find assistant message to retry");
      return;
    }
    
    // Find previous user message(s)
    let userPrompt = "";
    let userVideoUrl: string | null = null;
    
    for (let i = assistantMessageIndex - 1; i >= 0; i--) {
      const prevMessage = messages[i];
      if (prevMessage.role === "assistant") break;
      if (prevMessage.role === "user") {
        if (prevMessage.content.trim()) userPrompt = prevMessage.content;
        if (prevMessage.videoUrl) userVideoUrl = prevMessage.videoUrl;
      }
    }
    
    if (!userPrompt && !userVideoUrl) {
      chatLogger.error("Cannot find user message to retry from");
      return;
    }
    
    const requestChatId = getCurrentChatId();
    if (!requestChatId) return;
    
    // Get conversation history from storage
    const currentChat = await loadChat(requestChatId);
    const messagesToUse = currentChat?.messages ?? [];
    
    const storageAssistantIndex = messagesToUse.findIndex(m => m.id === assistantMessageId);
    if (storageAssistantIndex === -1) return;
    
    const conversationHistory = messagesToUse.slice(0, storageAssistantIndex).filter((m) => {
      for (let i = storageAssistantIndex - 1; i >= 0; i--) {
        if (messagesToUse[i].id === m.id) return false;
        if (messagesToUse[i].role === "assistant") return true;
      }
      return true;
    });
    
    setRetryingMessageId(assistantMessageId);
    setLoading(true);
    setApiError(null);
    
    updateMessage(assistantMessageId, { content: "", isIncomplete: false, isStreaming: true });
    
    const abortController = new AbortController();
    retryAbortRef.current = abortController;
    
    try {
      // Get current insight level
      const insightLevel = getInsightLevel();
      
      if (!userVideoUrl) {
        // Text-only retry
        setProgressStage("generating");
        await sendTextOnlyQuery(
          userPrompt,
          assistantMessageId,
          (id, updates) => {
            const chatId = getCurrentChatId();
            if (chatId === requestChatId) updateMessage(id, updates);
          },
          conversationHistory,
          abortController,
          thinkingMode,
          mediaResolution,
          domainExpertise,
          insightLevel
        );
      } else {
        // Video retry
        setProgressStage("processing");
        
        const formData = new FormData();
        formData.append("prompt", userPrompt);
        formData.append("videoUrl", userVideoUrl);
        formData.append("thinkingMode", thinkingMode);
        formData.append("mediaResolution", mediaResolution);
        formData.append("domainExpertise", domainExpertise);
        formData.append("insightLevel", insightLevel);
        
        if (conversationHistory.length > 0) {
          const { getConversationContext } = await import("@/utils/context-utils");
          const context = getConversationContext(conversationHistory);
          if (context.length > 0) formData.append("history", JSON.stringify(context));
        }
        
        const response = await fetch("/api/llm", {
          method: "POST",
          headers: { "x-stream": "true" },
          body: formData,
          signal: abortController.signal,
        });
        
        if (!response.ok) throw new Error(await response.text() || "Failed to get response");
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        
        if (reader) {
          setProgressStage("analyzing");
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulatedText += decoder.decode(value, { stream: true });
            const chatId = getCurrentChatId();
            if (chatId === requestChatId) {
              updateMessage(assistantMessageId, { 
                content: stripStreamMetadata(accumulatedText), 
                isStreaming: true 
              });
            }
          }
          const chatId = getCurrentChatId();
          if (chatId === requestChatId) {
            updateMessage(assistantMessageId, { isStreaming: false, isIncomplete: false });
          }
        }
      }
    } catch (err) {
      const currentChatId = getCurrentChatId();
      if (currentChatId === requestChatId) {
        if (!(err instanceof Error && err.name === "AbortError")) {
          setApiError(err instanceof Error ? err.message : "An error occurred");
          updateMessage(assistantMessageId, { isStreaming: false, isIncomplete: true });
        }
      }
    } finally {
      const currentChatId = getCurrentChatId();
      if (currentChatId === requestChatId) {
        setLoading(false);
        setProgressStage("idle");
        setRetryingMessageId(null);
      }
      retryAbortRef.current = null;
    }
  }, [
    loading, retryingMessageId, messages, thinkingMode, mediaResolution, 
    domainExpertise, setLoading, setProgressStage, setApiError, 
    updateMessage, sendTextOnlyQuery
  ]);

  return {
    retryingMessageId,
    handleRetryMessage,
    retryAbortRef,
  };
}

