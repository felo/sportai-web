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
import { PICKLEBALL_COACH_PROMPT } from "@/utils/prompts";
import type { Message } from "@/types/chat";

export function GeminiQueryForm() {
  const [prompt, setPrompt] = useState("");
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (confirm("Are you sure you want to clear the conversation? This cannot be undone.")) {
      clearMessages();
      setPrompt("");
      clearVideo();
      setVideoError(null);
      setApiError(null);
    }
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
    const userMessage: Message = {
      id: `user-${Date.now()}`,
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
          conversationHistory
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
    <div className="h-screen flex flex-col">
      {/* Header with clear button */}
      <ChatHeader
        onClear={handleClearConversation}
        messageCount={messages.length}
      />

      <div
        ref={containerRef}
        className={`flex flex-col flex-1 max-w-4xl mx-auto w-full transition-colors ${
          isDragging ? "bg-blue-50 dark:bg-blue-900/10" : ""
        }`}
        {...dragHandlers}
      >
        {/* Drag overlay */}
        {isDragging && <DragOverlay />}

        {/* Messages area */}
      <MessageList
        messages={messages}
        loading={loading}
        videoFile={videoFile}
        progressStage={progressStage}
        uploadProgress={uploadProgress}
        messagesEndRef={messagesEndRef}
      />

        {/* Input area */}
        <ChatInput
          prompt={prompt}
          videoFile={videoFile}
          videoPreview={videoPreview}
          error={error}
          loading={loading}
          onPromptChange={setPrompt}
          onVideoRemove={clearVideo}
          onVideoChange={handleVideoChange}
          onSubmit={handleSubmit}
          onPickleballCoachClick={handlePickleballCoachPrompt}
        />
      </div>
    </div>
  );
}
