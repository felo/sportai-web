import { useMemo } from "react";
import { Player, StatisticsResult } from "../types";
import { PLAYER_CONFIG } from "../constants";

export interface ValidPlayer extends Player {
  displayIndex: number;
  displayName: string;
}

export interface PlayerRankings {
  validPlayers: ValidPlayer[];
  playerDisplayNames: Record<number, string>;
  maxDistanceCovered: number;
  distanceRankings: Record<number, number>;
  maxBallSpeed: number;
  ballSpeedRankings: Record<number, number>;
  maxSprintSpeed: number;
  sprintRankings: Record<number, number>;
  maxSwings: number;
  swingsRankings: Record<number, number>;
}

function calculateRankings(
  values: { playerId: number; value: number }[]
): Record<number, number> {
  const filtered = values.filter(v => v.value > 0);
  filtered.sort((a, b) => b.value - a.value);
  
  const rankings: Record<number, number> = {};
  filtered.forEach((v, index) => {
    if (index < 3) {
      rankings[v.playerId] = index + 1;
    }
  });
  
  return rankings;
}

export function usePlayerRankings(
  result: StatisticsResult | null,
  playerNames: Record<number, string>
): PlayerRankings {
  // Get valid players with display info (filtered by minimum swings)
  const validPlayers = useMemo((): ValidPlayer[] => {
    if (!result || !result.players) return [];
    return result.players
      .filter(p => p.swing_count >= PLAYER_CONFIG.MIN_SWINGS_THRESHOLD)
      .sort((a, b) => b.swing_count - a.swing_count)
      .map((player, index) => ({
        ...player,
        displayIndex: index + 1,
        displayName: playerNames[player.player_id] || `Player ${index + 1}`,
      }));
  }, [result, playerNames]);

  // Create player_id -> displayName mapping for overlays
  const playerDisplayNames = useMemo((): Record<number, string> => {
    const map: Record<number, string> = {};
    validPlayers.forEach(player => {
      map[player.player_id] = player.displayName;
    });
    return map;
  }, [validPlayers]);

  // Calculate max distance covered among all valid players
  const maxDistanceCovered = useMemo(() => {
    if (validPlayers.length === 0) return 0;
    return Math.max(...validPlayers.map(p => p.covered_distance));
  }, [validPlayers]);

  // Calculate distance rankings (1st, 2nd, 3rd)
  const distanceRankings = useMemo((): Record<number, number> => {
    return calculateRankings(
      validPlayers.map(p => ({
        playerId: p.player_id,
        value: p.covered_distance || 0,
      }))
    );
  }, [validPlayers]);

  // Calculate max ball speed among all valid players
  const maxBallSpeed = useMemo(() => {
    if (validPlayers.length === 0) return 0;
    return Math.max(...validPlayers.map(p => {
      if (!p.swings || p.swings.length === 0) return 0;
      return Math.max(...p.swings.map(s => s.ball_speed));
    }));
  }, [validPlayers]);

  // Calculate ball speed rankings
  const ballSpeedRankings = useMemo((): Record<number, number> => {
    return calculateRankings(
      validPlayers.map(p => ({
        playerId: p.player_id,
        value: p.swings && p.swings.length > 0
          ? Math.max(...p.swings.map(s => s.ball_speed))
          : 0,
      }))
    );
  }, [validPlayers]);

  // Calculate max sprint speed
  const maxSprintSpeed = useMemo(() => {
    if (validPlayers.length === 0) return 0;
    return Math.max(...validPlayers.map(p => p.fastest_sprint || 0));
  }, [validPlayers]);

  // Calculate sprint rankings
  const sprintRankings = useMemo((): Record<number, number> => {
    return calculateRankings(
      validPlayers.map(p => ({
        playerId: p.player_id,
        value: p.fastest_sprint || 0,
      }))
    );
  }, [validPlayers]);

  // Calculate max swings
  const maxSwings = useMemo(() => {
    if (validPlayers.length === 0) return 0;
    return Math.max(...validPlayers.map(p => p.swings?.length || 0));
  }, [validPlayers]);

  // Calculate swing count rankings
  const swingsRankings = useMemo((): Record<number, number> => {
    return calculateRankings(
      validPlayers.map(p => ({
        playerId: p.player_id,
        value: p.swings?.length || 0,
      }))
    );
  }, [validPlayers]);

  return {
    validPlayers,
    playerDisplayNames,
    maxDistanceCovered,
    distanceRankings,
    maxBallSpeed,
    ballSpeedRankings,
    maxSprintSpeed,
    sprintRankings,
    maxSwings,
    swingsRankings,
  };
}

// Helper to calculate overall ranking points for a player
export function getOverallRankPoints(
  playerId: number,
  rankings: PlayerRankings
): number {
  const ranks = [
    rankings.distanceRankings[playerId],
    rankings.sprintRankings[playerId],
    rankings.ballSpeedRankings[playerId],
    rankings.swingsRankings[playerId],
  ].filter(r => r !== undefined && r <= 3) as number[];
  
  return ranks.reduce((sum, r) => sum + (4 - r), 0);
}

// Helper to get gold medal count for a player
export function getGoldCount(
  playerId: number,
  rankings: PlayerRankings
): number {
  return [
    rankings.distanceRankings[playerId],
    rankings.sprintRankings[playerId],
    rankings.ballSpeedRankings[playerId],
    rankings.swingsRankings[playerId],
  ].filter(r => r === 1).length;
}

// Sort players alphabetically by name and return with overall rank
export function getSortedPlayersWithOverallRank(
  rankings: PlayerRankings
): Array<ValidPlayer & { overallRank: number }> {
  // First calculate overall ranks based on points (for medal display)
  const playersWithPoints = rankings.validPlayers.map(player => ({
    player,
    points: getOverallRankPoints(player.player_id, rankings),
    goldCount: getGoldCount(player.player_id, rankings),
  }));
  
  // Sort by points to determine ranks
  playersWithPoints.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.goldCount - a.goldCount;
  });
  
  // Assign overall ranks
  const rankMap: Record<number, number> = {};
  playersWithPoints.forEach((p, index) => {
    rankMap[p.player.player_id] = index + 1;
  });
  
  // Now sort alphabetically by displayName for display order
  const sortedAlphabetically = [...rankings.validPlayers].sort((a, b) => 
    a.displayName.localeCompare(b.displayName)
  );

  return sortedAlphabetically.map((player) => ({
    ...player,
    overallRank: rankMap[player.player_id],
  }));
}



