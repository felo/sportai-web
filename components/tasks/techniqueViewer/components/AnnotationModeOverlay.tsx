"use client";

import { Box, Flex, Text } from "@radix-ui/themes";

interface AnnotationModeOverlayProps {
  isVideoReady: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Grid overlay shown when annotation mode is active.
 * Clicking on the overlay triggers the video comment creation dialog.
 */
export function AnnotationModeOverlay({
  isVideoReady,
  onClick,
}: AnnotationModeOverlayProps) {
  return (
    <Box
      onClick={onClick}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        cursor: "crosshair",
        zIndex: 11,
      }}
    >
      {/* Grid overlay - visual indicator for annotation mode */}
      <Box
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(122, 219, 143, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(122, 219, 143, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          opacity: 0.8,
          pointerEvents: "none",
        }}
      />

      {/* Hint text */}
      {isVideoReady && (
        <Flex
          align="center"
          justify="center"
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            padding: "4px 8px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            borderRadius: "4px",
            pointerEvents: "none",
          }}
        >
          <Text
            size="1"
            style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "10px" }}
          >
            Click to add comment
          </Text>
        </Flex>
      )}
    </Box>
  );
}
