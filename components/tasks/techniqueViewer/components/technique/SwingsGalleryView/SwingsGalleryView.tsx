"use client";

/**
 * SwingsGalleryView
 *
 * Beautiful swings gallery with technique scoring and analysis.
 * Displays individual swing cards with radar charts and aggregate stats.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Box, Flex, Text, Card, Heading, Badge } from "@radix-ui/themes";
import {
  GridIcon,
  BarChartIcon,
  TargetIcon,
  RocketIcon,
  MixIcon,
} from "@radix-ui/react-icons";
import { TechniqueScoreCard } from "../TechniqueScoreCard";
import { TechniqueRatingBadge } from "../TechniqueRatingBadge";
import { SwingRadarChart } from "../SwingRadarChart";
import {
  calculateTechniqueScore,
  calculateConsistencyScore,
  getTechniqueRatingTier,
  TECHNIQUE_COLORS,
  type TechniqueMetrics,
} from "../techniqueUtils";
import type { SwingsGalleryViewProps } from "./types";
import { SWING_COLORS } from "./constants";
import { QuickStatPill, ScrollButton, TipCard } from "./components";

/**
 * Main gallery component for displaying swing analysis.
 */
export function SwingsGalleryView({
  protocolEvents,
  videoFPS,
  onPlaySwing,
  onViewModeChange,
}: SwingsGalleryViewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedSwingId, setSelectedSwingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Filter swing events
  const swingEvents = useMemo(
    () => protocolEvents.filter((e) => e.protocolId === "swing-detection-v3"),
    [protocolEvents]
  );

  // Calculate metrics for all swings
  const allMetrics = useMemo(
    () =>
      swingEvents.map((swing) => ({
        swing,
        metrics: calculateTechniqueScore(swing, protocolEvents, videoFPS),
      })),
    [swingEvents, protocolEvents, videoFPS]
  );

  // Calculate aggregate stats
  const aggregateStats = useMemo(() => {
    if (allMetrics.length === 0) return null;

    const overalls = allMetrics.map((m) => m.metrics.overall);
    const avgOverall = Math.round(overalls.reduce((a, b) => a + b, 0) / overalls.length);
    const bestScore = Math.max(...overalls);
    const consistency = calculateConsistencyScore(allMetrics.map((m) => m.metrics));

    // Calculate average for each metric
    const avgMetrics: TechniqueMetrics = {
      overall: avgOverall,
      timing: Math.round(allMetrics.reduce((sum, m) => sum + m.metrics.timing, 0) / allMetrics.length),
      power: Math.round(allMetrics.reduce((sum, m) => sum + m.metrics.power, 0) / allMetrics.length),
      form: Math.round(allMetrics.reduce((sum, m) => sum + m.metrics.form, 0) / allMetrics.length),
      recovery: Math.round(allMetrics.reduce((sum, m) => sum + m.metrics.recovery, 0) / allMetrics.length),
      preparation: Math.round(allMetrics.reduce((sum, m) => sum + m.metrics.preparation, 0) / allMetrics.length),
      consistency,
    };

    return { avgOverall, bestScore, consistency, avgMetrics };
  }, [allMetrics]);

  // Scroll state management
  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    updateScrollState();
    container.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, swingEvents.length]);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -400, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 400, behavior: "smooth" });
  };

  // Handle drag to scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    const startX = e.pageX;
    const scrollLeftPos = scrollRef.current?.scrollLeft || 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!scrollRef.current) return;
      const dx = e.pageX - startX;
      scrollRef.current.scrollLeft = scrollLeftPos - dx;
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // Empty state
  if (swingEvents.length === 0) {
    return <EmptyState />;
  }

  return (
    <Box
      style={{
        height: "100%",
        overflow: "auto",
        backgroundColor: "var(--gray-1)",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      {/* Summary Header */}
      <SummaryHeader swingCount={swingEvents.length} aggregateStats={aggregateStats} />

      {/* Average Radar (if multiple swings) */}
      {aggregateStats && swingEvents.length > 1 && (
        <AverageRadarSection avgMetrics={aggregateStats.avgMetrics} />
      )}

      {/* Cards Gallery */}
      <Box style={{ padding: "24px 0", position: "relative" }}>
        <Flex align="center" justify="between" px="5" mb="4">
          <Flex align="center" gap="2">
            <GridIcon width={18} height={18} style={{ color: "var(--gray-11)" }} />
            <Text size="3" weight="bold">Individual Swing Analysis</Text>
          </Flex>
          <Text size="1" color="gray">
            Click a card to select • Scroll to see more
          </Text>
        </Flex>

        {/* Scroll buttons */}
        {canScrollLeft && <ScrollButton direction="left" onClick={scrollLeft} />}
        {canScrollRight && <ScrollButton direction="right" onClick={scrollRight} />}

        {/* Scrollable cards container */}
        <Box
          ref={scrollRef}
          style={{
            overflowX: "auto",
            overflowY: "hidden",
            paddingBottom: 16,
            paddingLeft: 32,
            paddingRight: 32,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          onMouseDown={handleMouseDown}
        >
          <Flex gap="4" align="stretch" style={{ width: "max-content" }}>
            {allMetrics.map(({ swing, metrics }, index) => (
              <TechniqueScoreCard
                key={swing.id}
                swingEvent={swing}
                allEvents={protocolEvents}
                swingIndex={index}
                videoFPS={videoFPS}
                color={SWING_COLORS[index % SWING_COLORS.length]}
                delay={200 + index * 100}
                onPlaySwing={(time) => {
                  onPlaySwing(time);
                  onViewModeChange();
                }}
                isSelected={selectedSwingId === swing.id}
                onSelect={() => setSelectedSwingId(selectedSwingId === swing.id ? null : swing.id)}
              />
            ))}
          </Flex>
        </Box>
      </Box>

      {/* Tips Section */}
      <TipsSection aggregateStats={aggregateStats} />

      {/* Hide scrollbar */}
      <style>{`
        [data-scrollable]::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </Box>
  );
}

// ============================================================================
// Sub-sections
// ============================================================================

function EmptyState() {
  return (
    <Flex
      align="center"
      justify="center"
      direction="column"
      gap="4"
      style={{ height: "100%", minHeight: 400, padding: 40 }}
    >
      <Box
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--gray-a3), var(--gray-a4))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MixIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
      </Box>
      <Heading size="5" weight="medium" style={{ color: "var(--gray-11)" }}>
        No Swings Detected Yet
      </Heading>
      <Text size="2" color="gray" style={{ textAlign: "center", maxWidth: 400 }}>
        Enable Swing Detection V3 in settings and preprocess the video to detect and analyze swings.
      </Text>
    </Flex>
  );
}

interface SummaryHeaderProps {
  swingCount: number;
  aggregateStats: {
    avgOverall: number;
    bestScore: number;
    consistency: number;
    avgMetrics: TechniqueMetrics;
  } | null;
}

function SummaryHeader({ swingCount, aggregateStats }: SummaryHeaderProps) {
  return (
    <Box
      style={{
        padding: "24px 32px",
        background: "linear-gradient(180deg, var(--gray-2) 0%, var(--gray-1) 100%)",
        borderBottom: "1px solid var(--gray-a4)",
      }}
    >
      <Flex align="start" justify="between" gap="4" wrap="wrap">
        {/* Left: Title and count */}
        <Box>
          <Flex align="center" gap="3" mb="2">
            <TargetIcon width={24} height={24} style={{ color: TECHNIQUE_COLORS.mint.primary }} />
            <Heading size="6" weight="bold">Technique Assessment</Heading>
            <Badge color="blue" size="2" radius="full">
              {swingCount} Swing{swingCount !== 1 ? "s" : ""}
            </Badge>
          </Flex>
          <Text size="2" color="gray">
            AI-powered analysis of your swing technique across key performance dimensions
          </Text>
        </Box>

        {/* Right: Aggregate Score */}
        {aggregateStats && (
          <Flex align="center" gap="4">
            <Card
              style={{
                padding: "16px 24px",
                background: `linear-gradient(135deg, ${TECHNIQUE_COLORS.mint.fill}, var(--gray-2))`,
                border: `1px solid ${TECHNIQUE_COLORS.mint.primary}33`,
              }}
            >
              <Flex align="center" gap="4">
                <Box>
                  <Text size="1" color="gray" style={{ display: "block", marginBottom: 4 }}>
                    AVERAGE SCORE
                  </Text>
                  <Flex align="baseline" gap="1">
                    <Text size="7" weight="bold" style={{ color: TECHNIQUE_COLORS.mint.primary }}>
                      {aggregateStats.avgOverall}
                    </Text>
                    <Text size="2" color="gray">/100</Text>
                  </Flex>
                  <Text size="1" style={{ color: TECHNIQUE_COLORS.mint.primary }}>
                    {getTechniqueRatingTier(aggregateStats.avgOverall).label} Level
                  </Text>
                </Box>
                <TechniqueRatingBadge score={aggregateStats.avgOverall} size="large" showLabel />
              </Flex>
            </Card>
          </Flex>
        )}
      </Flex>

      {/* Quick Stats */}
      {aggregateStats && (
        <Flex gap="4" mt="4" wrap="wrap">
          <QuickStatPill label="Best Score" value={aggregateStats.bestScore} icon="🏆" color="#FFD700" />
          <QuickStatPill label="Consistency" value={aggregateStats.consistency} icon="📊" color={TECHNIQUE_COLORS.blue.primary} />
          <QuickStatPill label="Avg Power" value={aggregateStats.avgMetrics.power} icon="💪" color={TECHNIQUE_COLORS.amber.primary} />
          <QuickStatPill label="Avg Form" value={aggregateStats.avgMetrics.form} icon="🎯" color={TECHNIQUE_COLORS.purple.primary} />
        </Flex>
      )}
    </Box>
  );
}

interface AverageRadarSectionProps {
  avgMetrics: TechniqueMetrics;
}

function AverageRadarSection({ avgMetrics }: AverageRadarSectionProps) {
  return (
    <Box style={{ padding: "24px 32px", borderBottom: "1px solid var(--gray-a4)" }}>
      <Card style={{ maxWidth: 500, margin: "0 auto" }}>
        <Box p="4">
          <Flex align="center" gap="2" mb="3">
            <BarChartIcon width={18} height={18} style={{ color: TECHNIQUE_COLORS.mint.primary }} />
            <Text size="3" weight="bold">Overall Technique Profile</Text>
          </Flex>
          <SwingRadarChart metrics={avgMetrics} height={280} color={TECHNIQUE_COLORS.mint.primary} showLegend />
        </Box>
      </Card>
    </Box>
  );
}

interface TipsSectionProps {
  aggregateStats: {
    avgMetrics: TechniqueMetrics;
    consistency: number;
  } | null;
}

function TipsSection({ aggregateStats }: TipsSectionProps) {
  return (
    <Box
      style={{
        padding: "24px 32px",
        borderTop: "1px solid var(--gray-a4)",
        background: "var(--gray-a2)",
      }}
    >
      <Flex align="center" gap="2" mb="3">
        <RocketIcon width={18} height={18} style={{ color: TECHNIQUE_COLORS.amber.primary }} />
        <Text size="3" weight="bold">Improvement Tips</Text>
      </Flex>
      <Flex gap="4" wrap="wrap">
        {aggregateStats && aggregateStats.avgMetrics.preparation < 70 && (
          <TipCard icon="🚀" title="Preparation" tip="Focus on a more complete backswing to generate power" />
        )}
        {aggregateStats && aggregateStats.avgMetrics.power < 70 && (
          <TipCard icon="💪" title="Power" tip="Use your legs and core to generate more racket speed" />
        )}
        {aggregateStats && aggregateStats.avgMetrics.recovery < 70 && (
          <TipCard icon="🔄" title="Recovery" tip="Finish your swing with a complete follow-through" />
        )}
        {aggregateStats && aggregateStats.consistency < 70 && (
          <TipCard icon="📊" title="Consistency" tip="Work on repeating the same swing motion each time" />
        )}
        {(!aggregateStats || Object.values(aggregateStats.avgMetrics).every((v) => v >= 70)) && (
          <TipCard icon="⭐" title="Great Work!" tip="Your technique looks solid. Keep practicing to maintain consistency." />
        )}
      </Flex>
    </Box>
  );
}

export default SwingsGalleryView;
