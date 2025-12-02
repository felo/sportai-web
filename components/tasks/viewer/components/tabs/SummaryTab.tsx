"use client";

import { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import { Box, Grid, Flex, Heading, Text, Card, Separator } from "@radix-ui/themes";
import { ResponsivePie } from "@nivo/pie";
import { Task, StatisticsResult, BallBounce } from "../../types";
import { TaskStatusCard } from "../index";
import { formatSwingType } from "../../utils";
import { getSwingTypeColor, CHART_THEME } from "../../constants";
import { ProgressRing } from "../shared";
import type { ProgressRingGradient } from "../shared";

// Animation timing constants
const CARD_FADE_DURATION = 400; // ms per card fade-in
const CARD_STAGGER_DELAY = 80; // ms between each row
const TOTAL_ROWS = 5; // Quick stats row 1 & 2, Main cards rows 1-3

// Context to control when counting starts
const CountingContext = createContext(false);

// CSS keyframes for card fade-in from top
const cardFadeKeyframes = `
@keyframes cardFadeInFromTop {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

interface SummaryTabProps {
  task: Task;
  result: StatisticsResult | null;
  enhancedBallBounces: BallBounce[];
}

export function SummaryTab({
  task,
  result,
  enhancedBallBounces,
}: SummaryTabProps) {
  // Animation state - hooks must be called before any early returns
  const [cardsVisible, setCardsVisible] = useState(false);
  const [startCounting, setStartCounting] = useState(false);

  // Trigger card fade-in, then start counting after all cards visible
  useEffect(() => {
    if (!result) return; // Skip animation if no result
    
    // Start fade-in immediately
    const fadeTimer = setTimeout(() => setCardsVisible(true), 50);
    
    // Start counting after all cards have faded in
    const countTimer = setTimeout(() => {
      setStartCounting(true);
    }, 50 + (TOTAL_ROWS - 1) * CARD_STAGGER_DELAY + CARD_FADE_DURATION + 100);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(countTimer);
    };
  }, [result]);

  if (!result) {
    return (
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        <TaskStatusCard task={task} />
      </Box>
    );
  }

  const players = result.players || [];
  const rallies = result.rallies || [];
  const teamSessions = result.team_sessions || [];
  const filteredPlayers = players.filter((p) => p.swing_count >= 10);
  const totalSwings = filteredPlayers.reduce(
    (sum, p) => sum + p.swing_count,
    0
  );
  const bounceCount =
    enhancedBallBounces?.length ?? result.ball_bounces?.length ?? 0;

  // Calculate team count from team_sessions
  // Count unique team compositions with exactly 2 players (doubles format)
  const uniqueTeams = new Set<string>();
  teamSessions.forEach(session => {
    if (session.team_front?.length === 2) {
      // Sort player IDs to normalize team composition regardless of order
      uniqueTeams.add(JSON.stringify([...session.team_front].sort((a, b) => a - b)));
    }
    if (session.team_back?.length === 2) {
      uniqueTeams.add(JSON.stringify([...session.team_back].sort((a, b) => a - b)));
    }
  });
  const teamCount = uniqueTeams.size;

  // Calculate total time spent in rallies (Active Play)
  const totalRallyDuration = rallies.reduce((sum, [start, end]) => sum + (end - start), 0);

  // Calculate total distance covered by all players
  const totalDistanceCovered = filteredPlayers.reduce((sum, p) => sum + (p.covered_distance || 0), 0);
  
  // Calculate average distance per player
  const avgDistancePerPlayer = filteredPlayers.length > 0 
    ? totalDistanceCovered / filteredPlayers.length 
    : 0;

  // Calculate average rally duration
  const avgRallyDuration = rallies.length > 0 
    ? totalRallyDuration / rallies.length 
    : 0;

  // Calculate average shots per rally
  const avgShotsPerRally = rallies.length > 0 
    ? totalSwings / rallies.length 
    : 0;

  // Calculate rally intensity (shots per second of active play)
  const avgRallyIntensity = totalRallyDuration > 0 
    ? totalSwings / totalRallyDuration 
    : 0;

  // Calculate max rally intensity
  const maxRallyIntensity = rallies.reduce((max, [start, end]) => {
    const duration = end - start;
    if (duration <= 0) return max;
    // Count shots in this rally
    const shotsInRally = filteredPlayers.reduce((sum, p) => 
      sum + (p.swings?.filter(s => {
        const hitTime = s.ball_hit?.timestamp ?? s.start.timestamp;
        return hitTime >= start && hitTime <= end;
      }).length || 0), 0
    );
    const intensity = shotsInRally / duration;
    return Math.max(max, intensity);
  }, 0);

  // Calculate sprint statistics
  const allSprints = filteredPlayers.map(p => p.fastest_sprint || 0).filter(s => s > 0);
  const maxSprintSpeed = allSprints.length > 0 ? Math.max(...allSprints) : 0;
  const avgSprintSpeed = allSprints.length > 0 
    ? allSprints.reduce((a, b) => a + b, 0) / allSprints.length 
    : 0;

  // Aggregate swing type distribution
  const aggregatedSwingTypes: Record<string, number> = {};
  let totalSwingCount = 0;
  filteredPlayers.forEach((player) => {
    if (player.swings) {
      player.swings.forEach((swing) => {
        const type = swing.swing_type || "unknown";
        aggregatedSwingTypes[type] = (aggregatedSwingTypes[type] || 0) + 1;
        totalSwingCount++;
      });
    }
  });

  const swingTypeData = Object.entries(aggregatedSwingTypes)
    .filter(([, count]) => count > 0)
    .map(([type, count], index) => ({
      id: type,
      label: formatSwingType(type),
      value: Math.round((count / totalSwingCount) * 100),
      count,
      color: getSwingTypeColor(type, index),
    }))
    .sort((a, b) => b.value - a.value);

  // Aggregate ball speed data
  const allSpeeds = filteredPlayers
    .flatMap((p) => p.swings?.map((s) => s.ball_speed) || [])
    .filter((s) => s > 0);
  const maxBallSpeed = allSpeeds.length > 0 ? Math.max(...allSpeeds) : 0;
  const avgBallSpeed =
    allSpeeds.length > 0
      ? allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length
      : 0;

  // Count serves and volleys
  const serveCount = filteredPlayers.reduce((sum, p) => 
    sum + (p.swings?.filter(s => s.serve).length || 0), 0
  );
  const volleyCount = filteredPlayers.reduce((sum, p) => 
    sum + (p.swings?.filter(s => s.volley).length || 0), 0
  );

  // Calculate serve speeds
  const serveSpeeds = filteredPlayers
    .flatMap(p => p.swings?.filter(s => s.serve).map(s => s.ball_speed) || [])
    .filter(s => s > 0);
  const maxServeSpeed = serveSpeeds.length > 0 ? Math.max(...serveSpeeds) : 0;
  const avgServeSpeed = serveSpeeds.length > 0 
    ? serveSpeeds.reduce((a, b) => a + b, 0) / serveSpeeds.length 
    : 0;

  // Calculate volley speeds
  const volleySpeeds = filteredPlayers
    .flatMap(p => p.swings?.filter(s => s.volley).map(s => s.ball_speed) || [])
    .filter(s => s > 0);
  const maxVolleySpeed = volleySpeeds.length > 0 ? Math.max(...volleySpeeds) : 0;
  const avgVolleySpeed = volleySpeeds.length > 0 
    ? volleySpeeds.reduce((a, b) => a + b, 0) / volleySpeeds.length 
    : 0;

  // Calculate ground stroke speeds (not serve and not volley)
  const groundStrokeSpeeds = filteredPlayers
    .flatMap(p => p.swings?.filter(s => !s.serve && !s.volley).map(s => s.ball_speed) || [])
    .filter(s => s > 0);
  const maxGroundStrokeSpeed = groundStrokeSpeeds.length > 0 ? Math.max(...groundStrokeSpeeds) : 0;
  const avgGroundStrokeSpeed = groundStrokeSpeeds.length > 0 
    ? groundStrokeSpeeds.reduce((a, b) => a + b, 0) / groundStrokeSpeeds.length 
    : 0;
  const groundStrokeCount = totalSwingCount - serveCount - volleyCount;

  const hasSwingData = swingTypeData.length > 0;
  const hasSpeedData = allSpeeds.length > 0;
  const hasSprintData = allSprints.length > 0;

  // Categorize bounces
  const bounceCounts = {
    floor: 0,
    wall: 0,
    swing: 0,
    other: 0,
  };

  enhancedBallBounces.forEach((bounce) => {
    if (bounce.type === "swing" || bounce.type === "inferred_swing") {
      bounceCounts.swing++;
    } else if (
      bounce.type === "inferred_wall" ||
      bounce.type === "inferred_back"
    ) {
      bounceCounts.wall++;
    } else if (bounce.type === "inferred" || bounce.type === "floor") {
      bounceCounts.floor++;
    } else {
      bounceCounts.other++;
    }
  });

  // Helper to get animation style for each row
  // Cards start hidden and only appear through the animation
  const getRowAnimation = (rowIndex: number) => ({
    opacity: 0,
    transform: "translateY(-20px)",
    animation: cardsVisible 
      ? `cardFadeInFromTop ${CARD_FADE_DURATION}ms ease-out ${rowIndex * CARD_STAGGER_DELAY}ms forwards`
      : "none",
  });

  return (
    <CountingContext.Provider value={startCounting}>
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        {/* Inject keyframes */}
        <style dangerouslySetInnerHTML={{ __html: cardFadeKeyframes }} />
        
        {/* Quick Stats Row 1 */}
        <Grid 
          columns={{ initial: "2", sm: "3", md: "6" }} 
          gap="3" 
          mb="4"
          style={getRowAnimation(0)}
        >
          <QuickStatCard label="Teams" value={teamCount} />
          <QuickStatCard label="Rallies" value={rallies.length} />
          <QuickStatCard label="Total Swings" value={totalSwings} />
          <QuickStatCard
            label="Distance Covered"
            value={totalDistanceCovered}
            formatValue={(v) => v > 0 ? `${(v / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km` : "-"}
          />
          <QuickStatCard
            label="Active Play"
            value={totalRallyDuration}
            formatValue={(v) => v > 0 ? formatDuration(v) : "-"}
          />
          <QuickStatCard
            label="Avg. Distance"
            value={avgDistancePerPlayer}
            formatValue={(v) => v > 0 ? `${Math.round(v)} m` : "-"}
          />
        </Grid>

        {/* Quick Stats Row 2 - Rally Stats */}
        <Grid 
          columns={{ initial: "2", sm: "4" }} 
          gap="3" 
          mb="4"
          style={getRowAnimation(1)}
        >
          <QuickStatCard
            label="Avg. Rally Length"
            value={avgRallyDuration}
            formatValue={(v) => v > 0 ? `${v.toFixed(1)}s` : "-"}
          />
          <QuickStatCard
            label="Avg. Shots/Rally"
            value={avgShotsPerRally}
            formatValue={(v) => v > 0 ? v.toFixed(1) : "-"}
          />
          <QuickStatCard
            label="Rally Intensity (Avg)"
            value={avgRallyIntensity}
            formatValue={(v) => v > 0 ? `${v.toFixed(2)} shots/s` : "-"}
          />
          <QuickStatCard
            label="Rally Intensity (Max)"
            value={maxRallyIntensity}
            formatValue={(v) => v > 0 ? `${v.toFixed(2)} shots/s` : "-"}
          />
        </Grid>

        {/* Main Cards Grid - Row 1: Speeds & Serves */}
        <Grid columns={{ initial: "1", md: "3" }} gap="4" mb="4" style={getRowAnimation(2)}>
          {/* Shot Power Card */}
          <Card style={{ border: "1px solid var(--gray-5)" }}>
            <Flex direction="column" gap="3" p="4">
              <Heading size="3" weight="medium">
                Overall Shot Power
              </Heading>
              {hasSpeedData ? (
                <SpeedometerDisplay
                  maxSpeed={maxBallSpeed}
                  avgSpeed={avgBallSpeed}
                  label="Shot"
                  unit="km/h"
                />
              ) : (
                <EmptyState message="No speed data available" />
              )}
            </Flex>
          </Card>

          {/* Sprint Speed Card */}
          <Card style={{ border: "1px solid var(--gray-5)" }}>
            <Flex direction="column" gap="3" p="4">
              <Heading size="3" weight="medium">
                Overall Sprint Speed
              </Heading>
              {hasSprintData ? (
                <SpeedometerDisplay
                  maxSpeed={maxSprintSpeed}
                  avgSpeed={avgSprintSpeed}
                  label="Sprint"
                  unit="km/h"
                  colorScheme="sprint"
                />
              ) : (
                <EmptyState message="No sprint data available" />
              )}
            </Flex>
          </Card>

          {/* Serves & Volleys Card */}
          <Card style={{ border: "1px solid var(--gray-5)" }}>
            <Flex direction="column" gap="3" p="4">
              <Heading size="3" weight="medium">
                Serves & Volleys
              </Heading>
              <ServesVolleysDisplay
                serveCount={serveCount}
                volleyCount={volleyCount}
                groundStrokeCount={groundStrokeCount}
                totalSwings={totalSwingCount}
                avgServeSpeed={avgServeSpeed}
                maxServeSpeed={maxServeSpeed}
                avgVolleySpeed={avgVolleySpeed}
                maxVolleySpeed={maxVolleySpeed}
                avgGroundStrokeSpeed={avgGroundStrokeSpeed}
                maxGroundStrokeSpeed={maxGroundStrokeSpeed}
              />
            </Flex>
          </Card>
        </Grid>

        {/* Main Cards Grid - Row 2 */}
        <Grid columns={{ initial: "1", md: "3" }} gap="4" mb="4" style={getRowAnimation(3)}>
          {/* Swing Types Card */}
          <Card style={{ border: "1px solid var(--gray-5)" }}>
            <Flex direction="column" gap="3" p="4">
              <Heading size="3" weight="medium">
                Swing Types
              </Heading>
              {hasSwingData ? (
                <SwingTypesChart data={swingTypeData} totalSwings={totalSwingCount} />
              ) : (
                <EmptyState message="No swing data available" />
              )}
            </Flex>
          </Card>

          {/* Bounces Card */}
          <Card style={{ border: "1px solid var(--gray-5)" }}>
            <Flex direction="column" gap="3" p="4">
              <Heading size="3" weight="medium">
                Ball Bounces
              </Heading>
              <ExcitingBouncesDisplay
                total={bounceCount}
                floor={bounceCounts.floor}
                wall={bounceCounts.wall}
                swing={bounceCounts.swing}
                other={bounceCounts.other}
              />
            </Flex>
          </Card>

          {/* Confidence Card */}
          {result.confidences ? (
            <ConfidenceDisplay confidences={result.confidences.final_confidences} />
          ) : (
            <Card style={{ border: "1px solid var(--gray-5)" }}>
              <Flex direction="column" gap="3" p="4">
                <Heading size="3" weight="medium">
                  AI Detection Confidence
                </Heading>
                <EmptyState message="No confidence data available" />
              </Flex>
            </Card>
          )}
        </Grid>
      </Box>
    </CountingContext.Provider>
  );
}

// Empty state component
function EmptyState({ message }: { message: string }) {
  return (
    <Flex
      align="center"
      justify="center"
      style={{ height: 200, color: "var(--gray-9)" }}
    >
      <Text size="2">{message}</Text>
    </Flex>
  );
}

// Quick stat card with optional subtitle
function QuickStatCard({
  label,
  value,
  formatValue,
  subtitle,
}: {
  label: string;
  value: number;
  formatValue?: (value: number) => string;
  subtitle?: string;
}) {
  return (
    <Card style={{ border: "1px solid var(--gray-5)" }}>
      <Flex direction="column" gap="1" p="3" align="center">
        <Text size="1" color="gray">
          {label}
        </Text>
        <Text
          size="5"
          weight="bold"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <AnimatedNumber value={value} formatValue={formatValue} />
        </Text>
        {subtitle && (
          <Text size="1" color="gray" style={{ opacity: 0.7 }}>
            {subtitle}
          </Text>
        )}
      </Flex>
    </Card>
  );
}

// Animated number component
function AnimatedNumber({ 
  value, 
  formatValue 
}: { 
  value: number;
  formatValue?: (value: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const hasStartedRef = useRef(false);
  const startCounting = useContext(CountingContext);

  useEffect(() => {
    // Only start counting when context says so
    if (startCounting && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const startTime = performance.now();
      const duration = 1200;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(value * eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value, startCounting]);

  if (formatValue) {
    return <>{formatValue(display)}</>;
  }
  return <>{Math.round(display)}</>;
}

// Format duration in mm:ss
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Reusable Speedometer Component for both Shot Power and Sprint Speed
function SpeedometerDisplay({
  maxSpeed,
  avgSpeed,
  label,
  unit,
  colorScheme = "shot",
}: {
  maxSpeed: number;
  avgSpeed: number;
  label: string;
  unit: string;
  colorScheme?: "shot" | "sprint";
}) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const hasStartedRef = useRef(false);
  const id = useRef(`speed-${Math.random().toString(36).substr(2, 9)}`);
  const startCounting = useContext(CountingContext);

  useEffect(() => {
    if (startCounting && !hasStartedRef.current) {
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

      requestAnimationFrame(animate);
    }
  }, [startCounting]);

  const displayMax = Math.round(maxSpeed * animationProgress);
  const displayAvg = Math.round(avgSpeed * animationProgress);

  const size = 200;
  const cx = size / 2;
  const cy = size / 2 + 15;
  const radius = 75;
  const startAngle = -140;
  const endAngle = 140;
  const angleRange = endAngle - startAngle;
  
  // Different max values for shot vs sprint
  // Sprint speed is capped at 30 km/h (typical max for racket sports)
  const maxValue = colorScheme === "sprint" 
    ? 30
    : Math.max(150, Math.ceil(maxSpeed / 10) * 10 + 10);

  const animatedMax = animationProgress * maxSpeed;
  const animatedAvg = animationProgress * avgSpeed;
  const needleAngle = startAngle + (animatedMax / maxValue) * angleRange;
  const avgAngle = startAngle + (animatedAvg / maxValue) * angleRange;

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

  // Different tick marks for sprint vs shot
  const ticks = colorScheme === "sprint" 
    ? [0, 10, 20, 30]
    : [0, 30, 60, 90, 120, 150];

  // Unified average needle color (blue)
  const avgColor = "#3B82F6";
  const avgColorVar = "var(--blue-11)";

  return (
    <Flex direction="column" align="center" gap="2">
      <Box style={{ position: "relative" }}>
        <svg
          width={size}
          height={size * 0.65}
          viewBox={`0 0 ${size} ${size * 0.65}`}
        >
          <defs>
            <linearGradient
              id={`${id.current}-arcGradient`}
              x1="0%"
              y1="50%"
              x2="100%"
              y2="50%"
            >
              {/* Unified color gradient: blue → light blue → amber → orange → red */}
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="25%" stopColor="#60A5FA" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="65%" stopColor="#F97316" />
              <stop offset="85%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>
            <filter
              id={`${id.current}-glow`}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background arc */}
          <path
            d={describeArc(startAngle, endAngle, radius)}
            fill="none"
            stroke="var(--gray-4)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d={describeArc(startAngle, endAngle, radius)}
            fill="none"
            stroke={`url(#${id.current}-arcGradient)`}
            strokeWidth="10"
            strokeLinecap="round"
            opacity={0.2}
          />

          {/* Progress arc */}
          {animatedMax > 0 && (
            <path
              d={describeArc(startAngle, needleAngle, radius)}
              fill="none"
              stroke={`url(#${id.current}-arcGradient)`}
              strokeWidth="10"
              strokeLinecap="round"
              filter={`url(#${id.current}-glow)`}
            />
          )}

          {/* Tick labels */}
          {ticks.map((tick) => {
            const tickAngle = startAngle + (tick / maxValue) * angleRange;
            const labelR = radius + 18;
            const labelX = cx + labelR * Math.cos(toRad(tickAngle - 90));
            const labelY = cy + labelR * Math.sin(toRad(tickAngle - 90));
            return (
              <text
                key={`label-${tick}`}
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--gray-11)"
                fontSize="10"
                fontWeight="600"
              >
                {tick}
              </text>
            );
          })}

          {/* Avg needle */}
          <g
            style={{
              transform: `rotate(${avgAngle}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
            }}
          >
            <polygon
              points={`${cx},${cy - 42} ${cx - 3},${cy} ${cx + 3},${cy}`}
              fill={avgColor}
            />
            <circle
              cx={cx}
              cy={cy}
              r="5"
              fill={avgColor}
              stroke="white"
              strokeWidth="1.5"
            />
          </g>

          {/* Max needle */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
            }}
          >
            <polygon
              points={`${cx},${cy - 50} ${cx - 4},${cy} ${cx + 4},${cy}`}
              fill="#EF4444"
            />
            <circle
              cx={cx}
              cy={cy}
              r="7"
              fill="var(--gray-12)"
              stroke="var(--gray-8)"
              strokeWidth="2"
            />
            <circle cx={cx} cy={cy} r="3" fill="#EF4444" />
          </g>
        </svg>
      </Box>

      {/* Stats */}
      <Flex justify="center" gap="6" align="stretch" style={{ width: "100%" }}>
        <Flex 
          direction="column" 
          align="center" 
          gap="1"
          style={{ 
            flex: 1,
            padding: "12px",
            background: "var(--gray-a2)",
            borderRadius: "var(--radius-3)",
          }}
        >
          <Flex align="center" gap="2">
            <Box
              style={{
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderBottom: `10px solid ${avgColor}`,
              }}
            />
            <Text size="1" color="gray" weight="medium" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Average
            </Text>
          </Flex>
          <Flex align="baseline" gap="1">
            <Text
              weight="bold"
              style={{ 
                color: avgColorVar, 
                fontSize: 32,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              {displayAvg}
            </Text>
            <Text size="2" color="gray">{unit}</Text>
          </Flex>
        </Flex>
        <Flex 
          direction="column" 
          align="center" 
          gap="1"
          style={{ 
            flex: 1,
            padding: "12px",
            background: "var(--gray-a2)",
            borderRadius: "var(--radius-3)",
          }}
        >
          <Flex align="center" gap="2">
            <Box
              style={{
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderBottom: "10px solid var(--red-9)",
              }}
            />
            <Text size="1" color="gray" weight="medium" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Maximum
            </Text>
          </Flex>
          <Flex align="baseline" gap="1">
            <Text
              weight="bold"
              style={{ 
                color: "var(--orange-11)", 
                fontSize: 32,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              {displayMax}
            </Text>
            <Text size="2" color="gray">{unit}</Text>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}

// Serves & Volleys Display Component
function ServesVolleysDisplay({
  serveCount,
  volleyCount,
  groundStrokeCount,
  totalSwings,
  avgServeSpeed,
  maxServeSpeed,
  avgVolleySpeed,
  maxVolleySpeed,
  avgGroundStrokeSpeed,
  maxGroundStrokeSpeed,
}: {
  serveCount: number;
  volleyCount: number;
  groundStrokeCount: number;
  totalSwings: number;
  avgServeSpeed: number;
  maxServeSpeed: number;
  avgVolleySpeed: number;
  maxVolleySpeed: number;
  avgGroundStrokeSpeed: number;
  maxGroundStrokeSpeed: number;
}) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const hasStartedRef = useRef(false);
  const startCounting = useContext(CountingContext);

  useEffect(() => {
    if (startCounting && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const startTime = performance.now();
      const duration = 1500;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimationProgress(eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [startCounting]);

  const displayServes = Math.round(serveCount * animationProgress);
  const displayVolleys = Math.round(volleyCount * animationProgress);
  const servePercentage = totalSwings > 0 ? (serveCount / totalSwings) * 100 : 0;
  const volleyPercentage = totalSwings > 0 ? (volleyCount / totalSwings) * 100 : 0;
  const groundStrokePercentage = totalSwings > 0 ? (groundStrokeCount / totalSwings) * 100 : 0;

  return (
    <Flex direction="column" gap="4" style={{ paddingTop: 8 }}>
      {/* Serves */}
      <Flex direction="column" gap="2">
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <Text style={{ fontSize: 20 }}>🎾</Text>
            <Text size="2" weight="medium">Serves</Text>
          </Flex>
          <Text size="4" weight="bold" style={{ color: "var(--purple-11)", fontVariantNumeric: "tabular-nums" }}>
            {displayServes}
          </Text>
        </Flex>
        <Flex justify="between">
          <Text size="1" color="gray">{Math.round(servePercentage)}% of swings</Text>
          {avgServeSpeed > 0 && (
            <Text size="1" color="gray">
              Avg: {Math.round(avgServeSpeed * animationProgress)} km/h
              {maxServeSpeed > 0 && ` • Max: ${Math.round(maxServeSpeed * animationProgress)} km/h`}
            </Text>
          )}
        </Flex>
      </Flex>

      <Separator size="4" style={{ opacity: 0.3 }} />

      {/* Volleys */}
      <Flex direction="column" gap="2">
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <Text style={{ fontSize: 20 }}>🏐</Text>
            <Text size="2" weight="medium">Volleys</Text>
          </Flex>
          <Text size="4" weight="bold" style={{ color: "var(--orange-11)", fontVariantNumeric: "tabular-nums" }}>
            {displayVolleys}
          </Text>
        </Flex>
        <Flex justify="between">
          <Text size="1" color="gray">{Math.round(volleyPercentage)}% of swings</Text>
          {avgVolleySpeed > 0 && (
            <Text size="1" color="gray">
              Avg: {Math.round(avgVolleySpeed * animationProgress)} km/h
              {maxVolleySpeed > 0 && ` • Max: ${Math.round(maxVolleySpeed * animationProgress)} km/h`}
            </Text>
          )}
        </Flex>
      </Flex>

      <Separator size="4" style={{ opacity: 0.3 }} />

      {/* Ground Strokes */}
      <Flex direction="column" gap="2">
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <Text style={{ fontSize: 20 }}>🎯</Text>
            <Text size="2" weight="medium">Ground Strokes</Text>
          </Flex>
          <Text size="4" weight="bold" style={{ color: "var(--mint-11)", fontVariantNumeric: "tabular-nums" }}>
            {Math.round(groundStrokeCount * animationProgress)}
          </Text>
        </Flex>
        <Flex justify="between">
          <Text size="1" color="gray">{Math.round(groundStrokePercentage)}% of swings</Text>
          {avgGroundStrokeSpeed > 0 && (
            <Text size="1" color="gray">
              Avg: {Math.round(avgGroundStrokeSpeed * animationProgress)} km/h
              {maxGroundStrokeSpeed > 0 && ` • Max: ${Math.round(maxGroundStrokeSpeed * animationProgress)} km/h`}
            </Text>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
}

// Swing Types Chart
function SwingTypesChart({
  data,
  totalSwings,
}: {
  data: { id: string; label: string; value: number; count: number; color: string }[];
  totalSwings: number;
}) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const hasStartedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startCounting = useContext(CountingContext);

  useEffect(() => {
    if (startCounting && !hasStartedRef.current && data.length > 0) {
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

      requestAnimationFrame(animate);

      // Piano bounce effect
      setTimeout(() => {
        if (!containerRef.current) return;
        const paths = containerRef.current.querySelectorAll(
          'path[fill]:not([fill="none"])'
        );
        const pathsArray = Array.from(paths) as HTMLElement[];
        pathsArray.forEach((path, index) => {
          setTimeout(() => {
            path.style.filter = "drop-shadow(0 0 20px var(--purple-a9))";
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
  }, [data.length, startCounting]);

  if (data.length === 0) return null;

  const animatedData = data.map((item) => ({
    ...item,
    displayValue: Math.round(item.value * animationProgress),
  }));

  const displaySwings = Math.round(totalSwings * animationProgress);

  return (
    <Flex
      direction="column"
      align="center"
      gap="2"
      style={{ overflow: "visible" }}
    >
      <Box
        ref={containerRef}
        style={{
          height: 220,
          width: "100%",
          position: "relative",
          overflow: "visible",
        }}
      >
        <ResponsivePie
          data={animatedData}
          theme={CHART_THEME}
          margin={{ top: 25, right: 80, bottom: 25, left: 80 }}
          innerRadius={0.55}
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
          arcLabel={(d) =>
            `${(d.data as (typeof animatedData)[0]).displayValue}%`
          }
          animate={true}
          motionConfig={{
            mass: 1,
            tension: 140,
            friction: 20,
            clamp: false,
            precision: 0.01,
            velocity: 0,
          }}
          transitionMode="startAngle"
          valueFormat={(value) => `${value}%`}
          tooltip={({ datum }) => (
            <Box
              style={{
                background: "var(--gray-2)",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-3)",
                border: `2px solid ${datum.color}`,
                boxShadow: "0 4px 20px var(--black-a6)",
              }}
            >
              <Flex align="center" gap="2">
                <Box
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "var(--radius-2)",
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
        {/* Center text */}
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

// Exciting Bounces Display
function ExcitingBouncesDisplay({
  total,
  floor,
  wall,
  swing,
  other,
}: {
  total: number;
  floor: number;
  wall: number;
  swing: number;
  other: number;
}) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showParticles, setShowParticles] = useState(false);
  const hasStartedRef = useRef(false);
  const startCounting = useContext(CountingContext);

  useEffect(() => {
    if (startCounting && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const startTime = performance.now();
      const duration = 1500;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Bounce easing
        const eased =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        setAnimationProgress(eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setShowParticles(true);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [startCounting]);

  const displayTotal = Math.round(total * animationProgress);

  return (
    <Flex direction="column" align="center" gap="4" style={{ paddingTop: 8 }}>
      {/* Big bouncing number */}
      <Box style={{ position: "relative" }}>
        <Text
          style={{
            fontSize: 72,
            fontWeight: 800,
            background: "linear-gradient(135deg, var(--mint-9) 0%, var(--cyan-9) 50%, var(--purple-9) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "var(--font-mono, monospace)",
            lineHeight: 1,
            filter: showParticles ? "drop-shadow(0 0 40px var(--mint-a5))" : "none",
            transform: showParticles ? "scale(1)" : `scale(${0.8 + animationProgress * 0.2})`,
            transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {displayTotal}
        </Text>
        {/* Particle effects */}
        {showParticles && (
          <>
            <BounceParticle delay={0} x={-30} y={-20} />
            <BounceParticle delay={100} x={30} y={-25} />
            <BounceParticle delay={200} x={-25} y={15} />
            <BounceParticle delay={300} x={35} y={10} />
          </>
        )}
      </Box>
      
      <Text size="2" color="gray" weight="medium" style={{ textTransform: "uppercase", letterSpacing: 1 }}>
        Total Bounces Detected
      </Text>

      {/* Bounce breakdown */}
      <Separator size="4" style={{ opacity: 0.3 }} />
      
      <Grid columns="2" gap="3" width="100%">
        <BounceTypeStat
          label="Floor Bounces"
          value={Math.round(floor * animationProgress)}
          icon="🎾"
          color="mint"
        />
        <BounceTypeStat
          label="Glass Bounces"
          value={Math.round(wall * animationProgress)}
          icon="🪟"
          color="orange"
        />
        <BounceTypeStat
          label="Shot Contacts"
          value={Math.round(swing * animationProgress)}
          icon="🏓"
          color="purple"
        />
        <BounceTypeStat
          label="Other"
          value={Math.round(other * animationProgress)}
          icon="✨"
          color="cyan"
        />
      </Grid>
    </Flex>
  );
}

// Bounce type stat
function BounceTypeStat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: "mint" | "orange" | "purple" | "cyan";
}) {
  return (
    <Flex align="center" gap="2" style={{ padding: "var(--space-2) var(--space-3)", background: "var(--gray-a3)", borderRadius: "var(--radius-2)" }}>
      <Text style={{ fontSize: 16 }}>{icon}</Text>
      <Flex direction="column" gap="0">
        <Text size="1" color="gray">{label}</Text>
        <Text size="3" weight="bold" style={{ color: `var(--${color}-11)`, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </Text>
      </Flex>
    </Flex>
  );
}

// Particle effect component
function BounceParticle({ delay, x, y }: { delay: number; x: number; y: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  return (
    <Box
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "linear-gradient(135deg, var(--mint-9), var(--cyan-9))",
        animation: "bounceParticle 0.8s ease-out forwards",
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
        opacity: 0,
      }}
    />
  );
}

// Confidence gradient
const CONFIDENCE_GRADIENT: ProgressRingGradient = {
  stops: [
    { offset: "0%", color: "#10B981" },
    { offset: "33%", color: "#84CC16" },
    { offset: "66%", color: "#F59E0B" },
    { offset: "100%", color: "#EF4444" },
  ],
};

function getConfidenceGradient(): ProgressRingGradient {
  return CONFIDENCE_GRADIENT;
}

// Fun messages about AI improvement - randomly selected per render
const AI_IMPROVEMENT_MESSAGES = [
  "SportAI gets smarter with every match – like a coach who never sleeps ☕",
  "Still in training! SportAI watches more matches than your most dedicated fan 📺",
  "These scores improve with every rally. SportAI never skips training day 💪",
  "SportAI is doing its homework on every match – rain or shine, no rest days 🤖",
  "Like a rookie turning pro, SportAI learns something new from every game 🎾",
  "Work in progress – SportAI is grinding harder than a baseline warrior 🏃",
];

function AIImprovementMessage() {
  const [isVisible, setIsVisible] = useState(false);
  
  // Use useMemo to keep the same message during component lifecycle
  const message = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * AI_IMPROVEMENT_MESSAGES.length);
    return AI_IMPROVEMENT_MESSAGES[randomIndex];
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Text 
      size="1" 
      color="gray" 
      style={{ 
        textAlign: "center", 
        fontStyle: "italic", 
        marginTop: 8,
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.6s ease-in-out",
      }}
    >
      {message}
    </Text>
  );
}

// Confidence display using ProgressRing
function ConfidenceDisplay({
  confidences,
}: {
  confidences: { pose: number; swing: number; ball: number; final: number };
}) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <Card ref={containerRef} style={{ border: "1px solid var(--gray-5)" }}>
      <Flex direction="column" gap="3" p="4">
        <Heading size="3" weight="medium">AI Detection Confidence</Heading>
        <Grid columns="2" gap="2" style={{ justifyItems: "center" }}>
          <ProgressRing
            value={Math.round(confidences.pose * 100)}
            maxValue={100}
            isVisible={isVisible}
            playerId={1}
            gradient={getConfidenceGradient()}
            icon="🧍"
            unit="Pose"
            size={100}
            strokeWidth={8}
            hideMedalDisplay
          />
          <ProgressRing
            value={Math.round(confidences.swing * 100)}
            maxValue={100}
            isVisible={isVisible}
            playerId={2}
            gradient={getConfidenceGradient()}
            icon="🏓"
            unit="Swing"
            size={100}
            strokeWidth={8}
            hideMedalDisplay
          />
          <ProgressRing
            value={Math.round(confidences.ball * 100)}
            maxValue={100}
            isVisible={isVisible}
            playerId={3}
            gradient={getConfidenceGradient()}
            icon="🎾"
            unit="Ball"
            size={100}
            strokeWidth={8}
            hideMedalDisplay
          />
          <ProgressRing
            value={Math.round(confidences.final * 100)}
            maxValue={100}
            isVisible={isVisible}
            playerId={4}
            gradient={getConfidenceGradient()}
            icon="🤖"
            unit="Overall"
            size={100}
            strokeWidth={8}
            hideMedalDisplay
          />
        </Grid>
        <AIImprovementMessage />
      </Flex>
    </Card>
  );
}
