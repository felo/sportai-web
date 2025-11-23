"use client";

import { useRef, useEffect, useState } from "react";
import { Avatar, Box, Button, Flex, Spinner, Text } from "@radix-ui/themes";
import { MarkdownWithSwings } from "@/components/markdown";
import type { Message } from "@/types/chat";
import { getDeveloperMode, getTheatreMode, getCurrentChatId } from "@/utils/storage";
import { calculatePricing, formatCost } from "@/lib/token-utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { VideoPoseViewer } from "./VideoPoseViewer";
import { StreamingIndicator } from "./StreamingIndicator";
import buttonStyles from "@/styles/buttons.module.css";

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

const PRO_UPSELL_SHOWN_KEY = "sportai-pro-upsell-shown";

/**
 * Check if PRO upsell has been shown for a specific chat
 */
function hasShownProUpsell(chatId: string | undefined): boolean {
  if (typeof window === "undefined" || !chatId) {
    return false;
  }
  
  try {
    const stored = localStorage.getItem(PRO_UPSELL_SHOWN_KEY);
    if (!stored) return false;
    
    const shownChats = JSON.parse(stored) as string[];
    return shownChats.includes(chatId);
  } catch (error) {
    console.error("Failed to check PRO upsell status:", error);
    return false;
  }
}

/**
 * Mark that PRO upsell has been shown for a specific chat
 */
function markProUpsellShown(chatId: string | undefined): void {
  if (typeof window === "undefined" || !chatId) {
    return;
  }
  
  try {
    const stored = localStorage.getItem(PRO_UPSELL_SHOWN_KEY);
    let shownChats: string[] = stored ? JSON.parse(stored) : [];
    
    if (!shownChats.includes(chatId)) {
      shownChats.push(chatId);
      // Keep only the last 100 chat IDs to prevent localStorage from growing too large
      if (shownChats.length > 100) {
        shownChats = shownChats.slice(-100);
      }
      localStorage.setItem(PRO_UPSELL_SHOWN_KEY, JSON.stringify(shownChats));
    }
  } catch (error) {
    console.error("Failed to mark PRO upsell as shown:", error);
  }
}

interface MessageBubbleProps {
  message: Message;
  allMessages?: Message[];
  messageIndex?: number;
  onAskForHelp?: (termName: string) => void;
}

export function MessageBubble({ message, allMessages = [], messageIndex = 0, onAskForHelp }: MessageBubbleProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [thinkingMessageIndex, setThinkingMessageIndex] = useState(0);
  const [developerMode, setDeveloperMode] = useState(false);
  const [theatreMode, setTheatreMode] = useState(true);
  const [showProUpsell, setShowProUpsell] = useState(false);
  const [videoContainerStyle, setVideoContainerStyle] = useState<React.CSSProperties>({});
  const isMobile = useIsMobile();

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

  // Determine if we should show pose detection
  // We now show VideoPoseViewer on mobile as well so users can toggle the AI overlay on/off.
  // The overlay button will be visible, and users can control whether to enable pose detection.
  // NOTE: We always render VideoPoseViewer (on both mobile and desktop) to show the toggle button.
  const showPoseViewer = true;

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
  // Prioritize S3 URL to avoid revoked blob URL errors
  const videoSrc = message.videoUrl || (message.videoPreview && !message.videoUrl ? message.videoPreview : null);
  
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

  // Intelligent preloading: Load pose detection components when video is present
  // This ensures components are ready by the time user wants to enable pose detection
  useEffect(() => {
    if (hasVideo) {
      // Preload VideoPoseViewer and its TensorFlow dependencies
      import("./VideoPoseViewer");
      // Also preload Pose3DViewer (Three.js) for BlazePose 3D mode
      import("./Pose3DViewer");
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

  useEffect(() => {
    // Check if this is a video (not an image)
    const isImage = message.videoFile?.type.startsWith("image/") || 
                    (message.videoUrl && message.videoUrl.match(/\.(jpg|jpeg|png|gif|webp)/i));
    
    if (videoRef.current && hasVideo && !isImage) {
      const video = videoRef.current;
      
      // Set muted explicitly for autoplay
      video.muted = true;
      
      // Set playback speed if specified in the message
      if (message.videoPlaybackSpeed !== undefined) {
        video.playbackRate = message.videoPlaybackSpeed;
      }
      
      const handleLoadedMetadata = () => {
        if (theatreMode && video.videoWidth && video.videoHeight) {
          // Calculate max height: 50vh for portrait videos in theatre mode
          const maxHeight = window.innerHeight * 0.5;
          
          // Calculate dimensions respecting aspect ratio and max height
          const aspectRatio = video.videoWidth / video.videoHeight;
          
          if (video.videoHeight > video.videoWidth) {
            // Portrait video - height is the limiting factor
            // Constrain by height and center horizontally
            const constrainedHeight = Math.min(maxHeight, video.videoHeight);
            const constrainedWidth = constrainedHeight * aspectRatio;
            
            setVideoContainerStyle({
              position: "relative",
              width: `${constrainedWidth}px`,
              height: `${constrainedHeight}px`,
              backgroundColor: "var(--gray-3)",
              margin: "0 auto", // Center the video
              maxWidth: "100%", // Ensure it doesn't overflow on small screens
            });
          } else {
            // Landscape video - width is 100%, height auto-calculated with max constraint
            setVideoContainerStyle({
              position: "relative",
              width: "100%",
              maxHeight: `${maxHeight}px`,
              aspectRatio: `${aspectRatio}`,
              backgroundColor: "var(--gray-3)",
            });
          }
        } else {
          // Non-theatre mode: use standard 16:9
          setVideoContainerStyle({
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 9",
            backgroundColor: "var(--gray-3)",
          });
        }
      };
      
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
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("loadeddata", handleLoadedData);
      
      // Try to calculate dimensions if video is already loaded
      if (video.readyState >= 1) {
        handleLoadedMetadata();
      }
      
      // Try to play if video is already loaded
      if (video.readyState >= 3) {
        playVideo();
      }

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("loadeddata", handleLoadedData);
      };
    }
  }, [hasVideo, message.videoFile, message.videoUrl, message.videoPlaybackSpeed, theatreMode]);

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
          width: isMobile && message.role === "user"
            ? "100%"
            : "auto",
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
              ? "var(--gray-12)" // Use Radix UI text color - works in both light and dark
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
                  overflow: "visible",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  alignItems: "center",
                }}
              >
                {message.videoFile?.type.startsWith("image/") || (message.videoUrl && message.videoUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)) ? (
                  <img
                    src={videoSrc || undefined}
                    alt="Uploaded image"
                    onError={(e) => {
                      // Handle revoked blob URL errors gracefully
                      if (videoSrc?.startsWith("blob:")) {
                        console.warn("Image blob URL revoked or invalid:", videoSrc);
                        e.currentTarget.style.display = "none";
                      }
                    }}
                    style={{
                      maxWidth: "100%",
                      maxHeight: theatreMode ? "50vh" : "auto",
                      display: "block",
                      objectFit: "contain",
                      margin: "0 auto",
                      borderRadius: "var(--radius-3)",
                    }}
                  />
                ) : videoSrc ? (
                  <Box
                    style={
                      Object.keys(videoContainerStyle).length === 0
                        ? {
                            position: "relative",
                            width: "100%",
                            backgroundColor: "var(--gray-3)",
                            overflow: "hidden",
                            borderRadius: "var(--radius-3)",
                          }
                        : videoContainerStyle
                    }
                  >
                    {showPoseViewer ? (
                      <VideoPoseViewer
                        videoUrl={videoSrc}
                        autoPlay
                        initialModel={message.poseData?.model ?? "MoveNet"}
                        initialShowSkeleton={message.poseData?.showSkeleton ?? true}
                        initialShowAngles={message.poseData?.showAngles ?? false}
                        initialMeasuredAngles={message.poseData?.defaultAngles ?? []}
                        initialPlaybackSpeed={message.videoPlaybackSpeed}
                        initialUseAccurateMode={message.poseData?.useAccurateMode ?? false}
                        initialConfidenceMode={message.poseData?.confidenceMode ?? "standard"}
                        initialResolutionMode={message.poseData?.resolutionMode ?? "balanced"}
                        initialShowTrackingId={message.poseData?.showTrackingId ?? false}
                        initialShowTrajectories={message.poseData?.showTrajectories ?? false}
                        initialSelectedJoints={message.poseData?.selectedJoints ?? [9, 10]}
                        initialShowVelocity={message.poseData?.showVelocity ?? false}
                        initialVelocityWrist={message.poseData?.velocityWrist ?? "right"}
                        initialPoseEnabled={message.poseData?.enabled ?? false}
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        src={videoSrc}
                        controls
                        autoPlay
                        muted
                        playsInline
                        preload="metadata"
                        onError={(e) => {
                          const video = e.currentTarget;
                          // Check if this is a blob URL error (revoked blob)
                          // Revoked blob URLs typically result in network errors or src not supported errors
                          if (video.src.startsWith("blob:")) {
                            console.warn("Blob URL revoked or invalid, video may have been cleared:", video.src);
                            // Don't log as error for revoked blob URLs - this is expected behavior
                            // The video element will just fail to load, which is fine
                          } else {
                            console.error("Video playback error:", e);
                            console.error("Video error details:", {
                              error: video.error,
                              networkState: video.networkState,
                              readyState: video.readyState,
                              src: video.src,
                            });
                          }
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
                    )}
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
              <Box
                style={{
                  ...(isMobile && theatreMode && hasVideo && Object.keys(videoContainerStyle).length > 0
                    ? {
                        width: videoContainerStyle.width,
                        margin: "0 auto",
                        padding: "var(--space-3) var(--space-4)",
                      }
                    : {
                        padding: "var(--space-3) var(--space-4)",
                      }),
                }}
              >
                <Text 
                  style={{ 
                    whiteSpace: "pre-wrap",
                    color: "inherit", // Inherit from parent Box which uses var(--gray-12)
                  }}
                >
                  {message.content}
                </Text>
              </Box>
            )}
          </Box>
        )}

        {message.role === "assistant" && (
          <Box style={{ maxWidth: "none" }}>
            <Box className="prose dark:prose-invert" style={{ maxWidth: "none" }}>
              {message.content ? (
                <>
                  <MarkdownWithSwings onAskForHelp={onAskForHelp}>
                    {message.content}
                  </MarkdownWithSwings>
                  {message.isStreaming && (
                    <>
                      {console.log("[MessageBubble] Rendering StreamingIndicator for message:", message.id)}
                      <StreamingIndicator />
                    </>
                  )}
                </>
              ) : (
                <Flex gap="2" align="center">
                  <Spinner size="1" />
                  <Text color="gray">{userSentVideo ? THINKING_MESSAGES[thinkingMessageIndex] : "thinking…"}</Text>
                </Flex>
              )}
            </Box>
            
            {/* PRO Membership Upsell */}
            {showProUpsell && (
              <Box
                mt="4"
                style={{
                  opacity: 0,
                  animation: "fadeInUpsell 0.5s ease-in forwards",
                }}
              >
                {/* Custom separator reusing markdown divider design */}
                <div className="markdown-divider" role="separator" aria-label="Section divider">
                  <div className="markdown-divider-line" />
                  <span className="markdown-divider-dots" aria-hidden="true">
                    •••
                  </span>
                  <div className="markdown-divider-line" />
                </div>
                
                <Flex direction="column" gap="3" mt="4">
                  <Flex direction="column" gap="2">
                    <Text size="3" weight="medium">
                      Want more accuracy and deeper insights?
                    </Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                      Upgrade to SportAI PRO for enhanced analysis, more detailed data, and advanced features tailored to your needs.
                    </Text>
                  </Flex>
                  <Button
                    size="2"
                    variant="soft"
                    className={buttonStyles.actionButton}
                    onClick={() => {
                      window.open("https://sportai.com/contact", "_blank", "noopener,noreferrer");
                    }}
                    style={{ width: "fit-content", cursor: "pointer" }}
                  >
                    Contact us for PRO
                  </Button>
                </Flex>
              </Box>
            )}
            
            <style jsx>{`
              @keyframes fadeInUpsell {
                from {
                  opacity: 0;
                  transform: translateY(10px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}</style>
            
            {/* Developer mode token information */}
            {developerMode && message.content && (
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
                    Developer Mode
                  </Text>
                  <Flex direction="column" gap="1" pl="2">
                    {(messageTokens.input > 0 || messageTokens.output > 0) && (
                      <>
                        <Text size="1">
                          <strong>Token usage (this message):</strong>{" "}
                          {messageTokens.input > 0 && `${messageTokens.input.toLocaleString()} input`}
                          {messageTokens.input > 0 && messageTokens.output > 0 && " + "}
                          {messageTokens.output > 0 && `${messageTokens.output.toLocaleString()} output`}
                          {messageTokens.input === 0 && messageTokens.output === 0 && "N/A"}
                          {messagePricing && ` (${formatCost(messagePricing.totalCost)})`}
                        </Text>
                        <Text size="1">
                          <strong>Token usage (total in chat):</strong>{" "}
                          {cumulativeTokens.input > 0 && `${cumulativeTokens.input.toLocaleString()} input`}
                          {cumulativeTokens.input > 0 && cumulativeTokens.output > 0 && " + "}
                          {cumulativeTokens.output > 0 && `${cumulativeTokens.output.toLocaleString()} output`}
                          {cumulativePricing && ` (${formatCost(cumulativePricing.totalCost)})`}
                        </Text>
                      </>
                    )}
                    {message.responseDuration !== undefined && (
                      <Text size="1">
                        <strong>Response time:</strong> {message.responseDuration.toLocaleString()}ms ({(message.responseDuration / 1000).toFixed(2)}s)
                      </Text>
                    )}
                    {message.modelSettings && (
                      <Text size="1">
                        <strong>Settings:</strong> Thinking={message.modelSettings.thinkingMode}, Resolution={message.modelSettings.mediaResolution}
                      </Text>
                    )}
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

