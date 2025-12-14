"use client";

import { useRef } from "react";
import { Flex, Text } from "@radix-ui/themes";

export interface MedalConfig {
  color: string;
  gradient: [string, string];
  ribbonColor: string;
  ribbonDark: string;
  textColor: string;
}

export const MEDAL_CONFIGS: Record<number, MedalConfig> = {
  1: {
    color: "#F59E0B",
    gradient: ["#FCD34D", "#F59E0B"],
    ribbonColor: "#EF4444",
    ribbonDark: "#DC2626",
    textColor: "#92400E",
  },
  2: {
    color: "#94A3B8",
    gradient: ["#CBD5E1", "#94A3B8"],
    ribbonColor: "#3B82F6",
    ribbonDark: "#2563EB",
    textColor: "#475569",
  },
  3: {
    color: "#CD7F32",
    gradient: ["#D4A574", "#CD7F32"],
    ribbonColor: "#10B981",
    ribbonDark: "#059669",
    textColor: "#7C2D12",
  },
};

interface MedalProps {
  /** Rank (1, 2, or 3) */
  rank: 1 | 2 | 3;
  /** Size of the medal (default: 24) */
  size?: number;
  /** Optional unique ID prefix for gradient */
  idPrefix?: string;
}

/**
 * Medal SVG component for 1st, 2nd, or 3rd place.
 */
export function Medal({ rank, size = 24, idPrefix }: MedalProps) {
  const defaultId = useRef(`medal-${Math.random().toString(36).substr(2, 9)}`);
  const id = idPrefix || defaultId.current;
  const config = MEDAL_CONFIGS[rank];

  if (!config) return null;

  const scale = size / 24;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Medal circle */}
      <circle cx="12" cy="14" r="8" fill={`url(#${id}-gradient-${rank})`} />
      <circle cx="12" cy="14" r="6" fill={config.gradient[0]} opacity="0.3" />
      {/* Ribbon */}
      <path
        d="M8 6L12 10L16 6V2H8V6Z"
        fill={config.ribbonColor}
      />
      <path
        d="M10 2V8L12 10L14 8V2"
        fill={config.ribbonDark}
      />
      {/* Rank number */}
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontSize="8"
        fontWeight="bold"
        fill={config.textColor}
      >
        {rank}
      </text>
      <defs>
        <linearGradient
          id={`${id}-gradient-${rank}`}
          x1="4"
          y1="6"
          x2="20"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={config.gradient[0]} />
          <stop offset="1" stopColor={config.gradient[1]} />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface MedalDisplayProps {
  /** Rank (1, 2, 3, or undefined for no medal) */
  rank?: number;
  /** Percentage of leader (0-100) for non-1st place */
  percentOfLeader?: number;
  /** Winner nickname for 1st place */
  winnerNickname?: string;
  /** Whether to show the display (for fade-in animations) */
  visible?: boolean;
}

/**
 * Medal display with nickname or percentage.
 * Shows medal + nickname for 1st place, medal + percentage for 2nd/3rd.
 */
export function MedalDisplay({
  rank,
  percentOfLeader = 0,
  winnerNickname,
  visible = true,
}: MedalDisplayProps) {
  if (!rank || rank > 3) {
    // No medal - just show percentage
    return (
      <Flex
        justify="center"
        align="center"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
        }}
      >
        <Text size="2" color="gray">
          {percentOfLeader}% of leader
        </Text>
      </Flex>
    );
  }

  const config = MEDAL_CONFIGS[rank as 1 | 2 | 3];

  return (
    <Flex
      justify="center"
      align="center"
      gap="2"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
      }}
    >
      <Medal rank={rank as 1 | 2 | 3} size={24} />
      {rank === 1 && winnerNickname ? (
        <Text size="3" weight="bold" style={{ color: config.color }}>
          {winnerNickname}
        </Text>
      ) : (
        <Text size="2" color="gray">
          {percentOfLeader}% of leader
        </Text>
      )}
    </Flex>
  );
}







