"use client";

import { Box, Flex, Text } from "@radix-ui/themes";
import { StabilityState } from "../hooks/usePoseStabilityFilter";

interface StabilityStateOverlayProps {
  state: StabilityState;
  stableCount: number;
  requiredStableFrames: number;
  similarity: number | null;
  isEnabled: boolean;
  isPortraitVideo?: boolean;
  isMobile?: boolean;
}

/**
 * Visual overlay showing the current stability filter state
 * Displays NORMAL (green) or RECOVERY (orange/red) mode
 */
export function StabilityStateOverlay({
  state,
  stableCount,
  requiredStableFrames,
  similarity,
  isEnabled,
  isPortraitVideo = false,
  isMobile = false,
}: StabilityStateOverlayProps) {
  if (!isEnabled) {
    return null;
  }

  const isRecovery = state === StabilityState.RECOVERY;
  const progress = isRecovery ? (stableCount / requiredStableFrames) * 100 : 100;
  
  const fontSize = isPortraitVideo || isMobile ? "9px" : "10px";
  const padding = isPortraitVideo || isMobile ? "3px 6px" : "4px 8px";

  return (
    <Flex
      direction="column"
      gap="1"
      style={{
        position: "absolute",
        bottom: isPortraitVideo ? "50px" : "60px",
        left: isPortraitVideo ? "8px" : "12px",
        zIndex: 25,
        pointerEvents: "none",
      }}
    >
      {/* State Badge */}
      <Flex
        align="center"
        gap="2"
        style={{
          backgroundColor: isRecovery 
            ? "rgba(255, 152, 0, 0.9)" 
            : "rgba(76, 175, 80, 0.85)",
          padding,
          borderRadius: "4px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        {/* Status indicator dot */}
        <Box
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: isRecovery ? "#fff" : "#fff",
            animation: isRecovery ? "pulse 1s ease-in-out infinite" : "none",
          }}
        />
        
        <Text
          size="1"
          weight="bold"
          style={{
            color: "#fff",
            fontSize,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          {isRecovery ? "Recovery" : "Stable"}
        </Text>

        {/* Recovery progress indicator */}
        {isRecovery && (
          <Text
            size="1"
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize,
            }}
          >
            {stableCount}/{requiredStableFrames}
          </Text>
        )}
      </Flex>

      {/* Progress bar (only in recovery) */}
      {isRecovery && (
        <Box
          style={{
            width: "100%",
            height: "3px",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <Box
            style={{
              width: `${progress}%`,
              height: "100%",
              backgroundColor: "#fff",
              transition: "width 0.15s ease-out",
            }}
          />
        </Box>
      )}

      {/* Similarity score (debug info) */}
      {similarity !== null && (
        <Text
          size="1"
          style={{
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "9px",
          }}
        >
          Sim: {(similarity * 100).toFixed(0)}%
        </Text>
      )}

      {/* CSS for pulse animation */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </Flex>
  );
}








