/**
 * Tactical Analysis Types
 * 
 * Types for AI-powered tactical analysis of shot patterns, serve data, etc.
 * Used by the tactical analysis hook and API route.
 */

/**
 * Ball sequence types in rally analysis
 */
export type BallSequenceType = 
  | "serve"       // 1st ball
  | "return"      // 2nd ball  
  | "third-ball"  // 3rd ball (server's first after return)
  | "fourth-ball" // 4th ball (returner's second)
  | "fifth-ball"  // 5th ball (server's second after serve)
  | "all-shots";  // All shots combined (for overview analysis)

/**
 * Shot placement zone on court grid
 */
export interface CourtZone {
  col: number;
  row: number;
  count: number;
}

/**
 * Shot trajectory from origin to landing
 */
export interface ShotTrajectory {
  originCol: number;
  originRow: number;
  landingCol: number;
  landingRow: number;
  swingType: string;
  speed: number;
}

/**
 * Player shot data for tactical analysis
 */
export interface PlayerTacticalData {
  playerId: number;
  playerName: string;
  totalShots: number;
  avgSpeed: number;
  topSpeed: number;
  
  // Court zones (12x6 grid representing court)
  originZones: CourtZone[];    // Where shots are taken from
  targetZones: CourtZone[];    // Where shots land
  
  // Shot breakdown by type
  shotTypeBreakdown: Record<string, {
    count: number;
    avgSpeed: number;
    topSpeed: number;
  }>;
  
  // Trajectories
  trajectories: ShotTrajectory[];
}

/**
 * Single ball type analysis data
 */
export interface BallTypeAnalysisData {
  ballType: BallSequenceType;
  ballLabel: string;
  playerData: PlayerTacticalData;
}

/**
 * Request payload for tactical analysis API
 */
export interface TacticalAnalysisRequest {
  /** Type of ball in sequence (serve, return, third-ball, etc.) */
  ballType: BallSequenceType;
  
  /** Human-readable label for the ball type */
  ballLabel: string;
  
  /** Player data for analysis */
  playerData: PlayerTacticalData;
  
  /** Sport context (padel, tennis, pickleball) */
  sport?: string;
  
  /** Optional: Compare against another player */
  comparisonPlayerData?: PlayerTacticalData;
}

/**
 * All ball types data for a single player
 */
export interface PlayerAllBallTypesData {
  playerName: string;
  playerId: number;
  ballTypes: BallTypeAnalysisData[];
}

/**
 * Request payload for multi-ball tactical analysis (Analyse All)
 */
export interface TacticalAnalysisAllRequest {
  /** All players with their ball type data */
  players: PlayerAllBallTypesData[];
  
  /** Sport context (padel, tennis, pickleball) */
  sport?: string;
}

/**
 * Response from tactical analysis API
 */
export interface TacticalAnalysisResponse {
  /** The AI-generated analysis text */
  analysis: string;
  
  /** Model used for analysis */
  modelUsed: string;
  
  /** Whether the response was streamed */
  streamed: boolean;
}

/**
 * State for tactical analysis hook
 */
export interface TacticalAnalysisState {
  isAnalyzing: boolean;
  analysis: string | null;
  error: string | null;
}

/**
 * Convert PlayerShotData from ShotHeatmap to PlayerTacticalData
 */
export function convertToTacticalData(
  data: {
    playerId: number;
    displayName: string;
    totalShots: number;
    avgSpeed: number;
    topSpeed: number;
    origins: number[][];
    landings: number[][];
    pairs: Array<{
      originCol: number;
      originRow: number;
      landingCol: number;
      landingRow: number;
      swingType: string;
      speed: number;
    }>;
    originDetails?: Array<Array<Array<{ swingType: string; speed: number }>>>;
  }
): PlayerTacticalData {
  // Convert origin grid to zones with counts
  const originZones: CourtZone[] = [];
  data.origins.forEach((row, rowIdx) => {
    row.forEach((count, colIdx) => {
      if (count > 0) {
        originZones.push({ col: colIdx, row: rowIdx, count });
      }
    });
  });

  // Convert landing grid to zones with counts
  const targetZones: CourtZone[] = [];
  data.landings.forEach((row, rowIdx) => {
    row.forEach((count, colIdx) => {
      if (count > 0) {
        targetZones.push({ col: colIdx, row: rowIdx, count });
      }
    });
  });

  // Build shot type breakdown from pairs
  const shotTypeBreakdown: Record<string, { count: number; avgSpeed: number; topSpeed: number; speeds: number[] }> = {};
  data.pairs.forEach(pair => {
    const type = pair.swingType || "unknown";
    if (!shotTypeBreakdown[type]) {
      shotTypeBreakdown[type] = { count: 0, avgSpeed: 0, topSpeed: 0, speeds: [] };
    }
    shotTypeBreakdown[type].count++;
    if (pair.speed > 0) {
      shotTypeBreakdown[type].speeds.push(pair.speed);
      shotTypeBreakdown[type].topSpeed = Math.max(shotTypeBreakdown[type].topSpeed, pair.speed);
    }
  });

  // Calculate avg speeds
  const finalBreakdown: Record<string, { count: number; avgSpeed: number; topSpeed: number }> = {};
  Object.entries(shotTypeBreakdown).forEach(([type, stats]) => {
    finalBreakdown[type] = {
      count: stats.count,
      avgSpeed: stats.speeds.length > 0 
        ? Math.round(stats.speeds.reduce((a, b) => a + b, 0) / stats.speeds.length)
        : 0,
      topSpeed: Math.round(stats.topSpeed),
    };
  });

  return {
    playerId: data.playerId,
    playerName: data.displayName,
    totalShots: data.totalShots,
    avgSpeed: Math.round(data.avgSpeed),
    topSpeed: Math.round(data.topSpeed),
    originZones,
    targetZones,
    shotTypeBreakdown: finalBreakdown,
    trajectories: data.pairs.map(p => ({
      originCol: p.originCol,
      originRow: p.originRow,
      landingCol: p.landingCol,
      landingRow: p.landingRow,
      swingType: p.swingType,
      speed: p.speed,
    })),
  };
}

