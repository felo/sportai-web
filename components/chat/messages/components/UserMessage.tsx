"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Box, Text, Button } from "@radix-ui/themes";
import { VideoPoseViewer } from "../../viewers/VideoPoseViewer";
import { useFloatingVideoContextOptional } from "../../viewers/FloatingVideoContext";
import type { Message } from "@/types/chat";

interface UserMessageProps {
  message: Message;
  videoContainerStyle: React.CSSProperties;
  theatreMode: boolean;
  isMobile: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * User message component with video and text rendering
 * Supports floating video mode for picture-in-picture style viewing
 */
export function UserMessage({ message, videoContainerStyle, theatreMode, isMobile, scrollContainerRef }: UserMessageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoSrc = message.videoUrl || (message.videoPreview && !message.videoUrl ? message.videoPreview : null);
  const hasVideo = !!(message.videoUrl || message.videoPreview || message.videoFile || message.videoS3Key);
  const showPoseViewer = true; // Always show viewer so users can toggle AI overlay on/off
  
  // Check if this is an image (not a video)
  const isImage = message.videoFile?.type.startsWith("image/") || 
                  (message.videoUrl && message.videoUrl.match(/\.(jpg|jpeg|png|gif|webp)/i));
  
  // Floating video context (optional - won't error if not in provider)
  const floatingContext = useFloatingVideoContextOptional();
  
  // Track if this video should be floating
  const isThisVideoFloating = floatingContext?.activeVideoId === message.id && floatingContext?.isFloating;

  // Track floating state in refs to avoid stale closures in IntersectionObserver
  const isFloatingRef = useRef(false);
  const activeVideoIdRef = useRef<string | null>(null);
  const lastFloatChangeRef = useRef(0);
  const floatingContextRef = useRef(floatingContext);
  
  // Keep refs in sync with context
  useEffect(() => {
    isFloatingRef.current = floatingContext?.isFloating ?? false;
    activeVideoIdRef.current = floatingContext?.activeVideoId ?? null;
    floatingContextRef.current = floatingContext;
  }, [floatingContext?.isFloating, floatingContext?.activeVideoId, floatingContext]);

  // Register this video with the floating context (only once per videoSrc change)
  useEffect(() => {
    const ctx = floatingContextRef.current;
    if (!ctx || !videoContainerRef.current || !videoSrc || isImage) return;
    
    ctx.registerVideo(
      message.id,
      videoContainerRef as React.RefObject<HTMLElement>,
      videoSrc,
      () => null // renderContent not used with portal approach
    );
    
    return () => {
      ctx.unregisterVideo(message.id);
    };
    // Only depend on message.id and videoSrc, not the full context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id, videoSrc, isImage]);

  // IntersectionObserver to detect when video leaves viewport and should float
  useEffect(() => {
    const ctx = floatingContextRef.current;
    if (!ctx || !videoContainerRef.current || !videoSrc || isImage) return;
    
    const element = videoContainerRef.current;
    const DEBOUNCE_MS = 300; // Debounce rapid changes
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        const now = Date.now();
        // Debounce rapid state changes
        if (now - lastFloatChangeRef.current < DEBOUNCE_MS) {
          return;
        }
        
        // Float when less than 30% visible
        const shouldFloat = !entry.isIntersecting || entry.intersectionRatio < 0.3;
        
        // Use refs for current state to avoid stale closures
        const currentCtx = floatingContextRef.current;
        if (!currentCtx) return;
        
        if (shouldFloat && !isFloatingRef.current) {
          // Start floating this video
          lastFloatChangeRef.current = now;
          currentCtx.setActiveVideo(message.id);
          currentCtx.setFloating(true);
        } else if (!shouldFloat && activeVideoIdRef.current === message.id && isFloatingRef.current) {
          // Stop floating when video is back in view
          lastFloatChangeRef.current = now;
          currentCtx.setFloating(false);
        }
      },
      { threshold: [0, 0.3, 0.5, 1] }
    );

    observer.observe(element);
    return () => observer.disconnect();
    // Only set up observer once per video, use refs for state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id, videoSrc, isImage]);

  // Video autoplay logic for non-pose-viewer mode
  useEffect(() => {
    if (videoRef.current && hasVideo && !isImage) {
      const video = videoRef.current;
      
      // Set muted explicitly for autoplay
      video.muted = true;
      
      // Set playback speed if specified in the message
      if (message.videoPlaybackSpeed !== undefined) {
        video.playbackRate = message.videoPlaybackSpeed;
      }
      
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
  }, [hasVideo, isImage, message.videoFile, message.videoUrl, message.videoPlaybackSpeed]);

  // Render floating placeholder
  const renderFloatingPlaceholder = () => (
    <Box
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        backgroundColor: "var(--gray-3)",
        borderRadius: "var(--radius-3)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        border: "2px dashed var(--gray-6)",
      }}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--gray-9)" }}>
        <rect x="2" y="4" width="12" height="8" rx="1" />
        <rect x="10" y="12" width="12" height="8" rx="1" />
        <path d="M14 8h4v4" />
      </svg>
      <Text size="2" color="gray" align="center">
        Video is floating
      </Text>
      <Button
        size="1"
        variant="soft"
        onClick={() => {
          floatingContext?.closeFloating();
        }}
      >
        Return to video
      </Button>
    </Box>
  );

  return (
    <Box>
      {/* Show video if present */}
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
          {isImage ? (
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
              ref={videoContainerRef}
              data-video-container="true"
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
              {/* Show placeholder when this video is floating */}
              {isThisVideoFloating && renderFloatingPlaceholder()}
              
              {/* Render VideoPoseViewer - portal to floating container when floating */}
              {showPoseViewer ? (
                (() => {
                  const floatingContainer = floatingContext?.floatingContainerRef?.current;
                  const shouldPortal = isThisVideoFloating && floatingContainer;
                  
                  // Use controlled pose state from context to persist across docked/floating transitions
                  const videoPoseViewer = (
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
                      theatreMode={shouldPortal ? false : theatreMode}
                      hideTheatreToggle={shouldPortal}
                      // Controlled pose state from context - persists across docked/floating transitions
                      poseEnabled={floatingContext?.poseEnabled}
                      onPoseEnabledChange={floatingContext?.setPoseEnabled}
                    />
                  );
                  
                  if (shouldPortal) {
                    return createPortal(videoPoseViewer, floatingContainer);
                  }
                  
                  return videoPoseViewer;
                })()
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
                    if (video.src.startsWith("blob:")) {
                      console.warn("Blob URL revoked or invalid, video may have been cleared:", video.src);
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
            ...((isMobile || theatreMode) && hasVideo && Object.keys(videoContainerStyle).length > 0
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
              color: "inherit",
            }}
          >
            {message.content}
          </Text>
        </Box>
      )}
    </Box>
  );
}
