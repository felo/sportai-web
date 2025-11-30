"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Flex, Grid, Heading, Text, Card, Separator } from "@radix-ui/themes";
import { ResponsivePie } from "@nivo/pie";
import { StatisticsResult, BallBounce } from "../types";
import { formatSwingType } from "../utils";

// Same color mapping as PlayerCharts
const SWING_TYPE_COLORS: Record<string, string> = {
  "forehand": "#10B981",
  "backhand": "#06B6D4",
  "backhand_2h": "#0EA5E9",
  "serve": "#8B5CF6",
  "volley": "#F59E0B",
  "overhead": "#84CC16",
  "smash": "#84CC16",
  "drop": "#EC4899",
  "dropshot": "#EC4899",
  "slice": "#14B8A6",
  "lob": "#6366F1",
  "flat": "#A855F7",
  "kick": "#D946EF",
};

function getSwingTypeColor(type: string, index: number): string {
  const normalizedType = type.toLowerCase().replace(/[^a-z0-9]/g, "_");
  if (SWING_TYPE_COLORS[normalizedType]) {
    return SWING_TYPE_COLORS[normalizedType];
  }
  const fallbackColors = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4", "#84CC16"];
  return fallbackColors[index % fallbackColors.length];
}

// Nivo theme
const sportaiTheme = {
  background: "transparent",
  text: { fontSize: 11, fill: "var(--gray-11)" },
};

interface MatchSummaryCardProps {
  result: StatisticsResult;
  enhancedBallBounces?: BallBounce[];
}

export function MatchSummaryCard({ result, enhancedBallBounces }: MatchSummaryCardProps) {
  const players = result.players || [];
  const rallies = result.rallies || [];
  const ballBounces = result.ball_bounces || [];
  
  const filteredPlayers = players.filter(p => p.swing_count >= 10);
  const totalSwings = filteredPlayers.reduce((sum, p) => sum + p.swing_count, 0);
  const bounceCount = enhancedBallBounces?.length ?? ballBounces.length;
  
  // Calculate total distance covered by all players (in meters)
  const totalDistance = filteredPlayers.reduce((sum, p) => sum + (p.covered_distance || 0), 0);
  
  // Calculate total rally duration (sum of all rally durations in seconds)
  const totalRallyDuration = rallies.reduce((sum, rally) => {
    const [start, end] = rally;
    return sum + (end - start);
  }, 0);

  // Aggregate swing type distribution
  const aggregatedSwingTypes: Record<string, number> = {};
  let totalSwingCount = 0;
  
  filteredPlayers.forEach(player => {
    if (player.swings) {
      player.swings.forEach(swing => {
        const type = swing.swing_type || "unknown";
        aggregatedSwingTypes[type] = (aggregatedSwingTypes[type] || 0) + 1;
        totalSwingCount++;
      });
    }
  });

  // Convert to percentages
  const swingTypeData = Object.entries(aggregatedSwingTypes)
    .filter(([, count]) => count > 0)
    .map(([type, count], index) => ({
      id: type,
      label: formatSwingType(type),
      value: Math.round((count / totalSwingCount) * 100),
      color: getSwingTypeColor(type, index),
    }))
    .sort((a, b) => b.value - a.value);

  // Aggregate ball speed data
  const allSpeeds = filteredPlayers.flatMap(p => p.swings?.map(s => s.ball_speed) || []).filter(s => s > 0);
  const maxBallSpeed = allSpeeds.length > 0 ? Math.max(...allSpeeds) : 0;
  const avgBallSpeed = allSpeeds.length > 0 ? allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length : 0;

  const hasSwingData = swingTypeData.length > 0;
  const hasSpeedData = allSpeeds.length > 0;

  return (
    <Card style={{ border: "1px solid var(--gray-6)" }}>
      <Flex direction="column" gap="3" p="4">
        <Heading size="4" weight="medium">
          Match Summary
        </Heading>
        <Grid columns="3" gap="3">
          <Box>
            <Text size="1" color="gray">
              Players
            </Text>
            <Text size="3" weight="bold">
              {filteredPlayers.length}
            </Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Total Swings
            </Text>
            <Text size="3" weight="bold">
              {totalSwings}
            </Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Rallies
            </Text>
            <Text size="3" weight="bold">
              {rallies.length}
            </Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Bounces
            </Text>
            <Text size="3" weight="bold">
              {bounceCount}
            </Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Total Distance
            </Text>
            <Text size="3" weight="bold">
              {totalDistance >= 1000 
                ? `${(totalDistance / 1000).toFixed(1)} km` 
                : `${Math.round(totalDistance)} m`}
            </Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Rally Duration
            </Text>
            <Text size="3" weight="bold">
              {totalRallyDuration >= 60 
                ? `${Math.floor(totalRallyDuration / 60)}m ${Math.round(totalRallyDuration % 60)}s`
                : `${Math.round(totalRallyDuration)}s`}
            </Text>
          </Box>
        </Grid>

        {/* Charts Section */}
        {(hasSwingData || hasSpeedData) && (
          <>
            <Separator size="4" />
            <Flex gap="4" wrap="wrap" align="stretch">
              {/* Shot Power Speedometer */}
              {hasSpeedData && (
                <Box style={{ flex: "1 1 200px", minWidth: 200 }}>
                  <Heading size="2" weight="medium" mb="2" style={{ color: "var(--gray-11)", textAlign: "center" }}>
                    Shot Power
                  </Heading>
                  <MatchSpeedometer maxSpeed={maxBallSpeed} avgSpeed={avgBallSpeed} />
                </Box>
              )}

              {/* Swing Types Pie Chart */}
              {hasSwingData && (
                <Box style={{ flex: "1 1 280px", minWidth: 280, overflow: "visible" }}>
                  <Heading size="2" weight="medium" mb="2" style={{ color: "var(--gray-11)", textAlign: "center" }}>
                    Swing Types
                  </Heading>
                  <MatchSwingTypeChart data={swingTypeData} totalSwings={totalSwingCount} />
                </Box>
              )}
            </Flex>
          </>
        )}
      </Flex>
    </Card>
  );
}

// Simplified Speedometer for Match Summary
function MatchSpeedometer({ maxSpeed, avgSpeed }: { maxSpeed: number; avgSpeed: number }) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      const startTime = performance.now();
      const duration = 2000;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimationProgress(eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      setTimeout(() => requestAnimationFrame(animate), 150);
    }
  }, []);

  const displayMax = Math.round(maxSpeed * animationProgress);
  const displayAvg = Math.round(avgSpeed * animationProgress);

  const size = 180;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = 70;
  const startAngle = -140;
  const endAngle = 140;
  const angleRange = endAngle - startAngle;
  const maxValue = Math.max(150, Math.ceil(maxSpeed / 10) * 10 + 10);

  const animatedMax = animationProgress * maxSpeed;
  const animatedAvg = animationProgress * avgSpeed;
  const needleAngle = startAngle + (animatedMax / maxValue) * angleRange;
  const avgAngle = startAngle + (animatedAvg / maxValue) * angleRange;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const describeArc = (startAng: number, endAng: number, r: number) => {
    if (Math.abs(endAng - startAng) < 0.1) return "";
    const start = { x: cx + r * Math.cos(toRad(startAng - 90)), y: cy + r * Math.sin(toRad(startAng - 90)) };
    const end = { x: cx + r * Math.cos(toRad(endAng - 90)), y: cy + r * Math.sin(toRad(endAng - 90)) };
    const largeArcFlag = endAng - startAng <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  const ticks = [0, 30, 60, 90, 120, 150];
  const id = useRef(`match-speed-${Math.random().toString(36).substr(2, 9)}`);

  return (
    <Flex direction="column" align="center" gap="2">
      <Box style={{ position: "relative" }}>
        <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`}>
          <defs>
            <linearGradient id={`${id.current}-arcGradient`} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="25%" stopColor="#7ADB8F" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="65%" stopColor="#F97316" />
              <stop offset="85%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>
            <filter id={`${id.current}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background arc */}
          <path d={describeArc(startAngle, endAngle, radius)} fill="none" stroke="var(--gray-4)" strokeWidth="14" strokeLinecap="round" />
          <path d={describeArc(startAngle, endAngle, radius)} fill="none" stroke={`url(#${id.current}-arcGradient)`} strokeWidth="10" strokeLinecap="round" opacity={0.2} />

          {/* Progress arc */}
          {animatedMax > 0 && (
            <path d={describeArc(startAngle, needleAngle, radius)} fill="none" stroke={`url(#${id.current}-arcGradient)`} strokeWidth="10" strokeLinecap="round" filter={`url(#${id.current}-glow)`} />
          )}

          {/* Tick labels */}
          {ticks.map((tick) => {
            const tickAngle = startAngle + (tick / maxValue) * angleRange;
            const labelR = radius + 16;
            const labelX = cx + labelR * Math.cos(toRad(tickAngle - 90));
            const labelY = cy + labelR * Math.sin(toRad(tickAngle - 90));
            return (
              <text key={`label-${tick}`} x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fill="var(--gray-11)" fontSize="10" fontWeight="600">
                {tick}
              </text>
            );
          })}

          {/* Avg needle */}
          <g style={{ transform: `rotate(${avgAngle}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
            <polygon points={`${cx},${cy - 40} ${cx - 3},${cy} ${cx + 3},${cy}`} fill="#10B981" />
            <circle cx={cx} cy={cy} r="5" fill="#10B981" stroke="white" strokeWidth="1.5" />
          </g>

          {/* Max needle */}
          <g style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
            <polygon points={`${cx},${cy - 48} ${cx - 4},${cy} ${cx + 4},${cy}`} fill="#EF4444" />
            <circle cx={cx} cy={cy} r="7" fill="var(--gray-12)" stroke="var(--gray-8)" strokeWidth="2" />
            <circle cx={cx} cy={cy} r="3" fill="#EF4444" />
          </g>
        </svg>
      </Box>

      {/* Stats row */}
      <Flex justify="center" gap="4" align="center">
        <Flex align="center" gap="1">
          <svg width="10" height="10" viewBox="0 0 12 12">
            <polygon points="6,1 4.5,10 7.5,10" fill="#10B981" />
          </svg>
          <Text size="1" color="gray">
            Avg: <Text weight="bold" style={{ color: "var(--mint-11)" }}>{displayAvg} km/h</Text>
          </Text>
        </Flex>
        <Flex align="center" gap="1">
          <svg width="10" height="10" viewBox="0 0 12 12">
            <polygon points="6,0 4,10 8,10" fill="#EF4444" />
          </svg>
          <Text size="1" color="gray">
            Max: <Text weight="bold" style={{ color: "var(--orange-11)" }}>{displayMax} km/h</Text>
          </Text>
        </Flex>
      </Flex>
    </Flex>
  );
}

// Simplified Swing Type Chart for Match Summary
function MatchSwingTypeChart({ data, totalSwings }: { data: { id: string; label: string; value: number; color: string }[]; totalSwings: number }) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const hasStartedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasStartedRef.current && data.length > 0) {
      hasStartedRef.current = true;
      const startTime = performance.now();
      const duration = 1800;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimationProgress(eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      setTimeout(() => requestAnimationFrame(animate), 200);

      // Piano bounce effect
      setTimeout(() => {
        if (!containerRef.current) return;
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
      }, 100);
    }
  }, [data.length]);

  if (data.length === 0) return null;

  const animatedData = data.map((item) => ({
    ...item,
    displayValue: Math.round(item.value * animationProgress),
  }));

  const displaySwings = Math.round(totalSwings * animationProgress);

  return (
    <Flex direction="column" align="center" gap="2" style={{ overflow: "visible" }}>
      <Box ref={containerRef} style={{ height: 200, width: "100%", position: "relative", overflow: "visible" }}>
        <ResponsivePie
          data={animatedData}
          theme={sportaiTheme}
          margin={{ top: 20, right: 70, bottom: 20, left: 70 }}
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
          arcLabel={(d) => `${(d.data as typeof animatedData[0]).displayValue}%`}
          animate={true}
          motionConfig={{ mass: 1, tension: 140, friction: 20, clamp: false, precision: 0.01, velocity: 0 }}
          transitionMode="startAngle"
          valueFormat={(value) => `${value}%`}
          tooltip={({ datum }) => (
            <Box style={{ background: "var(--gray-2)", padding: "10px 14px", borderRadius: 10, border: `2px solid ${datum.color}`, boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
              <Flex align="center" gap="2">
                <Box style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: datum.color }} />
                <Text size="2" weight="bold">{datum.label}: {datum.value}%</Text>
              </Flex>
            </Box>
          )}
        />
        {/* Center text */}
        <Box style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
          <Text size="5" weight="bold" style={{ color: "var(--gray-12)", fontFamily: "var(--font-mono, monospace)", lineHeight: 1 }}>
            {displaySwings}
          </Text>
          <Text size="1" color="gray" style={{ display: "block" }}>shots</Text>
        </Box>
      </Box>
    </Flex>
  );
}

