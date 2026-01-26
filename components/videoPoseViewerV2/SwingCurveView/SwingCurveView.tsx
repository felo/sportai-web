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

import React, { useRef, useState, useEffect } from "react";
import { Box } from "@radix-ui/themes";

// Types
import type { 
  SwingCurveViewProps, 
  MetricType, 
  WristType, 
  KneeType, 
  AngleType, 
  VelocityBodyPart, 
  OrientationType 
} from "./types";

// Hooks
import { useContainerSize, useChartData, useLowConfidenceRegions } from "./hooks";

// Components
import { SwingChart, ChartControls, EmptyState } from "./components";

// Styles for hiding scrollbar
const hideScrollbarStyles = `
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
`;

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
  
  // Container size for responsive chart
  const containerSize = useContainerSize(containerRef);
  
  // ============================================================================
  // Controlled/Uncontrolled State Pattern
  // ============================================================================
  
  const [internalMetric, setInternalMetric] = useState<MetricType>("velocity");
  const [internalWrist, setInternalWrist] = useState<WristType>("both");
  const [internalKnee, setInternalKnee] = useState<KneeType>("both");
  const [internalVelocityBodyPart, setInternalVelocityBodyPart] = useState<VelocityBodyPart>("wrist");
  const [internalOrientationType, setInternalOrientationType] = useState<OrientationType>("body");
  const [internalAngleType, setInternalAngleType] = useState<AngleType>("knee");
  const [internalConfidenceThreshold, setInternalConfidenceThreshold] = useState(0.3);
  const [showPhases, setShowPhases] = useState(false);
  
  // Use controlled values if provided, otherwise use internal state
  const selectedMetric = controlledMetric ?? internalMetric;
  const selectedWrist = controlledWrist ?? internalWrist;
  const selectedKnee = controlledKnee ?? internalKnee;
  const angleType = controlledAngleType ?? internalAngleType;
  const velocityBodyPart = controlledVelocityBodyPart ?? internalVelocityBodyPart;
  const orientationType = controlledOrientationType ?? internalOrientationType;
  const confidenceThreshold = controlledConfidenceThreshold ?? internalConfidenceThreshold;
  
  // Setters that respect controlled/uncontrolled mode
  const setSelectedMetric = (metric: MetricType) => {
    onMetricChange ? onMetricChange(metric) : setInternalMetric(metric);
  };
  
  const setSelectedWrist = (wrist: WristType) => {
    onWristChange ? onWristChange(wrist) : setInternalWrist(wrist);
  };
  
  const setSelectedKnee = (knee: KneeType) => {
    onKneeChange ? onKneeChange(knee) : setInternalKnee(knee);
  };
  
  const setVelocityBodyPart = (bodyPart: VelocityBodyPart) => {
    onVelocityBodyPartChange ? onVelocityBodyPartChange(bodyPart) : setInternalVelocityBodyPart(bodyPart);
  };
  
  const setOrientationType = (type: OrientationType) => {
    onOrientationTypeChange ? onOrientationTypeChange(type) : setInternalOrientationType(type);
  };
  
  const setAngleType = (type: AngleType) => {
    onAngleTypeChange ? onAngleTypeChange(type) : setInternalAngleType(type);
  };
  
  const setConfidenceThreshold = (threshold: number) => {
    onConfidenceThresholdChange ? onConfidenceThresholdChange(threshold) : setInternalConfidenceThreshold(threshold);
  };

  // Reset to velocity if score is selected and developerMode is disabled
  useEffect(() => {
    if (!developerMode && selectedMetric === "score") {
      setSelectedMetric("velocity");
    }
  }, [developerMode, selectedMetric]);

  // ============================================================================
  // Data Transformation Hooks
  // ============================================================================
  
  const { chartData, rawChartData } = useChartData({
    swingResult,
    selectedMetric,
    selectedWrist,
    selectedKnee,
    angleType,
    velocityBodyPart,
    orientationType,
    useComplementaryAngles,
  });

  const lowConfidenceRegions = useLowConfidenceRegions({
    swingResult,
    selectedMetric,
    selectedWrist,
    selectedKnee,
    velocityBodyPart,
    angleType,
    confidenceThreshold,
  });

  // ============================================================================
  // Render
  // ============================================================================

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
          ...style,
        }}
      >
        <EmptyState isAnalyzing={isAnalyzing} />
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
      <ChartControls
        selectedMetric={selectedMetric}
        onMetricChange={setSelectedMetric}
        selectedWrist={selectedWrist}
        onWristChange={setSelectedWrist}
        selectedKnee={selectedKnee}
        onKneeChange={setSelectedKnee}
        velocityBodyPart={velocityBodyPart}
        onVelocityBodyPartChange={setVelocityBodyPart}
        orientationType={orientationType}
        onOrientationTypeChange={setOrientationType}
        angleType={angleType}
        onAngleTypeChange={setAngleType}
        confidenceThreshold={confidenceThreshold}
        onConfidenceThresholdChange={setConfidenceThreshold}
        developerMode={developerMode}
      />

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
      
      <style jsx>{hideScrollbarStyles}</style>
    </Box>
  );
}

export default SwingCurveView;
