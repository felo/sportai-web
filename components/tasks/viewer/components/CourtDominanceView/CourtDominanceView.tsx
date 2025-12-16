"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  Box,
  Flex,
  Text,
  Card,
  SegmentedControl,
  Tooltip,
  Badge,
  Heading,
} from "@radix-ui/themes";
import { TargetIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import { useIsMobile } from "@/hooks/useIsMobile";

// Player colors for portrait borders
const PLAYER_COLORS = [
  { primary: "#7ADB8F", glow: "rgba(122, 219, 143, 0.5)" },
  { primary: "#60A5FA", glow: "rgba(96, 165, 250, 0.5)" },
  { primary: "#F59E0B", glow: "rgba(245, 158, 11, 0.5)" },
  { primary: "#A78BFA", glow: "rgba(167, 139, 250, 0.5)" },
];
import type { StatisticsResult } from "../../types";
import type { ZoneSystemId, ZoneStat, PlayerDominance } from "./types";
import { getZoneSystemsForSport, type Sport } from "./constants";
import { formatDuration, calculateZoneDominance } from "./utils";
import { CourtZoneGrid, PlayerDominanceCard } from "./components";

interface CourtDominanceViewProps {
  result: StatisticsResult | null;
  playerDisplayNames?: Record<number, string>;
  portraits?: Record<number, string>;
  sport?: Sport;
}

export function CourtDominanceView({
  result,
  playerDisplayNames = {},
  portraits = {},
  sport = "padel",
}: CourtDominanceViewProps) {
  const isMobile = useIsMobile();
  const [selectedSystem, setSelectedSystem] = useState<ZoneSystemId>("traffic-light");
  const [selectedPlayer, setSelectedPlayer] = useState<number | "all">("all");
  const [isVisible, setIsVisible] = useState(false);

  // Get zone systems for this sport
  const zoneSystems = useMemo(() => getZoneSystemsForSport(sport), [sport]);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const currentSystem = zoneSystems.find((s) => s.id === selectedSystem) || zoneSystems[0];

  // Get valid players (with enough swings)
  const validPlayers = useMemo(() => {
    const players = result?.players || [];
    return players.filter((p) => p.swing_count >= 10);
  }, [result]);

  // Calculate dominance for each player
  const playerDominance = useMemo((): PlayerDominance[] => {
    if (!result?.player_positions) return [];

    const rallies = result.rallies || [];

    return validPlayers
      .map((player, idx) => {
        const positions = result.player_positions?.[String(player.player_id)] || [];
        const zones = calculateZoneDominance(positions, currentSystem.zones, rallies, sport);

        const totalTime = zones.reduce((sum, z) => sum + z.timeSpent, 0);
        const dominantZoneStat = zones.reduce(
          (max, z) => (z.timeSpent > max.timeSpent ? z : max),
          zones[0]
        );

        // Calculate "pressure" time (time in defensive/transition zones)
        const pressureZoneIds = currentSystem.zones
          .filter((z) => z.isPressureZone)
          .map((z) => z.id);
        const pressureTime = zones
          .filter((z) => pressureZoneIds.includes(z.zoneId))
          .reduce((sum, z) => sum + z.timeSpent, 0);

        return {
          playerId: player.player_id,
          playerName: playerDisplayNames[player.player_id] || `Player ${idx + 1}`,
          totalTime,
          zones,
          dominantZone: dominantZoneStat?.zoneName || "Unknown",
          dominantZonePercentage: dominantZoneStat?.percentage || 0,
          pressureZoneTime: pressureTime,
          pressurePercentage: totalTime > 0 ? (pressureTime / totalTime) * 100 : 0,
        };
      })
      .sort((a, b) => {
        // Sort by player name naturally (e.g., "Player 1" before "Player 2")
        return a.playerName.localeCompare(b.playerName, undefined, { numeric: true });
      });
  }, [result, currentSystem, playerDisplayNames, validPlayers]);

  // Aggregate all players for "All" view
  const aggregatedZones = useMemo((): ZoneStat[] => {
    if (selectedPlayer === "all") {
      const combined: Record<string, ZoneStat> = {};
      currentSystem.zones.forEach((z) => {
        combined[z.id] = {
          zoneId: z.id,
          zoneName: z.name,
          timeSpent: 0,
          percentage: 0,
          entryCount: 0,
        };
      });

      playerDominance.forEach((pd) => {
        pd.zones.forEach((z) => {
          combined[z.zoneId].timeSpent += z.timeSpent;
          combined[z.zoneId].entryCount += z.entryCount;
        });
      });

      const total = Object.values(combined).reduce((sum, z) => sum + z.timeSpent, 0);
      Object.values(combined).forEach((z) => {
        z.percentage = total > 0 ? (z.timeSpent / total) * 100 : 0;
      });

      return Object.values(combined);
    }

    return playerDominance.find((p) => p.playerId === selectedPlayer)?.zones || [];
  }, [selectedPlayer, playerDominance, currentSystem]);

  // No data state
  if (!result?.player_positions || Object.keys(result.player_positions).length === 0) {
    return (
      <Card style={{ border: "1px solid var(--gray-5)" }}>
        <Flex align="center" justify="center" direction="column" gap="3" p="6">
          <Box
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: "var(--gray-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TargetIcon width={32} height={32} style={{ color: "var(--gray-8)" }} />
          </Box>
          <Heading size="4" weight="medium" style={{ color: "var(--gray-11)" }}>
            No Position Data Available
          </Heading>
          <Text size="2" color="gray" align="center" style={{ maxWidth: 400 }}>
            Player position tracking data is needed for court dominance analysis. This
            data is collected during video processing.
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      <Flex direction="column" gap="4">
        {/* Controls */}
        <Card
          style={{
            border: "1px solid var(--gray-5)",
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.3s ease-out",
          }}
        >
          <Flex direction="column" gap="3" p="4">
            <Flex direction="column" gap="4">
              {/* Zone System Selector */}
              <Flex direction="column" gap="2">
                <Text
                  size="1"
                  color="gray"
                  weight="medium"
                  style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
                >
                  Zone System
                </Text>
                <Box style={{ position: "relative" }}>
                  {/* Fade masks on mobile */}
                  {isMobile && (
                    <>
                      <Box
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: "20px",
                          background: "linear-gradient(to right, var(--gray-2), transparent)",
                          zIndex: 10,
                          pointerEvents: "none",
                        }}
                      />
                      <Box
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "20px",
                          background: "linear-gradient(to left, var(--gray-2), transparent)",
                          zIndex: 10,
                          pointerEvents: "none",
                        }}
                      />
                    </>
                  )}
                  <Box
                    style={{
                      overflowX: isMobile ? "auto" : "visible",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    <SegmentedControl.Root
                      value={selectedSystem}
                      onValueChange={(v) => setSelectedSystem(v as ZoneSystemId)}
                      size="2"
                    >
                      {zoneSystems.map((sys) => (
                        <SegmentedControl.Item key={sys.id} value={sys.id}>
                          {sys.name}
                        </SegmentedControl.Item>
                      ))}
                    </SegmentedControl.Root>
                  </Box>
                </Box>
                <Text size="1" color="gray">
                  {currentSystem.description}
                </Text>
              </Flex>

              {/* Player Selector with Portrait Circles */}
              {playerDominance.length > 0 && (
                <Flex direction="column" gap="2">
                  <Text
                    size="1"
                    color="gray"
                    weight="medium"
                    style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
                  >
                    Player Filter
                  </Text>
                  <Flex gap="2" wrap="wrap">
                    {/* All Players option */}
                    <Tooltip content={selectedPlayer === "all" ? "Showing all players" : "Click to show all"}>
                      <Flex
                        align="center"
                        gap="2"
                        onClick={() => setSelectedPlayer("all")}
                        style={{
                          cursor: "pointer",
                          opacity: selectedPlayer === "all" ? 1 : 0.5,
                          transition: "all 0.2s ease",
                          padding: isMobile ? "6px 10px" : "4px 10px",
                          borderRadius: 8,
                          backgroundColor: selectedPlayer === "all" ? "var(--accent-a3)" : "transparent",
                        }}
                      >
                        <Box
                          style={{
                            width: isMobile ? 28 : 32,
                            height: isMobile ? 28 : 32,
                            borderRadius: "50%",
                            border: `3px solid ${selectedPlayer === "all" ? "var(--accent-9)" : "var(--gray-6)"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: selectedPlayer === "all" ? "var(--accent-9)" : "var(--gray-6)",
                            transition: "all 0.2s ease",
                            boxShadow: selectedPlayer === "all" ? "0 0 12px var(--accent-a6)" : "none",
                          }}
                        >
                          <Text size="1" weight="bold" style={{ color: "white" }}>All</Text>
                        </Box>
                        <Text
                          size="2"
                          weight="medium"
                          style={{
                            color: selectedPlayer === "all" ? "var(--gray-12)" : "var(--gray-8)",
                            transition: "color 0.2s ease",
                          }}
                        >
                          All Players
                        </Text>
                      </Flex>
                    </Tooltip>

                    {/* Individual player options */}
                    {playerDominance.map((player, idx) => {
                      const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                      const isActive = selectedPlayer === player.playerId;
                      const portrait = portraits[player.playerId];
                      
                      return (
                        <Tooltip
                          key={player.playerId}
                          content={isActive ? `Showing ${player.playerName}` : `Click to filter by ${player.playerName}`}
                        >
                          <Flex
                            align="center"
                            gap="2"
                            onClick={() => setSelectedPlayer(player.playerId)}
                            style={{
                              cursor: "pointer",
                              opacity: isActive ? 1 : 0.5,
                              transition: "all 0.2s ease",
                              padding: isMobile ? "6px 10px" : "4px 10px",
                              borderRadius: 8,
                              backgroundColor: isActive ? `${color.primary}15` : "transparent",
                            }}
                          >
                            <Box
                              style={{
                                position: "relative",
                                width: isMobile ? 28 : 32,
                                height: isMobile ? 28 : 32,
                                borderRadius: "50%",
                                overflow: "hidden",
                                border: `3px solid ${isActive ? color.primary : "var(--gray-6)"}`,
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: portrait
                                  ? "transparent"
                                  : isActive
                                    ? color.primary
                                    : "var(--gray-6)",
                                transition: "all 0.2s ease",
                                boxShadow: isActive ? `0 0 12px ${color.glow}` : "none",
                              }}
                            >
                              {portrait ? (
                                <Image
                                  src={portrait}
                                  alt={player.playerName}
                                  fill
                                  sizes="32px"
                                  style={{
                                    objectFit: "cover",
                                    objectPosition: "top",
                                    filter: isActive ? "none" : "grayscale(100%)",
                                    transition: "filter 0.2s ease",
                                  }}
                                />
                              ) : (
                                <Text size="1" weight="bold" style={{ color: "white" }}>
                                  {player.playerName.charAt(0)}
                                </Text>
                              )}
                            </Box>
                            <Text
                              size="2"
                              weight="medium"
                              style={{
                                color: isActive ? "var(--gray-12)" : "var(--gray-8)",
                                transition: "color 0.2s ease",
                              }}
                            >
                              {player.playerName}
                            </Text>
                          </Flex>
                        </Tooltip>
                      );
                    })}
                  </Flex>
                </Flex>
              )}
            </Flex>
          </Flex>
        </Card>

        {/* Main Content: Court + Stats */}
        <Flex gap="4" wrap="wrap">
          {/* Court Visualization */}
          <Card
            style={{
              border: "1px solid var(--gray-5)",
              flex: "1 1 340px",
              minWidth: 300,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(10px)",
              transition: "all 0.4s ease-out",
              transitionDelay: "0.1s",
            }}
          >
            <Flex direction="column" gap="3" p="4">
              <Heading size="3" weight="medium">
                Court Position Heatmap
              </Heading>
              <Text size="2" color="gray">
                Half court view (your side)
              </Text>

              <CourtZoneGrid
                zones={currentSystem.zones}
                zoneStats={aggregatedZones}
                isVisible={isVisible}
                sport={sport}
              />
            </Flex>
          </Card>

          {/* Zone Stats */}
          <Card
            style={{
              border: "1px solid var(--gray-5)",
              flex: "1 1 280px",
              minWidth: 260,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(10px)",
              transition: "all 0.4s ease-out",
              transitionDelay: "0.15s",
            }}
          >
            <Flex direction="column" gap="4" p="4">
              <Heading size="3" weight="bold">
                Zone Breakdown
              </Heading>

              {aggregatedZones.map((zoneStat, idx) => {
                const zoneDef = currentSystem.zones.find((z) => z.id === zoneStat.zoneId);
                if (!zoneDef) return null;

                return (
                  <Tooltip key={zoneStat.zoneId} content={zoneDef.tacticalAdvice}>
                    <Flex
                      direction="column"
                      gap="2"
                      style={{
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? "translateY(0)" : "translateY(10px)",
                        transition: "all 0.3s ease-out",
                        transitionDelay: `${0.2 + idx * 0.05}s`,
                        cursor: "help",
                      }}
                    >
                      <Flex justify="between" align="center">
                        <Flex align="center" gap="2">
                          <Text size="2" weight="medium">
                            {zoneStat.zoneName}
                          </Text>
                          {zoneDef.isPressureZone && (
                            <Badge size="1" color="orange" variant="soft">
                              Pressure
                            </Badge>
                          )}
                        </Flex>
                        <Text
                          size="3"
                          weight="bold"
                          style={{
                            color: zoneDef.color,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {zoneStat.percentage.toFixed(0)}%
                        </Text>
                      </Flex>

                      {/* Progress bar */}
                      <Box
                        style={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "var(--gray-4)",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          style={{
                            width: isVisible ? `${zoneStat.percentage}%` : "0%",
                            height: "100%",
                            backgroundColor: zoneDef.color,
                            borderRadius: 4,
                            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                            transitionDelay: `${0.3 + idx * 0.05}s`,
                          }}
                        />
                      </Box>

                      <Flex justify="between">
                        <Text
                          size="1"
                          color="gray"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {formatDuration(zoneStat.timeSpent)} total
                        </Text>
                        <Text
                          size="1"
                          color="gray"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {zoneStat.entryCount} entries
                        </Text>
                      </Flex>
                    </Flex>
                  </Tooltip>
                );
              })}

              {/* Coaching Tips */}
              <Box
                style={{
                  marginTop: 8,
                  padding: "12px",
                  backgroundColor: "var(--accent-2)",
                  borderRadius: "var(--radius-2)",
                  border: "1px solid var(--accent-5)",
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0)" : "translateY(10px)",
                  transition: "all 0.4s ease-out",
                  transitionDelay: "0.4s",
                }}
              >
                <Flex align="start" gap="2">
                  <Box style={{ flexShrink: 0, color: "var(--accent-11)", marginTop: 2 }}>
                    <LightningBoltIcon width={16} height={16} />
                  </Box>
                  <Text size="1" color="gray" style={{ lineHeight: 1.5 }}>
                    {currentSystem.coachingTips}
                  </Text>
                </Flex>
              </Box>
            </Flex>
          </Card>
        </Flex>

        {/* Player Cards (when showing all) */}
        {selectedPlayer === "all" && playerDominance.length > 1 && (
          <Flex gap="4" wrap="wrap">
            {playerDominance.map((player, idx) => (
              <PlayerDominanceCard
                key={player.playerId}
                player={player}
                portrait={portraits[player.playerId]}
                zones={currentSystem.zones}
                delay={0.25 + idx * 0.1}
                isVisible={isVisible}
              />
            ))}
          </Flex>
        )}
      </Flex>
    </Box>
  );
}



