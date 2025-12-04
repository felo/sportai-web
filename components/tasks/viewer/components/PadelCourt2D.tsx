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

interface PadelCourt2DProps {
  className?: string;
  currentTime?: number;
  ballBounces?: BallBounce[];
  rallies?: [number, number][]; // Rally start/end timestamps - clear traces at rally boundaries
  playerPositions?: Record<string, PlayerPosition[]>; // Keyed by player_id - already in court coords (meters)
  playerDisplayNames?: Record<number, string>; // player_id -> "Player 1", etc.
  showBounces?: boolean;
  showTrajectories?: boolean;
  showPlayers?: boolean;
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

// Binary search to find the position nearest to a timestamp
function findNearestPosition(positions: PlayerPosition[], timestamp: number): PlayerPosition | null {
  if (!positions || positions.length === 0) return null;
  
  let left = 0;
  let right = positions.length - 1;
  
  // Handle edge cases
  if (timestamp <= positions[0].timestamp) return positions[0];
  if (timestamp >= positions[right].timestamp) return positions[right];
  
  // Binary search for closest timestamp
  while (left < right - 1) {
    const mid = Math.floor((left + right) / 2);
    if (positions[mid].timestamp <= timestamp) {
      left = mid;
    } else {
      right = mid;
    }
  }
  
  // Return the closer one
  const diffLeft = Math.abs(positions[left].timestamp - timestamp);
  const diffRight = Math.abs(positions[right].timestamp - timestamp);
  return diffLeft <= diffRight ? positions[left] : positions[right];
}

// Get player color by index
function getPlayerColor(index: number): string {
  const colors = PLAYER_CONFIG.colors;
  return colors[index % colors.length].primary;
}

export function PadelCourt2D({ 
  className,
  currentTime = 0,
  ballBounces = [],
  rallies = [],
  playerPositions = {},
  playerDisplayNames = {},
  showBounces = true,
  showTrajectories = true,
  showPlayers = true,
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

  // Find shot trajectories: swing bounce → next floor bounce
  const trajectories = useMemo((): ShotTrajectory[] => {
    if (!showTrajectories || ballBounces.length < 2) return [];
    
    const shots: ShotTrajectory[] = [];
    const sortedBounces = [...ballBounces].sort((a, b) => a.timestamp - b.timestamp);
    
    for (let i = 0; i < sortedBounces.length - 1; i++) {
      const current = sortedBounces[i];
      const next = sortedBounces[i + 1];
      
      // Look for swing → floor pairs (shot trajectories)
      if (current.type === "swing" && next.type === "floor") {
        // Check time difference is reasonable (< 3 seconds)
        if (next.timestamp - current.timestamp < 3.0) {
          const from = toCourtCoords(current.court_pos);
          const to = toCourtCoords(next.court_pos);
          
          if (isInBounds(from.x, from.y) && isInBounds(to.x, to.y)) {
            shots.push({
              from: { ...from, timestamp: current.timestamp },
              to: { ...to, timestamp: next.timestamp },
            });
          }
        }
      }
    }
    
    return shots;
  }, [ballBounces, showTrajectories]);

  // Filter to recent trajectories (only within current rally)
  const recentTrajectories = useMemo(() => {
    return trajectories.filter(t => {
      // Must be after current rally start (clear on rally change)
      if (currentRallyStart !== null && t.from.timestamp < currentRallyStart) return false;
      const age = currentTime - t.to.timestamp;
      return age >= -0.5 && age < DISPLAY_DURATION; // Show slightly before landing
    });
  }, [trajectories, currentTime, currentRallyStart]);

  // Find recent bounces (only within current rally)
  const recentBounces = useMemo(() => {
    if (!showBounces) return [];
    return ballBounces.filter(b => {
      // Must be after current rally start (clear on rally change)
      if (currentRallyStart !== null && b.timestamp < currentRallyStart) return false;
      const age = currentTime - b.timestamp;
      return age >= 0 && age < DISPLAY_DURATION;
    });
  }, [ballBounces, currentTime, showBounces, currentRallyStart]);

  // DEBUG: Log ball bounce positions in meters
  if (recentBounces.length > 0) {
    console.log("[PadelCourt2D] Recent bounces (court_pos in meters):", 
      recentBounces.map(b => ({
        type: b.type,
        timestamp: b.timestamp.toFixed(2),
        court_pos: b.court_pos,
        converted: toCourtCoords(b.court_pos),
      }))
    );
  }

  // Calculate current player positions from player_positions data
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
    
    // DEBUG: Log incoming data
    const playerPosKeys = Object.keys(playerPositions);
    console.log("[PadelCourt2D] Player positions debug:", {
      showPlayers,
      currentTime,
      playerPositionsKeys: playerPosKeys,
      playerDisplayNames,
      sampleData: playerPosKeys.length > 0 ? {
        playerId: playerPosKeys[0],
        firstPosition: playerPositions[playerPosKeys[0]]?.[0],
        positionCount: playerPositions[playerPosKeys[0]]?.length,
      } : null,
    });
    
    // Get list of valid player IDs from display names (those that passed the threshold)
    const validPlayerIds = Object.keys(playerDisplayNames).map(id => parseInt(id));
    
    // If no valid players from displayNames, use all available player_positions
    const playerIdsToShow = validPlayerIds.length > 0 
      ? validPlayerIds 
      : Object.keys(playerPositions).map(id => parseInt(id));
    
    playerIdsToShow.forEach((playerId, idx) => {
      const posArray = playerPositions[String(playerId)];
      if (!posArray || posArray.length === 0) {
        console.log(`[PadelCourt2D] No positions for player ${playerId}`);
        return;
      }
      
      const nearestPos = findNearestPosition(posArray, currentTime);
      if (!nearestPos) {
        console.log(`[PadelCourt2D] No nearest position found for player ${playerId}`);
        return;
      }
      
      // Check if position is recent (within 1 second - more lenient for sparse data)
      const timeDiff = Math.abs(nearestPos.timestamp - currentTime);
      if (timeDiff > 1.0) {
        console.log(`[PadelCourt2D] Position too old for player ${playerId}: timeDiff=${timeDiff.toFixed(2)}s`);
        return;
      }
      
      // Get display name and color index
      const displayName = playerDisplayNames[playerId] || `P${playerId}`;
      const colorIndex = validPlayerIds.indexOf(playerId) >= 0 
        ? validPlayerIds.indexOf(playerId) 
        : idx;
      
      // Use court_X and court_Y (actual court coordinates in meters)
      // These are the real court positions, not video frame coordinates
      // Fallback to normalized X/Y if court coords not available (less accurate)
      let courtX: number;
      let courtY: number;
      
      if (nearestPos.court_X !== undefined && nearestPos.court_Y !== undefined) {
        // Use actual court coordinates (already in meters: 0-10m width, 0-20m length)
        courtX = nearestPos.court_X;
        courtY = nearestPos.court_Y;
      } else {
        // Fallback: convert normalized video coords (not recommended - inaccurate)
        console.warn(`[PadelCourt2D] Player ${playerId} missing court_X/court_Y, using video coords`);
        courtX = nearestPos.X * COURT.width;
        courtY = nearestPos.Y * COURT.length;
      }
      
      const inBounds = isInBounds(courtX, courtY);
      console.log(`[PadelCourt2D] Player ${playerId} position:`, {
        videoX: nearestPos.X,
        videoY: nearestPos.Y,
        court_X: nearestPos.court_X,
        court_Y: nearestPos.court_Y,
        courtX,
        courtY,
        timestamp: nearestPos.timestamp,
        inBounds,
      });
      
      if (inBounds) {
        positions.push({
          playerId,
          x: courtX,
          y: courtY,
          displayName,
          colorIndex,
        });
      }
    });
    
    console.log("[PadelCourt2D] Final positions to render:", positions);
    return positions;
  }, [playerPositions, playerDisplayNames, currentTime, showPlayers]);


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


        {/* === BOUNCES === */}
        {recentBounces.map((bounce, idx) => {
          const age = currentTime - bounce.timestamp;
          const opacity = Math.max(0, 1 - age / DISPLAY_DURATION);
          
          // All bounces are yellow with "Bounce" label
          const color = "#EAB308"; // Yellow - var(--yellow-9)
          const label = "Bounce";
          
          const { x, y } = toCourtCoords(bounce.court_pos);
          
          // Skip if outside court bounds
          if (!isInBounds(x, y)) return null;
          
          return (
            <g key={`bounce-${idx}`}>
              <circle
                cx={x}
                cy={y}
                r={0.3 + (age / DISPLAY_DURATION) * 1.0}
                fill="none"
                stroke={color}
                strokeWidth={0.1}
                opacity={opacity}
              />
              <circle
                cx={x}
                cy={y}
                r={0.15}
                fill={color}
                opacity={opacity}
              />
              {/* Bounce type label */}
              <text
                x={x}
                y={y - 0.5}
                textAnchor="middle"
                fontSize="0.4"
                fontWeight="bold"
                fill="#ffffff"
                opacity={opacity}
                style={{ 
                  pointerEvents: "none",
                  textShadow: "0 0 0.1px rgba(0,0,0,0.8)",
                }}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* === DEBUG: Show data availability indicator === */}
        <text
          x={COURT.width / 2}
          y={1}
          textAnchor="middle"
          fontSize="0.6"
          fill="rgba(255,255,255,0.5)"
          style={{ pointerEvents: "none" }}
        >
          {Object.keys(playerPositions).length > 0 
            ? `Players: ${currentPlayerPositions.length}/${Object.keys(playerPositions).length}` 
            : "No position data"}
        </text>

        {/* === PLAYERS (position markers) === */}
        {currentPlayerPositions.map((player) => {
          const color = getPlayerColor(player.colorIndex);
          const playerRadius = 0.5;
          
          return (
            <g key={`player-${player.playerId}`}>
              {/* Outer glow ring */}
              <circle
                cx={player.x}
                cy={player.y}
                r={playerRadius + 0.1}
                fill="none"
                stroke={color}
                strokeWidth={0.1}
                opacity={0.4}
              />
              {/* Player dot */}
              <circle
                cx={player.x}
                cy={player.y}
                r={playerRadius}
                fill={color}
                stroke="#ffffff"
                strokeWidth={0.08}
              />
              {/* Player label */}
              <text
                x={player.x}
                y={player.y + 0.15}
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
