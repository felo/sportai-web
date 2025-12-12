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
import { MessageList } from "@/components/chat/messages/MessageList";
import { ChatInput } from "@/components/chat/input/ChatInput";
import { ChatHeader } from "@/components/chat/header/ChatHeader";
import { ErrorToast } from "@/components/ui/Toast";
import { AudioPlayerProvider } from "@/components/AudioPlayerContext";
import { FloatingVideoProvider } from "@/components/chat/viewers/FloatingVideoContext";
import { FloatingVideoPortal } from "@/components/chat/viewers/FloatingVideoPortal";
import { Sidebar } from "@/components/sidebar";
import { useLibraryTasks } from "@/components/sidebar/LibraryTasksContext";
import { StarterPrompts } from "@/components/StarterPrompts";
import { PICKLEBALL_COACH_PROMPT, type StarterPromptConfig } from "@/utils/prompts";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";
import { updateChatSettings } from "@/utils/storage";
import { getCurrentChatId, setCurrentChatId, createNewChat } from "@/utils/storage-unified";
import { getMediaType, downloadVideoFromUrl } from "@/utils/video-utils";
import { FREE_TIER_MESSAGE_LIMIT } from "@/lib/limitations";

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
} from "./hooks";
import { generateHelpQuestion } from "./utils";
import { ChatLayout, NavigationDialog } from "./components";
import type { StarterPromptSettings, ProgressStage } from "./types";

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

  const handleStarterPromptSelect = useCallback(async (
    promptText: string, 
    videoUrl: string,
    settings?: StarterPromptSettings
  ) => {
    try {
      setVideoError(null);
      
      if (settings) {
        const currentChatId = getCurrentChatId();
        const chatSettingsToUpdate: Partial<{
          thinkingMode: ThinkingMode;
          mediaResolution: MediaResolution;
          domainExpertise: DomainExpertise;
        }> = {};

        if (settings.thinkingMode) {
          setThinkingMode(settings.thinkingMode);
          chatSettingsToUpdate.thinkingMode = settings.thinkingMode;
        }
        if (settings.mediaResolution) {
          setMediaResolution(settings.mediaResolution);
          chatSettingsToUpdate.mediaResolution = settings.mediaResolution;
        }
        if (settings.domainExpertise) {
          setDomainExpertise(settings.domainExpertise);
          chatSettingsToUpdate.domainExpertise = settings.domainExpertise;
        }
        if (settings.playbackSpeed !== undefined) {
          setVideoPlaybackSpeed(settings.playbackSpeed);
        }
        setPoseData(settings.poseSettings);

        if (currentChatId && Object.keys(chatSettingsToUpdate).length > 0) {
          updateChatSettings(currentChatId, chatSettingsToUpdate);
        }
      }
      
      const file = await downloadVideoFromUrl(videoUrl);
      processVideoFile(file);
      setPrompt(promptText);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load demo video";
      setVideoError(errorMessage);
      setPrompt(promptText);
      throw err;
    }
  }, [processVideoFile, setVideoError, setThinkingMode, setMediaResolution, setDomainExpertise]);

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
            {messages.length === 0 && !loading ? (
              <StarterPrompts onPromptSelect={handleStarterPromptSelect} />
            ) : (
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
                loadedMessageIds={loadedMessageIds}
                onStartNewChat={handleNewChat}
              />
            )}
          </ChatLayout>

          <ErrorToast error={error} />
          
          <NavigationDialog 
            open={dialogOpen} 
            onConfirm={handleConfirm} 
            onCancel={handleCancel} 
          />

          <FloatingVideoPortal />
        </div>
      </FloatingVideoProvider>
    </AudioPlayerProvider>
  );
}
