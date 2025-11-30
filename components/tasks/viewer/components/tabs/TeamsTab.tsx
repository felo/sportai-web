"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Box, Flex, Grid, Text, Card, Heading, Separator } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import type { StatisticsResult, TeamSession, TeamSessionPlayer } from "../../types";
import { ProgressRing } from "../shared";
import type { ProgressRingGradient } from "../shared";

interface TeamsTabProps {
  result: StatisticsResult | null;
  portraits: Record<number, string>;
  playerDisplayNames: Record<number, string>;
}

/**
 * Aggregated stats for a single team across all sessions
 */
interface TeamStats {
  playerIds: number[];
  totalSwings: number;
  totalDistance: number;
  maxSprint: number;
  maxSprintPlayerId: number;
  totalActivityScore: number;
  avgActivityScore: number;
  sessionsOnFront: number;
  sessionsOnBack: number;
  playerStats: Map<number, {
    swingCount: number;
    distance: number;
    fastestSprint: number;
    activityScore: number;
  }>;
}

// Team colors
const TEAM_COLORS = {
  team1: {
    primary: "#8B5CF6", // Purple
    gradient: ["#A78BFA", "#7C3AED"],
    bg: "var(--purple-a2)",
    border: "var(--purple-6)",
    text: "var(--purple-11)",
    accent: "var(--purple-9)",
  },
  team2: {
    primary: "#F59E0B", // Amber
    gradient: ["#FCD34D", "#D97706"],
    bg: "var(--amber-a2)",
    border: "var(--amber-6)",
    text: "var(--amber-11)",
    accent: "var(--amber-9)",
  },
};

// Ring gradients for team stats
const PURPLE_GRADIENT: ProgressRingGradient = {
  stops: [
    { offset: "0%", color: "#A78BFA" },
    { offset: "100%", color: "#7C3AED" },
  ],
};

const AMBER_GRADIENT: ProgressRingGradient = {
  stops: [
    { offset: "0%", color: "#FCD34D" },
    { offset: "100%", color: "#D97706" },
  ],
};

/**
 * Normalize team composition for comparison
 * Sorts player IDs so [244, 236] and [236, 244] are treated as the same team
 */
function normalizeTeamKey(playerIds: number[]): string {
  return [...playerIds].sort((a, b) => a - b).join("-");
}

/**
 * Team names ranked by strength (highest to lowest)
 * Names are thematic and fun, correlating with performance level
 */
const TEAM_NAMES_BY_TIER = {
  legendary: [
    "The Titans",
    "Court Crushers",
    "The Dominators",
    "Elite Force",
    "The Unstoppables",
  ],
  champion: [
    "Power Duo",
    "The Blazers",
    "Thunder Squad",
    "Net Warriors",
    "The Aces",
  ],
  strong: [
    "Rally Kings",
    "The Strikers",
    "Court Masters",
    "Smash Bros",
    "The Contenders",
  ],
  solid: [
    "The Hustlers",
    "Net Ninjas",
    "Court Runners",
    "The Challengers",
    "Paddle Pals",
  ],
  rising: [
    "The Underdogs",
    "Rising Stars",
    "The Rookies",
    "Court Cadets",
    "The Dreamers",
  ],
};

/**
 * Get a team name based on their overall score relative to max possible
 * Ensures no duplicate names between teams
 */
function getTeamName(
  teamScore: number,
  maxScore: number,
  usedNames: Set<string>,
  teamIndex: number
): string {
  const ratio = maxScore > 0 ? teamScore / maxScore : 0;
  
  let tier: keyof typeof TEAM_NAMES_BY_TIER;
  if (ratio >= 0.9) tier = "legendary";
  else if (ratio >= 0.75) tier = "champion";
  else if (ratio >= 0.55) tier = "strong";
  else if (ratio >= 0.35) tier = "solid";
  else tier = "rising";
  
  const tierNames = TEAM_NAMES_BY_TIER[tier];
  
  // Find an unused name from this tier
  for (const name of tierNames) {
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  
  // Fallback: try other tiers
  const allTiers: (keyof typeof TEAM_NAMES_BY_TIER)[] = ["legendary", "champion", "strong", "solid", "rising"];
  for (const t of allTiers) {
    for (const name of TEAM_NAMES_BY_TIER[t]) {
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
    }
  }
  
  // Ultimate fallback
  return `Squad ${teamIndex + 1}`;
}

/**
 * Aggregate team stats across all sessions
 * Only counts teams with exactly 2 players (doubles format)
 */
function aggregateTeamStats(sessions: TeamSession[]): Map<string, TeamStats> {
  const teamMap = new Map<string, TeamStats>();

  sessions.forEach(session => {
    // Process both teams in this session
    const teamsToProcess = [
      { ids: session.team_front, position: "front" as const },
      { ids: session.team_back, position: "back" as const },
    ];

    teamsToProcess.forEach(({ ids, position }) => {
      // Only count teams with exactly 2 players (doubles format)
      if (!ids || ids.length !== 2) return;
      
      const teamKey = normalizeTeamKey(ids);
      
      if (!teamMap.has(teamKey)) {
        teamMap.set(teamKey, {
          playerIds: [...ids].sort((a, b) => a - b),
          totalSwings: 0,
          totalDistance: 0,
          maxSprint: 0,
          maxSprintPlayerId: 0,
          totalActivityScore: 0,
          avgActivityScore: 0,
          sessionsOnFront: 0,
          sessionsOnBack: 0,
          playerStats: new Map(),
        });
      }

      const teamStats = teamMap.get(teamKey)!;
      
      // Update position counts
      if (position === "front") {
        teamStats.sessionsOnFront++;
      } else {
        teamStats.sessionsOnBack++;
      }

      // Aggregate player stats for this team
      ids.forEach(playerId => {
        const playerData = session.players.find(p => p.player_id === playerId);
        if (!playerData) return;

        teamStats.totalSwings += playerData.swing_count;
        teamStats.totalDistance += playerData.covered_distance;
        teamStats.totalActivityScore += playerData.activity_score;

        if (playerData.fastest_sprint > teamStats.maxSprint) {
          teamStats.maxSprint = playerData.fastest_sprint;
          teamStats.maxSprintPlayerId = playerId;
        }

        // Aggregate per-player stats
        if (!teamStats.playerStats.has(playerId)) {
          teamStats.playerStats.set(playerId, {
            swingCount: 0,
            distance: 0,
            fastestSprint: 0,
            activityScore: 0,
          });
        }
        const pStats = teamStats.playerStats.get(playerId)!;
        pStats.swingCount += playerData.swing_count;
        pStats.distance += playerData.covered_distance;
        pStats.fastestSprint = Math.max(pStats.fastestSprint, playerData.fastest_sprint);
        pStats.activityScore += playerData.activity_score;
      });
    });
  });

  // Calculate averages
  teamMap.forEach(team => {
    if (team.playerIds.length > 0) {
      team.avgActivityScore = team.totalActivityScore / team.playerIds.length;
    }
  });

  return teamMap;
}

export function TeamsTab({ result, portraits, playerDisplayNames }: TeamsTabProps) {
  const teamSessions = result?.team_sessions || [];

  // Aggregate team stats and assign names
  const teams = useMemo(() => {
    if (!teamSessions.length) return [];
    const teamMap = aggregateTeamStats(teamSessions);
    const teamsArray = Array.from(teamMap.entries()).map(([key, stats], index) => ({
      key,
      index,
      ...stats,
      // Calculate overall score for naming (normalized combination of metrics)
      overallScore: stats.totalSwings + stats.totalDistance / 10 + stats.maxSprint * 5 + stats.totalActivityScore,
    }));
    
    // Find max score for relative naming
    const maxScore = Math.max(...teamsArray.map(t => t.overallScore), 1);
    
    // Assign names based on strength, avoiding duplicates
    const usedNames = new Set<string>();
    
    // Sort by score descending to assign best names to best teams first
    const sortedByScore = [...teamsArray].sort((a, b) => b.overallScore - a.overallScore);
    const nameMap = new Map<string, string>();
    
    sortedByScore.forEach((team, idx) => {
      const name = getTeamName(team.overallScore, maxScore, usedNames, idx);
      nameMap.set(team.key, name);
    });
    
    // Return in original order with names attached
    return teamsArray.map(team => ({
      ...team,
      teamName: nameMap.get(team.key) || `Team ${team.index + 1}`,
    }));
  }, [teamSessions]);

  if (teams.length === 0) {
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
          <Text size="3" color="gray">No team data available yet</Text>
          <Text size="2" color="gray">
            Team statistics will appear here once the analysis is complete
          </Text>
        </Flex>
      </Box>
    );
  }

  // Calculate max values for comparison rings
  const maxSwings = Math.max(...teams.map(t => t.totalSwings));
  const maxDistance = Math.max(...teams.map(t => t.totalDistance));
  const maxSprint = Math.max(...teams.map(t => t.maxSprint));
  const maxActivity = Math.max(...teams.map(t => t.totalActivityScore));
  const maxOverallScore = Math.max(...teams.map(t => t.overallScore));

  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      {/* Team Comparison Grid */}
      <Grid columns={{ initial: "1", md: "2" }} gap="4" mb="4">
        {teams.map((team, idx) => {
          const colors = idx === 0 ? TEAM_COLORS.team1 : TEAM_COLORS.team2;
          const gradient = idx === 0 ? PURPLE_GRADIENT : AMBER_GRADIENT;
          
          return (
            <TeamCard
              key={team.key}
              team={team}
              teamIndex={idx + 1}
              colors={colors}
              gradient={gradient}
              portraits={portraits}
              playerDisplayNames={playerDisplayNames}
              maxSwings={maxSwings}
              maxDistance={maxDistance}
              maxSprint={maxSprint}
              maxActivity={maxActivity}
              maxOverallScore={maxOverallScore}
            />
          );
        })}
      </Grid>

      {/* Head-to-Head Comparison */}
      {teams.length >= 2 && (
        <HeadToHeadComparison
          team1={teams[0]}
          team2={teams[1]}
          playerDisplayNames={playerDisplayNames}
        />
      )}
    </Box>
  );
}

interface TeamCardProps {
  team: TeamStats & { key: string; index: number; teamName: string; overallScore: number };
  teamIndex: number;
  colors: typeof TEAM_COLORS.team1;
  gradient: ProgressRingGradient;
  portraits: Record<number, string>;
  playerDisplayNames: Record<number, string>;
  maxSwings: number;
  maxDistance: number;
  maxSprint: number;
  maxActivity: number;
  maxOverallScore: number;
}

function TeamCard({
  team,
  teamIndex,
  colors,
  gradient,
  portraits,
  playerDisplayNames,
  maxSwings,
  maxDistance,
  maxSprint,
  maxActivity,
  maxOverallScore,
}: TeamCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate athletic performance percentage
  const athleticPerformance = maxOverallScore > 0 
    ? Math.round((team.overallScore / maxOverallScore) * 100) 
    : 0;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100 + teamIndex * 150);
    return () => clearTimeout(timer);
  }, [teamIndex]);

  return (
    <Card
      ref={cardRef}
      style={{
        border: `2px solid ${colors.border}`,
        background: colors.bg,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <Flex direction="column" gap="4" p="4">
        {/* Team Header */}
        <Flex align="center" justify="between">
          <Flex align="center" gap="3">
            <Box
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[1]})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 12px ${colors.primary}40`,
              }}
            >
              <Text size="5" weight="bold" style={{ color: "white" }}>
                {teamIndex}
              </Text>
            </Box>
            <Flex direction="column" gap="0">
              <Text size="1" color="gray">Team {teamIndex}</Text>
              <Heading size="4" weight="bold" style={{ color: colors.text }}>
                {team.teamName}
              </Heading>
            </Flex>
          </Flex>
          
          {/* Athletic Performance Badge */}
          <Flex 
            direction="column" 
            align="center" 
            gap="0"
            style={{
              padding: "8px 12px",
              background: `linear-gradient(135deg, ${colors.gradient[0]}20, ${colors.gradient[1]}30)`,
              borderRadius: "var(--radius-3)",
              border: `1px solid ${colors.border}`,
            }}
          >
            <Text size="1" color="gray" style={{ whiteSpace: "nowrap" }}>Athletic Performance</Text>
            <Text 
              size="5" 
              weight="bold" 
              style={{ 
                color: colors.text, 
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.2,
              }}
            >
              {athleticPerformance}%
            </Text>
          </Flex>
          
          {/* Player Portraits */}
          <Flex gap="-2">
            {team.playerIds.map((playerId, idx) => (
              <Box
                key={playerId}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: `3px solid ${colors.accent}`,
                  backgroundColor: colors.bg,
                  marginLeft: idx > 0 ? -12 : 0,
                  zIndex: team.playerIds.length - idx,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {portraits[playerId] ? (
                  <img
                    src={portraits[playerId]}
                    alt={playerDisplayNames[playerId] || `Player ${playerId}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "top",
                    }}
                  />
                ) : (
                  <Text size="2" weight="bold" style={{ color: colors.text }}>
                    {(playerDisplayNames[playerId] || `P${playerId}`).charAt(0)}
                  </Text>
                )}
              </Box>
            ))}
          </Flex>
        </Flex>

        {/* Player Names */}
        <Text size="2" color="gray" style={{ textAlign: "center" }}>
          {team.playerIds.map(id => playerDisplayNames[id] || `Player ${id}`).join(" & ")}
        </Text>

        <Separator size="4" style={{ opacity: 0.3 }} />

        {/* Stats Rings */}
        <Grid columns="4" gap="4" style={{ justifyItems: "center", padding: "8px 0" }}>
          <ProgressRing
            value={team.totalSwings}
            maxValue={maxSwings}
            isVisible={isVisible}
            playerId={teamIndex}
            gradient={gradient}
            icon="🏓"
            unit="Swings"
            size={90}
            strokeWidth={7}
            hideMedalDisplay
          />
          <ProgressRing
            value={Math.round(team.totalDistance)}
            maxValue={Math.round(maxDistance)}
            isVisible={isVisible}
            playerId={teamIndex + 10}
            gradient={gradient}
            icon="🏃"
            unit="Distance (m)"
            size={90}
            strokeWidth={7}
            hideMedalDisplay
          />
          <ProgressRing
            value={Math.round(team.maxSprint * 10) / 10}
            maxValue={Math.round(maxSprint * 10) / 10}
            isVisible={isVisible}
            playerId={teamIndex + 20}
            gradient={gradient}
            icon="⚡"
            unit="Top Sprint"
            size={90}
            strokeWidth={7}
            hideMedalDisplay
          />
          <ProgressRing
            value={Math.round(team.totalActivityScore)}
            maxValue={Math.round(maxActivity)}
            isVisible={isVisible}
            playerId={teamIndex + 30}
            gradient={gradient}
            icon="🔥"
            unit="Activity"
            size={90}
            strokeWidth={7}
            hideMedalDisplay
          />
        </Grid>

        <Separator size="4" style={{ opacity: 0.3 }} />

        {/* Position Stats */}
        <Flex justify="center" gap="4">
          <StatBadge 
            label="Front Court" 
            value={team.sessionsOnFront} 
            color={colors.text}
          />
          <StatBadge 
            label="Back Court" 
            value={team.sessionsOnBack} 
            color={colors.text}
          />
        </Flex>

        {/* Individual Player Breakdown */}
        <Box style={{ marginTop: 8 }}>
          <Text size="2" weight="medium" color="gray" style={{ marginBottom: 8, display: "block" }}>
            Individual Contributions
          </Text>
          <Grid columns="2" gap="2">
            {Array.from(team.playerStats.entries()).map(([playerId, stats]) => (
              <PlayerMiniCard
                key={playerId}
                playerId={playerId}
                stats={stats}
                portrait={portraits[playerId]}
                displayName={playerDisplayNames[playerId] || `Player ${playerId}`}
                teamTotal={team}
                colors={colors}
              />
            ))}
          </Grid>
        </Box>
      </Flex>
    </Card>
  );
}

function StatBadge({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <Flex 
      align="center" 
      gap="2" 
      style={{ 
        padding: "8px 16px", 
        background: "var(--gray-a3)", 
        borderRadius: "var(--radius-3)",
      }}
    >
      <Flex direction="column" gap="0">
        <Text size="1" color="gray">{label}</Text>
        <Text size="3" weight="bold" style={{ color, fontVariantNumeric: "tabular-nums" }}>
          {value} {value === 1 ? "session" : "sessions"}
        </Text>
      </Flex>
    </Flex>
  );
}

interface PlayerMiniCardProps {
  playerId: number;
  stats: {
    swingCount: number;
    distance: number;
    fastestSprint: number;
    activityScore: number;
  };
  portrait?: string;
  displayName: string;
  teamTotal: TeamStats;
  colors: typeof TEAM_COLORS.team1;
}

function PlayerMiniCard({ 
  playerId, 
  stats, 
  portrait, 
  displayName, 
  teamTotal, 
  colors 
}: PlayerMiniCardProps) {
  const swingContribution = teamTotal.totalSwings > 0 
    ? Math.round((stats.swingCount / teamTotal.totalSwings) * 100) 
    : 0;
  const distanceContribution = teamTotal.totalDistance > 0 
    ? Math.round((stats.distance / teamTotal.totalDistance) * 100) 
    : 0;

  return (
    <Flex
      gap="3"
      align="center"
      style={{
        padding: "10px 12px",
        background: "var(--gray-a2)",
        borderRadius: "var(--radius-3)",
        border: "1px solid var(--gray-4)",
      }}
    >
      <Box
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          overflow: "hidden",
          border: `2px solid ${colors.accent}`,
          backgroundColor: colors.bg,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {portrait ? (
          <img
            src={portrait}
            alt={displayName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top",
            }}
          />
        ) : (
          <Text size="1" weight="bold" style={{ color: colors.text }}>
            {displayName.charAt(0)}
          </Text>
        )}
      </Box>
      <Flex direction="column" gap="0" style={{ flex: 1, minWidth: 0 }}>
        <Text 
          size="2" 
          weight="medium" 
          style={{ 
            whiteSpace: "nowrap", 
            overflow: "hidden", 
            textOverflow: "ellipsis" 
          }}
        >
          {displayName}
        </Text>
        <Flex gap="3">
          <Text size="1" color="gray">
            {stats.swingCount} swings ({swingContribution}%)
          </Text>
        </Flex>
      </Flex>
    </Flex>
  );
}

interface HeadToHeadComparisonProps {
  team1: TeamStats & { key: string; index: number; teamName: string };
  team2: TeamStats & { key: string; index: number; teamName: string };
  playerDisplayNames: Record<number, string>;
}

function HeadToHeadComparison({ team1, team2, playerDisplayNames }: HeadToHeadComparisonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const comparisons = [
    {
      label: "Total Swings",
      icon: "🏓",
      team1Value: team1.totalSwings,
      team2Value: team2.totalSwings,
      format: (v: number) => v.toString(),
    },
    {
      label: "Distance Covered",
      icon: "🏃",
      team1Value: team1.totalDistance,
      team2Value: team2.totalDistance,
      format: (v: number) => `${Math.round(v)}m`,
    },
    {
      label: "Top Sprint Speed",
      icon: "⚡",
      team1Value: team1.maxSprint,
      team2Value: team2.maxSprint,
      format: (v: number) => `${v.toFixed(1)} km/h`,
    },
    {
      label: "Activity Score",
      icon: "🔥",
      team1Value: team1.totalActivityScore,
      team2Value: team2.totalActivityScore,
      format: (v: number) => Math.round(v).toString(),
    },
  ];

  return (
    <Card
      style={{
        border: "1px solid var(--gray-5)",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <Flex direction="column" gap="4" p="4">
        <Heading size="4" weight="medium" style={{ textAlign: "center" }}>
          ⚔️ Head-to-Head Comparison
        </Heading>

        <Flex direction="column" gap="3">
          {comparisons.map((comp, idx) => {
            const team1Wins = comp.team1Value > comp.team2Value;
            const team2Wins = comp.team2Value > comp.team1Value;
            const tie = comp.team1Value === comp.team2Value;
            const total = comp.team1Value + comp.team2Value;
            const team1Percent = total > 0 ? (comp.team1Value / total) * 100 : 50;

            return (
              <Box key={idx}>
                <Flex justify="between" align="center" mb="1">
                  <Flex align="center" gap="2">
                    <Text style={{ fontSize: 16 }}>{comp.icon}</Text>
                    <Text size="2" color="gray">{comp.label}</Text>
                  </Flex>
                  {!tie && (
                    <Text 
                      size="1" 
                      style={{ 
                        color: team1Wins ? TEAM_COLORS.team1.text : TEAM_COLORS.team2.text,
                        fontWeight: 600,
                      }}
                    >
                      {team1Wins ? team1.teamName : team2.teamName} leads
                    </Text>
                  )}
                </Flex>
                
                <Flex align="center" gap="2">
                  <Text 
                    size="2" 
                    weight={team1Wins ? "bold" : "regular"}
                    style={{ 
                      color: team1Wins ? TEAM_COLORS.team1.text : "var(--gray-11)",
                      minWidth: 70,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {comp.format(comp.team1Value)}
                  </Text>
                  
                  <Box style={{ flex: 1, position: "relative", height: 8 }}>
                    <Box
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "var(--gray-4)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${team1Percent}%`,
                          background: `linear-gradient(90deg, ${TEAM_COLORS.team1.gradient[0]}, ${TEAM_COLORS.team1.gradient[1]})`,
                          borderRadius: "4px 0 0 4px",
                          transition: "width 0.6s ease-out",
                        }}
                      />
                      <Box
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: `${100 - team1Percent}%`,
                          background: `linear-gradient(90deg, ${TEAM_COLORS.team2.gradient[0]}, ${TEAM_COLORS.team2.gradient[1]})`,
                          borderRadius: "0 4px 4px 0",
                          transition: "width 0.6s ease-out",
                        }}
                      />
                    </Box>
                  </Box>
                  
                  <Text 
                    size="2" 
                    weight={team2Wins ? "bold" : "regular"}
                    style={{ 
                      color: team2Wins ? TEAM_COLORS.team2.text : "var(--gray-11)",
                      minWidth: 70,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {comp.format(comp.team2Value)}
                  </Text>
                </Flex>
              </Box>
            );
          })}
        </Flex>

        {/* Winner Summary */}
        <Separator size="4" style={{ opacity: 0.3 }} />
        <WinnerSummary team1={team1} team2={team2} />
      </Flex>
    </Card>
  );
}

function WinnerSummary({ team1, team2 }: { team1: TeamStats & { teamName: string }; team2: TeamStats & { teamName: string } }) {
  let team1Wins = 0;
  let team2Wins = 0;

  if (team1.totalSwings > team2.totalSwings) team1Wins++; else if (team2.totalSwings > team1.totalSwings) team2Wins++;
  if (team1.totalDistance > team2.totalDistance) team1Wins++; else if (team2.totalDistance > team1.totalDistance) team2Wins++;
  if (team1.maxSprint > team2.maxSprint) team1Wins++; else if (team2.maxSprint > team1.maxSprint) team2Wins++;
  if (team1.totalActivityScore > team2.totalActivityScore) team1Wins++; else if (team2.totalActivityScore > team1.totalActivityScore) team2Wins++;

  const isTie = team1Wins === team2Wins;
  const winnerTeam = team1Wins > team2Wins ? team1 : team2;
  const winnerColors = team1Wins > team2Wins ? TEAM_COLORS.team1 : TEAM_COLORS.team2;

  return (
    <Flex 
      justify="center" 
      align="center" 
      gap="3"
      style={{
        padding: "16px",
        background: isTie ? "var(--gray-a3)" : winnerColors.bg,
        borderRadius: "var(--radius-3)",
        border: isTie ? "1px solid var(--gray-5)" : `2px solid ${winnerColors.border}`,
      }}
    >
      {isTie ? (
        <>
          <Text style={{ fontSize: 24 }}>🤝</Text>
          <Text size="3" weight="bold" color="gray">
            It's a tie! Both teams performed equally
          </Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 28 }}>🏆</Text>
          <Flex direction="column" gap="0">
            <Text 
              size="4" 
              weight="bold" 
              style={{ color: winnerColors.text }}
            >
              {winnerTeam.teamName} Takes the Lead!
            </Text>
            <Text size="2" color="gray">
              Winning {Math.max(team1Wins, team2Wins)} out of 4 categories
            </Text>
          </Flex>
        </>
      )}
    </Flex>
  );
}

