"use client";

import { useMemo } from "react";
import { Box, Flex, Text, Heading, Card, Badge } from "@radix-ui/themes";
import { RocketIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import { StatisticsResult } from "../types";
import { PLAYER_CONFIG, OVERLAY_COLORS } from "../constants";

// Trail colors (same as PadelCourt2D)
const TRAIL_COLORS = {
  current: OVERLAY_COLORS.trail.current, // Mint green
  old: OVERLAY_COLORS.trail.old,         // Yellow
};

// Get trail color interpolated between current (green) and old (yellow)
function getTrailColor(progress: number): string {
  const r = Math.round(TRAIL_COLORS.current.r + (TRAIL_COLORS.old.r - TRAIL_COLORS.current.r) * progress);
  const g = Math.round(TRAIL_COLORS.current.g + (TRAIL_COLORS.old.g - TRAIL_COLORS.current.g) * progress);
  const b = Math.round(TRAIL_COLORS.current.b + (TRAIL_COLORS.old.b - TRAIL_COLORS.current.b) * progress);
  return `rgb(${r}, ${g}, ${b})`;
}

interface ServeHeatmapProps {
  result: StatisticsResult;
  playerDisplayNames?: Record<number, string>;
}

interface ServePair {
  originCol: number;
  originRow: number;
  landingCol: number;
  landingRow: number;
}

interface ServeData {
  playerId: number;
  playerIndex: number;
  displayName: string;
  color: string;
  serveOrigins: number[][]; // Grid of serve origin counts
  serveLandings: number[][]; // Grid of serve landing counts
  servePairs: ServePair[]; // Individual serve-to-landing connections
  avgSpeed: number;
  topSpeed: number;
  totalServes: number;
}

// Padel court dimensions in meters (matching PadelCourt2D coordinate system)
// X = width (horizontal, 0-10m), Y = length (vertical, 0-20m)
// But we display landscape: length left-to-right, width top-to-bottom
const COURT = {
  length: 20,           // Y axis in court coords, but horizontal in display
  width: 10,            // X axis in court coords, but vertical in display
  serviceLineFromBack: 3,
  netPosition: 10,      // Net at center (20/2 = 10m along length)
};

// Grid dimensions for heatmap - landscape view (serves go left → right)
const GRID_COLS = 10; // Along length (20m) - horizontal
const GRID_ROWS = 5;  // Along width (10m) - vertical

// Convert court position (meters) to grid cell
// court_pos: [X, Y] where X=width(0-10), Y=length(0-20) per PadelCourt2D
// Display: columns=length(left-right), rows=width(top-bottom)
function courtPosToGrid(courtX: number, courtY: number): { col: number; row: number } {
  // Y (length 0-20m) → columns (left to right)
  // X (width 0-10m) → rows (top to bottom)
  const col = Math.floor((courtY / COURT.length) * GRID_COLS);
  const row = Math.floor((courtX / COURT.width) * GRID_ROWS);
  return {
    col: Math.max(0, Math.min(GRID_COLS - 1, col)),
    row: Math.max(0, Math.min(GRID_ROWS - 1, row)),
  };
}

// Create empty grid
function createEmptyGrid(): number[][] {
  return Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(0));
}

// Single player's serve heatmap with grid
function PlayerServeGrid({ serve }: { serve: ServeData }) {
  // Calculate max values for intensity scaling
  const maxOrigin = Math.max(...serve.serveOrigins.flat(), 1);
  const maxLanding = Math.max(...serve.serveLandings.flat(), 1);

  if (serve.totalServes === 0) {
    return (
      <Card style={{ border: "1px solid var(--gray-5)" }}>
        <Flex direction="column" gap="2" p="4" align="center">
          <Text size="3" weight="medium" style={{ color: serve.color }}>
            {serve.displayName}
          </Text>
          <Text size="2" color="gray">No serves detected</Text>
        </Flex>
      </Card>
    );
  }

  // Calculate cell dimensions for SVG line drawing
  const cellWidth = 100 / GRID_COLS;
  const cellHeight = 100 / GRID_ROWS;

  return (
    <Card style={{ border: "1px solid var(--gray-6)", overflow: "hidden" }}>
      <Flex direction="column" gap="3" p="4">
        {/* Header */}
        <Flex justify="between" align="center">
          <Heading size="3" weight="medium">
            {serve.displayName}
          </Heading>
          <Badge color="gray" variant="soft">
            {serve.totalServes} serve{serve.totalServes !== 1 ? "s" : ""}
          </Badge>
        </Flex>

        {/* Legend */}
        <Flex gap="4" justify="center">
          <Flex align="center" gap="2">
            <Box
              style={{
                width: 12,
                height: 12,
                borderRadius: "2px",
                backgroundColor: "rgba(255, 200, 50, 0.8)",
              }}
            />
            <Text size="1" color="gray">Serve position</Text>
          </Flex>
          <Flex align="center" gap="2">
            <Box
              style={{
                width: 12,
                height: 12,
                borderRadius: "2px",
                backgroundColor: "rgba(122, 219, 143, 0.8)",
              }}
            />
            <Text size="1" color="gray">Target</Text>
          </Flex>
        </Flex>

        {/* Court grid heatmap */}
        <Box
          style={{
            position: "relative",
            background: "var(--gray-3)",
            borderRadius: "var(--radius-3)",
            padding: "8px",
            border: "1px solid var(--gray-6)",
          }}
        >
          {/* Grid container */}
          <Box
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
              gap: "2px",
              aspectRatio: `${GRID_COLS} / ${GRID_ROWS}`,
            }}
          >
            {serve.serveOrigins.flatMap((row, y) =>
              row.map((originValue, x) => {
                const landingValue = serve.serveLandings[y][x];
                const originIntensity = originValue / maxOrigin;
                const landingIntensity = landingValue / maxLanding;
                
                // Yellow = serve position, Green = landing/target
                let bgColor = "var(--gray-4)"; // Base cell color
                
                if (originIntensity > 0 && landingIntensity > 0) {
                  // Both - show dominant one
                  if (originIntensity >= landingIntensity) {
                    bgColor = `rgba(255, 200, 50, ${0.4 + originIntensity * 0.5})`; // Yellow (serve)
                  } else {
                    bgColor = `rgba(122, 219, 143, ${0.4 + landingIntensity * 0.5})`; // Green (target)
                  }
                } else if (originIntensity > 0) {
                  bgColor = `rgba(255, 200, 50, ${0.4 + originIntensity * 0.5})`; // Yellow (serve)
                } else if (landingIntensity > 0) {
                  bgColor = `rgba(122, 219, 143, ${0.4 + landingIntensity * 0.5})`; // Green (target)
                }
                
                // Net line indicator
                const isNetColumn = x === Math.floor(GRID_COLS / 2);
                
                return (
                  <Box
                    key={`${x}-${y}`}
                    style={{
                      backgroundColor: bgColor,
                      borderRadius: "2px",
                      borderLeft: isNetColumn ? "2px solid var(--gray-8)" : undefined,
                      minHeight: "24px",
                    }}
                    title={
                      originValue > 0 && landingValue > 0
                        ? `Serve: ${originValue}x, Target: ${landingValue}x`
                        : originValue > 0
                        ? `Serve position: ${originValue}x`
                        : landingValue > 0
                        ? `Target: ${landingValue}x`
                        : ""
                    }
                  />
                );
              })
            )}
            
            {/* SVG overlay for serve-to-landing trajectories (parabolic arcs like PadelCourt2D) */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                overflow: "visible",
              }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Gradient for each trajectory (yellow start → green end) */}
                {serve.servePairs.map((pair, idx) => {
                  const x1 = (pair.originCol + 0.5) * cellWidth;
                  const y1 = (pair.originRow + 0.5) * cellHeight;
                  const x2 = (pair.landingCol + 0.5) * cellWidth;
                  const y2 = (pair.landingRow + 0.5) * cellHeight;
                  
                  return (
                    <linearGradient
                      key={`grad-${idx}`}
                      id={`traj-gradient-${serve.playerId}-${idx}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor={getTrailColor(1)} /> {/* Yellow (origin) */}
                      <stop offset="100%" stopColor={getTrailColor(0)} /> {/* Green (landing) */}
                    </linearGradient>
                  );
                })}
              </defs>
              {serve.servePairs.map((pair, idx) => {
                // Calculate center of each cell (in viewBox units 0-100)
                const x1 = (pair.originCol + 0.5) * cellWidth;
                const y1 = (pair.originRow + 0.5) * cellHeight;
                const x2 = (pair.landingCol + 0.5) * cellWidth;
                const y2 = (pair.landingRow + 0.5) * cellHeight;
                
                // Calculate control point for parabolic arc (arc upward)
                const midX = (x1 + x2) / 2;
                const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                const arcHeight = Math.min(15, distance * 0.3); // Cap the height
                const midY = (y1 + y2) / 2 - arcHeight;
                
                // Full arc path
                const arcPath = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
                
                return (
                  <g key={idx} opacity={0.85}>
                    {/* Arc shadow for depth */}
                    <path
                      d={arcPath}
                      fill="none"
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                    {/* Main trajectory arc with gradient */}
                    <path
                      d={arcPath}
                      fill="none"
                      stroke={`url(#traj-gradient-${serve.playerId}-${idx})`}
                      strokeWidth="0.8"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}
            </svg>
            
            {/* Numbers overlay - rendered on top of trajectories */}
            <Box
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
                gap: "2px",
                pointerEvents: "none",
              }}
            >
              {serve.serveOrigins.flatMap((row, y) =>
                row.map((originValue, x) => {
                  const landingValue = serve.serveLandings[y][x];
                  const hasData = originValue > 0 || landingValue > 0;
                  
                  return (
                    <Flex
                      key={`num-${x}-${y}`}
                      align="center"
                      justify="center"
                      style={{ width: "100%", height: "100%" }}
                    >
                      {hasData && (
                        <Text
                          size="1"
                          weight="bold"
                          style={{
                            color: "white",
                            textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.5)",
                            fontSize: "11px",
                          }}
                        >
                          {originValue > 0 ? originValue : landingValue}
                        </Text>
                      )}
                    </Flex>
                  );
                })
              )}
            </Box>
          </Box>
        </Box>

        {/* Speed stats */}
        <Flex gap="4" justify="center" pt="2" style={{ borderTop: "1px solid var(--gray-5)" }}>
          <Flex direction="column" align="center" gap="1">
            <Flex align="center" gap="1">
              <Text size="1" color="gray">Avg Speed</Text>
            </Flex>
            <Text size="4" weight="bold">
              {serve.avgSpeed > 0 ? serve.avgSpeed.toFixed(0) : "—"}
              {serve.avgSpeed > 0 && <Text size="2" weight="regular" color="gray"> km/h</Text>}
            </Text>
          </Flex>

          <Box style={{ width: 1, background: "var(--gray-5)", alignSelf: "stretch" }} />

          <Flex direction="column" align="center" gap="1">
            <Flex align="center" gap="1">
              <Text size="1" color="gray">Top Speed</Text>
            </Flex>
            <Text size="4" weight="bold">
              {serve.topSpeed > 0 ? serve.topSpeed.toFixed(0) : "—"}
              {serve.topSpeed > 0 && <Text size="2" weight="regular" color="gray"> km/h</Text>}
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}

export function ServeHeatmap({ result, playerDisplayNames = {} }: ServeHeatmapProps) {
  const serveData = useMemo(() => {
    const players = result.players || [];
    const ballBounces = result.ball_bounces || [];

    // Filter to valid players
    const validPlayers = players
      .filter(p => p.swing_count >= PLAYER_CONFIG.MIN_SWINGS_THRESHOLD)
      .sort((a, b) => b.swing_count - a.swing_count);

    if (validPlayers.length === 0) return [];

    // Build serve data for each player
    const serveDataList: ServeData[] = validPlayers.map((player, idx) => {
      const playerIndex = idx + 1;
      const color = PLAYER_CONFIG.colors[idx % PLAYER_CONFIG.colors.length].primary;
      const displayName = playerDisplayNames[player.player_id] || `Player ${playerIndex}`;

      // Initialize grids
      const serveOrigins = createEmptyGrid();
      const serveLandings = createEmptyGrid();
      const servePairs: ServePair[] = [];

      // Get all serves for this player
      const playerServes = (player.swings || []).filter(s => s.serve);
      const speeds: number[] = [];

      playerServes.forEach(serve => {
        const serveTime = serve.ball_hit?.timestamp ?? serve.start.timestamp;
        
        if (serve.ball_speed > 0) {
          speeds.push(serve.ball_speed);
        }

        // Find the first floor bounce after this serve (landing)
        const nextBounce = ballBounces.find(b =>
          b.timestamp > serveTime &&
          b.timestamp < serveTime + 3 && // Within 3 seconds
          b.type === "floor"
        );

        if (nextBounce && nextBounce.court_pos) {
          // court_pos: [X, Y] where X=width(0-10), Y=length(0-20)
          const landingX = nextBounce.court_pos[0]; // Width position (0-10m)
          const landingY = nextBounce.court_pos[1]; // Length position (0-20m)
          
          // Calculate grid positions
          let landing = courtPosToGrid(landingX, landingY);

          // Infer serve origin: player stands on opposite baseline (back wall)
          // Net is at Y=10m. If ball lands Y < 10 (near side), serve from Y ≈ 20 (far side)
          const landsOnNearSide = landingY < COURT.netPosition;
          const originY = landsOnNearSide ? COURT.length - 1 : 1; // Near back wall
          
          // Mirror the X position: serve diagonally across the service box
          const mirroredX = COURT.width - landingX;
          
          let origin = courtPosToGrid(mirroredX, originY);
          
          // Normalize: if serve goes right→left, mirror both horizontally and vertically
          // so all serves appear to go left→right (easier to see patterns)
          if (origin.col > landing.col) {
            // Mirror horizontally (flip columns)
            origin = { col: GRID_COLS - 1 - origin.col, row: origin.row };
            landing = { col: GRID_COLS - 1 - landing.col, row: landing.row };
            // Mirror vertically (flip rows)
            origin = { col: origin.col, row: GRID_ROWS - 1 - origin.row };
            landing = { col: landing.col, row: GRID_ROWS - 1 - landing.row };
          }
          
          serveOrigins[origin.row][origin.col]++;
          serveLandings[landing.row][landing.col]++;
          
          // Track the pair for drawing lines
          servePairs.push({
            originCol: origin.col,
            originRow: origin.row,
            landingCol: landing.col,
            landingRow: landing.row,
          });
        }
      });

      // Calculate stats
      const avgSpeed = speeds.length > 0
        ? speeds.reduce((a, b) => a + b, 0) / speeds.length
        : 0;
      const topSpeed = speeds.length > 0
        ? Math.max(...speeds)
        : 0;

      return {
        playerId: player.player_id,
        playerIndex,
        displayName,
        color,
        serveOrigins,
        serveLandings,
        servePairs,
        avgSpeed,
        topSpeed,
        totalServes: playerServes.length,
      };
    });

    return serveDataList;
  }, [result, playerDisplayNames]);

  // Check if there are any serves at all
  const totalServes = serveData.reduce((sum, p) => sum + p.totalServes, 0);

  if (serveData.length === 0 || totalServes === 0) {
    return (
      <Card style={{ border: "1px solid var(--gray-5)" }}>
        <Flex
          direction="column"
          gap="2"
          p="4"
          align="center"
          justify="center"
          style={{ minHeight: 150 }}
        >
          <RocketIcon width={32} height={32} style={{ color: "var(--gray-8)" }} />
          <Text size="2" color="gray" weight="medium">No serve data available</Text>
          <Text size="1" color="gray">Serves will appear here once detected</Text>
        </Flex>
      </Card>
    );
  }

  // Filter to only show players with serves
  const playersWithServes = serveData.filter(s => s.totalServes > 0);

  return (
    <Flex direction="column" gap="4">
      <Flex wrap="wrap" gap="4">
        {playersWithServes.map((serve) => (
          <Box
            key={serve.playerId}
            style={{
              flex: "1 1 320px",
              minWidth: 280,
              maxWidth: 420,
            }}
          >
            <PlayerServeGrid serve={serve} />
          </Box>
        ))}
      </Flex>

      {/* Combined insights */}
      {playersWithServes.length > 1 && totalServes >= 2 && (
        <Flex gap="2" wrap="wrap">
          {/* Fastest serve (top speed) */}
          {(() => {
            const fastest = playersWithServes.reduce((prev, curr) =>
              curr.topSpeed > prev.topSpeed ? curr : prev
            );
            if (fastest.topSpeed > 0) {
              return (
                <Box
                  style={{
                    padding: "6px 12px",
                    background: "var(--gray-a3)",
                    borderRadius: "var(--radius-2)",
                    border: "1px solid var(--gray-6)",
                  }}
                >
                  <Text size="1" color="gray">
                    {fastest.displayName} has the fastest serve at {fastest.topSpeed.toFixed(0)} km/h
                  </Text>
                </Box>
              );
            }
            return null;
          })()}

          {/* Highest average speed */}
          {(() => {
            const highestAvg = playersWithServes.reduce((prev, curr) =>
              curr.avgSpeed > prev.avgSpeed ? curr : prev
            );
            if (highestAvg.avgSpeed > 0) {
              return (
                <Box
                  style={{
                    padding: "6px 12px",
                    background: "var(--gray-a3)",
                    borderRadius: "var(--radius-2)",
                    border: "1px solid var(--gray-6)",
                  }}
                >
                  <Text size="1" color="gray">
                    {highestAvg.displayName} has the highest average at {highestAvg.avgSpeed.toFixed(0)} km/h
                  </Text>
                </Box>
              );
            }
            return null;
          })()}

          {/* Most serves */}
          {(() => {
            const mostServes = playersWithServes.reduce((prev, curr) =>
              curr.totalServes > prev.totalServes ? curr : prev
            );
            if (mostServes.totalServes > 1) {
              return (
                <Box
                  style={{
                    padding: "6px 12px",
                    background: "var(--gray-a3)",
                    borderRadius: "var(--radius-2)",
                    border: "1px solid var(--gray-6)",
                  }}
                >
                  <Text size="1" color="gray">
                    {mostServes.displayName} served the most with {mostServes.totalServes} serves
                  </Text>
                </Box>
              );
            }
            return null;
          })()}
        </Flex>
      )}
    </Flex>
  );
}
