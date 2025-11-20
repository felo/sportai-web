"use client";

import { useState, useEffect, useRef } from "react";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useGeminiChat } from "@/hooks/useGeminiChat";
import { useGeminiApi } from "@/hooks/useGeminiApi";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useNavigationWarning } from "@/hooks/useNavigationWarning";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { DragOverlay } from "@/components/chat/DragOverlay";
import { ErrorToast } from "@/components/ui/Toast";
import { Sidebar } from "@/components/Sidebar";
import { useSidebar } from "@/components/SidebarContext";
import { PICKLEBALL_COACH_PROMPT } from "@/utils/prompts";
import { getCurrentChatId, setCurrentChatId, createChat, updateChat, getThinkingMode, getMediaResolution, type ThinkingMode, type MediaResolution } from "@/utils/storage";
import type { Message } from "@/types/chat";
import { estimateTextTokens, estimateVideoTokens } from "@/lib/token-utils";

export function GeminiQueryForm() {
  const [prompt, setPrompt] = useState("");
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>(() => getThinkingMode());
  const [mediaResolution, setMediaResolution] = useState<MediaResolution>(() => getMediaResolution());
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { isCollapsed: isSidebarCollapsed } = useSidebar();
  const isMobile = useIsMobile();

  const {
    videoFile,
    videoPreview,
    error: videoError,
    setError: setVideoError,
    processVideoFile,
    clearVideo,
    handleVideoChange,
  } = useVideoUpload();

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
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    isHydrated,
  } = useGeminiChat();

  const {
    error: apiError,
    setError: setApiError,
    sendTextOnlyQuery,
    sendVideoQuery,
  } = useGeminiApi({
    onProgressUpdate: (stage, progress) => {
      setProgressStage(stage);
      setUploadProgress(progress);
    },
  });

  const { confirmNavigation } = useNavigationWarning({
    isLoading: loading,
    progressStage,
  });

  const { isDragging, hasJustDropped, handlers: dragHandlers } = useDragAndDrop({
    onFileDrop: (file) => {
      processVideoFile(file);
    },
    onError: (error) => {
      setVideoError(error);
    },
  });

  // Auto-populate prompt when video is added and prompt is empty
  useEffect(() => {
    if (videoFile && !prompt.trim()) {
      setPrompt("Please analyse this video for me.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoFile]); // Only depend on videoFile to avoid loops

  const error = videoError || apiError;
  const hasScrolledToBottomRef = useRef(false);

  // Scroll to bottom on initial load when messages are loaded from localStorage
  useEffect(() => {
    if (isHydrated && messages.length > 0 && !hasScrolledToBottomRef.current) {
      // Small delay to ensure DOM is ready and messages are rendered
      const timeoutId = setTimeout(() => {
        scrollToBottom();
        hasScrolledToBottomRef.current = true;
      }, 150);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isHydrated, messages.length, scrollToBottom]);

  // Only auto-scroll if shouldAutoScroll is true (disabled during response generation)
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom, shouldAutoScroll]);

  const handlePickleballCoachPrompt = () => {
    setPrompt(PICKLEBALL_COACH_PROMPT);
  };

  const handleClearConversation = () => {
    clearMessages();
    setPrompt("");
    clearVideo();
    setVideoError(null);
    setApiError(null);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setProgressStage("idle");
    setUploadProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!prompt.trim() && !videoFile) || loading) return;

    // Use prompt if provided, otherwise use default prompt for video-only submissions
    // Update prompt state if we're using the default so UI reflects what will be sent
    let currentPrompt = prompt.trim();
    if (!currentPrompt && videoFile) {
      currentPrompt = "Please analyse this video for me.";
      setPrompt(currentPrompt); // Update state so UI shows the prompt
    }
    const currentVideoFile = videoFile;
    const currentVideoPreview = videoPreview;

    // Get conversation history BEFORE adding new messages
    // This ensures we send the correct history to the API
    const conversationHistory = messages;
    
    // Store the initial chat ID (might be null for new chats)
    let requestChatId = getCurrentChatId();

    // Set loading state BEFORE creating chat to prevent chat change handler from interfering
    setLoading(true);
    setUploadProgress(0);
    setProgressStage(currentVideoFile ? "uploading" : "processing");

    // If no current chat exists, create a new chat
    if (!requestChatId) {
      console.log("[Chat] Creating new chat");
      const newChat = createChat([], undefined); // Let it generate a default title
      setCurrentChatId(newChat.id);
      requestChatId = newChat.id;
      console.log("[Chat] Created chat:", newChat.id);
      // Update activeChatIdRef immediately to prevent chat change handler from interfering
      // This is a workaround - we need to update the ref in useGeminiChat
    }

    const timestamp = Date.now();
    let videoMessageId: string | null = null;
    
    // Calculate input tokens for user messages
    const calculateUserMessageTokens = (content: string, videoFile: File | null): number => {
      let tokens = estimateTextTokens(content);
      if (videoFile) {
        const isImage = videoFile.type.startsWith("image/");
        if (isImage) {
          const imageSizeKB = videoFile.size / 1024;
          tokens += 257 + Math.ceil((imageSizeKB / 100) * 85);
        } else {
          tokens += estimateVideoTokens(videoFile.size, videoFile.type);
        }
      }
      return tokens;
    };
    
    console.log("[GeminiQueryForm] Creating user messages...", {
      hasVideo: !!currentVideoFile,
      hasPrompt: !!currentPrompt.trim(),
    });
    
    // If both video and text are present, create two separate messages
    if (currentVideoFile && currentPrompt.trim()) {
      console.log("[GeminiQueryForm] Creating two messages: video + text");
      // First message: video only
      videoMessageId = `user-video-${timestamp}`;
      const videoTokens = calculateUserMessageTokens("", currentVideoFile);
      const videoMessage: Message = {
        id: videoMessageId,
        role: "user",
        content: "",
        videoFile: currentVideoFile,
        videoPreview: currentVideoPreview,
        inputTokens: videoTokens,
      };
      console.log("[GeminiQueryForm] Adding video message:", videoMessageId);
      addMessage(videoMessage);
      
      // Second message: text only
      const textMessageId = `user-text-${timestamp}`;
      const textTokens = calculateUserMessageTokens(currentPrompt, null);
      const textMessage: Message = {
        id: textMessageId,
        role: "user",
        content: currentPrompt,
        videoFile: null,
        videoPreview: null,
        inputTokens: textTokens,
      };
      console.log("[GeminiQueryForm] Adding text message:", textMessageId);
      addMessage(textMessage);
    } else {
      // Single message: either video or text
      console.log("[GeminiQueryForm] Creating single message");
      const userMessageId = `user-${timestamp}`;
      if (currentVideoFile) {
        videoMessageId = userMessageId;
      }
      const userTokens = calculateUserMessageTokens(currentPrompt, currentVideoFile);
      const userMessage: Message = {
        id: userMessageId,
        role: "user",
        content: currentPrompt,
        videoFile: currentVideoFile,
        videoPreview: currentVideoPreview,
        inputTokens: userTokens,
      };
      console.log("[GeminiQueryForm] Adding user message:", userMessageId, {
        hasVideo: !!userMessage.videoFile,
        hasPreview: !!userMessage.videoPreview,
        contentLength: userMessage.content.length,
      });
      addMessage(userMessage);
    }

    console.log("[GeminiQueryForm] User messages added, current messages state length:", messages.length);

    // Clear input
    setPrompt("");
    // Don't revoke blob URL yet - it's still referenced in the message
    // It will be revoked when S3 URL is available or when message is removed
    clearVideo(true); // Keep blob URL since it's in the message
    setVideoError(null);
    setApiError(null);
    // Loading state already set above before chat creation

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Add placeholder assistant message
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    };
    console.log("[GeminiQueryForm] Adding assistant placeholder message:", assistantMessageId);
    addMessage(assistantMessage);
    console.log("[GeminiQueryForm] All messages added, waiting for state update...");

    // Wait a tick for React to update state, then save messages to chat
    setTimeout(() => {
      // Get current messages from state (they should be updated by now)
      const currentChatId = getCurrentChatId();
      console.log("[GeminiQueryForm] Saving messages to chat:", {
        requestChatId,
        currentChatId,
        match: currentChatId === requestChatId,
      });
      
      if (requestChatId && currentChatId === requestChatId) {
        // Messages will be saved by useGeminiChat useEffect, but we can also save here explicitly
        console.log("[GeminiQueryForm] Chat IDs match, messages should be saved by useEffect");
      } else {
        console.warn("[GeminiQueryForm] Chat ID mismatch:", { requestChatId, currentChatId });
      }
    }, 0);

    // Scroll to bottom immediately after adding messages, then disable auto-scroll
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      scrollToBottom();
      setShouldAutoScroll(false); // Disable auto-scroll during response generation
    });

    try {
      // Check if chat changed before starting request
      const currentChatId = getCurrentChatId();
      if (currentChatId !== requestChatId) {
        console.warn("[GeminiQueryForm] Chat changed before request started, aborting");
        removeMessage(assistantMessageId);
        return;
      }

      if (!currentVideoFile) {
        // Streaming for text-only
        await sendTextOnlyQuery(
          currentPrompt,
          assistantMessageId,
          (id, updates) => {
            // Check if chat changed during streaming
            const chatId = getCurrentChatId();
            if (chatId === requestChatId) {
              updateMessage(id, updates);
            } else {
              console.warn("[GeminiQueryForm] Chat changed during streaming, stopping updates");
            }
          },
          conversationHistory,
          abortController,
          thinkingMode,
          mediaResolution
        );
      } else {
        // Video upload with progress
        await sendVideoQuery(
          currentPrompt,
          currentVideoFile,
          assistantMessageId,
          (id, updates) => {
            // Check if chat changed during streaming
            const chatId = getCurrentChatId();
            if (chatId === requestChatId) {
              updateMessage(id, updates);
            } else {
              console.warn("[GeminiQueryForm] Chat changed during streaming, stopping updates");
            }
          },
          setUploadProgress,
          setProgressStage,
          conversationHistory,
          (s3Url, s3Key) => {
            // Check if chat changed before updating video message
            const chatId = getCurrentChatId();
            if (chatId === requestChatId && videoMessageId) {
              // Clear blob URL when S3 URL is available to prevent revoked blob URL errors
              updateMessage(videoMessageId, { videoUrl: s3Url, videoS3Key: s3Key, videoPreview: null });
            }
          },
          abortController,
          thinkingMode,
          mediaResolution
        );
      }
    } catch (err) {
      // Only handle error if we're still on the same chat
      const currentChatId = getCurrentChatId();
      if (currentChatId === requestChatId) {
        // Don't show error if request was aborted (user clicked stop)
        if (err instanceof Error && err.name === "AbortError") {
          console.log("[GeminiQueryForm] Request was cancelled by user");
          // Optionally update the message to indicate it was stopped
          const currentContent = messages.find(m => m.id === assistantMessageId)?.content || "";
          if (currentContent.trim()) {
            updateMessage(assistantMessageId, { content: currentContent + "\n\n[Stopped by user]" });
          } else {
            removeMessage(assistantMessageId);
          }
        } else {
          const errorMessage =
            err instanceof Error ? err.message : "An error occurred";
          setApiError(errorMessage);
          // Remove assistant message
          removeMessage(assistantMessageId);
          // Also remove user video message if it exists (upload failed)
          // Revoke blob URL from the captured preview before removing
          if (videoMessageId && currentVideoPreview) {
            URL.revokeObjectURL(currentVideoPreview);
            removeMessage(videoMessageId);
          }
          // Clear video on error so user can try again with a new file
          clearVideo();
        }
      }
    } finally {
      // Only reset loading state if we're still on the same chat
      const currentChatId = getCurrentChatId();
      if (currentChatId === requestChatId) {
        setLoading(false);
        setProgressStage("idle");
        setUploadProgress(0);
      }
      // Clean up abort controller
      abortControllerRef.current = null;
      // Re-enable auto-scroll after response completes (user can manually scroll if needed)
      // setShouldAutoScroll(true); // Commented out - keep auto-scroll disabled
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header - hidden on mobile */}
      {!isMobile && <ChatHeader messageCount={messages.length} />}

      {/* Sidebar */}
      <Sidebar 
        onClearChat={handleClearConversation}
        messageCount={messages.length}
        onChatSwitchAttempt={confirmNavigation}
      />

      {/* Content wrapper - accounts for sidebar width and centers content */}
      <div
        style={{
          marginLeft: isMobile ? "16px" : (isSidebarCollapsed ? "64px" : "280px"),
          marginRight: isMobile ? "16px" : "0",
          transition: "margin-left 0.2s ease-in-out",
          width: isMobile ? "calc(100% - 32px)" : `calc(100% - ${isSidebarCollapsed ? "64px" : "280px"})`,
          height: isMobile ? "100vh" : "calc(100vh - 57px)", // Full height on mobile, minus header on desktop
          marginTop: isMobile ? "0" : "57px", // Start below header on desktop
          display: "flex",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Scrollable content area - centered and responsive */}
        <div
          ref={containerRef}
          className={`flex flex-col max-w-4xl w-full h-full transition-all ${
            isDragging ? "bg-blue-50 dark:bg-blue-900/10" : ""
          }`}
          style={{
            position: "relative",
            overflow: "hidden",
          }}
          {...dragHandlers}
        >
          {/* Drag overlay */}
          {isDragging && <DragOverlay />}

          {/* Messages area - this is the scrolling container with fade overlay */}
          <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
            <div style={{ height: "100%", overflowY: "auto", minHeight: 0 }}>
              <MessageList
                messages={messages}
                loading={loading}
                videoFile={videoFile}
                progressStage={progressStage}
                uploadProgress={uploadProgress}
                messagesEndRef={messagesEndRef}
              />
            </div>
            
            {/* Bottom fade overlay - fades content at bottom */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "60px",
                background: `linear-gradient(to top, var(--gray-1, #1C1C1C) 0%, transparent 100%)`,
                pointerEvents: "none",
                zIndex: 1000,
              }}
            />
          </div>

          {/* Input area - docked at bottom */}
          <ChatInput
            prompt={prompt}
            videoFile={videoFile}
            videoPreview={videoPreview}
            error={null}
            loading={loading}
            progressStage={progressStage}
            onPromptChange={setPrompt}
            onVideoRemove={clearVideo}
            onVideoChange={handleVideoChange}
            onSubmit={handleSubmit}
            onStop={handleStop}
            onPickleballCoachClick={handlePickleballCoachPrompt}
            onThinkingModeChange={setThinkingMode}
            onMediaResolutionChange={setMediaResolution}
            disableTooltips={hasJustDropped}
          />
        </div>
      </div>

      {/* Toast for error notifications */}
      <ErrorToast error={error} />
    </div>
  );
}
