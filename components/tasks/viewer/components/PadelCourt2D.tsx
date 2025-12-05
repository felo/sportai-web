"use client";

import { useMemo } from "react";
import { Box } from "@radix-ui/themes";
import { OVERLAY_COLORS, PLAYER_CONFIG } from "../constants";

// Padel court dimensions in meters (portrait/vertical orientation)
const COURT = {
  length: 20,        // Y axis (vertical) - top to bottom
  width: 10,         // X axis (horizontal) - left to right
  serviceLineFromBack: 3,
  backWallSolid: 4,
};

// Display duration for elements
const DISPLAY_DURATION = 4.0;

// Team Zone Sync - depth zones for each half of the court
// Players should move together (same depth) for good positioning
const DEPTH_ZONES = {
  topHalf: [
    { id: 0, name: "back",  minY: 0,  maxY: 3 },   // Behind service line
    { id: 1, name: "mid",   minY: 3,  maxY: 7 },   // Transition area
    { id: 2, name: "front", minY: 7,  maxY: 10 },  // At net
  ],
  bottomHalf: [
    { id: 0, name: "front", minY: 10, maxY: 13 },  // At net
    { id: 1, name: "mid",   minY: 13, maxY: 17 },  // Transition area
    { id: 2, name: "back",  minY: 17, maxY: 20 },  // Behind service line
  ],
};

// Team Zone Sync colors (traffic light system)
const ZONE_SYNC_COLORS = {
  synced: "#22C55E",      // Green - both players same depth
  transitioning: "#EAB308", // Yellow/Amber - 1 zone apart
  split: "#EF4444",       // Red - 2+ zones apart
};

// Grace period after rally starts before applying team zone sync
// (during serve, players are intentionally split - one at net, one at back)
const SERVE_GRACE_PERIOD = 2.5; // seconds

// Trail colors (same as video overlay)
const TRAIL_COLORS = {
  current: OVERLAY_COLORS.trail.current, // Mint green
  old: OVERLAY_COLORS.trail.old,         // Yellow
};

interface BallBounce {
  timestamp: number;
  court_pos: [number, number]; // Court coordinates (meters or normalized)
  player_id: number;
  type: string;
}

interface PlayerPosition {
  timestamp: number;
  X: number; // Image/video coordinates (normalized 0-1)
  Y: number; // Image/video coordinates (normalized 0-1)
  court_X?: number; // Court position in meters (0-10m width)
  court_Y?: number; // Court position in meters (0-20m length)
}

interface ShotTrajectory {
  from: { x: number; y: number; timestamp: number };
  to: { x: number; y: number; timestamp: number };
}

interface SwingData {
  ball_hit: { timestamp: number };
  ball_hit_location?: [number, number]; // Player court position [X, Y] in meters
  player_id: number;
}

interface PadelCourt2DProps {
  className?: string;
  currentTime?: number;
  ballBounces?: BallBounce[];
  rallies?: [number, number][]; // Rally start/end timestamps - clear traces at rally boundaries
  playerPositions?: Record<string, PlayerPosition[]>; // Keyed by player_id - already in court coords (meters)
  swings?: SwingData[]; // For ball_hit_location (player position when hitting)
  playerDisplayNames?: Record<number, string>; // player_id -> "Player 1", etc.
  showBounces?: boolean;
  showTrajectories?: boolean;
  showPlayers?: boolean;
  showTeamZoneSync?: boolean; // Show team zone sync overlay (traffic light system)
}

// Convert court_pos to court coordinates
// court_pos from ball_bounces is in meters: X (0-10m), Y (0-20m)
function toCourtCoords(pos: [number, number]): { x: number; y: number } {
  return {
    x: pos[0],
    y: pos[1],
  };
}

// Check if position is within court bounds
function isInBounds(x: number, y: number): boolean {
  return x >= 0 && x <= COURT.width && y >= 0 && y <= COURT.length;
}

// Get trail color interpolated between current and old
function getTrailColor(progress: number): string {
  const r = Math.round(TRAIL_COLORS.current.r + (TRAIL_COLORS.old.r - TRAIL_COLORS.current.r) * progress);
  const g = Math.round(TRAIL_COLORS.current.g + (TRAIL_COLORS.old.g - TRAIL_COLORS.current.g) * progress);
  const b = Math.round(TRAIL_COLORS.current.b + (TRAIL_COLORS.old.b - TRAIL_COLORS.current.b) * progress);
  return `rgb(${r}, ${g}, ${b})`;
}

// Calculate point on a quadratic Bezier curve at parameter t (0-1)
function getQuadraticBezierPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number }, // Control point
  p2: { x: number; y: number },
  t: number
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

// Calculate control point for parabolic arc (peak above midpoint)
function getArcControlPoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  arcHeight: number = 2.0 // Height of arc in court meters
): { x: number; y: number } {
  // Midpoint
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  
  // Control point is above the midpoint (negative Y in SVG = up)
  // The arc height is proportional to the distance traveled
  const distance = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
  const heightScale = Math.min(arcHeight, distance * 0.3); // Cap the height
  
  return {
    x: midX,
    y: midY - heightScale, // Negative = up in SVG coordinates
  };
}

// Linear interpolation helper
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Binary search to find bracketing positions and interpolate between them
function findInterpolatedPosition(
  positions: PlayerPosition[], 
  timestamp: number
): { x: number; y: number; timestamp: number } | null {
  if (!positions || positions.length === 0) return null;
  
  let left = 0;
  let right = positions.length - 1;
  
  // Handle edge cases - clamp to first/last position
  if (timestamp <= positions[0].timestamp) {
    const p = positions[0];
    return {
      x: p.court_X ?? p.X * COURT.width,
      y: p.court_Y ?? p.Y * COURT.length,
      timestamp: p.timestamp,
    };
  }
  if (timestamp >= positions[right].timestamp) {
    const p = positions[right];
    return {
      x: p.court_X ?? p.X * COURT.width,
      y: p.court_Y ?? p.Y * COURT.length,
      timestamp: p.timestamp,
    };
  }
  
  // Binary search to find bracketing positions
  while (left < right - 1) {
    const mid = Math.floor((left + right) / 2);
    if (positions[mid].timestamp <= timestamp) {
      left = mid;
    } else {
      right = mid;
    }
  }
  
  // Now positions[left] <= timestamp < positions[right]
  const p1 = positions[left];
  const p2 = positions[right];
  
  // Calculate interpolation factor (0-1)
  const timeDelta = p2.timestamp - p1.timestamp;
  const t = timeDelta > 0 ? (timestamp - p1.timestamp) / timeDelta : 0;
  
  // Get coordinates (prefer court coords, fallback to normalized)
  const x1 = p1.court_X ?? p1.X * COURT.width;
  const y1 = p1.court_Y ?? p1.Y * COURT.length;
  const x2 = p2.court_X ?? p2.X * COURT.width;
  const y2 = p2.court_Y ?? p2.Y * COURT.length;
  
  // Linearly interpolate position
  return {
    x: lerp(x1, x2, t),
    y: lerp(y1, y2, t),
    timestamp: timestamp,
  };
}

// Get player color by index
function getPlayerColor(index: number): string {
  const colors = PLAYER_CONFIG.colors;
  return colors[index % colors.length].primary;
}

// Get depth zone index for a Y position (0 = back, 1 = mid, 2 = front relative to net)
function getDepthZoneIndex(y: number): { half: "top" | "bottom"; zoneIndex: number } | null {
  // Top half (Y: 0-10)
  if (y >= 0 && y < 10) {
    for (const zone of DEPTH_ZONES.topHalf) {
      if (y >= zone.minY && y < zone.maxY) {
        return { half: "top", zoneIndex: zone.id };
      }
    }
  }
  // Bottom half (Y: 10-20)
  if (y >= 10 && y <= 20) {
    for (const zone of DEPTH_ZONES.bottomHalf) {
      if (y >= zone.minY && y < zone.maxY) {
        return { half: "bottom", zoneIndex: zone.id };
      }
    }
    // Edge case: exactly at 20
    if (y === 20) {
      return { half: "bottom", zoneIndex: 2 };
    }
  }
  return null;
}

// Calculate team zone sync status for a pair of players
type TeamSyncStatus = "synced" | "transitioning" | "split" | "unknown";

interface TeamZoneSync {
  status: TeamSyncStatus;
  color: string;
  activeZones: Array<{ minY: number; maxY: number }>;
}

function calculateTeamZoneSync(
  player1Y: number | undefined,
  player2Y: number | undefined
): TeamZoneSync {
  if (player1Y === undefined || player2Y === undefined) {
    return { status: "unknown", color: "transparent", activeZones: [] };
  }

  const zone1 = getDepthZoneIndex(player1Y);
  const zone2 = getDepthZoneIndex(player2Y);

  if (!zone1 || !zone2) {
    return { status: "unknown", color: "transparent", activeZones: [] };
  }

  // Players must be on the same half for team sync to apply
  if (zone1.half !== zone2.half) {
    return { status: "unknown", color: "transparent", activeZones: [] };
  }

  const zoneDiff = Math.abs(zone1.zoneIndex - zone2.zoneIndex);
  const zones = zone1.half === "top" ? DEPTH_ZONES.topHalf : DEPTH_ZONES.bottomHalf;

  // Get the active zone(s) based on player positions
  const zoneIndices = [zone1.zoneIndex, zone2.zoneIndex];
  const minZoneIdx = Math.min(...zoneIndices);
  const maxZoneIdx = Math.max(...zoneIndices);
  
  const activeZones: Array<{ minY: number; maxY: number }> = [];
  for (let i = minZoneIdx; i <= maxZoneIdx; i++) {
    const zone = zones.find(z => z.id === i);
    if (zone) {
      activeZones.push({ minY: zone.minY, maxY: zone.maxY });
    }
  }

  switch (zoneDiff) {
    case 0:
      return { status: "synced", color: ZONE_SYNC_COLORS.synced, activeZones };
    case 1:
      return { status: "transitioning", color: ZONE_SYNC_COLORS.transitioning, activeZones };
    default:
      return { status: "split", color: ZONE_SYNC_COLORS.split, activeZones };
  }
}

export function PadelCourt2D({ 
  className,
  currentTime = 0,
  ballBounces = [],
  rallies = [],
  playerPositions = {},
  swings = [],
  playerDisplayNames = {},
  showBounces = true,
  showTrajectories = true,
  showPlayers = true,
  showTeamZoneSync = false,
}: PadelCourt2DProps) {
  // Court colors
  const courtColor = "#3B5DC9";
  const lineColor = "#ffffff";
  const wallColor = "#1a1a2e";
  const netColor = "#6B7DB3";
  
  const wallThickness = 0.3;
  const lineWidth = 0.05;

  // Find current rally start time (to clear traces when rally starts)
  const currentRallyStart = useMemo(() => {
    for (const [start, end] of rallies) {
      if (currentTime >= start && currentTime <= end) {
        return start;
      }
    }
    return null; // Not in a rally
  }, [rallies, currentTime]);

  // Find shot trajectories: player position (from swing) → floor bounce
  // Uses ball_hit_location from swings (player court position in meters)
  const trajectories = useMemo((): ShotTrajectory[] => {
    if (!showTrajectories) return [];
    
    const shots: ShotTrajectory[] = [];
    
    // Get floor bounces sorted by timestamp
    const floorBounces = ballBounces
      .filter(b => b.type === "floor")
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Sort swings by timestamp
    const sortedSwings = [...swings].sort((a, b) => a.ball_hit.timestamp - b.ball_hit.timestamp);
    
    // For each floor bounce, find the most recent swing before it
    for (const floorBounce of floorBounces) {
      // Find the swing that occurred just before this floor bounce
      const matchingSwing = sortedSwings
        .filter(s => s.ball_hit.timestamp < floorBounce.timestamp)
        .filter(s => floorBounce.timestamp - s.ball_hit.timestamp < 3.0) // Within 3 seconds
        .pop(); // Get the most recent one
      
      if (!matchingSwing?.ball_hit_location) continue;
      
      // Origin: player position when hitting (from swing's ball_hit_location)
      const [hitX, hitY] = matchingSwing.ball_hit_location;
      const from = { x: hitX, y: hitY };
      
      // Destination: where ball landed (from floor bounce's court_pos)
      const to = toCourtCoords(floorBounce.court_pos);
      
      if (isInBounds(from.x, from.y) && isInBounds(to.x, to.y)) {
        shots.push({
          from: { ...from, timestamp: matchingSwing.ball_hit.timestamp },
          to: { ...to, timestamp: floorBounce.timestamp },
        });
      }
    }
    
    return shots;
  }, [ballBounces, swings, showTrajectories]);

  // Filter to recent trajectories (only within current rally)
  const recentTrajectories = useMemo(() => {
    return trajectories.filter(t => {
      // Must be after current rally start (clear on rally change)
      if (currentRallyStart !== null && t.from.timestamp < currentRallyStart) return false;
      const age = currentTime - t.to.timestamp;
      return age >= -0.5 && age < DISPLAY_DURATION; // Show slightly before landing
    });
  }, [trajectories, currentTime, currentRallyStart]);

  // Find recent floor bounces (only FLOOR bounces - actual ball landings on court)
  const recentBounces = useMemo(() => {
    if (!showBounces) return [];
    return ballBounces
      .filter(b => b.type === "floor") // Only show floor bounces (court_pos is accurate for these)
      .filter(b => {
        // Must be after current rally start (clear on rally change)
        if (currentRallyStart !== null && b.timestamp < currentRallyStart) return false;
        const age = currentTime - b.timestamp;
        return age >= 0 && age < DISPLAY_DURATION;
      });
  }, [ballBounces, currentTime, showBounces, currentRallyStart]);

  // Calculate current player positions from player_positions data
  // Uses linear interpolation for smooth movement between keyframes
  // player_positions from API are already in court coordinates (meters)
  // X: 0-10m (width), Y: 0-20m (length)
  const currentPlayerPositions = useMemo(() => {
    if (!showPlayers) return [];
    
    const positions: Array<{
      playerId: number;
      x: number;
      y: number;
      displayName: string;
      colorIndex: number;
    }> = [];
    
    // Get list of valid player IDs from display names (those that passed the threshold)
    const validPlayerIds = Object.keys(playerDisplayNames).map(id => parseInt(id));
    
    // If no valid players from displayNames, use all available player_positions
    const playerIdsToShow = validPlayerIds.length > 0 
      ? validPlayerIds 
      : Object.keys(playerPositions).map(id => parseInt(id));
    
    playerIdsToShow.forEach((playerId, idx) => {
      const posArray = playerPositions[String(playerId)];
      if (!posArray || posArray.length === 0) return;
      
      // Use interpolation for smooth movement
      const interpolatedPos = findInterpolatedPosition(posArray, currentTime);
      if (!interpolatedPos) return;
      
      // Check if we have data for this time range (within 1 second of nearest keyframe)
      const firstTs = posArray[0].timestamp;
      const lastTs = posArray[posArray.length - 1].timestamp;
      if (currentTime < firstTs - 1.0 || currentTime > lastTs + 1.0) return;
      
      // Get display name and color index
      const displayName = playerDisplayNames[playerId] || `P${playerId}`;
      const colorIndex = validPlayerIds.indexOf(playerId) >= 0 
        ? validPlayerIds.indexOf(playerId) 
        : idx;
      
      if (isInBounds(interpolatedPos.x, interpolatedPos.y)) {
        positions.push({
          playerId,
          x: interpolatedPos.x,
          y: interpolatedPos.y,
          displayName,
          colorIndex,
        });
      }
    });
    
    return positions;
  }, [playerPositions, playerDisplayNames, currentTime, showPlayers]);

  // Calculate team zone sync for each half of the court
  // Only applies during rallies, after serve grace period
  const teamZoneSyncData = useMemo(() => {
    if (!showTeamZoneSync || currentPlayerPositions.length === 0) {
      return { topHalf: null, bottomHalf: null, isServePhase: false };
    }

    // Don't show team zone sync outside of rallies
    if (currentRallyStart === null) {
      return { topHalf: null, bottomHalf: null, isServePhase: false };
    }

    // Check if we're in serve phase (grace period after rally starts)
    const isServePhase = (currentTime - currentRallyStart) < SERVE_GRACE_PERIOD;

    // Don't show team zone sync during serve phase
    if (isServePhase) {
      return { topHalf: null, bottomHalf: null, isServePhase: true };
    }

    // Group players by court half
    const topPlayers = currentPlayerPositions.filter(p => p.y < 10);
    const bottomPlayers = currentPlayerPositions.filter(p => p.y >= 10);

    // Calculate sync for each half (need exactly 2 players per half for team sync)
    const topHalfSync = topPlayers.length === 2 
      ? calculateTeamZoneSync(topPlayers[0].y, topPlayers[1].y)
      : null;
    
    const bottomHalfSync = bottomPlayers.length === 2
      ? calculateTeamZoneSync(bottomPlayers[0].y, bottomPlayers[1].y)
      : null;

    return { topHalf: topHalfSync, bottomHalf: bottomHalfSync, isServePhase: false };
  }, [currentPlayerPositions, showTeamZoneSync, currentRallyStart, currentTime]);

  return (
    <Box
      className={className}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        borderRadius: "var(--radius-3)",
        overflow: "visible", // Allow bounces, labels, etc. to overflow
        backgroundColor: "var(--gray-3)",
        border: "1px solid var(--gray-6)",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${COURT.width} ${COURT.length}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Gradient definitions (yellow at start/past → green at end/now) */}
        <defs>
          {recentTrajectories.map((traj, idx) => {
            const shotDuration = traj.to.timestamp - traj.from.timestamp;
            const timeSinceSwing = currentTime - traj.from.timestamp;
            const progress = Math.min(1, Math.max(0, timeSinceSwing / shotDuration));
            
            // Calculate positions along the curve for gradient
            const from = { x: traj.from.x, y: traj.from.y };
            const to = { x: traj.to.x, y: traj.to.y };
            const controlPoint = getArcControlPoint(from, to);
            const currentPos = getQuadraticBezierPoint(from, controlPoint, to, progress);
            
            return (
              <linearGradient
                key={`grad-${idx}`}
                id={`trajectory-gradient-${idx}`}
                x1={from.x}
                y1={from.y}
                x2={currentPos.x}
                y2={currentPos.y}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={getTrailColor(1)} />
                <stop offset="100%" stopColor={getTrailColor(1 - progress)} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Court surface */}
        <rect x={0} y={0} width={COURT.width} height={COURT.length} fill={courtColor} />

        {/* === TEAM ZONE SYNC OVERLAY === */}
        {showTeamZoneSync && teamZoneSyncData.topHalf && (
          <g className="team-zone-sync-top">
            {teamZoneSyncData.topHalf.activeZones.map((zone, idx) => (
              <rect
                key={`top-zone-${idx}`}
                x={wallThickness}
                y={zone.minY}
                width={COURT.width - wallThickness * 2}
                height={zone.maxY - zone.minY}
                fill={teamZoneSyncData.topHalf!.color}
                opacity={0.45}
                style={{ transition: "fill 150ms ease, opacity 150ms ease, y 150ms ease, height 150ms ease" }}
              />
            ))}
          </g>
        )}
        {showTeamZoneSync && teamZoneSyncData.bottomHalf && (
          <g className="team-zone-sync-bottom">
            {teamZoneSyncData.bottomHalf.activeZones.map((zone, idx) => (
              <rect
                key={`bottom-zone-${idx}`}
                x={wallThickness}
                y={zone.minY}
                width={COURT.width - wallThickness * 2}
                height={zone.maxY - zone.minY}
                fill={teamZoneSyncData.bottomHalf!.color}
                opacity={0.45}
                style={{ transition: "fill 150ms ease, opacity 150ms ease, y 150ms ease, height 150ms ease" }}
              />
            ))}
          </g>
        )}
        
        {/* === WALLS === */}
        <rect x={0} y={0} width={COURT.width} height={wallThickness} fill={wallColor} />
        <rect x={0} y={COURT.length - wallThickness} width={COURT.width} height={wallThickness} fill={wallColor} />
        <rect x={0} y={0} width={wallThickness} height={COURT.backWallSolid} fill={wallColor} />
        <rect x={0} y={COURT.length - COURT.backWallSolid} width={wallThickness} height={COURT.backWallSolid} fill={wallColor} />
        <rect x={COURT.width - wallThickness} y={0} width={wallThickness} height={COURT.backWallSolid} fill={wallColor} />
        <rect x={COURT.width - wallThickness} y={COURT.length - COURT.backWallSolid} width={wallThickness} height={COURT.backWallSolid} fill={wallColor} />
        
        {/* === NET === */}
        <rect x={0} y={COURT.length / 2 - 0.15} width={COURT.width} height={0.3} fill={netColor} />
        
        {/* === COURT LINES === */}
        <rect
          x={wallThickness} y={wallThickness}
          width={COURT.width - wallThickness * 2} height={COURT.length - wallThickness * 2}
          fill="none" stroke={lineColor} strokeWidth={lineWidth}
        />
        <line x1={wallThickness} y1={COURT.serviceLineFromBack} x2={COURT.width - wallThickness} y2={COURT.serviceLineFromBack} stroke={lineColor} strokeWidth={lineWidth} />
        <line x1={wallThickness} y1={COURT.length - COURT.serviceLineFromBack} x2={COURT.width - wallThickness} y2={COURT.length - COURT.serviceLineFromBack} stroke={lineColor} strokeWidth={lineWidth} />
        <line x1={COURT.width / 2} y1={COURT.serviceLineFromBack} x2={COURT.width / 2} y2={COURT.length / 2} stroke={lineColor} strokeWidth={lineWidth} />
        <line x1={COURT.width / 2} y1={COURT.length / 2} x2={COURT.width / 2} y2={COURT.length - COURT.serviceLineFromBack} stroke={lineColor} strokeWidth={lineWidth} />

        {/* === SHOT TRAJECTORIES (Parabolic Arcs) === */}
        {recentTrajectories.map((traj, idx) => {
          const shotDuration = traj.to.timestamp - traj.from.timestamp;
          const timeSinceSwing = currentTime - traj.from.timestamp;
          const timeSinceLanding = currentTime - traj.to.timestamp;
          
          // Calculate animation progress (0 = at swing, 1 = at landing)
          const progress = Math.min(1, Math.max(0, timeSinceSwing / shotDuration));
          
          // Fade out after landing
          const opacity = timeSinceLanding < 0 
            ? 1 // Still traveling or just landed
            : Math.max(0, 1 - timeSinceLanding / DISPLAY_DURATION);
          
          // Calculate control point for parabolic arc
          const from = { x: traj.from.x, y: traj.from.y };
          const to = { x: traj.to.x, y: traj.to.y };
          const controlPoint = getArcControlPoint(from, to);
          
          // Calculate current position along the curve
          const currentPos = getQuadraticBezierPoint(from, controlPoint, to, progress);
          
          // Color at the current point (interpolate based on progress)
          const currentColor = getTrailColor(1 - progress);
          
          // Build the partial arc path up to current progress
          // For smooth animation, we sample multiple points along the curve
          const pathPoints: string[] = [`M ${from.x} ${from.y}`];
          if (progress > 0) {
            const steps = Math.max(10, Math.floor(progress * 20));
            for (let i = 1; i <= steps; i++) {
              const t = (i / steps) * progress;
              const pt = getQuadraticBezierPoint(from, controlPoint, to, t);
              pathPoints.push(`L ${pt.x} ${pt.y}`);
            }
          }
          const partialPath = pathPoints.join(' ');
          
          // Full arc path for reference
          const fullArcPath = `M ${from.x} ${from.y} Q ${controlPoint.x} ${controlPoint.y} ${to.x} ${to.y}`;
          
          return (
            <g key={`traj-${idx}`} opacity={opacity}>
              {/* Full arc shadow (faded, shows full trajectory) */}
              {progress < 1 && (
                <path
                  d={fullArcPath}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={0.08}
                />
              )}
              {/* Animated arc - grows along the curve */}
              {progress > 0 && (
                <path
                  d={partialPath}
                  fill="none"
                  stroke={`url(#trajectory-gradient-${idx})`}
                  strokeWidth={0.15}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {/* Start point (swing - yellow) */}
              <circle
                cx={from.x}
                cy={from.y}
                r={0.2}
                fill={getTrailColor(1)}
              />
              {/* Animated ball/head (follows the curve) */}
              {progress > 0 && progress < 1 && (
                <circle
                  cx={currentPos.x}
                  cy={currentPos.y}
                  r={0.2}
                  fill={currentColor}
                  stroke="#ffffff"
                  strokeWidth={0.05}
                />
              )}
              {/* End point (landing - green, only show when complete) */}
              {progress >= 1 && (
                <circle
                  cx={to.x}
                  cy={to.y}
                  r={0.15}
                  fill={getTrailColor(0)}
                  stroke="#ffffff"
                  strokeWidth={0.05}
                />
              )}
            </g>
          );
        })}


        {/* === BOUNCES (tennis ball style - matching RallyTimeline) === */}
        {recentBounces.map((bounce, idx) => {
          const age = currentTime - bounce.timestamp;
          const opacity = Math.max(0, 1 - age / DISPLAY_DURATION);
          
          // Yellow ball color - same as RallyTimeline var(--yellow-9)
          const ballColor = "#EAB308";
          const glowColor = "rgba(234, 179, 8, 0.8)";
          
          const { x, y } = toCourtCoords(bounce.court_pos);
          
          // Skip if outside court bounds
          if (!isInBounds(x, y)) return null;
          
          return (
            <g key={`bounce-${idx}`} opacity={opacity}>
              {/* Quick pulse ring on recent bounces (fades in 0.5s) */}
              {age < 0.5 && (
                <circle
                  cx={x}
                  cy={y}
                  r={0.35 + age * 0.8}
                  fill="none"
                  stroke={ballColor}
                  strokeWidth={0.06}
                  opacity={Math.max(0, 0.7 - age * 1.4)}
                />
              )}
              {/* Tennis ball - yellow circle with white border */}
              <circle
                cx={x}
                cy={y}
                r={0.35}
                fill={ballColor}
                stroke="#ffffff"
                strokeWidth={0.08}
              />
              {/* Glow effect on very recent bounces */}
              {age < 0.3 && (
                <circle
                  cx={x}
                  cy={y}
                  r={0.35}
                  fill="none"
                  stroke={glowColor}
                  strokeWidth={0.15}
                  opacity={0.5 - age * 1.5}
                />
              )}
            </g>
          );
        })}

        {/* === PLAYERS (position markers with smooth CSS transitions) === */}
        {currentPlayerPositions.map((player) => {
          const color = getPlayerColor(player.colorIndex);
          const playerRadius = 0.5;
          
          return (
            <g 
              key={`player-${player.playerId}`}
              transform={`translate(${player.x}, ${player.y})`}
              style={{ transition: "transform 80ms linear" }}
            >
              {/* Outer glow ring */}
              <circle
                cx={0}
                cy={0}
                r={playerRadius + 0.1}
                fill="none"
                stroke={color}
                strokeWidth={0.1}
                opacity={0.4}
              />
              {/* Player dot */}
              <circle
                cx={0}
                cy={0}
                r={playerRadius}
                fill={color}
                stroke="#ffffff"
                strokeWidth={0.08}
              />
              {/* Player label */}
              <text
                x={0}
                y={0.15}
                textAnchor="middle"
                fontSize="0.5"
                fontWeight="bold"
                fill="#ffffff"
                style={{ pointerEvents: "none" }}
              >
                {player.displayName.replace("Player ", "P")}
              </text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}
