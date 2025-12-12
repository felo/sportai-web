"use client";

import { useMemo } from "react";
import { Box } from "@radix-ui/themes";
import { OVERLAY_COLORS, PLAYER_CONFIG } from "../constants";

// Tennis court dimensions in meters (portrait/vertical orientation)
// Based on ITF regulations
const COURT = {
  // Doubles court boundaries
  width: 10.97,           // X axis - doubles width
  length: 23.77,          // Y axis - baseline to baseline
  
  // Singles lines (tramlines)
  singlesInset: 1.37,     // Distance from doubles sideline to singles sideline
  singlesWidth: 8.23,     // 9.60 - 1.37 = 8.23m (or 10.97 - 2*1.37)
  
  // Service boxes
  serviceLineFromBaseline: 6.40,  // Distance from baseline to service line
  
  // Net position
  netY: 11.885,           // Center of court (23.77 / 2 ≈ 11.885)
  
  // Center service line
  centerX: 5.485,         // Center of court width (10.97 / 2 ≈ 5.485)
};

// Extended view area to track players beyond baseline
const VIEW = {
  minX: -3.00,
  maxX: 13.97,
  minY: -6.00,
  maxY: 29.77,
  get width() { return this.maxX - this.minX; },  // 16.97m
  get height() { return this.maxY - this.minY; }, // 35.77m
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
  court_pos: [number, number]; // Court coordinates (meters)
  player_id: number;
  type: string;
}

interface PlayerPosition {
  timestamp: number;
  X: number; // Image/video coordinates (normalized 0-1)
  Y: number; // Image/video coordinates (normalized 0-1)
  court_X?: number; // Court position in meters
  court_Y?: number; // Court position in meters
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

interface TennisCourt2DProps {
  className?: string;
  currentTime?: number;
  ballBounces?: BallBounce[];
  rallies?: [number, number][]; // Rally start/end timestamps
  playerPositions?: Record<string, PlayerPosition[]>;
  swings?: SwingData[];
  playerDisplayNames?: Record<number, string>;
  showBounces?: boolean;
  showTrajectories?: boolean;
  showPlayers?: boolean;
}

// Convert court_pos to view coordinates (offset by VIEW.minX/minY)
function toViewCoords(pos: [number, number]): { x: number; y: number } {
  return {
    x: pos[0] - VIEW.minX,
    y: pos[1] - VIEW.minY,
  };
}

// Check if position is within extended view bounds
function isInBounds(x: number, y: number): boolean {
  return x >= VIEW.minX && x <= VIEW.maxX && y >= VIEW.minY && y <= VIEW.maxY;
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
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

// Calculate control point for parabolic arc
function getArcControlPoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  arcHeight: number = 2.5
): { x: number; y: number } {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const distance = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
  const heightScale = Math.min(arcHeight, distance * 0.3);
  
  return {
    x: midX,
    y: midY - heightScale,
  };
}

// Linear interpolation helper
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Binary search to find bracketing positions and interpolate
function findInterpolatedPosition(
  positions: PlayerPosition[], 
  timestamp: number
): { x: number; y: number; timestamp: number } | null {
  if (!positions || positions.length === 0) return null;
  
  let left = 0;
  let right = positions.length - 1;
  
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
  
  while (left < right - 1) {
    const mid = Math.floor((left + right) / 2);
    if (positions[mid].timestamp <= timestamp) {
      left = mid;
    } else {
      right = mid;
    }
  }
  
  const p1 = positions[left];
  const p2 = positions[right];
  const timeDelta = p2.timestamp - p1.timestamp;
  const t = timeDelta > 0 ? (timestamp - p1.timestamp) / timeDelta : 0;
  
  const x1 = p1.court_X ?? p1.X * COURT.width;
  const y1 = p1.court_Y ?? p1.Y * COURT.length;
  const x2 = p2.court_X ?? p2.X * COURT.width;
  const y2 = p2.court_Y ?? p2.Y * COURT.length;
  
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

export function TennisCourt2D({ 
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
}: TennisCourt2DProps) {
  // Tennis court colors (classic green/blue hard court style)
  const courtColor = "#2D7A4A";        // Green playing surface
  const surroundColor = "#1E5C38";     // Darker green surround area
  const lineColor = "#ffffff";
  const netColor = "#333333";
  
  const lineWidth = 0.08; // Line width in meters

  // Court position offset in view coordinates
  const courtOffsetX = -VIEW.minX;  // 3.00
  const courtOffsetY = -VIEW.minY;  // 6.00

  // Find current rally start time
  const currentRallyStart = useMemo(() => {
    for (const [start, end] of rallies) {
      if (currentTime >= start && currentTime <= end) {
        return start;
      }
    }
    return null;
  }, [rallies, currentTime]);

  // Find shot trajectories
  const trajectories = useMemo((): ShotTrajectory[] => {
    if (!showTrajectories) return [];
    
    const shots: ShotTrajectory[] = [];
    const floorBounces = ballBounces
      .filter(b => b.type === "floor")
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const sortedSwings = [...swings].sort((a, b) => a.ball_hit.timestamp - b.ball_hit.timestamp);
    
    for (const floorBounce of floorBounces) {
      const matchingSwing = sortedSwings
        .filter(s => s.ball_hit.timestamp < floorBounce.timestamp)
        .filter(s => floorBounce.timestamp - s.ball_hit.timestamp < 3.0)
        .pop();
      
      if (!matchingSwing?.ball_hit_location) continue;
      
      const [hitX, hitY] = matchingSwing.ball_hit_location;
      const from = { x: hitX, y: hitY };
      const to = { x: floorBounce.court_pos[0], y: floorBounce.court_pos[1] };
      
      if (isInBounds(from.x, from.y) && isInBounds(to.x, to.y)) {
        shots.push({
          from: { ...from, timestamp: matchingSwing.ball_hit.timestamp },
          to: { ...to, timestamp: floorBounce.timestamp },
        });
      }
    }
    
    return shots;
  }, [ballBounces, swings, showTrajectories]);

  // Filter to recent trajectories
  const recentTrajectories = useMemo(() => {
    return trajectories.filter(t => {
      if (currentRallyStart !== null && t.from.timestamp < currentRallyStart) return false;
      const age = currentTime - t.to.timestamp;
      return age >= -0.5 && age < DISPLAY_DURATION;
    });
  }, [trajectories, currentTime, currentRallyStart]);

  // Find recent floor bounces
  const recentBounces = useMemo(() => {
    if (!showBounces) return [];
    return ballBounces
      .filter(b => b.type === "floor")
      .filter(b => {
        if (currentRallyStart !== null && b.timestamp < currentRallyStart) return false;
        const age = currentTime - b.timestamp;
        return age >= 0 && age < DISPLAY_DURATION;
      });
  }, [ballBounces, currentTime, showBounces, currentRallyStart]);

  // Calculate current player positions
  const currentPlayerPositions = useMemo(() => {
    if (!showPlayers) return [];
    
    const positions: Array<{
      playerId: number;
      x: number;
      y: number;
      displayName: string;
      colorIndex: number;
    }> = [];
    
    const validPlayerIds = Object.keys(playerDisplayNames).map(id => parseInt(id));
    const playerIdsToShow = validPlayerIds.length > 0 
      ? validPlayerIds 
      : Object.keys(playerPositions).map(id => parseInt(id));
    
    playerIdsToShow.forEach((playerId, idx) => {
      const posArray = playerPositions[String(playerId)];
      if (!posArray || posArray.length === 0) return;
      
      const interpolatedPos = findInterpolatedPosition(posArray, currentTime);
      if (!interpolatedPos) return;
      
      const firstTs = posArray[0].timestamp;
      const lastTs = posArray[posArray.length - 1].timestamp;
      if (currentTime < firstTs - 1.0 || currentTime > lastTs + 1.0) return;
      
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

  return (
    <Box
      className={className}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        borderRadius: "var(--radius-3)",
        overflow: "visible",
        backgroundColor: "var(--gray-3)",
        border: "1px solid var(--gray-6)",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Gradient definitions */}
        <defs>
          {recentTrajectories.map((traj, idx) => {
            const shotDuration = traj.to.timestamp - traj.from.timestamp;
            const timeSinceSwing = currentTime - traj.from.timestamp;
            const progress = Math.min(1, Math.max(0, timeSinceSwing / shotDuration));
            
            const from = toViewCoords([traj.from.x, traj.from.y]);
            const to = toViewCoords([traj.to.x, traj.to.y]);
            const controlPoint = getArcControlPoint(from, to);
            const currentPos = getQuadraticBezierPoint(from, controlPoint, to, progress);
            
            return (
              <linearGradient
                key={`grad-${idx}`}
                id={`tennis-trajectory-gradient-${idx}`}
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

        {/* === SURROUND AREA (extended view) === */}
        <rect x={0} y={0} width={VIEW.width} height={VIEW.height} fill={surroundColor} />

        {/* === MAIN COURT SURFACE === */}
        <rect 
          x={courtOffsetX} 
          y={courtOffsetY} 
          width={COURT.width} 
          height={COURT.length} 
          fill={courtColor} 
        />

        {/* === COURT LINES === */}
        {/* Doubles sidelines (outer boundary) */}
        <rect
          x={courtOffsetX}
          y={courtOffsetY}
          width={COURT.width}
          height={COURT.length}
          fill="none"
          stroke={lineColor}
          strokeWidth={lineWidth}
        />

        {/* Singles sidelines (tramlines) */}
        <line 
          x1={courtOffsetX + COURT.singlesInset} 
          y1={courtOffsetY} 
          x2={courtOffsetX + COURT.singlesInset} 
          y2={courtOffsetY + COURT.length} 
          stroke={lineColor} 
          strokeWidth={lineWidth} 
        />
        <line 
          x1={courtOffsetX + COURT.width - COURT.singlesInset} 
          y1={courtOffsetY} 
          x2={courtOffsetX + COURT.width - COURT.singlesInset} 
          y2={courtOffsetY + COURT.length} 
          stroke={lineColor} 
          strokeWidth={lineWidth} 
        />

        {/* Service lines */}
        <line 
          x1={courtOffsetX + COURT.singlesInset} 
          y1={courtOffsetY + COURT.serviceLineFromBaseline} 
          x2={courtOffsetX + COURT.width - COURT.singlesInset} 
          y2={courtOffsetY + COURT.serviceLineFromBaseline} 
          stroke={lineColor} 
          strokeWidth={lineWidth} 
        />
        <line 
          x1={courtOffsetX + COURT.singlesInset} 
          y1={courtOffsetY + COURT.length - COURT.serviceLineFromBaseline} 
          x2={courtOffsetX + COURT.width - COURT.singlesInset} 
          y2={courtOffsetY + COURT.length - COURT.serviceLineFromBaseline} 
          stroke={lineColor} 
          strokeWidth={lineWidth} 
        />

        {/* Center service lines */}
        <line 
          x1={courtOffsetX + COURT.centerX} 
          y1={courtOffsetY + COURT.serviceLineFromBaseline} 
          x2={courtOffsetX + COURT.centerX} 
          y2={courtOffsetY + COURT.netY} 
          stroke={lineColor} 
          strokeWidth={lineWidth} 
        />
        <line 
          x1={courtOffsetX + COURT.centerX} 
          y1={courtOffsetY + COURT.netY} 
          x2={courtOffsetX + COURT.centerX} 
          y2={courtOffsetY + COURT.length - COURT.serviceLineFromBaseline} 
          stroke={lineColor} 
          strokeWidth={lineWidth} 
        />

        {/* Center marks (small marks at baseline center) */}
        <line 
          x1={courtOffsetX + COURT.centerX} 
          y1={courtOffsetY} 
          x2={courtOffsetX + COURT.centerX} 
          y2={courtOffsetY + 0.15} 
          stroke={lineColor} 
          strokeWidth={lineWidth} 
        />
        <line 
          x1={courtOffsetX + COURT.centerX} 
          y1={courtOffsetY + COURT.length - 0.15} 
          x2={courtOffsetX + COURT.centerX} 
          y2={courtOffsetY + COURT.length} 
          stroke={lineColor} 
          strokeWidth={lineWidth} 
        />

        {/* === NET === */}
        <line 
          x1={0} 
          y1={courtOffsetY + COURT.netY} 
          x2={VIEW.width} 
          y2={courtOffsetY + COURT.netY} 
          stroke={netColor} 
          strokeWidth={0.15} 
        />
        {/* Net posts */}
        <circle 
          cx={courtOffsetX - 0.91} 
          cy={courtOffsetY + COURT.netY} 
          r={0.2} 
          fill={netColor} 
        />
        <circle 
          cx={courtOffsetX + COURT.width + 0.91} 
          cy={courtOffsetY + COURT.netY} 
          r={0.2} 
          fill={netColor} 
        />

        {/* === SHOT TRAJECTORIES === */}
        {recentTrajectories.map((traj, idx) => {
          const shotDuration = traj.to.timestamp - traj.from.timestamp;
          const timeSinceSwing = currentTime - traj.from.timestamp;
          const timeSinceLanding = currentTime - traj.to.timestamp;
          const progress = Math.min(1, Math.max(0, timeSinceSwing / shotDuration));
          const opacity = timeSinceLanding < 0 
            ? 1 
            : Math.max(0, 1 - timeSinceLanding / DISPLAY_DURATION);
          
          const from = toViewCoords([traj.from.x, traj.from.y]);
          const to = toViewCoords([traj.to.x, traj.to.y]);
          const controlPoint = getArcControlPoint(from, to);
          const currentPos = getQuadraticBezierPoint(from, controlPoint, to, progress);
          const currentColor = getTrailColor(1 - progress);
          
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
          const fullArcPath = `M ${from.x} ${from.y} Q ${controlPoint.x} ${controlPoint.y} ${to.x} ${to.y}`;
          
          return (
            <g key={`traj-${idx}`} opacity={opacity}>
              {progress < 1 && (
                <path d={fullArcPath} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.1} />
              )}
              {progress > 0 && (
                <path
                  d={partialPath}
                  fill="none"
                  stroke={`url(#tennis-trajectory-gradient-${idx})`}
                  strokeWidth={0.18}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              <circle cx={from.x} cy={from.y} r={0.25} fill={getTrailColor(1)} />
              {progress > 0 && progress < 1 && (
                <circle cx={currentPos.x} cy={currentPos.y} r={0.25} fill={currentColor} stroke="#ffffff" strokeWidth={0.06} />
              )}
              {progress >= 1 && (
                <circle cx={to.x} cy={to.y} r={0.2} fill={getTrailColor(0)} stroke="#ffffff" strokeWidth={0.06} />
              )}
            </g>
          );
        })}

        {/* === BOUNCES (tennis ball style) === */}
        {recentBounces.map((bounce, idx) => {
          const age = currentTime - bounce.timestamp;
          const opacity = Math.max(0, 1 - age / DISPLAY_DURATION);
          const ballColor = "#CFE82C"; // Tennis ball yellow-green
          const { x, y } = toViewCoords(bounce.court_pos);
          
          return (
            <g key={`bounce-${idx}`} opacity={opacity}>
              {age < 0.5 && (
                <circle
                  cx={x}
                  cy={y}
                  r={0.45 + age * 1.0}
                  fill="none"
                  stroke={ballColor}
                  strokeWidth={0.08}
                  opacity={Math.max(0, 0.7 - age * 1.4)}
                />
              )}
              <circle cx={x} cy={y} r={0.45} fill={ballColor} stroke="#ffffff" strokeWidth={0.1} />
              {age < 0.3 && (
                <circle
                  cx={x}
                  cy={y}
                  r={0.45}
                  fill="none"
                  stroke="rgba(207, 232, 44, 0.8)"
                  strokeWidth={0.18}
                  opacity={0.5 - age * 1.5}
                />
              )}
            </g>
          );
        })}

        {/* === PLAYERS === */}
        {currentPlayerPositions.map((player) => {
          const color = getPlayerColor(player.colorIndex);
          const playerRadius = 0.6;
          const viewPos = toViewCoords([player.x, player.y]);
          
          return (
            <g 
              key={`player-${player.playerId}`}
              transform={`translate(${viewPos.x}, ${viewPos.y})`}
              style={{ transition: "transform 80ms linear" }}
            >
              <circle cx={0} cy={0} r={playerRadius + 0.12} fill="none" stroke={color} strokeWidth={0.12} opacity={0.4} />
              <circle cx={0} cy={0} r={playerRadius} fill={color} stroke="#ffffff" strokeWidth={0.1} />
              <text
                x={0}
                y={0.18}
                textAnchor="middle"
                fontSize="0.6"
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

