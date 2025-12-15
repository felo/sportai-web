"use client";

import Image from "next/image";
import { Box, Flex, Text, Card, Tooltip, Badge } from "@radix-ui/themes";
import { PersonIcon, StopwatchIcon, ExclamationTriangleIcon, CheckIcon } from "@radix-ui/react-icons";
import type { ZoneDefinition, PlayerDominance } from "../types";
import { formatDuration } from "../utils/formatters";

interface PlayerDominanceCardProps {
  player: PlayerDominance;
  portrait?: string;
  zones: ZoneDefinition[];
  delay: number;
  isVisible: boolean;
}

/**
 * Individual player card showing zone dominance stats.
 */
export function PlayerDominanceCard({
  player,
  portrait,
  zones,
  delay,
  isVisible,
}: PlayerDominanceCardProps) {
  const dominantZoneDef = zones.find((z) => z.name === player.dominantZone);

  return (
    <Card
      style={{
        border: "1px solid var(--gray-5)",
        flex: "1 1 240px",
        minWidth: 220,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(15px)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transitionDelay: `${delay}s`,
      }}
    >
      <Flex direction="column" gap="3" p="4">
        {/* Player header */}
        <Flex align="center" gap="3">
          <Box
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              overflow: "hidden",
              border: `3px solid ${dominantZoneDef?.color || "var(--accent-9)"}`,
              backgroundColor: portrait
                ? "transparent"
                : dominantZoneDef?.color || "var(--accent-9)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 12px ${dominantZoneDef?.color || "var(--accent-9)"}40`,
            }}
          >
            {portrait ? (
              <Image
                src={portrait}
                alt={player.playerName}
                fill
                sizes="52px"
                style={{
                  objectFit: "cover",
                  objectPosition: "top",
                }}
              />
            ) : (
              <PersonIcon width={24} height={24} style={{ color: "white" }} />
            )}
          </Box>
          <Flex direction="column" gap="0">
            <Text size="3" weight="bold">
              {player.playerName}
            </Text>
            <Flex align="center" gap="1">
              <Box
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: dominantZoneDef?.color || "var(--accent-9)",
                  flexShrink: 0,
                }}
              />
              <Text size="2" color="gray">
                {player.dominantZone}
              </Text>
            </Flex>
          </Flex>
        </Flex>

        {/* Stats */}
        <Flex gap="2" wrap="wrap">
          <Tooltip content="Total tracked time during rallies">
            <Badge color="gray" variant="soft" size="2" style={{ cursor: "help" }}>
              <Flex align="center" gap="1">
                <StopwatchIcon width={12} height={12} />
                <span>{formatDuration(player.totalTime)} tracked</span>
              </Flex>
            </Badge>
          </Tooltip>
          <Tooltip content="Time spent in defensive or transition zones">
            <Badge
              color={
                player.pressurePercentage > 60
                  ? "red"
                  : player.pressurePercentage > 40
                    ? "orange"
                    : "mint"
              }
              variant="soft"
              size="2"
              style={{ cursor: "help" }}
            >
              <Flex align="center" gap="1">
                {player.pressurePercentage > 50 ? (
                  <ExclamationTriangleIcon width={12} height={12} />
                ) : (
                  <CheckIcon width={12} height={12} />
                )}
                <span>{player.pressurePercentage.toFixed(0)}% pressure</span>
              </Flex>
            </Badge>
          </Tooltip>
        </Flex>

        {/* Top 3 zones mini-chart */}
        <Flex direction="column" gap="1">
          {player.zones
            .slice()
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 3)
            .map((zoneStat) => {
              const zoneDef = zones.find((z) => z.id === zoneStat.zoneId);
              if (!zoneDef) return null;

              return (
                <Flex key={zoneStat.zoneId} align="center" gap="2">
                  <Box
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: zoneDef.color,
                      flexShrink: 0,
                    }}
                  />
                  <Box
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: "var(--gray-4)",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      style={{
                        width: `${zoneStat.percentage}%`,
                        height: "100%",
                        backgroundColor: zoneDef.color,
                        borderRadius: 2,
                      }}
                    />
                  </Box>
                  <Text
                    size="1"
                    color="gray"
                    style={{
                      width: 32,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {zoneStat.percentage.toFixed(0)}%
                  </Text>
                </Flex>
              );
            })}
        </Flex>
      </Flex>
    </Card>
  );
}





