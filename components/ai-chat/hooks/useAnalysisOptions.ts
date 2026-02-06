"use client";

/**
 * Hook for handling PRO + Quick / Quick Only analysis option selection
 * Also handles Shark API integration for pickleball technique analysis
 */

import { useCallback, useRef } from "react";
import { analysisLogger } from "@/lib/logger";
import type { Message, VideoPreAnalysis, DetectedSport } from "@/types/chat";
import { toDomainExpertise } from "@/types/chat";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";
import { createGuestTechniqueTask } from "@/utils/storage";
import type { User } from "@supabase/supabase-js";
import { estimateProAnalysisTime } from "@/utils/video-utils";
import { generateMessageId, stripStreamMetadata } from "../utils";
import type { ProgressStage } from "../types";
import type { SharkAnalysisResult, SharkMetadata } from "@/types/shark";
import { parseAnalysisTags, stripAnalysisTags } from "@/utils/analysis-tags";
import { calculateAverageScore, getCategoryCount, getTotalFeatureCount, calculateFpsFromFeatures } from "@/types/shark";

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
 * Also includes syntax for embedding feature cards in the response
 */
function formatSharkContextForLLM(sharkResult: SharkAnalysisResult): string {
  const categories = sharkResult.result?.feature_categories;
  const features = sharkResult.result?.features;
  if (!categories) return "";

  // Convert score to qualitative descriptor (defined here for categories)
  const getCategoryLevel = (score: number): string => {
    if (score <= 30) return "needs significant work";
    if (score <= 50) return "needs improvement";
    if (score <= 70) return "developing well";
    if (score <= 85) return "strong";
    return "excellent";
  };

  const categoryScores = Object.entries(categories)
    .filter(([, cat]) => cat.average_score > 0)
    .map(([name, cat]) => `- ${formatCategoryName(name)}: ${getCategoryLevel(cat.average_score)}`)
    .join("\n");

  // Convert score to qualitative descriptor
  const getImprovementLevel = (score: number): string => {
    if (score <= 30) return "significant room for improvement";
    if (score <= 50) return "moderate room for improvement";
    if (score <= 70) return "some refinement possible";
    if (score <= 85) return "good, minor adjustments";
    return "excellent";
  };

  // List available features that can be embedded
  const featureList = features
    ?.map((f) => {
      const displayName = f.feature_human_readable_name || f.human_name || formatCategoryName(f.feature_name);
      return `- ${f.feature_name} "${displayName}" (${getImprovementLevel(f.score)}, Level: ${f.level})`;
    })
    .join("\n") || "";

  return `[MANDATORY TECHNIQUE DATA - YOU MUST USE THIS IN YOUR ANALYSIS]

IMPORTANT INSTRUCTION: Computer vision has already analyzed the FIRST swing in this video. You MUST incorporate these specific findings into your analysis. Do not provide generic advice - reference the actual observations below.

CATEGORY BREAKDOWN (for your reference only):
${categoryScores}

DETAILED FEATURE ANALYSIS (Reference these in your response):
${featureList}

SCORING INTERPRETATION (DO NOT show raw scores to user):
- Score 0-30: Significant room for improvement
- Score 31-50: Moderate room for improvement
- Score 51-70: Some refinement possible
- Score 71-85: Good technique, minor adjustments
- Score 86-100: Excellent technique

YOUR TASK:
1. Incorporate the computer vision findings into your analysis naturally
2. NEVER mention specific scores (like "53/100" or "score of 38") - instead describe room for improvement qualitatively
3. Focus your feedback on features with significant or moderate room for improvement
4. For features you discuss in detail, you can embed an interactive card using: [[FEATURE:feature_name]]
   Example: [[FEATURE:stance_open_closed]]
   Only use EXACT feature names from the list above (the part before the quotes)
5. DO NOT use collapsible sections, groups, or <details> tags - write your analysis as flowing prose with embedded feature cards

REMEMBER: This data is for the FIRST swing only. If there are multiple swings, mention that additional swings weren't analyzed by the computer vision system.

[END MANDATORY CONTEXT]

User request: `;
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
      analysisLogger.info("Added Shark context to LLM prompt", {
        contextLength: sharkContextStr.length,
        featureCount: options.sharkContext.result?.features?.length || 0,
        categoryCount: Object.keys(options.sharkContext.result?.feature_categories || {}).length,
        promptPreview: userPrompt.substring(0, 200) + "...",
      });
    } else {
      analysisLogger.warn("No Shark context available for LLM prompt", {
        hasSharkContext: !!options?.sharkContext,
        hasResult: !!options?.sharkContext?.result,
        hasCategories: !!options?.sharkContext?.result?.feature_categories,
      });
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
      // Debug: Log the full prompt being sent to LLM
      console.log("[DEBUG] Full prompt being sent to LLM:", userPrompt);
      console.log("[DEBUG] Prompt length:", userPrompt.length);

      const formData = new FormData();
      formData.append("prompt", userPrompt);
      formData.append("videoUrl", videoUrl);
      formData.append("thinkingMode", thinkingMode);
      formData.append("mediaResolution", mediaResolution);
      const domainExpertiseForApi: DomainExpertise = toDomainExpertise(sport as DetectedSport);
      formData.append("domainExpertise", domainExpertiseForApi);

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

        // Parse analysis tags from the final content and strip them for display
        const finalContent = stripStreamMetadata(accumulatedText);
        const analysisTags = parseAnalysisTags(finalContent);
        const displayContent = analysisTags ? stripAnalysisTags(finalContent) : finalContent;

        updateMessage(assistantMessageId, {
          content: displayContent,
          isStreaming: false,
          ...(analysisTags && { analysisTags }),
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

    // Map sport to valid task storage values (valid sports: tennis, padel, pickleball, all)
    // Sports not explicitly supported for technique analysis default to "all"
    const validTaskSports = ["tennis", "padel", "pickleball"] as const;
    const taskSport = validTaskSports.includes(preAnalysis.sport as typeof validTaskSports[number])
      ? (preAnalysis.sport as "tennis" | "padel" | "pickleball")
      : "all";

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
            sport: 'pickleball',
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
        ? `I've added this video to your **Studio** (on the top bar) under **Technique**. You can revisit it anytime!\n\nNow let me give you some instant feedback...`
        : `I've added this video to your **Studio** (on the top bar) for analysis. You can find the detailed results there in approximately **${estimatedTime}**.\n\nIn the meantime, let me give you some instant feedback...`;

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

    // Get the S3 video URL from the analysis options (preferred - avoids 413 body size errors)
    const { videoUrl: s3VideoUrl } = optionsMessage.analysisOptions;

    if (!s3VideoUrl) {
      analysisLogger.error("No video URL available for Shark analysis");
      // Fall back to regular PRO analysis
      await handleSelectProPlusQuick(messageId);
      return;
    }

    analysisLogger.info("Using S3 video URL for Shark analysis:", s3VideoUrl);

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
        uid: `webapp_${generateMessageId().slice(0, 8)}`,
        sport: "pickleball", // Hardcoded for now (sport available in preAnalysis.sport)
        swing_type: swingType,
        dominant_hand: dominantHand,
        player_height_mm: 1800, // Hardcoded to 180cm (player_level: intermediate assumed)
        store_data: false,
        timestamp: new Date().toISOString(),
      };

      // Create form data with S3 URL (server will fetch video, avoiding client upload size limits)
      const formData = new FormData();
      formData.append("videoUrl", s3VideoUrl);
      formData.append("metadata", JSON.stringify(metadata));

      analysisLogger.info("Sending to Shark API:", {
        videoUrl: s3VideoUrl,
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

        // Parse details if it's a JSON string
        let errorMessage = "";
        if (errorData.details) {
          try {
            const parsedDetails = typeof errorData.details === 'string'
              ? JSON.parse(errorData.details)
              : errorData.details;
            errorMessage = parsedDetails.error || parsedDetails.message || errorData.details;
          } catch {
            errorMessage = errorData.details;
          }
        }
        errorMessage = errorMessage || errorData.error || `Request failed with status ${response.status}`;

        throw new Error(errorMessage);
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
        // Calculate FPS from feature event data (wicked smart approach!)
        const features = sharkResult.result.features || [];
        const fps = calculateFpsFromFeatures(features);

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
            features, // Full feature data for TechniqueFeatureCard rendering
            fps, // Video FPS derived from feature event data
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
        analysisLogger.info("Triggering LLM analysis with Shark context:", {
          hasVideoUrl: !!videoUrl,
          userPrompt: userPrompt?.substring(0, 100) || "(empty)",
          sharkResultStatus: sharkResult?.status,
          sharkFeatureCount: sharkResult?.result?.features?.length || 0,
          sharkCategoryCount: Object.keys(sharkResult?.result?.feature_categories || {}).length,
        });

        // Create library task for technique analysis (silently, without typing message)
        let createdTaskId: string | undefined;
        // Map sport to valid task storage values (valid sports: tennis, padel, pickleball, all)
        const validTaskSports = ["tennis", "padel", "pickleball"] as const;
        const taskSport = validTaskSports.includes(preAnalysis.sport as typeof validTaskSports[number])
          ? (preAnalysis.sport as "tennis" | "padel" | "pickleball")
          : "all";

        if (user && accessToken && videoUrl) {
          try {
            analysisLogger.info("Creating technique task for Shark analysis, URL:", videoUrl);

            const response = await fetch("/api/tasks", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                taskType: "technique",
                sport: taskSport,
                videoUrl: videoUrl,
                thumbnailUrl: preAnalysis.thumbnailUrl || null,
                thumbnailS3Key: preAnalysis.thumbnailS3Key || null,
                videoLength: preAnalysis.durationSeconds || null,
              }),
            });

            if (response.ok) {
              const { task } = await response.json();
              analysisLogger.info("Technique task created:", task.id);
              createdTaskId = task.id;
              refreshLibraryTasks();
            } else {
              const errorData = await response.json().catch(() => ({}));
              analysisLogger.error("Failed to create technique task:", errorData);
            }
          } catch (err) {
            analysisLogger.error("Error creating technique task:", err);
          }
        } else if (videoUrl) {
          // Create guest task for technique analysis (stored in localStorage)
          try {
            analysisLogger.info("Creating guest technique task for URL:", videoUrl);
            const guestTask = createGuestTechniqueTask({
              videoUrl,
              sport: taskSport,
              thumbnailUrl: preAnalysis.thumbnailUrl,
              videoLength: preAnalysis.durationSeconds,
            });
            createdTaskId = guestTask.id;
            refreshLibraryTasks();
            analysisLogger.info("Guest technique task created:", guestTask.id);
          } catch (err) {
            analysisLogger.error("Error creating guest technique task:", err);
          }
        }

        if (videoUrl) {
          await startQuickAnalysis(messageId, preAnalysis.sport, videoUrl, userPrompt, {
            sharkContext: sharkResult,
            showTechniqueStudioPrompt: true,
            taskId: createdTaskId,
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
        const errorMessage = err instanceof Error ? err.message : "Unknown error";

        // Provide user-friendly message based on error type
        let userMessage: string;
        if (errorMessage.toLowerCase().includes("internal server error") ||
            errorMessage.toLowerCase().includes("no swing") ||
            errorMessage.toLowerCase().includes("not detected") ||
            errorMessage.toLowerCase().includes("could not find")) {
          userMessage = `I couldn't detect a **${swingLabel}** in this video. This might happen if:\n\n` +
            `- The video contains a different swing type (e.g., a serve instead of a ${swingType})\n` +
            `- The swing isn't clearly visible in the frame\n` +
            `- The video quality makes detection difficult\n\n` +
            `Please try selecting a different swing type or uploading a clearer video.`;
        } else {
          userMessage = `Sorry, I encountered an error analyzing your swing: ${errorMessage}. Please try again.`;
        }

        updateMessage(assistantMessageId, {
          content: userMessage,
          isStreaming: false,
        });
      }
    } finally {
      setLoading(false);
      setProgressStage("idle");
      abortControllerRef.current = null;
    }
  }, [messages, user, accessToken, addMessage, updateMessage, scrollToBottom, setLoading, setProgressStage, startQuickAnalysis, refreshLibraryTasks]);

  return {
    handleSelectProPlusQuick,
    handleSelectQuickOnly,
    handleSharkAnalysis,
    abortControllerRef,
  };
}
