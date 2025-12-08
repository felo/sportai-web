"use client";

import { useState, useCallback } from "react";
import { Box, Flex, IconButton, Tooltip, Text } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { VideoPoseViewer, type PoseDetectionResult } from "@/components/chat/viewers/VideoPoseViewer";
import { StaticPose2D } from "./components";

interface TechniqueViewerProps {
  videoUrl: string;
  onBack?: () => void;
}

export function TechniqueViewer({ videoUrl, onBack }: TechniqueViewerProps) {
  const [currentPose, setCurrentPose] = useState<PoseDetectionResult | null>(null);

  const handlePoseChange = useCallback((poses: PoseDetectionResult[]) => {
    // Take the first detected pose
    setCurrentPose(poses.length > 0 ? poses[0] : null);
  }, []);

  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#000",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Minimal Header */}
      <Flex
        align="center"
        gap="3"
        style={{
          padding: "var(--space-3)",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          borderBottom: "1px solid var(--gray-6)",
          flexShrink: 0,
        }}
      >
        {onBack && (
          <Tooltip content="Back">
            <IconButton
              size="2"
              variant="ghost"
              onClick={onBack}
              style={{ color: "white" }}
            >
              <ArrowLeftIcon width={18} height={18} />
            </IconButton>
          </Tooltip>
        )}
        <Text size="2" weight="medium" style={{ color: "var(--gray-11)" }}>
          Technique Analysis
        </Text>
      </Flex>

      {/* Main Content Area */}
      <Flex
        style={{
          flex: 1,
          overflow: "auto",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "var(--space-4)",
          gap: "var(--space-4)",
        }}
      >
        {/* Video with Pose Overlay - maintains natural size */}
        <Box
          style={{
            flexShrink: 0,
            width: "fit-content",
          }}
        >
          <VideoPoseViewer
            videoUrl={videoUrl}
            theatreMode={true}
            hideTheatreToggle={true}
            initialShowSkeleton={true}
            initialShowAngles={true}
            initialPoseEnabled={false}
            showControls={true}
            onPoseChange={handlePoseChange}
            allowPreprocessing={false}
          />
        </Box>

        {/* Static 2D Pose Panel */}
        <Box
          style={{
            width: "320px",
            flexShrink: 0,
            padding: "var(--space-3)",
            backgroundColor: "var(--gray-1)",
            borderRadius: "var(--radius-3)",
            border: "1px solid var(--gray-6)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <StaticPose2D
            pose={currentPose}
            width={296}
            height={400}
            showAngles={true}
          />
          
          <Box style={{ padding: "var(--space-2)" }}>
            <Text size="1" color="gray">
              Static pose view updates in real-time as the video plays.
              Angles are measured at elbow and knee joints.
            </Text>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}

