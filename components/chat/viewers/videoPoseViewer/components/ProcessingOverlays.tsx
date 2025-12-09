"use client";

import { Box, Flex, Text, Spinner } from "@radix-ui/themes";

export interface LoadingOverlayProps {
  isLoading: boolean;
  autoPlay: boolean;
  isPlaying: boolean;
  hasStartedPlaying: boolean;
}

/**
 * Loading overlay shown when AI overlay is being prepared.
 */
export function LoadingOverlay({
  isLoading,
  autoPlay,
  isPlaying,
  hasStartedPlaying,
}: LoadingOverlayProps) {
  if (!isLoading && !(autoPlay && !isPlaying && !hasStartedPlaying)) {
    return null;
  }

  return (
    <Flex
      align="center"
      justify="center"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 20,
        transition: "opacity 0.3s ease",
      }}
    >
      <Flex align="center" gap="2" direction="column" style={{ color: "white" }}>
        <Flex align="center" gap="2">
          <Spinner size="3" />
          <Text size="4">
            {isLoading ? "Preparing AI overlay..." : "Starting playback..."}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  );
}

export interface PreprocessingProgressProps {
  isBackgroundPreprocessing: boolean;
  backgroundPreprocessProgress: number;
  isPortraitVideo: boolean;
  compactMode: boolean;
}

/**
 * Preprocessing progress indicator shown at top center.
 */
export function PreprocessingProgress({
  isBackgroundPreprocessing,
  backgroundPreprocessProgress,
  isPortraitVideo,
  compactMode,
}: PreprocessingProgressProps) {
  if (!isBackgroundPreprocessing) return null;

  return (
    <>
      {/* Blocking overlay */}
      <Box
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          zIndex: 24,
        }}
      />

      {/* Progress indicator */}
      <Box
        style={{
          position: "absolute",
          top: compactMode ? "4px" : isPortraitVideo ? "8px" : "12px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          borderRadius: "var(--radius-2)",
          padding: "4px 10px",
          zIndex: 25,
        }}
      >
        <Flex align="center" gap="2">
          <Text
            size="1"
            style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "10px" }}
          >
            Analysing movement
          </Text>
          <Box
            style={{
              width: "50px",
              height: "3px",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <Box
              style={{
                width: `${backgroundPreprocessProgress}%`,
                height: "100%",
                backgroundColor: "var(--accent-9)",
                transition: "width 0.1s ease-out",
              }}
            />
          </Box>
        </Flex>
      </Box>
    </>
  );
}

export interface BottomGradientMaskProps {
  showControls: boolean;
  isExpanded: boolean;
}

/**
 * Bottom gradient mask for smooth transition to controls.
 */
export function BottomGradientMask({ showControls, isExpanded }: BottomGradientMaskProps) {
  if (!showControls || !isExpanded) return null;

  return (
    <Box
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "12px",
        background: "linear-gradient(to bottom, transparent 0%, black 100%)",
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}


