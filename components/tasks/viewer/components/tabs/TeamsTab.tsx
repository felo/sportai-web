"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Box, Flex, Grid, Text, Card, Heading, Separator, Tooltip } from "@radix-ui/themes";
import { PersonIcon, ChevronLeftIcon, ChevronRightIcon, DoubleArrowRightIcon, RocketIcon, TimerIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import type { StatisticsResult, TeamSession, Player, Swing } from "../../types";
import { ProgressRing, TeamMedalDisplay, OverallMedal } from "../shared";
import type { ProgressRingGradient, EarnedMedal } from "../shared";
import type { PlayerRankings } from "../../hooks/usePlayerRankings";

interface TeamsTabProps {
  result: StatisticsResult | null;
  portraits: Record<number, string>;
  playerDisplayNames: Record<number, string>;
  rankings: PlayerRankings;
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
  maxBallSpeed: number;
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

// Ring gradients for team stats (by team)
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

// Category-specific gradients (matching Player Stats colors)
const SHOTS_GRADIENT: ProgressRingGradient = {
  stops: [
    { offset: "0%", color: "#2DD4BF" },
    { offset: "100%", color: "#14B8A6" },
  ],
};

const POWER_GRADIENT: ProgressRingGradient = {
  stops: [
    { offset: "0%", color: "#F87171" },
    { offset: "100%", color: "#DC2626" },
  ],
};

const DISTANCE_GRADIENT: ProgressRingGradient = {
  stops: [
    { offset: "0%", color: "#60A5FA" },
    { offset: "100%", color: "#7C3AED" },
  ],
};

const SPRINT_GRADIENT: ProgressRingGradient = {
  stops: [
    { offset: "0%", color: "#FBBF24" },
    { offset: "100%", color: "#F97316" },
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
 * Collect medals earned by team members from player rankings
 */
function collectTeamMedals(
  playerIds: number[],
  rankings: PlayerRankings
): EarnedMedal[] {
  const medals: EarnedMedal[] = [];
  
  playerIds.forEach(playerId => {
    const distanceRank = rankings.distanceRankings[playerId];
    const sprintRank = rankings.sprintRankings[playerId];
    const ballSpeedRank = rankings.ballSpeedRankings[playerId];
    const swingsRank = rankings.swingsRankings[playerId];
    
    if (distanceRank && distanceRank <= 3) {
      medals.push({ rank: distanceRank, label: "Distance" });
    }
    if (sprintRank && sprintRank <= 3) {
      medals.push({ rank: sprintRank, label: "Sprint" });
    }
    if (ballSpeedRank && ballSpeedRank <= 3) {
      medals.push({ rank: ballSpeedRank, label: "Power" });
    }
    if (swingsRank && swingsRank <= 3) {
      medals.push({ rank: swingsRank, label: "Activity" });
    }
  });
  
  return medals;
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
          maxBallSpeed: 0,
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

export function TeamsTab({ result, portraits, playerDisplayNames, rankings }: TeamsTabProps) {
  const teamSessions = result?.team_sessions || [];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Get player ball speeds from result
  const playerBallSpeeds = useMemo(() => {
    const speeds: Record<number, number> = {};
    result?.players?.forEach((player: Player) => {
      // Find max ball speed from swings
      const maxSpeed = player.swings?.reduce((max: number, swing: Swing) => {
        return Math.max(max, swing.ball_speed || 0);
      }, 0) || 0;
      speeds[player.player_id] = maxSpeed;
    });
    return speeds;
  }, [result]);

  // Aggregate team stats and calculate team medals
  const teams = useMemo(() => {
    if (!teamSessions.length) return [];
    const teamMap = aggregateTeamStats(teamSessions);
    
    // First pass: collect medals and calculate points, add max ball speed
    const teamsWithMedals = Array.from(teamMap.entries()).map(([key, stats], index) => {
      const teamMedals = collectTeamMedals(stats.playerIds, rankings);
      // Calculate medal points: gold=3, silver=2, bronze=1
      const medalPoints = teamMedals.reduce((sum, m) => {
        if (m.rank === 1) return sum + 3;
        if (m.rank === 2) return sum + 2;
        if (m.rank === 3) return sum + 1;
        return sum;
      }, 0);
      const goldCount = teamMedals.filter(m => m.rank === 1).length;
      
      // Calculate team's max ball speed from players
      const teamMaxBallSpeed = Math.max(
        ...stats.playerIds.map(id => playerBallSpeeds[id] || 0)
      );
      
      return {
        key,
        index,
        ...stats,
        maxBallSpeed: teamMaxBallSpeed,
        teamMedals,
        medalPoints,
        goldCount,
      };
    });
    
    // Sort by medal points to determine ranks, gold count as tiebreaker
    const sorted = [...teamsWithMedals].sort((a, b) => {
      if (b.medalPoints !== a.medalPoints) return b.medalPoints - a.medalPoints;
      return b.goldCount - a.goldCount;
    });
    
    // Assign overall ranks
    const rankMap = new Map<string, number>();
    sorted.forEach((team, idx) => {
      rankMap.set(team.key, idx + 1);
    });
    
    // Return with ranks
    return teamsWithMedals.map(team => ({
      ...team,
      overallRank: rankMap.get(team.key) || team.index + 1,
    }));
  }, [teamSessions, rankings, playerBallSpeeds]);

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
  }, [updateScrollState, teams.length]);

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
  const maxBallSpeedValue = Math.max(...teams.map(t => t.maxBallSpeed));

  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out", position: "relative" }}>
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
            paddingTop: 80,
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
            paddingTop: 80,
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

      {/* Scrollable Team Cards */}
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
          {teams.map((team, idx) => {
            const colors = idx === 0 ? TEAM_COLORS.team1 : TEAM_COLORS.team2;
            
            return (
              <Box key={team.key} style={{ width: 400, flexShrink: 0, height: "100%" }}>
                <TeamCard
                  team={team}
                  teamIndex={idx + 1}
                  colors={colors}
                  portraits={portraits}
                  playerDisplayNames={playerDisplayNames}
                  maxSwings={maxSwings}
                  maxDistance={maxDistance}
                  maxSprint={maxSprint}
                  maxBallSpeed={maxBallSpeedValue}
                />
              </Box>
            );
          })}
        </Flex>
      </Box>

    </Box>
  );
}

interface TeamCardProps {
  team: TeamStats & { 
    key: string; 
    index: number; 
    teamMedals: EarnedMedal[];
    overallRank: number;
  };
  teamIndex: number;
  colors: typeof TEAM_COLORS.team1;
  portraits: Record<number, string>;
  playerDisplayNames: Record<number, string>;
  maxSwings: number;
  maxDistance: number;
  maxSprint: number;
  maxBallSpeed: number;
}

function TeamCard({
  team,
  teamIndex,
  colors,
  portraits,
  playerDisplayNames,
  maxSwings,
  maxDistance,
  maxSprint,
  maxBallSpeed,
}: TeamCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100 + teamIndex * 150);
    return () => clearTimeout(timer);
  }, [teamIndex]);

  return (
    <Card
      ref={cardRef}
      style={{
        border: "1px solid var(--gray-6)",
        height: "100%",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <Flex direction="column" gap="4" p="4">
        {/* Overall Medal - Center Top */}
        <Flex justify="center" style={{ marginBottom: -8 }}>
          <OverallMedal 
            rank={team.overallRank} 
            revealDelay={3500}
            showConfetti={team.overallRank === 1}
            confettiDelay={4500}
          />
        </Flex>

        {/* Team Header - Portraits combined with name */}
        <Flex direction="column" align="center" gap="3">
          {/* Overlapping Portraits */}
          <Flex style={{ position: "relative", height: 72 }}>
            {team.playerIds.map((playerId, idx) => (
              <Box
                key={playerId}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "3px solid var(--mint-9)",
                  backgroundColor: "var(--gray-3)",
                  marginLeft: idx > 0 ? -20 : 0,
                  zIndex: team.playerIds.length - idx,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(45, 212, 191, 0.3)",
                }}
              >
                {portraits[playerId] ? (
                  <Image
                    src={portraits[playerId]}
                    alt={playerDisplayNames[playerId] || `Player ${playerId}`}
                    fill
                    sizes="72px"
                    style={{
                      objectFit: "cover",
                      objectPosition: "top",
                    }}
                  />
                ) : (
                  <Text size="6" weight="bold" style={{ color: "var(--gray-11)" }}>
                    {(playerDisplayNames[playerId] || `P${playerId}`).charAt(0)}
                  </Text>
                )}
              </Box>
            ))}
          </Flex>
          
          {/* Team Name & Player Names */}
          <Flex direction="column" align="center" gap="1">
            <Heading size="4" weight="bold">
              Team {teamIndex}
            </Heading>
            <Text size="2" color="gray">
              {team.playerIds.map(id => playerDisplayNames[id] || `Player ${id}`).join(" & ")}
            </Text>
          </Flex>
        </Flex>

        <Separator size="4" style={{ opacity: 0.3 }} />

        {/* Stats Rings - 2x2 Grid */}
        <Grid columns="2" gap="4" style={{ justifyItems: "center", padding: "12px 0" }}>
          <ProgressRing
            value={team.totalSwings}
            maxValue={maxSwings}
            isVisible={isVisible}
            playerId={teamIndex}
            gradient={SHOTS_GRADIENT}
            icon={<DoubleArrowRightIcon width={14} height={14} />}
            unit="shots"
            size={120}
            strokeWidth={10}
            hideMedalDisplay
            isWinner={team.totalSwings === maxSwings && maxSwings > 0}
            confettiDelay={3250}
          />
          <ProgressRing
            value={Math.round(team.maxBallSpeed)}
            maxValue={Math.round(maxBallSpeed)}
            isVisible={isVisible}
            playerId={teamIndex + 10}
            gradient={POWER_GRADIENT}
            icon={<RocketIcon width={14} height={14} />}
            unit="km/h"
            size={120}
            strokeWidth={10}
            hideMedalDisplay
            isWinner={Math.round(team.maxBallSpeed) === Math.round(maxBallSpeed) && maxBallSpeed > 0}
            confettiDelay={3350}
          />
          <ProgressRing
            value={Math.round(team.totalDistance)}
            maxValue={Math.round(maxDistance)}
            isVisible={isVisible}
            playerId={teamIndex + 20}
            gradient={DISTANCE_GRADIENT}
            icon={<TimerIcon width={14} height={14} />}
            unit="meters"
            size={120}
            strokeWidth={10}
            hideMedalDisplay
            isWinner={Math.round(team.totalDistance) === Math.round(maxDistance) && maxDistance > 0}
            confettiDelay={3450}
          />
          <ProgressRing
            value={Math.round(team.maxSprint * 10) / 10}
            maxValue={Math.round(maxSprint * 10) / 10}
            isVisible={isVisible}
            playerId={teamIndex + 30}
            gradient={SPRINT_GRADIENT}
            icon={<LightningBoltIcon width={14} height={14} />}
            unit="km/h"
            size={120}
            strokeWidth={10}
            hideMedalDisplay
            isWinner={Math.round(team.maxSprint * 10) / 10 === Math.round(maxSprint * 10) / 10 && maxSprint > 0}
            confettiDelay={3550}
          />
        </Grid>

        <Separator size="4" style={{ opacity: 0.3 }} />

        {/* Team Medals Section */}
        <Flex direction="column" align="center" gap="2">
          <Text size="2" weight="medium" color="gray">Team Medals</Text>
          <TeamMedalDisplay earnedMedals={team.teamMedals} />
        </Flex>
      </Flex>
    </Card>
  );
}


