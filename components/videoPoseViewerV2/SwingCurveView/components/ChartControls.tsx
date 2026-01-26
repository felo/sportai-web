"use client";

/**
 * ChartControls Component
 * 
 * Header controls for selecting metrics, body parts, and sides.
 * Also displays legends for velocity and angle views.
 */

import React from "react";
import { Box, Flex, Text, SegmentedControl, Tooltip, Select } from "@radix-ui/themes";
import { METRIC_COLORS, VELOCITY_BODY_PARTS } from "../constants";
import type { 
  MetricType, 
  WristType, 
  KneeType, 
  AngleType, 
  VelocityBodyPart, 
  OrientationType 
} from "../types";

interface ChartControlsProps {
  selectedMetric: MetricType;
  onMetricChange: (metric: MetricType) => void;
  selectedWrist: WristType;
  onWristChange: (wrist: WristType) => void;
  selectedKnee: KneeType;
  onKneeChange: (knee: KneeType) => void;
  velocityBodyPart: VelocityBodyPart;
  onVelocityBodyPartChange: (bodyPart: VelocityBodyPart) => void;
  orientationType: OrientationType;
  onOrientationTypeChange: (type: OrientationType) => void;
  angleType: AngleType;
  onAngleTypeChange: (type: AngleType) => void;
  confidenceThreshold: number;
  onConfidenceThresholdChange: (threshold: number) => void;
  developerMode: boolean;
}

export function ChartControls({
  selectedMetric,
  onMetricChange,
  selectedWrist,
  onWristChange,
  selectedKnee,
  onKneeChange,
  velocityBodyPart,
  onVelocityBodyPartChange,
  orientationType,
  onOrientationTypeChange,
  angleType,
  onAngleTypeChange,
  confidenceThreshold,
  onConfidenceThresholdChange,
  developerMode,
}: ChartControlsProps) {
  return (
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
      {/* Scrollable controls with fade mask */}
      <Box
        style={{
          position: "relative",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <Flex 
          align="center" 
          gap="3"
          style={{
            overflowX: "auto",
            overflowY: "hidden",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            paddingBottom: "2px",
            marginBottom: "-2px",
            paddingRight: "24px",
          }}
          className="hide-scrollbar"
        >
          {/* Metric selector */}
          <MetricSelector 
            selectedMetric={selectedMetric} 
            onMetricChange={onMetricChange} 
            developerMode={developerMode}
          />
          
          {/* Body part dropdown for velocity and acceleration views */}
          {(selectedMetric === "velocity" || selectedMetric === "acceleration") && (
            <BodyPartSelector 
              value={velocityBodyPart} 
              onChange={onVelocityBodyPartChange} 
            />
          )}
          
          {/* Side selector for velocity and acceleration views */}
          {(selectedMetric === "velocity" || selectedMetric === "acceleration") && (
            <SideSelector value={selectedWrist} onChange={onWristChange} />
          )}
          
          {/* Orientation type selector */}
          {selectedMetric === "orientation" && (
            <OrientationSelector 
              value={orientationType} 
              onChange={onOrientationTypeChange} 
            />
          )}
          
          {/* Legend for velocity view */}
          {selectedMetric === "velocity" && (
            <VelocityLegend 
              velocityBodyPart={velocityBodyPart}
              confidenceThreshold={confidenceThreshold}
              onConfidenceThresholdChange={onConfidenceThresholdChange}
            />
          )}
          
          {/* Angle type selector for angles view */}
          {selectedMetric === "kneeBend" && (
            <AngleTypeSelector value={angleType} onChange={onAngleTypeChange} />
          )}
          
          {/* Side selector for angles view */}
          {selectedMetric === "kneeBend" && (
            <KneeSideSelector value={selectedKnee} onChange={onKneeChange} />
          )}
          
          {/* Legend for knee bend view */}
          {selectedMetric === "kneeBend" && (
            <AngleLegend 
              angleType={angleType}
              confidenceThreshold={confidenceThreshold}
              onConfidenceThresholdChange={onConfidenceThresholdChange}
            />
          )}
        </Flex>
        
        {/* Fade mask on right edge */}
        <Box
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "32px",
            background: "linear-gradient(to right, transparent, var(--gray-2))",
            pointerEvents: "none",
          }}
        />
      </Box>
    </Flex>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function MetricSelector({ 
  selectedMetric, 
  onMetricChange, 
  developerMode 
}: { 
  selectedMetric: MetricType; 
  onMetricChange: (metric: MetricType) => void;
  developerMode: boolean;
}) {
  return (
    <SegmentedControl.Root
      defaultValue="velocity"
      value={selectedMetric}
      onValueChange={(value) => onMetricChange(value as MetricType)}
      size="1"
      style={{ flexShrink: 0 }}
    >
      <SegmentedControl.Item value="velocity">
        <Flex align="center" gap="1">
          <MetricDot color={METRIC_COLORS.velocity} />
          <Text size="1">Velocity</Text>
        </Flex>
      </SegmentedControl.Item>
      <SegmentedControl.Item value="acceleration">
        <Flex align="center" gap="1">
          <MetricDot color={METRIC_COLORS.acceleration} />
          <Text size="1">Acceleration</Text>
        </Flex>
      </SegmentedControl.Item>
      <SegmentedControl.Item value="orientation">
        <Flex align="center" gap="1">
          <MetricDot color={METRIC_COLORS.orientation} />
          <Text size="1">Orientation</Text>
        </Flex>
      </SegmentedControl.Item>
      <SegmentedControl.Item value="kneeBend">
        <Flex align="center" gap="1">
          <MetricDot color={METRIC_COLORS.kneeBend} />
          <Text size="1">Angles</Text>
        </Flex>
      </SegmentedControl.Item>
      {developerMode && (
        <SegmentedControl.Item value="score">
          <Flex align="center" gap="1">
            <MetricDot color={METRIC_COLORS.score} />
            <Text size="1">Score</Text>
          </Flex>
        </SegmentedControl.Item>
      )}
    </SegmentedControl.Root>
  );
}

function MetricDot({ color }: { color: string }) {
  return (
    <Box
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: color,
      }}
    />
  );
}

function BodyPartSelector({ 
  value, 
  onChange 
}: { 
  value: VelocityBodyPart; 
  onChange: (v: VelocityBodyPart) => void;
}) {
  return (
    <Select.Root 
      size="1" 
      value={value} 
      onValueChange={(v) => onChange(v as VelocityBodyPart)}
    >
      <Select.Trigger 
        variant="soft" 
        style={{ 
          marginLeft: "12px",
          textTransform: "capitalize",
          flexShrink: 0,
        }} 
      />
      <Select.Content>
        {VELOCITY_BODY_PARTS.map((part) => (
          <Select.Item key={part} value={part} style={{ textTransform: "capitalize" }}>
            {part}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

function SideSelector({ 
  value, 
  onChange 
}: { 
  value: WristType; 
  onChange: (v: WristType) => void;
}) {
  return (
    <Select.Root 
      size="1" 
      value={value} 
      onValueChange={(v) => onChange(v as WristType)}
    >
      <Select.Trigger variant="soft" style={{ marginLeft: "8px", flexShrink: 0 }} />
      <Select.Content>
        <Select.Item value="left">Left</Select.Item>
        <Select.Item value="right">Right</Select.Item>
        <Select.Item value="both">Both (Max)</Select.Item>
      </Select.Content>
    </Select.Root>
  );
}

function OrientationSelector({ 
  value, 
  onChange 
}: { 
  value: OrientationType; 
  onChange: (v: OrientationType) => void;
}) {
  return (
    <Select.Root 
      size="1" 
      value={value} 
      onValueChange={(v) => onChange(v as OrientationType)}
    >
      <Select.Trigger variant="soft" style={{ marginLeft: "12px", flexShrink: 0 }} />
      <Select.Content>
        <Select.Item value="body">Body Orientation</Select.Item>
        <Select.Item value="hipAngular">Hip Angular Velocity</Select.Item>
        <Select.Item value="shoulderAngular">Shoulder Angular Velocity</Select.Item>
        <Select.Item value="xFactor">X-Factor (Separation)</Select.Item>
      </Select.Content>
    </Select.Root>
  );
}

function AngleTypeSelector({ 
  value, 
  onChange 
}: { 
  value: AngleType; 
  onChange: (v: AngleType) => void;
}) {
  return (
    <Select.Root 
      size="1" 
      value={value} 
      onValueChange={(v) => onChange(v as AngleType)}
    >
      <Select.Trigger 
        variant="soft" 
        style={{ marginLeft: "12px", textTransform: "capitalize", flexShrink: 0 }} 
      />
      <Select.Content>
        <Select.Item value="shoulder">Shoulder</Select.Item>
        <Select.Item value="elbow">Elbow</Select.Item>
        <Select.Item value="hip">Hip</Select.Item>
        <Select.Item value="knee">Knee</Select.Item>
      </Select.Content>
    </Select.Root>
  );
}

function KneeSideSelector({ 
  value, 
  onChange 
}: { 
  value: KneeType; 
  onChange: (v: KneeType) => void;
}) {
  return (
    <Select.Root 
      size="1" 
      value={value} 
      onValueChange={(v) => onChange(v as KneeType)}
    >
      <Select.Trigger variant="soft" style={{ marginLeft: "8px", flexShrink: 0 }} />
      <Select.Content>
        <Select.Item value="left">Left</Select.Item>
        <Select.Item value="right">Right</Select.Item>
        <Select.Item value="both">Both</Select.Item>
      </Select.Content>
    </Select.Root>
  );
}

function VelocityLegend({ 
  velocityBodyPart,
  confidenceThreshold,
  onConfidenceThresholdChange,
}: { 
  velocityBodyPart: VelocityBodyPart;
  confidenceThreshold: number;
  onConfidenceThresholdChange: (threshold: number) => void;
}) {
  return (
    <Flex align="center" gap="3" style={{ marginLeft: "12px", flexShrink: 0 }}>
      <LegendItem color="#10B981" label="Smoothed" height={3} />
      <LegendItem color={METRIC_COLORS.velocity} label="Raw" height={2} opacity={0.5} />
      <ConfidenceControl
        bodyPart={velocityBodyPart}
        confidenceThreshold={confidenceThreshold}
        onConfidenceThresholdChange={onConfidenceThresholdChange}
      />
    </Flex>
  );
}

function AngleLegend({ 
  angleType,
  confidenceThreshold,
  onConfidenceThresholdChange,
}: { 
  angleType: AngleType;
  confidenceThreshold: number;
  onConfidenceThresholdChange: (threshold: number) => void;
}) {
  return (
    <Flex align="center" gap="3" style={{ marginLeft: "12px", flexShrink: 0 }}>
      <LegendItem color="#10B981" label="Smoothed" height={3} />
      <LegendItem color={METRIC_COLORS.kneeBend} label="Raw" height={2} opacity={0.5} />
      <ConfidenceControl
        bodyPart={angleType}
        confidenceThreshold={confidenceThreshold}
        onConfidenceThresholdChange={onConfidenceThresholdChange}
      />
    </Flex>
  );
}

function LegendItem({ 
  color, 
  label, 
  height, 
  opacity = 1 
}: { 
  color: string; 
  label: string; 
  height: number;
  opacity?: number;
}) {
  return (
    <Flex align="center" gap="1">
      <Box
        style={{
          width: 16,
          height,
          borderRadius: `${height / 2}px`,
          backgroundColor: color,
          opacity,
        }}
      />
      <Text size="1" color="gray">{label}</Text>
    </Flex>
  );
}

function ConfidenceControl({ 
  bodyPart,
  confidenceThreshold,
  onConfidenceThresholdChange,
}: { 
  bodyPart: string;
  confidenceThreshold: number;
  onConfidenceThresholdChange: (threshold: number) => void;
}) {
  return (
    <Tooltip content={`Highlight frames where ${bodyPart} confidence < ${(confidenceThreshold * 100).toFixed(0)}%`}>
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
            onChange={(e) => onConfidenceThresholdChange(Number(e.target.value) / 100)}
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
  );
}
