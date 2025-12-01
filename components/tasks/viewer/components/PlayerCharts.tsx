"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Flex, Text, Heading } from "@radix-ui/themes";
import { ResponsivePie } from "@nivo/pie";
import { Player } from "../types";
import { formatSwingType } from "../utils";
import { useInView, useAnimatedProgress } from "../hooks";
import { 
  CHART_THEME, 
  SWING_TYPE_COLORS, 
  SWING_TYPE_FALLBACK_COLORS,
  getSwingTypeColor,
  getRandomNickname,
} from "../constants";
import { ProgressRing, RING_GRADIENTS, RING_ICONS } from "./shared";

interface PlayerChartsProps {
  player: Player;
  displayName: string;
  maxDistance?: number;
  distanceRank?: number;
  maxBallSpeed?: number;
  ballSpeedRank?: number;
  maxSprintSpeed?: number;
  sprintRank?: number;
  swingsRank?: number;
  maxSwings?: number;
}

// Calculate swing distribution including serves from swing data
function calculateSwingDistributionWithServes(player: Player): Record<string, number> {
  const swings = player.swings || [];
  if (swings.length === 0) return player.swing_type_distribution;

  // Count swings by type, separating serves
  const counts: Record<string, number> = {};
  let totalCount = 0;

  for (const swing of swings) {
    // First swing of rally is a serve if serve flag is true
    if (swing.serve) {
      counts["serve"] = (counts["serve"] || 0) + 1;
    } else {
      const type = swing.swing_type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
    }
    totalCount++;
  }

  // Convert to percentages (0-1 range like the original distribution)
  if (totalCount === 0) return player.swing_type_distribution;
  
  const distribution: Record<string, number> = {};
  for (const [type, count] of Object.entries(counts)) {
    distribution[type] = count / totalCount;
  }

  return distribution;
}

// Swing Type Distribution Pie Chart
function SwingTypeChart({
  player,
  isVisible,
  totalSwings,
  rank,
  maxSwings,
}: {
  player: Player;
  isVisible: boolean;
  totalSwings: number;
  rank?: number;
  maxSwings?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { progress } = useAnimatedProgress({
    isVisible,
    duration: 1800,
    delay: 200,
  });

  // Use distribution with serves if we have swing data, otherwise fall back to original
  const distribution = calculateSwingDistributionWithServes(player);

  const data = Object.entries(distribution)
    .filter(([, value]) => value > 0.01)
    .map(([type, value], index) => ({
      id: type,
      label: formatSwingType(type),
      value: Math.round(value * 100),
      color: getSwingTypeColor(type, index),
    }))
    .sort((a, b) => b.value - a.value);

  const displaySwings = Math.round(totalSwings * progress);

  // Piano-style sequential bounce when loading
  useEffect(() => {
    if (isVisible && progress > 0.5 && containerRef.current) {
      const paths = containerRef.current.querySelectorAll('path[fill]:not([fill="none"])');
      const pathsArray = Array.from(paths) as HTMLElement[];

      pathsArray.forEach((path, index) => {
        setTimeout(() => {
          path.style.filter = "drop-shadow(0 0 20px rgba(122, 219, 143, 0.9))";
          path.style.transform = "scale(1.12)";
          path.style.transition = "all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)";

          setTimeout(() => {
            path.style.filter = "none";
            path.style.transform = "scale(1)";
            path.style.transition = "all 0.25s ease-out";
          }, 150);
        }, index * 120);
      });
    }
  }, [isVisible, progress > 0.5]);

  if (data.length === 0) return null;

  const animatedData = data.map((item) => ({
    ...item,
    displayValue: Math.round(item.value * progress),
  }));

  return (
    <Flex direction="column" align="center" gap="2" style={{ overflow: "visible" }}>
      <Box
        ref={containerRef}
        style={{ height: 220, width: "100%", position: "relative", overflow: "visible" }}
      >
        <ResponsivePie
          data={animatedData}
          theme={CHART_THEME}
          margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
          innerRadius={0.5}
          padAngle={2}
          cornerRadius={6}
          activeOuterRadiusOffset={10}
          colors={{ datum: "data.color" }}
          borderWidth={2}
          borderColor={{ from: "color", modifiers: [["darker", 0.3]] }}
          enableArcLinkLabels={true}
          arcLinkLabel="label"
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsTextColor="var(--gray-11)"
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: "color" }}
          arcLabelsSkipAngle={15}
          arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
          arcLabel={(d) => `${(d.data as (typeof animatedData)[0]).displayValue}%`}
          animate={isVisible}
          motionConfig={{
            mass: 1,
            tension: 140,
            friction: 20,
            clamp: false,
            precision: 0.01,
            velocity: 0,
          }}
          transitionMode="startAngle"
          onMouseEnter={(_data, event) => {
            const target = event.currentTarget as SVGPathElement;
            target.style.filter = "drop-shadow(0 0 12px rgba(122, 219, 143, 0.7))";
            target.style.transform = "scale(1.08)";
            target.style.transition = "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)";
          }}
          onMouseLeave={(_data, event) => {
            const target = event.currentTarget as SVGPathElement;
            target.style.filter = "none";
            target.style.transform = "scale(1)";
          }}
          valueFormat={(value) => `${value}%`}
          tooltip={({ datum }) => (
            <Box
              style={{
                background: "var(--gray-2)",
                padding: "10px 14px",
                borderRadius: 10,
                border: `2px solid ${datum.color}`,
                boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              }}
            >
              <Flex align="center" gap="2">
                <Box
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 4,
                    backgroundColor: datum.color,
                  }}
                />
                <Text size="2" weight="bold">
                  {datum.label}: {datum.value}%
                </Text>
              </Flex>
            </Box>
          )}
        />
        {/* Center display - swing count */}
        <Box
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <Text
            size="6"
            weight="bold"
            style={{
              color: "var(--gray-12)",
              fontFamily: "var(--font-mono, monospace)",
              lineHeight: 1,
            }}
          >
            {displaySwings}
          </Text>
          <Text size="1" color="gray" style={{ display: "block" }}>
            shots
          </Text>
        </Box>
      </Box>
    </Flex>
  );
}

// Speedometer component for ball speed (kept for backwards compat, uses SVG gauge)
function BallSpeedSpeedometer({
  player,
  isVisible,
  globalMaxSpeed,
  rank,
}: {
  player: Player;
  isVisible: boolean;
  globalMaxSpeed?: number;
  rank?: number;
}) {
  const swings = player.swings || [];
  if (swings.length === 0) return null;

  const avgSpeed = swings.reduce((sum, s) => sum + s.ball_speed, 0) / swings.length;
  const maxSpeed = Math.max(...swings.map((s) => s.ball_speed));
  const maxValue = Math.max(150, Math.ceil(maxSpeed / 10) * 10 + 10);

  const { progress, isComplete } = useAnimatedProgress({
    isVisible,
    duration: 2800,
    delay: 150,
  });

  const displayValue = Math.round(maxSpeed * progress);
  const displayAvg = Math.round(avgSpeed * progress);

  const size = 200;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = 80;
  const startAngle = -140;
  const endAngle = 140;
  const angleRange = endAngle - startAngle;

  const animatedValue = progress * maxSpeed;
  const animatedAvgValue = progress * avgSpeed;
  const needleAngle = startAngle + (animatedValue / maxValue) * angleRange;
  const avgAngle = startAngle + (animatedAvgValue / maxValue) * angleRange;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const describeArc = (startAng: number, endAng: number, r: number) => {
    if (Math.abs(endAng - startAng) < 0.1) return "";
    const start = {
      x: cx + r * Math.cos(toRad(startAng - 90)),
      y: cy + r * Math.sin(toRad(startAng - 90)),
    };
    const end = {
      x: cx + r * Math.cos(toRad(endAng - 90)),
      y: cy + r * Math.sin(toRad(endAng - 90)),
    };
    const largeArcFlag = endAng - startAng <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  const ticks = [0, 30, 60, 90, 120, 150];
  const id = useRef(`speedometer-${Math.random().toString(36).substr(2, 9)}`);
  const percentage = globalMaxSpeed && globalMaxSpeed > 0 ? Math.round((maxSpeed / globalMaxSpeed) * 100) : 0;

  return (
    <Flex direction="column" align="center" gap="2">
      <Box style={{ position: "relative" }}>
        <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`}>
          <defs>
            <filter id={`${id.current}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id={`${id.current}-arcGradient`} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="25%" stopColor="#7ADB8F" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="65%" stopColor="#F97316" />
              <stop offset="85%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>
            <linearGradient id={`${id.current}-needle`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>
            <filter id={`${id.current}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Background arc */}
          <path d={describeArc(startAngle, endAngle, radius)} fill="none" stroke="var(--gray-4)" strokeWidth="16" strokeLinecap="round" />
          <path d={describeArc(startAngle, endAngle, radius)} fill="none" stroke={`url(#${id.current}-arcGradient)`} strokeWidth="12" strokeLinecap="round" opacity={0.2} />

          {/* Progress arc */}
          {animatedValue > 0 && (
            <path d={describeArc(startAngle, needleAngle, radius)} fill="none" stroke={`url(#${id.current}-arcGradient)`} strokeWidth="12" strokeLinecap="round" filter={`url(#${id.current}-glow)`} />
          )}

          {/* Tick marks */}
          {ticks.map((tick) => {
            const tickAngle = startAngle + (tick / maxValue) * angleRange;
            const innerR = radius - 24;
            const outerR = radius - 16;
            const x1 = cx + innerR * Math.cos(toRad(tickAngle - 90));
            const y1 = cy + innerR * Math.sin(toRad(tickAngle - 90));
            const x2 = cx + outerR * Math.cos(toRad(tickAngle - 90));
            const y2 = cy + outerR * Math.sin(toRad(tickAngle - 90));
            return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--gray-8)" strokeWidth="2" strokeLinecap="round" />;
          })}

          {/* Labels */}
          {ticks.map((tick) => {
            const tickAngle = startAngle + (tick / maxValue) * angleRange;
            const labelR = radius + 18;
            const labelX = cx + labelR * Math.cos(toRad(tickAngle - 90));
            const labelY = cy + labelR * Math.sin(toRad(tickAngle - 90));
            return (
              <text key={`label-${tick}`} x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fill="var(--gray-11)" fontSize="11" fontWeight="600">
                {tick}
              </text>
            );
          })}

          {/* Average needle */}
          <g style={{ transform: `rotate(${avgAngle}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
            <polygon points={`${cx},${cy - 45} ${cx - 3},${cy} ${cx + 3},${cy}`} fill="#10B981" filter={`url(#${id.current}-shadow)`} />
            <circle cx={cx} cy={cy} r="6" fill="#10B981" stroke="white" strokeWidth="1.5" />
          </g>

          {/* Max needle */}
          <g style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
            <polygon points={`${cx},${cy - 55} ${cx - 4},${cy} ${cx + 4},${cy}`} fill={`url(#${id.current}-needle)`} filter={`url(#${id.current}-shadow)`} />
            <circle cx={cx} cy={cy} r="8" fill="var(--gray-12)" stroke="var(--gray-8)" strokeWidth="2" />
            <circle cx={cx} cy={cy} r="3" fill="#EF4444" />
          </g>
        </svg>
      </Box>

      {/* Stats row */}
      <Flex justify="center" gap="4" align="center">
        <Flex align="center" gap="1">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <polygon points="6,1 4.5,10 7.5,10" fill="#10B981" />
            <circle cx="6" cy="10" r="1.5" fill="#10B981" />
          </svg>
          <Text size="1" color="gray">
            Avg: <Text weight="bold" style={{ color: "var(--mint-11)" }}>{displayAvg} km/h</Text>
          </Text>
        </Flex>
        <Flex align="center" gap="1">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <polygon points="6,0 4,10 8,10" fill="#EF4444" />
            <circle cx="6" cy="10" r="2" fill="#EF4444" />
          </svg>
          <Text size="1" color="gray">
            Max: <Text weight="bold" style={{ color: "var(--orange-11)" }}>{displayValue} km/h</Text>
          </Text>
        </Flex>
      </Flex>

      {/* Ranking display */}
      {rank && rank <= 3 && (
        <Flex justify="center" align="center" gap="2" style={{ opacity: isComplete ? 1 : 0, transition: "opacity 0.4s" }}>
          <Text size="2" color="gray">
            {rank === 1 ? getRandomNickname("hardest_shot", player.player_id) : `${percentage}% of leader`}
          </Text>
        </Flex>
      )}
    </Flex>
  );
}

// Main PlayerCharts component
export function PlayerCharts({
  player,
  displayName,
  maxDistance,
  distanceRank,
  maxBallSpeed,
  ballSpeedRank,
  maxSprintSpeed,
  sprintRank,
  swingsRank,
  maxSwings,
}: PlayerChartsProps) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated]);

  const hasSwingData = Object.keys(player.swing_type_distribution).length > 0;
  const hasSpeedData = player.swings && player.swings.length > 0;
  const hasDistanceData = player.covered_distance > 0 && maxDistance && maxDistance > 0;
  const hasSprintData = player.fastest_sprint > 0;

  if (!hasSwingData && !hasSpeedData && !hasDistanceData && !hasSprintData) {
    return null;
  }

  const playerMaxSpeed = hasSpeedData ? Math.max(...player.swings!.map((s) => s.ball_speed)) : 0;

  return (
    <Box
      ref={ref}
      style={{
        opacity: hasAnimated ? 1 : 0,
        transform: hasAnimated ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
      }}
    >
      <Flex direction="column" gap="4">
        {/* Top row: Shots and Power */}
        <Flex gap="4" wrap="wrap" align="stretch">
          {/* Shots */}
          {hasSwingData && (
            <Flex direction="column" style={{ flex: "1 1 180px", minWidth: 180 }}>
              <Heading size="2" weight="medium" mb="2" style={{ color: "var(--gray-11)", textAlign: "center" }}>
                Shots
              </Heading>
              <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <ProgressRing
                  value={player.swings?.length || 0}
                  maxValue={maxSwings || player.swings?.length || 1}
                  isVisible={hasAnimated}
                  rank={swingsRank}
                  playerId={player.player_id}
                  gradient={RING_GRADIENTS.activity}
                  icon={RING_ICONS.activity}
                  unit="shots"
                  winnerNickname={swingsRank === 1 ? getRandomNickname("most_shots", player.player_id) : undefined}
                />
              </Box>
            </Flex>
          )}

          {/* Power */}
          {hasSpeedData && (
            <Flex direction="column" style={{ flex: "1 1 180px", minWidth: 180 }}>
              <Heading size="2" weight="medium" mb="2" style={{ color: "var(--gray-11)", textAlign: "center" }}>
                Power
              </Heading>
              <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <ProgressRing
                  value={playerMaxSpeed}
                  maxValue={maxBallSpeed || 1}
                  isVisible={hasAnimated}
                  rank={ballSpeedRank}
                  playerId={player.player_id}
                  gradient={RING_GRADIENTS.power}
                  icon={RING_ICONS.power}
                  unit="km/h"
                  winnerNickname={ballSpeedRank === 1 ? getRandomNickname("hardest_shot", player.player_id) : undefined}
                />
              </Box>
            </Flex>
          )}
        </Flex>

        {/* Bottom row: Distance and Sprint */}
        {(hasSprintData || hasDistanceData) && (
          <Flex gap="4" wrap="wrap" align="stretch">
            {/* Distance */}
            {hasDistanceData && (
              <Flex direction="column" style={{ flex: "1 1 180px", minWidth: 180 }}>
                <Heading size="2" weight="medium" mb="2" style={{ color: "var(--gray-11)", textAlign: "center" }}>
                  Distance
                </Heading>
                <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <ProgressRing
                    value={player.covered_distance}
                    maxValue={maxDistance}
                    isVisible={hasAnimated}
                    rank={distanceRank}
                    playerId={player.player_id}
                    gradient={RING_GRADIENTS.distance}
                    icon={RING_ICONS.distance}
                    unit="meters"
                    winnerNickname={distanceRank === 1 ? getRandomNickname("most_distance", player.player_id) : undefined}
                  />
                </Box>
              </Flex>
            )}

            {/* Sprint */}
            {hasSprintData && (
              <Flex direction="column" style={{ flex: "1 1 180px", minWidth: 180 }}>
                <Heading size="2" weight="medium" mb="2" style={{ color: "var(--gray-11)", textAlign: "center" }}>
                  Sprint
                </Heading>
                <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <ProgressRing
                    value={player.fastest_sprint}
                    maxValue={maxSprintSpeed || player.fastest_sprint}
                    isVisible={hasAnimated}
                    rank={sprintRank}
                    playerId={player.player_id}
                    gradient={RING_GRADIENTS.sprint}
                    icon={RING_ICONS.sprint}
                    unit="km/h"
                    winnerNickname={sprintRank === 1 ? getRandomNickname("fastest_sprint", player.player_id) : undefined}
                  />
                </Box>
              </Flex>
            )}
          </Flex>
        )}
      </Flex>
    </Box>
  );
}
