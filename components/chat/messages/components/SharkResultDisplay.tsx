"use client";

import { useState, useEffect, useMemo } from "react";
import { Box, Card, Flex, Text, Separator, Grid } from "@radix-ui/themes";
import { ResponsiveRadar } from "@nivo/radar";
import { ProgressRing, RING_GRADIENTS } from "@/components/tasks/viewer/components/shared";
import { TargetIcon } from "@radix-ui/react-icons";
import { MINT_COLOR } from "../../input/VideoEligibilityIndicator";
import { useIsMobile } from "@/hooks/useIsMobile";

interface SharkResultDisplayProps {
  score: number;
  categoryCount: number;
  featureCount: number;
  categories?: Record<string, { average_score: number; feature_count: number }>;
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
};

/**
 * Format category name for display
 * e.g., "ball_contact" -> "Ball Contact"
 */
function formatCategoryName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Display component for Shark technique analysis results
 * Shows the overall score in a circular progress ring (left card)
 * and category breakdown in radar chart (right card, 2x width on desktop)
 * Responsive: stacks vertically on mobile
 */
export function SharkResultDisplay({
  score,
  categoryCount,
  featureCount,
  categories,
}: SharkResultDisplayProps) {
  const isMobile = useIsMobile();

  // Trigger animation after component mounts
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to ensure smooth animation start
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Convert categories to radar chart data format
  const radarData = useMemo(() => {
    if (!categories) return [];
    return Object.entries(categories)
      .filter(([, cat]) => cat.average_score > 0) // Only show categories with scores
      .map(([name, cat]) => ({
        attribute: formatCategoryName(name),
        value: Math.round(cat.average_score),
      }));
  }, [categories]);

  const hasRadarData = radarData.length > 0;

  // Card styles shared between both cards
  const cardStyle = {
    border: `1px solid ${MINT_COLOR}`,
    backgroundColor: "var(--color-panel-solid)",
    overflow: "hidden" as const,
  };

  return (
    <Box
      style={{
        width: isMobile ? "calc(100vw - var(--space-4))" : "100%",
        marginLeft: isMobile ? "calc(-1 * var(--space-4))" : 0,
        paddingLeft: isMobile ? "var(--space-4)" : 0,
        paddingRight: isMobile ? "var(--space-4)" : 0,
      }}
    >
      <Grid
        columns={isMobile ? "1" : hasRadarData ? "1fr 2fr" : "1"}
        gap="4"
        style={{ width: "100%" }}
      >
        {/* Left Card: Technique Analysis Score */}
        <Card style={{ ...cardStyle, width: "100%" }}>
          <Flex direction="column" gap="4" p={isMobile ? "3" : "4"} style={{ height: "100%" }}>
            {/* Header */}
            <Flex justify="center">
              <Text size="3" weight="medium" style={{ color: "var(--gray-12)" }}>
                Technique Analysis
              </Text>
            </Flex>

            <Separator size="4" style={{ backgroundColor: "var(--gray-4)" }} />

            {/* Score Ring */}
            <Flex direction="column" align="center" justify="center" gap="3" style={{ flex: 1, minHeight: isMobile ? "auto" : 250 }}>
              <Text size="2" color="gray">
                Overall Score
              </Text>

              <ProgressRing
                value={score}
                maxValue={100}
                isVisible={isVisible}
                playerId={0}
                gradient={RING_GRADIENTS.activity}
                icon={<TargetIcon width={14} height={14} />}
                unit="points"
                size={isMobile ? 120 : 140}
                strokeWidth={isMobile ? 10 : 12}
                hideMedalDisplay={true}
              />

              {(categoryCount > 0 || featureCount > 0) && (
                <Text size="1" color="gray" style={{ textAlign: "center" }}>
                  {featureCount} features · {categoryCount} categories
                </Text>
              )}
            </Flex>
          </Flex>
        </Card>

        {/* Right Card: Technique Breakdown */}
        {hasRadarData && (
          <Card style={{ ...cardStyle, width: "100%" }}>
            <Flex direction="column" gap="4" p={isMobile ? "3" : "4"} style={{ height: "100%" }}>
              {/* Header */}
              <Flex justify="center">
                <Text size="3" weight="medium" style={{ color: "var(--gray-12)" }}>
                  Technique Breakdown
                </Text>
              </Flex>

              <Separator size="4" style={{ backgroundColor: "var(--gray-4)" }} />

              {/* Radar Chart */}
              <Box style={{ flex: 1, minHeight: isMobile ? 280 : 280 }}>
                <ResponsiveRadar
                  data={radarData}
                  keys={["value"]}
                  indexBy="attribute"
                  maxValue={100}
                  margin={isMobile
                    ? { top: 50, right: 60, bottom: 50, left: 60 }
                    : { top: 40, right: 80, bottom: 40, left: 80 }
                  }
                  curve="linearClosed"
                  borderWidth={2}
                  borderColor={MINT_COLOR}
                  gridLevels={4}
                  gridShape="circular"
                  gridLabelOffset={isMobile ? 12 : 16}
                  enableDots={true}
                  dotSize={isMobile ? 6 : 8}
                  dotColor={MINT_COLOR}
                  dotBorderWidth={2}
                  dotBorderColor="white"
                  colors={[MINT_COLOR]}
                  fillOpacity={0.25}
                  blendMode="normal"
                  motionConfig="gentle"
                  theme={CHART_THEME}
                  isInteractive={true}
                  sliceTooltip={({ index, data }) => (
                    <Box
                      style={{
                        background: "var(--gray-2)",
                        padding: "12px 16px",
                        borderRadius: 12,
                        border: `2px solid ${MINT_COLOR}`,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                        minWidth: 160,
                      }}
                    >
                      <Text size="2" weight="bold" style={{ color: MINT_COLOR, display: "block" }}>
                        {index}
                      </Text>
                      <Flex align="center" justify="between" gap="3" style={{ marginTop: 8 }}>
                        <Text size="2" color="gray">Score</Text>
                        <Text size="3" weight="bold" style={{ color: "var(--gray-12)" }}>
                          {data[0].value}
                        </Text>
                      </Flex>
                    </Box>
                  )}
                />
              </Box>
            </Flex>
          </Card>
        )}
      </Grid>
    </Box>
  );
}
