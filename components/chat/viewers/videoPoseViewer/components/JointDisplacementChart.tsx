"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Box, Flex, Text, Select } from "@radix-ui/themes";
import selectStyles from "@/styles/selects.module.css";
import { 
  BODY_SEGMENTS, 
  JOINT_ANGLES,
  type SegmentHistoryPoint,
  type AngleHistoryPoint,
  type SegmentDefinition,
  type AngleDefinition,
} from "../hooks/useJointHistory";

type MetricType = "segment" | "angle";

interface JointDisplacementChartProps {
  /** Get segment length history */
  getSegmentHistory: (segmentName: string) => SegmentHistoryPoint[];
  /** Get angle history */
  getAngleHistory: (angleName: string) => AngleHistoryPoint[];
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
  height: 140,
  padding: { top: 25, right: 20, bottom: 30, left: 55 },
  pointRadius: 2,
  lineWidth: 1.5,
};

/**
 * Chart component for visualizing relative joint metrics over time
 * Shows segment lengths or joint angles instead of absolute pixel positions
 */
export function JointDisplacementChart({
  getSegmentHistory,
  getAngleHistory,
  currentFrame,
  onFrameClick,
  onClear,
  isEnabled,
  videoFPS = 30,
}: JointDisplacementChartProps) {
  const [metricType, setMetricType] = useState<MetricType>("segment");
  const [selectedSegment, setSelectedSegment] = useState(BODY_SEGMENTS[3].name); // Right Forearm
  const [selectedAngle, setSelectedAngle] = useState(JOINT_ANGLES[1].name); // Right Elbow
  const [showChange, setShowChange] = useState(false); // Show rate of change vs absolute value
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  // Get history data based on selection
  const { history, dataKey, unit, changeKey, changeThreshold } = useMemo(() => {
    if (metricType === "segment") {
      return {
        history: getSegmentHistory(selectedSegment) as (SegmentHistoryPoint | AngleHistoryPoint)[],
        dataKey: showChange ? "lengthChange" : "normalizedLength",
        unit: showChange ? "ratio" : "× torso",
        changeKey: "lengthChange",
        changeThreshold: 0.3, // 30% change is suspicious
      };
    } else {
      return {
        history: getAngleHistory(selectedAngle) as (SegmentHistoryPoint | AngleHistoryPoint)[],
        dataKey: showChange ? "angleChange" : "angle",
        unit: showChange ? "°/frame" : "°",
        changeKey: "angleChange",
        changeThreshold: 30, // 30 degree change per frame is suspicious
      };
    }
  }, [metricType, selectedSegment, selectedAngle, showChange, getSegmentHistory, getAngleHistory]);

  // Calculate chart bounds
  const bounds = useMemo(() => {
    if (history.length === 0) {
      return {
        minFrame: 0,
        maxFrame: 100,
        minValue: 0,
        maxValue: metricType === "angle" ? 180 : 2,
      };
    }

    let minFrame = Infinity, maxFrame = -Infinity;
    let minValue = Infinity, maxValue = -Infinity;

    history.forEach((point: any) => {
      minFrame = Math.min(minFrame, point.frame);
      maxFrame = Math.max(maxFrame, point.frame);
      const value = point[dataKey] as number;
      if (typeof value === "number" && !isNaN(value)) {
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
    });

    // Add padding
    const valuePadding = (maxValue - minValue) * 0.1 || 0.5;
    
    // For change view, center around 1.0 (no change) for segments
    if (showChange && metricType === "segment") {
      minValue = Math.min(minValue, 0.7);
      maxValue = Math.max(maxValue, 1.3);
    }
    
    return {
      minFrame,
      maxFrame: Math.max(maxFrame, minFrame + 10),
      minValue: minValue - valuePadding,
      maxValue: maxValue + valuePadding,
    };
  }, [history, dataKey, metricType, showChange]);

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
      ctx.fillText(value.toFixed(metricType === "angle" || showChange ? 0 : 2), padding.left - 5, y + 3);
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

    // Draw reference line for "no change" in change view
    if (showChange) {
      const refValue = metricType === "segment" ? 1.0 : 0;
      const refY = valueToY(refValue);
      ctx.strokeStyle = "rgba(100, 200, 100, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, refY);
      ctx.lineTo(width - padding.right, refY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Label
      ctx.fillStyle = "rgba(100, 200, 100, 0.7)";
      ctx.font = "9px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(metricType === "segment" ? "No change (1.0)" : "No change (0°)", padding.left + 5, refY - 4);
    }

    // Draw banana frame markers
    history.forEach((point: any) => {
      if (point.isBanana) {
        const x = frameToX(point.frame);
        ctx.fillStyle = "rgba(255, 100, 100, 0.25)";
        ctx.fillRect(x - 2, padding.top, 4, chartHeight);
      }
    });

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

    // Choose color based on metric type
    const lineColor = metricType === "segment" ? "#4ECDC4" : "#A855F7";
    const pointColor = metricType === "segment" ? "#4ECDC4" : "#A855F7";

    // Draw data line
    ctx.strokeStyle = lineColor;
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

    // Draw points
    history.forEach((point: any) => {
      const value = point[dataKey] as number;
      if (typeof value !== "number" || isNaN(value)) return;
      
      const x = frameToX(point.frame);
      const y = valueToY(value);
      
      // Highlight suspicious changes
      const changeValue = point[changeKey] as number;
      const isSuspicious = showChange && metricType === "segment" 
        ? Math.abs(changeValue - 1.0) > changeThreshold
        : showChange && changeValue > changeThreshold;
      
      ctx.fillStyle = point.isBanana ? "#FF5252" : (isSuspicious ? "#FF9800" : pointColor);
      ctx.beginPath();
      ctx.arc(x, y, point.isBanana || isSuspicious ? 4 : CHART_CONFIG.pointRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Y-axis label
    ctx.save();
    ctx.fillStyle = lineColor;
    ctx.font = "11px system-ui";
    ctx.translate(12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    const yLabel = showChange 
      ? (metricType === "segment" ? "Length Change Ratio" : "Angle Change (°)")
      : (metricType === "segment" ? "Normalized Length" : "Angle (°)");
    ctx.fillText(yLabel, 0, 0);
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

  }, [history, bounds, currentFrame, showChange, metricType, dataKey, changeKey, changeThreshold, containerWidth]);

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

    let maxChange = 0;
    let avgValue = 0;
    let bananaCount = 0;

    history.forEach((point: any) => {
      const change = Math.abs(point[changeKey] - (metricType === "segment" ? 1.0 : 0));
      maxChange = Math.max(maxChange, change);
      avgValue += point[dataKey] as number;
      if (point.isBanana) bananaCount++;
    });

    avgValue /= history.length;

    return { maxChange, avgValue, bananaCount, totalFrames: history.length };
  }, [history, dataKey, changeKey, metricType]);

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
          {/* Metric Type Toggle */}
          <Flex
            gap="0"
            style={{
              backgroundColor: "var(--gray-5)",
              borderRadius: "var(--radius-2)",
              padding: "2px",
            }}
          >
            <button
              onClick={() => setMetricType("segment")}
              style={{
                padding: "4px 10px",
                borderRadius: "var(--radius-1)",
                border: "none",
                backgroundColor: metricType === "segment" ? "var(--gray-7)" : "transparent",
                color: metricType === "segment" ? "#4ECDC4" : "var(--gray-10)",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: metricType === "segment" ? 600 : 400,
              }}
            >
              Segments
            </button>
            <button
              onClick={() => setMetricType("angle")}
              style={{
                padding: "4px 10px",
                borderRadius: "var(--radius-1)",
                border: "none",
                backgroundColor: metricType === "angle" ? "var(--gray-7)" : "transparent",
                color: metricType === "angle" ? "#A855F7" : "var(--gray-10)",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: metricType === "angle" ? 600 : 400,
              }}
            >
              Angles
            </button>
          </Flex>
          
          {/* Selector */}
          {metricType === "segment" ? (
            <Select.Root
              value={selectedSegment}
              onValueChange={setSelectedSegment}
            >
              <Select.Trigger 
                className={selectStyles.selectTriggerStyled} 
                style={{ minWidth: "130px", height: "28px", fontSize: "11px" }}
              />
              <Select.Content>
                {BODY_SEGMENTS.map((seg) => (
                  <Select.Item key={seg.name} value={seg.name}>
                    {seg.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          ) : (
            <Select.Root
              value={selectedAngle}
              onValueChange={setSelectedAngle}
            >
              <Select.Trigger 
                className={selectStyles.selectTriggerStyled} 
                style={{ minWidth: "130px", height: "28px", fontSize: "11px" }}
              />
              <Select.Content>
                {JOINT_ANGLES.map((ang) => (
                  <Select.Item key={ang.name} value={ang.name}>
                    {ang.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}

          {/* Show Change Toggle */}
          <Flex
            gap="0"
            style={{
              backgroundColor: "var(--gray-5)",
              borderRadius: "var(--radius-2)",
              padding: "2px",
            }}
          >
            <button
              onClick={() => setShowChange(false)}
              style={{
                padding: "4px 8px",
                borderRadius: "var(--radius-1)",
                border: "none",
                backgroundColor: !showChange ? "var(--gray-7)" : "transparent",
                color: !showChange ? "var(--gray-12)" : "var(--gray-10)",
                cursor: "pointer",
                fontSize: "10px",
              }}
            >
              Value
            </button>
            <button
              onClick={() => setShowChange(true)}
              style={{
                padding: "4px 8px",
                borderRadius: "var(--radius-1)",
                border: "none",
                backgroundColor: showChange ? "var(--gray-7)" : "transparent",
                color: showChange ? "var(--gray-12)" : "var(--gray-10)",
                cursor: "pointer",
                fontSize: "10px",
              }}
            >
              Δ Change
            </button>
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
                Avg: {stats.avgValue.toFixed(metricType === "angle" ? 0 : 2)}{unit}
              </Text>
              {stats.bananaCount > 0 && (
                <Text size="1" style={{ color: "#FF5252" }}>
                  🍌 {stats.bananaCount}
                </Text>
              )}
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
        <Flex align="center" gap="1">
          <Box style={{ 
            width: 10, height: 3, 
            backgroundColor: metricType === "segment" ? "#4ECDC4" : "#A855F7", 
            borderRadius: 2 
          }} />
          <Text size="1" color="gray">
            {metricType === "segment" ? selectedSegment : selectedAngle}
          </Text>
        </Flex>
        <Flex align="center" gap="1">
          <Box style={{ width: 2, height: 10, backgroundColor: "#7ADB8F" }} />
          <Text size="1" color="gray">Current</Text>
        </Flex>
        {showChange && (
          <Flex align="center" gap="1">
            <Box style={{ width: 6, height: 6, backgroundColor: "#FF9800", borderRadius: "50%" }} />
            <Text size="1" color="gray">Large Δ</Text>
          </Flex>
        )}
        <Text size="1" color="gray" style={{ marginLeft: "auto" }}>
          Click to seek
        </Text>
      </Flex>
    </Box>
  );
}
