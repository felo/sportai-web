 "use client";

 /**
  * Hook for handling chat form submission
  */

 import { useCallback, useRef } from "react";
import { chatLogger } from "@/lib/logger";
import type { Message, VideoPreAnalysis } from "@/types/chat";
import { isRacketDomainSport } from "@/types/chat";
import type { ThinkingMode, MediaResolution, DomainExpertise, InsightLevel } from "@/utils/storage";
import { createGuestTechniqueTask } from "@/utils/storage";
import { getCurrentChatId, loadChat } from "@/utils/storage-unified";
import { uploadToS3 } from "@/lib/s3";
import { generateMessageId, stripStreamMetadata, calculateUserMessageTokens } from "../utils";
import type { ProgressStage } from "../types";
import type { StarterPromptConfig } from "@/utils/prompts";
import { getDemoVideoByUrl } from "@/components/tasks/sampleTasks";
import { parseAnalysisTags, stripAnalysisTags } from "@/utils/analysis-tags";

interface UseChatSubmissionOptions {
  // State
  prompt: string;
  videoFile: File | null;
  videoPreview: string | null;
  detectedVideoUrl: string | null;
  messages: Message[];
  videoPreAnalysis: VideoPreAnalysis | null;
  loading: boolean;
  // Settings
  thinkingMode: ThinkingMode;
  mediaResolution: MediaResolution;
  domainExpertise: DomainExpertise;
  insightLevel: InsightLevel;
  userFirstName?: string; // User's first name for personalization
  videoPlaybackSpeed: number;
  poseData: StarterPromptConfig["poseSettings"] | undefined;
  needsServerConversion: boolean;
  /** JWT access token for authenticated API calls (optional - unauthenticated users get lower rate limits) */
  accessToken?: string | null;
   // Setters
   setPrompt: (prompt: string) => void;
   setLoading: (loading: boolean) => void;
   setProgressStage: (stage: ProgressStage | string) => void;
   setUploadProgress: (progress: number) => void;
   setShowingVideoSizeError: (show: boolean) => void;
   setShouldAutoScroll: (scroll: boolean) => void;
   setDetectedVideoUrl: (url: string | null) => void;
   setVideoPreAnalysis: (analysis: VideoPreAnalysis | null) => void;
   setVideoError: (error: string | null) => void;
   setApiError: (error: string | null) => void;
   setPoseData: (data: StarterPromptConfig["poseSettings"] | undefined) => void;
   // Actions
   addMessage: (message: Message) => void;
   updateMessage: (id: string, updates: Partial<Message>) => void;
   removeMessage: (id: string) => void;
   clearVideo: (keepBlobUrl?: boolean) => void;
   resetAnalysis: () => void;
   scrollMessageToTop: (messageId: string) => void;
   refreshLibraryTasks: () => void;
  // API
  sendTextOnlyQuery: (
    prompt: string,
    messageId: string,
    onUpdate: (id: string, updates: Partial<Message>) => void,
    history: Message[],
    abortController: AbortController,
    thinkingMode: ThinkingMode,
    mediaResolution: MediaResolution,
    domainExpertise: DomainExpertise,
    insightLevel?: string,
    userFirstName?: string
  ) => Promise<void>;
  sendVideoQuery: (
    prompt: string,
    videoFile: File,
    messageId: string,
    onUpdate: (id: string, updates: Partial<Message>) => void,
    setUploadProgress: (progress: number) => void,
    setProgressStage: (stage: string) => void,
    history: Message[],
    onS3Upload: (url: string, key: string) => void,
    abortController: AbortController,
    thinkingMode: ThinkingMode,
    mediaResolution: MediaResolution,
    domainExpertise: DomainExpertise,
    needsServerConversion: boolean,
    insightLevel?: string,
    userFirstName?: string
  ) => Promise<void>;
}

/** Optional settings overrides for pending submissions from home page */
interface SettingsOverrides {
  thinkingMode?: ThinkingMode;
  mediaResolution?: MediaResolution;
  domainExpertise?: DomainExpertise;
  /** Whether the video needs server-side conversion (MOV, HEVC, etc.) */
  needsServerConversion?: boolean;
}

interface UseChatSubmissionReturn {
  handleSubmit: (e: React.FormEvent, overridePrompt?: string, overrideVideoUrl?: string, overrideVideoPreAnalysis?: VideoPreAnalysis | null, overrideVideoFile?: File, overrideSettings?: SettingsOverrides) => Promise<void>;
  submitAbortRef: React.MutableRefObject<AbortController | null>;
}

export function useChatSubmission({
  prompt,
  videoFile,
  videoPreview,
  detectedVideoUrl,
  messages,
  videoPreAnalysis,
  loading,
  thinkingMode,
  mediaResolution,
  domainExpertise,
  insightLevel,
  userFirstName,
  videoPlaybackSpeed,
  poseData,
  needsServerConversion,
  accessToken,
  setPrompt,
  setLoading,
   setProgressStage,
   setUploadProgress,
   setShowingVideoSizeError,
   setShouldAutoScroll,
   setDetectedVideoUrl,
   setVideoPreAnalysis,
   setVideoError,
   setApiError,
   setPoseData,
   addMessage,
   updateMessage,
   removeMessage,
   clearVideo,
   resetAnalysis,
   scrollMessageToTop,
   refreshLibraryTasks,
   sendTextOnlyQuery,
   sendVideoQuery,
 }: UseChatSubmissionOptions): UseChatSubmissionReturn {
   const submitAbortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent, overridePrompt?: string, overrideVideoUrl?: string, overrideVideoPreAnalysis?: VideoPreAnalysis | null, overrideVideoFile?: File, overrideSettings?: SettingsOverrides) => {
    e.preventDefault();

    const effectivePrompt = overridePrompt !== undefined ? overridePrompt : prompt;
    const effectiveVideoUrl = overrideVideoUrl !== undefined ? overrideVideoUrl : detectedVideoUrl;
    // Use override if provided (for pending submissions from home page)
    const effectiveVideoPreAnalysis = overrideVideoPreAnalysis !== undefined ? overrideVideoPreAnalysis : videoPreAnalysis;
    const effectiveVideoFile = overrideVideoFile !== undefined ? overrideVideoFile : videoFile;
    // Use settings overrides if provided (avoids stale closure issue with async state updates)
    const effectiveThinkingMode = overrideSettings?.thinkingMode ?? thinkingMode;
    const effectiveMediaResolution = overrideSettings?.mediaResolution ?? mediaResolution;
    const effectiveDomainExpertise = overrideSettings?.domainExpertise ?? domainExpertise;
    const effectiveNeedsServerConversion = overrideSettings?.needsServerConversion ?? needsServerConversion;
    const hasValidInput = effectivePrompt.trim() || effectiveVideoFile || effectiveVideoUrl;
    if (!hasValidInput || loading) return;

    const currentVideoUrl = effectiveVideoUrl;
     let currentPrompt = effectivePrompt.trim();
     if (!currentPrompt && (effectiveVideoFile || currentVideoUrl)) {
       currentPrompt = "Please analyse this video for me.";
       setPrompt(currentPrompt);
     }

     const currentVideoFile = effectiveVideoFile;
     const currentVideoPreview = videoPreview;
     const requestChatId = getCurrentChatId();

     if (!requestChatId) {
       chatLogger.error("No chat ID available!");
       return;
     }

     // Get conversation history from storage (source of truth for current chat)
     // IMPORTANT: Always use storage messages, NOT React state messages!
     // React state can contain stale messages from previous chats during rapid switching.
     const currentChat = await loadChat(requestChatId);
     const storageMessages = currentChat?.messages ?? [];

     // Use storage messages as the conversation history
     // This prevents context from previous chats leaking into new chats
     const conversationHistory: Message[] = storageMessages;

     setLoading(true);
     setUploadProgress(0);

     if (currentVideoFile) {
       setProgressStage("uploading");
     } else if (currentVideoUrl) {
       setProgressStage("processing");
     } else {
       setProgressStage("processing");
     }

     let videoMessageId: string | null = null;
     let lastUserMessageId: string | null = null;

    // Create user messages
    if ((currentVideoFile || currentVideoUrl) && currentPrompt.trim()) {
      // Text message first (user's request)
      const textMessageId = generateMessageId();
      const textMessage: Message = {
        id: textMessageId,
        role: "user",
        content: currentPrompt,
        inputTokens: calculateUserMessageTokens(currentPrompt, null),
      };
      addMessage(textMessage);

      // Video message below
      videoMessageId = generateMessageId();
      lastUserMessageId = videoMessageId;
      const videoTokens = calculateUserMessageTokens("", currentVideoFile);
      const videoMessage: Message = {
        id: videoMessageId,
        role: "user",
        content: "",
        videoFile: currentVideoFile || null,
        videoPreview: currentVideoPreview,
        videoUrl: currentVideoUrl || undefined,
        thumbnailUrl: effectiveVideoPreAnalysis?.thumbnailUrl,
        thumbnailS3Key: effectiveVideoPreAnalysis?.thumbnailS3Key,
        videoPlaybackSpeed,
        inputTokens: videoTokens,
        poseData,
        isTechniqueLiteEligible: effectiveVideoPreAnalysis?.isTechniqueLiteEligible ?? false,
      };
      addMessage(videoMessage);
    } else if (currentVideoUrl && !currentVideoFile) {
      // Text message first
      const textMessageId = generateMessageId();
      const textMessage: Message = {
        id: textMessageId,
        role: "user",
        content: currentPrompt,
        inputTokens: calculateUserMessageTokens(currentPrompt, null),
      };
      addMessage(textMessage);

      // Video message below (empty content, just the video)
      videoMessageId = generateMessageId();
      lastUserMessageId = videoMessageId;
      const videoMessage: Message = {
        id: videoMessageId,
        role: "user",
        content: "",
        videoUrl: currentVideoUrl,
        thumbnailUrl: effectiveVideoPreAnalysis?.thumbnailUrl,
        thumbnailS3Key: effectiveVideoPreAnalysis?.thumbnailS3Key,
        inputTokens: 0,
        isTechniqueLiteEligible: effectiveVideoPreAnalysis?.isTechniqueLiteEligible ?? false,
      };
      addMessage(videoMessage);
    } else {
       const userMessageId = generateMessageId();
       lastUserMessageId = userMessageId;
       if (currentVideoFile) videoMessageId = userMessageId;
       const userMessage: Message = {
         id: userMessageId,
         role: "user",
         content: currentPrompt,
         videoFile: currentVideoFile,
         videoPreview: currentVideoPreview,
         thumbnailUrl: currentVideoFile ? effectiveVideoPreAnalysis?.thumbnailUrl : undefined,
         thumbnailS3Key: currentVideoFile ? effectiveVideoPreAnalysis?.thumbnailS3Key : undefined,
         videoPlaybackSpeed: currentVideoFile ? videoPlaybackSpeed : undefined,
         inputTokens: calculateUserMessageTokens(currentPrompt, currentVideoFile),
         poseData: currentVideoFile ? poseData : undefined,
         isTechniqueLiteEligible: currentVideoFile ? (effectiveVideoPreAnalysis?.isTechniqueLiteEligible ?? false) : undefined,
       };
       addMessage(userMessage);
     }

     // Clear input
     setPrompt("");
     clearVideo(true);
     setDetectedVideoUrl(null);
     setVideoPreAnalysis(null);
     resetAnalysis();
     setVideoError(null);
     setApiError(null);
     setPoseData(undefined);

     const abortController = new AbortController();
     submitAbortRef.current = abortController;

     // Add assistant placeholder
     const assistantMessageId = generateMessageId();
     addMessage({ id: assistantMessageId, role: "assistant", content: "" });

     // Scroll handling
     const willShowSizeLimitError = !!(currentVideoFile &&
       currentVideoFile.type.startsWith("video/") &&
       (currentVideoFile.size / (1024 * 1024)) > 100);

     setShowingVideoSizeError(willShowSizeLimitError);

     requestAnimationFrame(() => {
       if (!willShowSizeLimitError && lastUserMessageId) {
         scrollMessageToTop(lastUserMessageId);
       }
       setShouldAutoScroll(false);
     });

     try {
       const currentChatId = getCurrentChatId();
       if (currentChatId !== requestChatId) {
         removeMessage(assistantMessageId);
         return;
       }

       if (currentVideoUrl && !currentVideoFile) {
         // Video URL analysis
         // Show analysis options only when user needs to make a choice:
         // - Tactical (isProEligible): Free vs PRO
         // - Technique + racket sport: swing type selection
         // Non-racket technique videos skip straight to LLM analysis (auto-PRO).
         const needsAnalysisChoice = effectiveVideoPreAnalysis && (
           effectiveVideoPreAnalysis.isProEligible ||
           (effectiveVideoPreAnalysis.isTechniqueLiteEligible && isRacketDomainSport(effectiveVideoPreAnalysis.sport))
         );
         if (needsAnalysisChoice) {
           updateMessage(assistantMessageId, {
             messageType: "analysis_options",
             content: "",
             analysisOptions: {
               preAnalysis: effectiveVideoPreAnalysis,
               selectedOption: null,
               videoUrl: currentVideoUrl,
               userPrompt: currentPrompt,
             },
             isStreaming: false,
           });
           setLoading(false);
           setProgressStage("idle");
           return;
         }

         // Auto-create Studio task for technique-eligible videos that skip the options card
         let autoTaskId: string | undefined;
         if (effectiveVideoPreAnalysis?.isTechniqueLiteEligible) {
           autoTaskId = await createStudioTask(effectiveVideoPreAnalysis, currentVideoUrl);
         }

         await handleVideoUrlAnalysis(
           currentPrompt, currentVideoUrl, assistantMessageId,
           conversationHistory, abortController, requestChatId,
           { thinkingMode: effectiveThinkingMode, mediaResolution: effectiveMediaResolution, domainExpertise: effectiveDomainExpertise },
           autoTaskId
         );
      } else if (!currentVideoFile) {
        // Text-only
        await sendTextOnlyQuery(
          currentPrompt,
          assistantMessageId,
          (id, updates) => {
            const chatId = getCurrentChatId();
            if (chatId === requestChatId) updateMessage(id, updates);
          },
          conversationHistory,
          abortController,
          effectiveThinkingMode,
          effectiveMediaResolution,
          effectiveDomainExpertise,
          insightLevel,
          userFirstName
        );
      } else {
         // Video file upload
         await handleVideoFileUpload(
           currentPrompt, currentVideoFile, assistantMessageId, videoMessageId,
           conversationHistory, abortController, requestChatId, effectiveVideoPreAnalysis,
           { thinkingMode: effectiveThinkingMode, mediaResolution: effectiveMediaResolution, domainExpertise: effectiveDomainExpertise },
           effectiveNeedsServerConversion
         );
       }
     } catch (err) {
       handleSubmissionError(err, assistantMessageId, videoMessageId, currentVideoPreview, requestChatId);
     } finally {
       const currentChatId = getCurrentChatId();
       if (currentChatId === requestChatId) {
         setLoading(false);
         setProgressStage("idle");
         setUploadProgress(0);
       }
       submitAbortRef.current = null;
     }
   }, [
     prompt, videoFile, videoPreview, detectedVideoUrl, loading, messages, videoPreAnalysis,
     thinkingMode, mediaResolution, domainExpertise, insightLevel, videoPlaybackSpeed, poseData, needsServerConversion,
     addMessage, updateMessage, removeMessage, clearVideo, setVideoError, setApiError,
     setLoading, setProgressStage, setUploadProgress, setShowingVideoSizeError, setShouldAutoScroll,
     scrollMessageToTop, setDetectedVideoUrl, setVideoPreAnalysis, resetAnalysis, sendTextOnlyQuery, sendVideoQuery,
     setPrompt, setPoseData, refreshLibraryTasks
   ]);

   /**
    * Auto-create a Studio task for technique-eligible videos that skip the options card.
    * Mirrors the task creation logic in useAnalysisOptions.handleSelectProPlusQuick.
    * Returns the created task ID (or undefined on failure).
    */
   const createStudioTask = async (
     preAnalysis: VideoPreAnalysis,
     videoUrl: string,
   ): Promise<string | undefined> => {
     const taskSport = isRacketDomainSport(preAnalysis.sport) ? preAnalysis.sport : "all";

     if (accessToken) {
       try {
         chatLogger.info("Auto-creating technique task for URL:", videoUrl);
         const response = await fetch("/api/tasks", {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
             Authorization: `Bearer ${accessToken}`,
           },
           body: JSON.stringify({
             taskType: "technique",
             sport: taskSport,
             videoUrl,
             thumbnailUrl: preAnalysis.thumbnailUrl || null,
             thumbnailS3Key: preAnalysis.thumbnailS3Key || null,
             videoLength: preAnalysis.durationSeconds || null,
           }),
         });

         if (response.ok) {
           const { task } = await response.json();
           chatLogger.info("Technique task auto-created:", task.id);
           refreshLibraryTasks();
           return task.id;
         } else {
           chatLogger.error("Failed to auto-create technique task");
         }
       } catch (err) {
         chatLogger.error("Error auto-creating technique task:", err);
       }
     } else {
       try {
         const guestTask = createGuestTechniqueTask({
           videoUrl,
           sport: taskSport,
           thumbnailUrl: preAnalysis.thumbnailUrl,
           videoLength: preAnalysis.durationSeconds,
         });
         chatLogger.info("Guest technique task auto-created:", guestTask.id);
         refreshLibraryTasks();
         return guestTask.id;
       } catch (err) {
         chatLogger.error("Error auto-creating guest technique task:", err);
       }
     }
     return undefined;
   };

   // Helper: Handle video URL analysis
   const handleVideoUrlAnalysis = async (
     currentPrompt: string,
     currentVideoUrl: string,
     assistantMessageId: string,
     conversationHistory: Message[],
     abortController: AbortController,
     requestChatId: string,
     effectiveSettings: { thinkingMode: ThinkingMode; mediaResolution: MediaResolution; domainExpertise: DomainExpertise },
     /** Task ID created earlier (for the Studio button). Falls back to demo config lookup. */
     createdTaskId?: string
   ) => {
    setProgressStage("analyzing");

    const formData = new FormData();
    formData.append("prompt", currentPrompt);
    formData.append("videoUrl", currentVideoUrl);
    formData.append("thinkingMode", effectiveSettings.thinkingMode);
    formData.append("mediaResolution", effectiveSettings.mediaResolution);
    formData.append("domainExpertise", effectiveSettings.domainExpertise);
    formData.append("insightLevel", insightLevel);
    if (userFirstName) formData.append("userFirstName", userFirstName);

    if (conversationHistory.length > 0) {
       const { getConversationContext } = await import("@/utils/context-utils");
       const context = getConversationContext(conversationHistory);
       if (context.length > 0) formData.append("history", JSON.stringify(context));
     }

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

     if (!response.ok) throw new Error(await response.text() || "Failed to analyze video");

     const reader = response.body?.getReader();
     const decoder = new TextDecoder();
     let accumulatedText = "";

     if (reader) {
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
        // Parse analysis tags from the final content and strip them for display
        const finalContent = stripStreamMetadata(accumulatedText);
        const analysisTags = parseAnalysisTags(finalContent);
        const displayContent = analysisTags ? stripAnalysisTags(finalContent) : finalContent;
        
        updateMessage(assistantMessageId, { 
          content: displayContent,
          isStreaming: false,
          ...(analysisTags && { analysisTags }),
        });

        // Add Studio prompt after analysis completes
        await new Promise(resolve => setTimeout(resolve, 300));

        // Use the task ID created earlier, falling back to demo video config
        const demoConfig = getDemoVideoByUrl(currentVideoUrl);
        const studioTaskId = createdTaskId || demoConfig?.sampleTaskId;

        const studioPromptId = generateMessageId();
        const studioPromptMessage: Message = {
          id: studioPromptId,
          role: "assistant",
          content: "",
          messageType: "technique_studio_prompt",
          techniqueStudioPrompt: {
            videoUrl: currentVideoUrl,
            taskId: studioTaskId,
            analysisType: demoConfig?.analysisType,
          },
        };
        addMessage(studioPromptMessage);
      }
    }
  };

  // Helper: Handle video file upload
   const handleVideoFileUpload = async (
     currentPrompt: string,
     currentVideoFile: File,
     assistantMessageId: string,
     videoMessageId: string | null,
     conversationHistory: Message[],
     abortController: AbortController,
     requestChatId: string,
     effectiveVideoPreAnalysis: VideoPreAnalysis | null,
     effectiveSettings: { thinkingMode: ThinkingMode; mediaResolution: MediaResolution; domainExpertise: DomainExpertise },
     effectiveNeedsServerConversion: boolean
   ) => {
     // Determine whether the user needs to make a choice or we auto-proceed.
     // - Tactical (isProEligible) or racket technique → show options card
     // - Non-racket technique → auto-proceed (upload to S3, create Studio task, LLM analysis)
     const needsAnalysisChoice = effectiveVideoPreAnalysis && (
       effectiveVideoPreAnalysis.isProEligible ||
       (effectiveVideoPreAnalysis.isTechniqueLiteEligible && isRacketDomainSport(effectiveVideoPreAnalysis.sport))
     );
     const isAutoProTechnique = effectiveVideoPreAnalysis &&
       effectiveVideoPreAnalysis.isTechniqueLiteEligible &&
       !effectiveVideoPreAnalysis.isProEligible &&
       !isRacketDomainSport(effectiveVideoPreAnalysis.sport);

     // Both paths need S3 upload first
     if (needsAnalysisChoice || isAutoProTechnique) {
       setProgressStage("uploading");
       setUploadProgress(0);

       let s3Url: string | undefined;

       try {
         const urlResponse = await fetch("/api/s3/upload-url", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ fileName: currentVideoFile.name, contentType: currentVideoFile.type }),
         });

         if (!urlResponse.ok) throw new Error("Failed to get upload URL");

         const { url: presignedUrl, downloadUrl, publicUrl, key: originalS3Key } = await urlResponse.json();
         s3Url = downloadUrl || publicUrl;
         let s3Key = originalS3Key;

         await uploadToS3(
           presignedUrl,
           currentVideoFile,
           (progress) => setUploadProgress(progress * 100),
           abortController.signal
         );

        // Convert if needed
        console.log('[VIDEO_CONVERSION] Checking if conversion needed:', {
          needsServerConversion: effectiveNeedsServerConversion,
          s3Key,
          fileName: currentVideoFile.name,
          fileType: currentVideoFile.type,
        });
        
        if (effectiveNeedsServerConversion) {
           console.log('[VIDEO_CONVERSION] Starting server-side conversion...');
           setProgressStage("processing");
           updateMessage(assistantMessageId, { content: "Converting video format for analysis...", isStreaming: true });

           try {
             const convertResponse = await fetch("/api/convert-video", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ key: s3Key }),
               signal: abortController.signal,
             });

             if (convertResponse.ok) {
               const convertResult = await convertResponse.json();
               if (convertResult.success && convertResult.downloadUrl) {
                 console.log('[VIDEO_CONVERSION] Conversion successful!', {
                   originalKey: s3Key,
                   convertedKey: convertResult.convertedKey,
                 });
                 s3Url = convertResult.downloadUrl;
                 s3Key = convertResult.convertedKey;
               } else {
                 console.log('[VIDEO_CONVERSION] Conversion response not successful:', convertResult);
               }
             } else {
               console.log('[VIDEO_CONVERSION] Conversion failed with status:', convertResponse.status);
             }
           } catch (convertError) {
             if ((convertError as Error).name === "AbortError") throw convertError;
             console.log('[VIDEO_CONVERSION] Conversion error:', convertError);
           }

           updateMessage(assistantMessageId, { content: "", isStreaming: true });
         } else {
           console.log('[VIDEO_CONVERSION] Skipping conversion - not needed');
         }

        if (videoMessageId) {
          updateMessage(videoMessageId, { videoUrl: s3Url, videoS3Key: s3Key, videoPreview: null });
        }
      } catch (uploadError) {
        chatLogger.error("Failed to upload video:", uploadError);
      }

      if (s3Url) {
        if (needsAnalysisChoice) {
          // Show options card (Free/PRO or swing selection)
          updateMessage(assistantMessageId, {
            messageType: "analysis_options",
            content: "",
            analysisOptions: {
              preAnalysis: effectiveVideoPreAnalysis,
              selectedOption: null,
              videoUrl: s3Url,
              userPrompt: currentPrompt,
            },
            isStreaming: false,
          });
          setLoading(false);
          setProgressStage("idle");
          setUploadProgress(0);
          return;
        }

        // Auto-proceed for non-racket technique: create Studio task + LLM analysis
        const autoTaskId = await createStudioTask(effectiveVideoPreAnalysis!, s3Url);
        setUploadProgress(0);
        await handleVideoUrlAnalysis(
          currentPrompt, s3Url, assistantMessageId,
          conversationHistory, abortController, requestChatId, effectiveSettings,
          autoTaskId
        );
        return;
      }
    }

    // Standard video upload
    await sendVideoQuery(
      currentPrompt,
      currentVideoFile,
      assistantMessageId,
      (id, updates) => {
        const chatId = getCurrentChatId();
        if (chatId === requestChatId) updateMessage(id, updates);
      },
      setUploadProgress,
      setProgressStage,
      conversationHistory,
      (s3Url, s3Key) => {
        const chatId = getCurrentChatId();
        if (chatId === requestChatId && videoMessageId) {
          updateMessage(videoMessageId, { videoUrl: s3Url, videoS3Key: s3Key, videoPreview: null });
        }
      },
      abortController,
      effectiveSettings.thinkingMode,
      effectiveSettings.mediaResolution,
      effectiveSettings.domainExpertise,
      needsServerConversion,
      insightLevel,
      userFirstName
    );
  };

   // Helper: Handle submission error
   const handleSubmissionError = (
     err: unknown,
     assistantMessageId: string,
     videoMessageId: string | null,
     currentVideoPreview: string | null,
     requestChatId: string
   ) => {
     const currentChatId = getCurrentChatId();
     if (currentChatId === requestChatId) {
       if (err instanceof Error && err.name === "AbortError") {
         const currentContent = messages.find(m => m.id === assistantMessageId)?.content || "";
         if (currentContent.trim()) {
           updateMessage(assistantMessageId, { content: currentContent + "\n\n[Stopped by user]" });
         } else {
           removeMessage(assistantMessageId);
         }
       } else {
         setApiError(err instanceof Error ? err.message : "An error occurred");
         removeMessage(assistantMessageId);
         if (videoMessageId && currentVideoPreview) {
           URL.revokeObjectURL(currentVideoPreview);
           removeMessage(videoMessageId);
         }
         clearVideo();
       }
     }
   };

   return {
     handleSubmit,
     submitAbortRef,
   };
 }
