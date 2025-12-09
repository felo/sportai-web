"use client";

import { Box, Text } from "@radix-ui/themes";
import { Pose3DViewer } from "../../Pose3DViewer";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";

export interface Pose3DSectionProps {
  pose3D: PoseDetectionResult | null;
  currentPoses: PoseDetectionResult[];
  dimensions: { width: number; height: number };
  showFaceLandmarks: boolean;
}

/**
 * 3D Pose visualization section.
 * Shown when BlazePose is selected and 3D data is available.
 */
export function Pose3DSection({
  pose3D,
  currentPoses,
  dimensions,
  showFaceLandmarks,
}: Pose3DSectionProps) {
  return (
    <Box
      style={{
        width: "100%",
        backgroundColor: "var(--gray-2)",
        borderRadius: "var(--radius-3)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Floating Header */}
      <Box
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 5,
          background: "rgba(0, 0, 0, 0.5)",
          padding: "4px 8px",
          borderRadius: "6px",
          backdropFilter: "blur(4px)",
        }}
      >
        <Text size="1" style={{ color: "white" }} weight="medium">
          3D Pose Visualization
        </Text>
      </Box>

      {pose3D ? (
        <Box
          style={{
            width: "100%",
            position: "relative",
            touchAction: "none",
          }}
        >
          <Pose3DViewer
            pose={pose3D}
            width={dimensions.width}
            height={dimensions.height}
            showFace={showFaceLandmarks}
          />
        </Box>
      ) : (
        <Box
          style={{
            width: "100%",
            height: `${dimensions.height}px`,
            backgroundColor: "var(--gray-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text size="2" color="gray">
            {currentPoses.length > 0
              ? "Waiting for 3D keypoints..."
              : "No pose detected yet"}
          </Text>
        </Box>
      )}
    </Box>
  );
}


