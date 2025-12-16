"use client";

import { useMemo } from "react";
import { Box, Text, Flex } from "@radix-ui/themes";
import { ResponsiveRadar } from "@nivo/radar";
import type { TechniqueMetrics } from "./techniqueUtils";
import { getTechniqueRatingTier, TECHNIQUE_COLORS } from "./techniqueUtils";

interface SwingRadarChartProps {
  metrics: TechniqueMetrics;
  height?: number;
  color?: string;
  showLegend?: boolean;
}

// Chart theme matching the app
const CHART_THEME = {
  background: "transparent",
  text: {
    fontSize: 11,
    fill: "var(--gray-11)",
    fontFamily: "inherit",
  },
  tooltip: {
    container: {
      background: "var(--gray-2)",
      fontSize: 12,
      borderRadius: 8,
      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      border: "1px solid var(--gray-6)",
    },
  },
  grid: {
    line: {
      stroke: "var(--gray-6)",
      strokeWidth: 1,
    },
  },
  dots: {
    text: {
      fill: "var(--gray-11)",
    },
  },
};

// Attribute configuration with icons and descriptions
const METRIC_CONFIG: Record<string, { label: string; icon: string; description: string }> = {
  timing: { 
    label: "⏱️ Timing", 
    icon: "⏱️",
    description: "Rhythm and tempo throughout the swing phases"
  },
  power: { 
    label: "💪 Power", 
    icon: "💪",
    description: "Speed and force generation at contact"
  },
  form: { 
    label: "🎯 Form", 
    icon: "🎯",
    description: "Body positioning and technical execution"
  },
  recovery: { 
    label: "🔄 Recovery", 
    icon: "🔄",
    description: "Balance and readiness after the shot"
  },
  preparation: { 
    label: "🚀 Prep", 
    icon: "🚀",
    description: "Loading phase and racket preparation"
  },
};

/**
 * Radar chart for visualizing technique metrics
 */
export function SwingRadarChart({ 
  metrics, 
  height = 220,
  color,
  showLegend = false,
}: SwingRadarChartProps) {
  const tier = getTechniqueRatingTier(metrics.overall);
  const chartColor = color || tier.gradient[0];
  
  // Convert metrics to radar chart data
  const radarData = useMemo(() => {
    return [
      { attribute: METRIC_CONFIG.timing.label, value: metrics.timing },
      { attribute: METRIC_CONFIG.power.label, value: metrics.power },
      { attribute: METRIC_CONFIG.form.label, value: metrics.form },
      { attribute: METRIC_CONFIG.recovery.label, value: metrics.recovery },
      { attribute: METRIC_CONFIG.preparation.label, value: metrics.preparation },
    ];
  }, [metrics]);

  return (
    <Box style={{ height, position: "relative" }}>
      <ResponsiveRadar
        data={radarData}
        keys={["value"]}
        indexBy="attribute"
        maxValue={100}
        margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
        curve="linearClosed"
        borderWidth={2}
        borderColor={chartColor}
        gridLevels={4}
        gridShape="circular"
        gridLabelOffset={16}
        enableDots={true}
        dotSize={8}
        dotColor={chartColor}
        dotBorderWidth={2}
        dotBorderColor="white"
        colors={[chartColor]}
        fillOpacity={0.25}
        blendMode="normal"
        motionConfig="gentle"
        theme={CHART_THEME}
        isInteractive={true}
        sliceTooltip={({ index, data }) => {
          const indexStr = String(index);
          const metricKey = Object.keys(METRIC_CONFIG).find((key) =>
            indexStr.includes(METRIC_CONFIG[key].label)
          );
          const config = metricKey ? METRIC_CONFIG[metricKey] : null;
          
          return (
            <Box
              style={{
                background: "var(--gray-2)",
                padding: "12px 16px",
                borderRadius: 12,
                border: `2px solid ${chartColor}`,
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                width: 240,
              }}
            >
              <Flex align="center" gap="2">
                <Text style={{ fontSize: 16 }}>{config?.icon}</Text>
                <Text size="2" weight="bold" style={{ color: chartColor }}>
                  {config?.label.replace(/^[^\s]+\s/, "") || index}
                </Text>
              </Flex>
              {config && (
                <Text
                  size="1"
                  color="gray"
                  style={{ display: "block", marginTop: 4, lineHeight: 1.4 }}
                >
                  {config.description}
                </Text>
              )}
              <Flex align="center" justify="between" style={{ marginTop: 8 }}>
                <Text size="2" weight="medium">Score</Text>
                <Text size="3" weight="bold" style={{ color: chartColor }}>
                  {data[0].value}
                </Text>
              </Flex>
            </Box>
          );
        }}
      />
      
      {showLegend && (
        <Flex 
          gap="3" 
          wrap="wrap" 
          justify="center"
          style={{ marginTop: 8 }}
        >
          {Object.entries(METRIC_CONFIG).map(([key, config]) => (
            <Flex key={key} align="center" gap="1">
              <Text size="1">{config.icon}</Text>
              <Text size="1" color="gray">
                {config.label.replace(/^[^\s]+\s/, "")}
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Box>
  );
}






