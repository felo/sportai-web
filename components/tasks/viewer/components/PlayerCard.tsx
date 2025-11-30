"use client";

import { Box, Flex, Heading, Text, Card, Separator } from "@radix-ui/themes";
import { Player } from "../types";
import { PlayerCharts } from "./PlayerCharts";

interface PlayerCardProps {
  player: Player;
  displayIndex: number;
  displayName: string;
  portrait?: string;
  maxDistance?: number;
  distanceRank?: number;
  maxBallSpeed?: number;
  ballSpeedRank?: number;
  maxSprintSpeed?: number;
  sprintRank?: number;
  swingsRank?: number;
  maxSwings?: number;
  overallRank?: number;
}

// Medal component for individual category medals
function SmallMedal({ rank, label }: { rank: number; label: string }) {
  const colors: Record<number, { bg: string; text: string }> = {
    1: { bg: "#F59E0B", text: "#92400E" },
    2: { bg: "#94A3B8", text: "#475569" },
    3: { bg: "#CD7F32", text: "#7C2D12" },
  };
  
  const color = colors[rank];
  if (!color) return null;
  
  return (
    <Flex direction="column" align="center" gap="1">
      <Box
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${rank === 1 ? '#FCD34D' : rank === 2 ? '#CBD5E1' : '#D4A574'}, ${color.bg})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        <Text size="1" weight="bold" style={{ color: color.text, fontSize: 10 }}>
          {rank}
        </Text>
      </Box>
      <Text size="1" color="gray" style={{ fontSize: 9 }}>
        {label}
      </Text>
    </Flex>
  );
}

// Big overall medal component
function OverallMedal({ rank }: { rank: number }) {
  const config: Record<number, { color: string; gradient: [string, string]; label: string; ribbonColor: string }> = {
    1: { color: "#F59E0B", gradient: ["#FCD34D", "#F59E0B"], label: "Champion", ribbonColor: "#EF4444" },
    2: { color: "#94A3B8", gradient: ["#CBD5E1", "#94A3B8"], label: "Runner-up", ribbonColor: "#3B82F6" },
    3: { color: "#CD7F32", gradient: ["#D4A574", "#CD7F32"], label: "3rd Place", ribbonColor: "#10B981" },
  };
  
  const medal = config[rank];
  
  // "Honorable Mention" for ranks > 3
  if (!medal) {
    return (
      <Flex direction="column" align="center" gap="1">
        <Box
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #E5E7EB, #9CA3AF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
            border: "3px solid #D1D5DB",
          }}
        >
          <Text size="4" style={{ fontSize: 20 }}>⭐</Text>
        </Box>
        <Text size="2" weight="medium" color="gray">
          Honorable Mention
        </Text>
      </Flex>
    );
  }
  
  return (
    <Flex direction="column" align="center" gap="1">
      <svg width="56" height="64" viewBox="0 0 56 64" fill="none">
        {/* Ribbon */}
        <path d="M16 28L28 44L40 28V8H16V28Z" fill={medal.ribbonColor} />
        <path d="M22 8V36L28 44L34 36V8" fill={rank === 1 ? "#DC2626" : rank === 2 ? "#2563EB" : "#059669"} />
        {/* Medal circle */}
        <circle cx="28" cy="44" r="18" fill={`url(#overall-medal-${rank})`} />
        <circle cx="28" cy="44" r="14" fill={medal.gradient[0]} opacity="0.3" />
        {/* Number */}
        <text x="28" y="50" textAnchor="middle" fontSize="16" fontWeight="bold" fill={rank === 1 ? "#92400E" : rank === 2 ? "#475569" : "#7C2D12"}>
          {rank}
        </text>
        <defs>
          <linearGradient id={`overall-medal-${rank}`} x1="10" y1="26" x2="46" y2="62" gradientUnits="userSpaceOnUse">
            <stop stopColor={medal.gradient[0]} />
            <stop offset="1" stopColor={medal.gradient[1]} />
          </linearGradient>
        </defs>
      </svg>
      <Text size="2" weight="bold" style={{ color: medal.color }}>
        {medal.label}
      </Text>
    </Flex>
  );
}

export function PlayerCard({ player, displayIndex, displayName, portrait, maxDistance, distanceRank, maxBallSpeed, ballSpeedRank, maxSprintSpeed, sprintRank, swingsRank, maxSwings, overallRank = 4 }: PlayerCardProps) {
  const hasChartData = 
    Object.keys(player.swing_type_distribution).length > 0 || 
    (player.swings && player.swings.length > 0);

  // Collect earned medals and sort by rank (gold first)
  const earnedMedals: { rank: number; label: string }[] = [];
  if (distanceRank && distanceRank <= 3) earnedMedals.push({ rank: distanceRank, label: "Distance" });
  if (sprintRank && sprintRank <= 3) earnedMedals.push({ rank: sprintRank, label: "Sprint" });
  if (ballSpeedRank && ballSpeedRank <= 3) earnedMedals.push({ rank: ballSpeedRank, label: "Power" });
  if (swingsRank && swingsRank <= 3) earnedMedals.push({ rank: swingsRank, label: "Activity" });
  earnedMedals.sort((a, b) => a.rank - b.rank); // Gold (1) to Bronze (3)

  return (
    <Card style={{ border: "1px solid var(--gray-6)" }}>
      <Flex direction="column" gap="3" p="4">
        {/* Player header with photo and name centered */}
        <Flex direction="column" align="center" gap="2">
          <Box
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              overflow: "hidden",
              border: "3px solid var(--mint-9)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: portrait ? "transparent" : "var(--mint-9)",
            }}
          >
            {portrait ? (
              <img
                src={portrait}
                alt={displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Text size="5" weight="bold" style={{ color: "white" }}>
                P{displayIndex}
              </Text>
            )}
          </Box>
          <Heading size="5" weight="medium" style={{ textAlign: "center" }}>
            {displayName}
          </Heading>
        </Flex>

        {/* Medal summary row */}
        <Flex justify="center" align="center" gap="4" py="2">
          {/* Overall big medal */}
          <OverallMedal rank={overallRank} />
          
          {/* Individual category medals */}
          {earnedMedals.length > 0 && (
            <Flex direction="column" gap="2">
              <Text size="1" color="gray" style={{ textAlign: "center" }}>Medals earned</Text>
              <Flex gap="3" justify="center">
                {earnedMedals.map((m, i) => (
                  <SmallMedal key={i} rank={m.rank} label={m.label} />
                ))}
              </Flex>
            </Flex>
          )}
        </Flex>

        {/* Charts Section */}
        {hasChartData && (
          <>
            <Separator size="4" />
            <PlayerCharts player={player} displayName={displayName} maxDistance={maxDistance} distanceRank={distanceRank} maxBallSpeed={maxBallSpeed} ballSpeedRank={ballSpeedRank} maxSprintSpeed={maxSprintSpeed} sprintRank={sprintRank} swingsRank={swingsRank} maxSwings={maxSwings} />
          </>
        )}
      </Flex>
    </Card>
  );
}

