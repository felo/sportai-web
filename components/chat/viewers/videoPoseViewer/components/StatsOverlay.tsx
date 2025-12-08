"use client";

import { Box, Flex, Text, Button } from "@radix-ui/themes";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";

export interface StatsOverlayProps {
  currentFrame: number;
  videoFPS: number;
  currentPoses: PoseDetectionResult[];
  selectedPoseIndex: number;
  isPoseEnabled: boolean;
  isObjectDetectionEnabled: boolean;
  isProjectileDetectionEnabled: boolean;
  currentObjects: unknown[];
  currentProjectile: unknown | null;
  isPortraitVideo: boolean;
  isMobile: boolean;
  confidenceStats: React.RefObject<Map<number, { sum: number; count: number }>>;
  onPrevPose: () => void;
  onNextPose: () => void;
}

/**
 * Stats overlay displayed in the top-left corner of the video.
 * Shows frame number, FPS, player tracking info, and confidence.
 */
export function StatsOverlay({
  currentFrame,
  videoFPS,
  currentPoses,
  selectedPoseIndex,
  isPoseEnabled,
  isObjectDetectionEnabled,
  isProjectileDetectionEnabled,
  currentObjects,
  currentProjectile,
  isPortraitVideo,
  isMobile,
  confidenceStats,
  onPrevPose,
  onNextPose,
}: StatsOverlayProps) {
  // Don't render on mobile or if nothing to show
  if (isMobile) return null;

  const hasContent =
    (isPoseEnabled && currentPoses.length > 0) ||
    (isObjectDetectionEnabled && currentObjects.length > 0) ||
    (isProjectileDetectionEnabled && currentProjectile);

  if (!hasContent) return null;

  // Get average accuracy for selected player
  const stats = confidenceStats.current.get(selectedPoseIndex);
  const avgConfidence = stats && stats.count > 0 ? stats.sum / stats.count : 0;

  return (
    <Box
      style={{
        position: "absolute",
        top: isPortraitVideo ? "38px" : "52px",
        left: isPortraitVideo ? "8px" : "12px",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        padding: isPortraitVideo ? "6px 8px" : "8px 12px",
        borderRadius: "var(--radius-3)",
        zIndex: 15,
        pointerEvents: "none",
        fontSize: "10px",
      }}
    >
      <Flex direction="column" gap="1">
        <Text
          size="1"
          weight="medium"
          style={{
            color: "white",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
          }}
        >
          Frame {currentFrame} • {videoFPS} FPS
        </Text>

        {/* Pose Detection Stats */}
        {isPoseEnabled && currentPoses.length > 0 && (
          <>
            {currentPoses.length === 1 && (
              <Text size="1" style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "10px" }}>
                Tracking player
              </Text>
            )}

            {/* Player Toggle - show when multiple players detected */}
            {currentPoses.length > 1 && (
              <Flex align="center" gap="2" style={{ pointerEvents: "auto" }}>
                <Button
                  size="1"
                  variant="ghost"
                  onClick={onPrevPose}
                  style={{
                    padding: "2px 6px",
                    minWidth: "auto",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  <ChevronLeftIcon width={12} height={12} />
                </Button>
                <Text
                  size="1"
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    fontSize: "10px",
                    minWidth: "70px",
                    textAlign: "center",
                  }}
                >
                  Player {selectedPoseIndex + 1}/{currentPoses.length}
                </Text>
                <Button
                  size="1"
                  variant="ghost"
                  onClick={onNextPose}
                  style={{
                    padding: "2px 6px",
                    minWidth: "auto",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  <ChevronRightIcon width={12} height={12} />
                </Button>
              </Flex>
            )}

            {currentPoses.length > 0 && (
              <Text
                size="1"
                style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "10px" }}
              >
                Confidence {(avgConfidence * 100).toFixed(0)}%
              </Text>
            )}
          </>
        )}

        {/* Object Detection Stats */}
        {isObjectDetectionEnabled && currentObjects.length > 0 && (
          <Text size="1" style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "10px" }}>
            Objects: {currentObjects.length}
          </Text>
        )}

        {/* Ball Tracking Stats */}
        {isProjectileDetectionEnabled && currentProjectile && (
          <Text size="1" style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "10px" }}>
            Ball tracked •{" "}
            {((currentProjectile as { confidence: number }).confidence * 100).toFixed(0)}%
            confidence
          </Text>
        )}
      </Flex>
    </Box>
  );
}

