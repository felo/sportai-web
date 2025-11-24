"use client";

import { useRef, useEffect, useState } from "react";
import { Box, Text } from "@radix-ui/themes";
import { VideoPoseViewer } from "../../viewers/VideoPoseViewer";
import type { Message } from "@/types/chat";

interface UserMessageProps {
  message: Message;
  videoContainerStyle: React.CSSProperties;
  theatreMode: boolean;
  isMobile: boolean;
}

/**
 * User message component with video and text rendering
 */
export function UserMessage({ message, videoContainerStyle, theatreMode, isMobile }: UserMessageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSrc = message.videoUrl || (message.videoPreview && !message.videoUrl ? message.videoPreview : null);
  const hasVideo = !!(message.videoUrl || message.videoPreview || message.videoFile || message.videoS3Key);
  const showPoseViewer = true; // Always show viewer so users can toggle AI overlay on/off

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
  }, [hasVideo, message.videoFile, message.videoUrl, message.videoPlaybackSpeed]);

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

