"use client";

import { useRef, useEffect, useState, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Box, Text, Button } from "@radix-ui/themes";
import { chatLogger } from "@/lib/logger";
import { VideoPoseViewer } from "../../viewers/VideoPoseViewer";
import { useFloatingVideoContextOptional } from "../../viewers/FloatingVideoContext";
import type { Message } from "@/types/chat";
import { videoLogger } from "@/lib/logger";

// Default aspect ratio fallback
const DEFAULT_ASPECT_RATIO = 16 / 9;

interface UserMessageProps {
  message: Message;
  videoContainerStyle: React.CSSProperties;
  theatreMode: boolean;
  isMobile: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  onUpdateMessage?: (id: string, updates: Partial<Message>) => void;
}

/**
 * User message component with video and text rendering
 * Supports floating video mode for picture-in-picture style viewing
 */
export function UserMessage({ message, videoContainerStyle, theatreMode, isMobile, scrollContainerRef, onUpdateMessage }: UserMessageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  // Prefer blob URL (videoPreview) over S3 URL (videoUrl) for same-origin access
  // This is important for pose detection which requires CORS-safe video sources
  const videoSrc = message.videoPreview || message.videoUrl || null;
  const hasVideo = !!(message.videoUrl || message.videoPreview || message.videoFile || message.videoS3Key);
  const showPoseViewer = true; // Always show viewer so users can toggle AI overlay on/off
  
  // Track video aspect ratio (width / height) - use stored dimensions if available
  const storedAspectRatio = message.videoDimensions 
    ? message.videoDimensions.width / message.videoDimensions.height 
    : DEFAULT_ASPECT_RATIO;
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(storedAspectRatio);
  
  // Track if video is ready to show (actual video has loaded, not just cached dimensions)
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  // Capture the exact dimensions when floating starts - never change while floating
  const [frozenDimensions, setFrozenDimensions] = useState<{ width: number; height: number } | null>(null);
  
  // Track dimensions continuously when NOT floating (ref updates don't cause re-renders)
  const lastKnownDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  
  // Get stored dimensions for passing to VideoPoseViewer (prevents layout shift)
  const initialWidth = message.videoDimensions?.width;
  const initialHeight = message.videoDimensions?.height;
  
  // Check if this is an image (not a video)
  const isImage = message.videoFile?.type.startsWith("image/") || 
                  (message.videoUrl && message.videoUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)) ||
                  (message.videoPreview && message.videoPreview.startsWith("data:image/"));
  
  // Floating video context (optional - won't error if not in provider)
  const floatingContext = useFloatingVideoContextOptional();
  
  // Callback to handle video metadata loaded - get actual aspect ratio and cache dimensions
  const handleVideoMetadataLoaded = useCallback((videoWidth: number, videoHeight: number) => {
    if (videoWidth && videoHeight) {
      const aspectRatio = videoWidth / videoHeight;
      setVideoAspectRatio(aspectRatio);
      setIsVideoReady(true);
      // Update the context with the actual aspect ratio
      floatingContext?.updateVideoAspectRatio(message.id, aspectRatio);
      
      // Cache dimensions in message if not already stored (prevents future layout shifts)
      if (!message.videoDimensions && onUpdateMessage) {
        onUpdateMessage(message.id, { 
          videoDimensions: { width: videoWidth, height: videoHeight } 
        });
      }
    }
  }, [floatingContext, message.id, message.videoDimensions, onUpdateMessage]);
  
  // Track if this video should be floating
  const isThisVideoFloating = floatingContext?.activeVideoId === message.id && floatingContext?.isFloating;

  // Track floating state in refs to avoid stale closures in IntersectionObserver
  const isFloatingRef = useRef(false);
  const activeVideoIdRef = useRef<string | null>(null);
  const lastFloatChangeRef = useRef(0);
  const floatingContextRef = useRef(floatingContext);
  
  // Track the scroll container element to re-setup observer when it changes
  const [scrollContainerElement, setScrollContainerElement] = useState<HTMLElement | null>(null);
  
  // Keep refs in sync with context
  useEffect(() => {
    isFloatingRef.current = floatingContext?.isFloating ?? false;
    activeVideoIdRef.current = floatingContext?.activeVideoId ?? null;
    floatingContextRef.current = floatingContext;
  }, [floatingContext?.isFloating, floatingContext?.activeVideoId, floatingContext]);
  
  // Track scroll container element changes - poll briefly to catch when ref is populated
  useEffect(() => {
    const checkScrollContainer = () => {
      const element = floatingContext?.scrollContainerRef?.current ?? null;
      if (element !== scrollContainerElement) {
        setScrollContainerElement(element);
      }
    };
    
    // Check immediately
    checkScrollContainer();
    
    // Also check after a short delay in case ref is populated after mount
    const timeoutId = setTimeout(checkScrollContainer, 100);
    
    return () => clearTimeout(timeoutId);
  }, [floatingContext?.scrollContainerRef, scrollContainerElement]);

  // Create seekTo callback ref for timestamp navigation (stable reference)
  const seekToRef = useRef<(seconds: number) => void>();
  seekToRef.current = (seconds: number) => {
    // Find the video element within this container
    const videoElement = videoContainerRef.current?.querySelector('video');
    if (videoElement) {
      videoElement.currentTime = seconds;
      videoElement.playbackRate = 0.25; // Slow motion for analysis
      videoElement.play().catch(() => {
        // Autoplay may be blocked, that's ok
      });
    }
  };
  
  // Stable seekTo function that uses the ref
  const seekTo = useCallback((seconds: number) => {
    seekToRef.current?.(seconds);
  }, []);

  // Register this video with the floating context (single attempt; no retries)
  useLayoutEffect(() => {
    if (!videoSrc) {
      videoLogger.warn("[UserMessage] Skipping registration: missing videoSrc", {
        messageId: message.id,
        videoSrcPresent: !!videoSrc,
      });
      return;
    }
    
    const registerNow = () => {
      const container = videoContainerRef.current;
      if (!container) {
        videoLogger.warn("[UserMessage] Skipping registration: container not ready", {
          messageId: message.id,
          videoSrc,
        });
        return;
      }
      const ctx = floatingContextRef.current;
      if (!ctx) {
        videoLogger.warn("[UserMessage] Skipping registration: floating context not ready", {
          messageId: message.id,
          videoSrc,
        });
        return;
      }
      
      ctx.registerVideo(
        message.id,
        videoContainerRef as React.RefObject<HTMLElement>,
        videoSrc,
      // Render a simple video fallback if no portal content is provided
      () => (
        <video
          key={message.id}
          src={videoSrc}
          controls
          autoPlay
          playsInline
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            width: "100%",
            height: "100%",
            objectFit: "contain",
            backgroundColor: "#000",
          }}
        />
      ),
        undefined, // aspectRatio - will be updated later
        seekTo
      );
      videoLogger.debug("[UserMessage] Registered video", {
        messageId: message.id,
        videoSrc,
        hasContainer: !!container,
      });
      
      return () => {
        videoLogger.debug("[UserMessage] Unregister video", { messageId: message.id });
        ctx.unregisterVideo(message.id);
      };
    };
    
    // If container is not yet mounted, defer to next frame once.
    if (!videoContainerRef.current) {
      const rafId = requestAnimationFrame(() => {
        registerNow();
      });
      return () => cancelAnimationFrame(rafId);
    }
    
    return registerNow();
    // Only depend on message.id and videoSrc, not the full context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id, videoSrc, seekTo]);
  
  // Keep seekTo callback updated in the context
  useEffect(() => {
    const ctx = floatingContextRef.current;
    if (!ctx || !videoSrc) return;
    ctx.updateVideoSeekTo(message.id, seekTo);
  }, [message.id, videoSrc, seekTo]);
  
  // Continuously track dimensions when NOT floating using ResizeObserver
  // This ensures we always have the correct pre-float dimensions ready
  useEffect(() => {
    if (!videoContainerRef.current || isThisVideoFloating) return;
    
    const element = videoContainerRef.current;
    
    // Capture initial dimensions
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      lastKnownDimensionsRef.current = { width: rect.width, height: rect.height };
    }
    
    // Use ResizeObserver to track dimension changes while not floating
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          lastKnownDimensionsRef.current = { width, height };
        }
      }
    });
    
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [isThisVideoFloating, isVideoReady]);
  
  // When floating starts, freeze the last known dimensions
  // When floating ends, clear frozen dimensions
  useEffect(() => {
    if (isThisVideoFloating && !frozenDimensions && lastKnownDimensionsRef.current) {
      // Use the pre-captured dimensions (before any layout changes)
      setFrozenDimensions(lastKnownDimensionsRef.current);
    } else if (!isThisVideoFloating && frozenDimensions) {
      // Clear frozen dimensions when floating ends
      setFrozenDimensions(null);
    }
  }, [isThisVideoFloating, frozenDimensions]);

  // IntersectionObserver to detect when video leaves scroll container and should float
  useEffect(() => {
    const ctx = floatingContextRef.current;
    if (!ctx || !videoContainerRef.current || !videoSrc || isImage) return;
    
    // Wait for scroll container to be available before setting up observer
    // This ensures we use the correct root for intersection detection
    if (!scrollContainerElement) return;
    
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
        
        // Safety check: ensure this video is still registered (guards against stale closures after chat switch)
        const registration = currentCtx.registeredVideos?.get(message.id);
        if (!registration) return;
        
        if (shouldFloat && !isFloatingRef.current) {
          // Capture dimensions RIGHT BEFORE floating starts (most accurate)
          const rect = element.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            lastKnownDimensionsRef.current = { width: rect.width, height: rect.height };
          }
          
          // Start floating this video
          lastFloatChangeRef.current = now;
          currentCtx.setActiveVideo(message.id);
          currentCtx.setFloating(true);
        } else if (!shouldFloat && activeVideoIdRef.current === message.id && isFloatingRef.current) {
          // Stop floating when video is back in view
          // Preserve scroll position to prevent jump on mobile when transitioning from floating to docked
          const scrollContainer = scrollContainerElement;
          const scrollTop = scrollContainer.scrollTop;
          const elementTop = element.getBoundingClientRect().top;
          const containerTop = scrollContainer.getBoundingClientRect().top;
          const relativeTop = elementTop - containerTop + scrollTop;
          
          lastFloatChangeRef.current = now;
          currentCtx.setFloating(false);
          
          // After state update, restore scroll position to keep the video at the same visual position
          // Use requestAnimationFrame to ensure DOM has updated
          requestAnimationFrame(() => {
            // Re-measure element position after render
            const newElementTop = element.getBoundingClientRect().top;
            const newContainerTop = scrollContainer.getBoundingClientRect().top;
            const newRelativeTop = newElementTop - newContainerTop + scrollContainer.scrollTop;
            
            // If the element moved, adjust scroll to compensate
            const delta = newRelativeTop - relativeTop;
            if (Math.abs(delta) > 1) {
              scrollContainer.scrollTop = scrollTop + delta;
            }
          });
        }
      },
      { 
        root: scrollContainerElement,
        threshold: [0, 0.3, 0.5, 1] 
      }
    );

    observer.observe(element);
    
    // Delayed visibility check - runs after chat-change cooldown (500ms) to auto-float if video not visible
    // This handles the case when switching to a chat where the video is scrolled out of view
    // IMPORTANT: Cancel this if user scrolls - they're actively navigating, don't interrupt
    const COOLDOWN_CHECK_DELAY = 600; // Slightly longer than the 500ms cooldown
    let userHasScrolled = false;
    
    const handleScroll = () => {
      userHasScrolled = true;
      // Remove listener after first scroll - we only need to know if ANY scroll happened
      scrollContainerElement.removeEventListener("scroll", handleScroll);
    };
    scrollContainerElement.addEventListener("scroll", handleScroll);
    
    const delayedCheckTimeout = setTimeout(() => {
      // Clean up scroll listener
      scrollContainerElement.removeEventListener("scroll", handleScroll);
      
      // If user has scrolled, they're actively navigating - don't auto-float
      if (userHasScrolled) return;
      
      const currentCtx = floatingContextRef.current;
      // Check context state directly (not refs) to avoid race conditions with multiple videos
      // If ANY video is already floating or has been set as active, don't try to float this one
      if (!currentCtx || currentCtx.isFloating || currentCtx.activeVideoId) return;
      
      // Safety check: ensure element is still in DOM (guards against fast chat switching)
      if (!element.isConnected) return;
      
      // Additional check: ensure this video is still registered (guards against stale closures)
      const registration = currentCtx.registeredVideos?.get(message.id);
      if (!registration) return;
      
      // Check if video is visible in the scroll container
      const containerRect = scrollContainerElement.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      // Only auto-float if this is the TOPMOST video in the chat
      // This prevents the wrong video from floating when multiple videos are out of view
      const allVideoContainers = Array.from(scrollContainerElement.querySelectorAll('[data-video-container="true"]'));
      
      // Sort by vertical position (top of element)
      const sortedByPosition = allVideoContainers.sort((a, b) => {
        return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
      });
      
      // If this isn't the topmost video, don't auto-float it
      const topmostVideo = sortedByPosition[0];
      if (!topmostVideo || topmostVideo !== element) return;
      
      // Calculate how much of the element is visible within the container
      const visibleTop = Math.max(elementRect.top, containerRect.top);
      const visibleBottom = Math.min(elementRect.bottom, containerRect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibilityRatio = elementRect.height > 0 ? visibleHeight / elementRect.height : 0;
      
      // If less than 30% visible, start floating AND minimized
      if (visibilityRatio < 0.3) {
        // Capture dimensions before floating
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          lastKnownDimensionsRef.current = { width: rect.width, height: rect.height };
        }
        
        lastFloatChangeRef.current = Date.now();
        currentCtx.setActiveVideo(message.id);
        currentCtx.setFloating(true);
        currentCtx.setIsMinimized(true); // Start minimized when auto-floating on chat switch
      }
    }, COOLDOWN_CHECK_DELAY);
    
    return () => {
      observer.disconnect();
      clearTimeout(delayedCheckTimeout);
      scrollContainerElement.removeEventListener("scroll", handleScroll);
    };
    // Re-setup observer when scroll container becomes available or changes
  }, [message.id, videoSrc, isImage, scrollContainerElement]);

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
          chatLogger.debug("Autoplay prevented:", error);
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
                  chatLogger.warn("Image blob URL revoked or invalid:", videoSrc);
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
            (() => {
              // Portrait videos get constrained width - no full-width container
              const isPortraitVideo = videoAspectRatio < 1;
              return (
            <>
              {/* Show spinner while video loads */}
              {!isVideoReady && (
                <Box
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "var(--space-6)",
                  }}
                >
                  <div 
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "3px solid rgba(122, 219, 143, 0.2)",
                      borderTopColor: "#7ADB8F",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                </Box>
              )}
              {/* Video container - hidden until video is ready to prevent layout flash */}
              <Box
                ref={videoContainerRef}
                data-video-container="true"
                style={{
                  position: isVideoReady ? "relative" : "absolute",
                  // When floating, use frozen dimensions to prevent placeholder size changes
                  width: frozenDimensions ? frozenDimensions.width : "fit-content",
                  height: frozenDimensions ? frozenDimensions.height : undefined,
                  maxWidth: "100%",
                  backgroundColor: "transparent",
                  overflow: "hidden",
                  borderRadius: "var(--radius-3)",
                  margin: "0 auto",
                  border: "1px solid var(--mint-6)",
                  // Hide until video is ready (position absolute keeps it out of flow)
                  opacity: isVideoReady ? 1 : 0,
                  pointerEvents: isVideoReady ? "auto" : "none",
                  // Move off-screen when hidden so it doesn't interfere
                  left: isVideoReady ? undefined : "-9999px",
                }}
              >
              {/* Render VideoPoseViewer - ALWAYS render in place to maintain DOM size */}
              {/* When floating, portal a copy to the floating container AND overlay placeholder */}
              {showPoseViewer ? (
                (() => {
                  const floatingContainer = floatingContext?.floatingContainerRef?.current;
                  const shouldPortal = isThisVideoFloating && floatingContainer;
                  
                  // Use controlled pose state from context to persist across docked/floating transitions
                  // Portrait videos (aspect ratio < 1) ignore theatre mode entirely - no zoom, no toggle
                  const effectiveTheatreMode = isPortraitVideo ? false : (shouldPortal ? false : theatreMode);
                  const videoPoseViewer = (
                    <VideoPoseViewer
                      videoUrl={videoSrc}
                      // Pass cached dimensions to prevent layout shift on reload
                      width={initialWidth}
                      height={initialHeight}
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
                      theatreMode={effectiveTheatreMode}
                      hideTheatreToggle={!!shouldPortal || isPortraitVideo}
                      // Controlled pose state from context - persists across docked/floating transitions
                      poseEnabled={floatingContext?.poseEnabled}
                      onPoseEnabledChange={floatingContext?.setPoseEnabled}
                      // Report video dimensions for proper aspect ratio handling
                      onVideoMetadataLoaded={handleVideoMetadataLoaded}
                      // Compact mode when floating - hide button text
                      compactMode={!!shouldPortal}
                      // S3 storage for pose data caching
                      videoS3Key={message.videoS3Key ?? undefined}
                      poseDataS3Key={message.poseDataS3Key ?? undefined}
                      onPoseDataSaved={(s3Key) => {
                        // Save the pose data S3 key to the message
                        onUpdateMessage?.(message.id, { poseDataS3Key: s3Key });
                      }}
                      // Skip preprocessing when floating - just playback, no heavy analysis
                      skipPreprocessing={!!shouldPortal}
                      // Only allow preprocessing if technique LITE eligible (side camera + < 20s video)
                      allowPreprocessing={message.isTechniqueLiteEligible ?? false}
                    />
                  );
                  
                  return (
                    <>
                      {/* Always render video in place - this maintains the container size */}
                      {/* Hide it visually when floating but keep in DOM for stable layout */}
                      <Box style={{ 
                        visibility: isThisVideoFloating ? "hidden" : "visible",
                        // Keep the element in the layout flow even when hidden
                      }}>
                        {videoPoseViewer}
                      </Box>
                      
                      {/* Overlay placeholder when floating - absolutely positioned on top */}
                      {isThisVideoFloating && (
                        <Box
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "var(--gray-3)",
                            borderRadius: "var(--radius-3)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "var(--space-3)",
                            border: "2px dashed var(--gray-6)",
                            zIndex: 10,
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
                      )}
                      
                      {/* Portal to floating container when floating */}
                      {shouldPortal && createPortal(videoPoseViewer, floatingContainer)}
                    </>
                  );
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
                      chatLogger.warn("Blob URL revoked or invalid, video may have been cleared:", video.src);
                    } else {
                      chatLogger.error("Video playback error:", e);
                      chatLogger.error("Video error details:", {
                        error: video.error,
                        networkState: video.networkState,
                        readyState: video.readyState,
                        src: video.src,
                      });
                    }
                  }}
                  onLoadStart={() => {
                    chatLogger.debug("Video load started:", videoSrc);
                  }}
                  onLoadedMetadata={() => {
                    chatLogger.debug("Video metadata loaded");
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
            </>
              );
            })()
          ) : (
            <Box
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: String(videoAspectRatio),
                maxHeight: videoAspectRatio < 1 ? "min(450px, 50vh)" : undefined,
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
