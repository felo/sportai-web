"use client";

import { useState, useEffect, useRef } from "react";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useGeminiChat } from "@/hooks/useGeminiChat";
import { useGeminiApi } from "@/hooks/useGeminiApi";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { DragOverlay } from "@/components/chat/DragOverlay";
import { ErrorToast } from "@/components/ui/Toast";
import { Sidebar } from "@/components/Sidebar";
import { useSidebar } from "@/components/SidebarContext";
import { PICKLEBALL_COACH_PROMPT } from "@/utils/prompts";
import type { Message } from "@/types/chat";

export function GeminiQueryForm() {
  const [prompt, setPrompt] = useState("");
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isCollapsed: isSidebarCollapsed } = useSidebar();

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

  const { isDragging, handlers: dragHandlers } = useDragAndDrop({
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
      setPrompt("Please analyse this video for me");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const currentPrompt = prompt;
    const currentVideoFile = videoFile;
    const currentVideoPreview = videoPreview;

    // Get conversation history BEFORE adding new messages
    // This ensures we send the correct history to the API
    const conversationHistory = messages;

    // Add user message
    const userMessageId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: currentPrompt,
      videoFile: currentVideoFile,
      videoPreview: currentVideoPreview,
    };
    addMessage(userMessage);

    // Clear input
    setPrompt("");
    clearVideo();
    setVideoError(null);
    setApiError(null);
    setLoading(true);
    setUploadProgress(0);
    setProgressStage(currentVideoFile ? "uploading" : "processing");

    // Add placeholder assistant message
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    };
    addMessage(assistantMessage);

    // Scroll to bottom immediately after adding messages, then disable auto-scroll
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      scrollToBottom();
      setShouldAutoScroll(false); // Disable auto-scroll during response generation
    });

    try {

      if (!currentVideoFile) {
        // Streaming for text-only
        await sendTextOnlyQuery(
          currentPrompt,
          assistantMessageId,
          (id, content) => updateMessage(id, { content }),
          conversationHistory
        );
      } else {
        // Video upload with progress
        await sendVideoQuery(
          currentPrompt,
          currentVideoFile,
          assistantMessageId,
          (id, content) => updateMessage(id, { content }),
          setUploadProgress,
          setProgressStage,
          conversationHistory,
          (s3Url) => {
            // Update user message with S3 URL for video playback
            updateMessage(userMessageId, { videoUrl: s3Url });
          }
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setApiError(errorMessage);
      removeMessage(assistantMessageId);
    } finally {
      setLoading(false);
      setProgressStage("idle");
      setUploadProgress(0);
      // Re-enable auto-scroll after response completes (user can manually scroll if needed)
      // setShouldAutoScroll(true); // Commented out - keep auto-scroll disabled
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header - fixed at top */}
      <ChatHeader messageCount={messages.length} />

      {/* Sidebar */}
      <Sidebar 
        onClearChat={handleClearConversation}
        messageCount={messages.length}
      />

      {/* Content wrapper - accounts for sidebar width and centers content */}
      <div
        style={{
          marginLeft: isSidebarCollapsed ? "64px" : "280px",
          transition: "margin-left 0.2s ease-in-out",
          width: `calc(100% - ${isSidebarCollapsed ? "64px" : "280px"})`,
          height: "calc(100vh - 57px)", // Full height minus header
          marginTop: "57px", // Start below header
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
            onPromptChange={setPrompt}
            onVideoRemove={clearVideo}
            onVideoChange={handleVideoChange}
            onSubmit={handleSubmit}
            onPickleballCoachClick={handlePickleballCoachPrompt}
          />
        </div>
      </div>

      {/* Toast for error notifications */}
      <ErrorToast error={error} />
    </div>
  );
}
