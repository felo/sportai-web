"use client";

import { useState, useEffect, useRef } from "react";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useGeminiChat } from "@/hooks/useGeminiChat";
import { useGeminiApi } from "@/hooks/useGeminiApi";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { DragOverlay } from "@/components/chat/DragOverlay";
import { ErrorToast } from "@/components/ui/Toast";
import { Sidebar } from "@/components/Sidebar";
import { useSidebar } from "@/components/SidebarContext";
import { PICKLEBALL_COACH_PROMPT } from "@/utils/prompts";
import { getCurrentChatId, setCurrentChatId, createChat, updateChat } from "@/utils/storage";
import type { Message } from "@/types/chat";

export function GeminiQueryForm() {
  const [prompt, setPrompt] = useState("");
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
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
    
    // Store the chat ID at the start of the request to prevent updates if chat changes
    const requestChatId = getCurrentChatId();

    // If submitting first video and no current chat exists, create a new chat with video filename as title
    if (currentVideoFile && messages.length === 0) {
      const currentChatId = getCurrentChatId();
      if (!currentChatId) {
        // Create a new chat with the video filename as title
        const videoFileName = currentVideoFile.name;
        // Remove file extension for cleaner title
        const title = videoFileName.replace(/\.[^/.]+$/, "");
        console.log("[Chat] Creating new chat with title:", title);
        const newChat = createChat([], title);
        setCurrentChatId(newChat.id);
        console.log("[Chat] Created chat:", newChat.id, "Title:", newChat.title);
      }
    }

    const timestamp = Date.now();
    let videoMessageId: string | null = null;
    
    // If both video and text are present, create two separate messages
    if (currentVideoFile && currentPrompt.trim()) {
      // First message: video only
      videoMessageId = `user-video-${timestamp}`;
      const videoMessage: Message = {
        id: videoMessageId,
        role: "user",
        content: "",
        videoFile: currentVideoFile,
        videoPreview: currentVideoPreview,
      };
      addMessage(videoMessage);
      
      // Second message: text only
      const textMessageId = `user-text-${timestamp}`;
      const textMessage: Message = {
        id: textMessageId,
        role: "user",
        content: currentPrompt,
        videoFile: null,
        videoPreview: null,
      };
      addMessage(textMessage);
    } else {
      // Single message: either video or text
      const userMessageId = `user-${timestamp}`;
      if (currentVideoFile) {
        videoMessageId = userMessageId;
      }
      const userMessage: Message = {
        id: userMessageId,
        role: "user",
        content: currentPrompt,
        videoFile: currentVideoFile,
        videoPreview: currentVideoPreview,
      };
      addMessage(userMessage);
    }

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
          (id, content) => {
            // Check if chat changed during streaming
            const chatId = getCurrentChatId();
            if (chatId === requestChatId) {
              updateMessage(id, { content });
            } else {
              console.warn("[GeminiQueryForm] Chat changed during streaming, stopping updates");
            }
          },
          conversationHistory
        );
      } else {
        // Video upload with progress
        await sendVideoQuery(
          currentPrompt,
          currentVideoFile,
          assistantMessageId,
          (id, content) => {
            // Check if chat changed during streaming
            const chatId = getCurrentChatId();
            if (chatId === requestChatId) {
              updateMessage(id, { content });
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
              updateMessage(videoMessageId, { videoUrl: s3Url, videoS3Key: s3Key });
            }
          }
        );
      }
    } catch (err) {
      // Only handle error if we're still on the same chat
      const currentChatId = getCurrentChatId();
      if (currentChatId === requestChatId) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setApiError(errorMessage);
        removeMessage(assistantMessageId);
      }
    } finally {
      // Only reset loading state if we're still on the same chat
      const currentChatId = getCurrentChatId();
      if (currentChatId === requestChatId) {
        setLoading(false);
        setProgressStage("idle");
        setUploadProgress(0);
      }
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
