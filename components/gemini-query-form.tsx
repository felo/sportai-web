"use client";

import { useState, useEffect, useRef } from "react";
import { AlertDialog, Button, Flex } from "@radix-ui/themes";
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
import { ScrollToBottom } from "@/components/chat/ScrollToBottom";
import { ScrollToVideo } from "@/components/chat/ScrollToVideo";
import { AudioStopButton } from "@/components/chat/AudioStopButton";
import { ErrorToast } from "@/components/ui/Toast";
import { AudioPlayerProvider } from "@/components/AudioPlayerContext";
import { Sidebar } from "@/components/Sidebar";
import { useSidebar } from "@/components/SidebarContext";
import { StarterPrompts } from "@/components/StarterPrompts";
import { PICKLEBALL_COACH_PROMPT, type StarterPromptConfig } from "@/utils/prompts";
import { getCurrentChatId, setCurrentChatId, createChat, updateChat, updateChatSettings, getThinkingMode, getMediaResolution, getDomainExpertise, type ThinkingMode, type MediaResolution, type DomainExpertise, generateAIChatTitle, getChatById } from "@/utils/storage";
import type { Message } from "@/types/chat";
import { estimateTextTokens, estimateVideoTokens } from "@/lib/token-utils";
import { getMediaType, downloadVideoFromUrl } from "@/utils/video-utils";
import {
  sharedSwings,
  tennisSwings,
  pickleballSwings,
  padelSwings,
  sharedTerminology,
  tennisTerminology,
  pickleballTerminology,
  padelTerminology,
  sharedTechnique,
  tennisCourts,
  pickleballCourts,
  padelCourts,
} from "@/database";

export function GeminiQueryForm() {
  const [prompt, setPrompt] = useState("");
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>("fast");
  const [mediaResolution, setMediaResolution] = useState<MediaResolution>("medium");
  const [domainExpertise, setDomainExpertise] = useState<DomainExpertise>("all-sports");
  const [videoPlaybackSpeed, setVideoPlaybackSpeed] = useState<number>(1.0);
  const [poseData, setPoseData] = useState<StarterPromptConfig["poseSettings"] | undefined>(undefined);
  const [showingVideoSizeError, setShowingVideoSizeError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  const { confirmNavigation, dialogOpen, handleConfirm, handleCancel } = useNavigationWarning({
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

  // Load settings from current chat after hydration
  useEffect(() => {
    if (isHydrated) {
      const currentChatId = getCurrentChatId();
      if (currentChatId) {
        const chatData = getChatById(currentChatId);
        if (chatData) {
          // Restore settings from chat, fallback to defaults
          setThinkingMode(chatData.thinkingMode || "fast");
          setMediaResolution(chatData.mediaResolution || "medium");
          setDomainExpertise(chatData.domainExpertise || "all-sports");
          return;
        }
      }
      // No chat found, use global settings
      setThinkingMode(getThinkingMode());
      setMediaResolution(getMediaResolution());
      setDomainExpertise(getDomainExpertise());
    }
  }, [isHydrated]);

  // Intelligent preloading: When user uploads a video, preload pose detection components
  // This ensures they're ready if user wants to use pose detection, with zero perceived delay
  useEffect(() => {
    if (videoFile) {
      // Preload in background while user is reviewing the video or typing
      import("@/components/chat/VideoPoseViewer");
      import("@/components/chat/Pose3DViewer");
    }
  }, [videoFile]);

  // Ensure there's always a chat - create one on mount if none exists
  useEffect(() => {
    if (isHydrated) {
      const currentChatId = getCurrentChatId();
      if (!currentChatId) {
        console.log("[GeminiQueryForm] No chat exists, creating default chat");
        const newChat = createChat([], undefined);
        setCurrentChatId(newChat.id);
        console.log("[GeminiQueryForm] Created default chat:", newChat.id);
        // Reset settings to defaults for new chat
        setThinkingMode("fast");
        setMediaResolution("medium");
        setDomainExpertise("all-sports");
      } else {
        console.log("[GeminiQueryForm] Using existing chat:", currentChatId);
      }
    }
  }, [isHydrated]);

  // Restore settings when switching chats
  useEffect(() => {
    if (!isHydrated) return;

    const handleChatChange = () => {
      const currentChatId = getCurrentChatId();
      if (currentChatId) {
        const chatData = getChatById(currentChatId);
        if (chatData) {
          console.log("[GeminiQueryForm] Chat changed, restoring settings:", {
            chatId: currentChatId,
            thinkingMode: chatData.thinkingMode,
            mediaResolution: chatData.mediaResolution,
            domainExpertise: chatData.domainExpertise,
          });
          // Restore settings from the chat
          setThinkingMode(chatData.thinkingMode || "fast");
          setMediaResolution(chatData.mediaResolution || "medium");
          setDomainExpertise(chatData.domainExpertise || "all-sports");
        }
      }
    };

    // Listen for chat changes (triggered when new chat is created or chat is switched)
    window.addEventListener("chat-storage-change", handleChatChange);
    
    return () => {
      window.removeEventListener("chat-storage-change", handleChatChange);
    };
  }, [isHydrated]);

  // Auto-populate prompt when video is added and prompt is empty
  useEffect(() => {
    if (videoFile && !prompt.trim()) {
      const mediaType = getMediaType(videoFile);
      setPrompt(`Please analyse this ${mediaType} for me.`);
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
  // Also don't auto-scroll if the last message is a video size limit error
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isVideoSizeLimitError = lastMessage?.isVideoSizeLimitError;
    
    if (shouldAutoScroll && !isVideoSizeLimitError) {
      scrollToBottom();
    }
    
    // Update showingVideoSizeError based on whether last message is a size error
    // This keeps the state in sync with the actual messages
    if (isVideoSizeLimitError !== showingVideoSizeError) {
      setShowingVideoSizeError(!!isVideoSizeLimitError);
    }
  }, [messages, scrollToBottom, shouldAutoScroll, showingVideoSizeError]);

  // Generate AI title after first exchange completes
  useEffect(() => {
    if (!isHydrated) return;
    
    // Only generate title for first exchange (user + assistant)
    // Note: might be multiple user messages if video + text were sent separately
    const userMessages = messages.filter(m => m.role === "user");
    const assistantMessages = messages.filter(m => m.role === "assistant");
    
    // Check if we have at least one user message and exactly one assistant message
    // And the assistant message is complete (we're not loading anymore)
    if (userMessages.length >= 1 && 
        assistantMessages.length === 1 && 
        assistantMessages[0].content.trim().length > 0 &&
        !loading) { 
      
      const currentChatId = getCurrentChatId();
      if (currentChatId) {
        // Check if title is still the default/generated one (not manually edited)
        const chat = getChatById(currentChatId);
        const firstUserContent = userMessages[0].content.trim().slice(0, 50);
        
        // Only regenerate if title looks auto-generated (matches "New Chat", "Video Analysis", or starts with user content)
        if (chat && (chat.title === "New Chat" || chat.title === "Video Analysis" || (firstUserContent && chat.title.startsWith(firstUserContent)))) {
          // Generate title asynchronously (don't block UI)
          generateAIChatTitle(messages).then(title => {
            // Double-check chat hasn't changed
            const stillCurrentChatId = getCurrentChatId();
            if (stillCurrentChatId === currentChatId) {
              updateChat(currentChatId, { title }, false);
            }
          }).catch(error => {
            console.error("Failed to generate AI title:", error);
          });
        }
      }
    }
  }, [messages, isHydrated, loading]);

  const handlePickleballCoachPrompt = () => {
    setPrompt(PICKLEBALL_COACH_PROMPT);
  };

  const handleStarterPromptSelect = async (
    prompt: string, 
    videoUrl: string,
    settings?: {
      thinkingMode?: ThinkingMode;
      mediaResolution?: MediaResolution;
      domainExpertise?: DomainExpertise;
      playbackSpeed?: number;
      poseSettings?: StarterPromptConfig["poseSettings"];
    }
  ) => {
    try {
      setVideoError(null);
      
      // Apply settings if provided
      if (settings) {
        const currentChatId = getCurrentChatId();
        const chatSettingsToUpdate: {
          thinkingMode?: ThinkingMode;
          mediaResolution?: MediaResolution;
          domainExpertise?: DomainExpertise;
        } = {};

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
        if (settings.poseSettings) {
          setPoseData(settings.poseSettings);
        } else {
          setPoseData(undefined);
        }

        // Update chat settings
        if (currentChatId && Object.keys(chatSettingsToUpdate).length > 0) {
          updateChatSettings(currentChatId, chatSettingsToUpdate);
        }
      }
      
      // Load the video first
      const videoFile = await downloadVideoFromUrl(videoUrl);
      processVideoFile(videoFile);
      // Then set the prompt
      setPrompt(prompt);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load demo video";
      setVideoError(errorMessage);
      // Still set the prompt even if video loading fails
      setPrompt(prompt);
      throw error;
    }
  };

  // Wrapper functions to update both state and current chat settings
  const handleThinkingModeChange = (mode: ThinkingMode) => {
    setThinkingMode(mode);
    const currentChatId = getCurrentChatId();
    if (currentChatId) {
      updateChatSettings(currentChatId, { thinkingMode: mode });
    }
  };

  const handleMediaResolutionChange = (resolution: MediaResolution) => {
    setMediaResolution(resolution);
    const currentChatId = getCurrentChatId();
    if (currentChatId) {
      updateChatSettings(currentChatId, { mediaResolution: resolution });
    }
  };

  const handleDomainExpertiseChange = (expertise: DomainExpertise) => {
    setDomainExpertise(expertise);
    const currentChatId = getCurrentChatId();
    if (currentChatId) {
      updateChatSettings(currentChatId, { domainExpertise: expertise });
    }
  };

  const handleClearConversation = () => {
    clearMessages();
    setPrompt("");
    clearVideo();
    setVideoError(null);
    setApiError(null);
    setPoseData(undefined);
    setShowingVideoSizeError(false);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setProgressStage("idle");
    setUploadProgress(0);
    setShowingVideoSizeError(false);
  };

  const handleAskForHelp = (termName: string, swing?: { name: string; sport: string; description: string }) => {
    let question = '';
    const lowerTermName = termName.toLowerCase();
    
    // Check if it's a swing
    const isSwing = Object.keys({
      ...sharedSwings,
      ...tennisSwings,
      ...pickleballSwings,
      ...padelSwings,
    }).some(key => key.toLowerCase() === lowerTermName);
    
    // Check if it's a technique term
    const isTechnique = Object.keys(sharedTechnique).some(key => key.toLowerCase() === lowerTermName);
    
    // Check if it's a court
    const isCourt = Object.keys({
      ...tennisCourts,
      ...pickleballCourts,
      ...padelCourts,
    }).some(key => key.toLowerCase() === lowerTermName);
    
    // Check if it's terminology (anything else)
    const isTerminology = Object.keys({
      ...sharedTerminology,
      ...tennisTerminology,
      ...pickleballTerminology,
      ...padelTerminology,
    }).some(key => key.toLowerCase() === lowerTermName);
    
    // Generate context-appropriate questions
    if (isSwing) {
      question = `Can you give me tips for improving my ${termName.toLowerCase()} swing?`;
    } else if (isTechnique) {
      question = `Can you explain how to improve my ${termName.toLowerCase()} technique?`;
    } else if (isCourt) {
      question = `What strategies should I use when playing on a ${termName.toLowerCase()}?`;
    } else if (isTerminology) {
      question = `Can you explain more about ${termName.toLowerCase()} and how to use it effectively in my game?`;
    } else {
      // Fallback for any unmatched terms
      question = `Can you give me tips about ${termName.toLowerCase()} in game?`;
    }
    
    // Update the prompt in the UI
    setPrompt(question);
    
    // Submit with the question directly to avoid race conditions with state updates
    // Use a small timeout to allow the UI to update first
    setTimeout(() => {
      const fakeEvent = new Event('submit', { bubbles: true, cancelable: true }) as any;
      handleSubmit(fakeEvent, question);
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent, overridePrompt?: string) => {
    e.preventDefault();
    
    // Use override prompt if provided (e.g., from "Ask AI for help"), otherwise use state prompt
    const effectivePrompt = overridePrompt !== undefined ? overridePrompt : prompt;
    
    if ((!effectivePrompt.trim() && !videoFile) || loading) return;

    // Use prompt if provided, otherwise use default prompt for video-only submissions
    // Update prompt state if we're using the default so UI reflects what will be sent
    let currentPrompt = effectivePrompt.trim();
    if (!currentPrompt && videoFile) {
      const mediaType = getMediaType(videoFile);
      currentPrompt = `Please analyse this ${mediaType} for me.`;
      setPrompt(currentPrompt); // Update state so UI shows the prompt
    }
    const currentVideoFile = videoFile;
    const currentVideoPreview = videoPreview;

    // Get conversation history BEFORE adding new messages
    // This ensures we send the correct history to the API
    const conversationHistory = messages;
    
    // Get the current chat ID - there should always be one (created on mount)
    const requestChatId = getCurrentChatId();
    console.log("[GeminiQueryForm] Using chat:", requestChatId);
    
    if (!requestChatId) {
      console.error("[GeminiQueryForm] No chat ID available! This should not happen - chat should be created on mount.");
      return;
    }

    // Set loading state
    console.log("[GeminiQueryForm] Setting loading state to true");
    setLoading(true);
    setUploadProgress(0);
    setProgressStage(currentVideoFile ? "uploading" : "processing");

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
        videoPlaybackSpeed: videoPlaybackSpeed,
        inputTokens: videoTokens,
        poseData: poseData,
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
        videoPlaybackSpeed: currentVideoFile ? videoPlaybackSpeed : undefined,
        inputTokens: userTokens,
        poseData: currentVideoFile ? poseData : undefined,
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
    setPoseData(undefined); // Reset pose data after sending
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
    // Skip initial scroll if we're about to show a video size limit error
    const willShowSizeLimitError = !!(currentVideoFile && 
                                      currentVideoFile.type.startsWith("video/") && 
                                      (currentVideoFile.size / (1024 * 1024)) > 100);
    
    // Update state to hide disclaimer if showing size error
    setShowingVideoSizeError(willShowSizeLimitError);
    
    requestAnimationFrame(() => {
      if (!willShowSizeLimitError) {
        scrollToBottom();
      }
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
          mediaResolution,
          domainExpertise
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
          mediaResolution,
          domainExpertise
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
        // Clear video size error state after completion (unless it was actually a size error)
        // The flag will stay true if it was a size error, ensuring banner stays hidden
      }
      // Clean up abort controller
      abortControllerRef.current = null;
      // Re-enable auto-scroll after response completes (user can manually scroll if needed)
      // setShouldAutoScroll(true); // Commented out - keep auto-scroll disabled
    }
  };

  const handleNewChat = async () => {
    // Check if chat is thinking before creating new chat
    const result = await Promise.resolve(confirmNavigation());
    if (!result) {
      return; // User cancelled
    }
    const newChat = createChat();
    setCurrentChatId(newChat.id);
    setShowingVideoSizeError(false);
    // State will be updated via event handler
  };

  return (
    <AudioPlayerProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header - visible on both mobile and desktop */}
        <ChatHeader messageCount={messages.length} onNewChat={handleNewChat} />

        {/* Sidebar */}
        <Sidebar 
          onClearChat={handleClearConversation}
          messageCount={messages.length}
          onChatSwitchAttempt={confirmNavigation}
        />

      {/* Content wrapper - accounts for sidebar width and centers content */}
      <div
        style={{
          marginLeft: isMobile ? "0" : (isSidebarCollapsed ? "64px" : "280px"),
          marginRight: isMobile ? "0" : "0",
          transition: "margin-left 0.2s ease-in-out",
          width: isMobile ? "100%" : `calc(100% - ${isSidebarCollapsed ? "64px" : "280px"})`,
          height: isMobile ? "100dvh" : "calc(100vh - 57px)", // Use dynamic viewport height on mobile
          marginTop: isMobile ? "0" : "57px", // Start at top on mobile
          display: "flex",
          justifyContent: "center",
          overflow: "hidden",
          position: isMobile ? "fixed" : "relative", // Fix position on mobile to prevent scroll
          top: isMobile ? "0" : "auto",
          left: isMobile ? "0" : "auto",
          right: isMobile ? "0" : "auto",
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
            <div ref={scrollContainerRef} style={{ height: "100%", overflowY: "auto", minHeight: 0 }}>
              {messages.length === 0 && !loading ? (
                <StarterPrompts 
                  onPromptSelect={handleStarterPromptSelect}
                />
              ) : (
                <MessageList
                  messages={messages}
                  loading={loading}
                  videoFile={videoFile}
                  progressStage={progressStage}
                  uploadProgress={uploadProgress}
                  messagesEndRef={messagesEndRef}
                  onAskForHelp={handleAskForHelp}
                />
              )}
            </div>
            
            {/* Scroll to video button */}
            {messages.length > 0 && (
              <ScrollToVideo 
                scrollContainerRef={scrollContainerRef}
              />
            )}
            
            {/* Scroll to bottom button */}
            {messages.length > 0 && (
              <ScrollToBottom 
                scrollContainerRef={scrollContainerRef}
                onScrollToBottom={() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            )}
            
            {/* Audio stop button */}
            <AudioStopButton 
              scrollContainerRef={scrollContainerRef}
              scrollButtonVisible={messages.length > 0}
            />
            
            {/* Bottom fade overlay - fades content at bottom - only show when there are messages */}
            {messages.length > 0 && (
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
            )}
          </div>

          {/* Input area - docked at bottom */}
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
          />
        </div>
      </div>

      {/* Toast for error notifications */}
      <ErrorToast error={error} />

      {/* Alert Dialog for navigation warning */}
      <AlertDialog.Root open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCancel();
        }
      }}>
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Leave this page?</AlertDialog.Title>
          <AlertDialog.Description size="2">
            A response is being generated. Are you sure you want to leave?
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray" onClick={handleCancel}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" color="red" onClick={handleConfirm}>
                Leave
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
      </div>
    </AudioPlayerProvider>
  );
}
