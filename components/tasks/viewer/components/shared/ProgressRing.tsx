"use client";

import { useRef } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { useAnimatedProgress } from "../../hooks/useAnimatedProgress";
import { Confetti } from "./Confetti";
import { MedalDisplay } from "./Medal";

export interface ProgressRingGradient {
  /** Gradient stops as [offset, color] pairs */
  readonly stops: ReadonlyArray<{ readonly offset: string; readonly color: string }>;
}

export interface ProgressRingProps {
  /** Current value */
  value: number;
  /** Maximum value (for percentage calculation) */
  maxValue: number;
  /** Whether animation should start */
  isVisible: boolean;
  /** Rank for medal display (1, 2, 3, or undefined) */
  rank?: number;
  /** Player ID for nickname generation */
  playerId: number;
  /** Gradient colors for the ring */
  gradient: ProgressRingGradient;
  /** Icon emoji to show on the ring */
  icon: string;
  /** Unit label to show below the value */
  unit: string;
  /** Winner nickname for 1st place */
  winnerNickname?: string;
  /** Size of the ring (default: 160) */
  size?: number;
  /** Stroke width (default: 12) */
  strokeWidth?: number;
  /** Hide the medal/percentage display below the ring */
  hideMedalDisplay?: boolean;
}

/**
 * Generic animated progress ring component.
 * Shows a circular progress indicator with animated fill, center value, and medal display.
 */
export function ProgressRing({
  value,
  maxValue,
  isVisible,
  rank,
  playerId,
  gradient,
  icon,
  unit,
  winnerNickname,
  size = 160,
  strokeWidth = 12,
  hideMedalDisplay = false,
}: ProgressRingProps) {
  const percentage = maxValue > 0 ? value / maxValue : 0;
  
  const { progress, isComplete } = useAnimatedProgress({
    isVisible,
    percentage,
    onComplete: undefined,
  });

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth * 2) / 2 - 10;
  
  const circumference = 2 * Math.PI * radius;
  const animatedPercentage = percentage * progress;
  const strokeDashoffset = circumference * (1 - animatedPercentage);
  
  const displayValue = Math.round(value * progress);
  const id = useRef(`ring-${Math.random().toString(36).substr(2, 9)}`);

  return (
    <Flex direction="column" align="center" gap="2">
      <Box style={{ position: "relative" }}>
        <Confetti trigger={isComplete && rank === 1} />
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient
              id={`${id.current}-gradient`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              {gradient.stops.map((stop, i) => (
                <stop key={i} offset={stop.offset} stopColor={stop.color} />
              ))}
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

          {/* Icon on ring */}
          {progress > 0.05 && (() => {
            const angle = -90 + animatedPercentage * 360;
            const rad = (angle * Math.PI) / 180;
            const iconX = cx + radius * Math.cos(rad);
            const iconY = cy + radius * Math.sin(rad);

            return (
              <g transform={`translate(${iconX}, ${iconY})`}>
                <circle
                  r="14"
                  fill="var(--gray-1)"
                  stroke={`url(#${id.current}-gradient)`}
                  strokeWidth="3"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="16"
                  style={{ userSelect: "none" }}
                >
                  {icon}
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
            {displayValue}
          </Text>
          <Text size="1" color="gray" style={{ display: "block" }}>
            {unit}
          </Text>
        </Box>
      </Box>

      {/* Medal display */}
      {!hideMedalDisplay && (
        <MedalDisplay
          rank={rank}
          percentOfLeader={Math.round(percentage * 100)}
          winnerNickname={winnerNickname}
          visible={isComplete}
        />
      )}
    </Flex>
  );
}

// Pre-defined gradient configurations
export const RING_GRADIENTS = {
  // Distance: Cyan to Blue to Purple
  distance: {
    stops: [
      { offset: "0%", color: "#06B6D4" },
      { offset: "50%", color: "#3B82F6" },
      { offset: "100%", color: "#8B5CF6" },
    ],
  },
  // Sprint: Yellow to Orange to Red
  sprint: {
    stops: [
      { offset: "0%", color: "#FEF9C3" },
      { offset: "40%", color: "#FBBF24" },
      { offset: "70%", color: "#F97316" },
      { offset: "100%", color: "#EF4444" },
    ],
  },
  // Activity: Emerald to Teal to Cyan
  activity: {
    stops: [
      { offset: "0%", color: "#10B981" },
      { offset: "50%", color: "#14B8A6" },
      { offset: "100%", color: "#06B6D4" },
    ],
  },
  // Power: Orange to Red
  power: {
    stops: [
      { offset: "0%", color: "#F97316" },
      { offset: "50%", color: "#EF4444" },
      { offset: "100%", color: "#DC2626" },
    ],
  },
} as const;

// Ring icon mapping
export const RING_ICONS = {
  distance: "🏃",
  sprint: "⚡",
  activity: "🎾",
  power: "💥",
} as const;

