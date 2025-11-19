"use client";

import { useState, useEffect, useRef } from "react";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useGeminiChat } from "@/hooks/useGeminiChat";
import { useGeminiApi } from "@/hooks/useGeminiApi";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { DragOverlay } from "@/components/chat/DragOverlay";
import { PICKLEBALL_COACH_PROMPT } from "@/utils/prompts";
import type { Message } from "@/types/chat";

export function GeminiQueryForm() {
  const [prompt, setPrompt] = useState("");
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

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handlePickleballCoachPrompt = () => {
    setPrompt(PICKLEBALL_COACH_PROMPT);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const currentPrompt = prompt;
    const currentVideoFile = videoFile;
    const currentVideoPreview = videoPreview;

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

    try {
      if (!currentVideoFile) {
        // Streaming for text-only
        await sendTextOnlyQuery(
          currentPrompt,
          assistantMessageId,
          (id, content) => updateMessage(id, { content })
        );
      } else {
        // Video upload with progress
        await sendVideoQuery(
          currentPrompt,
          currentVideoFile,
          assistantMessageId,
          (id, content) => updateMessage(id, { content }),
          setUploadProgress,
          setProgressStage
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
    }
  };

  return (
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
  );
}
