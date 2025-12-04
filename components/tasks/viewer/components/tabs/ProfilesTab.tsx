"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Box, Flex, Text, Heading, Card, Separator, Tooltip } from "@radix-ui/themes";
import { PersonIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { ResponsiveRadar } from "@nivo/radar";
import type { StatisticsResult } from "../../types";
import { usePlayerProfiles } from "@/hooks/usePlayerProfiles";
import { StreamingIndicator } from "@/components/chat";
import type { PlayerRankings } from "../../hooks/usePlayerRankings";
import type { PlayerProfile, PlayerProfileData } from "@/types/player-profile";

interface ProfilesTabProps {
  result: StatisticsResult | null;
  rankings: PlayerRankings;
  portraits?: Record<number, string>;
  playerDisplayNames?: Record<number, string>;
}

// Nivo chart theme matching app design
const CHART_THEME = {
  background: "transparent",
  text: {
    fill: "var(--gray-11)",
    fontSize: 11,
    fontFamily: "inherit",
  },
  grid: {
    line: {
      stroke: "var(--gray-6)",
      strokeWidth: 1,
    },
  },
  tooltip: {
    container: {
      background: "var(--gray-2)",
      color: "var(--gray-12)",
      borderRadius: "8px",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
      padding: "10px 14px",
      border: "1px solid var(--gray-6)",
    },
  },
};

// Profile color palette - vibrant and distinctive
const PROFILE_COLORS = [
  {
    primary: "#7ADB8F",
    gradient: ["#7ADB8F", "#10B981"],
    fill: "rgba(122, 219, 143, 0.25)",
    glow: "rgba(122, 219, 143, 0.5)",
    name: "Mint",
  },
  {
    primary: "#60A5FA",
    gradient: ["#60A5FA", "#3B82F6"],
    fill: "rgba(96, 165, 250, 0.25)",
    glow: "rgba(96, 165, 250, 0.5)",
    name: "Blue",
  },
  {
    primary: "#F59E0B",
    gradient: ["#FBBF24", "#F59E0B"],
    fill: "rgba(245, 158, 11, 0.25)",
    glow: "rgba(245, 158, 11, 0.5)",
    name: "Amber",
  },
  {
    primary: "#A78BFA",
    gradient: ["#A78BFA", "#8B5CF6"],
    fill: "rgba(167, 139, 250, 0.25)",
    glow: "rgba(167, 139, 250, 0.5)",
    name: "Purple",
  },
];

// Attribute display config with friendly explanations
const ATTRIBUTE_CONFIG: Record<string, { emoji: string; label: string; description: string }> = {
  power: { 
    emoji: "💥", 
    label: "Power",
    description: "How hard you hit! 🎾 Based on your ball speed and those crispy smashes.",
  },
  agility: { 
    emoji: "⚡", 
    label: "Agility",
    description: "Your speed demon score! 🏃 How fast you sprint and move around the court.",
  },
  consistency: { 
    emoji: "🎯", 
    label: "Consistency",
    description: "The steady hand award! ✨ How reliable and repeatable your shots are.",
  },
  attack: { 
    emoji: "⚔️", 
    label: "Attack",
    description: "Going for the kill! 🔥 Your aggressive shots, smashes, and net plays.",
  },
  defense: { 
    emoji: "🛡️", 
    label: "Defense",
    description: "The wall! 🧱 Your lobs, defensive saves, and ability to stay in the rally.",
  },
  coverage: { 
    emoji: "📍", 
    label: "Coverage",
    description: "Court commander! 🗺️ How much ground you cover and your positioning.",
  },
  variety: { 
    emoji: "🎨", 
    label: "Variety",
    description: "The creative one! 🎭 Your range of different shot types and unpredictability.",
  },
};

/**
 * Build player profile data from analysis result
 */
function buildProfileData(
  result: StatisticsResult,
  rankings: PlayerRankings,
  playerDisplayNames: Record<number, string>
): PlayerProfileData[] {
  const { validPlayers } = rankings;
  
  return validPlayers.map(player => {
    const swings = player.swings || [];
    const speeds = swings.map(s => s.ball_speed).filter(s => s > 0);
    
    // Build shot breakdown
    const shotBreakdown: Record<string, { count: number; percentage: number; avgSpeed: number }> = {};
    const typeCounts: Record<string, { count: number; speeds: number[] }> = {};
    
    swings.forEach(swing => {
      const type = swing.serve ? "serve" : (swing.swing_type || "unknown");
      if (!typeCounts[type]) typeCounts[type] = { count: 0, speeds: [] };
      typeCounts[type].count++;
      if (swing.ball_speed > 0) typeCounts[type].speeds.push(swing.ball_speed);
    });
    
    Object.entries(typeCounts).forEach(([type, data]) => {
      shotBreakdown[type] = {
        count: data.count,
        percentage: swings.length > 0 ? (data.count / swings.length) * 100 : 0,
        avgSpeed: data.speeds.length > 0 
          ? data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length 
          : 0,
      };
    });
    
    return {
      playerId: player.player_id,
      playerName: playerDisplayNames[player.player_id] || `Player ${player.displayIndex}`,
      stats: {
        totalSwings: swings.length,
        avgBallSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
        maxBallSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
        distanceCovered: player.covered_distance || 0,
        fastestSprint: player.fastest_sprint || 0,
        activityScore: player.activity_score || 0,
      },
      shotBreakdown,
      rankings: {
        powerRank: rankings.ballSpeedRankings[player.player_id] || null,
        sprintRank: rankings.sprintRankings[player.player_id] || null,
        distanceRank: rankings.distanceRankings[player.player_id] || null,
        swingsRank: rankings.swingsRankings[player.player_id] || null,
      },
      totalPlayers: validPlayers.length,
    };
  });
}

/**
 * Convert profiles to radar data format for Nivo
 */
function toRadarData(profiles: PlayerProfile[]): Array<{ attribute: string; [key: string]: number | string }> {
  const attributeKeys: (keyof typeof ATTRIBUTE_CONFIG)[] = [
    "power", "agility", "consistency", "attack", "defense", "coverage", "variety"
  ];
  
  return attributeKeys.map(key => {
    const config = ATTRIBUTE_CONFIG[key];
    const dataPoint: { attribute: string; [key: string]: number | string } = {
      attribute: `${config.emoji} ${config.label}`,
    };
    profiles.forEach(profile => {
      dataPoint[profile.playerName] = profile.attributes[key as keyof typeof profile.attributes];
    });
    return dataPoint;
  });
}

/**
 * Scrollable box with "more content" indicator
 */
function ScrollableBox({ 
  children, 
  maxHeight, 
  flex,
  color,
}: { 
  children: React.ReactNode; 
  maxHeight?: number;
  flex?: number;
  color: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setCanScrollDown(scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 5);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll);
    // Also check on resize
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  return (
    <Box style={{ position: "relative", flex, minHeight: flex ? 0 : undefined }}>
      <Box
        ref={scrollRef}
        style={{
          maxHeight: maxHeight,
          height: flex ? "100%" : undefined,
          overflowY: "auto",
          flexShrink: 0,
        }}
      >
        {children}
      </Box>
      {/* Scroll indicator */}
      {canScrollDown && (
        <Box
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 24,
            background: "linear-gradient(to bottom, transparent 0%, var(--gray-1) 100%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 2,
            pointerEvents: "none",
          }}
        >
          <ChevronDownIcon 
            width={14} 
            height={14} 
            style={{ 
              color: color,
              animation: "bounce 1.5s infinite",
            }} 
          />
        </Box>
      )}
    </Box>
  );
}

/**
 * Individual player profile card with mini radar
 */
function PlayerProfileCard({
  profile,
  portrait,
  color,
  delay,
}: {
  profile: PlayerProfile;
  portrait?: string;
  color: typeof PROFILE_COLORS[0];
  delay: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const radarData = toRadarData([profile]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Get top attribute for highlighting
  const topAttribute = useMemo(() => {
    const attrs = profile.attributes;
    let maxKey = "power";
    let maxVal = 0;
    (Object.keys(attrs) as Array<keyof typeof attrs>).forEach(key => {
      if (attrs[key] > maxVal) {
        maxVal = attrs[key];
        maxKey = key;
      }
    });
    return { key: maxKey, value: maxVal };
  }, [profile.attributes]);

  return (
    <Card
      style={{
        border: `1px solid var(--gray-6)`,
        width: 340,
        height: 604, // Fixed height for uniformity
        flexShrink: 0,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
    >
      <Flex direction="column" gap="3" p="4" style={{ height: "100%" }}>
        {/* Header with portrait and playstyle */}
        <Flex align="center" gap="3">
          <Box
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              overflow: "hidden",
              border: `3px solid ${color.primary}`,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: portrait ? "transparent" : color.primary,
            }}
          >
            {portrait ? (
              <img
                src={portrait}
                alt={profile.playerName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top",
                }}
              />
            ) : (
              <PersonIcon width={28} height={28} style={{ color: "white" }} />
            )}
          </Box>
          <Box style={{ flex: 1 }}>
            <Heading size="4" style={{ lineHeight: 1.2 }}>{profile.playerName}</Heading>
            <Text
              size="2"
              weight="bold"
              style={{
                color: color.primary,
                display: "block",
                marginTop: 2,
              }}
            >
              {profile.playstyle}
            </Text>
          </Box>
          {/* Top stat badge */}
          <Tooltip content={`Top: ${ATTRIBUTE_CONFIG[topAttribute.key].label}`}>
            <Box
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${color.gradient[0]}, ${color.gradient[1]})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 12px ${color.glow}`,
              }}
            >
              <Text style={{ fontSize: 18 }}>
                {ATTRIBUTE_CONFIG[topAttribute.key].emoji}
              </Text>
            </Box>
          </Tooltip>
        </Flex>

        {/* Mini Radar Chart */}
        <Box style={{ height: 220, margin: "0 -8px" }}>
          <ResponsiveRadar
            data={radarData}
            keys={[profile.playerName]}
            indexBy="attribute"
            maxValue={100}
            margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
            curve="linearClosed"
            borderWidth={2}
            borderColor={color.primary}
            gridLevels={4}
            gridShape="circular"
            gridLabelOffset={16}
            enableDots={true}
            dotSize={8}
            dotColor={color.primary}
            dotBorderWidth={2}
            dotBorderColor="white"
            colors={[color.primary]}
            fillOpacity={0.25}
            blendMode="normal"
            motionConfig="gentle"
            theme={CHART_THEME}
            isInteractive={true}
            sliceTooltip={({ index, data }) => {
              // Extract the attribute key from the label (e.g., "💥 Power" → "power")
              const indexStr = String(index);
              const attrKey = Object.keys(ATTRIBUTE_CONFIG).find(
                key => indexStr.includes(ATTRIBUTE_CONFIG[key].label)
              );
              const config = attrKey ? ATTRIBUTE_CONFIG[attrKey] : null;
              return (
                <Box
                  style={{
                    background: "var(--gray-2)",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: `2px solid ${color.primary}`,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                    width: 280,
                  }}
                >
                  <Text size="2" weight="bold" style={{ color: color.primary }}>
                    {index}
                  </Text>
                  {config && (
                    <Text size="1" color="gray" style={{ display: "block", marginTop: 4, lineHeight: 1.4 }}>
                      {config.description}
                    </Text>
                  )}
                  <Text size="2" weight="medium" style={{ display: "block", marginTop: 6 }}>
                    Score: {data[0].value}
                  </Text>
                </Box>
              );
            }}
          />
        </Box>

        {/* Summary - scrollable */}
        <ScrollableBox maxHeight={100} color={color.primary}>
          <Text size="2" color="gray" style={{ lineHeight: 1.5 }}>
            {profile.summary}
          </Text>
        </ScrollableBox>

        <Separator size="4" style={{ opacity: 0.3, flexShrink: 0 }} />

        {/* Strengths & Areas to Improve - scrollable */}
        <ScrollableBox flex={1} color={color.primary}>
          <Flex gap="4">
            <Box style={{ flex: 1 }}>
              <Flex align="center" gap="1" mb="1">
                <Text style={{ fontSize: 12 }}>💪</Text>
                <Text size="1" weight="bold" style={{ color: "#10B981" }}>
                  Strengths
                </Text>
              </Flex>
              {profile.strengths.map((s, i) => (
                <Text key={i} size="1" color="gray" style={{ display: "block", marginTop: 2 }}>
                  • {s}
                </Text>
              ))}
            </Box>
            {profile.areasToImprove.length > 0 && (
              <Box style={{ flex: 1 }}>
                <Flex align="center" gap="1" mb="1">
                  <Text style={{ fontSize: 12 }}>🎯</Text>
                  <Text size="1" weight="bold" style={{ color: "#F59E0B" }}>
                    Focus Areas
                  </Text>
                </Flex>
                {profile.areasToImprove.map((s, i) => (
                  <Text key={i} size="1" color="gray" style={{ display: "block", marginTop: 2 }}>
                    • {s}
                  </Text>
                ))}
              </Box>
            )}
          </Flex>
        </ScrollableBox>
      </Flex>
    </Card>
  );
}

/**
 * Comparison radar chart showing all players
 */
function ComparisonRadar({ profiles, portraits }: { 
  profiles: PlayerProfile[]; 
  portraits: Record<number, string>;
}) {
  const [isVisible, setIsVisible] = useState(false);
  // Track which players are active (shown in the chart)
  const [activePlayers, setActivePlayers] = useState<Set<number>>(() => 
    new Set(profiles.map(p => p.playerId))
  );

  // Filter profiles based on active selection
  const activeProfiles = useMemo(() => 
    profiles.filter(p => activePlayers.has(p.playerId)),
    [profiles, activePlayers]
  );
  
  const radarData = useMemo(() => toRadarData(activeProfiles), [activeProfiles]);
  const keys = useMemo(() => activeProfiles.map(p => p.playerName), [activeProfiles]);
  const colors = useMemo(() => 
    profiles
      .filter(p => activePlayers.has(p.playerId))
      .map((p) => {
        const originalIdx = profiles.findIndex(op => op.playerId === p.playerId);
        return PROFILE_COLORS[originalIdx % PROFILE_COLORS.length].primary;
      }),
    [profiles, activePlayers]
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const togglePlayer = (playerId: number) => {
    setActivePlayers(prev => {
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
            <Heading size="4" weight="bold">Player Comparison</Heading>
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
                <Tooltip key={profile.playerId} content={isActive ? "Click to hide" : "Click to show"}>
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
                        backgroundColor: portraits[profile.playerId] ? "transparent" : (isActive ? color.primary : "var(--gray-6)"),
                        transition: "all 0.2s ease",
                        boxShadow: isActive ? `0 0 12px ${color.glow}` : "none",
                      }}
                    >
                      {portraits[profile.playerId] ? (
                        <img
                          src={portraits[profile.playerId]}
                          alt={profile.playerName}
                          style={{
                            width: "100%",
                            height: "100%",
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
                const attrKey = Object.keys(ATTRIBUTE_CONFIG).find(
                  key => indexStr.includes(ATTRIBUTE_CONFIG[key].label)
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
                      <Text size="2" color="gray" style={{ display: "block", marginTop: 4, lineHeight: 1.4 }}>
                        {config.description}
                      </Text>
                    )}
                    <Box style={{ marginTop: 10 }}>
                      {data.map((d, i) => {
                        const playerColor = PROFILE_COLORS[
                          profiles.findIndex(p => p.playerName === d.id) % PROFILE_COLORS.length
                        ]?.primary || "var(--gray-11)";
                        return (
                          <Flex key={d.id} align="center" justify="between" gap="3" style={{ marginTop: i > 0 ? 4 : 0 }}>
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

/**
 * Loading skeleton for profile cards
 */
function LoadingSkeleton() {
  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      <Flex
        align="center"
        justify="center"
        direction="column"
        gap="3"
        style={{ padding: "60px 20px" }}
      >
        <Box
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--mint-9), var(--mint-11))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "pulse 2s infinite",
          }}
        >
          <PersonIcon width={28} height={28} style={{ color: "white" }} />
        </Box>
        <Text size="3" weight="medium" style={{ color: "var(--gray-11)" }}>
          Analyzing player profiles...
        </Text>
        <Text size="2" color="gray">
          AI is evaluating performance attributes
        </Text>
        <Box style={{ marginTop: 8 }}>
          <StreamingIndicator />
        </Box>
      </Flex>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
      `}</style>
    </Box>
  );
}

export function ProfilesTab({
  result,
  rankings,
  portraits = {},
  playerDisplayNames = {},
}: ProfilesTabProps) {
  const { profiles, isGenerating, error, generate } = usePlayerProfiles({ sport: "padel" });
  const hasGeneratedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Build profile data from result
  const profileData = useMemo(() => {
    if (!result) return [];
    return buildProfileData(result, rankings, playerDisplayNames);
  }, [result, rankings, playerDisplayNames]);

  // Auto-generate profiles when data is available
  useEffect(() => {
    if (profileData.length > 0 && !hasGeneratedRef.current && !isGenerating && profiles.length === 0) {
      hasGeneratedRef.current = true;
      generate(profileData);
    }
  }, [profileData, isGenerating, profiles.length, generate]);

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    
    updateScrollState();
    container.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    
    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, profiles.length]);

  const scrollToStart = () => {
    scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  const scrollToEnd = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ 
      left: scrollRef.current.scrollWidth, 
      behavior: "smooth" 
    });
  };

  // No data state
  if (!result || rankings.validPlayers.length === 0) {
    return (
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        <Flex
          align="center"
          justify="center"
          direction="column"
          gap="3"
          style={{ padding: "60px 20px" }}
        >
          <PersonIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
          <Text size="3" color="gray">No player data available yet</Text>
          <Text size="2" color="gray">
            Player profiles will appear here once the analysis is complete
          </Text>
        </Flex>
      </Box>
    );
  }

  // Loading state
  if (isGenerating) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        <Flex
          align="center"
          justify="center"
          direction="column"
          gap="3"
          style={{ padding: "60px 20px" }}
        >
          <Box
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--red-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 24 }}>⚠️</Text>
          </Box>
          <Text size="3" color="red">{error}</Text>
          <Text size="2" color="gray">
            Try refreshing the page or check back later
          </Text>
        </Flex>
      </Box>
    );
  }

  // Results - Cards on top, comparison below
  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      {/* Individual player cards - horizontal scroll - ON TOP */}
      <Box style={{ position: "relative", marginBottom: "var(--space-4)" }}>
        {/* Left scroll indicator */}
        {canScrollLeft && (
          <Box
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 16,
              width: 48,
              background: "linear-gradient(to right, var(--gray-1) 0%, transparent 100%)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              paddingLeft: 8,
              paddingTop: 100,
              zIndex: 10,
            }}
          >
            <Tooltip content="Scroll to start">
              <button
                onClick={scrollToStart}
                aria-label="Scroll to start"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "9999px",
                  backgroundColor: "#7ADB8F",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease-out",
                  border: "2px solid white",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = "#95E5A6";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(122, 219, 143, 0.6), 0 0 40px rgba(122, 219, 143, 0.4), 0 4px 16px rgba(122, 219, 143, 0.5)";
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = "#7ADB8F";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)";
                }}
              >
                <ChevronLeftIcon width={18} height={18} color="#1C1C1C" />
              </button>
            </Tooltip>
          </Box>
        )}

        {/* Right scroll indicator */}
        {canScrollRight && (
          <Box
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 16,
              width: 48,
              background: "linear-gradient(to left, var(--gray-1) 0%, transparent 100%)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-end",
              paddingRight: 8,
              paddingTop: 100,
              zIndex: 10,
            }}
          >
            <Tooltip content="Scroll to end">
              <button
                onClick={scrollToEnd}
                aria-label="Scroll to end"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "9999px",
                  backgroundColor: "#7ADB8F",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease-out",
                  border: "2px solid white",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = "#95E5A6";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(122, 219, 143, 0.6), 0 0 40px rgba(122, 219, 143, 0.4), 0 4px 16px rgba(122, 219, 143, 0.5)";
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = "#7ADB8F";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)";
                }}
              >
                <ChevronRightIcon width={18} height={18} color="#1C1C1C" />
              </button>
            </Tooltip>
          </Box>
        )}

        {/* Scrollable cards container */}
        <Box
          ref={scrollRef}
          style={{
            overflowX: "auto",
            overflowY: "visible",
            paddingBottom: 16,
            cursor: "grab",
            scrollBehavior: "smooth",
          }}
          onMouseDown={(e) => {
            const container = e.currentTarget;
            container.style.cursor = "grabbing";
            const startX = e.pageX - container.offsetLeft;
            const scrollLeft = container.scrollLeft;
            
            const onMouseMove = (e: MouseEvent) => {
              e.preventDefault();
              const x = e.pageX - container.offsetLeft;
              const walk = (x - startX) * 1.5;
              container.scrollLeft = scrollLeft - walk;
            };
            
            const onMouseUp = () => {
              container.style.cursor = "grab";
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
            };
            
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          }}
        >
          <Flex gap="4" align="stretch" style={{ width: "max-content" }}>
            {profiles.map((profile, idx) => (
              <PlayerProfileCard
                key={profile.playerId}
                profile={profile}
                portrait={portraits[profile.playerId]}
                color={PROFILE_COLORS[idx % PROFILE_COLORS.length]}
                delay={200 + idx * 150}
              />
            ))}
          </Flex>
        </Box>
      </Box>

      {/* Combined radar comparison (only if multiple players) - BELOW CARDS */}
      {profiles.length > 1 && (
        <ComparisonRadar profiles={profiles} portraits={portraits} />
      )}

      {/* Animations for scroll indicators */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
      `}</style>
    </Box>
  );
}
