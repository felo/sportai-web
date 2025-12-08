"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Box, Flex, Text, Select } from "@radix-ui/themes";
import selectStyles from "@/styles/selects.module.css";
import { 
  TRACKABLE_JOINTS, 
  type AccelerationHistoryPoint,
} from "../hooks/useJointHistory";

type ViewMode = "position" | "velocity" | "acceleration";

interface JointAccelerationChartProps {
  /** Get acceleration history for a joint */
  getAccelerationHistory: (jointName: string) => AccelerationHistoryPoint[];
  /** Current frame number */
  currentFrame: number;
  /** Callback when user clicks on a frame */
  onFrameClick?: (frame: number) => void;
  /** Callback to clear all history */
  onClear?: () => void;
  /** Whether the chart is enabled */
  isEnabled: boolean;
  /** Video FPS for time display */
  videoFPS?: number;
}

/** Chart dimensions */
const CHART_CONFIG = {
  height: 160,
  padding: { top: 25, right: 20, bottom: 30, left: 60 },
  pointRadius: 2,
  lineWidth: 1.5,
};

/**
 * Chart component for visualizing joint acceleration relative to body center
 */
export function JointAccelerationChart({
  getAccelerationHistory,
  currentFrame,
  onFrameClick,
  onClear,
  isEnabled,
  videoFPS = 30,
}: JointAccelerationChartProps) {
  const [selectedJoint, setSelectedJoint] = useState(TRACKABLE_JOINTS[6].name); // Right Wrist
  const [viewMode, setViewMode] = useState<ViewMode>("position"); // Start with position (works from first frame)
  const [showAxis, setShowAxis] = useState<"both" | "x" | "y" | "magnitude">("both");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  // Get history data (depend on currentFrame to trigger updates)
  const history = useMemo(() => {
    return getAccelerationHistory(selectedJoint);
  }, [selectedJoint, getAccelerationHistory, currentFrame]);

  // Get data keys based on view mode
  const { dataKeyX, dataKeyY, dataKeyMag, unit, label } = useMemo(() => {
    switch (viewMode) {
      case "position":
        return {
          dataKeyX: "relativeX",
          dataKeyY: "relativeY",
          dataKeyMag: null,
          unit: "px",
          label: "Relative Position",
        };
      case "velocity":
        return {
          dataKeyX: "velocityX",
          dataKeyY: "velocityY",
          dataKeyMag: "velocity",
          unit: "px/frame",
          label: "Velocity",
        };
      case "acceleration":
        return {
          dataKeyX: "accelerationX",
          dataKeyY: "accelerationY",
          dataKeyMag: "acceleration",
          unit: "px/frame²",
          label: "Acceleration",
        };
    }
  }, [viewMode]);

  // Calculate chart bounds
  const bounds = useMemo(() => {
    if (history.length === 0) {
      return {
        minFrame: 0,
        maxFrame: 100,
        minValue: -50,
        maxValue: 50,
      };
    }

    let minFrame = Infinity, maxFrame = -Infinity;
    let minValue = Infinity, maxValue = -Infinity;

    history.forEach((point: AccelerationHistoryPoint) => {
      minFrame = Math.min(minFrame, point.frame);
      maxFrame = Math.max(maxFrame, point.frame);
      
      // Get values to display based on axis selection
      const values: number[] = [];
      if (showAxis === "x" || showAxis === "both") {
        values.push((point as any)[dataKeyX] as number);
      }
      if (showAxis === "y" || showAxis === "both") {
        values.push((point as any)[dataKeyY] as number);
      }
      if (showAxis === "magnitude" && dataKeyMag) {
        values.push((point as any)[dataKeyMag] as number);
      }
      
      values.forEach(v => {
        if (typeof v === "number" && !isNaN(v)) {
          minValue = Math.min(minValue, v);
          maxValue = Math.max(maxValue, v);
        }
      });
    });

    // Add padding
    const range = maxValue - minValue;
    const valuePadding = range * 0.1 || 10;
    
    // For magnitude, ensure we start at 0
    if (showAxis === "magnitude") {
      minValue = 0;
    }
    
    return {
      minFrame,
      maxFrame: Math.max(maxFrame, minFrame + 10),
      minValue: minValue - valuePadding,
      maxValue: maxValue + valuePadding,
    };
  }, [history, dataKeyX, dataKeyY, dataKeyMag, showAxis]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Draw the chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = containerWidth;
    const height = CHART_CONFIG.height;
    const { padding } = CHART_CONFIG;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Set canvas size
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    // Helper to convert frame to X coordinate
    const frameToX = (frame: number): number => {
      const ratio = (frame - bounds.minFrame) / (bounds.maxFrame - bounds.minFrame);
      return padding.left + ratio * chartWidth;
    };

    // Helper to convert value to Y coordinate
    const valueToY = (value: number): number => {
      const ratio = 1 - (value - bounds.minValue) / (bounds.maxValue - bounds.minValue);
      return padding.top + ratio * chartHeight;
    };

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    const numHLines = 5;
    for (let i = 0; i <= numHLines; i++) {
      const y = padding.top + (chartHeight / numHLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      // Y-axis labels
      const value = bounds.maxValue - (bounds.maxValue - bounds.minValue) * (i / numHLines);
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "10px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(value.toFixed(1), padding.left - 5, y + 3);
    }

    // Zero line if in range
    if (bounds.minValue < 0 && bounds.maxValue > 0) {
      const zeroY = valueToY(0);
      ctx.strokeStyle = "rgba(100, 200, 100, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, zeroY);
      ctx.lineTo(width - padding.right, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Vertical grid lines
    const frameStep = Math.max(1, Math.floor((bounds.maxFrame - bounds.minFrame) / 8));
    for (let frame = bounds.minFrame; frame <= bounds.maxFrame; frame += frameStep) {
      const x = frameToX(frame);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    // Draw current frame indicator
    if (currentFrame >= bounds.minFrame && currentFrame <= bounds.maxFrame) {
      const x = frameToX(currentFrame);
      ctx.strokeStyle = "rgba(122, 219, 143, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    if (history.length < 2) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Play video to see data...", width / 2, height / 2);
      return;
    }

    // Draw data lines
    const drawLine = (dataKey: string, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = CHART_CONFIG.lineWidth;
      ctx.beginPath();
      
      let started = false;
      history.forEach((point: any) => {
        const value = point[dataKey] as number;
        if (typeof value !== "number" || isNaN(value)) return;
        
        const x = frameToX(point.frame);
        const y = valueToY(value);
        
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    };

    // Draw based on axis selection
    if (showAxis === "x" || showAxis === "both") {
      drawLine(dataKeyX, "#FF6B6B"); // Red for X
    }
    if (showAxis === "y" || showAxis === "both") {
      drawLine(dataKeyY, "#4ECDC4"); // Cyan for Y
    }
    if (showAxis === "magnitude" && dataKeyMag) {
      drawLine(dataKeyMag, "#A855F7"); // Purple for magnitude
    }

    // Y-axis label
    ctx.save();
    ctx.fillStyle = "#A855F7";
    ctx.font = "11px system-ui";
    ctx.translate(14, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(`${label} (${unit})`, 0, 0);
    ctx.restore();

    // X-axis labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    
    for (let frame = bounds.minFrame; frame <= bounds.maxFrame; frame += frameStep) {
      const x = frameToX(frame);
      ctx.fillText(frame.toString(), x, height - 8);
    }

    ctx.fillText("Frame", width / 2, height - 2);

  }, [history, bounds, currentFrame, showAxis, dataKeyX, dataKeyY, dataKeyMag, label, unit, containerWidth]);

  // Handle click to seek
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onFrameClick || history.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const { padding } = CHART_CONFIG;
    const chartWidth = containerWidth - padding.left - padding.right;

    const ratio = (x - padding.left) / chartWidth;
    const frame = Math.round(bounds.minFrame + ratio * (bounds.maxFrame - bounds.minFrame));
    
    if (frame >= bounds.minFrame && frame <= bounds.maxFrame) {
      onFrameClick(frame);
    }
  }, [onFrameClick, history, bounds, containerWidth]);

  // Get stats
  const stats = useMemo(() => {
    if (history.length === 0) return null;

    let maxAccel = 0;
    let avgAccel = 0;

    history.forEach((point) => {
      maxAccel = Math.max(maxAccel, point.acceleration);
      avgAccel += point.acceleration;
    });

    avgAccel /= history.length;

    return { maxAccel, avgAccel, totalFrames: history.length };
  }, [history]);

  if (!isEnabled) {
    return null;
  }

  return (
    <Box
      ref={containerRef}
      style={{
        backgroundColor: "var(--gray-3)",
        borderRadius: "var(--radius-2)",
        padding: "var(--space-2)",
      }}
    >
      {/* Header */}
      <Flex align="center" justify="between" gap="2" mb="2" wrap="wrap">
        <Flex align="center" gap="2" wrap="wrap">
          {/* View Mode Toggle */}
          <Flex
            gap="0"
            style={{
              backgroundColor: "var(--gray-5)",
              borderRadius: "var(--radius-2)",
              padding: "2px",
            }}
          >
            {(["position", "velocity", "acceleration"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "var(--radius-1)",
                  border: "none",
                  backgroundColor: viewMode === mode ? "var(--gray-7)" : "transparent",
                  color: viewMode === mode ? "#A855F7" : "var(--gray-10)",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: viewMode === mode ? 600 : 400,
                  textTransform: "capitalize",
                }}
              >
                {mode === "position" ? "Pos" : mode === "velocity" ? "Vel" : "Accel"}
              </button>
            ))}
          </Flex>
          
          {/* Joint Selector */}
          <Select.Root
            value={selectedJoint}
            onValueChange={setSelectedJoint}
          >
            <Select.Trigger 
              className={selectStyles.selectTriggerStyled} 
              style={{ minWidth: "130px", height: "28px", fontSize: "11px" }}
            />
            <Select.Content>
              {TRACKABLE_JOINTS.map((joint) => (
                <Select.Item key={joint.name} value={joint.name}>
                  {joint.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          {/* Axis Toggle */}
          <Flex
            gap="0"
            style={{
              backgroundColor: "var(--gray-5)",
              borderRadius: "var(--radius-2)",
              padding: "2px",
            }}
          >
            {(["magnitude", "x", "y", "both"] as const).map((axis) => (
              <button
                key={axis}
                onClick={() => setShowAxis(axis)}
                style={{
                  padding: "4px 6px",
                  borderRadius: "var(--radius-1)",
                  border: "none",
                  backgroundColor: showAxis === axis ? "var(--gray-7)" : "transparent",
                  color: showAxis === axis 
                    ? (axis === "x" ? "#FF6B6B" : axis === "y" ? "#4ECDC4" : "#A855F7")
                    : "var(--gray-10)",
                  cursor: "pointer",
                  fontSize: "10px",
                  textTransform: "capitalize",
                }}
              >
                {axis === "magnitude" ? "|v|" : axis.toUpperCase()}
              </button>
            ))}
          </Flex>
        </Flex>

        {/* Stats & Clear */}
        <Flex gap="3" align="center">
          {stats && (
            <>
              <Text size="1" color="gray">
                {stats.totalFrames} frames
              </Text>
              <Text size="1" color="gray">
                Peak: {stats.maxAccel.toFixed(1)} {unit}
              </Text>
              <Text size="1" color="gray">
                Avg: {stats.avgAccel.toFixed(1)} {unit}
              </Text>
            </>
          )}
          {onClear && (
            <button
              onClick={onClear}
              style={{
                padding: "2px 8px",
                borderRadius: "var(--radius-1)",
                border: "1px solid var(--gray-6)",
                backgroundColor: "transparent",
                color: "var(--gray-10)",
                cursor: "pointer",
                fontSize: "10px",
              }}
            >
              Clear
            </button>
          )}
        </Flex>
      </Flex>

      {/* Chart Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          cursor: onFrameClick ? "crosshair" : "default",
          display: "block",
          width: "100%",
          borderRadius: "4px",
        }}
      />

      {/* Legend */}
      <Flex gap="3" mt="2" align="center" style={{ fontSize: "10px" }}>
        {(showAxis === "x" || showAxis === "both") && (
          <Flex align="center" gap="1">
            <Box style={{ width: 10, height: 3, backgroundColor: "#FF6B6B", borderRadius: 2 }} />
            <Text size="1" color="gray">X (horizontal)</Text>
          </Flex>
        )}
        {(showAxis === "y" || showAxis === "both") && (
          <Flex align="center" gap="1">
            <Box style={{ width: 10, height: 3, backgroundColor: "#4ECDC4", borderRadius: 2 }} />
            <Text size="1" color="gray">Y (vertical)</Text>
          </Flex>
        )}
        {showAxis === "magnitude" && (
          <Flex align="center" gap="1">
            <Box style={{ width: 10, height: 3, backgroundColor: "#A855F7", borderRadius: 2 }} />
            <Text size="1" color="gray">Magnitude</Text>
          </Flex>
        )}
        <Flex align="center" gap="1">
          <Box style={{ width: 2, height: 10, backgroundColor: "#7ADB8F" }} />
          <Text size="1" color="gray">Current</Text>
        </Flex>
        <Text size="1" color="gray" style={{ marginLeft: "auto" }}>
          Relative to body center • Click to seek
        </Text>
      </Flex>
    </Box>
  );
}

