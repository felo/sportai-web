"use client";

/**
 * SwingChart Component
 * 
 * SVG-based chart for visualizing swing data with:
 * - Line charts for velocity, acceleration, orientation, angles
 * - Phase region highlighting
 * - Low confidence region indicators
 * - Interactive hover and click-to-seek
 * - Peak/valley markers
 */

import React, { useMemo, useCallback, useState, useRef } from "react";
import { Flex, Text } from "@radix-ui/themes";
import { PHASE_COLORS, METRIC_COLORS, CHART_PADDING } from "../constants";
import { formatTime } from "../utils";
import type { SwingChartProps, ChartDataPoint, PhaseRegion } from "../types";
import type { SwingPhase } from "../../hooks";

export function SwingChart({
  data,
  rawData,
  width,
  height,
  metricType,
  currentFrame,
  onSeekToFrame,
  showPhases = true,
  lowConfidenceRegions = [],
  velocityBodyPart = "wrist",
  orientationType = "body",
}: SwingChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);

  const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

  // Filter valid data points and calculate ranges
  const { validData, minValue, maxValue, xScale, yScale } = useMemo(() => {
    const valid = data.filter((d) => d.value !== null);
    if (valid.length === 0) {
      return { validData: [], minValue: 0, maxValue: 100, xScale: () => 0, yScale: () => 0 };
    }

    const processedValues = valid.map((d) => d.value as number);
    const rawValues = rawData
      ? rawData.filter((d) => d.value !== null).map((d) => d.value as number)
      : [];
    
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

  // Generate SVG paths
  const linePath = useMemo(() => {
    if (validData.length < 2) return "";
    return validData.reduce((path, point, i) => {
      const x = xScale(point.frame);
      const y = yScale(point.value as number);
      return path + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    }, "");
  }, [validData, xScale, yScale]);

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
  const phaseRegions = useMemo((): PhaseRegion[] => {
    if (!showPhases || data.length === 0) return [];
    
    const regions: PhaseRegion[] = [];
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
    
    if (currentPhase !== "neutral") {
      regions.push({ phase: currentPhase, startFrame, endFrame: data[data.length - 1].frame });
    }

    return regions;
  }, [data, showPhases]);

  // Calculate statistics
  const { average, peakPoint, valleyPoint } = useMemo(() => {
    if (validData.length === 0) {
      return { average: null, peakPoint: null, valleyPoint: null };
    }

    const values = validData.map((d) => d.value as number);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    let maxVal = -Infinity;
    let maxPoint: ChartDataPoint | null = null;
    let minVal = Infinity;
    let minPoint: ChartDataPoint | null = null;
    
    for (const point of validData) {
      const val = point.value as number;
      if (val > maxVal) { maxVal = val; maxPoint = point; }
      if (val < minVal) { minVal = val; minPoint = point; }
    }
    
    return { average: avg, peakPoint: maxPoint, valleyPoint: minPoint };
  }, [validData]);

  // Raw data statistics
  const { rawPeakPoint, rawValleyPoint } = useMemo(() => {
    if (!rawData || rawData.length === 0 || (metricType !== "velocity" && metricType !== "kneeBend")) {
      return { rawPeakPoint: null, rawValleyPoint: null };
    }

    const validRaw = rawData.filter((d) => d.value !== null);
    if (validRaw.length === 0) return { rawPeakPoint: null, rawValleyPoint: null };
    
    let maxVal = -Infinity;
    let maxPoint: ChartDataPoint | null = null;
    let minVal = Infinity;
    let minPoint: ChartDataPoint | null = null;
    
    for (const point of validRaw) {
      const val = point.value as number;
      if (val > maxVal) { maxVal = val; maxPoint = point; }
      if (val < minVal) { minVal = val; minPoint = point; }
    }
    
    return { rawPeakPoint: maxPoint, rawValleyPoint: minPoint };
  }, [rawData, metricType]);

  // Missing data regions
  const missingDataRegions = useMemo(() => {
    if (lowConfidenceRegions.length > 0) return lowConfidenceRegions;
    if (metricType !== "velocity" || !rawData || rawData.length === 0) return [];
    
    const regions: Array<{ startFrame: number; endFrame: number }> = [];
    let inMissingRegion = false;
    let regionStart = 0;

    for (let i = 0; i < rawData.length; i++) {
      const isMissing = rawData[i].value === null;
      
      if (isMissing && !inMissingRegion) {
        inMissingRegion = true;
        regionStart = rawData[i].frame;
      } else if (!isMissing && inMissingRegion) {
        inMissingRegion = false;
        regions.push({ startFrame: regionStart, endFrame: rawData[i - 1].frame });
      }
    }
    
    if (inMissingRegion) {
      regions.push({ startFrame: regionStart, endFrame: rawData[rawData.length - 1].frame });
    }

    return regions;
  }, [rawData, metricType, lowConfidenceRegions]);

  // Mouse interactions
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setMouseX(x);

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

  // Axis labels
  const yAxisLabels = useMemo(() => {
    const count = 5;
    return Array.from({ length: count + 1 }, (_, i) => {
      const value = minValue + (maxValue - minValue) * (i / count);
      return {
        value,
        y: yScale(value),
        label: value.toFixed(metricType === "orientation" ? 0 : 1),
      };
    });
  }, [minValue, maxValue, yScale, metricType]);

  const xAxisLabels = useMemo(() => {
    if (data.length === 0) return [];
    
    const count = 6;
    const minFrame = data[0].frame;
    const maxFrame = data[data.length - 1].frame;
    
    return Array.from({ length: count + 1 }, (_, i) => {
      const frame = Math.round(minFrame + (maxFrame - minFrame) * (i / count));
      const point = data.find((d) => d.frame === frame) || data[Math.round(data.length * (i / count))];
      return point ? { frame: point.frame, x: xScale(point.frame), label: formatTime(point.time) } : null;
    }).filter(Boolean) as Array<{ frame: number; x: number; label: string }>;
  }, [data, xScale]);

  // Playhead position
  const playheadX = useMemo(() => {
    if (data.length === 0) return null;
    const minFrame = data[0].frame;
    const maxFrame = data[data.length - 1].frame;
    if (currentFrame < minFrame || currentFrame > maxFrame) return null;
    return xScale(currentFrame);
  }, [data, currentFrame, xScale]);

  // Metric label
  const metricLabel = useMemo(() => {
    const bodyPartLabels: Record<string, string> = {
      wrist: "Wrist", ankle: "Ankle", knee: "Knee", hip: "Hip", shoulder: "Shoulder", elbow: "Elbow",
    };
    const orientationLabels: Record<string, string> = {
      body: "Body Orientation (°)", hipAngular: "Hip Angular Vel (°/s)", 
      shoulderAngular: "Shoulder Angular Vel (°/s)", xFactor: "X-Factor (°)",
    };
    
    const labels: Record<string, string> = {
      velocity: `${bodyPartLabels[velocityBodyPart]} Velocity (km/h)`,
      acceleration: `${bodyPartLabels[velocityBodyPart]} Acceleration (km/h/s)`,
      orientation: orientationLabels[orientationType],
      kneeBend: "Angles (°)",
      score: "Swing Score",
    };
    return labels[metricType];
  }, [metricType, velocityBodyPart, orientationType]);

  const lineColor = METRIC_COLORS[metricType];

  if (data.length === 0) {
    return (
      <Flex
        align="center"
        justify="center"
        style={{ width, height, backgroundColor: "var(--gray-2)", borderRadius: "8px" }}
      >
        <Text size="2" color="gray">No data available</Text>
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

      {/* Missing/low confidence data regions */}
      {missingDataRegions.map((region, i) => (
        <g key={`missing-${i}`}>
          <rect
            x={xScale(region.startFrame)}
            y={CHART_PADDING.top}
            width={Math.max(2, xScale(region.endFrame) - xScale(region.startFrame))}
            height={chartHeight}
            fill="rgba(239, 68, 68, 0.25)"
          />
          <line
            x1={xScale(region.startFrame)} y1={CHART_PADDING.top}
            x2={xScale(region.startFrame)} y2={CHART_PADDING.top + chartHeight}
            stroke="rgba(239, 68, 68, 0.6)" strokeWidth="1" strokeDasharray="3,3"
          />
          <line
            x1={xScale(region.endFrame)} y1={CHART_PADDING.top}
            x2={xScale(region.endFrame)} y2={CHART_PADDING.top + chartHeight}
            stroke="rgba(239, 68, 68, 0.6)" strokeWidth="1" strokeDasharray="3,3"
          />
        </g>
      ))}

      {/* Grid lines */}
      {yAxisLabels.map((label, i) => (
        <line
          key={`grid-y-${i}`}
          x1={CHART_PADDING.left} y1={label.y}
          x2={width - CHART_PADDING.right} y2={label.y}
          stroke="var(--gray-5)" strokeDasharray="4,4" strokeWidth="1"
        />
      ))}

      {/* Gradient definitions */}
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

      {/* Raw data line (faded) */}
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

      {/* Main data line */}
      <path
        d={linePath}
        fill="none"
        stroke={(metricType === "velocity" || metricType === "kneeBend") ? "#10B981" : lineColor}
        strokeWidth={(metricType === "velocity" || metricType === "kneeBend") ? 2.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Fill under curve */}
      {linePath && (
        <path
          d={linePath + ` L ${xScale(data[data.length - 1]?.frame ?? 0)} ${CHART_PADDING.top + chartHeight} L ${xScale(data[0]?.frame ?? 0)} ${CHART_PADDING.top + chartHeight} Z`}
          fill={(metricType === "velocity" || metricType === "kneeBend") ? "url(#gradient-smoothed)" : `url(#gradient-${metricType})`}
        />
      )}

      {/* Average line */}
      {average !== null && (
        <>
          <line
            x1={CHART_PADDING.left} y1={yScale(average)}
            x2={width - CHART_PADDING.right} y2={yScale(average)}
            stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" strokeDasharray="6,4"
          />
          <text x={CHART_PADDING.left + 8} y={yScale(average) - 6}
            fontSize="10" fill="rgba(255, 255, 255, 0.7)" fontFamily="system-ui, sans-serif">
            avg: {average.toFixed(1)}
          </text>
        </>
      )}

      {/* Raw data peak/valley markers */}
      {rawPeakPoint && rawPeakPoint.value !== null && (metricType === "velocity" || metricType === "kneeBend") && (
        <>
          <circle cx={xScale(rawPeakPoint.frame)} cy={yScale(rawPeakPoint.value)} r="5"
            fill={lineColor} stroke="white" strokeWidth="1.5" opacity="0.6" />
          <text x={xScale(rawPeakPoint.frame)} y={yScale(rawPeakPoint.value) - 10}
            fontSize="9" fill={lineColor} fontWeight="500" fontFamily="system-ui, sans-serif"
            textAnchor="middle" opacity="0.7">
            {rawPeakPoint.value.toFixed(1)}
          </text>
        </>
      )}

      {rawValleyPoint && rawValleyPoint.value !== null && rawValleyPoint !== rawPeakPoint && (metricType === "velocity" || metricType === "kneeBend") && (
        <>
          <circle cx={xScale(rawValleyPoint.frame)} cy={yScale(rawValleyPoint.value)} r="5"
            fill={lineColor} stroke="white" strokeWidth="1.5" opacity="0.6" />
          <text x={xScale(rawValleyPoint.frame)} y={yScale(rawValleyPoint.value) + 16}
            fontSize="9" fill={lineColor} fontWeight="500" fontFamily="system-ui, sans-serif"
            textAnchor="middle" opacity="0.7">
            {rawValleyPoint.value.toFixed(1)}
          </text>
        </>
      )}

      {/* Smoothed data peak marker */}
      {peakPoint && peakPoint.value !== null && (
        <>
          <circle cx={xScale(peakPoint.frame)} cy={yScale(peakPoint.value)} r="6"
            fill="#22C55E" stroke="white" strokeWidth="2" />
          <text x={xScale(peakPoint.frame)} y={yScale(peakPoint.value) - 12}
            fontSize="10" fill="#22C55E" fontWeight="600" fontFamily="system-ui, sans-serif" textAnchor="middle">
            ▲ {peakPoint.value.toFixed(1)}
          </text>
        </>
      )}

      {/* Smoothed data valley marker */}
      {valleyPoint && valleyPoint.value !== null && valleyPoint !== peakPoint && (
        <>
          <circle cx={xScale(valleyPoint.frame)} cy={yScale(valleyPoint.value)} r="6"
            fill="#EF4444" stroke="white" strokeWidth="2" />
          <text x={xScale(valleyPoint.frame)} y={yScale(valleyPoint.value) + 20}
            fontSize="10" fill="#EF4444" fontWeight="600" fontFamily="system-ui, sans-serif" textAnchor="middle">
            ▼ {valleyPoint.value.toFixed(1)}
          </text>
        </>
      )}

      {/* Playhead */}
      {playheadX !== null && (
        <>
          <line x1={playheadX} y1={CHART_PADDING.top} x2={playheadX} y2={CHART_PADDING.top + chartHeight}
            stroke="var(--mint-9)" strokeWidth="2" />
          <circle cx={playheadX} cy={CHART_PADDING.top} r="4" fill="var(--mint-9)" />
        </>
      )}

      {/* Hover indicator */}
      {mouseX !== null && hoveredPoint && (
        <>
          <line x1={mouseX} y1={CHART_PADDING.top} x2={mouseX} y2={CHART_PADDING.top + chartHeight}
            stroke="var(--gray-8)" strokeWidth="1" strokeDasharray="4,4" />
          {hoveredPoint.value !== null && (
            <circle cx={xScale(hoveredPoint.frame)} cy={yScale(hoveredPoint.value)} r="5"
              fill={lineColor} stroke="white" strokeWidth="2" />
          )}
        </>
      )}

      {/* Y-axis labels */}
      {yAxisLabels.map((label, i) => (
        <text key={`y-label-${i}`} x={CHART_PADDING.left - 8} y={label.y}
          textAnchor="end" dominantBaseline="middle" fontSize="11" fill="var(--gray-11)" fontFamily="system-ui, sans-serif">
          {label.label}
        </text>
      ))}

      {/* X-axis labels */}
      {xAxisLabels.map((label, i) => (
        <text key={`x-label-${i}`} x={label.x} y={height - 10}
          textAnchor="middle" fontSize="11" fill="var(--gray-11)" fontFamily="system-ui, sans-serif">
          {label.label}
        </text>
      ))}

      {/* Y-axis title */}
      <text x={14} y={height / 2} textAnchor="middle" fontSize="11" fill="var(--gray-11)"
        fontFamily="system-ui, sans-serif" transform={`rotate(-90, 14, ${height / 2})`}>
        {metricLabel}
      </text>

      {/* Hover tooltip */}
      {hoveredPoint && hoveredPoint.value !== null && (
        <g>
          <rect
            x={Math.min(xScale(hoveredPoint.frame) - 60, width - 130)}
            y={Math.max(10, yScale(hoveredPoint.value) - 50)}
            width="120" height="40" fill="var(--gray-12)" rx="6" opacity="0.95"
          />
          <text
            x={Math.min(xScale(hoveredPoint.frame) - 60, width - 130) + 10}
            y={Math.max(10, yScale(hoveredPoint.value) - 50) + 16}
            fontSize="11" fill="var(--gray-1)" fontFamily="system-ui, sans-serif">
            {formatTime(hoveredPoint.time)} • Frame {hoveredPoint.frame}
          </text>
          <text
            x={Math.min(xScale(hoveredPoint.frame) - 60, width - 130) + 10}
            y={Math.max(10, yScale(hoveredPoint.value) - 50) + 32}
            fontSize="12" fill={lineColor} fontWeight="600" fontFamily="system-ui, sans-serif">
            {hoveredPoint.value.toFixed(2)}
          </text>
        </g>
      )}

      {/* No data tooltip */}
      {hoveredPoint && hoveredPoint.value === null && (
        <g>
          <rect
            x={Math.min(xScale(hoveredPoint.frame) - 60, width - 130)}
            y={CHART_PADDING.top + chartHeight / 2 - 25}
            width="130" height="40" fill="rgba(239, 68, 68, 0.95)" rx="6"
          />
          <text
            x={Math.min(xScale(hoveredPoint.frame) - 60, width - 130) + 10}
            y={CHART_PADDING.top + chartHeight / 2 - 25 + 16}
            fontSize="11" fill="white" fontFamily="system-ui, sans-serif">
            {formatTime(hoveredPoint.time)} • Frame {hoveredPoint.frame}
          </text>
          <text
            x={Math.min(xScale(hoveredPoint.frame) - 60, width - 130) + 10}
            y={CHART_PADDING.top + chartHeight / 2 - 25 + 32}
            fontSize="12" fill="white" fontWeight="600" fontFamily="system-ui, sans-serif">
            ⚠ No wrist data
          </text>
        </g>
      )}
    </svg>
  );
}
