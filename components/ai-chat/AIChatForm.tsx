"use client";

/**
 * AI Chat Form - Main chat interface component
 * 
 * Orchestrates the chat experience by composing specialized hooks and components.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useAIChat } from "@/hooks/useAIChat";
import { useAIApi } from "@/hooks/useAIApi";
import { useNavigationWarning } from "@/hooks/useNavigationWarning";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import { MessageList } from "@/components/chat/messages/MessageList";
import { ChatInput } from "@/components/chat/input/ChatInput";
import { ChatHeader } from "@/components/chat/header/ChatHeader";
import { ErrorToast } from "@/components/ui/Toast";
import { AudioPlayerProvider } from "@/components/AudioPlayerContext";
import { FloatingVideoProvider } from "@/components/chat/viewers/FloatingVideoContext";
import { FloatingVideoPortal } from "@/components/chat/viewers/FloatingVideoPortal";
import { Sidebar } from "@/components/sidebar";
import { useLibraryTasks } from "@/components/sidebar/LibraryTasksContext";
import { PICKLEBALL_COACH_PROMPT, type StarterPromptConfig } from "@/utils/prompts";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";
import { getCurrentChatId, setCurrentChatId, createNewChat } from "@/utils/storage-unified";
import { getMediaType } from "@/utils/video-utils";
import { FREE_TIER_MESSAGE_LIMIT } from "@/lib/limitations";
import type { CandidateOption } from "@/types/chat";

// Local imports
import { 
  useChatSettings, 
  useVideoPreAnalysis, 
  useImageInsight, 
  useAnalysisOptions,
  useChatTitle,
  useAutoScroll,
  useMessageRetry,
  useChatSubmission,
  useGreetingMessage,
} from "./hooks";
import { generateHelpQuestion } from "./utils";
import { ChatLayout, NavigationDialog } from "./components";
import type { ProgressStage } from "./types";

export function AIChatForm() {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Context & external hooks
  const { user } = useAuth();
  const { refresh: refreshLibraryTasks } = useLibraryTasks();
  const router = useRouter();

  // Local state
  const [prompt, setPrompt] = useState("");
  const [videoPlaybackSpeed, setVideoPlaybackSpeed] = useState<number>(1.0);
  const [poseData, setPoseData] = useState<StarterPromptConfig["poseSettings"] | undefined>(undefined);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Video upload hook
  const {
    videoFile,
    videoPreview,
    error: videoError,
    setError: setVideoError,
    processVideoFile,
    clearVideo,
    handleVideoChange,
    needsServerConversion,
  } = useVideoUpload();

  // AI Chat hook
  const {
    messages,
    loading,
    progressStage,
    uploadProgress,
    messagesEndRef,
    setLoading,
    setProgressStage,
    setUploadProgress,
    scrollToBottom,
    scrollMessageToTop,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    isHydrated,
    loadedMessageIds,
  } = useAIChat();

  // AI API hook
  const {
    error: apiError,
    setError: setApiError,
    sendTextOnlyQuery,
    sendVideoQuery,
  } = useAIApi({
    onProgressUpdate: (stage, progress) => {
      setProgressStage(stage as ProgressStage);
      setUploadProgress(progress);
    },
  });

  // Chat settings hook
  const {
    thinkingMode,
    mediaResolution,
    domainExpertise,
    setThinkingMode,
    setMediaResolution,
    setDomainExpertise,
    handleThinkingModeChange,
    handleMediaResolutionChange,
    handleDomainExpertiseChange,
  } = useChatSettings({ isHydrated });

  // Video pre-analysis hook
  const {
    videoPreAnalysis,
    setVideoPreAnalysis,
    videoSportDetected,
    detectedVideoUrl,
    setDetectedVideoUrl,
    resetAnalysis,
  } = useVideoPreAnalysis({
    videoFile,
    domainExpertise,
    setDomainExpertise,
  });

  // Auto-scroll hook
  const {
    setShouldAutoScroll,
    showingVideoSizeError,
    setShowingVideoSizeError,
  } = useAutoScroll({ messages, scrollToBottom });

  // Navigation warning hook
  const { confirmNavigation, dialogOpen, handleConfirm, handleCancel } = useNavigationWarning({
    isLoading: loading,
    progressStage,
  });

  // Drag and drop hook
  const { isDragging, hasJustDropped, handlers: dragHandlers } = useDragAndDrop({
    onFileDrop: (file) => processVideoFile(file),
    onError: (error) => setVideoError(error),
  });

  // Analysis options hook
  const {
    handleSelectProPlusQuick,
    handleSelectQuickOnly,
    abortControllerRef: analysisAbortRef,
  } = useAnalysisOptions({
    messages,
    thinkingMode,
    mediaResolution,
    user,
    addMessage,
    updateMessage,
    scrollToBottom,
    setLoading,
    setProgressStage: (stage) => setProgressStage(stage as ProgressStage),
    refreshLibraryTasks,
  });

  // Handler for opening Technique Studio
  const handleOpenTechniqueStudio = useCallback((videoUrl: string, taskId?: string) => {
    if (taskId) {
      // Navigate to the library page with the task
      router.push(`/library/${taskId}`);
    } else {
      // If no task ID, could open a modal or create a new task
      console.log("Opening Technique Studio for video:", videoUrl);
    }
  }, [router]);

  // Message retry hook
  const { retryingMessageId, handleRetryMessage, retryAbortRef } = useMessageRetry({
    messages,
    thinkingMode,
    mediaResolution,
    domainExpertise,
    loading,
    setLoading,
    setProgressStage: (stage) => setProgressStage(stage as ProgressStage),
    setApiError,
    updateMessage,
    sendTextOnlyQuery,
  });

  // Chat submission hook
  const { handleSubmit, submitAbortRef } = useChatSubmission({
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
    setProgressStage: (stage) => setProgressStage(stage as ProgressStage),
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
  });

  // Image insight hook
  useImageInsight({
    loading,
    setLoading,
    setProgressStage: (stage) => setProgressStage(stage as ProgressStage),
    addMessage,
    updateMessage,
    scrollToBottom,
    setApiError,
  });

  // Chat title hook
  useChatTitle({ messages, loading, isHydrated });

  // Greeting message hook - adds initial AI greeting when chat is empty
  useGreetingMessage({
    messages,
    isHydrated,
    loading,
    addMessage,
    updateMessage,
  });

  // Preload pose detection when video is added
  useEffect(() => {
    if (videoFile) {
      import("@/components/chat/viewers/VideoPoseViewer");
      import("@/components/chat/viewers/Pose3DViewer");
    }
  }, [videoFile]);

  // Auto-populate prompt when video is added
  useEffect(() => {
    if (videoFile && !prompt.trim()) {
      const mediaType = getMediaType(videoFile);
      setPrompt(`Please analyse this ${mediaType} for me.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoFile]);

  const error = videoError || apiError;

  // Check conversation limit
  const userMessageCount = messages.filter(m => m.role === "user").length;
  const hasReachedLimit = userMessageCount >= FREE_TIER_MESSAGE_LIMIT;

  // Handlers
  const handlePickleballCoachPrompt = useCallback(() => {
    setPrompt(PICKLEBALL_COACH_PROMPT);
  }, []);

  const handleClearConversation = useCallback(() => {
    clearMessages();
    setPrompt("");
    clearVideo();
    setVideoError(null);
    setApiError(null);
    setPoseData(undefined);
    setShowingVideoSizeError(false);
  }, [clearMessages, clearVideo, setVideoError, setApiError, setShowingVideoSizeError]);

  const handleStop = useCallback(() => {
    submitAbortRef.current?.abort();
    retryAbortRef.current?.abort();
    analysisAbortRef.current?.abort();
    setLoading(false);
    setProgressStage("idle");
    setUploadProgress(0);
    setShowingVideoSizeError(false);
  }, [setLoading, setProgressStage, setUploadProgress, setShowingVideoSizeError, submitAbortRef, retryAbortRef, analysisAbortRef]);

  const handleAskForHelp = useCallback((termName: string) => {
    const question = generateHelpQuestion(termName);
    setPrompt(question);
    
    setTimeout(() => {
      const fakeEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent;
      handleSubmit(fakeEvent, question);
    }, 100);
  }, [handleSubmit]);

  const handleNewChat = useCallback(async () => {
    const result = await Promise.resolve(confirmNavigation());
    if (!result) return;
    
    const newChat = await createNewChat();
    setCurrentChatId(newChat.id);
    setShowingVideoSizeError(false);
    setThinkingMode(newChat.thinkingMode ?? "fast");
    setMediaResolution(newChat.mediaResolution ?? "medium");
    setDomainExpertise(newChat.domainExpertise ?? "all-sports");
  }, [confirmNavigation, setShowingVideoSizeError, setThinkingMode, setMediaResolution, setDomainExpertise]);

  // Handle candidate response selection (e.g., greeting options)
  const handleSelectCandidateResponse = useCallback(async (messageId: string, index: number, option: CandidateOption) => {
    // Handle special actions (like sign-in) without updating message state
    if (option.action === "sign_in") {
      setAuthModalOpen(true);
      return;
    }

    // 1. Update the greeting message with the selected index
    updateMessage(messageId, {
      candidateResponses: {
        options: messages.find(m => m.id === messageId)?.candidateResponses?.options || [],
        selectedIndex: index,
      },
    });

    // 2. Check if this is a demo video option - trigger actual analysis
    // If S3 key is provided, fetch a fresh presigned URL first
    if (option.demoVideoUrl || option.demoVideoS3Key) {
      let videoUrl = option.demoVideoUrl;
      
      // Fetch presigned URL from S3 key if provided
      if (option.demoVideoS3Key) {
        try {
          const response = await fetch("/api/s3/download-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: option.demoVideoS3Key,
              expiresIn: 7 * 24 * 3600, // 7 days
            }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.downloadUrl) {
              videoUrl = data.downloadUrl;
            }
          }
        } catch {
          // Fall back to demoVideoUrl if refresh fails
        }
      }
      
      if (videoUrl) {
        // Pass prompt and video URL directly to handleSubmit (no state timing issues)
        const fakeEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent;
        handleSubmit(fakeEvent, option.text, videoUrl);
        return;
      }
    }

    // 3. Add the user's "message" (their selection) - only for non-demo options
    const userMessageId = crypto.randomUUID();
    addMessage({
      id: userMessageId,
      role: "user",
      content: option.text,
    });

    // 4. Auto-scroll to show the new messages
    scrollToBottom();

    // 5. Add the premade assistant response with typewriter effect
    const assistantMessageId = crypto.randomUUID();
    const fullResponse = option.premadeResponse || "";
    const hasFollowUp = option.followUpOptions && option.followUpOptions.length > 0;
    
    // Start with first character to avoid ThinkingIndicator
    addMessage({
      id: assistantMessageId,
      role: "assistant",
      content: fullResponse.charAt(0),
      isStreaming: true,
    });

    // Typewriter effect
    let charIndex = 1;
    const typingSpeed = 15; // ms per character
    
    const typeNextChar = () => {
      if (charIndex < fullResponse.length) {
        updateMessage(assistantMessageId, {
          content: fullResponse.substring(0, charIndex + 1),
          isStreaming: charIndex + 1 < fullResponse.length,
        });
        charIndex++;
        setTimeout(typeNextChar, typingSpeed);
      } else if (hasFollowUp) {
        // After typing completes, add follow-up options
        setTimeout(() => {
          const followUpMessageId = crypto.randomUUID();
          addMessage({
            id: followUpMessageId,
            role: "assistant",
            content: "",
            messageType: "candidate_responses",
            candidateResponses: {
              options: option.followUpOptions!,
              selectedIndex: undefined,
            },
          });
          // Scroll to show the follow-up options
          scrollToBottom();
        }, 300); // Small delay after typing completes
      }
    };
    
    setTimeout(typeNextChar, typingSpeed);
  }, [updateMessage, addMessage, messages, scrollToBottom, handleSubmit]);

  return (
    <AudioPlayerProvider>
      <FloatingVideoProvider scrollContainerRef={scrollContainerRef}>
        {/* Loading spinner during hydration */}
        <div className={`hydration-spinner ${isHydrated ? 'hidden' : ''}`}>
          <div className="spinner" />
        </div>
        
        <div className={`h-screen flex flex-col overflow-hidden hydration-guard ${isHydrated ? 'hydrated' : ''}`}>
          <ChatHeader messageCount={messages.length} onNewChat={handleNewChat} />
          
          <Sidebar 
            onClearChat={handleClearConversation}
            messageCount={messages.length}
            onChatSwitchAttempt={confirmNavigation}
          />

          <ChatLayout
            ref={containerRef}
            isDragging={isDragging}
            dragHandlers={dragHandlers}
            hasMessages={messages.length > 0}
            scrollContainerRef={scrollContainerRef}
            messagesEndRef={messagesEndRef}
            inputArea={
              hasReachedLimit ? null : (
                <ChatInput
                  prompt={prompt}
                  videoFile={videoFile}
                  videoPreview={videoPreview}
                  error={null}
                  loading={loading}
                  progressStage={progressStage}
                  thinkingMode={thinkingMode}
                  mediaResolution={mediaResolution}
                  domainExpertise={domainExpertise}
                  onPromptChange={setPrompt}
                  onVideoRemove={clearVideo}
                  onVideoChange={handleVideoChange}
                  onSubmit={handleSubmit}
                  onStop={handleStop}
                  onPickleballCoachClick={handlePickleballCoachPrompt}
                  onThinkingModeChange={handleThinkingModeChange}
                  onMediaResolutionChange={handleMediaResolutionChange}
                  onDomainExpertiseChange={handleDomainExpertiseChange}
                  disableTooltips={hasJustDropped}
                  hideDisclaimer={showingVideoSizeError}
                  videoSportDetected={videoSportDetected}
                  onVideoUrlDetected={setDetectedVideoUrl}
                  videoPreAnalysis={videoPreAnalysis}
                />
              )
            }
          >
            <MessageList
              messages={messages}
              loading={loading}
              progressStage={progressStage}
              uploadProgress={uploadProgress}
              messagesEndRef={messagesEndRef}
              scrollContainerRef={scrollContainerRef}
              onAskForHelp={handleAskForHelp}
              onUpdateMessage={updateMessage}
              onRetryMessage={handleRetryMessage}
              retryingMessageId={retryingMessageId}
              onSelectProPlusQuick={handleSelectProPlusQuick}
              onSelectQuickOnly={handleSelectQuickOnly}
              onOpenTechniqueStudio={handleOpenTechniqueStudio}
              onSelectCandidateResponse={handleSelectCandidateResponse}
              loadedMessageIds={loadedMessageIds}
              onStartNewChat={handleNewChat}
            />
          </ChatLayout>

          <ErrorToast error={error} />
          
          <NavigationDialog 
            open={dialogOpen} 
            onConfirm={handleConfirm} 
            onCancel={handleCancel} 
          />

          <AuthModal 
            open={authModalOpen} 
            onOpenChange={setAuthModalOpen} 
          />

          <FloatingVideoPortal />
        </div>
      </FloatingVideoProvider>
    </AudioPlayerProvider>
  );
}
