import type { StatisticsResult } from "../../../types";
import type { PlayerRankings } from "../../../hooks/usePlayerRankings";
import type { PlayerProfileData } from "@/types/player-profile";

/**
 * Build player profile data from analysis result
 */
export function buildProfileData(
  result: StatisticsResult,
  rankings: PlayerRankings,
  playerDisplayNames: Record<number, string>
): PlayerProfileData[] {
  const { validPlayers } = rankings;

  return validPlayers.map((player) => {
    const swings = player.swings || [];
    const speeds = swings.map((s) => s.ball_speed).filter((s) => s > 0);

    // Build shot breakdown
    const shotBreakdown: Record<string, { count: number; percentage: number; avgSpeed: number }> =
      {};
    const typeCounts: Record<string, { count: number; speeds: number[] }> = {};

    swings.forEach((swing) => {
      const type = swing.serve ? "serve" : swing.swing_type || "unknown";
      if (!typeCounts[type]) typeCounts[type] = { count: 0, speeds: [] };
      typeCounts[type].count++;
      if (swing.ball_speed > 0) typeCounts[type].speeds.push(swing.ball_speed);
    });

    Object.entries(typeCounts).forEach(([type, data]) => {
      shotBreakdown[type] = {
        count: data.count,
        percentage: swings.length > 0 ? (data.count / swings.length) * 100 : 0,
        avgSpeed:
          data.speeds.length > 0
            ? data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length
            : 0,
      };
    });

    return {
      playerId: player.player_id,
      playerName: playerDisplayNames[player.player_id] || `Player ${player.displayIndex}`,
      stats: {
        totalSwings: swings.length,
        avgBallSpeed:
          speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
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



