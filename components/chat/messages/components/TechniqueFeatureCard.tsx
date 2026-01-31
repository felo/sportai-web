"use client";

import { useState, useEffect } from "react";
import { Box, Card, Flex, Text, Badge, Spinner } from "@radix-ui/themes";
import { PlayIcon } from "@radix-ui/react-icons";
import type { SharkFeature } from "@/types/shark";
import { MINT_COLOR } from "../../input/VideoEligibilityIndicator";
import { useThumbnailByFrame } from "@/components/shared/hooks";

/**
 * Get level badge color
 */
function getLevelColor(level: SharkFeature["level"]): "orange" | "yellow" | "blue" | "green" {
  switch (level) {
    case "beginner":
      return "orange";
    case "intermediate":
      return "yellow";
    case "advanced":
      return "blue";
    case "professional":
      return "green";
    default:
      return "yellow";
  }
}

/**
 * Remove negative signs from degree values in text
 * e.g., "-36 degrees" becomes "36 degrees"
 */
function formatDegreeValues(text: string): string {
  // Match negative numbers followed by "degree" or "°"
  return text.replace(/-(\d+\.?\d*)\s*(degrees?|°)/gi, "$1 $2");
}

/**
 * Fix common API typos/truncations in text
 */
function fixApiTypos(text: string): string {
  // Fix sentences ending with "and." -> "and power."
  return text.replace(/\band\.$/i, "and power.");
}

/**
 * Apply all text corrections (degree values, typos)
 */
function formatFeatureText(text: string): string {
  let result = text;
  result = formatDegreeValues(result);
  result = fixApiTypos(result);
  return result;
}

interface TechniqueFeatureCardProps {
  feature: SharkFeature;
  videoElement?: HTMLVideoElement | null;
  fps?: number;
  onThumbnailClick?: (timestamp: number) => void;
}

/**
 * Display a single technique feature from Shark analysis
 * Shows feature name, level, score, observation, suggestion, joints, and video thumbnail
 */
export function TechniqueFeatureCard({ feature, videoElement: propsVideoElement, fps = 30, onThumbnailClick }: TechniqueFeatureCardProps) {
  const displayName =
    feature.feature_human_readable_name ||
    feature.human_name ||
    feature.feature_name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  // Find video element from DOM if not provided via props
  const [localVideoElement, setLocalVideoElement] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Only search for video if we have a frame number and no video element yet
    if (feature.event?.frame_nr && !propsVideoElement && !localVideoElement) {
      // Try to find video in the DOM
      const findVideo = () => {
        const videos = document.querySelectorAll("video");
        if (videos.length > 0) {
          // Use the last video (most recent/relevant)
          const video = videos[videos.length - 1] as HTMLVideoElement;
          // Make sure video is ready
          if (video.readyState >= 2) {
            setLocalVideoElement(video);
          } else {
            // Wait for video to be ready
            const onCanPlay = () => {
              setLocalVideoElement(video);
              video.removeEventListener("canplay", onCanPlay);
            };
            video.addEventListener("canplay", onCanPlay);
            // Cleanup listener if component unmounts
            return () => video.removeEventListener("canplay", onCanPlay);
          }
        }
      };

      // Try immediately and also after a short delay (video might not be rendered yet)
      findVideo();
      const timeout = setTimeout(findVideo, 500);
      return () => clearTimeout(timeout);
    }
  }, [feature.event?.frame_nr, propsVideoElement, localVideoElement]);

  // Use provided video element or the one we found
  const videoElement = propsVideoElement || localVideoElement;

  // Get thumbnail for the feature's frame
  const frameNr = feature.event?.frame_nr;
  const timestamp = feature.event?.timestamp;

  // Debug: log feature event data
  useEffect(() => {
    console.log(`[TechniqueFeatureCard] Feature: ${feature.feature_name}`, {
      hasEvent: !!feature.event,
      frameNr,
      timestamp,
      hasVideoElement: !!videoElement,
      videoReadyState: videoElement?.readyState,
      fps,
    });
  }, [feature.feature_name, feature.event, frameNr, timestamp, videoElement, fps]);

  const [thumbnailUrl, isLoadingThumbnail] = useThumbnailByFrame(
    videoElement ?? null,
    frameNr ?? 0,
    fps
  );

  // Only show thumbnail if we have a frame number
  const hasThumbnail = frameNr !== undefined && frameNr > 0;

  // Handle thumbnail click - seek video to timestamp
  const handleThumbnailClick = () => {
    if (feature.event?.timestamp && onThumbnailClick) {
      onThumbnailClick(feature.event.timestamp);
    }
  };

  return (
    <Card
      style={{
        border: `2px solid ${MINT_COLOR}`,
        backgroundColor: "var(--color-panel-solid)",
        width: "100%",
        marginTop: "var(--space-3)",
        marginBottom: "var(--space-3)",
        marginRight: "var(--space-3)",
      }}
    >
      <Flex gap="3" p="4">
        {/* Thumbnail on the left (if available) */}
        {hasThumbnail && (
          <Box
            style={{
              flexShrink: 0,
              width: 100,
              height: 75,
              borderRadius: "var(--radius-2)",
              overflow: "hidden",
              backgroundColor: "var(--gray-a3)",
              position: "relative",
              cursor: onThumbnailClick ? "pointer" : "default",
            }}
            onClick={handleThumbnailClick}
          >
            {isLoadingThumbnail ? (
              <Flex
                align="center"
                justify="center"
                style={{ width: "100%", height: "100%" }}
              >
                <Spinner size="2" />
              </Flex>
            ) : thumbnailUrl ? (
              <>
                <img
                  src={thumbnailUrl}
                  alt={`Frame at ${feature.event?.timestamp?.toFixed(1)}s`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                {/* Play icon overlay */}
                {onThumbnailClick && (
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      opacity: 0,
                      transition: "opacity 0.2s",
                    }}
                    className="thumbnail-play-overlay"
                  >
                    <PlayIcon width={24} height={24} style={{ color: "white" }} />
                  </Flex>
                )}
                {/* Timestamp badge */}
                {feature.event?.timestamp !== undefined && (
                  <Box
                    style={{
                      position: "absolute",
                      bottom: 4,
                      right: 4,
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      padding: "2px 6px",
                      borderRadius: "var(--radius-1)",
                    }}
                  >
                    <Text size="1" style={{ color: "white", fontFamily: "monospace" }}>
                      {feature.event.timestamp.toFixed(1)}s
                    </Text>
                  </Box>
                )}
              </>
            ) : (
              <Flex
                align="center"
                justify="center"
                style={{ width: "100%", height: "100%", color: "var(--gray-8)" }}
              >
                <PlayIcon width={24} height={24} />
              </Flex>
            )}
          </Box>
        )}

        {/* Content on the right */}
        <Flex direction="column" gap="3" style={{ flex: 1, minWidth: 0 }}>
          {/* Header: Name, Level Badge */}
          <Flex gap="2" align="center" wrap="wrap">
            <Text size="3" weight="bold" style={{ color: "var(--gray-12)" }}>
              {displayName}
            </Text>
            <Badge color={getLevelColor(feature.level)} variant="soft" size="1">
              {feature.level} tip
            </Badge>
          </Flex>

          {/* Suggestion (in highlighted box) */}
          {feature.suggestion && (
            <Box>
              <Text size="1" color="gray" style={{ marginBottom: 4, display: "block" }}>
                Suggestion
              </Text>
              <Box
                style={{
                  backgroundColor: "var(--gray-a3)",
                  borderRadius: "var(--radius-2)",
                  padding: "var(--space-3)",
                }}
              >
                <Text size="2" style={{ color: MINT_COLOR }}>
                  {formatFeatureText(feature.suggestion)}
                </Text>
              </Box>
            </Box>
          )}

          {/* Observation (plain text) */}
          {feature.observation && (
            <Box>
              <Text size="1" color="gray" style={{ marginBottom: 4, display: "block" }}>
                Observation
              </Text>
              <Text size="2" style={{ color: "white" }}>
                {formatFeatureText(feature.observation)}
              </Text>
            </Box>
          )}

        </Flex>
      </Flex>

      {/* Hover style for play overlay */}
      <style jsx global>{`
        .thumbnail-play-overlay:hover {
          opacity: 1 !important;
        }
      `}</style>
    </Card>
  );
}
