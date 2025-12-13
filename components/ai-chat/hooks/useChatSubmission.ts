 "use client";

 /**
  * Hook for handling chat form submission
  */

 import { useCallback, useRef } from "react";
 import { chatLogger } from "@/lib/logger";
 import type { Message, VideoPreAnalysis } from "@/types/chat";
 import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";
 import { getCurrentChatId, loadChat } from "@/utils/storage-unified";
 import { uploadToS3 } from "@/lib/s3";
 import { generateMessageId, stripStreamMetadata, calculateUserMessageTokens } from "../utils";
 import type { ProgressStage } from "../types";
 import type { StarterPromptConfig } from "@/utils/prompts";

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
   videoPlaybackSpeed: number;
   poseData: StarterPromptConfig["poseSettings"] | undefined;
   needsServerConversion: boolean;
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
   // API
   sendTextOnlyQuery: (
     prompt: string,
     messageId: string,
     onUpdate: (id: string, updates: Partial<Message>) => void,
     history: Message[],
     abortController: AbortController,
     thinkingMode: ThinkingMode,
     mediaResolution: MediaResolution,
     domainExpertise: DomainExpertise
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
     needsServerConversion: boolean
   ) => Promise<void>;
 }

interface UseChatSubmissionReturn {
  handleSubmit: (e: React.FormEvent, overridePrompt?: string, overrideVideoUrl?: string) => Promise<void>;
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
   videoPlaybackSpeed,
   poseData,
   needsServerConversion,
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
   sendTextOnlyQuery,
   sendVideoQuery,
 }: UseChatSubmissionOptions): UseChatSubmissionReturn {
   const submitAbortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent, overridePrompt?: string, overrideVideoUrl?: string) => {
    e.preventDefault();
    
    const effectivePrompt = overridePrompt !== undefined ? overridePrompt : prompt;
    const effectiveVideoUrl = overrideVideoUrl !== undefined ? overrideVideoUrl : detectedVideoUrl;
    const hasValidInput = effectivePrompt.trim() || videoFile || effectiveVideoUrl;
    if (!hasValidInput || loading) return;

    const currentVideoUrl = effectiveVideoUrl;
     let currentPrompt = effectivePrompt.trim();
     if (!currentPrompt && (videoFile || currentVideoUrl)) {
       currentPrompt = "Please analyse this video for me.";
       setPrompt(currentPrompt);
     }
     
     const currentVideoFile = videoFile;
     const currentVideoPreview = videoPreview;
     const requestChatId = getCurrentChatId();
     
     if (!requestChatId) {
       chatLogger.error("No chat ID available!");
       return;
     }

     // Get conversation history
     const currentChat = await loadChat(requestChatId);
     const storageMessages = currentChat?.messages ?? [];
     const stateMessages = messages;
     
     let conversationHistory: Message[] = [];
     if (storageMessages.length > 0 && stateMessages.length === 0) {
       conversationHistory = [];
     } else if (stateMessages.length > storageMessages.length) {
       const storageIds = storageMessages.map(m => m.id).join(',');
       const statePrefix = stateMessages.slice(0, storageMessages.length).map(m => m.id).join(',');
       conversationHistory = (storageMessages.length === 0 || storageIds === statePrefix) 
         ? stateMessages 
         : storageMessages;
     } else if (storageMessages.length > 0) {
       conversationHistory = storageMessages;
     }

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
        thumbnailUrl: videoPreAnalysis?.thumbnailUrl,
        thumbnailS3Key: videoPreAnalysis?.thumbnailS3Key,
        videoPlaybackSpeed,
        inputTokens: videoTokens,
        poseData,
        isTechniqueLiteEligible: videoPreAnalysis?.isTechniqueLiteEligible ?? false,
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
        thumbnailUrl: videoPreAnalysis?.thumbnailUrl,
        thumbnailS3Key: videoPreAnalysis?.thumbnailS3Key,
        inputTokens: 0,
        isTechniqueLiteEligible: videoPreAnalysis?.isTechniqueLiteEligible ?? false,
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
         thumbnailUrl: currentVideoFile ? videoPreAnalysis?.thumbnailUrl : undefined,
         thumbnailS3Key: currentVideoFile ? videoPreAnalysis?.thumbnailS3Key : undefined,
         videoPlaybackSpeed: currentVideoFile ? videoPlaybackSpeed : undefined,
         inputTokens: calculateUserMessageTokens(currentPrompt, currentVideoFile),
         poseData: currentVideoFile ? poseData : undefined,
         isTechniqueLiteEligible: currentVideoFile ? (videoPreAnalysis?.isTechniqueLiteEligible ?? false) : undefined,
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
         if (videoPreAnalysis && (videoPreAnalysis.isProEligible || videoPreAnalysis.isTechniqueLiteEligible)) {
           updateMessage(assistantMessageId, {
             messageType: "analysis_options",
             content: "",
             analysisOptions: {
               preAnalysis: videoPreAnalysis,
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
         
         await handleVideoUrlAnalysis(
           currentPrompt, currentVideoUrl, assistantMessageId, 
           conversationHistory, abortController, requestChatId
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
           thinkingMode,
           mediaResolution,
           domainExpertise
         );
       } else {
         // Video file upload
         await handleVideoFileUpload(
           currentPrompt, currentVideoFile, assistantMessageId, videoMessageId,
           conversationHistory, abortController, requestChatId
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
     thinkingMode, mediaResolution, domainExpertise, videoPlaybackSpeed, poseData, needsServerConversion,
     addMessage, updateMessage, removeMessage, clearVideo, setVideoError, setApiError,
     setLoading, setProgressStage, setUploadProgress, setShowingVideoSizeError, setShouldAutoScroll,
     scrollMessageToTop, setDetectedVideoUrl, setVideoPreAnalysis, resetAnalysis, sendTextOnlyQuery, sendVideoQuery,
     setPrompt, setPoseData
   ]);

   // Helper: Handle video URL analysis
   const handleVideoUrlAnalysis = async (
     currentPrompt: string,
     currentVideoUrl: string,
     assistantMessageId: string,
     conversationHistory: Message[],
     abortController: AbortController,
     requestChatId: string
   ) => {
     setProgressStage("analyzing");
     
     const formData = new FormData();
     formData.append("prompt", currentPrompt);
     formData.append("videoUrl", currentVideoUrl);
     formData.append("thinkingMode", thinkingMode);
     formData.append("mediaResolution", mediaResolution);
     formData.append("domainExpertise", domainExpertise);
     
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
        updateMessage(assistantMessageId, { isStreaming: false });
        
        // Add Technique Studio prompt after analysis completes
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Check if this is the demo video - link to sample task in library
        const DEMO_VIDEO_URL = "https://res.cloudinary.com/djtxhrly7/video/upload/v1763677270/Serve.mp4";
        const isDemoVideo = currentVideoUrl === DEMO_VIDEO_URL;
        
        const studioPromptId = generateMessageId();
        const studioPromptMessage: Message = {
          id: studioPromptId,
          role: "assistant",
          content: "",
          messageType: "technique_studio_prompt",
          techniqueStudioPrompt: {
            videoUrl: currentVideoUrl,
            taskId: isDemoVideo ? "sample-tennis-serve" : undefined,
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
     requestChatId: string
   ) => {
     if (videoPreAnalysis && (videoPreAnalysis.isProEligible || videoPreAnalysis.isTechniqueLiteEligible)) {
       // PRO eligible - upload first then show options
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
         if (needsServerConversion) {
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
                 s3Url = convertResult.downloadUrl;
                 s3Key = convertResult.convertedKey;
               }
             }
           } catch (convertError) {
             if ((convertError as Error).name === "AbortError") throw convertError;
           }
           
           updateMessage(assistantMessageId, { content: "", isStreaming: true });
         }

         if (videoMessageId) {
           updateMessage(videoMessageId, { videoUrl: s3Url, videoS3Key: s3Key, videoPreview: null });
         }
       } catch (uploadError) {
         chatLogger.error("Failed to upload video:", uploadError);
       }
       
       if (s3Url) {
         updateMessage(assistantMessageId, {
           messageType: "analysis_options",
           content: "",
           analysisOptions: {
             preAnalysis: videoPreAnalysis,
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
       thinkingMode,
       mediaResolution,
       domainExpertise,
       needsServerConversion
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

