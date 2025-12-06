import { StatisticsResult, BallBounce } from "../../../../types";
import { formatSwingType } from "../../../../utils";
import { getSwingTypeColor } from "../../../../constants";
import type { SummaryStats, SwingTypeData, BounceCounts } from "../types";

interface StatsInput {
  result: StatisticsResult;
  enhancedBallBounces: BallBounce[];
}

/**
 * Calculate all summary statistics from raw result data.
 * Extracted from SummaryTab to keep the component focused on rendering.
 */
export function calculateSummaryStats({ result, enhancedBallBounces }: StatsInput): SummaryStats {
  const players = result.players || [];
  const rallies = result.rallies || [];
  const teamSessions = result.team_sessions || [];
  const filteredPlayers = players.filter((p) => p.swing_count >= 10);
  const totalSwings = filteredPlayers.reduce((sum, p) => sum + p.swing_count, 0);
  const bounceCount = enhancedBallBounces?.length ?? result.ball_bounces?.length ?? 0;

  // Calculate team count from team_sessions
  const uniqueTeams = new Set<string>();
  teamSessions.forEach(session => {
    if (session.team_front?.length === 2) {
      uniqueTeams.add(JSON.stringify([...session.team_front].sort((a, b) => a - b)));
    }
    if (session.team_back?.length === 2) {
      uniqueTeams.add(JSON.stringify([...session.team_back].sort((a, b) => a - b)));
    }
  });
  const teamCount = uniqueTeams.size;

  // Rally statistics
  const totalRallyDuration = rallies.reduce((sum, [start, end]) => sum + (end - start), 0);
  const avgRallyDuration = rallies.length > 0 ? totalRallyDuration / rallies.length : 0;
  const avgShotsPerRally = rallies.length > 0 ? totalSwings / rallies.length : 0;
  const avgRallyIntensity = totalRallyDuration > 0 ? totalSwings / totalRallyDuration : 0;

  // Max rally intensity
  const maxRallyIntensity = rallies.reduce((max, [start, end]) => {
    const duration = end - start;
    if (duration <= 0) return max;
    const shotsInRally = filteredPlayers.reduce((sum, p) => 
      sum + (p.swings?.filter(s => {
        const hitTime = s.ball_hit?.timestamp ?? s.start.timestamp;
        return hitTime >= start && hitTime <= end;
      }).length || 0), 0
    );
    return Math.max(max, shotsInRally / duration);
  }, 0);

  // Distance statistics
  const totalDistanceCovered = filteredPlayers.reduce((sum, p) => sum + (p.covered_distance || 0), 0);
  const avgDistancePerPlayer = filteredPlayers.length > 0 ? totalDistanceCovered / filteredPlayers.length : 0;

  // Sprint statistics
  const allSprints = filteredPlayers.map(p => p.fastest_sprint || 0).filter(s => s > 0);
  const maxSprintSpeed = allSprints.length > 0 ? Math.max(...allSprints) : 0;
  const avgSprintSpeed = allSprints.length > 0 ? allSprints.reduce((a, b) => a + b, 0) / allSprints.length : 0;

  // Ball speed statistics
  const allSpeeds = filteredPlayers.flatMap((p) => p.swings?.map((s) => s.ball_speed) || []).filter((s) => s > 0);
  const maxBallSpeed = allSpeeds.length > 0 ? Math.max(...allSpeeds) : 0;
  const avgBallSpeed = allSpeeds.length > 0 ? allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length : 0;

  // Swing type aggregation
  const aggregatedSwingTypes: Record<string, number> = {};
  let totalSwingCount = 0;
  filteredPlayers.forEach((player) => {
    if (player.swings) {
      player.swings.forEach((swing) => {
        const type = swing.swing_type || "unknown";
        aggregatedSwingTypes[type] = (aggregatedSwingTypes[type] || 0) + 1;
        totalSwingCount++;
      });
    }
  });

  const swingTypeData: SwingTypeData[] = Object.entries(aggregatedSwingTypes)
    .filter(([, count]) => count > 0)
    .map(([type, count], index) => ({
      id: type,
      label: formatSwingType(type),
      value: Math.round((count / totalSwingCount) * 100),
      count,
      color: getSwingTypeColor(type, index),
    }))
    .sort((a, b) => b.value - a.value);

  // Serve/volley counts and speeds
  const serveCount = filteredPlayers.reduce((sum, p) => sum + (p.swings?.filter(s => s.serve).length || 0), 0);
  const volleyCount = filteredPlayers.reduce((sum, p) => sum + (p.swings?.filter(s => s.volley).length || 0), 0);
  const groundStrokeCount = totalSwingCount - serveCount - volleyCount;

  const serveSpeeds = filteredPlayers.flatMap(p => p.swings?.filter(s => s.serve).map(s => s.ball_speed) || []).filter(s => s > 0);
  const maxServeSpeed = serveSpeeds.length > 0 ? Math.max(...serveSpeeds) : 0;
  const avgServeSpeed = serveSpeeds.length > 0 ? serveSpeeds.reduce((a, b) => a + b, 0) / serveSpeeds.length : 0;

  const volleySpeeds = filteredPlayers.flatMap(p => p.swings?.filter(s => s.volley).map(s => s.ball_speed) || []).filter(s => s > 0);
  const maxVolleySpeed = volleySpeeds.length > 0 ? Math.max(...volleySpeeds) : 0;
  const avgVolleySpeed = volleySpeeds.length > 0 ? volleySpeeds.reduce((a, b) => a + b, 0) / volleySpeeds.length : 0;

  const groundStrokeSpeeds = filteredPlayers.flatMap(p => p.swings?.filter(s => !s.serve && !s.volley).map(s => s.ball_speed) || []).filter(s => s > 0);
  const maxGroundStrokeSpeed = groundStrokeSpeeds.length > 0 ? Math.max(...groundStrokeSpeeds) : 0;
  const avgGroundStrokeSpeed = groundStrokeSpeeds.length > 0 ? groundStrokeSpeeds.reduce((a, b) => a + b, 0) / groundStrokeSpeeds.length : 0;

  // Bounce categorization
  const bounceCounts: BounceCounts = { floor: 0, wall: 0, swing: 0, other: 0 };
  enhancedBallBounces.forEach((bounce) => {
    if (bounce.type === "swing" || bounce.type === "inferred_swing") {
      bounceCounts.swing++;
    } else if (bounce.type === "inferred_wall" || bounce.type === "inferred_back") {
      bounceCounts.wall++;
    } else if (bounce.type === "inferred" || bounce.type === "floor") {
      bounceCounts.floor++;
    } else {
      bounceCounts.other++;
    }
  });

  return {
    teamCount,
    ralliesCount: rallies.length,
    totalSwings,
    totalDistanceCovered,
    totalRallyDuration,
    avgDistancePerPlayer,
    avgRallyDuration,
    avgShotsPerRally,
    avgRallyIntensity,
    maxRallyIntensity,
    maxSprintSpeed,
    avgSprintSpeed,
    maxBallSpeed,
    avgBallSpeed,
    serveCount,
    volleyCount,
    groundStrokeCount,
    totalSwingCount,
    maxServeSpeed,
    avgServeSpeed,
    maxVolleySpeed,
    avgVolleySpeed,
    maxGroundStrokeSpeed,
    avgGroundStrokeSpeed,
    hasSwingData: swingTypeData.length > 0,
    hasSpeedData: allSpeeds.length > 0,
    hasSprintData: allSprints.length > 0,
    swingTypeData,
    bounceCounts,
    bounceCount,
  };
}

