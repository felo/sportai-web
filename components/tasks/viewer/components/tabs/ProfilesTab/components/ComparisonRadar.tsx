"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Box, Flex, Text, Heading, Card, Tooltip } from "@radix-ui/themes";
import { ResponsiveRadar } from "@nivo/radar";
import type { PlayerProfile } from "@/types/player-profile";
import { CHART_THEME, PROFILE_COLORS, ATTRIBUTE_CONFIG } from "../constants";
import { toRadarData } from "../utils";

interface ComparisonRadarProps {
  profiles: PlayerProfile[];
  portraits: Record<number, string>;
}

/**
 * Comparison radar chart showing all players
 */
export function ComparisonRadar({ profiles, portraits }: ComparisonRadarProps) {
  const [isVisible, setIsVisible] = useState(false);
  // Track which players are active (shown in the chart)
  const [activePlayers, setActivePlayers] = useState<Set<number>>(
    () => new Set(profiles.map((p) => p.playerId))
  );

  // Filter profiles based on active selection
  const activeProfiles = useMemo(
    () => profiles.filter((p) => activePlayers.has(p.playerId)),
    [profiles, activePlayers]
  );

  const radarData = useMemo(() => toRadarData(activeProfiles), [activeProfiles]);
  const keys = useMemo(() => activeProfiles.map((p) => p.playerName), [activeProfiles]);
  const colors = useMemo(
    () =>
      profiles
        .filter((p) => activePlayers.has(p.playerId))
        .map((p) => {
          const originalIdx = profiles.findIndex((op) => op.playerId === p.playerId);
          return PROFILE_COLORS[originalIdx % PROFILE_COLORS.length].primary;
        }),
    [profiles, activePlayers]
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const togglePlayer = (playerId: number) => {
    setActivePlayers((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        // Don't allow deactivating all players
        if (next.size > 1) {
          next.delete(playerId);
        }
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  return (
    <Card
      style={{
        border: "1px solid var(--gray-5)",
        overflow: "visible",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <Box p="5">
        <Flex align="center" justify="between" mb="4">
          <Box>
            <Heading size="4" weight="bold">
              Player Comparison
            </Heading>
            <Text size="2" color="gray">
              Tap players to show/hide from comparison
            </Text>
          </Box>

          {/* Interactive Legend */}
          <Flex gap="3" wrap="wrap">
            {profiles.map((profile, idx) => {
              const color = PROFILE_COLORS[idx % PROFILE_COLORS.length];
              const isActive = activePlayers.has(profile.playerId);
              return (
                <Tooltip
                  key={profile.playerId}
                  content={isActive ? "Click to hide" : "Click to show"}
                >
                  <Flex
                    align="center"
                    gap="2"
                    onClick={() => togglePlayer(profile.playerId)}
                    style={{
                      cursor: "pointer",
                      opacity: isActive ? 1 : 0.4,
                      transition: "all 0.2s ease",
                      padding: "4px 8px",
                      borderRadius: 8,
                      backgroundColor: isActive ? `${color.primary}10` : "transparent",
                    }}
                  >
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: `3px solid ${isActive ? color.primary : "var(--gray-6)"}`,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: portraits[profile.playerId]
                          ? "transparent"
                          : isActive
                            ? color.primary
                            : "var(--gray-6)",
                        transition: "all 0.2s ease",
                        boxShadow: isActive ? `0 0 12px ${color.glow}` : "none",
                      }}
                    >
                      {portraits[profile.playerId] ? (
                        <Image
                          src={portraits[profile.playerId]}
                          alt={profile.playerName}
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
                          {profile.playerName.charAt(0)}
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
                      {profile.playerName}
                    </Text>
                  </Flex>
                </Tooltip>
              );
            })}
          </Flex>
        </Flex>

        <Box style={{ height: 400 }}>
          {activeProfiles.length > 0 ? (
            <ResponsiveRadar
              data={radarData}
              keys={keys}
              indexBy="attribute"
              maxValue={100}
              margin={{ top: 50, right: 100, bottom: 50, left: 100 }}
              curve="linearClosed"
              borderWidth={2}
              gridLevels={5}
              gridShape="circular"
              gridLabelOffset={24}
              enableDots={true}
              dotSize={8}
              dotBorderWidth={2}
              colors={colors}
              fillOpacity={0.15}
              blendMode="normal"
              motionConfig="gentle"
              theme={CHART_THEME}
              isInteractive={true}
              sliceTooltip={({ index, data }) => {
                // Extract the attribute key from the label
                const indexStr = String(index);
                const attrKey = Object.keys(ATTRIBUTE_CONFIG).find((key) =>
                  indexStr.includes(ATTRIBUTE_CONFIG[key].label)
                );
                const config = attrKey ? ATTRIBUTE_CONFIG[attrKey] : null;
                return (
                  <Box
                    style={{
                      background: "var(--gray-2)",
                      padding: "14px 18px",
                      borderRadius: 12,
                      border: "1px solid var(--gray-6)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                      width: 320,
                    }}
                  >
                    <Text size="3" weight="bold" style={{ display: "block" }}>
                      {index}
                    </Text>
                    {config && (
                      <Text
                        size="2"
                        color="gray"
                        style={{ display: "block", marginTop: 4, lineHeight: 1.4 }}
                      >
                        {config.description}
                      </Text>
                    )}
                    <Box style={{ marginTop: 10 }}>
                      {data.map((d, i) => {
                        const playerColor =
                          PROFILE_COLORS[
                            profiles.findIndex((p) => p.playerName === d.id) %
                              PROFILE_COLORS.length
                          ]?.primary || "var(--gray-11)";
                        return (
                          <Flex
                            key={d.id}
                            align="center"
                            justify="between"
                            gap="3"
                            style={{ marginTop: i > 0 ? 4 : 0 }}
                          >
                            <Text size="2" style={{ color: playerColor }}>
                              {d.id}
                            </Text>
                            <Text size="2" weight="medium">
                              {d.value}
                            </Text>
                          </Flex>
                        );
                      })}
                    </Box>
                  </Box>
                );
              }}
              legends={[
                {
                  anchor: "top-left",
                  direction: "column",
                  translateX: -80,
                  translateY: -20,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemTextColor: "var(--gray-11)",
                  symbolSize: 12,
                  symbolShape: "circle",
                },
              ]}
            />
          ) : (
            <Flex align="center" justify="center" style={{ height: "100%" }}>
              <Text color="gray">Select at least one player to compare</Text>
            </Flex>
          )}
        </Box>
      </Box>
    </Card>
  );
}





