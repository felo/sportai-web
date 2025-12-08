"use client";

/**
 * Hook for handling PRO + Quick / Quick Only analysis option selection
 */

import { useCallback, useRef } from "react";
import { analysisLogger } from "@/lib/logger";
import type { Message, VideoPreAnalysis } from "@/types/chat";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";
import type { User } from "@supabase/supabase-js";
import { estimateProAnalysisTime } from "@/utils/video-utils";
import { generateMessageId, stripStreamMetadata } from "../utils";
import type { ProgressStage } from "../types";

interface UseAnalysisOptionsOptions {
  messages: Message[];
  thinkingMode: ThinkingMode;
  mediaResolution: MediaResolution;
  user: User | null;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  scrollToBottom: () => void;
  setLoading: (loading: boolean) => void;
  setProgressStage: (stage: ProgressStage) => void;
  refreshLibraryTasks: () => void;
}

interface UseAnalysisOptionsReturn {
  handleSelectProPlusQuick: (messageId: string) => Promise<void>;
  handleSelectQuickOnly: (messageId: string) => Promise<void>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
}

export function useAnalysisOptions({
  messages,
  thinkingMode,
  mediaResolution,
  user,
  addMessage,
  updateMessage,
  scrollToBottom,
  setLoading,
  setProgressStage,
  refreshLibraryTasks,
}: UseAnalysisOptionsOptions): UseAnalysisOptionsReturn {
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Start quick AI analysis after user selects an option
   */
  const startQuickAnalysis = useCallback(async (
    optionsMessageId: string, 
    sport: string,
    storedVideoUrl?: string,
    storedUserPrompt?: string
  ) => {
    let videoUrl: string | null = storedVideoUrl || null;
    let userPrompt = storedUserPrompt || "";
    
    // Fallback: search through messages if stored values not available
    if (!videoUrl) {
      const msgIndex = messages.findIndex(m => m.id === optionsMessageId);
      
      for (let i = msgIndex - 1; i >= 0; i--) {
        const prevMsg = messages[i];
        if (prevMsg.role === "assistant") break;
        if (prevMsg.role === "user") {
          if (prevMsg.videoUrl && !videoUrl) {
            videoUrl = prevMsg.videoUrl;
          }
          if (prevMsg.content && !userPrompt) {
            userPrompt = prevMsg.content;
          }
        }
      }
    }
    
    if (!videoUrl) {
      analysisLogger.error("Could not find video URL for quick analysis");
      const optionsMessage = messages.find(m => m.id === optionsMessageId);
      if (optionsMessage?.analysisOptions) {
        updateMessage(optionsMessageId, {
          analysisOptions: {
            ...optionsMessage.analysisOptions,
            selectedOption: null,
          },
        });
      }
      return;
    }
    
    if (!userPrompt) {
      userPrompt = "Please analyse this video for me.";
    }
    
    // Create assistant message for analysis
    const assistantMessageId = generateMessageId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };
    addMessage(assistantMessage);
    
    setLoading(true);
    setProgressStage("analyzing");
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      const formData = new FormData();
      formData.append("prompt", userPrompt);
      formData.append("videoUrl", videoUrl);
      formData.append("thinkingMode", thinkingMode);
      formData.append("mediaResolution", mediaResolution);
      formData.append("domainExpertise", sport as DomainExpertise);
      
      const response = await fetch("/api/llm", {
        method: "POST",
        headers: { "x-stream": "true" },
        body: formData,
        signal: abortController.signal,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to analyze video");
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          
          updateMessage(assistantMessageId, { 
            content: stripStreamMetadata(accumulatedText),
            isStreaming: true,
          });
        }
        
        updateMessage(assistantMessageId, {
          content: stripStreamMetadata(accumulatedText),
          isStreaming: false,
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        analysisLogger.info("Quick analysis was cancelled");
      } else {
        analysisLogger.error("Quick analysis failed:", err);
        updateMessage(assistantMessageId, {
          content: "Sorry, I encountered an error analyzing your video. Please try again.",
          isStreaming: false,
          isIncomplete: true,
        });
      }
    } finally {
      setLoading(false);
      setProgressStage("idle");
      abortControllerRef.current = null;
    }
  }, [messages, thinkingMode, mediaResolution, addMessage, updateMessage, setLoading, setProgressStage]);

  /**
   * Handle user selecting "PRO + Quick Chat" analysis option
   */
  const handleSelectProPlusQuick = useCallback(async (messageId: string) => {
    analysisLogger.info("PRO + Quick selected for message:", messageId);
    
    const optionsMessage = messages.find(m => m.id === messageId);
    if (!optionsMessage?.analysisOptions) {
      analysisLogger.error("Could not find analysis options message");
      return;
    }
    
    const { preAnalysis, videoUrl: storedVideoUrl, userPrompt: storedUserPrompt } = optionsMessage.analysisOptions;
    
    // Add user message showing their choice
    const userChoiceMessageId = generateMessageId();
    const userChoiceMessage: Message = {
      id: userChoiceMessageId,
      role: "user",
      content: "Let's go with the PRO Analysis!",
    };
    addMessage(userChoiceMessage);
    
    setTimeout(() => scrollToBottom(), 100);
    
    updateMessage(messageId, {
      analysisOptions: {
        ...optionsMessage.analysisOptions,
        selectedOption: "pro_plus_quick",
      },
    });
    
    const videoUrl = storedVideoUrl || null;
    
    if (!videoUrl) {
      analysisLogger.error("Could not find video URL for PRO analysis");
      await startQuickAnalysis(messageId, preAnalysis.sport, undefined, storedUserPrompt);
      return;
    }
    
    const estimatedTime = estimateProAnalysisTime(preAnalysis.durationSeconds ?? null);
    
    // Determine task type: "statistics" for tactical (full court), "technique" for technique (side camera)
    const isTechniqueAnalysis = preAnalysis.isTechniqueLiteEligible && !preAnalysis.isProEligible;
    const taskType = isTechniqueAnalysis ? "technique" : "statistics";
    
    // Create PRO analysis task
    let taskCreated = false;
    if (user) {
      try {
        analysisLogger.info(`Creating PRO ${taskType} task for URL:`, videoUrl);
        
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.id}`,
          },
          body: JSON.stringify({
            taskType,
            sport: preAnalysis.sport,
            videoUrl: videoUrl,
            thumbnailUrl: preAnalysis.thumbnailUrl || null,
            thumbnailS3Key: preAnalysis.thumbnailS3Key || null,
            videoLength: preAnalysis.durationSeconds || null,
          }),
        });
        
        if (response.ok) {
          const { task } = await response.json();
          analysisLogger.info(`PRO ${taskType} task created:`, task.id);
          taskCreated = true;
          refreshLibraryTasks();
        } else {
          const errorData = await response.json().catch(() => ({}));
          analysisLogger.error(`Failed to create PRO ${taskType} task:`, errorData);
        }
      } catch (err) {
        analysisLogger.error(`Error creating PRO ${taskType} task:`, err);
      }
    } else {
      analysisLogger.warn("User not authenticated, skipping PRO task creation");
    }
    
    // Add library notification message
    if (taskCreated) {
      const libraryMessageId = generateMessageId();
      // Technique tasks are immediately completed; tactical tasks need processing time
      const libraryMessageContent = isTechniqueAnalysis
        ? `🎯 I've added this video to your **Library** (in the sidebar) under **Technique**. You can revisit it anytime!\n\nNow let me give you some instant feedback...`
        : `🎯 I've added this video to your **Library** (in the sidebar) for PRO Analysis. You can find the detailed results there in approximately **${estimatedTime}**.\n\nIn the meantime, let me give you some instant feedback...`;
      
      const libraryMessage: Message = {
        id: libraryMessageId,
        role: "assistant",
        content: libraryMessageContent,
        isStreaming: false,
      };
      addMessage(libraryMessage);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await startQuickAnalysis(messageId, preAnalysis.sport, videoUrl, storedUserPrompt);
  }, [messages, user, addMessage, updateMessage, scrollToBottom, startQuickAnalysis, refreshLibraryTasks]);

  /**
   * Handle user selecting "Quick Chat Only" analysis option
   */
  const handleSelectQuickOnly = useCallback(async (messageId: string) => {
    analysisLogger.info("Quick Only selected for message:", messageId);
    
    const optionsMessage = messages.find(m => m.id === messageId);
    if (!optionsMessage?.analysisOptions) {
      analysisLogger.error("Could not find analysis options message");
      return;
    }
    
    const { preAnalysis, videoUrl, userPrompt } = optionsMessage.analysisOptions;
    
    // Add user message showing their choice
    const userChoiceMessageId = generateMessageId();
    const userChoiceMessage: Message = {
      id: userChoiceMessageId,
      role: "user",
      content: "I'll take the Free analysis.",
    };
    addMessage(userChoiceMessage);
    
    setTimeout(() => scrollToBottom(), 100);
    
    updateMessage(messageId, {
      analysisOptions: {
        ...optionsMessage.analysisOptions,
        selectedOption: "quick_only",
      },
    });
    
    await startQuickAnalysis(messageId, preAnalysis.sport, videoUrl, userPrompt);
  }, [messages, addMessage, updateMessage, scrollToBottom, startQuickAnalysis]);

  return {
    handleSelectProPlusQuick,
    handleSelectQuickOnly,
    abortControllerRef,
  };
}

