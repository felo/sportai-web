"use client";

import { useRef } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { useCountingAnimation } from "../hooks";

interface SpeedometerDisplayProps {
  maxSpeed: number;
  avgSpeed: number;
  label: string;
  unit: string;
  colorScheme?: "shot" | "sprint";
}

/**
 * SVG speedometer gauge showing max and average speeds.
 * Used for both shot power and sprint speed displays.
 */
export function SpeedometerDisplay({
  maxSpeed,
  avgSpeed,
  label,
  unit,
  colorScheme = "shot",
}: SpeedometerDisplayProps) {
  const animationProgress = useCountingAnimation({ duration: 2000 });
  const id = useRef(`speed-${Math.random().toString(36).substr(2, 9)}`);

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
        <StatBox
          indicator={avgColor}
          label="Average"
          value={displayAvg}
          unit={unit}
          color={avgColorVar}
        />
        <StatBox
          indicator="var(--red-9)"
          label="Maximum"
          value={displayMax}
          unit={unit}
          color="var(--orange-11)"
        />
      </Flex>
    </Flex>
  );
}

function StatBox({
  indicator,
  label,
  value,
  unit,
  color,
}: {
  indicator: string;
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
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
            borderBottom: `10px solid ${indicator}`,
          }}
        />
        <Text size="1" color="gray" weight="medium" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {label}
        </Text>
      </Flex>
      <Flex align="baseline" gap="1">
        <Text
          weight="bold"
          style={{ 
            color, 
            fontSize: 32,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {value}
        </Text>
        <Text size="2" color="gray">{unit}</Text>
      </Flex>
    </Flex>
  );
}



