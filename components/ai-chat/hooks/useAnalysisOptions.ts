"use client";

/**
 * Hook for handling PRO + Quick / Quick Only analysis option selection
 * Also handles Shark API integration for pickleball technique analysis
 */

import { useCallback, useRef } from "react";
import { analysisLogger } from "@/lib/logger";
import type { Message, VideoPreAnalysis } from "@/types/chat";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";
import { createGuestTechniqueTask } from "@/utils/storage";
import type { User } from "@supabase/supabase-js";
import { estimateProAnalysisTime } from "@/utils/video-utils";
import { generateMessageId, stripStreamMetadata } from "../utils";
import type { ProgressStage } from "../types";
import type { SharkAnalysisResult, SharkMetadata } from "@/types/shark";
import { calculateAverageScore, getCategoryCount, getTotalFeatureCount } from "@/types/shark";

/**
 * Format category name for display
 * e.g., "ball_contact" -> "Ball Contact"
 */
function formatCategoryName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Format Shark analysis result as context for the LLM
 * This provides structured technique analysis data to inform the LLM's video review
 */
function formatSharkContextForLLM(sharkResult: SharkAnalysisResult): string {
  const categories = sharkResult.result?.feature_categories;
  if (!categories) return "";

  const categoryScores = Object.entries(categories)
    .filter(([, cat]) => cat.average_score > 0)
    .map(([name, cat]) => `- ${formatCategoryName(name)}: ${Math.round(cat.average_score)}/100`)
    .join("\n");

  const overallScore = Math.round(calculateAverageScore(categories));

  return `[TECHNIQUE ANALYSIS CONTEXT - FIRST SWING ONLY]
The following analysis was performed on the FIRST swing in the video using computer vision:

Overall Score: ${overallScore}/100

Category Breakdown:
${categoryScores}

Please use this analysis as context when reviewing the video. Note that this analysis only covers the first swing - if there are multiple swings, you may see additional technique elements not captured above.
[END CONTEXT]

`;
}

interface UseAnalysisOptionsOptions {
  messages: Message[];
  thinkingMode: ThinkingMode;
  mediaResolution: MediaResolution;
  user: User | null;
  /** JWT access token for authenticated API calls */
  accessToken: string | null;
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
  /** Handle Shark API analysis for pickleball technique videos */
  handleSharkAnalysis: (messageId: string, swingType: string, swingLabel: string, dominantHand: "left" | "right") => Promise<void>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
}

export function useAnalysisOptions({
  messages,
  thinkingMode,
  mediaResolution,
  user,
  accessToken,
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
    storedUserPrompt?: string,
    options?: {
      showTechniqueStudioPrompt?: boolean;
      taskId?: string;
      sharkContext?: SharkAnalysisResult;
    }
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

    // Add Shark context if provided (for technique analysis with computer vision results)
    if (options?.sharkContext?.result?.feature_categories) {
      const sharkContextStr = formatSharkContextForLLM(options.sharkContext);
      userPrompt = sharkContextStr + userPrompt;
      analysisLogger.info("Added Shark context to LLM prompt");
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

      const headers: Record<string, string> = { "x-stream": "true" };
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const response = await fetch("/api/llm", {
        method: "POST",
        headers,
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

        // Add Technique Studio prompt if requested and video URL is available
        if (options?.showTechniqueStudioPrompt && videoUrl) {
          await new Promise(resolve => setTimeout(resolve, 300));

          const studioPromptId = generateMessageId();
          const studioPromptMessage: Message = {
            id: studioPromptId,
            role: "assistant",
            content: "",
            messageType: "technique_studio_prompt",
            techniqueStudioPrompt: {
              videoUrl: videoUrl,
              taskId: options.taskId,
            },
          };
          addMessage(studioPromptMessage);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        analysisLogger.info("Quick analysis was cancelled");
      } else {
        analysisLogger.error("Quick analysis failed:", err);
        updateMessage(assistantMessageId, {
          content: "Sorry, I encountered an error analyzing your video. Please try again.",
          isStreaming: false,
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

    // Map "other" sport to "all" for task storage (valid sports: tennis, padel, pickleball, all)
    const taskSport = preAnalysis.sport === "other" ? "all" : preAnalysis.sport;

    // Create PRO analysis task
    let taskCreated = false;
    let createdTaskId: string | undefined;
    if (user && accessToken) {
      try {
        analysisLogger.info(`Creating PRO ${taskType} task for URL:`, videoUrl);

        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            taskType,
            sport: taskSport,
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
          createdTaskId = task.id;
          refreshLibraryTasks();
        } else {
          const errorData = await response.json().catch(() => ({}));
          analysisLogger.error(`Failed to create PRO ${taskType} task:`, errorData);
        }
      } catch (err) {
        analysisLogger.error(`Error creating PRO ${taskType} task:`, err);
      }
    } else if (isTechniqueAnalysis) {
      // Create guest task for technique analysis (stored in localStorage)
      try {
        analysisLogger.info(`Creating guest technique task for URL:`, videoUrl);
        const guestTask = createGuestTechniqueTask({
          videoUrl,
          sport: taskSport,
          thumbnailUrl: preAnalysis.thumbnailUrl,
          videoLength: preAnalysis.durationSeconds,
        });
        taskCreated = true;
        createdTaskId = guestTask.id;
        refreshLibraryTasks();
        analysisLogger.info(`Guest technique task created:`, guestTask.id);
      } catch (err) {
        analysisLogger.error("Error creating guest technique task:", err);
      }
    } else {
      analysisLogger.warn("User not authenticated, skipping PRO task creation (non-technique tasks require authentication)");
    }

    // Add library notification message with gradual typing effect
    if (taskCreated) {
      const libraryMessageId = generateMessageId();
      // Technique tasks are immediately completed; tactical tasks need processing time
      const libraryMessageContent = isTechniqueAnalysis
        ? `I've added this video to your **Library** (in the sidebar) under **Technique**. You can revisit it anytime!\n\nNow let me give you some instant feedback...`
        : `I've added this video to your **Library** (in the sidebar) for PRO Analysis. You can find the detailed results there in approximately **${estimatedTime}**.\n\nIn the meantime, let me give you some instant feedback...`;

      // Start with empty content and streaming state
      const libraryMessage: Message = {
        id: libraryMessageId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };
      addMessage(libraryMessage);

      // Gradually reveal text character by character
      const charsPerUpdate = 3;
      const delayMs = 15;
      for (let i = 0; i <= libraryMessageContent.length; i += charsPerUpdate) {
        updateMessage(libraryMessageId, {
          content: libraryMessageContent.slice(0, i),
          isStreaming: true,
        });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      // Finalize the message
      updateMessage(libraryMessageId, {
        content: libraryMessageContent,
        isStreaming: false,
      });

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await startQuickAnalysis(messageId, preAnalysis.sport, videoUrl, storedUserPrompt, {
      showTechniqueStudioPrompt: isTechniqueAnalysis,
      taskId: createdTaskId,
    });
  }, [messages, user, accessToken, addMessage, updateMessage, scrollToBottom, startQuickAnalysis, refreshLibraryTasks]);

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

  /**
   * Handle Shark API analysis for pickleball technique videos
   * Sends video to Shark API and displays average category score
   */
  const handleSharkAnalysis = useCallback(async (
    messageId: string,
    swingType: string,
    swingLabel: string,
    dominantHand: "left" | "right"
  ) => {
    analysisLogger.info("Shark analysis requested:", { messageId, swingType, swingLabel, dominantHand });

    const optionsMessage = messages.find(m => m.id === messageId);
    if (!optionsMessage?.analysisOptions) {
      analysisLogger.error("Could not find analysis options message");
      return;
    }

    // TODO: Consider storing video file in a ref instead of message object
    // to reduce memory usage for large videos (50-100MB).
    // Current approach keeps File reference in message until chat is cleared.

    // Find the video file from previous messages
    let videoFile: File | null = null;
    const msgIndex = messages.findIndex(m => m.id === messageId);
    analysisLogger.info("Searching for video file from message index:", msgIndex, "total messages:", messages.length);

    for (let i = msgIndex - 1; i >= 0; i--) {
      const prevMsg = messages[i];
      analysisLogger.debug(`Message [${i}]: role=${prevMsg.role}, hasVideoFile=${!!prevMsg.videoFile}, hasVideoUrl=${!!prevMsg.videoUrl}`);
      if (prevMsg.role === "assistant") break;
      if (prevMsg.role === "user" && prevMsg.videoFile) {
        videoFile = prevMsg.videoFile;
        analysisLogger.info("Found video file:", { name: videoFile.name, size: videoFile.size, type: videoFile.type });
        break;
      }
    }

    if (!videoFile) {
      analysisLogger.error("Could not find video file for Shark analysis. Messages:",
        messages.slice(0, msgIndex + 1).map(m => ({ id: m.id, role: m.role, hasVideoFile: !!m.videoFile }))
      );
      // Fall back to regular PRO analysis
      await handleSelectProPlusQuick(messageId);
      return;
    }

    // Add user message showing their choice
    const userChoiceMessageId = generateMessageId();
    const userChoiceMessage: Message = {
      id: userChoiceMessageId,
      role: "user",
      content: `Analyse my ${swingLabel} (${dominantHand}-handed)`,
    };
    addMessage(userChoiceMessage);

    setTimeout(() => scrollToBottom(), 100);

    // Update options message to show selection
    updateMessage(messageId, {
      analysisOptions: {
        ...optionsMessage.analysisOptions,
        selectedOption: "pro_plus_quick",
      },
    });

    // Create assistant message for analysis status
    // Empty content triggers the rotating thinking messages carousel in MessageBubble
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
      // Build Shark metadata (matches api-test page format)
      // Note: player_level is NOT sent to Shark API - it doesn't accept this field
      const metadata: SharkMetadata = {
        uid: `webapp_${crypto.randomUUID().slice(0, 8)}`,
        sport: "pickleball", // Hardcoded for now (sport available in preAnalysis.sport)
        swing_type: swingType,
        dominant_hand: dominantHand,
        player_height_mm: 1800, // Hardcoded to 180cm (player_level: intermediate assumed)
        store_data: false,
        timestamp: new Date().toISOString(),
      };

      // Create form data
      const formData = new FormData();
      formData.append("file", videoFile, videoFile.name);
      formData.append("metadata", JSON.stringify(metadata));

      analysisLogger.info("Sending to Shark API:", {
        fileName: videoFile.name,
        fileSize: videoFile.size,
        metadata
      });

      const response = await fetch("/api/shark/analyze", {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        analysisLogger.error("Shark API error response:", errorData);
        throw new Error(errorData.details || errorData.error || `Shark API request failed with status ${response.status}`);
      }

      // Parse streaming JSON response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body from Shark API");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let sharkResult: SharkAnalysisResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Try to parse complete JSON lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const result = JSON.parse(line) as SharkAnalysisResult;

              if (result.status === "processing") {
                updateMessage(assistantMessageId, {
                  content: "Analyzing your swing... Processing video and detecting technique features.",
                  isStreaming: true,
                });
              } else if (result.status === "done") {
                sharkResult = result;
              } else if (result.status === "error" || result.status === "failed") {
                throw new Error(result.errors?.join(", ") || "Shark analysis failed");
              }
            } catch (parseError) {
              // Not valid JSON, might be partial data - continue
              if (parseError instanceof SyntaxError) {
                continue;
              }
              throw parseError;
            }
          }
        }
      }

      // Try to parse any remaining buffer
      if (buffer.trim() && !sharkResult) {
        try {
          const result = JSON.parse(buffer) as SharkAnalysisResult;
          if (result.status === "done") {
            sharkResult = result;
          } else if (result.status === "error" || result.status === "failed") {
            throw new Error(result.errors?.join(", ") || "Shark analysis failed");
          }
        } catch {
          // Ignore parse errors for remaining buffer
        }
      }

      // Display results
      if (sharkResult?.result?.feature_categories) {
        const categories = sharkResult.result.feature_categories;
        const averageScore = calculateAverageScore(categories);
        const categoryCount = getCategoryCount(categories);
        const featureCount = getTotalFeatureCount(categories);

        // Update message with shark_result type and data for visual display
        updateMessage(assistantMessageId, {
          content: "",
          messageType: "shark_result",
          sharkResult: {
            score: Math.round(averageScore),
            categoryCount,
            featureCount,
            categories: Object.fromEntries(
              Object.entries(categories).map(([name, cat]) => [
                name,
                { average_score: cat.average_score, feature_count: cat.feature_count }
              ])
            ),
          },
          isStreaming: false,
        });

        analysisLogger.info("Shark analysis complete:", {
          averageScore,
          categoryCount,
          featureCount,
          categories: Object.keys(categories)
        });

        // Trigger LLM analysis for additional feedback, passing Shark context
        const { preAnalysis, videoUrl, userPrompt } = optionsMessage.analysisOptions;
        if (videoUrl) {
          await startQuickAnalysis(messageId, preAnalysis.sport, videoUrl, userPrompt, {
            sharkContext: sharkResult,
          });
        }
      } else {
        updateMessage(assistantMessageId, {
          content: "Analysis complete, but no detailed results were returned. Please try again.",
          isStreaming: false,
        });
      }

    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        analysisLogger.info("Shark analysis was cancelled");
        updateMessage(assistantMessageId, {
          content: "Analysis cancelled.",
          isStreaming: false,
        });
      } else {
        analysisLogger.error("Shark analysis failed:", err);
        updateMessage(assistantMessageId, {
          content: `Sorry, I encountered an error analyzing your swing: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
          isStreaming: false,
        });
      }
    } finally {
      setLoading(false);
      setProgressStage("idle");
      abortControllerRef.current = null;
    }
  }, [messages, addMessage, updateMessage, scrollToBottom, setLoading, setProgressStage, startQuickAnalysis]);

  return {
    handleSelectProPlusQuick,
    handleSelectQuickOnly,
    handleSharkAnalysis,
    abortControllerRef,
  };
}
