import { useMemo } from "react";
import { StatisticsResult, SwingWithPlayer, BallBounce } from "../types";
import { getDynamicSwingsThreshold } from "../constants";
import {
  PlayerShotData,
  CellShotInfo,
  createEmptyGrid,
  createEmptyDetailsGrid,
  courtPosToGrid,
  COURT,
  GRID_COLS,
  GRID_ROWS
} from "../components/ShotHeatmap";

interface UseShotAnalysisOptions {
  result: StatisticsResult | null;
  playerDisplayNames?: Record<number, string>;
}

// Helper to normalize shot direction (all go left → right)
function normalizeShotPair(
  origin: { col: number; row: number },
  landing: { col: number; row: number }
): { origin: { col: number; row: number }; landing: { col: number; row: number } } {
  if (origin.col > landing.col) {
    return {
      origin: { col: GRID_COLS - 1 - origin.col, row: GRID_ROWS - 1 - origin.row },
      landing: { col: GRID_COLS - 1 - landing.col, row: GRID_ROWS - 1 - landing.row },
    };
  }
  return { origin, landing };
}

// Fallback: infer shot origin from landing position (used when no ball_hit_location)
function inferOriginFromLanding(landingX: number, landingY: number): { col: number; row: number } {
  // Assume player is on opposite side of net from where ball landed
  const landsOnNearSide = landingY < COURT.netPosition;
  // Place origin at service line area, not extreme baseline
  const originY = landsOnNearSide ? COURT.length - 4 : 4; // ~4m from baseline
  const mirroredX = COURT.width - landingX;
  return courtPosToGrid(mirroredX, originY);
}

// Check if player origin position is within court bounds
// Only filter extreme anomalies (positions outside the court)
function isValidOriginPosition(originX: number, originY: number): boolean {
  // Court is 10m wide (X: 0-10) and 20m long (Y: 0-20)
  // Allow some tolerance for positions near walls
  return originX >= -1 && originX <= COURT.width + 1 &&
         originY >= -1 && originY <= COURT.length + 1;
}

// Helper to process a swing and find its landing
// Uses ball_hit_location from the swing (player position when ball was hit)
function processSwingLanding(
  swing: SwingWithPlayer,
  ballBounces: BallBounce[],
  playerData: PlayerShotData
): void {
  const shotTime = swing.ball_hit?.timestamp ?? swing.start.timestamp;

  const nextBounce = ballBounces.find(b =>
    b.timestamp > shotTime &&
    b.timestamp < shotTime + 3
  );

  if (nextBounce && nextBounce.court_pos) {
    const landingX = nextBounce.court_pos[0];
    const landingY = nextBounce.court_pos[1];

    let landing = courtPosToGrid(landingX, landingY);
    let origin: { col: number; row: number };

    // Use ball_hit_location from swing (player's court position when hitting)
    // This is the exact position from the API: [X, Y] in meters
    if (swing.ball_hit_location) {
      const [hitX, hitY] = swing.ball_hit_location;

      // Only filter extreme anomalies (positions outside court bounds)
      if (!isValidOriginPosition(hitX, hitY)) {
        return; // Skip shots with invalid positions
      }

      origin = courtPosToGrid(hitX, hitY);
    } else {
      // Fallback to inference if ball_hit_location not available
      origin = inferOriginFromLanding(landingX, landingY);
    }

    const normalized = normalizeShotPair(origin, landing);
    origin = normalized.origin;
    landing = normalized.landing;

    const swingType = swing.swing_type || "unknown";
    const speed = swing.ball_speed || 0;

    playerData.origins[origin.row][origin.col]++;
    playerData.landings[landing.row][landing.col]++;

    // Add cell details for tooltips
    playerData.originDetails[origin.row][origin.col].push({
      swingType,
      speed,
      isOrigin: true,
    });
    playerData.landingDetails[landing.row][landing.col].push({
      swingType,
      speed,
      isOrigin: false,
    });

    playerData.pairs.push({
      originCol: origin.col,
      originRow: origin.row,
      landingCol: landing.col,
      landingRow: landing.row,
      swingType,
      speed,
    });
    playerData.totalShots++;

    if (speed > 0) {
      playerData.topSpeed = Math.max(playerData.topSpeed, speed);
    }
  }
}

// Initialize player data map
function initializePlayerDataMap(
  validPlayers: Array<{ player_id: number; swing_count: number }>,
  playerDisplayNames: Record<number, string>
): Record<number, PlayerShotData> {
  const dataMap: Record<number, PlayerShotData> = {};

  validPlayers.forEach((player, idx) => {
    const playerIndex = idx + 1;
    const displayName = playerDisplayNames[player.player_id] || `Player ${playerIndex}`;

    dataMap[player.player_id] = {
      playerId: player.player_id,
      playerIndex,
      displayName,
      origins: createEmptyGrid(),
      landings: createEmptyGrid(),
      pairs: [],
      originDetails: createEmptyDetailsGrid(),
      landingDetails: createEmptyDetailsGrid(),
      avgSpeed: 0,
      topSpeed: 0,
      totalShots: 0,
    };
  });

  return dataMap;
}

// Calculate average speeds from swings
function calculateAverageSpeeds(
  dataMap: Record<number, PlayerShotData>,
  swings: SwingWithPlayer[]
): void {
  Object.values(dataMap).forEach(data => {
    if (data.totalShots > 0) {
      const playerSwings = swings.filter(s => s.player_id === data.playerId);
      const speeds = playerSwings.map(s => s.ball_speed).filter(s => s > 0);
      if (speeds.length > 0) {
        data.avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      }
    }
  });
}

/**
 * Hook to extract serve data
 */
export function useServeData({ result, playerDisplayNames = {} }: UseShotAnalysisOptions): PlayerShotData[] {
  return useMemo(() => {
    if (!result) return [];

    const players = result.players || [];
    const ballBounces = result.ball_bounces || [];

    const threshold = getDynamicSwingsThreshold(players);
    const validPlayers = players
      .filter(p => p.swing_count >= threshold)
      .sort((a, b) => b.swing_count - a.swing_count);

    if (validPlayers.length === 0) return [];

    const dataMap = initializePlayerDataMap(validPlayers, playerDisplayNames);
    const serveSwings: SwingWithPlayer[] = [];

    // Find all serves and process them
    validPlayers.forEach(player => {
      const playerServes = (player.swings || [])
        .filter(s => s.serve)
        .map(s => ({ ...s, player_id: player.player_id }));

      playerServes.forEach(serve => {
        const playerData = dataMap[serve.player_id];
        if (playerData) {
          processSwingLanding(serve, ballBounces, playerData);
          serveSwings.push(serve);
        }
      });
    });

    calculateAverageSpeeds(dataMap, serveSwings);

    return Object.values(dataMap);
  }, [result, playerDisplayNames]);
}

/**
 * Hook to extract return data (shot after serve by different player)
 */
export function useReturnData({ result, playerDisplayNames = {} }: UseShotAnalysisOptions): PlayerShotData[] {
  return useMemo(() => {
    if (!result) return [];

    const players = result.players || [];
    const ballBounces = result.ball_bounces || [];

    const threshold = getDynamicSwingsThreshold(players);
    const validPlayers = players
      .filter(p => p.swing_count >= threshold)
      .sort((a, b) => b.swing_count - a.swing_count);

    if (validPlayers.length === 0) return [];

    // Get all swings sorted by timestamp
    const allSwings: SwingWithPlayer[] = validPlayers
      .flatMap(p => p.swings?.map(s => ({ ...s, player_id: p.player_id })) || [])
      .sort((a, b) => (a.ball_hit?.timestamp ?? a.start.timestamp) - (b.ball_hit?.timestamp ?? b.start.timestamp));

    const dataMap = initializePlayerDataMap(validPlayers, playerDisplayNames);
    const returnSwings: SwingWithPlayer[] = [];

    // Find returns: next swing after serve by different player
    for (let i = 0; i < allSwings.length - 1; i++) {
      const serve = allSwings[i];
      if (!serve.serve) continue;

      for (let j = i + 1; j < allSwings.length; j++) {
        const nextSwing = allSwings[j];
        if (nextSwing.player_id !== serve.player_id) {
          const playerData = dataMap[nextSwing.player_id];
          if (playerData) {
            processSwingLanding(nextSwing, ballBounces, playerData);
            returnSwings.push(nextSwing);
          }
          break;
        }
      }
    }

    calculateAverageSpeeds(dataMap, returnSwings);

    return Object.values(dataMap);
  }, [result, playerDisplayNames]);
}

/**
 * Generic hook to extract Nth ball data from rally sequences
 * Ball 1 = Serve, Ball 2 = Return, Ball 3 = Third ball, etc.
 */
function useNthBallData(
  { result, playerDisplayNames = {} }: UseShotAnalysisOptions,
  ballNumber: number
): PlayerShotData[] {
  return useMemo(() => {
    if (!result || ballNumber < 1) return [];

    const players = result.players || [];
    const ballBounces = result.ball_bounces || [];

    const threshold = getDynamicSwingsThreshold(players);
    const validPlayers = players
      .filter(p => p.swing_count >= threshold)
      .sort((a, b) => b.swing_count - a.swing_count);

    if (validPlayers.length === 0) return [];

    const allSwings: SwingWithPlayer[] = validPlayers
      .flatMap(p => p.swings?.map(s => ({ ...s, player_id: p.player_id })) || [])
      .sort((a, b) => (a.ball_hit?.timestamp ?? a.start.timestamp) - (b.ball_hit?.timestamp ?? b.start.timestamp));

    const dataMap = initializePlayerDataMap(validPlayers, playerDisplayNames);
    const targetSwings: SwingWithPlayer[] = [];

    // Find all rally sequences starting with serves
    for (let i = 0; i < allSwings.length; i++) {
      const serve = allSwings[i];
      if (!serve.serve) continue;

      // Build the rally sequence starting from serve
      const rallySequence: SwingWithPlayer[] = [serve];
      let lastPlayerId = serve.player_id;

      for (let j = i + 1; j < allSwings.length && rallySequence.length < ballNumber; j++) {
        const nextSwing = allSwings[j];
        // Next swing must be by different player (alternating)
        if (nextSwing.player_id !== lastPlayerId) {
          rallySequence.push(nextSwing);
          lastPlayerId = nextSwing.player_id;
        }
      }

      // If we have enough swings, extract the Nth ball
      if (rallySequence.length >= ballNumber) {
        const nthBall = rallySequence[ballNumber - 1];
        const playerData = dataMap[nthBall.player_id];
        if (playerData) {
          processSwingLanding(nthBall, ballBounces, playerData);
          targetSwings.push(nthBall);
        }
      }
    }

    calculateAverageSpeeds(dataMap, targetSwings);

    return Object.values(dataMap);
  }, [result, playerDisplayNames, ballNumber]);
}

/**
 * Hook to extract third ball data (server's first shot after the return)
 */
export function useThirdBallData({ result, playerDisplayNames = {} }: UseShotAnalysisOptions): PlayerShotData[] {
  return useNthBallData({ result, playerDisplayNames }, 3);
}

/**
 * Hook to extract fourth ball data (returner's second shot)
 */
export function useFourthBallData({ result, playerDisplayNames = {} }: UseShotAnalysisOptions): PlayerShotData[] {
  return useNthBallData({ result, playerDisplayNames }, 4);
}

/**
 * Hook to extract fifth ball data (server's second shot after serve)
 */
export function useFifthBallData({ result, playerDisplayNames = {} }: UseShotAnalysisOptions): PlayerShotData[] {
  return useNthBallData({ result, playerDisplayNames }, 5);
}

/**
 * Hook to extract ALL shots data (for summary heatmap)
 */
export function useAllShotsData({ result, playerDisplayNames = {} }: UseShotAnalysisOptions): PlayerShotData[] {
  return useMemo(() => {
    if (!result) return [];

    const players = result.players || [];
    const ballBounces = result.ball_bounces || [];

    const threshold = getDynamicSwingsThreshold(players);
    const validPlayers = players
      .filter(p => p.swing_count >= threshold)
      .sort((a, b) => b.swing_count - a.swing_count);

    if (validPlayers.length === 0) return [];

    const dataMap = initializePlayerDataMap(validPlayers, playerDisplayNames);
    const allSwings: SwingWithPlayer[] = [];

    // Process ALL swings for each player
    validPlayers.forEach(player => {
      const playerSwings = (player.swings || [])
        .map(s => ({ ...s, player_id: player.player_id }));

      playerSwings.forEach(swing => {
        const playerData = dataMap[swing.player_id];
        if (playerData) {
          processSwingLanding(swing, ballBounces, playerData);
          allSwings.push(swing);
        }
      });
    });

    calculateAverageSpeeds(dataMap, allSwings);

    return Object.values(dataMap);
  }, [result, playerDisplayNames]);
}
