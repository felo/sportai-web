"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Box, Flex, Text, Heading } from "@radix-ui/themes";
import { ResponsivePie } from "@nivo/pie";
import { Player } from "../types";
import { formatSwingType } from "../utils";

// Confetti explosion component for winners
function Confetti({ trigger }: { trigger: boolean }) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    rotation: number;
    scale: number;
    velocityX: number;
    velocityY: number;
  }>>([]);

  useEffect(() => {
    if (trigger) {
      const colors = ["#F59E0B", "#FCD34D", "#FBBF24", "#EF4444", "#10B981", "#3B82F6", "#8B5CF6"];
      const newParticles = Array.from({ length: 24 }, (_, i) => ({
        id: i,
        x: 50 + (Math.random() - 0.5) * 20,
        y: 50 + (Math.random() - 0.5) * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        velocityX: (Math.random() - 0.5) * 100,
        velocityY: -30 - Math.random() * 50,
      }));
      setParticles(newParticles);

      // Clear particles after animation
      const timer = setTimeout(() => setParticles([]), 1500);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 20,
      }}
    >
      {particles.map((p) => (
        <Box
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: 8 * p.scale,
            height: 8 * p.scale,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall 1.2s ease-out forwards`,
            ["--vx" as string]: `${p.velocityX}px`,
            ["--vy" as string]: `${p.velocityY}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--vx), calc(var(--vy) + 80px)) rotate(720deg) scale(0.5);
          }
        }
      `}</style>
    </Box>
  );
}

// Fun winner nicknames
const WINNER_NICKNAMES = {
  most_shots: [
    "Rally Monster",
    "Shot Factory",
    "Tap-Tap Titan",
    "Rally Machine",
    "Ball Cyclone",
    "Volley Vortex",
    "Endless Rallyer",
    "Hit Storm",
    "Shot Engine",
    "Rally Goblin"
  ],
  fastest_sprint: [
    "Lightning Legs",
    "Turbo Dash",
    "Flash Step",
    "Speed Demon",
    "Quickfire Stride",
    "Rocket Runner",
    "Blitz Feet",
    "Turbo Sneakers",
    "Flash Motion",
    "Sprint Wizard"
  ],
  most_distance: [
    "Court Explorer",
    "Endless Runner",
    "Energy Machine",
    "Marathon Maker",
    "Distance Dynamo",
    "Court Wanderer",
    "Stamina Sprinter",
    "Mileage Master",
    "Roaming Rocket",
    "Track Trotter"
  ],
  hardest_shot: [
    "Smash Cannon",
    "Rocket Racket",
    "Boom Ball",
    "Power Blaster",
    "Thunder Smash",
    "Ball Crusher",
    "Impact Titan",
    "Velocity Vandal",
    "Smash Reactor",
    "Shockwave Shot"
  ]
};

// Pick a random nickname (stable per session using a seed)
function getRandomNickname(category: keyof typeof WINNER_NICKNAMES, seed: number): string {
  const nicknames = WINNER_NICKNAMES[category];
  const index = Math.abs(seed) % nicknames.length;
  return nicknames[index];
}

// Nivo theme matching SportAI design
const sportaiTheme = {
  background: "transparent",
  text: {
    fontSize: 11,
    fill: "var(--gray-11)",
  },
  axis: {
    domain: {
      line: {
        stroke: "var(--gray-6)",
        strokeWidth: 1,
      },
    },
    ticks: {
      line: {
        stroke: "var(--gray-6)",
        strokeWidth: 1,
      },
      text: {
        fontSize: 10,
        fill: "var(--gray-10)",
      },
    },
    legend: {
      text: {
        fontSize: 11,
        fill: "var(--gray-11)",
        fontWeight: 500,
      },
    },
  },
  grid: {
    line: {
      stroke: "var(--gray-4)",
      strokeWidth: 1,
    },
  },
  legends: {
    text: {
      fontSize: 11,
      fill: "var(--gray-11)",
    },
  },
  tooltip: {
    container: {
      background: "var(--gray-2)",
      color: "var(--gray-12)",
      fontSize: 12,
      borderRadius: 8,
      boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      border: "1px solid var(--gray-6)",
    },
  },
};

// Fixed color mapping for swing types - consistent across all players
const SWING_TYPE_COLORS: Record<string, string> = {
  forehand: "#3B82F6",        // Blue
  backhand: "#8B5CF6",        // Purple
  backhand_one_hand: "#8B5CF6", // Purple (same as backhand)
  backhand_two_hand: "#A78BFA", // Lighter purple (variant)
  serve: "#F59E0B",           // Amber
  volley: "#7ADB8F",          // Mint
  overhead: "#84CC16",        // Lime green
  smash: "#84CC16",           // Lime green (same as overhead)
  lob: "#06B6D4",             // Cyan
  drop: "#6366F1",            // Indigo
  dropshot: "#6366F1",        // Indigo (same as drop)
  slice: "#10B981",           // Emerald
  topspin: "#14B8A6",         // Teal
  flat: "#0EA5E9",            // Sky blue
  kick: "#FBBF24",            // Yellow
  other: "#6B7280",           // Gray
  unknown: "#9CA3AF",         // Light gray
};

// Fallback colors for any unrecognized swing types
const fallbackColors = [
  "#7ADB8F", "#3B82F6", "#F59E0B", "#8B5CF6", 
  "#06B6D4", "#6366F1", "#10B981", "#14B8A6",
];

function getSwingTypeColor(swingType: string, fallbackIndex: number): string {
  const normalized = swingType.toLowerCase();
  return SWING_TYPE_COLORS[normalized] || fallbackColors[fallbackIndex % fallbackColors.length];
}

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

// Hook for intersection observer - animate when visible
function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          // Once animated, don't reset
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

// Swing Type Distribution Pie Chart
function SwingTypeChart({ player, isVisible, totalSwings, rank, maxSwings }: { player: Player; isVisible: boolean; totalSwings: number; rank?: number; maxSwings?: number }) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const hasStartedRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const data = Object.entries(player.swing_type_distribution)
    .filter(([, value]) => value > 0.01)
    .map(([type, value], index) => ({
      id: type,
      label: formatSwingType(type),
      value: Math.round(value * 100),
      color: getSwingTypeColor(type, index),
    }))
    .sort((a, b) => b.value - a.value);
  
  // Animated swing count
  const displaySwings = Math.round(totalSwings * animationProgress);

  // Animate percentage counting + random bouncing
  useEffect(() => {
    if (isVisible && !hasStartedRef.current && data.length > 0) {
      hasStartedRef.current = true;
      const startTime = performance.now();
      const duration = 1800;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Gentle ease-out that starts early (mostly linear with soft landing)
        const eased = progress < 0.7 
          ? progress * 1.1  // Slightly faster in first 70%
          : 0.77 + (1 - Math.pow(1 - (progress - 0.7) / 0.3, 2)) * 0.23; // Ease out last 30%
        setAnimationProgress(Math.min(eased, 1));

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
      }, 200);

      // Piano-style sequential bounce when loading
      setTimeout(() => {
        if (!containerRef.current) return;
        
        const paths = containerRef.current.querySelectorAll('path[fill]:not([fill="none"])');
        const pathsArray = Array.from(paths) as HTMLElement[];
        
        // Quick sequential bounce like a piano - one round
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
          }, index * 120); // 120ms delay between each segment
        });
      }, 100); // Start right away

      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }
  }, [isVisible, data.length]);

  if (data.length === 0) return null;

  // Create animated data with counting values
  const animatedData = data.map((item) => ({
    ...item,
    displayValue: Math.round(item.value * animationProgress),
  }));

  // Unique ID for gradients
  const id = useRef(`swings-${Math.random().toString(36).substr(2, 9)}`);

  return (
    <Flex direction="column" align="center" gap="2" style={{ overflow: "visible" }}>
      <Box ref={containerRef} style={{ height: 220, width: "100%", position: "relative", overflow: "visible" }}>
        <ResponsivePie
          data={animatedData}
          theme={sportaiTheme}
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
          // Show animated counting percentage
          arcLabel={(d) => `${(d.data as typeof animatedData[0]).displayValue}%`}
          // Bouncy spring animation
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
          // Enhanced hover effects
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
                boxShadow: `0 4px 20px rgba(0,0,0,0.25)`,
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

      {/* Medal/Ranking display */}
      <Flex justify="center" align="center" gap="2">
        {(() => {
          const percentOfLeader = maxSwings && maxSwings > 0 ? Math.round((totalSwings / maxSwings) * 100) : 100;
          
          const medalConfig: Record<number, { color: string; gradient: [string, string] }> = {
            1: { color: "#F59E0B", gradient: ["#FCD34D", "#F59E0B"] },
            2: { color: "#94A3B8", gradient: ["#CBD5E1", "#94A3B8"] },
            3: { color: "#CD7F32", gradient: ["#D4A574", "#CD7F32"] },
          };
          
          const medal = rank && rank <= 3 ? medalConfig[rank] : null;
          
          if (medal) {
            return (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="14" r="8" fill={`url(#medal-swings-${id.current}-${rank})`} />
                  <circle cx="12" cy="14" r="6" fill={medal.gradient[0]} opacity="0.3" />
                  <path d="M8 6L12 10L16 6V2H8V6Z" fill={rank === 1 ? "#EF4444" : rank === 2 ? "#3B82F6" : "#10B981"} />
                  <path d="M10 2V8L12 10L14 8V2" fill={rank === 1 ? "#DC2626" : rank === 2 ? "#2563EB" : "#059669"} />
                  <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill={rank === 1 ? "#92400E" : rank === 2 ? "#475569" : "#7C2D12"}>
                    {rank}
                  </text>
                  <defs>
                    <linearGradient id={`medal-swings-${id.current}-${rank}`} x1="4" y1="6" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor={medal.gradient[0]} />
                      <stop offset="1" stopColor={medal.gradient[1]} />
                    </linearGradient>
                  </defs>
                </svg>
                {rank === 1 ? (
                  <Text size="3" weight="bold" style={{ color: medal.color }}>
                    {getRandomNickname("most_shots", player.player_id)}
                  </Text>
                ) : (
                  <Text size="2" color="gray">
                    {percentOfLeader}% of leader
                  </Text>
                )}
              </>
            );
          }
          
          return null;
        })()}
      </Flex>
    </Flex>
  );
}

// Speedometer component for ball speed
function Speedometer({ 
  value, 
  maxValue = 150, 
  avgValue,
  isVisible,
  globalMaxSpeed,
  rank,
  playerId,
}: { 
  value: number; 
  maxValue?: number; 
  avgValue: number;
  isVisible: boolean;
  globalMaxSpeed?: number;
  rank?: number; // 1 = gold, 2 = silver, 3 = bronze, undefined = no medal
  playerId: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [displayAvg, setDisplayAvg] = useState(0);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);
  
  // Animate everything together
  useEffect(() => {
    if (isVisible && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const startTime = performance.now();
      const duration = 2800; // Slow, dramatic animation
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic for snappy feel
        const eased = 1 - Math.pow(1 - progress, 3);
        
        setAnimationProgress(eased);
        setDisplayValue(Math.round(eased * value));
        setDisplayAvg(Math.round(eased * avgValue));
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      // Small delay before starting
      const timer = setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
      }, 150);
      
      return () => {
        clearTimeout(timer);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isVisible, value, avgValue]);

  // Speedometer dimensions
  const size = 200;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = 80;
  const startAngle = -140;
  const endAngle = 140;
  const angleRange = endAngle - startAngle;
  
  // Animated values
  const animatedValue = animationProgress * value;
  const animatedAvgValue = animationProgress * avgValue;
  
  // Calculate angles
  const needleAngle = startAngle + (animatedValue / maxValue) * angleRange;
  const avgAngle = startAngle + (animatedAvgValue / maxValue) * angleRange;
  
  // Convert angle to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  // Arc path helper
  const describeArc = (startAng: number, endAng: number, r: number) => {
    if (Math.abs(endAng - startAng) < 0.1) return ""; // Avoid degenerate arcs
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

  // Tick marks
  const ticks = [0, 30, 60, 90, 120, 150];

  // Unique IDs for this instance
  const id = useRef(`speedometer-${Math.random().toString(36).substr(2, 9)}`);

  return (
    <Flex direction="column" align="center" gap="2">
      <Box style={{ position: "relative" }}>
        <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`}>
          <defs>
            {/* Glow filter */}
            <filter id={`${id.current}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Smooth gradient for progress arc - green to red */}
            <linearGradient id={`${id.current}-arcGradient`} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="25%" stopColor="#7ADB8F" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="65%" stopColor="#F97316" />
              <stop offset="85%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>
            {/* Needle gradient */}
            <linearGradient id={`${id.current}-needle`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>
            {/* Shadow */}
            <filter id={`${id.current}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Background arc */}
          <path
            d={describeArc(startAngle, endAngle, radius)}
            fill="none"
            stroke="var(--gray-4)"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Faded gradient background */}
          <path
            d={describeArc(startAngle, endAngle, radius)}
            fill="none"
            stroke={`url(#${id.current}-arcGradient)`}
            strokeWidth="12"
            strokeLinecap="round"
            opacity={0.2}
          />

          {/* Progress arc with gradient */}
          {animatedValue > 0 && (
            <path
              d={describeArc(startAngle, needleAngle, radius)}
              fill="none"
              stroke={`url(#${id.current}-arcGradient)`}
              strokeWidth="12"
              strokeLinecap="round"
              filter={`url(#${id.current}-glow)`}
            />
          )}

          {/* Tick marks (inside arc) */}
          {ticks.map((tick) => {
            const tickAngle = startAngle + (tick / maxValue) * angleRange;
            const innerR = radius - 24;
            const outerR = radius - 16;
            const x1 = cx + innerR * Math.cos(toRad(tickAngle - 90));
            const y1 = cy + innerR * Math.sin(toRad(tickAngle - 90));
            const x2 = cx + outerR * Math.cos(toRad(tickAngle - 90));
            const y2 = cy + outerR * Math.sin(toRad(tickAngle - 90));
            
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--gray-8)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}

          {/* Labels ABOVE the arc (outside) */}
          {ticks.map((tick) => {
            const tickAngle = startAngle + (tick / maxValue) * angleRange;
            const labelR = radius + 18; // Outside the arc
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
                fontSize="11"
                fontWeight="600"
              >
                {tick}
              </text>
            );
          })}

          {/* Average needle (green, smaller) */}
          <g
            style={{
              transform: `rotate(${avgAngle}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
            }}
          >
            <polygon
              points={`${cx},${cy - 45} ${cx - 3},${cy} ${cx + 3},${cy}`}
              fill="#10B981"
              filter={`url(#${id.current}-shadow)`}
            />
            <circle
              cx={cx}
              cy={cy}
              r="6"
              fill="#10B981"
              stroke="white"
              strokeWidth="1.5"
            />
          </g>

          {/* Max needle (red, larger) */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
            }}
          >
            {/* Needle body */}
            <polygon
              points={`${cx},${cy - 55} ${cx - 4},${cy} ${cx + 4},${cy}`}
              fill={`url(#${id.current}-needle)`}
              filter={`url(#${id.current}-shadow)`}
            />
            {/* Needle center cap */}
            <circle
              cx={cx}
              cy={cy}
              r="8"
              fill="var(--gray-12)"
              stroke="var(--gray-8)"
              strokeWidth="2"
            />
            <circle cx={cx} cy={cy} r="3" fill="#EF4444" />
          </g>
        </svg>

      </Box>

      {/* Stats row - Avg and Max side by side */}
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

      {/* Medal/Ranking display */}
      {(() => {
        const percentage = globalMaxSpeed && globalMaxSpeed > 0 ? Math.round((value / globalMaxSpeed) * 100) : 0;
        
        // Medal colors and labels
        const medalConfig: Record<number, { color: string; gradient: [string, string]; label: string }> = {
          1: { color: "#F59E0B", gradient: ["#FCD34D", "#F59E0B"], label: "Most Powerful" },
          2: { color: "#94A3B8", gradient: ["#CBD5E1", "#94A3B8"], label: "" },
          3: { color: "#CD7F32", gradient: ["#D4A574", "#CD7F32"], label: "" },
        };
        
        const medal = rank && rank <= 3 ? medalConfig[rank] : null;
        
        if (medal) {
          return (
            <Flex justify="center" align="center" gap="2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                {/* Medal circle */}
                <circle cx="12" cy="14" r="8" fill={`url(#medal-speed-${rank})`} />
                <circle cx="12" cy="14" r="6" fill={medal.gradient[0]} opacity="0.3" />
                {/* Ribbon */}
                <path d="M8 6L12 10L16 6V2H8V6Z" fill={rank === 1 ? "#EF4444" : rank === 2 ? "#3B82F6" : "#10B981"} />
                <path d="M10 2V8L12 10L14 8V2" fill={rank === 1 ? "#DC2626" : rank === 2 ? "#2563EB" : "#059669"} />
                {/* Rank number */}
                <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill={rank === 1 ? "#92400E" : rank === 2 ? "#475569" : "#7C2D12"}>
                  {rank}
                </text>
                <defs>
                  <linearGradient id={`medal-speed-${rank}`} x1="4" y1="6" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor={medal.gradient[0]} />
                    <stop offset="1" stopColor={medal.gradient[1]} />
                  </linearGradient>
                </defs>
              </svg>
              {rank === 1 ? (
                <Text size="3" weight="bold" style={{ color: medal.color }}>
                  {getRandomNickname("hardest_shot", playerId)}
                </Text>
              ) : (
                <Text size="2" color="gray">
                  {percentage}% of leader
                </Text>
              )}
            </Flex>
          );
        }
        
        // No medal - just show percentage
        return (
          <Flex justify="center" align="center">
            <Text size="2" color="gray">
              {percentage}% of leader
            </Text>
          </Flex>
        );
      })()}
    </Flex>
  );
}

// Ball Speed Speedometer
function BallSpeedChart({ player, isVisible, globalMaxSpeed, rank }: { player: Player; isVisible: boolean; globalMaxSpeed?: number; rank?: number }) {
  const swings = player.swings || [];
  
  if (swings.length === 0) return null;

  const avgSpeed = swings.reduce((sum, s) => sum + s.ball_speed, 0) / swings.length;
  const maxSpeed = Math.max(...swings.map((s) => s.ball_speed));

  return (
    <Speedometer
      value={maxSpeed}
      avgValue={avgSpeed}
      maxValue={Math.max(150, Math.ceil(maxSpeed / 10) * 10 + 10)}
      isVisible={isVisible}
      globalMaxSpeed={globalMaxSpeed}
      rank={rank}
      playerId={player.player_id}
    />
  );
}

// Distance Ring Component - circular track visualization
function DistanceRing({ 
  distance, 
  maxDistance, 
  isVisible,
  rank,
  playerId,
}: { 
  distance: number; 
  maxDistance: number; 
  isVisible: boolean;
  rank?: number;
  playerId: number;
}) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const hasStartedRef = useRef(false);
  const animationRef = useRef<number | null>(null);

  const percentage = maxDistance > 0 ? distance / maxDistance : 0;

  useEffect(() => {
    if (isVisible && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const startTime = performance.now();
      // Constant speed: full circle = 4000ms, duration proportional to percentage
      const baseDuration = 4000;
      const duration = Math.max(500, baseDuration * percentage);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Gentle ease-out that starts early (mostly linear with soft landing)
        const eased = progress < 0.7 
          ? progress * 1.1  // Slightly faster in first 70%
          : 0.77 + (1 - Math.pow(1 - (progress - 0.7) / 0.3, 2)) * 0.23; // Ease out last 30%
        setAnimationProgress(Math.min(eased, 1));

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else if (rank === 1) {
          setShowConfetti(true);
        }
      };

      setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
      }, 150);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isVisible, percentage, rank]);

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 60;
  const strokeWidth = 12;
  
  // Full circle
  const circumference = 2 * Math.PI * radius;
  const animatedPercentage = percentage * animationProgress;
  const strokeDashoffset = circumference * (1 - animatedPercentage);
  
  // Animated display value
  const displayDistance = Math.round(distance * animationProgress);
  
  // Unique ID for gradients
  const id = useRef(`distance-${Math.random().toString(36).substr(2, 9)}`);

  return (
    <Flex direction="column" align="center" gap="2">
      <Box style={{ position: "relative" }}>
        <Confetti trigger={showConfetti} />
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            {/* Track gradient - cyan to blue */}
            <linearGradient id={`${id.current}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            {/* Glow filter */}
            <filter id={`${id.current}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="var(--gray-4)"
            strokeWidth={strokeWidth}
          />

          {/* Progress ring - no CSS transition, driven by animationProgress */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={`url(#${id.current}-gradient)`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter={`url(#${id.current}-glow)`}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "center",
            }}
          />

          {/* Runner icon - synced with progress ring */}
          {animationProgress > 0.05 && (() => {
            const angle = -90 + (animatedPercentage * 360);
            const rad = (angle * Math.PI) / 180;
            const runnerX = cx + radius * Math.cos(rad);
            const runnerY = cy + radius * Math.sin(rad);
            
            return (
              <g transform={`translate(${runnerX}, ${runnerY})`}>
                <circle r="14" fill="var(--gray-1)" stroke={`url(#${id.current}-gradient)`} strokeWidth="3" />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="16"
                  style={{ userSelect: "none" }}
                >
                  🏃
                </text>
              </g>
            );
          })()}
        </svg>

        {/* Center text */}
        <Box
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <Text
            size="5"
            weight="bold"
            style={{
              color: "var(--gray-12)",
              fontFamily: "var(--font-mono, monospace)",
              lineHeight: 1,
            }}
          >
            {displayDistance}
          </Text>
          <Text size="1" color="gray" style={{ display: "block" }}>
            meters
          </Text>
        </Box>
      </Box>

      {/* Legend with medals */}
      <Flex justify="center" gap="3" align="center">
        {(() => {
          const percentValue = Math.round(percentage * 100);
          
          // Medal colors and labels
          const medalConfig: Record<number, { color: string; gradient: [string, string]; label: string }> = {
            1: { color: "#F59E0B", gradient: ["#FCD34D", "#F59E0B"], label: "Leader" },
            2: { color: "#94A3B8", gradient: ["#CBD5E1", "#94A3B8"], label: "" },
            3: { color: "#CD7F32", gradient: ["#D4A574", "#CD7F32"], label: "" },
          };
          
          const medal = rank && rank <= 3 ? medalConfig[rank] : null;
          
          if (medal) {
            return (
              <Flex align="center" gap="2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  {/* Medal circle */}
                  <circle cx="12" cy="14" r="8" fill={`url(#medal-dist-${rank})`} />
                  <circle cx="12" cy="14" r="6" fill={medal.gradient[0]} opacity="0.3" />
                  {/* Ribbon */}
                  <path d="M8 6L12 10L16 6V2H8V6Z" fill={rank === 1 ? "#EF4444" : rank === 2 ? "#3B82F6" : "#10B981"} />
                  <path d="M10 2V8L12 10L14 8V2" fill={rank === 1 ? "#DC2626" : rank === 2 ? "#2563EB" : "#059669"} />
                  {/* Rank number */}
                  <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill={rank === 1 ? "#92400E" : rank === 2 ? "#475569" : "#7C2D12"}>
                    {rank}
                  </text>
                  <defs>
                    <linearGradient id={`medal-dist-${rank}`} x1="4" y1="6" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor={medal.gradient[0]} />
                      <stop offset="1" stopColor={medal.gradient[1]} />
                    </linearGradient>
                  </defs>
                </svg>
                {rank === 1 ? (
                  <Text size="3" weight="bold" style={{ color: medal.color }}>
                    {getRandomNickname("most_distance", playerId)}
                  </Text>
                ) : (
                  <Text size="2" color="gray">
                    {percentValue}% of leader
                  </Text>
                )}
              </Flex>
            );
          }
          
          // No medal - just show percentage
          return (
            <Flex align="center" justify="center">
              <Text size="2" color="gray">
                {percentValue}% of leader
              </Text>
            </Flex>
          );
        })()}
      </Flex>
    </Flex>
  );
}

// Sprint Ring Component - circular track with lightning icon
function SprintRing({ 
  speed, 
  maxSpeed, 
  isVisible,
  rank,
  playerId,
}: { 
  speed: number; 
  maxSpeed: number; 
  isVisible: boolean;
  rank?: number;
  playerId: number;
}) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const hasStartedRef = useRef(false);
  const animationRef = useRef<number | null>(null);

  const percentage = maxSpeed > 0 ? speed / maxSpeed : 0;

  useEffect(() => {
    if (isVisible && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const startTime = performance.now();
      // Constant speed: full circle = 4000ms, duration proportional to percentage
      const baseDuration = 4000;
      const duration = Math.max(500, baseDuration * percentage);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Gentle ease-out that starts early (mostly linear with soft landing)
        const eased = progress < 0.7 
          ? progress * 1.1  // Slightly faster in first 70%
          : 0.77 + (1 - Math.pow(1 - (progress - 0.7) / 0.3, 2)) * 0.23; // Ease out last 30%
        setAnimationProgress(Math.min(eased, 1));

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else if (rank === 1) {
          setShowConfetti(true);
        }
      };

      setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
      }, 150);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isVisible, percentage, rank]);

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 60;
  const strokeWidth = 12;
  
  // Full circle
  const circumference = 2 * Math.PI * radius;
  const animatedPercentage = percentage * animationProgress;
  const strokeDashoffset = circumference * (1 - animatedPercentage);
  
  // Animated display value
  const displaySpeed = Math.round(speed * animationProgress);
  
  // Unique ID for gradients
  const id = useRef(`sprint-${Math.random().toString(36).substr(2, 9)}`);

  return (
    <Flex direction="column" align="center" gap="2">
      <Box style={{ position: "relative" }}>
        <Confetti trigger={showConfetti} />
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            {/* Track gradient - white to yellow to red */}
            <linearGradient id={`${id.current}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF9C3" />
              <stop offset="40%" stopColor="#FBBF24" />
              <stop offset="70%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
            {/* Glow filter */}
            <filter id={`${id.current}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="var(--gray-4)"
            strokeWidth={strokeWidth}
          />

          {/* Progress ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={`url(#${id.current}-gradient)`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter={`url(#${id.current}-glow)`}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "center",
            }}
          />

          {/* Lightning icon - synced with progress ring */}
          {animationProgress > 0.05 && (() => {
            const angle = -90 + (animatedPercentage * 360);
            const rad = (angle * Math.PI) / 180;
            const iconX = cx + radius * Math.cos(rad);
            const iconY = cy + radius * Math.sin(rad);
            
            return (
              <g transform={`translate(${iconX}, ${iconY})`}>
                <circle r="14" fill="var(--gray-1)" stroke={`url(#${id.current}-gradient)`} strokeWidth="3" />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="16"
                  style={{ userSelect: "none" }}
                >
                  ⚡
                </text>
              </g>
            );
          })()}
        </svg>

        {/* Center text */}
        <Box
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <Text
            size="5"
            weight="bold"
            style={{
              color: "var(--gray-12)",
              fontFamily: "var(--font-mono, monospace)",
              lineHeight: 1,
            }}
          >
            {displaySpeed}
          </Text>
          <Text size="1" color="gray" style={{ display: "block" }}>
            km/h
          </Text>
        </Box>
      </Box>

      {/* Medal/Ranking display */}
      <Flex justify="center" align="center" gap="2">
        {(() => {
          const percentValue = Math.round(percentage * 100);
          
          const medalConfig: Record<number, { color: string; gradient: [string, string] }> = {
            1: { color: "#F59E0B", gradient: ["#FCD34D", "#F59E0B"] },
            2: { color: "#94A3B8", gradient: ["#CBD5E1", "#94A3B8"] },
            3: { color: "#CD7F32", gradient: ["#D4A574", "#CD7F32"] },
          };
          
          const medal = rank && rank <= 3 ? medalConfig[rank] : null;
          
          if (medal) {
            return (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="14" r="8" fill={`url(#medal-sprint-${id.current}-${rank})`} />
                  <circle cx="12" cy="14" r="6" fill={medal.gradient[0]} opacity="0.3" />
                  <path d="M8 6L12 10L16 6V2H8V6Z" fill={rank === 1 ? "#EF4444" : rank === 2 ? "#3B82F6" : "#10B981"} />
                  <path d="M10 2V8L12 10L14 8V2" fill={rank === 1 ? "#DC2626" : rank === 2 ? "#2563EB" : "#059669"} />
                  <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill={rank === 1 ? "#92400E" : rank === 2 ? "#475569" : "#7C2D12"}>
                    {rank}
                  </text>
                  <defs>
                    <linearGradient id={`medal-sprint-${id.current}-${rank}`} x1="4" y1="6" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor={medal.gradient[0]} />
                      <stop offset="1" stopColor={medal.gradient[1]} />
                    </linearGradient>
                  </defs>
                </svg>
                {rank === 1 ? (
                  <Text size="3" weight="bold" style={{ color: medal.color }}>
                    {getRandomNickname("fastest_sprint", playerId)}
                  </Text>
                ) : (
                  <Text size="2" color="gray">
                    {percentValue}% of leader
                  </Text>
                )}
              </>
            );
          }
          
          return (
            <Text size="2" color="gray">
              {percentValue}% of leader
            </Text>
          );
        })()}
      </Flex>
    </Flex>
  );
}

// Activity Ring Component - for shot count (replacing pie chart)
function ActivityRing({ 
  shotCount, 
  maxShots, 
  isVisible,
  rank,
  playerId,
}: { 
  shotCount: number; 
  maxShots: number; 
  isVisible: boolean;
  rank?: number;
  playerId: number;
}) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const hasStartedRef = useRef(false);
  const animationRef = useRef<number | null>(null);

  const percentage = maxShots > 0 ? shotCount / maxShots : 0;

  useEffect(() => {
    if (isVisible && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const startTime = performance.now();
      // Constant speed: full circle = 4000ms, duration proportional to percentage
      const baseDuration = 4000;
      const duration = Math.max(500, baseDuration * percentage);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Gentle ease-out that starts early (mostly linear with soft landing)
        const eased = progress < 0.7 
          ? progress * 1.1  // Slightly faster in first 70%
          : 0.77 + (1 - Math.pow(1 - (progress - 0.7) / 0.3, 2)) * 0.23; // Ease out last 30%
        setAnimationProgress(Math.min(eased, 1));

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else if (rank === 1) {
          // Winner confetti!
          setShowConfetti(true);
        }
      };

      setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
      }, 150);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isVisible, percentage, rank]);

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 60;
  const strokeWidth = 12;
  
  const circumference = 2 * Math.PI * radius;
  const animatedPercentage = percentage * animationProgress;
  const strokeDashoffset = circumference * (1 - animatedPercentage);
  
  const displayCount = Math.round(shotCount * animationProgress);
  const id = useRef(`activity-${Math.random().toString(36).substr(2, 9)}`);

  return (
    <Flex direction="column" align="center" gap="2">
      <Box style={{ position: "relative" }}>
        <Confetti trigger={showConfetti} />
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            {/* Gradient - Emerald to Teal */}
            <linearGradient id={`${id.current}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#14B8A6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
            <filter id={`${id.current}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--gray-4)" strokeWidth={strokeWidth} />

          {/* Progress ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={`url(#${id.current}-gradient)`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter={`url(#${id.current}-glow)`}
            style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
          />

          {/* Tennis ball icon */}
          {animationProgress > 0.05 && (() => {
            const angle = -90 + (animatedPercentage * 360);
            const rad = (angle * Math.PI) / 180;
            const iconX = cx + radius * Math.cos(rad);
            const iconY = cy + radius * Math.sin(rad);
            
            return (
              <g transform={`translate(${iconX}, ${iconY})`}>
                <circle r="14" fill="var(--gray-1)" stroke={`url(#${id.current}-gradient)`} strokeWidth="3" />
                <text textAnchor="middle" dominantBaseline="middle" fontSize="16" style={{ userSelect: "none" }}>
                  🎾
                </text>
              </g>
            );
          })()}
        </svg>

        {/* Center text */}
        <Box style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
          <Text size="5" weight="bold" style={{ color: "var(--gray-12)", fontFamily: "var(--font-mono, monospace)", lineHeight: 1 }}>
            {displayCount}
          </Text>
          <Text size="1" color="gray" style={{ display: "block" }}>shots</Text>
        </Box>
      </Box>

      {/* Medal/Ranking display */}
      <Flex justify="center" align="center" gap="2">
        {(() => {
          const percentValue = Math.round(percentage * 100);
          
          const medalConfig: Record<number, { color: string; gradient: [string, string] }> = {
            1: { color: "#F59E0B", gradient: ["#FCD34D", "#F59E0B"] },
            2: { color: "#94A3B8", gradient: ["#CBD5E1", "#94A3B8"] },
            3: { color: "#CD7F32", gradient: ["#D4A574", "#CD7F32"] },
          };
          
          const medal = rank && rank <= 3 ? medalConfig[rank] : null;
          
          if (medal) {
            return (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="14" r="8" fill={`url(#medal-activity-${id.current}-${rank})`} />
                  <circle cx="12" cy="14" r="6" fill={medal.gradient[0]} opacity="0.3" />
                  <path d="M8 6L12 10L16 6V2H8V6Z" fill={rank === 1 ? "#EF4444" : rank === 2 ? "#3B82F6" : "#10B981"} />
                  <path d="M10 2V8L12 10L14 8V2" fill={rank === 1 ? "#DC2626" : rank === 2 ? "#2563EB" : "#059669"} />
                  <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill={rank === 1 ? "#92400E" : rank === 2 ? "#475569" : "#7C2D12"}>
                    {rank}
                  </text>
                  <defs>
                    <linearGradient id={`medal-activity-${id.current}-${rank}`} x1="4" y1="6" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor={medal.gradient[0]} />
                      <stop offset="1" stopColor={medal.gradient[1]} />
                    </linearGradient>
                  </defs>
                </svg>
                {rank === 1 ? (
                  <Text size="3" weight="bold" style={{ color: medal.color }}>
                    {getRandomNickname("most_shots", playerId)}
                  </Text>
                ) : (
                  <Text size="2" color="gray">
                    {percentValue}% of leader
                  </Text>
                )}
              </>
            );
          }
          
          return (
            <Text size="2" color="gray">
              {percentValue}% of leader
            </Text>
          );
        })()}
      </Flex>
    </Flex>
  );
}

// Power Ring Component - for max ball speed (replacing speedometer)
function PowerRing({ 
  maxSpeed, 
  globalMaxSpeed, 
  isVisible,
  rank,
  playerId,
}: { 
  maxSpeed: number; 
  globalMaxSpeed: number; 
  isVisible: boolean;
  rank?: number;
  playerId: number;
}) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const hasStartedRef = useRef(false);
  const animationRef = useRef<number | null>(null);

  const percentage = globalMaxSpeed > 0 ? maxSpeed / globalMaxSpeed : 0;

  useEffect(() => {
    if (isVisible && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const startTime = performance.now();
      // Constant speed: full circle = 4000ms, duration proportional to percentage
      const baseDuration = 4000;
      const duration = Math.max(500, baseDuration * percentage);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Gentle ease-out that starts early (mostly linear with soft landing)
        const eased = progress < 0.7 
          ? progress * 1.1  // Slightly faster in first 70%
          : 0.77 + (1 - Math.pow(1 - (progress - 0.7) / 0.3, 2)) * 0.23; // Ease out last 30%
        setAnimationProgress(Math.min(eased, 1));

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else if (rank === 1) {
          setShowConfetti(true);
        }
      };

      setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
      }, 150);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isVisible, percentage, rank]);

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 60;
  const strokeWidth = 12;
  
  const circumference = 2 * Math.PI * radius;
  const animatedPercentage = percentage * animationProgress;
  const strokeDashoffset = circumference * (1 - animatedPercentage);
  
  const displaySpeed = Math.round(maxSpeed * animationProgress);
  const id = useRef(`power-${Math.random().toString(36).substr(2, 9)}`);

  return (
    <Flex direction="column" align="center" gap="2">
      <Box style={{ position: "relative" }}>
        <Confetti trigger={showConfetti} />
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            {/* Gradient - Orange to Red */}
            <linearGradient id={`${id.current}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="50%" stopColor="#EF4444" />
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

          {/* Background track */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--gray-4)" strokeWidth={strokeWidth} />

          {/* Progress ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={`url(#${id.current}-gradient)`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter={`url(#${id.current}-glow)`}
            style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
          />

          {/* Explosion/power icon */}
          {animationProgress > 0.05 && (() => {
            const angle = -90 + (animatedPercentage * 360);
            const rad = (angle * Math.PI) / 180;
            const iconX = cx + radius * Math.cos(rad);
            const iconY = cy + radius * Math.sin(rad);
            
            return (
              <g transform={`translate(${iconX}, ${iconY})`}>
                <circle r="14" fill="var(--gray-1)" stroke={`url(#${id.current}-gradient)`} strokeWidth="3" />
                <text textAnchor="middle" dominantBaseline="middle" fontSize="16" style={{ userSelect: "none" }}>
                  💥
                </text>
              </g>
            );
          })()}
        </svg>

        {/* Center text */}
        <Box style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
          <Text size="5" weight="bold" style={{ color: "var(--gray-12)", fontFamily: "var(--font-mono, monospace)", lineHeight: 1 }}>
            {displaySpeed}
          </Text>
          <Text size="1" color="gray" style={{ display: "block" }}>km/h</Text>
        </Box>
      </Box>

      {/* Medal/Ranking display */}
      <Flex justify="center" align="center" gap="2">
        {(() => {
          const percentValue = Math.round(percentage * 100);
          
          const medalConfig: Record<number, { color: string; gradient: [string, string] }> = {
            1: { color: "#F59E0B", gradient: ["#FCD34D", "#F59E0B"] },
            2: { color: "#94A3B8", gradient: ["#CBD5E1", "#94A3B8"] },
            3: { color: "#CD7F32", gradient: ["#D4A574", "#CD7F32"] },
          };
          
          const medal = rank && rank <= 3 ? medalConfig[rank] : null;
          
          if (medal) {
            return (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="14" r="8" fill={`url(#medal-power-${id.current}-${rank})`} />
                  <circle cx="12" cy="14" r="6" fill={medal.gradient[0]} opacity="0.3" />
                  <path d="M8 6L12 10L16 6V2H8V6Z" fill={rank === 1 ? "#EF4444" : rank === 2 ? "#3B82F6" : "#10B981"} />
                  <path d="M10 2V8L12 10L14 8V2" fill={rank === 1 ? "#DC2626" : rank === 2 ? "#2563EB" : "#059669"} />
                  <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill={rank === 1 ? "#92400E" : rank === 2 ? "#475569" : "#7C2D12"}>
                    {rank}
                  </text>
                  <defs>
                    <linearGradient id={`medal-power-${id.current}-${rank}`} x1="4" y1="6" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor={medal.gradient[0]} />
                      <stop offset="1" stopColor={medal.gradient[1]} />
                    </linearGradient>
                  </defs>
                </svg>
                {rank === 1 ? (
                  <Text size="3" weight="bold" style={{ color: medal.color }}>
                    {getRandomNickname("hardest_shot", playerId)}
                  </Text>
                ) : (
                  <Text size="2" color="gray">
                    {percentValue}% of leader
                  </Text>
                )}
              </>
            );
          }
          
          return (
            <Text size="2" color="gray">
              {percentValue}% of leader
            </Text>
          );
        })()}
      </Flex>
    </Flex>
  );
}

// Main PlayerCharts component
export function PlayerCharts({ player, displayName, maxDistance, distanceRank, maxBallSpeed, ballSpeedRank, maxSprintSpeed, sprintRank, swingsRank, maxSwings }: PlayerChartsProps) {
  const { ref, isInView } = useInView(0.2);
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
        {/* Top row: Shots (left) and Power (right) */}
        <Flex gap="4" wrap="wrap" align="stretch">
          {/* Shots - Top Left */}
          {hasSwingData && (
            <Flex direction="column" style={{ flex: "1 1 180px", minWidth: 180 }}>
              <Heading size="2" weight="medium" mb="2" style={{ color: "var(--gray-11)", textAlign: "center" }}>
                Shots
              </Heading>
              <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <ActivityRing
                  shotCount={player.swings?.length || 0}
                  maxShots={maxSwings || player.swings?.length || 1}
                  isVisible={hasAnimated}
                  rank={swingsRank}
                  playerId={player.player_id}
                />
              </Box>
            </Flex>
          )}

          {/* Power - Top Right */}
          {hasSpeedData && (
            <Flex direction="column" style={{ flex: "1 1 180px", minWidth: 180 }}>
              <Heading size="2" weight="medium" mb="2" style={{ color: "var(--gray-11)", textAlign: "center" }}>
                Power
              </Heading>
              <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <PowerRing
                  maxSpeed={Math.max(...(player.swings?.map(s => s.ball_speed) || [0]))}
                  globalMaxSpeed={maxBallSpeed || 1}
                  isVisible={hasAnimated}
                  rank={ballSpeedRank}
                  playerId={player.player_id}
                />
              </Box>
            </Flex>
          )}
        </Flex>

        {/* Bottom row: Sprint (left) and Distance (right) */}
        {(hasSprintData || hasDistanceData) && (
          <Flex gap="4" wrap="wrap" align="stretch">
            {/* Sprint - Bottom Left */}
            {hasSprintData && (
              <Flex direction="column" style={{ flex: "1 1 180px", minWidth: 180 }}>
                <Heading size="2" weight="medium" mb="2" style={{ color: "var(--gray-11)", textAlign: "center" }}>
                  Sprint
                </Heading>
                <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <SprintRing
                  speed={player.fastest_sprint}
                  maxSpeed={maxSprintSpeed || player.fastest_sprint}
                  isVisible={hasAnimated}
                  rank={sprintRank}
                  playerId={player.player_id}
                />
                </Box>
              </Flex>
            )}

            {/* Distance - Bottom Right */}
            {hasDistanceData && (
              <Flex direction="column" style={{ flex: "1 1 180px", minWidth: 180 }}>
                <Heading size="2" weight="medium" mb="2" style={{ color: "var(--gray-11)", textAlign: "center" }}>
                  Distance
                </Heading>
                <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <DistanceRing
                    distance={player.covered_distance}
                    maxDistance={maxDistance}
                    isVisible={hasAnimated}
                    rank={distanceRank}
                    playerId={player.player_id}
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

