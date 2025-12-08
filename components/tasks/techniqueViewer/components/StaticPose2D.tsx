"use client";

import { useRef, useEffect, useMemo } from "react";
import { Box, Text } from "@radix-ui/themes";
import type { PoseDetectionResult } from "@/components/chat/viewers/VideoPoseViewer";
import { POSE_CONNECTIONS, BLAZEPOSE_CONNECTIONS_2D, drawPose, drawAngle } from "@/types/pose";

interface StaticPose2DProps {
  pose: PoseDetectionResult | null;
  width?: number;
  height?: number;
  showAngles?: boolean;
  measuredAngles?: Array<[number, number, number]>;
  backgroundColor?: string;
}

/**
 * Static 2D Pose Visualization
 * Renders a pose skeleton on a clean background, normalized and centered.
 * Used for comparing poses without video overlay.
 */
export function StaticPose2D({
  pose,
  width = 300,
  height = 400,
  showAngles = true,
  measuredAngles = [[5, 7, 9], [6, 8, 10], [11, 13, 15], [12, 14, 16]], // All 4 limb angles
  backgroundColor = "var(--gray-2)",
}: StaticPose2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Determine if this is a BlazePose result (33 keypoints) or MoveNet (17 keypoints)
  const isBlazePose = useMemo(() => {
    if (!pose?.keypoints) return false;
    return pose.keypoints.length === 33;
  }, [pose]);

  // Get the appropriate connections for the model
  const connections = isBlazePose ? BLAZEPOSE_CONNECTIONS_2D : POSE_CONNECTIONS;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pose?.keypoints) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find bounding box of keypoints
    const validKeypoints = pose.keypoints.filter(kp => (kp.score ?? 0) > 0.3);
    if (validKeypoints.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const kp of validKeypoints) {
      minX = Math.min(minX, kp.x);
      maxX = Math.max(maxX, kp.x);
      minY = Math.min(minY, kp.y);
      maxY = Math.max(maxY, kp.y);
    }

    const poseWidth = maxX - minX;
    const poseHeight = maxY - minY;

    // Calculate scale to fit pose in canvas with padding
    const padding = 40;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    const scale = Math.min(
      availableWidth / poseWidth,
      availableHeight / poseHeight
    );

    // Calculate offset to center the pose
    const scaledWidth = poseWidth * scale;
    const scaledHeight = poseHeight * scale;
    const offsetX = (width - scaledWidth) / 2 - minX * scale;
    const offsetY = (height - scaledHeight) / 2 - minY * scale;

    // Transform keypoints to canvas space
    const transformedKeypoints = pose.keypoints.map(kp => ({
      ...kp,
      x: kp.x * scale + offsetX,
      y: kp.y * scale + offsetY,
    }));

    // Draw the skeleton
    drawPose(ctx, transformedKeypoints, {
      keypointColor: "#FF9800",
      keypointOutlineColor: "#7ADB8F",
      keypointRadius: 6,
      connectionColor: "#7ADB8F",
      connectionWidth: 3,
      minConfidence: 0.3,
      showFace: false,
    }, connections);

    // Draw angles if enabled
    if (showAngles && measuredAngles.length > 0) {
      // Adjust angle indices for BlazePose if needed
      const angleIndices = isBlazePose 
        ? measuredAngles.map(([a, b, c]) => {
            // Map MoveNet indices to BlazePose indices
            const moveNetToBlaze: Record<number, number> = {
              5: 11, 6: 12, 7: 13, 8: 14, 9: 15, 10: 16,
              11: 23, 12: 24, 13: 25, 14: 26, 15: 27, 16: 28,
            };
            return [
              moveNetToBlaze[a] ?? a,
              moveNetToBlaze[b] ?? b,
              moveNetToBlaze[c] ?? c,
            ] as [number, number, number];
          })
        : measuredAngles;

      for (const angle of angleIndices) {
        drawAngle(ctx, transformedKeypoints, angle, {
          lineColor: "#A855F7",
          arcColor: "rgba(168, 85, 247, 0.4)",
          textColor: "#FFFFFF",
          lineWidth: 2,
          fontSize: 14,
          minConfidence: 0.3,
          isPlaying: false, // Show decimal precision
        });
      }
    }
  }, [pose, width, height, showAngles, measuredAngles, connections, isBlazePose]);

  return (
    <Box
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor,
        borderRadius: "var(--radius-3)",
        border: "1px solid var(--gray-5)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 5,
          background: "rgba(0, 0, 0, 0.5)",
          padding: "4px 8px",
          borderRadius: "6px",
          backdropFilter: "blur(4px)",
        }}
      >
        <Text size="1" style={{ color: "white" }} weight="medium">
          2D Pose
        </Text>
      </Box>

      {pose?.keypoints ? (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ display: "block" }}
        />
      ) : (
        <Box
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text size="2" color="gray">
            Enable AI Overlay to see pose
          </Text>
        </Box>
      )}
    </Box>
  );
}

