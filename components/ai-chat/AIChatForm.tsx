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
import { usePendingChat } from "@/components/PendingChatContext";
import { MessageList } from "@/components/chat/messages/MessageList";
import { ChatInput } from "@/components/chat/input/ChatInput";
import { FileSizeLimitModal } from "@/components/chat/input/FileSizeLimitModal";
import { PageHeader } from "@/components/ui";
import { ErrorToast } from "@/components/ui/Toast";
import { AudioPlayerProvider } from "@/components/AudioPlayerContext";
import { FloatingVideoProvider } from "@/components/chat/viewers/FloatingVideoContext";
import { FloatingVideoPortal } from "@/components/chat/viewers/FloatingVideoPortal";
import { useSidebar } from "@/components/SidebarContext";
import { Sidebar } from "@/components/sidebar";
import { useLibraryTasks } from "@/components/sidebar/LibraryTasksContext";
import { PICKLEBALL_COACH_PROMPT, type StarterPromptConfig } from "@/utils/prompts";
import type { ThinkingMode, MediaResolution, DomainExpertise, InsightLevel } from "@/utils/storage";
import { getInsightLevel, setInsightLevel as saveInsightLevel, setInsightOnboardingCompleted } from "@/utils/storage";
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
import { generateHelpQuestion, generateMessageId } from "./utils";
import { ChatLayout, NavigationDialog } from "./components";
import type { ProgressStage } from "./types";

export function AIChatForm() {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Context & external hooks
  const { user, session, profile } = useAuth();
  const { pendingSubmission, clearPendingSubmission } = usePendingChat();

  // Extract first name from profile for personalization
  const userFirstName = profile?.full_name?.split(" ")[0];
  const { refresh: refreshLibraryTasks } = useLibraryTasks();
  const { closeSidebar } = useSidebar();
  const router = useRouter();

  // Track if we've processed a pending submission to prevent re-processing
  const pendingProcessedRef = useRef(false);

  // Local state
  const [prompt, setPrompt] = useState("");
  const [videoPlaybackSpeed, setVideoPlaybackSpeed] = useState<number>(1.0);
  const [poseData, setPoseData] = useState<StarterPromptConfig["poseSettings"] | undefined>(undefined);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [insightLevel, setInsightLevel] = useState<InsightLevel>("developing");

  // Load and listen for insight level changes
  useEffect(() => {
    setInsightLevel(getInsightLevel());

    const handleInsightLevelChange = () => {
      setInsightLevel(getInsightLevel());
    };

    window.addEventListener("insight-level-change", handleInsightLevelChange);
    return () => {
      window.removeEventListener("insight-level-change", handleInsightLevelChange);
    };
  }, []);

  // Video upload hook
  const {
    videoFile,
    videoPreview,
    error: videoError,
    setError: setVideoError,
    processVideoFile,
    clearVideo,
    needsServerConversion,
    showFileSizeLimitModal,
    setShowFileSizeLimitModal,
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
    urlFileSizeTooLarge,
    setUrlFileSizeTooLarge,
    skipNextAnalysis,
  } = useVideoPreAnalysis({
    videoFile,
    domainExpertise,
    setDomainExpertise,
  });

  // Clear prompt when URL file size limit is hit
  useEffect(() => {
    if (urlFileSizeTooLarge) {
      setPrompt("");
    }
  }, [urlFileSizeTooLarge]);

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

  /**
   * Handles video upload with automatic new chat creation.
   * Creates a new chat if we're in an existing chat (has currentChatId) or have any messages,
   * to ensure fresh context for the new video.
   */
  const handleVideoUploadWithNewChat = useCallback(async (file: File, source: 'file_picker' | 'drag_drop' = 'file_picker') => {
    // Check if we need a new chat:
    // - We have an existing video attachment
    // - We have any messages (user or assistant)
    // - We're in an existing chat (currentChatId is set)
    const hasExistingVideo = !!videoFile;
    const hasAnyMessages = messages.length > 0;
    const currentChatId = getCurrentChatId();

    if (hasExistingVideo || hasAnyMessages || currentChatId) {
      // Create new chat for fresh context
      const newChat = await createNewChat();
      setCurrentChatId(newChat.id);
      setShowingVideoSizeError(false);
      setThinkingMode(newChat.thinkingMode ?? "fast");
      setMediaResolution(newChat.mediaResolution ?? "medium");
      setDomainExpertise(newChat.domainExpertise ?? "all-sports");
    }

    // Process the video in the (possibly new) chat
    processVideoFile(file, source);
  }, [videoFile, messages, processVideoFile, setShowingVideoSizeError, setThinkingMode, setMediaResolution, setDomainExpertise]);

  /**
   * Wraps handleVideoChange to create a new chat if needed before processing the video.
   */
  const handleVideoChangeWithNewChat = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleVideoUploadWithNewChat(file, 'file_picker');
    }
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  }, [handleVideoUploadWithNewChat]);

  // Drag and drop hook
  const { isDragging, hasJustDropped, handlers: dragHandlers } = useDragAndDrop({
    onFileDrop: (file, source) => handleVideoUploadWithNewChat(file, source),
    onError: (error) => setVideoError(error),
  });

  // Analysis options hook
  const {
    handleSelectProPlusQuick,
    handleSelectQuickOnly,
    handleSharkAnalysis,
    abortControllerRef: analysisAbortRef,
  } = useAnalysisOptions({
    messages,
    thinkingMode,
    mediaResolution,
    user,
    accessToken: session?.access_token ?? null,
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
    insightLevel,
    userFirstName,
    videoPlaybackSpeed,
    poseData,
    needsServerConversion,
    accessToken: session?.access_token,
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

  // Handle pending submission from home page
  // This processes submissions that were started on the home page and need to be completed here
  useEffect(() => {
    // Only process once, when hydrated, and if there's a pending submission
    if (!isHydrated || !pendingSubmission || pendingProcessedRef.current || loading) {
      return;
    }

    // Mark as processed immediately to prevent re-processing
    pendingProcessedRef.current = true;

    const processPendingSubmission = async () => {
      // Create a new chat for this submission
      const newChat = await createNewChat();

      // CRITICAL: Set loading BEFORE setCurrentChatId to prevent race condition
      // setCurrentChatId dispatches 'chat-storage-change' which triggers handleChatChange
      // handleChatChange checks loadingRef to decide whether to clear messages
      // If loading isn't set, handleChatChange will clear messages for the "empty" new chat
      // before handleSubmit has a chance to add messages
      setLoading(true);
      setCurrentChatId(newChat.id);

      // Apply settings from pending submission if provided
      // These need to be set before handleSubmit since it uses them from closure
      if (pendingSubmission.settings) {
        setThinkingMode(pendingSubmission.settings.thinkingMode);
        setMediaResolution(pendingSubmission.settings.mediaResolution);
        setDomainExpertise(pendingSubmission.settings.domainExpertise);
      }

      // Set the pre-analysis data and skip next analysis
      // This prevents re-analyzing video that was already analyzed on home page
      if (pendingSubmission.videoPreAnalysis) {
        setVideoPreAnalysis(pendingSubmission.videoPreAnalysis);
        skipNextAnalysis();
      }

      // NOTE: We intentionally do NOT call processVideoFile here.
      // The video file is passed directly to handleSubmit via override parameter.
      // Calling processVideoFile would cause a race condition where it completes
      // AFTER handleSubmit clears the state, triggering the auto-populate effect
      // and re-setting the prompt/video that should have been cleared.

      // Capture all pending data before clearing
      const submissionPrompt = pendingSubmission.prompt;
      const submissionVideoUrl = pendingSubmission.detectedVideoUrl;
      const submissionVideoPreAnalysis = pendingSubmission.videoPreAnalysis;
      const submissionVideoFile = pendingSubmission.videoFile;
      // Merge settings with needsServerConversion flag
      const submissionSettings = {
        ...pendingSubmission.settings,
        needsServerConversion: pendingSubmission.needsServerConversion,
      };
      
      console.log('[VIDEO_CONVERSION] Processing pending submission:', {
        hasVideoFile: !!submissionVideoFile,
        fileName: submissionVideoFile?.name,
        needsServerConversion: pendingSubmission.needsServerConversion,
      });
      
      clearPendingSubmission();

      // Trigger the submission directly - all data is passed via override parameters
      // This avoids stale closure issues with async state updates (React best practice)
      const fakeEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent;
      handleSubmit(
        fakeEvent,
        submissionPrompt,
        submissionVideoUrl || undefined,
        submissionVideoPreAnalysis || undefined,
        submissionVideoFile,
        submissionSettings // Pass settings override to avoid stale closure
      );
    };

    processPendingSubmission();
  }, [isHydrated, pendingSubmission, loading, clearPendingSubmission, setLoading, setThinkingMode, setMediaResolution, setDomainExpertise, setVideoPreAnalysis, skipNextAnalysis, handleSubmit]);

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
    // Submit directly with question as override - no need to wait for state
    const fakeEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent;
    handleSubmit(fakeEvent, question);
  }, [handleSubmit]);

  // Handle follow-up suggestion selection (after video analysis)
  const handleSelectFollowUp = useCallback((question: string) => {
    // Submit directly with question as override - no need to wait for state
    const fakeEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent;
    handleSubmit(fakeEvent, question);
  }, [handleSubmit]);

  const handleNewChat = useCallback(async () => {
    const result = await Promise.resolve(confirmNavigation());
    if (!result) return;

    // Clear current chat - new chat will be created when user submits first message
    setCurrentChatId(undefined);
    setShowingVideoSizeError(false);

    closeSidebar();
    // Navigate to home page for new chat
    router.push("/");
  }, [confirmNavigation, setShowingVideoSizeError, closeSidebar, router]);

  // Handle candidate response selection (e.g., greeting options)
  const handleSelectCandidateResponse = useCallback(async (messageId: string, index: number, option: CandidateOption) => {
    // Handle special actions (like sign-in) without updating message state
    if (option.action === "sign_in") {
      setAuthModalOpen(true);
      return;
    }

    // Handle insight level actions (onboarding flow)
    if (option.action?.startsWith("set_insight_")) {
      const level = option.action.replace("set_insight_", "") as InsightLevel;
      saveInsightLevel(level);
      setInsightOnboardingCompleted();
      // Continue with showing the response and follow-up options below
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
    const userMessageId = generateMessageId();
    addMessage({
      id: userMessageId,
      role: "user",
      content: option.text,
    });

    // 4. Auto-scroll to show the new messages
    scrollToBottom();

    // 5. Add the premade assistant response with typewriter effect
    const assistantMessageId = generateMessageId();
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
          const followUpMessageId = generateMessageId();
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
          <PageHeader onNewChat={handleNewChat} />

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
                  onVideoChange={handleVideoChangeWithNewChat}
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
              onSwingAnalyze={handleSharkAnalysis}
              onOpenTechniqueStudio={handleOpenTechniqueStudio}
              onSelectCandidateResponse={handleSelectCandidateResponse}
              onSelectFollowUp={handleSelectFollowUp}
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

          <FileSizeLimitModal
            open={showFileSizeLimitModal || urlFileSizeTooLarge}
            onOpenChange={(open) => {
              setShowFileSizeLimitModal(open);
              setUrlFileSizeTooLarge(open);
            }}
          />

          <FloatingVideoPortal />
        </div>
      </FloatingVideoProvider>
    </AudioPlayerProvider>
  );
}
