"use client";

import { useRef, useState, useEffect } from "react";
import { Box, Flex, Button, Text, Switch, Badge, Select, Slider } from "@radix-ui/themes";
import { useSAM2Detection } from "@/hooks/useSAM2Detection";
import { drawSAM2Masks, drawSAM2Contours, calculateMaskStats } from "@/types/sam2-detection";
import type { SAM2Point, SAM2ModelType } from "@/types/detection";
import buttonStyles from "@/styles/buttons.module.css";

interface SAM2ViewerProps {
  videoUrl: string;
  width?: number;
  height?: number;
}

export function SAM2Viewer({ videoUrl, width = 640, height = 480 }: SAM2ViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [modelType, setModelType] = useState<SAM2ModelType>("tiny");
  const [points, setPoints] = useState<SAM2Point[]>([]);
  const [currentMask, setCurrentMask] = useState<any>(null);
  const [maskOpacity, setMaskOpacity] = useState(0.5);
  const [showContours, setShowContours] = useState(false);
  const [maskStats, setMaskStats] = useState<any>(null);
  const [interactionMode, setInteractionMode] = useState<"foreground" | "background">("foreground");

  const {
    detector,
    isLoading,
    error,
    isSegmenting,
    segmentWithPoints,
    clearCache,
  } = useSAM2Detection({
    enabled: isEnabled,
    modelType,
    maskThreshold: 0.0,
    returnMultipleMasks: false,
  });

  // Handle canvas click for interactive segmentation
  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEnabled || !detector || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Add new point
    const newPoint: SAM2Point = {
      x,
      y,
      label: interactionMode === "foreground" ? 1 : 0,
    };
    const newPoints = [...points, newPoint];
    setPoints(newPoints);

    // Segment with updated points
    const result = await segmentWithPoints(videoRef.current, newPoints);
    if (result) {
      setCurrentMask(result);
      
      // Calculate stats
      if (result.masks.length > 0) {
        const stats = calculateMaskStats(result.masks[0]);
        setMaskStats(stats);
      }
    }
  };

  // Draw segmentation on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw segmentation
    if (currentMask) {
      if (showContours) {
        drawSAM2Contours(ctx, [currentMask], {
          lineWidth: 3,
        });
      } else {
        drawSAM2Masks(ctx, [currentMask], {
          maskOpacity,
          showPromptPoints: true,
          promptPointRadius: 6,
        });
      }
    }

    // Draw pending points
    points.forEach((point) => {
      ctx.fillStyle = point.label === 1 ? "#FF0000" : "#0000FF";
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [currentMask, points, showContours, maskOpacity]);

  const handleClearPoints = () => {
    setPoints([]);
    setCurrentMask(null);
    setMaskStats(null);
  };

  const handleAutoSegment = async () => {
    if (!detector || !videoRef.current) return;
    
    // Auto-segment using center point
    const centerPoint: SAM2Point = {
      x: width / 2,
      y: height / 2,
      label: 1,
    };
    
    const result = await segmentWithPoints(videoRef.current, [centerPoint]);
    if (result) {
      setCurrentMask(result);
      setPoints([centerPoint]);
      
      if (result.masks.length > 0) {
        const stats = calculateMaskStats(result.masks[0]);
        setMaskStats(stats);
      }
    }
  };

  return (
    <Flex direction="column" gap="4">
      {/* Controls */}
      <Flex direction="column" gap="3" p="3" style={{ background: "var(--gray-2)", borderRadius: "8px" }}>
        <Flex align="center" justify="between">
          <Flex align="center" gap="2">
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
            <Text size="2" weight="medium">
              Enable SAM 2 Segmentation
            </Text>
            {isLoading && <Badge color="blue">Loading...</Badge>}
            {isSegmenting && <Badge color="orange">Segmenting...</Badge>}
            {error && <Badge color="red">Error</Badge>}
          </Flex>
        </Flex>

        {isEnabled && (
          <>
            <Flex direction="column" gap="2">
              <Text size="1" weight="medium">Model Size</Text>
              <Select.Root value={modelType} onValueChange={(v) => setModelType(v as SAM2ModelType)}>
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  <Select.Item value="tiny">Tiny (~40MB) - Fast</Select.Item>
                  <Select.Item value="small">Small (~180MB) - Balanced</Select.Item>
                  <Select.Item value="base">Base (~370MB) - Quality</Select.Item>
                  <Select.Item value="large">Large (~900MB) - Best</Select.Item>
                </Select.Content>
              </Select.Root>
              <Text size="1" color="gray">
                Changing model will reload the detector
              </Text>
            </Flex>

            <Flex direction="column" gap="2">
              <Text size="1" weight="medium">Interaction Mode</Text>
              <Select.Root value={interactionMode} onValueChange={(v) => setInteractionMode(v as any)}>
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  <Select.Item value="foreground">Foreground (Red Points)</Select.Item>
                  <Select.Item value="background">Background (Blue Points)</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="2">
              <Flex align="center" justify="between">
                <Text size="1" weight="medium">Mask Opacity</Text>
                <Text size="1" color="gray">{(maskOpacity * 100).toFixed(0)}%</Text>
              </Flex>
              <Slider
                value={[maskOpacity]}
                onValueChange={([v]) => setMaskOpacity(v)}
                min={0}
                max={1}
                step={0.1}
              />
            </Flex>

            <Flex align="center" gap="2">
              <Switch
                checked={showContours}
                onCheckedChange={setShowContours}
              />
              <Text size="2">Show Contours Only</Text>
            </Flex>

            <Flex gap="2" wrap="wrap">
              <Button
                size="2"
                variant="soft"
                onClick={handleAutoSegment}
                disabled={!detector || isSegmenting}
                className={buttonStyles.actionButton}
              >
                Auto Segment (Center)
              </Button>
              <Button
                size="2"
                variant="outline"
                onClick={handleClearPoints}
                disabled={points.length === 0}
              >
                Clear Points ({points.length})
              </Button>
              <Button
                size="2"
                variant="outline"
                onClick={clearCache}
              >
                Clear Cache
              </Button>
            </Flex>

            {maskStats && (
              <Box p="2" style={{ background: "var(--gray-3)", borderRadius: "4px" }}>
                <Text size="1" weight="medium" mb="1">Mask Statistics:</Text>
                <Text size="1" style={{ display: "block" }}>Area: {maskStats.area} pixels</Text>
                <Text size="1" style={{ display: "block" }}>Coverage: {maskStats.coverage.toFixed(2)}%</Text>
                <Text size="1" style={{ display: "block" }}>
                  Center: ({maskStats.centerX.toFixed(1)}, {maskStats.centerY.toFixed(1)})
                </Text>
              </Box>
            )}

            {error && (
              <Text size="1" color="red">
                {error}
              </Text>
            )}

            <Text size="1" color="gray" style={{ fontStyle: "italic" }}>
              💡 Click on the video to add {interactionMode} points. Use foreground (red) points on objects
              you want to segment, and background (blue) points on areas to exclude.
            </Text>
          </>
        )}
      </Flex>

      {/* Video and Canvas */}
      <Box style={{ position: "relative", width: "fit-content" }}>
        <video
          ref={videoRef}
          src={videoUrl}
          width={width}
          height={height}
          style={{ display: "none" }}
          crossOrigin="anonymous"
          onLoadedMetadata={() => {
            // Initialize canvas size to match video
            if (videoRef.current && canvasRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
          }}
        />
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          style={{
            width: "100%",
            height: "auto",
            cursor: isEnabled && detector ? "crosshair" : "default",
            border: "1px solid var(--gray-6)",
            borderRadius: "8px",
          }}
        />
      </Box>
    </Flex>
  );
}





