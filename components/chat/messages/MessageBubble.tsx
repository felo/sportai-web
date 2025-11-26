"use client";

import { useEffect, useState } from "react";
import { Avatar, Box, Flex } from "@radix-ui/themes";
import type { Message } from "@/types/chat";
import { getDeveloperMode, getTheatreMode, getCurrentChatId } from "@/utils/storage";
import { calculatePricing } from "@/lib/token-utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { FeedbackToast } from "@/components/ui/FeedbackToast";
import { ProUpsellBanner, DeveloperInfo, UserMessage, AssistantMessage } from "./components";
import { hasShownProUpsell, markProUpsellShown, THINKING_MESSAGES } from "./utils";

interface MessageBubbleProps {
  message: Message;
  allMessages?: Message[];
  messageIndex?: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  onAskForHelp?: (termName: string, swing?: any) => void;
  onUpdateMessage?: (messageId: string, updates: Partial<Message>) => void;
  onRetryMessage?: (messageId: string) => void;
  isRetrying?: boolean;
}

export function MessageBubble({ message, allMessages = [], messageIndex = 0, scrollContainerRef, onAskForHelp, onUpdateMessage, onRetryMessage, isRetrying }: MessageBubbleProps) {
  const [thinkingMessageIndex, setThinkingMessageIndex] = useState(0);
  const [developerMode, setDeveloperMode] = useState(false);
  const [theatreMode, setTheatreMode] = useState(true);
  const [showProUpsell, setShowProUpsell] = useState(false);
  const [videoContainerStyle, setVideoContainerStyle] = useState<React.CSSProperties>({});
  const [showFeedbackToast, setShowFeedbackToast] = useState(false);
  const [ttsUsage, setTtsUsage] = useState(message.ttsUsage || {
    totalCharacters: 0,
    totalCost: 0,
    requestCount: 0,
    voiceQuality: '',
  });
  const isMobile = useIsMobile();

  // Callback to track TTS usage
  const handleTTSUsage = (characters: number, cost: number, quality: string) => {
    setTtsUsage((prev) => ({
      totalCharacters: prev.totalCharacters + characters,
      totalCost: prev.totalCost + cost,
      requestCount: prev.requestCount + 1,
      voiceQuality: quality,
    }));
  };

  // Save TTS usage to message when it changes
  useEffect(() => {
    if (ttsUsage.requestCount > 0 && onUpdateMessage) {
      onUpdateMessage(message.id, { ttsUsage });
    }
  }, [ttsUsage, message.id, onUpdateMessage]);

  // Load developer mode and theatre mode on mount
  useEffect(() => {
    setDeveloperMode(getDeveloperMode());
    setTheatreMode(getTheatreMode());
    
    // Listen for developer mode changes
    const handleDeveloperModeChange = () => {
      setDeveloperMode(getDeveloperMode());
    };
    
    // Listen for theatre mode changes
    const handleTheatreModeChange = () => {
      setTheatreMode(getTheatreMode());
    };
    
    window.addEventListener("storage", handleDeveloperModeChange);
    window.addEventListener("developer-mode-change", handleDeveloperModeChange);
    window.addEventListener("theatre-mode-change", handleTheatreModeChange);
    
    return () => {
      window.removeEventListener("storage", handleDeveloperModeChange);
      window.removeEventListener("developer-mode-change", handleDeveloperModeChange);
      window.removeEventListener("theatre-mode-change", handleTheatreModeChange);
    };
  }, []);

  // Show video if we have a video URL, preview, file, or S3 key (for persisted videos)
  const hasVideo = !!(message.videoUrl || message.videoPreview || message.videoFile || message.videoS3Key);
  
  // Check if any previous user messages (until we hit an assistant message) have a video
  const userSentVideo = (() => {
    if (message.role !== "assistant" || messageIndex === 0) return false;
    // Look backwards from current message until we hit an assistant message
    for (let i = messageIndex - 1; i >= 0; i--) {
      const prevMessage = allMessages[i];
      if (prevMessage.role === "assistant") {
        return false;
      }
      if (prevMessage.role === "user") {
        const hasVideo = !!(prevMessage.videoUrl || prevMessage.videoPreview || prevMessage.videoFile || prevMessage.videoS3Key);
        if (hasVideo) {
          return true;
        }
      }
    }
    return false;
  })();
  
  // Calculate cumulative tokens up to this message
  const cumulativeTokens = allMessages.slice(0, messageIndex + 1).reduce(
    (acc, msg) => {
      if (msg.role === "assistant") {
        if (msg.inputTokens) acc.input += msg.inputTokens;
        if (msg.outputTokens) acc.output += msg.outputTokens;
      }
      return acc;
    },
    { input: 0, output: 0 }
  );

  // Calculate cumulative TTS usage up to this message
  const cumulativeTTSUsage = allMessages.slice(0, messageIndex + 1).reduce(
    (acc, msg) => {
      if (msg.role === "assistant" && msg.ttsUsage) {
        acc.characters += msg.ttsUsage.totalCharacters;
        acc.cost += msg.ttsUsage.totalCost;
        acc.requests += msg.ttsUsage.requestCount;
      }
      return acc;
    },
    { characters: 0, cost: 0, requests: 0 }
  );

  // Add current message's TTS usage (from state)
  const totalTTSUsage = {
    characters: cumulativeTTSUsage.characters + ttsUsage.totalCharacters,
    cost: cumulativeTTSUsage.cost + ttsUsage.totalCost,
    requests: cumulativeTTSUsage.requests + ttsUsage.requestCount,
  };

  // Calculate tokens for this specific message
  const messageTokens = {
    input: message.inputTokens || 0,
    output: message.outputTokens || 0,
  };

  // Calculate pricing for this message and cumulative
  const messagePricing = messageTokens.input > 0 || messageTokens.output > 0
    ? calculatePricing(messageTokens.input, messageTokens.output)
    : null;
  const cumulativePricing = cumulativeTokens.input > 0 || cumulativeTokens.output > 0
    ? calculatePricing(cumulativeTokens.input, cumulativeTokens.output)
    : null;
  
  // Rotate thinking messages every 3 seconds (only when user sent a video)
  useEffect(() => {
    if (!message.content && message.role === "assistant" && userSentVideo) {
      const interval = setInterval(() => {
        setThinkingMessageIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [message.content, message.role, userSentVideo]);

  // Intelligent preloading: Load pose detection components when video is present
  useEffect(() => {
    if (hasVideo) {
      // Preload VideoPoseViewer and its TensorFlow dependencies
      import("../viewers/VideoPoseViewer");
      // Also preload Pose3DViewer (Three.js) for BlazePose 3D mode
      import("../viewers/Pose3DViewer");
    }
  }, [hasVideo]);

  // Show PRO upsell after message is complete with a natural delay (only once per chat)
  useEffect(() => {
    if (message.role === "assistant" && message.content) {
      const chatId = getCurrentChatId();
      
      // Don't show PRO upsell for video size limit errors
      if (message.isVideoSizeLimitError) {
        setShowProUpsell(false);
        return;
      }
      
      // Check if we've already shown the upsell for this chat
      if (hasShownProUpsell(chatId)) {
        setShowProUpsell(false);
        return;
      }
      
      // Reset first in case message is being re-rendered
      setShowProUpsell(false);
      // Add a delay for natural appearance (1 second after content appears)
      const timer = setTimeout(() => {
        setShowProUpsell(true);
        // Mark as shown for this chat
        markProUpsellShown(chatId);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setShowProUpsell(false);
    }
  }, [message.content, message.role, message.isVideoSizeLimitError]);

  // Set video container style - simplified, let VideoPoseViewer handle its own sizing
  useEffect(() => {
    if (!hasVideo) return;
    
    const isImage = message.videoFile?.type.startsWith("image/") || 
                    (message.videoUrl && message.videoUrl.match(/\.(jpg|jpeg|png|gif|webp)/i));
    
    if (isImage) return;

    // Simple container style - the video viewer handles aspect ratio internally
    setVideoContainerStyle({
      position: "relative",
      width: "100%",
      backgroundColor: "var(--gray-3)",
      borderRadius: "var(--radius-3)",
      overflow: "hidden",
    });
  }, [hasVideo, message.videoFile, message.videoUrl]);

  return (
    <Flex
      gap={isMobile && message.role === "assistant" ? "0" : "4"}
      justify={message.role === "user" ? "end" : "start"}
      role="article"
      aria-label={`Message from ${message.role === "user" ? "user" : "assistant"}`}
    >
      {message.role === "assistant" && !isMobile && (
        <Avatar
          size="3"
          radius="full"
          src="https://res.cloudinary.com/djtxhrly7/image/upload/v1763679890/sai-logo-dark-green_ovhgj3.svg"
          fallback="AI"
          style={{
            backgroundColor: "white",
            border: "1px solid var(--mint-6)",
          }}
        />
      )}

      <Box
        style={{
          maxWidth: isMobile 
            ? "100%"
            : theatreMode && hasVideo
            ? "100%"
            : "80%",
          width: (isMobile || (theatreMode && hasVideo)) && message.role === "user"
            ? videoContainerStyle.width || "100%"
            : "auto",
          margin: (isMobile || (theatreMode && hasVideo)) && message.role === "user" && hasVideo
            ? "0 auto"
            : "0",
          borderRadius: message.role === "user" && !hasVideo
            ? "24px 8px 24px 24px" 
            : "var(--radius-3)",
          padding: message.role === "user" && hasVideo ? "0" : "var(--space-3) var(--space-4)",
          backgroundColor: "transparent",
          color: "var(--gray-12)",
          border: message.role === "user" ? "1px solid var(--mint-6)" : "none",
        }}
        role={message.role === "user" ? "user-message" : "assistant-message"}
      >
        {message.role === "user" && (
          <UserMessage
            message={message}
            videoContainerStyle={videoContainerStyle}
            theatreMode={theatreMode}
            isMobile={isMobile}
            scrollContainerRef={scrollContainerRef}
          />
        )}

        {message.role === "assistant" && (
          <Box style={{ maxWidth: "none" }}>
            <AssistantMessage
              messageId={message.id}
              content={message.content}
              isStreaming={message.isStreaming}
              isIncomplete={message.isIncomplete}
              thinkingMessage={userSentVideo ? THINKING_MESSAGES[thinkingMessageIndex] : "thinking…"}
              onAskForHelp={onAskForHelp}
              onTTSUsage={handleTTSUsage}
              onFeedback={() => setShowFeedbackToast(true)}
              onRetry={onRetryMessage ? () => onRetryMessage(message.id) : undefined}
              isRetrying={isRetrying}
            />
            
            {/* PRO Membership Upsell */}
            <ProUpsellBanner show={showProUpsell} />
            
            {/* Developer mode token information */}
            <DeveloperInfo
              show={developerMode && !!message.content}
              messageTokens={messageTokens}
              cumulativeTokens={cumulativeTokens}
              messagePricing={messagePricing}
              cumulativePricing={cumulativePricing}
              ttsUsage={ttsUsage}
              totalTTSUsage={totalTTSUsage}
              responseDuration={message.responseDuration}
              timeToFirstToken={message.timeToFirstToken}
              modelSettings={message.modelSettings}
            />
          </Box>
        )}
      </Box>
      
      {/* Feedback Toast */}
      <FeedbackToast 
        open={showFeedbackToast}
        onOpenChange={setShowFeedbackToast}
      />
    </Flex>
  );
}
