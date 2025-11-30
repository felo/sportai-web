"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Grid, Flex, Heading, Text, Card, Separator } from "@radix-ui/themes";
import { ResponsivePie } from "@nivo/pie";
import { Task, StatisticsResult, BallBounce } from "../../types";
import { TaskStatusCard } from "../index";
import { formatSwingType } from "../../utils";
import { getSwingTypeColor, CHART_THEME } from "../../constants";
import { useAnimatedProgress } from "../../hooks";
import { Confetti } from "../shared";

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
  if (!result) {
    return (
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        <TaskStatusCard task={task} />
      </Box>
    );
  }

  const players = result.players || [];
  const rallies = result.rallies || [];
  const filteredPlayers = players.filter((p) => p.swing_count >= 10);
  const totalSwings = filteredPlayers.reduce(
    (sum, p) => sum + p.swing_count,
    0
  );
  const bounceCount =
    enhancedBallBounces?.length ?? result.ball_bounces?.length ?? 0;

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

  const hasSwingData = swingTypeData.length > 0;
  const hasSpeedData = allSpeeds.length > 0;

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

  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      {/* Quick Stats Row */}
      <Grid columns={{ initial: "2", sm: "4" }} gap="3" mb="4">
        <QuickStatCard
          label="Players"
          value={filteredPlayers.length}
          color="mint"
        />
        <QuickStatCard label="Rallies" value={rallies.length} color="blue" />
        <QuickStatCard
          label="Total Swings"
          value={totalSwings}
          color="purple"
        />
        <QuickStatCard
          label="Match Duration"
          value={task.video_length ? formatDuration(task.video_length) : "-"}
          color="orange"
          isText
        />
      </Grid>

      {/* Main Cards Grid */}
      <Grid columns={{ initial: "1", md: "3" }} gap="4">
        {/* Shot Power Card */}
        <Card
          style={{
            border: "1px solid var(--orange-6)",
            background:
              "linear-gradient(135deg, var(--orange-2) 0%, var(--gray-1) 100%)",
          }}
        >
          <Flex direction="column" gap="3" p="4">
            <Flex align="center" gap="2">
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, var(--orange-9) 0%, var(--red-9) 100%)",
                  boxShadow: "0 0 8px var(--orange-a6)",
                }}
              />
              <Heading size="3" weight="medium">
                Overall Shot Power
              </Heading>
            </Flex>
            {hasSpeedData ? (
              <ShotPowerSpeedometer
                maxSpeed={maxBallSpeed}
                avgSpeed={avgBallSpeed}
              />
            ) : (
              <Flex
                align="center"
                justify="center"
                style={{ height: 200, color: "var(--gray-9)" }}
              >
                <Text size="2">No speed data available</Text>
              </Flex>
            )}
          </Flex>
        </Card>

        {/* Swing Types Card */}
        <Card
          style={{
            border: "1px solid var(--purple-6)",
            background:
              "linear-gradient(135deg, var(--purple-2) 0%, var(--gray-1) 100%)",
          }}
        >
          <Flex direction="column" gap="3" p="4">
            <Flex align="center" gap="2">
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, var(--purple-9) 0%, var(--pink-9) 100%)",
                  boxShadow: "0 0 8px var(--purple-a6)",
                }}
              />
              <Heading size="3" weight="medium">
                Swing Types
              </Heading>
            </Flex>
            {hasSwingData ? (
              <SwingTypesChart data={swingTypeData} totalSwings={totalSwingCount} />
            ) : (
              <Flex
                align="center"
                justify="center"
                style={{ height: 200, color: "var(--gray-9)" }}
              >
                <Text size="2">No swing data available</Text>
              </Flex>
            )}
          </Flex>
        </Card>

        {/* Bounces Card - Exciting! */}
        <Card
          style={{
            border: "1px solid var(--mint-6)",
            background:
              "linear-gradient(135deg, var(--mint-2) 0%, var(--gray-1) 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Flex direction="column" gap="3" p="4">
            <Flex align="center" gap="2">
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, var(--mint-9) 0%, var(--cyan-9) 100%)",
                  boxShadow: "0 0 8px var(--mint-a6)",
                }}
              />
              <Heading size="3" weight="medium">
                Ball Bounces
              </Heading>
            </Flex>
            <ExcitingBouncesDisplay
              total={bounceCount}
              floor={bounceCounts.floor}
              wall={bounceCounts.wall}
              swing={bounceCounts.swing}
              other={bounceCounts.other}
            />
          </Flex>
        </Card>
      </Grid>

      {/* Confidence Card (if available) */}
      {result.confidences && (
        <Box mt="4">
          <ConfidenceDisplay confidences={result.confidences.final_confidences} />
        </Box>
      )}
    </Box>
  );
}

// Quick stat card
function QuickStatCard({
  label,
  value,
  color,
  isText,
}: {
  label: string;
  value: number | string;
  color: "mint" | "blue" | "purple" | "orange";
  isText?: boolean;
}) {
  return (
    <Card style={{ border: `1px solid var(--${color}-5)` }}>
      <Flex direction="column" gap="1" p="3" align="center">
        <Text size="1" color="gray">
          {label}
        </Text>
        <Text
          size="5"
          weight="bold"
          style={{ color: `var(--${color}-11)`, fontVariantNumeric: "tabular-nums" }}
        >
          {isText ? value : <AnimatedNumber value={value as number} />}
        </Text>
      </Flex>
    </Card>
  );
}

// Animated number component
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      const startTime = performance.now();
      const duration = 1200;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(value * eased));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      setTimeout(() => requestAnimationFrame(animate), 100);
    }
  }, [value]);

  return <>{display}</>;
}

// Format duration in mm:ss
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Shot Power Speedometer
function ShotPowerSpeedometer({
  maxSpeed,
  avgSpeed,
}: {
  maxSpeed: number;
  avgSpeed: number;
}) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const hasStartedRef = useRef(false);
  const id = useRef(`speed-${Math.random().toString(36).substr(2, 9)}`);

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

  const size = 200;
  const cx = size / 2;
  const cy = size / 2 + 15;
  const radius = 75;
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

  return (
    <Flex direction="column" align="center" gap="2">
      <Box style={{ position: "relative" }}>
        {/* SVG elements require hex values as CSS variables aren't reliably supported in SVG gradients */}
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
              {/* Gradient: mint → orange → red (matches design system colors) */}
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="25%" stopColor="#7ADB8F" />
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

          {/* Avg needle (mint-9) - SVG requires hex for fill */}
          <g
            style={{
              transform: `rotate(${avgAngle}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
            }}
          >
            <polygon
              points={`${cx},${cy - 42} ${cx - 3},${cy} ${cx + 3},${cy}`}
              fill="#10B981"
            />
            <circle
              cx={cx}
              cy={cy}
              r="5"
              fill="#10B981"
              stroke="white"
              strokeWidth="1.5"
            />
          </g>

          {/* Max needle (red-9) - SVG requires hex for fill */}
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
      <Flex justify="center" gap="4" align="center">
        <Flex align="center" gap="1">
          <Box
            style={{
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderBottom: "8px solid var(--mint-9)",
            }}
          />
          <Text size="2" color="gray">
            Avg:{" "}
            <Text
              weight="bold"
              style={{ color: "var(--mint-11)", fontSize: 14 }}
            >
              {displayAvg}
            </Text>{" "}
            km/h
          </Text>
        </Flex>
        <Flex align="center" gap="1">
          <Box
            style={{
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderBottom: "8px solid var(--red-9)",
            }}
          />
          <Text size="2" color="gray">
            Max:{" "}
            <Text
              weight="bold"
              style={{ color: "var(--orange-11)", fontSize: 14 }}
            >
              {displayMax}
            </Text>{" "}
            km/h
          </Text>
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

      // Piano bounce effect - uses inline rgba for dynamic DOM manipulation
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
  }, [data.length]);

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

  useEffect(() => {
    if (!hasStartedRef.current) {
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

      setTimeout(() => requestAnimationFrame(animate), 200);
    }
  }, []);

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
          label="Wall Bounces"
          value={Math.round(wall * animationProgress)}
          icon="🧱"
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

// Confidence display
function ConfidenceDisplay({
  confidences,
}: {
  confidences: { pose: number; swing: number; ball: number; final: number };
}) {
  return (
    <Card style={{ border: "1px solid var(--gray-6)" }}>
      <Flex direction="column" gap="3" p="4">
        <Heading size="3" weight="medium">Detection Confidence</Heading>
        <Grid columns="4" gap="3">
          <ConfidenceStat label="Pose" value={confidences.pose} />
          <ConfidenceStat label="Swing" value={confidences.swing} />
          <ConfidenceStat label="Ball" value={confidences.ball} />
          <ConfidenceStat label="Overall" value={confidences.final} isMain />
        </Grid>
      </Flex>
    </Card>
  );
}

function ConfidenceStat({ label, value, isMain }: { label: string; value: number; isMain?: boolean }) {
  const percentage = Math.round(value * 100);
  const color = percentage >= 80 ? "mint" : percentage >= 60 ? "orange" : "red";
  
  return (
    <Flex direction="column" align="center" gap="1">
      <Text size="1" color="gray">{label}</Text>
      <Text 
        size={isMain ? "5" : "3"} 
        weight={isMain ? "bold" : "medium"} 
        style={{ color: isMain ? `var(--${color}-11)` : undefined }}
      >
        {percentage}%
      </Text>
    </Flex>
  );
}
