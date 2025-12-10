"use client";

import { ReactNode } from "react";
import { Box, Flex, Text, Separator } from "@radix-ui/themes";
import { RocketIcon, ArrowUpIcon, TargetIcon } from "@radix-ui/react-icons";
import { useCountingAnimation } from "../hooks";

interface ServesVolleysDisplayProps {
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
}

/**
 * Display for serves, volleys, and ground strokes with counts and speeds.
 */
export function ServesVolleysDisplay({
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
}: ServesVolleysDisplayProps) {
  const animationProgress = useCountingAnimation({ duration: 1500 });

  const displayServes = Math.round(serveCount * animationProgress);
  const displayVolleys = Math.round(volleyCount * animationProgress);
  const servePercentage = totalSwings > 0 ? (serveCount / totalSwings) * 100 : 0;
  const volleyPercentage = totalSwings > 0 ? (volleyCount / totalSwings) * 100 : 0;
  const groundStrokePercentage = totalSwings > 0 ? (groundStrokeCount / totalSwings) * 100 : 0;

  return (
    <Flex direction="column" gap="4" style={{ paddingTop: 8 }}>
      {/* Serves */}
      <ShotTypeRow
        icon={<RocketIcon width={20} height={20} />}
        label="Serves"
        count={displayServes}
        percentage={servePercentage}
        avgSpeed={avgServeSpeed}
        maxSpeed={maxServeSpeed}
        animationProgress={animationProgress}
        color="var(--purple-11)"
      />

      <Separator size="4" style={{ opacity: 0.3 }} />

      {/* Volleys */}
      <ShotTypeRow
        icon={<ArrowUpIcon width={20} height={20} />}
        label="Volleys"
        count={displayVolleys}
        percentage={volleyPercentage}
        avgSpeed={avgVolleySpeed}
        maxSpeed={maxVolleySpeed}
        animationProgress={animationProgress}
        color="var(--orange-11)"
      />

      <Separator size="4" style={{ opacity: 0.3 }} />

      {/* Ground Strokes */}
      <ShotTypeRow
        icon={<TargetIcon width={20} height={20} />}
        label="Ground Strokes"
        count={Math.round(groundStrokeCount * animationProgress)}
        percentage={groundStrokePercentage}
        avgSpeed={avgGroundStrokeSpeed}
        maxSpeed={maxGroundStrokeSpeed}
        animationProgress={animationProgress}
        color="var(--mint-11)"
      />
    </Flex>
  );
}

function ShotTypeRow({
  icon,
  label,
  count,
  percentage,
  avgSpeed,
  maxSpeed,
  animationProgress,
  color,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  percentage: number;
  avgSpeed: number;
  maxSpeed: number;
  animationProgress: number;
  color: string;
}) {
  return (
    <Flex direction="column" gap="2">
      <Flex justify="between" align="center">
        <Flex align="center" gap="2">
          <Box style={{ color }}>{icon}</Box>
          <Text size="2" weight="medium">{label}</Text>
        </Flex>
        <Text size="4" weight="bold" style={{ color, fontVariantNumeric: "tabular-nums" }}>
          {count}
        </Text>
      </Flex>
      <Flex justify="between">
        <Text size="1" color="gray">{Math.round(percentage)}% of swings</Text>
        {avgSpeed > 0 && (
          <Text size="1" color="gray">
            Avg: {Math.round(avgSpeed * animationProgress)} km/h
            {maxSpeed > 0 && ` • Max: ${Math.round(maxSpeed * animationProgress)} km/h`}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}


