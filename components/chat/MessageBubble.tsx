"use client";

import { useRef, useEffect, useState } from "react";
import { Avatar, Box, Flex, Spinner, Text } from "@radix-ui/themes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "@/components/markdown/markdown-components";
import type { Message } from "@/types/chat";
import { getDeveloperMode } from "@/utils/storage";
import { calculatePricing, formatCost } from "@/lib/token-utils";

const THINKING_MESSAGES = [
  "Initializing environment model…",
  "Detecting participants…",
  "Estimating motion paths…",
  "Understanding interaction dynamics…",
  "Reconstructing event timeline…",
  "Identifying key actions…",
  "Measuring performance indicators…",
  "Extracting behavioral patterns…",
  "Evaluating technique signatures…",
  "Computing tactical insights…",
  "Generating summary…",
];

interface MessageBubbleProps {
  message: Message;
  allMessages?: Message[];
  messageIndex?: number;
}

export function MessageBubble({ message, allMessages = [], messageIndex = 0 }: MessageBubbleProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [thinkingMessageIndex, setThinkingMessageIndex] = useState(0);
  const [developerMode, setDeveloperMode] = useState(false);

  // Load developer mode on mount
  useEffect(() => {
    setDeveloperMode(getDeveloperMode());
    
    // Listen for developer mode changes
    const handleStorageChange = () => {
      setDeveloperMode(getDeveloperMode());
    };
    
    window.addEventListener("storage", handleStorageChange);
    // Also listen for custom event from Sidebar
    window.addEventListener("developer-mode-change", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("developer-mode-change", handleStorageChange);
    };
  }, []);

  // Calculate cumulative tokens up to this message
  // Only count assistant messages for cumulative (they represent actual API calls)
  // User message tokens are already included in assistant message input tokens
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

  // Use S3 URL if available, otherwise fall back to preview (blob URL)
  const videoSrc = message.videoUrl || message.videoPreview;
  
  // Show video if we have a video URL, preview, file, or S3 key (for persisted videos)
  const hasVideo = !!(message.videoUrl || message.videoPreview || message.videoFile || message.videoS3Key);
  
  // Check if any previous user messages (until we hit an assistant message) have a video
  // This checks all user messages in the current conversation thread
  const userSentVideo = (() => {
    if (message.role !== "assistant" || messageIndex === 0) return false;
    // Look backwards from current message until we hit an assistant message
    for (let i = messageIndex - 1; i >= 0; i--) {
      const prevMessage = allMessages[i];
      if (prevMessage.role === "assistant") {
        // Stop when we hit an assistant message - we've checked all user messages in this thread
        return false;
      }
      if (prevMessage.role === "user") {
        // Check if this user message has a video
        const hasVideo = !!(prevMessage.videoUrl || prevMessage.videoPreview || prevMessage.videoFile || prevMessage.videoS3Key);
        if (hasVideo) {
          return true;
        }
        // Continue checking previous user messages
      }
    }
    return false;
  })();
  
  // Rotate thinking messages every 3 seconds (only when user sent a video)
  useEffect(() => {
    if (!message.content && message.role === "assistant" && userSentVideo) {
      const interval = setInterval(() => {
        setThinkingMessageIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [message.content, message.role, userSentVideo]);

  useEffect(() => {
    // Check if this is a video (not an image)
    const isImage = message.videoFile?.type.startsWith("image/") || 
                    (message.videoUrl && message.videoUrl.match(/\.(jpg|jpeg|png|gif|webp)/i));
    
    if (videoRef.current && hasVideo && !isImage) {
      const video = videoRef.current;
      
      // Set muted explicitly for autoplay
      video.muted = true;
      
      const playVideo = async () => {
        try {
          if (video.readyState >= 3) {
            await video.play();
          }
        } catch (error) {
          // Autoplay was prevented, but that's okay - user can still play manually
          console.log("Autoplay prevented:", error);
        }
      };

      const handleCanPlay = () => {
        playVideo();
      };

      const handleLoadedData = () => {
        playVideo();
      };

      // Add event listeners
      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("loadeddata", handleLoadedData);
      
      // Try to play if video is already loaded
      if (video.readyState >= 3) {
        playVideo();
      }

      return () => {
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("loadeddata", handleLoadedData);
      };
    }
  }, [hasVideo, message.videoFile, message.videoUrl]);

  return (
    <Flex
      gap="4"
      justify={message.role === "user" ? "end" : "start"}
      role="article"
      aria-label={`Message from ${message.role === "user" ? "user" : "assistant"}`}
    >
      {message.role === "assistant" && (
        <Avatar
          size="2"
          radius="full"
          src="https://res.cloudinary.com/djtxhrly7/image/upload/v1763589692/sai-icon_s0u6ni.png"
          fallback="AI"
          style={{
            backgroundColor: "white",
            border: "2px solid var(--mint-6)",
          }}
        />
      )}

      <Box
        style={{
          maxWidth: "80%",
          borderRadius: message.role === "user" && !hasVideo
            ? "24px 8px 24px 24px" 
            : "var(--radius-3)",
          padding: message.role === "user" && hasVideo ? "0" : "var(--space-3) var(--space-4)",
          backgroundColor:
            message.role === "user"
              ? "transparent"
              : "transparent",
          color:
            message.role === "user"
              ? "white"
              : "var(--gray-12)",
          border: message.role === "user" ? "1px solid var(--mint-6)" : "none",
        }}
        role={message.role === "user" ? "user-message" : "assistant-message"}
      >
        {message.role === "user" && (
          <Box>
            {/* Show video if present - always show if user provided a video */}
            {hasVideo ? (
              <Box 
                mb={message.content.trim() ? "2" : "0"}
                style={{
                  overflow: "hidden",
                  borderRadius: "var(--radius-3)",
                }}
              >
                {message.videoFile?.type.startsWith("image/") || (message.videoUrl && message.videoUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)) ? (
                  <img
                    src={videoSrc || undefined}
                    alt="Uploaded image"
                    style={{
                      maxWidth: "100%",
                      display: "block",
                    }}
                  />
                ) : videoSrc ? (
                  <Box
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "16 / 9",
                      backgroundColor: "var(--gray-3)",
                    }}
                  >
                    <video
                      ref={videoRef}
                      src={videoSrc}
                      controls
                      autoPlay
                      muted
                      playsInline
                      preload="metadata"
                      onError={(e) => {
                        console.error("Video playback error:", e);
                        const video = e.currentTarget;
                        console.error("Video error details:", {
                          error: video.error,
                          networkState: video.networkState,
                          readyState: video.readyState,
                          src: video.src,
                        });
                      }}
                      onLoadStart={() => {
                        console.log("Video load started:", videoSrc);
                      }}
                      onLoadedMetadata={() => {
                        console.log("Video metadata loaded");
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </Box>
                ) : (
                  <Box
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "16 / 9",
                      backgroundColor: "var(--gray-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text size="2" color="gray">Loading video...</Text>
                  </Box>
                )}
              </Box>
            ) : null}
            {/* Show text if present */}
            {message.content.trim() && (
              <Text style={{ whiteSpace: "pre-wrap" }}>{message.content}</Text>
            )}
          </Box>
        )}

        {message.role === "assistant" && (
          <Box style={{ maxWidth: "none" }}>
            <Box className="prose dark:prose-invert" style={{ maxWidth: "none" }}>
              {message.content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                <Flex gap="2" align="center">
                  <Spinner size="1" />
                  <Text color="gray">{userSentVideo ? THINKING_MESSAGES[thinkingMessageIndex] : "thinking…"}</Text>
                </Flex>
              )}
            </Box>
            
            {/* Developer mode token information */}
            {developerMode && message.content && (messageTokens.input > 0 || messageTokens.output > 0) && (
              <Box
                mt="3"
                pt="3"
                style={{
                  borderTop: "1px solid var(--gray-6)",
                  fontSize: "var(--font-size-1)",
                  color: "var(--gray-11)",
                }}
              >
                <Flex direction="column" gap="2">
                  <Text size="1" weight="medium" color="gray">
                    Token Usage (Developer Mode)
                  </Text>
                  <Flex direction="column" gap="1" pl="2">
                    <Text size="1">
                      <strong>This message:</strong>{" "}
                      {messageTokens.input > 0 && `${messageTokens.input.toLocaleString()} input`}
                      {messageTokens.input > 0 && messageTokens.output > 0 && " + "}
                      {messageTokens.output > 0 && `${messageTokens.output.toLocaleString()} output`}
                      {messageTokens.input === 0 && messageTokens.output === 0 && "N/A"}
                      {messagePricing && ` (${formatCost(messagePricing.totalCost)})`}
                    </Text>
                    <Text size="1">
                      <strong>Total in chat:</strong>{" "}
                      {cumulativeTokens.input > 0 && `${cumulativeTokens.input.toLocaleString()} input`}
                      {cumulativeTokens.input > 0 && cumulativeTokens.output > 0 && " + "}
                      {cumulativeTokens.output > 0 && `${cumulativeTokens.output.toLocaleString()} output`}
                      {cumulativePricing && ` (${formatCost(cumulativePricing.totalCost)})`}
                    </Text>
                  </Flex>
                </Flex>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Flex>
  );
}

