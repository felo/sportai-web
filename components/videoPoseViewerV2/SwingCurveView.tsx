"use client";

/**
 * SwingCurveView
 * 
 * Visualizes swing detection data with interactive charts showing:
 * - Wrist velocity over time
 * - Body orientation/rotation over time
 * - Swing score (combined metric)
 * - Swing phases highlighted as colored regions
 */

import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { Box, Flex, Text, SegmentedControl, Tooltip, Select } from "@radix-ui/themes";
import { 
  ActivityLogIcon, 
  MixerHorizontalIcon,
} from "@radix-ui/react-icons";
import type { SwingDetectionResultV3, SwingFrameDataV3, SwingPhase } from "./hooks/useSwingDetectionV3";

// ============================================================================
// Types
// ============================================================================

// Export types for external state management
export type MetricType = "velocity" | "acceleration" | "orientation" | "kneeBend" | "score";
export type WristType = "left" | "right" | "both";
export type KneeType = "left" | "right" | "both";
export type AngleType = "knee" | "shoulder" | "elbow" | "hip"; // Which joint angle to show
export type VelocityBodyPart = "wrist" | "ankle" | "knee" | "hip" | "shoulder" | "elbow"; // Which body part velocity to show
export type OrientationType = "body" | "hipAngular" | "shoulderAngular" | "xFactor"; // Which orientation metric to show

export interface SwingCurveViewProps {
  /** Swing detection result with frame data */
  swingResult: SwingDetectionResultV3 | null;
  /** Video FPS for time calculations */
  videoFPS: number;
  /** Current frame for playhead indicator */
  currentFrame: number;
  /** Total frames in video */
  totalFrames: number;
  /** Callback when user clicks on the chart to seek */
  onSeekToFrame?: (frame: number) => void;
  /** Whether preprocessing/analysis is in progress */
  isAnalyzing?: boolean;
  /** Developer mode - shows additional metrics like swing score */
  developerMode?: boolean;
  /** Selected metric tab (controlled) */
  selectedMetric?: MetricType;
  /** Callback when metric changes */
  onMetricChange?: (metric: MetricType) => void;
  /** Selected wrist (controlled) */
  selectedWrist?: WristType;
  /** Callback when wrist changes */
  onWristChange?: (wrist: WristType) => void;
  /** Selected knee/side (controlled) */
  selectedKnee?: KneeType;
  /** Callback when knee/side changes */
  onKneeChange?: (knee: KneeType) => void;
  /** Selected angle type for angles view (controlled) */
  selectedAngleType?: AngleType;
  /** Callback when angle type changes */
  onAngleTypeChange?: (angleType: AngleType) => void;
  /** Selected body part for velocity view (controlled) */
  selectedVelocityBodyPart?: VelocityBodyPart;
  /** Callback when velocity body part changes */
  onVelocityBodyPartChange?: (bodyPart: VelocityBodyPart) => void;
  /** Selected orientation type for orientation view (controlled) */
  selectedOrientationType?: OrientationType;
  /** Callback when orientation type changes */
  onOrientationTypeChange?: (orientationType: OrientationType) => void;
  /** Confidence threshold for highlighting low-confidence frames (0-1) (controlled) */
  confidenceThreshold?: number;
  /** Callback when confidence threshold changes */
  onConfidenceThresholdChange?: (threshold: number) => void;
  /** Whether to show outer angles (180° - angle) instead of inner angles */
  useComplementaryAngles?: boolean;
  /** Custom class name */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
}

interface ChartDataPoint {
  frame: number;
  time: number;
  value: number | null;
  phase: SwingPhase;
}

// ============================================================================
// Constants
// ============================================================================

const PHASE_COLORS: Record<SwingPhase, string> = {
  neutral: "rgba(107, 114, 128, 0.15)",  // Gray, very subtle
  loading: "rgba(99, 102, 241, 0.25)",   // Indigo
  swing: "rgba(245, 158, 11, 0.25)",     // Amber
  contact: "rgba(239, 68, 68, 0.35)",    // Red
  follow: "rgba(16, 185, 129, 0.25)",    // Green
  recovery: "rgba(107, 114, 128, 0.2)",  // Gray
};

const PHASE_LINE_COLORS: Record<SwingPhase, string> = {
  neutral: "#6B7280",
  loading: "#6366F1",
  swing: "#F59E0B",
  contact: "#EF4444",
  follow: "#10B981",
  recovery: "#6B7280",
};

const METRIC_COLORS = {
  velocity: "#8B5CF6",      // Purple
  acceleration: "#F97316",  // Orange
  orientation: "#22D3EE",   // Cyan
  kneeBend: "#F472B6",      // Pink
  score: "#F59E0B",         // Amber
  leftWrist: "#EC4899",     // Pink
  rightWrist: "#3B82F6",    // Blue
};

const CHART_PADDING = { top: 24, right: 16, bottom: 40, left: 56 };

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return mins > 0 ? `${mins}:${secs.padStart(4, "0")}` : `${secs}s`;
}

function getPhaseLabel(phase: SwingPhase): string {
  const labels: Record<SwingPhase, string> = {
    neutral: "Neutral",
    loading: "Loading",
    swing: "Swing",
    contact: "Contact",
    follow: "Follow-through",
    recovery: "Recovery",
  };
  return labels[phase];
}


// ============================================================================
// SVG Chart Component
// ============================================================================

interface ChartProps {
  data: ChartDataPoint[];
  rawData?: ChartDataPoint[];  // Raw data for comparison (velocity only)
  width: number;
  height: number;
  metricType: MetricType;
  currentFrame: number;
  onSeekToFrame?: (frame: number) => void;
  showPhases?: boolean;
  secondaryData?: ChartDataPoint[]; // For dual-axis charts
  secondaryLabel?: string;
  lowConfidenceRegions?: Array<{ startFrame: number; endFrame: number }>; // Regions where wrist confidence is low
  velocityBodyPart?: VelocityBodyPart; // Which body part for velocity view
  orientationType?: OrientationType; // Which orientation metric for orientation view
}

function SwingChart({
  data,
  rawData,
  width,
  height,
  metricType,
  currentFrame,
  onSeekToFrame,
  showPhases = true,
  secondaryData,
  secondaryLabel,
  lowConfidenceRegions = [],
  velocityBodyPart = "wrist",
  orientationType = "body",
}: ChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);

  const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

  // Filter valid data points and calculate ranges
  // Include both processed AND raw data in Y-axis bounds to show all peaks
  const { validData, minValue, maxValue, xScale, yScale } = useMemo(() => {
    const valid = data.filter((d) => d.value !== null);
    if (valid.length === 0) {
      return { validData: [], minValue: 0, maxValue: 100, xScale: () => 0, yScale: () => 0 };
    }

    // Get values from processed data
    const processedValues = valid.map((d) => d.value as number);
    
    // Also include raw data values for Y-axis bounds (if available)
    const rawValues = rawData
      ? rawData.filter((d) => d.value !== null).map((d) => d.value as number)
      : [];
    
    // Combine both to find true min/max
    const allValues = [...processedValues, ...rawValues];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || 10;

    const minFrame = data[0]?.frame ?? 0;
    const maxFrame = data[data.length - 1]?.frame ?? 1;

    return {
      validData: valid,
      minValue: min - padding,
      maxValue: max + padding,
      xScale: (frame: number) => 
        CHART_PADDING.left + ((frame - minFrame) / (maxFrame - minFrame || 1)) * chartWidth,
      yScale: (value: number) => 
        CHART_PADDING.top + chartHeight - ((value - (min - padding)) / ((max + padding) - (min - padding) || 1)) * chartHeight,
    };
  }, [data, rawData, chartWidth, chartHeight]);

  // Generate SVG path for processed data (fillDrops + smoothing applied)
  const linePath = useMemo(() => {
    if (validData.length < 2) return "";
    
    return validData.reduce((path, point, i) => {
      const x = xScale(point.frame);
      const y = yScale(point.value as number);
      return path + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    }, "");
  }, [validData, xScale, yScale]);

  // Generate SVG path for RAW data (before any processing)
  const rawLinePath = useMemo(() => {
    if (!rawData || rawData.length < 2 || (metricType !== "velocity" && metricType !== "kneeBend")) return "";
    
    const validRaw = rawData.filter(d => d.value !== null);
    if (validRaw.length < 2) return "";
    
    return validRaw.reduce((path, point, i) => {
      const x = xScale(point.frame);
      const y = yScale(point.value as number);
      return path + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    }, "");
  }, [rawData, xScale, yScale, metricType]);

  // Generate phase regions
  const phaseRegions = useMemo(() => {
    if (!showPhases || data.length === 0) return [];
    
    const regions: Array<{ phase: SwingPhase; startFrame: number; endFrame: number }> = [];
    let currentPhase = data[0].phase;
    let startFrame = data[0].frame;

    for (let i = 1; i < data.length; i++) {
      if (data[i].phase !== currentPhase) {
        if (currentPhase !== "neutral") {
          regions.push({ phase: currentPhase, startFrame, endFrame: data[i - 1].frame });
        }
        currentPhase = data[i].phase;
        startFrame = data[i].frame;
      }
    }
    
    // Don't forget the last region
    if (currentPhase !== "neutral") {
      regions.push({ phase: currentPhase, startFrame, endFrame: data[data.length - 1].frame });
    }

    return regions;
  }, [data, showPhases]);

  // Calculate statistics: average, peak, and valley for smoothed data
  const { average, peakPoint, valleyPoint } = useMemo(() => {
    if (validData.length === 0) {
      return { average: null, peakPoint: null, valleyPoint: null };
    }

    const values = validData.map((d) => d.value as number);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    // Find peak (maximum value)
    let maxVal = -Infinity;
    let maxPoint: ChartDataPoint | null = null;
    
    // Find valley (minimum value)
    let minVal = Infinity;
    let minPoint: ChartDataPoint | null = null;
    
    for (const point of validData) {
      const val = point.value as number;
      if (val > maxVal) {
        maxVal = val;
        maxPoint = point;
      }
      if (val < minVal) {
        minVal = val;
        minPoint = point;
      }
    }
    
    return { average: avg, peakPoint: maxPoint, valleyPoint: minPoint };
  }, [validData]);

  // Calculate statistics for raw data (when available)
  const { rawPeakPoint, rawValleyPoint } = useMemo(() => {
    if (!rawData || rawData.length === 0 || (metricType !== "velocity" && metricType !== "kneeBend")) {
      return { rawPeakPoint: null, rawValleyPoint: null };
    }

    const validRaw = rawData.filter((d) => d.value !== null);
    if (validRaw.length === 0) {
      return { rawPeakPoint: null, rawValleyPoint: null };
    }
    
    // Find peak (maximum value)
    let maxVal = -Infinity;
    let maxPoint: ChartDataPoint | null = null;
    
    // Find valley (minimum value)
    let minVal = Infinity;
    let minPoint: ChartDataPoint | null = null;
    
    for (const point of validRaw) {
      const val = point.value as number;
      if (val > maxVal) {
        maxVal = val;
        maxPoint = point;
      }
      if (val < minVal) {
        minVal = val;
        minPoint = point;
      }
    }
    
    return { rawPeakPoint: maxPoint, rawValleyPoint: minPoint };
  }, [rawData, metricType]);

  // Generate missing data regions (where wrist confidence is below threshold)
  // Uses lowConfidenceRegions prop if available (based on confidence scores)
  // Falls back to checking for null velocity values
  const missingDataRegions = useMemo(() => {
    // If lowConfidenceRegions is provided and has data, use it
    if (lowConfidenceRegions && lowConfidenceRegions.length > 0) {
      return lowConfidenceRegions;
    }
    
    // Fallback: check for null values in raw data
    if (metricType !== "velocity" || !rawData || rawData.length === 0) return [];
    
    const regions: Array<{ startFrame: number; endFrame: number }> = [];
    let inMissingRegion = false;
    let regionStart = 0;

    for (let i = 0; i < rawData.length; i++) {
      const isMissing = rawData[i].value === null;
      
      if (isMissing && !inMissingRegion) {
        // Start of missing region
        inMissingRegion = true;
        regionStart = rawData[i].frame;
      } else if (!isMissing && inMissingRegion) {
        // End of missing region
        inMissingRegion = false;
        regions.push({ startFrame: regionStart, endFrame: rawData[i - 1].frame });
      }
    }
    
    // Don't forget the last region if still in missing
    if (inMissingRegion) {
      regions.push({ startFrame: regionStart, endFrame: rawData[rawData.length - 1].frame });
    }

    return regions;
  }, [rawData, metricType, lowConfidenceRegions]);

  // Handle mouse interactions
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setMouseX(x);

    // Find closest data point
    const minFrame = data[0].frame;
    const maxFrame = data[data.length - 1].frame;
    const frameRange = maxFrame - minFrame || 1;
    
    const normalizedX = (x - CHART_PADDING.left) / chartWidth;
    const frame = Math.round(minFrame + normalizedX * frameRange);
    
    const point = data.find((d) => d.frame === frame);
    setHoveredPoint(point || null);
  }, [data, chartWidth]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    setMouseX(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!onSeekToFrame || data.length === 0) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    const minFrame = data[0].frame;
    const maxFrame = data[data.length - 1].frame;
    const frameRange = maxFrame - minFrame || 1;
    
    const normalizedX = (x - CHART_PADDING.left) / chartWidth;
    const frame = Math.round(minFrame + normalizedX * frameRange);
    
    const clampedFrame = Math.max(minFrame, Math.min(maxFrame, frame));
    onSeekToFrame(clampedFrame);
  }, [data, chartWidth, onSeekToFrame]);

  // Y-axis labels
  const yAxisLabels = useMemo(() => {
    const count = 5;
    const labels = [];
    for (let i = 0; i <= count; i++) {
      const value = minValue + (maxValue - minValue) * (i / count);
      labels.push({
        value,
        y: yScale(value),
        label: value.toFixed(metricType === "orientation" ? 0 : 1),
      });
    }
    return labels;
  }, [minValue, maxValue, yScale, metricType]);

  // X-axis labels
  const xAxisLabels = useMemo(() => {
    if (data.length === 0) return [];
    
    const count = 6;
    const minFrame = data[0].frame;
    const maxFrame = data[data.length - 1].frame;
    const labels = [];
    
    for (let i = 0; i <= count; i++) {
      const frame = Math.round(minFrame + (maxFrame - minFrame) * (i / count));
      const point = data.find((d) => d.frame === frame) || data[Math.round(data.length * (i / count))];
      if (point) {
        labels.push({
          frame: point.frame,
          x: xScale(point.frame),
          label: formatTime(point.time),
        });
      }
    }
    return labels;
  }, [data, xScale]);

  // Current frame position
  const playheadX = useMemo(() => {
    if (data.length === 0) return null;
    const minFrame = data[0].frame;
    const maxFrame = data[data.length - 1].frame;
    if (currentFrame < minFrame || currentFrame > maxFrame) return null;
    return xScale(currentFrame);
  }, [data, currentFrame, xScale]);

  // Dynamic label based on body part for velocity
  const bodyPartLabels: Record<VelocityBodyPart, string> = {
    wrist: "Wrist",
    ankle: "Ankle",
    knee: "Knee",
    hip: "Hip",
    shoulder: "Shoulder",
    elbow: "Elbow",
  };
  
  // Dynamic label for orientation type
  const orientationLabels: Record<OrientationType, string> = {
    body: "Body Orientation (°)",
    hipAngular: "Hip Angular Vel (°/s)",
    shoulderAngular: "Shoulder Angular Vel (°/s)",
    xFactor: "X-Factor (°)",
  };
  
  const metricLabel = {
    velocity: `${bodyPartLabels[velocityBodyPart]} Velocity (km/h)`,
    acceleration: `${bodyPartLabels[velocityBodyPart]} Acceleration (km/h/s)`,
    orientation: orientationLabels[orientationType],
    kneeBend: "Angles (°)",
    score: "Swing Score",
  }[metricType];

  const lineColor = METRIC_COLORS[metricType];

  if (data.length === 0) {
    return (
      <Flex
        align="center"
        justify="center"
        style={{
          width,
          height,
          backgroundColor: "var(--gray-2)",
          borderRadius: "8px",
        }}
      >
        <Text size="2" color="gray">
          No data available
        </Text>
      </Flex>
    );
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ cursor: onSeekToFrame ? "crosshair" : "default" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Background */}
      <rect width={width} height={height} fill="var(--gray-2)" rx="8" />

      {/* Chart area background */}
      <rect
        x={CHART_PADDING.left}
        y={CHART_PADDING.top}
        width={chartWidth}
        height={chartHeight}
        fill="var(--gray-1)"
        rx="4"
      />

      {/* Phase regions */}
      {phaseRegions.map((region, i) => (
        <rect
          key={`phase-${i}`}
          x={xScale(region.startFrame)}
          y={CHART_PADDING.top}
          width={xScale(region.endFrame) - xScale(region.startFrame)}
          height={chartHeight}
          fill={PHASE_COLORS[region.phase]}
        />
      ))}

      {/* Missing wrist data regions (red highlight) */}
      {missingDataRegions.map((region, i) => (
        <g key={`missing-${i}`}>
          {/* Red background stripe */}
          <rect
            x={xScale(region.startFrame)}
            y={CHART_PADDING.top}
            width={Math.max(2, xScale(region.endFrame) - xScale(region.startFrame))}
            height={chartHeight}
            fill="rgba(239, 68, 68, 0.25)"
          />
          {/* Red vertical lines at boundaries */}
          <line
            x1={xScale(region.startFrame)}
            y1={CHART_PADDING.top}
            x2={xScale(region.startFrame)}
            y2={CHART_PADDING.top + chartHeight}
            stroke="rgba(239, 68, 68, 0.6)"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
          <line
            x1={xScale(region.endFrame)}
            y1={CHART_PADDING.top}
            x2={xScale(region.endFrame)}
            y2={CHART_PADDING.top + chartHeight}
            stroke="rgba(239, 68, 68, 0.6)"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        </g>
      ))}

      {/* Grid lines */}
      {yAxisLabels.map((label, i) => (
        <line
          key={`grid-y-${i}`}
          x1={CHART_PADDING.left}
          y1={label.y}
          x2={width - CHART_PADDING.right}
          y2={label.y}
          stroke="var(--gray-5)"
          strokeDasharray="4,4"
          strokeWidth="1"
        />
      ))}

      {/* Raw data line (before processing) - shown faded for velocity and knee bend */}
      {rawLinePath && (metricType === "velocity" || metricType === "kneeBend") && (
        <path
          d={rawLinePath}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.4"
        />
      )}

      {/* Processed data line (fillDrops + smoothing) - what protocol uses */}
      <path
        d={linePath}
        fill="none"
        stroke={(metricType === "velocity" || metricType === "kneeBend") ? "#10B981" : lineColor}
        strokeWidth={(metricType === "velocity" || metricType === "kneeBend") ? 2.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Gradient fill under line */}
      <defs>
        <linearGradient id={`gradient-${metricType}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gradient-smoothed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill under processed curve for velocity and knee bend */}
      {(metricType === "velocity" || metricType === "kneeBend") && linePath && (
        <path
          d={linePath + ` L ${xScale(data[data.length - 1]?.frame ?? 0)} ${CHART_PADDING.top + chartHeight} L ${xScale(data[0]?.frame ?? 0)} ${CHART_PADDING.top + chartHeight} Z`}
          fill="url(#gradient-smoothed)"
        />
      )}
      {/* Fill under line for other metrics */}
      {metricType !== "velocity" && metricType !== "kneeBend" && linePath && (
        <path
          d={linePath + ` L ${xScale(data[data.length - 1]?.frame ?? 0)} ${CHART_PADDING.top + chartHeight} L ${xScale(data[0]?.frame ?? 0)} ${CHART_PADDING.top + chartHeight} Z`}
          fill={`url(#gradient-${metricType})`}
        />
      )}

      {/* Average line */}
      {average !== null && (
        <>
          <line
            x1={CHART_PADDING.left}
            y1={yScale(average)}
            x2={width - CHART_PADDING.right}
            y2={yScale(average)}
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="1"
            strokeDasharray="6,4"
          />
          <text
            x={CHART_PADDING.left + 8}
            y={yScale(average) - 6}
            fontSize="10"
            fill="rgba(255, 255, 255, 0.7)"
            fontFamily="system-ui, sans-serif"
          >
            avg: {average.toFixed(1)}
          </text>
        </>
      )}

      {/* Raw data peak marker (faded, for velocity/angles) */}
      {rawPeakPoint && rawPeakPoint.value !== null && (metricType === "velocity" || metricType === "kneeBend") && (
        <>
          <circle
            cx={xScale(rawPeakPoint.frame)}
            cy={yScale(rawPeakPoint.value)}
            r="5"
            fill={lineColor}
            stroke="white"
            strokeWidth="1.5"
            opacity="0.6"
          />
          <text
            x={xScale(rawPeakPoint.frame)}
            y={yScale(rawPeakPoint.value) - 10}
            fontSize="9"
            fill={lineColor}
            fontWeight="500"
            fontFamily="system-ui, sans-serif"
            textAnchor="middle"
            opacity="0.7"
          >
            {rawPeakPoint.value.toFixed(1)}
          </text>
        </>
      )}

      {/* Raw data valley marker (faded, for velocity/angles) */}
      {rawValleyPoint && rawValleyPoint.value !== null && rawValleyPoint !== rawPeakPoint && (metricType === "velocity" || metricType === "kneeBend") && (
        <>
          <circle
            cx={xScale(rawValleyPoint.frame)}
            cy={yScale(rawValleyPoint.value)}
            r="5"
            fill={lineColor}
            stroke="white"
            strokeWidth="1.5"
            opacity="0.6"
          />
          <text
            x={xScale(rawValleyPoint.frame)}
            y={yScale(rawValleyPoint.value) + 16}
            fontSize="9"
            fill={lineColor}
            fontWeight="500"
            fontFamily="system-ui, sans-serif"
            textAnchor="middle"
            opacity="0.7"
          >
            {rawValleyPoint.value.toFixed(1)}
          </text>
        </>
      )}

      {/* Smoothed data peak marker (maximum value) */}
      {peakPoint && peakPoint.value !== null && (
        <>
          <circle
            cx={xScale(peakPoint.frame)}
            cy={yScale(peakPoint.value)}
            r="6"
            fill="#22C55E"
            stroke="white"
            strokeWidth="2"
          />
          <text
            x={xScale(peakPoint.frame)}
            y={yScale(peakPoint.value) - 12}
            fontSize="10"
            fill="#22C55E"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
            textAnchor="middle"
          >
            ▲ {peakPoint.value.toFixed(1)}
          </text>
        </>
      )}

      {/* Smoothed data valley marker (minimum value) */}
      {valleyPoint && valleyPoint.value !== null && valleyPoint !== peakPoint && (
        <>
          <circle
            cx={xScale(valleyPoint.frame)}
            cy={yScale(valleyPoint.value)}
            r="6"
            fill="#EF4444"
            stroke="white"
            strokeWidth="2"
          />
          <text
            x={xScale(valleyPoint.frame)}
            y={yScale(valleyPoint.value) + 20}
            fontSize="10"
            fill="#EF4444"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
            textAnchor="middle"
          >
            ▼ {valleyPoint.value.toFixed(1)}
          </text>
        </>
      )}

      {/* Playhead */}
      {playheadX !== null && (
        <>
          <line
            x1={playheadX}
            y1={CHART_PADDING.top}
            x2={playheadX}
            y2={CHART_PADDING.top + chartHeight}
            stroke="var(--mint-9)"
            strokeWidth="2"
          />
          <circle
            cx={playheadX}
            cy={CHART_PADDING.top}
            r="4"
            fill="var(--mint-9)"
          />
        </>
      )}

      {/* Hover indicator */}
      {mouseX !== null && hoveredPoint && (
        <>
          <line
            x1={mouseX}
            y1={CHART_PADDING.top}
            x2={mouseX}
            y2={CHART_PADDING.top + chartHeight}
            stroke="var(--gray-8)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
          {hoveredPoint.value !== null && (
            <circle
              cx={xScale(hoveredPoint.frame)}
              cy={yScale(hoveredPoint.value)}
              r="5"
              fill={lineColor}
              stroke="white"
              strokeWidth="2"
            />
          )}
        </>
      )}

      {/* Y-axis labels */}
      {yAxisLabels.map((label, i) => (
        <text
          key={`y-label-${i}`}
          x={CHART_PADDING.left - 8}
          y={label.y}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize="11"
          fill="var(--gray-11)"
          fontFamily="system-ui, sans-serif"
        >
          {label.label}
        </text>
      ))}

      {/* X-axis labels */}
      {xAxisLabels.map((label, i) => (
        <text
          key={`x-label-${i}`}
          x={label.x}
          y={height - 10}
          textAnchor="middle"
          fontSize="11"
          fill="var(--gray-11)"
          fontFamily="system-ui, sans-serif"
        >
          {label.label}
        </text>
      ))}

      {/* Y-axis title */}
      <text
        x={14}
        y={height / 2}
        textAnchor="middle"
        fontSize="11"
        fill="var(--gray-11)"
        fontFamily="system-ui, sans-serif"
        transform={`rotate(-90, 14, ${height / 2})`}
      >
        {metricLabel}
      </text>

      {/* Hover tooltip - with data */}
      {hoveredPoint && hoveredPoint.value !== null && (
        <g>
          <rect
            x={Math.min(xScale(hoveredPoint.frame) - 60, width - 130)}
            y={Math.max(10, yScale(hoveredPoint.value) - 50)}
            width="120"
            height="40"
            fill="var(--gray-12)"
            rx="6"
            opacity="0.95"
          />
          <text
            x={Math.min(xScale(hoveredPoint.frame) - 60, width - 130) + 10}
            y={Math.max(10, yScale(hoveredPoint.value) - 50) + 16}
            fontSize="11"
            fill="var(--gray-1)"
            fontFamily="system-ui, sans-serif"
          >
            {formatTime(hoveredPoint.time)} • Frame {hoveredPoint.frame}
          </text>
          <text
            x={Math.min(xScale(hoveredPoint.frame) - 60, width - 130) + 10}
            y={Math.max(10, yScale(hoveredPoint.value) - 50) + 32}
            fontSize="12"
            fill={lineColor}
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            {hoveredPoint.value.toFixed(2)}
          </text>
        </g>
      )}

      {/* Hover tooltip - no data (wrist not detected) */}
      {hoveredPoint && hoveredPoint.value === null && (
        <g>
          <rect
            x={Math.min(xScale(hoveredPoint.frame) - 60, width - 130)}
            y={CHART_PADDING.top + chartHeight / 2 - 25}
            width="130"
            height="40"
            fill="rgba(239, 68, 68, 0.95)"
            rx="6"
          />
          <text
            x={Math.min(xScale(hoveredPoint.frame) - 60, width - 130) + 10}
            y={CHART_PADDING.top + chartHeight / 2 - 25 + 16}
            fontSize="11"
            fill="white"
            fontFamily="system-ui, sans-serif"
          >
            {formatTime(hoveredPoint.time)} • Frame {hoveredPoint.frame}
          </text>
          <text
            x={Math.min(xScale(hoveredPoint.frame) - 60, width - 130) + 10}
            y={CHART_PADDING.top + chartHeight / 2 - 25 + 32}
            fontSize="12"
            fill="white"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            ⚠ No wrist data
          </text>
        </g>
      )}
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SwingCurveView({
  swingResult,
  videoFPS,
  currentFrame,
  totalFrames,
  onSeekToFrame,
  isAnalyzing = false,
  developerMode = false,
  selectedMetric: controlledMetric,
  onMetricChange,
  selectedWrist: controlledWrist,
  onWristChange,
  selectedKnee: controlledKnee,
  onKneeChange,
  selectedAngleType: controlledAngleType,
  onAngleTypeChange,
  selectedVelocityBodyPart: controlledVelocityBodyPart,
  onVelocityBodyPartChange,
  selectedOrientationType: controlledOrientationType,
  onOrientationTypeChange,
  confidenceThreshold: controlledConfidenceThreshold,
  onConfidenceThresholdChange,
  useComplementaryAngles = true,
  className,
  style,
}: SwingCurveViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 600, height: 300 });
  
  // Support both controlled and uncontrolled modes
  const [internalMetric, setInternalMetric] = useState<MetricType>("velocity");
  const [internalWrist, setInternalWrist] = useState<WristType>("both");
  const [internalKnee, setInternalKnee] = useState<KneeType>("both");
  const [internalVelocityBodyPart, setInternalVelocityBodyPart] = useState<VelocityBodyPart>("wrist");
  const [internalOrientationType, setInternalOrientationType] = useState<OrientationType>("body");
  const [showPhases, setShowPhases] = useState(false); // Hidden for now
  
  // Confidence threshold for highlighting low-confidence frames (adjustable)
  const [internalConfidenceThreshold, setInternalConfidenceThreshold] = useState(0.3);
  
  // Angle type selection (knee vs shoulder vs elbow vs hip) for the Angles view
  const [internalAngleType, setInternalAngleType] = useState<AngleType>("knee");
  
  // Use controlled values if provided, otherwise use internal state
  const selectedMetric = controlledMetric ?? internalMetric;
  const selectedWrist = controlledWrist ?? internalWrist;
  const selectedKnee = controlledKnee ?? internalKnee;
  const angleType = controlledAngleType ?? internalAngleType;
  const velocityBodyPart = controlledVelocityBodyPart ?? internalVelocityBodyPart;
  const orientationType = controlledOrientationType ?? internalOrientationType;
  const confidenceThreshold = controlledConfidenceThreshold ?? internalConfidenceThreshold;
  
  const setSelectedMetric = (metric: MetricType) => {
    if (onMetricChange) {
      onMetricChange(metric);
    } else {
      setInternalMetric(metric);
    }
  };
  
  const setSelectedWrist = (wrist: WristType) => {
    if (onWristChange) {
      onWristChange(wrist);
    } else {
      setInternalWrist(wrist);
    }
  };
  
  const setVelocityBodyPart = (bodyPart: VelocityBodyPart) => {
    if (onVelocityBodyPartChange) {
      onVelocityBodyPartChange(bodyPart);
    } else {
      setInternalVelocityBodyPart(bodyPart);
    }
  };
  
  const setOrientationType = (type: OrientationType) => {
    if (onOrientationTypeChange) {
      onOrientationTypeChange(type);
    } else {
      setInternalOrientationType(type);
    }
  };
  
  const setSelectedKnee = (knee: KneeType) => {
    if (onKneeChange) {
      onKneeChange(knee);
    } else {
      setInternalKnee(knee);
    }
  };
  
  const setAngleType = (type: AngleType) => {
    if (onAngleTypeChange) {
      onAngleTypeChange(type);
    } else {
      setInternalAngleType(type);
    }
  };
  
  const setConfidenceThreshold = (threshold: number) => {
    if (onConfidenceThresholdChange) {
      onConfidenceThresholdChange(threshold);
    } else {
      setInternalConfidenceThreshold(threshold);
    }
  };

  // Reset to velocity if score is selected and developerMode is disabled
  useEffect(() => {
    if (!developerMode && selectedMetric === "score") {
      setSelectedMetric("velocity");
    }
  }, [developerMode, selectedMetric]);

  // Observe container size for responsive chart
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: Math.max(280, entry.contentRect.height - 120), // Leave room for controls
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Transform frame data for the chart (processed data - used by protocol)
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!swingResult?.frameData) return [];

    return swingResult.frameData.map((fd) => {
      let value: number | null = null;
      
      switch (selectedMetric) {
        case "velocity":
          // Use selected body part's smoothed velocity
          switch (velocityBodyPart) {
            case "wrist":
              switch (selectedWrist) {
                case "left":
                  value = fd.leftWristVelocityKmh;
                  break;
                case "right":
                  value = fd.rightWristVelocityKmh;
                  break;
                case "both":
                  value = fd.maxWristVelocityKmh;
                  break;
              }
              break;
            case "ankle":
              switch (selectedWrist) {
                case "left":
                  value = fd.leftAnkleVelocityKmh;
                  break;
                case "right":
                  value = fd.rightAnkleVelocityKmh;
                  break;
                case "both":
                  // Max of left and right
                  value = Math.max(fd.leftAnkleVelocityKmh ?? 0, fd.rightAnkleVelocityKmh ?? 0) || null;
                  break;
              }
              break;
            case "knee":
              switch (selectedWrist) {
                case "left":
                  value = fd.leftKneeVelocityKmh;
                  break;
                case "right":
                  value = fd.rightKneeVelocityKmh;
                  break;
                case "both":
                  value = Math.max(fd.leftKneeVelocityKmh ?? 0, fd.rightKneeVelocityKmh ?? 0) || null;
                  break;
              }
              break;
            case "hip":
              switch (selectedWrist) {
                case "left":
                  value = fd.leftHipVelocityKmh;
                  break;
                case "right":
                  value = fd.rightHipVelocityKmh;
                  break;
                case "both":
                  value = Math.max(fd.leftHipVelocityKmh ?? 0, fd.rightHipVelocityKmh ?? 0) || null;
                  break;
              }
              break;
            case "shoulder":
              switch (selectedWrist) {
                case "left":
                  value = fd.leftShoulderVelocityKmh;
                  break;
                case "right":
                  value = fd.rightShoulderVelocityKmh;
                  break;
                case "both":
                  value = Math.max(fd.leftShoulderVelocityKmh ?? 0, fd.rightShoulderVelocityKmh ?? 0) || null;
                  break;
              }
              break;
            case "elbow":
              switch (selectedWrist) {
                case "left":
                  value = fd.leftElbowVelocityKmh;
                  break;
                case "right":
                  value = fd.rightElbowVelocityKmh;
                  break;
                case "both":
                  value = Math.max(fd.leftElbowVelocityKmh ?? 0, fd.rightElbowVelocityKmh ?? 0) || null;
                  break;
              }
              break;
          }
          break;
        case "acceleration":
          // Use selected body part's acceleration
          switch (velocityBodyPart) {
            case "wrist":
              switch (selectedWrist) {
                case "left":
                  value = fd.leftWristAcceleration;
                  break;
                case "right":
                  value = fd.rightWristAcceleration;
                  break;
                case "both":
                  value = fd.maxWristAcceleration;
                  break;
              }
              break;
            case "ankle":
              switch (selectedWrist) {
                case "left":
                  value = fd.leftAnkleAcceleration;
                  break;
                case "right":
                  value = fd.rightAnkleAcceleration;
                  break;
                case "both":
                  value = fd.maxAnkleAcceleration;
                  break;
              }
              break;
            case "knee":
              switch (selectedWrist) {
                case "left":
                  value = fd.leftKneeAcceleration;
                  break;
                case "right":
                  value = fd.rightKneeAcceleration;
                  break;
                case "both":
                  value = fd.maxKneeAcceleration;
                  break;
              }
              break;
            case "hip":
              switch (selectedWrist) {
                case "left":
                  value = fd.leftHipAcceleration;
                  break;
                case "right":
                  value = fd.rightHipAcceleration;
                  break;
                case "both":
                  value = fd.maxHipAcceleration;
                  break;
              }
              break;
            case "shoulder":
              switch (selectedWrist) {
                case "left":
                  value = fd.leftShoulderAcceleration;
                  break;
                case "right":
                  value = fd.rightShoulderAcceleration;
                  break;
                case "both":
                  value = fd.maxShoulderAcceleration;
                  break;
              }
              break;
            case "elbow":
              switch (selectedWrist) {
                case "left":
                  value = fd.leftElbowAcceleration;
                  break;
                case "right":
                  value = fd.rightElbowAcceleration;
                  break;
                case "both":
                  value = fd.maxElbowAcceleration;
                  break;
              }
              break;
          }
          break;
        case "orientation":
          // Use selected orientation metric based on orientationType
          switch (orientationType) {
            case "body":
              value = fd.bodyOrientation;
              break;
            case "hipAngular":
              value = fd.hipAngularVelocity;
              break;
            case "shoulderAngular":
              value = fd.shoulderAngularVelocity;
              break;
            case "xFactor":
              value = fd.xFactor;
              break;
          }
          break;
        case "kneeBend":
          // Use the selected joint angle based on angleType
          switch (angleType) {
            case "shoulder":
              // Shoulder angles (hip-shoulder-elbow)
              switch (selectedKnee) {
                case "left":
                  value = fd.leftShoulderAngle;
                  break;
                case "right":
                  value = fd.rightShoulderAngle;
                  break;
                case "both":
                  value = fd.leftShoulderAngle;
                  break;
              }
              break;
            case "elbow":
              // Elbow angles (shoulder-elbow-wrist)
              switch (selectedKnee) {
                case "left":
                  value = fd.leftElbowAngle;
                  break;
                case "right":
                  value = fd.rightElbowAngle;
                  break;
                case "both":
                  value = fd.leftElbowAngle;
                  break;
              }
              break;
            case "hip":
              // Hip angles (shoulder-hip-knee)
              switch (selectedKnee) {
                case "left":
                  value = fd.leftHipAngle;
                  break;
                case "right":
                  value = fd.rightHipAngle;
                  break;
                case "both":
                  value = fd.leftHipAngle;
                  break;
              }
              break;
            case "knee":
            default:
              // Knee bend angles
              switch (selectedKnee) {
                case "left":
                  value = fd.leftKneeBend;
                  break;
                case "right":
                  value = fd.rightKneeBend;
                  break;
                case "both":
                  value = fd.maxKneeBend;
                  break;
              }
              break;
          }
          // The stored values are already "outer angles" (where 0° = straight, higher = more bent)
          // When useComplementaryAngles is true: show as-is (outer angle)
          // When useComplementaryAngles is false: transform to inner angle (180° = straight)
          if (value !== null && !useComplementaryAngles) {
            value = 180 - value;
          }
          break;
        case "score":
          value = fd.swingScore;
          break;
      }

      return {
        frame: fd.frame,
        time: fd.timestamp,
        value,
        phase: fd.phase,
      };
    });
  }, [swingResult, selectedMetric, selectedWrist, selectedKnee, angleType, velocityBodyPart, orientationType, useComplementaryAngles]);

  // Raw data (before any processing) - for comparison (velocity and knee bend)
  const rawChartData = useMemo((): ChartDataPoint[] => {
    if (!swingResult?.frameData) return [];
    if (selectedMetric !== "velocity" && selectedMetric !== "kneeBend") return [];

    return swingResult.frameData.map((fd) => {
      let value: number | null = null;
      
      if (selectedMetric === "velocity") {
        // Use selected body part's raw velocity
        switch (velocityBodyPart) {
          case "wrist":
            switch (selectedWrist) {
              case "left":
                value = fd.rawLeftWristVelocityKmh;
                break;
              case "right":
                value = fd.rawRightWristVelocityKmh;
                break;
              case "both":
                value = fd.rawMaxWristVelocityKmh;
                break;
            }
            break;
          case "ankle":
            switch (selectedWrist) {
              case "left":
                value = fd.rawLeftAnkleVelocityKmh;
                break;
              case "right":
                value = fd.rawRightAnkleVelocityKmh;
                break;
              case "both":
                value = Math.max(fd.rawLeftAnkleVelocityKmh ?? 0, fd.rawRightAnkleVelocityKmh ?? 0) || null;
                break;
            }
            break;
          case "knee":
            switch (selectedWrist) {
              case "left":
                value = fd.rawLeftKneeVelocityKmh;
                break;
              case "right":
                value = fd.rawRightKneeVelocityKmh;
                break;
              case "both":
                value = Math.max(fd.rawLeftKneeVelocityKmh ?? 0, fd.rawRightKneeVelocityKmh ?? 0) || null;
                break;
            }
            break;
          case "hip":
            switch (selectedWrist) {
              case "left":
                value = fd.rawLeftHipVelocityKmh;
                break;
              case "right":
                value = fd.rawRightHipVelocityKmh;
                break;
              case "both":
                value = Math.max(fd.rawLeftHipVelocityKmh ?? 0, fd.rawRightHipVelocityKmh ?? 0) || null;
                break;
            }
            break;
          case "shoulder":
            switch (selectedWrist) {
              case "left":
                value = fd.rawLeftShoulderVelocityKmh;
                break;
              case "right":
                value = fd.rawRightShoulderVelocityKmh;
                break;
              case "both":
                value = Math.max(fd.rawLeftShoulderVelocityKmh ?? 0, fd.rawRightShoulderVelocityKmh ?? 0) || null;
                break;
            }
            break;
          case "elbow":
            switch (selectedWrist) {
              case "left":
                value = fd.rawLeftElbowVelocityKmh;
                break;
              case "right":
                value = fd.rawRightElbowVelocityKmh;
                break;
              case "both":
                value = Math.max(fd.rawLeftElbowVelocityKmh ?? 0, fd.rawRightElbowVelocityKmh ?? 0) || null;
                break;
            }
            break;
        }
      } else if (selectedMetric === "kneeBend") {
        switch (angleType) {
          case "shoulder":
            // Raw shoulder angles
            switch (selectedKnee) {
              case "left":
                value = fd.rawLeftShoulderAngle;
                break;
              case "right":
                value = fd.rawRightShoulderAngle;
                break;
              case "both":
                value = fd.rawLeftShoulderAngle;
                break;
            }
            break;
          case "elbow":
            // Raw elbow angles
            switch (selectedKnee) {
              case "left":
                value = fd.rawLeftElbowAngle;
                break;
              case "right":
                value = fd.rawRightElbowAngle;
                break;
              case "both":
                value = fd.rawLeftElbowAngle;
                break;
            }
            break;
          case "hip":
            // Raw hip angles
            switch (selectedKnee) {
              case "left":
                value = fd.rawLeftHipAngle;
                break;
              case "right":
                value = fd.rawRightHipAngle;
                break;
              case "both":
                value = fd.rawLeftHipAngle;
                break;
            }
            break;
          case "knee":
          default:
            // Raw knee bend angles
            switch (selectedKnee) {
              case "left":
                value = fd.rawLeftKneeBend;
                break;
              case "right":
                value = fd.rawRightKneeBend;
                break;
              case "both":
                value = fd.rawMaxKneeBend;
                break;
            }
            break;
        }
        // The stored values are already "outer angles" (where 0° = straight, higher = more bent)
        // When useComplementaryAngles is true: show as-is (outer angle)
        // When useComplementaryAngles is false: transform to inner angle (180° = straight)
        if (value !== null && !useComplementaryAngles) {
          value = 180 - value;
        }
      }
      
      return {
        frame: fd.frame,
        time: fd.timestamp,
        value,
        phase: fd.phase,
      };
    });
  }, [swingResult, selectedMetric, selectedWrist, selectedKnee, angleType, velocityBodyPart, useComplementaryAngles]);

  // Helper to get confidence for a body part
  const getConfidenceForBodyPart = useCallback((fd: SwingFrameDataV3, bodyPart: VelocityBodyPart, side: "left" | "right"): number | null => {
    switch (bodyPart) {
      case "wrist":
        return side === "left" ? fd.leftWristConfidence : fd.rightWristConfidence;
      case "elbow":
        return side === "left" ? fd.leftElbowConfidence : fd.rightElbowConfidence;
      case "shoulder":
        return side === "left" ? fd.leftShoulderConfidence : fd.rightShoulderConfidence;
      case "hip":
        return side === "left" ? fd.leftHipConfidence : fd.rightHipConfidence;
      case "knee":
        return side === "left" ? fd.leftKneeConfidence : fd.rightKneeConfidence;
      case "ankle":
        return side === "left" ? fd.leftAnkleConfidence : fd.rightAnkleConfidence;
      default:
        return null;
    }
  }, []);

  // Helper to get confidence for an angle type (checks multiple joints involved)
  const getConfidenceForAngleType = useCallback((fd: SwingFrameDataV3, type: AngleType, side: "left" | "right"): number | null => {
    // Each angle involves multiple joints - return the minimum confidence
    switch (type) {
      case "shoulder": // shoulder-elbow angle
        const shoulderConf = side === "left" ? fd.leftShoulderConfidence : fd.rightShoulderConfidence;
        const elbowConfSh = side === "left" ? fd.leftElbowConfidence : fd.rightElbowConfidence;
        if (shoulderConf === null || elbowConfSh === null) return null;
        return Math.min(shoulderConf, elbowConfSh);
      case "elbow": // elbow-wrist angle
        const elbowConf = side === "left" ? fd.leftElbowConfidence : fd.rightElbowConfidence;
        const wristConf = side === "left" ? fd.leftWristConfidence : fd.rightWristConfidence;
        if (elbowConf === null || wristConf === null) return null;
        return Math.min(elbowConf, wristConf);
      case "hip": // hip-knee angle
        const hipConf = side === "left" ? fd.leftHipConfidence : fd.rightHipConfidence;
        const kneeConfHip = side === "left" ? fd.leftKneeConfidence : fd.rightKneeConfidence;
        if (hipConf === null || kneeConfHip === null) return null;
        return Math.min(hipConf, kneeConfHip);
      case "knee": // knee-ankle angle
        const kneeConf = side === "left" ? fd.leftKneeConfidence : fd.rightKneeConfidence;
        const ankleConf = side === "left" ? fd.leftAnkleConfidence : fd.rightAnkleConfidence;
        if (kneeConf === null || ankleConf === null) return null;
        return Math.min(kneeConf, ankleConf);
      default:
        return null;
    }
  }, []);

  // Calculate low confidence regions based on the selected metric and joint
  const lowConfidenceRegions = useMemo((): Array<{ startFrame: number; endFrame: number }> => {
    if (!swingResult?.frameData) return [];
    
    // Only show for velocity and angle views
    if (selectedMetric !== "velocity" && selectedMetric !== "kneeBend") return [];
    
    const regions: Array<{ startFrame: number; endFrame: number }> = [];
    let inLowConfRegion = false;
    let regionStart = 0;

    for (let i = 0; i < swingResult.frameData.length; i++) {
      const fd = swingResult.frameData[i];
      
      let isLowConfidence = false;
      
      if (selectedMetric === "velocity") {
        // For velocity view, check the selected body part confidence
        const leftConf = getConfidenceForBodyPart(fd, velocityBodyPart, "left");
        const rightConf = getConfidenceForBodyPart(fd, velocityBodyPart, "right");
        
        switch (selectedWrist) {
          case "left":
            isLowConfidence = leftConf === null || leftConf < confidenceThreshold;
            break;
          case "right":
            isLowConfidence = rightConf === null || rightConf < confidenceThreshold;
            break;
          case "both":
            // For "both", show low confidence if BOTH sides are low
            isLowConfidence = 
              (leftConf === null || leftConf < confidenceThreshold) &&
              (rightConf === null || rightConf < confidenceThreshold);
            break;
        }
      } else if (selectedMetric === "kneeBend") {
        // For angle view, check the joints involved in the selected angle
        const leftConf = getConfidenceForAngleType(fd, angleType, "left");
        const rightConf = getConfidenceForAngleType(fd, angleType, "right");
        
        switch (selectedKnee) {
          case "left":
            isLowConfidence = leftConf === null || leftConf < confidenceThreshold;
            break;
          case "right":
            isLowConfidence = rightConf === null || rightConf < confidenceThreshold;
            break;
          case "both":
            isLowConfidence = 
              (leftConf === null || leftConf < confidenceThreshold) &&
              (rightConf === null || rightConf < confidenceThreshold);
            break;
        }
      }
      
      if (isLowConfidence && !inLowConfRegion) {
        inLowConfRegion = true;
        regionStart = fd.frame;
      } else if (!isLowConfidence && inLowConfRegion) {
        inLowConfRegion = false;
        regions.push({ startFrame: regionStart, endFrame: swingResult.frameData[i - 1].frame });
      }
    }
    
    // Don't forget the last region if still in low confidence
    if (inLowConfRegion && swingResult.frameData.length > 0) {
      regions.push({ 
        startFrame: regionStart, 
        endFrame: swingResult.frameData[swingResult.frameData.length - 1].frame 
      });
    }

    return regions;
  }, [swingResult, selectedMetric, selectedWrist, selectedKnee, velocityBodyPart, angleType, confidenceThreshold, getConfidenceForBodyPart, getConfidenceForAngleType]);

  // No data state
  if (!swingResult || swingResult.frameData.length === 0) {
    return (
      <Box
        ref={containerRef}
        className={className}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--gray-1)",
          padding: "32px",
          ...style,
        }}
      >
        {isAnalyzing ? (
          <Flex direction="column" align="center" gap="3">
            <Box
              style={{
                width: "48px",
                height: "48px",
                border: "3px solid var(--gray-4)",
                borderTopColor: "var(--mint-9)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <Text size="3" color="gray">
              Analyzing swing data...
            </Text>
          </Flex>
        ) : (
          <Flex direction="column" align="center" gap="3">
            <ActivityLogIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
            <Text size="3" color="gray" weight="medium">
              Data Analysis
            </Text>
            <Text size="2" color="gray" style={{ textAlign: "center", maxWidth: 300 }}>
              Process a video with pose detection enabled to see data analysis.
            </Text>
          </Flex>
        )}
        
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      className={className}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--gray-1)",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Header with controls */}
      <Flex
        justify="between"
        align="center"
        px="4"
        py="3"
        style={{
          borderBottom: "1px solid var(--gray-4)",
          backgroundColor: "var(--gray-2)",
          flexShrink: 0,
        }}
      >
        <Flex align="center" gap="3">
          {/* Metric selector */}
          <SegmentedControl.Root
            defaultValue="velocity"
            value={selectedMetric}
            onValueChange={(value) => setSelectedMetric(value as MetricType)}
            size="1"
          >
            <SegmentedControl.Item value="velocity">
              <Flex align="center" gap="1">
                <Box
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: METRIC_COLORS.velocity,
                  }}
                />
                <Text size="1">Velocity</Text>
              </Flex>
            </SegmentedControl.Item>
            <SegmentedControl.Item value="acceleration">
              <Flex align="center" gap="1">
                <Box
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: METRIC_COLORS.acceleration,
                  }}
                />
                <Text size="1">Acceleration</Text>
              </Flex>
            </SegmentedControl.Item>
            <SegmentedControl.Item value="orientation">
              <Flex align="center" gap="1">
                <Box
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: METRIC_COLORS.orientation,
                  }}
                />
                <Text size="1">Orientation</Text>
              </Flex>
            </SegmentedControl.Item>
            <SegmentedControl.Item value="kneeBend">
              <Flex align="center" gap="1">
                <Box
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: METRIC_COLORS.kneeBend,
                  }}
                />
                <Text size="1">Angles</Text>
              </Flex>
            </SegmentedControl.Item>
            {developerMode && (
              <SegmentedControl.Item value="score">
                <Flex align="center" gap="1">
                  <Box
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: METRIC_COLORS.score,
                    }}
                  />
                  <Text size="1">Score</Text>
                </Flex>
              </SegmentedControl.Item>
            )}
          </SegmentedControl.Root>
          
          {/* Body part dropdown for velocity and acceleration views */}
          {(selectedMetric === "velocity" || selectedMetric === "acceleration") && (
            <Select.Root 
              size="1" 
              value={velocityBodyPart} 
              onValueChange={(value) => setVelocityBodyPart(value as VelocityBodyPart)}
            >
              <Select.Trigger 
                variant="soft" 
                style={{ 
                  marginLeft: "12px",
                  textTransform: "capitalize",
                }} 
              />
              <Select.Content>
                {(["wrist", "ankle", "knee", "hip", "shoulder", "elbow"] as VelocityBodyPart[]).map((part) => (
                  <Select.Item key={part} value={part} style={{ textTransform: "capitalize" }}>
                    {part}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
          
          {/* Side selector for velocity and acceleration views */}
          {(selectedMetric === "velocity" || selectedMetric === "acceleration") && (
            <Select.Root 
              size="1" 
              value={selectedWrist} 
              onValueChange={(value) => setSelectedWrist(value as WristType)}
            >
              <Select.Trigger variant="soft" style={{ marginLeft: "8px" }} />
              <Select.Content>
                <Select.Item value="left">Left</Select.Item>
                <Select.Item value="right">Right</Select.Item>
                <Select.Item value="both">Both (Max)</Select.Item>
              </Select.Content>
            </Select.Root>
          )}
          
          {/* Orientation type selector */}
          {selectedMetric === "orientation" && (
            <Select.Root 
              size="1" 
              value={orientationType} 
              onValueChange={(value) => setOrientationType(value as OrientationType)}
            >
              <Select.Trigger variant="soft" style={{ marginLeft: "12px" }} />
              <Select.Content>
                <Select.Item value="body">Body Orientation</Select.Item>
                <Select.Item value="hipAngular">Hip Angular Velocity</Select.Item>
                <Select.Item value="shoulderAngular">Shoulder Angular Velocity</Select.Item>
                <Select.Item value="xFactor">X-Factor (Separation)</Select.Item>
              </Select.Content>
            </Select.Root>
          )}
          
          {/* Legend for velocity view */}
          {selectedMetric === "velocity" && (
            <Flex align="center" gap="3" style={{ marginLeft: "12px" }}>
              <Flex align="center" gap="1">
                <Box
                  style={{
                    width: 16,
                    height: 3,
                    borderRadius: "2px",
                    backgroundColor: "#10B981",
                  }}
                />
                <Text size="1" color="gray">Smoothed</Text>
              </Flex>
              <Flex align="center" gap="1">
                <Box
                  style={{
                    width: 16,
                    height: 2,
                    borderRadius: "1px",
                    backgroundColor: METRIC_COLORS.velocity,
                    opacity: 0.5,
                  }}
                />
                <Text size="1" color="gray">Raw</Text>
              </Flex>
              <Tooltip content={`Highlight frames where ${velocityBodyPart} confidence < ${(confidenceThreshold * 100).toFixed(0)}%`}>
                <Flex align="center" gap="2" style={{ marginLeft: "8px" }}>
                  <Box
                    style={{
                      width: 16,
                      height: 10,
                      borderRadius: "2px",
                      backgroundColor: "rgba(239, 68, 68, 0.25)",
                      border: "1px dashed rgba(239, 68, 68, 0.6)",
                    }}
                  />
                  <Text size="1" color="gray">Confidence</Text>
                  <Flex align="center" gap="1" style={{ marginLeft: "4px" }}>
                    <Text size="1" style={{ color: "var(--gray-11)", fontWeight: 500, minWidth: "32px" }}>
                      {(confidenceThreshold * 100).toFixed(0)}%
                    </Text>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={confidenceThreshold * 100}
                      onChange={(e) => setConfidenceThreshold(Number(e.target.value) / 100)}
                      style={{
                        width: "60px",
                        height: "4px",
                        cursor: "pointer",
                        accentColor: "var(--gray-9)",
                      }}
                    />
                  </Flex>
                </Flex>
              </Tooltip>
            </Flex>
          )}
          
          {/* Angle type selector for angles view */}
          {selectedMetric === "kneeBend" && (
            <Select.Root 
              size="1" 
              value={angleType} 
              onValueChange={(value) => setAngleType(value as AngleType)}
            >
              <Select.Trigger variant="soft" style={{ marginLeft: "12px", textTransform: "capitalize" }} />
              <Select.Content>
                <Select.Item value="shoulder">Shoulder</Select.Item>
                <Select.Item value="elbow">Elbow</Select.Item>
                <Select.Item value="hip">Hip</Select.Item>
                <Select.Item value="knee">Knee</Select.Item>
              </Select.Content>
            </Select.Root>
          )}
          
          {/* Side selector for angles view */}
          {selectedMetric === "kneeBend" && (
            <Select.Root 
              size="1" 
              value={selectedKnee} 
              onValueChange={(value) => setSelectedKnee(value as KneeType)}
            >
              <Select.Trigger variant="soft" style={{ marginLeft: "8px" }} />
              <Select.Content>
                <Select.Item value="left">Left</Select.Item>
                <Select.Item value="right">Right</Select.Item>
                <Select.Item value="both">Both</Select.Item>
              </Select.Content>
            </Select.Root>
          )}
          
          {/* Legend for knee bend view */}
          {selectedMetric === "kneeBend" && (
            <Flex align="center" gap="3" style={{ marginLeft: "12px" }}>
              <Flex align="center" gap="1">
                <Box
                  style={{
                    width: 16,
                    height: 3,
                    borderRadius: "2px",
                    backgroundColor: "#10B981",
                  }}
                />
                <Text size="1" color="gray">Smoothed</Text>
              </Flex>
              <Flex align="center" gap="1">
                <Box
                  style={{
                    width: 16,
                    height: 2,
                    borderRadius: "1px",
                    backgroundColor: METRIC_COLORS.kneeBend,
                    opacity: 0.5,
                  }}
                />
                <Text size="1" color="gray">Raw</Text>
              </Flex>
              <Tooltip content={`Highlight frames where ${angleType} confidence < ${(confidenceThreshold * 100).toFixed(0)}%`}>
                <Flex align="center" gap="2" style={{ marginLeft: "8px" }}>
                  <Box
                    style={{
                      width: 16,
                      height: 10,
                      borderRadius: "2px",
                      backgroundColor: "rgba(239, 68, 68, 0.25)",
                      border: "1px dashed rgba(239, 68, 68, 0.6)",
                    }}
                  />
                  <Text size="1" color="gray">Confidence</Text>
                  <Flex align="center" gap="1" style={{ marginLeft: "4px" }}>
                    <Text size="1" style={{ color: "var(--gray-11)", fontWeight: 500, minWidth: "32px" }}>
                      {(confidenceThreshold * 100).toFixed(0)}%
                    </Text>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={confidenceThreshold * 100}
                      onChange={(e) => setConfidenceThreshold(Number(e.target.value) / 100)}
                      style={{
                        width: "60px",
                        height: "4px",
                        cursor: "pointer",
                        accentColor: "var(--gray-9)",
                      }}
                    />
                  </Flex>
                </Flex>
              </Tooltip>
            </Flex>
          )}
        </Flex>

        {/* Show phases toggle - hidden for now */}
        {false && (
          <Tooltip content={showPhases ? "Hide swing phases" : "Show swing phases"}>
            <Box
              onClick={() => setShowPhases(!showPhases)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                backgroundColor: showPhases ? "var(--mint-3)" : "var(--gray-3)",
                border: `1px solid ${showPhases ? "var(--mint-7)" : "var(--gray-6)"}`,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Flex align="center" gap="1">
                <MixerHorizontalIcon width={14} height={14} style={{ color: showPhases ? "var(--mint-11)" : "var(--gray-10)" }} />
                <Text size="1" style={{ color: showPhases ? "var(--mint-11)" : "var(--gray-10)" }}>
                  Phases
                </Text>
              </Flex>
            </Box>
          </Tooltip>
        )}
      </Flex>

      {/* Chart */}
      <Box style={{ flex: 1, padding: "16px", minHeight: 0 }}>
        <SwingChart
          data={chartData}
          rawData={rawChartData}
          width={containerSize.width - 32}
          height={containerSize.height}
          metricType={selectedMetric}
          currentFrame={currentFrame}
          onSeekToFrame={onSeekToFrame}
          showPhases={showPhases}
          lowConfidenceRegions={lowConfidenceRegions}
          velocityBodyPart={velocityBodyPart}
          orientationType={orientationType}
        />
      </Box>
    </Box>
  );
}

export default SwingCurveView;

