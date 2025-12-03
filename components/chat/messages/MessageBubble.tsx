"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar, Box, Flex, Text } from "@radix-ui/themes";
import type { Message, ProgressStage } from "@/types/chat";
import { getDeveloperMode, getTheatreMode, getCurrentChatId } from "@/utils/storage";
import { calculatePricing } from "@/lib/token-utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { FeedbackToast } from "@/components/ui/FeedbackToast";
import { ProUpsellBanner, DeveloperInfo, UserMessage, AssistantMessage, AnalysisOptionsMessage } from "./components";
import { hasShownProUpsell, markProUpsellShown, THINKING_MESSAGES_VIDEO, getThinkingMessage } from "./utils";

// CSS keyframes for avatar poke animation
const avatarPokeKeyframes = `
  @keyframes avatarBounce {
    0%, 100% { transform: translateY(0) scale(1); }
    15% { transform: translateY(-6px) scale(1.1); }
    30% { transform: translateY(0) scale(0.9); }
    45% { transform: translateY(-3px) scale(1.05); }
    60% { transform: translateY(0) scale(0.95); }
    75% { transform: translateY(-1px) scale(1.02); }
    90% { transform: translateY(0) scale(1); }
  }
  
  @keyframes avatarBubblePop {
    0% { opacity: 0; transform: scale(0.5) translateX(-50%) translateY(5px); }
    50% { opacity: 1; transform: scale(1.1) translateX(-50%) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateX(-50%) translateY(0); }
  }
  
  @keyframes avatarBubbleFade {
    0% { opacity: 1; transform: scale(1) translateX(-50%); }
    100% { opacity: 0; transform: scale(0.8) translateX(-50%); }
  }
`;

interface MessageBubbleProps {
  message: Message;
  allMessages?: Message[];
  messageIndex?: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  onAskForHelp?: (termName: string, swing?: any) => void;
  onUpdateMessage?: (messageId: string, updates: Partial<Message>) => void;
  onRetryMessage?: (messageId: string) => void;
  isRetrying?: boolean;
  // Analysis options handlers
  onSelectProPlusQuick?: (messageId: string) => void;
  onSelectQuickOnly?: (messageId: string) => void;
  // Progress state for upload/processing/analyzing
  progressStage?: ProgressStage;
  uploadProgress?: number;
}

export function MessageBubble({ message, allMessages = [], messageIndex = 0, scrollContainerRef, onAskForHelp, onUpdateMessage, onRetryMessage, isRetrying, onSelectProPlusQuick, onSelectQuickOnly, progressStage = "idle", uploadProgress = 0 }: MessageBubbleProps) {
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
  
  // Avatar poke interaction state
  const [isPoked, setIsPoked] = useState(false);
  const [showPokeBubble, setShowPokeBubble] = useState(false);
  const [pokeBubbleFading, setPokeBubbleFading] = useState(false);
  
  const handleAvatarPoke = useCallback(() => {
    if (isPoked) return;
    
    setIsPoked(true);
    setShowPokeBubble(true);
    setPokeBubbleFading(false);
    
    // Reset bounce after animation completes
    setTimeout(() => {
      setIsPoked(false);
    }, 500);
    
    // Start fading the bubble
    setTimeout(() => {
      setPokeBubbleFading(true);
    }, 1500);
    
    // Hide bubble completely
    setTimeout(() => {
      setShowPokeBubble(false);
      setPokeBubbleFading(false);
    }, 1800);
  }, [isPoked]);

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
  
  // Check if this is an image-only message (not a video) - used for styling
  // Images get border but no padding, taking full space within the bubble
  const isImageOnly = (
    // S3 URL with image extension
    (message.videoUrl?.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/i)) ||
    // S3 key with image extension (for persisted images)
    (message.videoS3Key?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ||
    // Data URL image
    (message.videoPreview?.startsWith("data:image/")) ||
    // File type is image
    (message.videoFile?.type.startsWith("image/"))
  );
  
  // Check if this conversation involves a video (for showing progress bar during analysis)
  // Looks for any user message with video OR any analysis_options message in the conversation
  const userSentVideo = (() => {
    if (message.role !== "assistant" || messageIndex === 0) return false;
    
    // Look through ALL previous messages to find if this is a video analysis conversation
    for (let i = messageIndex - 1; i >= 0; i--) {
      const prevMessage = allMessages[i];
      
      // If there's an analysis_options message, this is definitely a video conversation
      if (prevMessage.messageType === "analysis_options") {
        return true;
      }
      
      // Check if any user message has a video
      if (prevMessage.role === "user") {
        const hasVideo = !!(prevMessage.videoUrl || prevMessage.videoPreview || prevMessage.videoFile || prevMessage.videoS3Key);
        if (hasVideo) {
          return true;
        }
      }
    }
    return false;
  })();
  
  // Check if this is the first assistant message in the conversation
  const isFirstAssistantMessage = (() => {
    if (message.role !== "assistant") return false;
    // Count assistant messages before this one
    const previousAssistantCount = allMessages
      .slice(0, messageIndex)
      .filter(m => m.role === "assistant").length;
    return previousAssistantCount === 0;
  })();
  
  // Check if this appears to be a complex query (for thinking message display)
  // Look at the most recent user message
  const isComplexQuery = (() => {
    if (message.role !== "assistant") return false;
    // Find the most recent user message
    for (let i = messageIndex - 1; i >= 0; i--) {
      const prevMessage = allMessages[i];
      if (prevMessage.role === "user" && prevMessage.content) {
        const content = prevMessage.content.toLowerCase();
        // Complex query indicators
        const complexPatterns = [
          /\b(compare|versus|vs\.?|difference)\b/,
          /\b(analyze|analyse|evaluate|review|assess)\b/,
          /\b(explain|why|how does|what causes)\b/,
          /\b(strategy|tactical|approach|technique)\b/,
          /\b(summarize|summary|overall|throughout)\b/,
          /\b(step by step|detailed|in-depth)\b/,
        ];
        return complexPatterns.some(p => p.test(content));
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
  
  // Rotate thinking messages every 3 seconds
  // Use different rotation speeds: faster for simple queries, slower for video/complex
  useEffect(() => {
    if (!message.content && message.role === "assistant") {
      // Only video or complex queries get deep thinking treatment
      // First message without video → quick response expected
      const useDeepThinking = userSentVideo || isComplexQuery;
      
      // Determine message set length based on context
      const messageCount = userSentVideo 
        ? THINKING_MESSAGES_VIDEO.length 
        : isComplexQuery ? 7 : 3; // DEEP vs QUICK counts
      
      // Rotate faster for simple queries (2s), slower for video/complex (3-4s)
      const rotationSpeed = userSentVideo ? 3000 : isComplexQuery ? 4000 : 2000;
      
      const interval = setInterval(() => {
        setThinkingMessageIndex((prev) => (prev + 1) % messageCount);
      }, rotationSpeed);
      
      return () => clearInterval(interval);
    }
  }, [message.content, message.role, userSentVideo, isComplexQuery]);

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
      
      // Don't show PRO upsell if this chat has PRO-eligible video analysis
      const hasProEligibleAnalysis = allMessages.some(m => 
        m.analysisOptions?.preAnalysis?.isProEligible || 
        m.analysisOptions?.preAnalysis?.isTechniqueLiteEligible
      );
      if (hasProEligibleAnalysis) {
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
  }, [message.content, message.role, message.isVideoSizeLimitError, allMessages]);

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
      backgroundColor: "transparent",
      borderRadius: "var(--radius-3)",
      overflow: "hidden",
    });
  }, [hasVideo, message.videoFile, message.videoUrl]);

  return (
    <>
      {/* Inject keyframes for avatar poke animation */}
      <style>{avatarPokeKeyframes}</style>
      
      <Flex
        gap={isMobile && message.role === "assistant" ? "0" : "4"}
        justify={message.role === "user" ? "end" : "start"}
        role="article"
        aria-label={`Message from ${message.role === "user" ? "user" : "assistant"}`}
        data-message-id={message.id}
      >
        {message.role === "assistant" && !isMobile && (
          <Box style={{ position: "relative", flexShrink: 0 }}>
            <Box
              onClick={handleAvatarPoke}
              style={{
                cursor: "pointer",
                animation: isPoked ? "avatarBounce 0.5s cubic-bezier(0.36, 0, 0.66, -0.56)" : "none",
              }}
            >
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
            </Box>
            
            {/* "Stop poking me!" speech bubble */}
            {showPokeBubble && (
              <Box
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: "50%",
                  backgroundColor: "var(--color-background)",
                  border: "2px solid var(--mint-9)",
                  borderRadius: "12px",
                  padding: "6px 12px",
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(34, 197, 94, 0.25)",
                  zIndex: 100,
                  animation: pokeBubbleFading 
                    ? "avatarBubbleFade 0.3s ease-out forwards" 
                    : "avatarBubblePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                }}
              >
                {/* Speech bubble pointer */}
                <Box
                  style={{
                    position: "absolute",
                    top: "-8px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: "8px solid transparent",
                    borderRight: "8px solid transparent",
                    borderBottom: "8px solid var(--mint-9)",
                  }}
                />
                <Box
                  style={{
                    position: "absolute",
                    top: "-5px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: "6px solid transparent",
                    borderRight: "6px solid transparent",
                    borderBottom: "6px solid var(--color-background)",
                  }}
                />
                <Text 
                  size="1" 
                  style={{ 
                    color: "var(--mint-11)",
                    fontWeight: 600,
                    fontSize: "12px",
                    letterSpacing: "0.02em",
                  }}
                >
                  Stop poking me!
                </Text>
              </Box>
            )}
          </Box>
        )}

        <Box
          style={{
            maxWidth: isMobile 
              ? "100%"
              : theatreMode && hasVideo && !isImageOnly
              ? "100%"
              : "80%",
            width: (isMobile || (theatreMode && hasVideo && !isImageOnly)) && message.role === "user"
              ? videoContainerStyle.width || "100%"
              : "auto",
            margin: (isMobile || (theatreMode && hasVideo && !isImageOnly)) && message.role === "user" && hasVideo && !isImageOnly
              ? "0 auto"
              : "0",
            // Text messages: asymmetric bubble corners, Videos & Images: slightly rounded
            borderRadius: message.role === "user" && !hasVideo && !isImageOnly
              ? "24px 8px 24px 24px" 
              : "var(--radius-3)",
            // Images: no padding (image fills to border), Videos: no padding, Text: padding
            padding: message.role === "user" && (hasVideo || isImageOnly) ? "0" : "var(--space-3) var(--space-4)",
            backgroundColor: "transparent",
            color: "var(--gray-12)",
            // Images get border, videos don't, text gets border
            border: message.role === "user" && (!hasVideo || isImageOnly) ? "1px solid var(--mint-6)" : "none",
            // For images, add overflow hidden so the image respects border radius
            overflow: isImageOnly ? "hidden" : undefined,
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
              onUpdateMessage={onUpdateMessage}
            />
          )}

          {message.role === "assistant" && (
            <Box style={{ maxWidth: "none" }}>
              {/* Analysis Options Message (PRO eligibility choice) */}
              {message.messageType === "analysis_options" && message.analysisOptions ? (
                <AnalysisOptionsMessage
                  preAnalysis={message.analysisOptions.preAnalysis}
                  selectedOption={message.analysisOptions.selectedOption}
                  onSelectProPlusQuick={() => onSelectProPlusQuick?.(message.id)}
                  onSelectQuickOnly={() => onSelectQuickOnly?.(message.id)}
                  isLoading={message.isStreaming}
                />
              ) : (
                <>
                  <AssistantMessage
                    messageId={message.id}
                    chatId={getCurrentChatId() || undefined}
                    content={message.content}
                    isStreaming={message.isStreaming}
                    isIncomplete={message.isIncomplete}
                    thinkingMessage={(() => {
                      // Show upload progress during uploading
                      if (progressStage === "uploading") {
                        return "Uploading video...";
                      }
                      // For processing/analyzing/generating, use the rotating thinking messages
                      // Note: During actual video CONVERSION, useAIApi sets message.content to 
                      // "Converting video format for analysis..." which will be shown instead of thinkingMessage
                      return getThinkingMessage(thinkingMessageIndex, {
                        hasVideo: userSentVideo,
                        isFirstMessage: false, // First message without video → treat as quick
                        isComplexQuery: isComplexQuery,
                      });
                    })()}
                    showProgressBar={userSentVideo && !message.content}
                    uploadProgress={progressStage === "uploading" ? uploadProgress : undefined}
                    onAskForHelp={onAskForHelp}
                    onTTSUsage={handleTTSUsage}
                    onFeedbackSubmitted={() => setShowFeedbackToast(true)}
                    onRetry={onRetryMessage ? () => onRetryMessage(message.id) : undefined}
                    isRetrying={isRetrying}
                  />
                  
                  {/* PRO Membership Upsell */}
                  <ProUpsellBanner show={showProUpsell} />
                </>
              )}
              
              {/* Developer mode token information */}
              <DeveloperInfo
                show={developerMode && (!!message.content || message.messageType === "analysis_options")}
                messageTokens={messageTokens}
                cumulativeTokens={cumulativeTokens}
                messagePricing={messagePricing}
                cumulativePricing={cumulativePricing}
                ttsUsage={ttsUsage}
                totalTTSUsage={totalTTSUsage}
                responseDuration={message.responseDuration}
                timeToFirstToken={message.timeToFirstToken}
                modelSettings={message.modelSettings}
                contextUsage={message.contextUsage}
                cacheUsed={message.cacheUsed}
                cacheName={message.cacheName}
                modelUsed={message.modelUsed}
                modelReason={message.modelReason}
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
    </>
  );
}
