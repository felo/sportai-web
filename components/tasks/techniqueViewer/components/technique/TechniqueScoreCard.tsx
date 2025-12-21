"use client";

import { useState, useEffect, useMemo } from "react";
import { Box, Flex, Text, Card, Separator, HoverCard, Tooltip } from "@radix-ui/themes";
import { PlayIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import type { ProtocolEvent } from "@/components/videoPoseViewerV2";
import { TechniqueRatingBadge } from "./TechniqueRatingBadge";
import { SwingRadarChart } from "./SwingRadarChart";
import { SwingPhaseTimeline } from "./SwingPhaseTimeline";
import { 
  calculateTechniqueScore, 
  getTechniqueRatingTier,
  getSwingTypeInfo,
  formatSpeed,
  TECHNIQUE_COLORS,
  type TechniqueMetrics,
} from "./techniqueUtils";

interface TechniqueScoreCardProps {
  swingEvent: ProtocolEvent;
  allEvents: ProtocolEvent[];
  swingIndex: number;
  videoFPS: number;
  color?: typeof TECHNIQUE_COLORS[keyof typeof TECHNIQUE_COLORS];
  delay?: number;
  onPlaySwing?: (time: number) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

/**
 * Beautiful technique score card for individual swing assessment
 */
export function TechniqueScoreCard({
  swingEvent,
  allEvents,
  swingIndex,
  videoFPS,
  color = TECHNIQUE_COLORS.mint,
  delay = 0,
  onPlaySwing,
  isSelected = false,
  onSelect,
}: TechniqueScoreCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  // Extract metadata
  const metadata = swingEvent.metadata as Record<string, unknown> | undefined;
  const swingType = metadata?.swingType as string | undefined;
  const velocityKmh = metadata?.velocityKmh as number | undefined;
  const confidence = metadata?.confidence as number | undefined;
  const clipDuration = metadata?.clipDuration as number | undefined;
  
  // Calculate technique metrics
  const metrics = useMemo(() => 
    calculateTechniqueScore(swingEvent, allEvents, videoFPS),
    [swingEvent, allEvents, videoFPS]
  );
  
  // Get related events for this swing
  const relatedEvents = useMemo(() => 
    allEvents.filter(e => {
      const timeWindow = e.startTime >= swingEvent.startTime - 0.5 && 
                         e.startTime <= swingEvent.endTime + 0.5;
      return timeWindow && e.protocolId !== "swing-detection-v3";
    }),
    [allEvents, swingEvent]
  );
  
  // Get swing type info
  const swingTypeInfo = getSwingTypeInfo(swingType);
  const tier = getTechniqueRatingTier(metrics.overall);

  return (
    <Box
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible 
          ? (isHovered ? "translateY(-4px)" : "translateY(0)") 
          : "translateY(20px)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        cursor: onSelect ? "pointer" : "default",
        width: 380,
        flexShrink: 0,
      }}
    >
      <Card
        style={{
          border: isSelected 
            ? `2px solid ${color.primary}` 
            : "1px solid var(--gray-6)",
          boxShadow: isHovered 
            ? `0 8px 32px ${color.glow}` 
            : "0 2px 8px rgba(0,0,0,0.1)",
          transition: "all 0.3s ease",
          overflow: "hidden",
          background: isSelected 
            ? `linear-gradient(135deg, ${color.fill} 0%, var(--gray-1) 100%)`
            : "var(--gray-1)",
        }}
      >
        <Flex direction="column" gap="0">
          {/* Header */}
          <Flex 
            align="center" 
            justify="between" 
            p="4"
            style={{
              background: `linear-gradient(135deg, ${tier.gradient[0]}15, ${tier.gradient[1]}25)`,
              borderBottom: "1px solid var(--gray-a4)",
            }}
          >
            <Flex align="center" gap="3">
              {/* Swing number badge */}
              <Box
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: `linear-gradient(135deg, ${color.gradient[0]}, ${color.gradient[1]})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 2px 8px ${color.glow}`,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: 700, color: "white" }}>
                  #{swingIndex + 1}
                </Text>
              </Box>
              
              <Box>
                <Flex align="center" gap="2">
                  <Text style={{ fontSize: 16 }}>{swingTypeInfo.icon}</Text>
                  <Text size="4" weight="bold">
                    {swingTypeInfo.label}
                  </Text>
                </Flex>
                <Text size="1" color="gray">
                  {swingEvent.startTime.toFixed(2)}s - {swingEvent.endTime.toFixed(2)}s
                </Text>
              </Box>
            </Flex>
            
            {/* Technique Rating Badge */}
            <TechniqueRatingBadge score={metrics.overall} size="default" showLabel />
          </Flex>
          
          {/* Radar Chart */}
          <Box p="3">
            <SwingRadarChart 
              metrics={metrics} 
              height={200}
              color={color.primary}
            />
          </Box>
          
          <Separator size="4" style={{ opacity: 0.3 }} />
          
          {/* Phase Timeline */}
          <Box p="3">
            <Text size="1" weight="bold" color="gray" style={{ marginBottom: 8, display: "block" }}>
              SWING PHASES
            </Text>
            <SwingPhaseTimeline
              swingEvent={swingEvent}
              relatedEvents={relatedEvents}
              totalDuration={swingEvent.endTime - swingEvent.startTime}
            />
          </Box>
          
          <Separator size="4" style={{ opacity: 0.3 }} />
          
          {/* Key Metrics */}
          <Flex p="3" gap="3" justify="between">
            {/* Speed */}
            <MetricBox
              label="Speed"
              value={formatSpeed(velocityKmh)}
              icon="⚡"
              color={velocityKmh && velocityKmh >= 20 ? color.primary : "var(--gray-8)"}
            />
            
            {/* Duration */}
            <MetricBox
              label="Duration"
              value={`${clipDuration?.toFixed(1) || (swingEvent.endTime - swingEvent.startTime).toFixed(1)}s`}
              icon="⏱️"
              color="var(--gray-11)"
            />
            
            {/* Confidence */}
            <MetricBox
              label="Detection"
              value={`${Math.round((confidence || 0.5) * 100)}%`}
              icon="🎯"
              color={confidence && confidence >= 0.7 ? "#10B981" : "var(--gray-8)"}
            />
          </Flex>
          
          {/* Scores breakdown */}
          <Box px="3" pb="3">
            <Flex gap="2" wrap="wrap">
              <ScorePill label="⏱️ Timing" score={metrics.timing} />
              <ScorePill label="💪 Power" score={metrics.power} />
              <ScorePill label="🎯 Form" score={metrics.form} />
              <ScorePill label="🔄 Recovery" score={metrics.recovery} />
              <ScorePill label="🚀 Prep" score={metrics.preparation} />
            </Flex>
          </Box>
          
          {/* Play Button */}
          {onPlaySwing && (
            <>
              <Separator size="4" style={{ opacity: 0.3 }} />
              <Tooltip content="Play this swing in viewer">
                <Flex
                  align="center"
                  justify="center"
                  gap="2"
                  p="3"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlaySwing(swingEvent.startTime);
                  }}
                  style={{
                    cursor: "pointer",
                    backgroundColor: isHovered ? `${color.primary}15` : "transparent",
                    transition: "all 0.2s ease",
                  }}
                >
                  <PlayIcon width={16} height={16} style={{ color: color.primary }} />
                  <Text size="2" weight="medium" style={{ color: color.primary }}>
                    Play in Viewer
                  </Text>
                  <ChevronRightIcon width={14} height={14} style={{ color: color.primary }} />
                </Flex>
              </Tooltip>
            </>
          )}
        </Flex>
      </Card>
    </Box>
  );
}

// Metric display box
function MetricBox({ 
  label, 
  value, 
  icon, 
  color 
}: { 
  label: string; 
  value: string; 
  icon: string; 
  color: string;
}) {
  return (
    <Flex direction="column" align="center" gap="1" style={{ flex: 1 }}>
      <Text size="1" color="gray">{label}</Text>
      <Flex align="center" gap="1">
        <Text style={{ fontSize: 14 }}>{icon}</Text>
        <Text size="3" weight="bold" style={{ color, fontFamily: "monospace" }}>
          {value}
        </Text>
      </Flex>
    </Flex>
  );
}

// Score pill with color coding
function ScorePill({ label, score }: { label: string; score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return { bg: "rgba(16, 185, 129, 0.15)", text: "#10B981" };
    if (s >= 60) return { bg: "rgba(96, 165, 250, 0.15)", text: "#60A5FA" };
    if (s >= 40) return { bg: "rgba(245, 158, 11, 0.15)", text: "#F59E0B" };
    return { bg: "rgba(239, 68, 68, 0.15)", text: "#EF4444" };
  };
  
  const colors = getScoreColor(score);
  
  return (
    <Flex
      align="center"
      gap="1"
      style={{
        padding: "4px 8px",
        borderRadius: 6,
        backgroundColor: colors.bg,
      }}
    >
      <Text size="1">{label}</Text>
      <Text size="1" weight="bold" style={{ color: colors.text }}>
        {score}
      </Text>
    </Flex>
  );
}










