"use client";

import { useMemo } from "react";
import { Box, Flex, Text, Heading, Card, Badge } from "@radix-ui/themes";
import { RocketIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import { StatisticsResult, SwingWithPlayer } from "../types";
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

interface ReturnHeatmapProps {
  result: StatisticsResult;
  playerDisplayNames?: Record<number, string>;
}

interface ReturnPair {
  originCol: number;
  originRow: number;
  landingCol: number;
  landingRow: number;
}

interface ReturnData {
  playerId: number;
  playerIndex: number;
  displayName: string;
  color: string;
  returnOrigins: number[][]; // Grid of return origin counts
  returnLandings: number[][]; // Grid of return landing counts
  returnPairs: ReturnPair[]; // Individual return-to-landing connections
  avgSpeed: number;
  topSpeed: number;
  totalReturns: number;
}

// Padel court dimensions in meters
const COURT = {
  length: 20,
  width: 10,
  netPosition: 10,
};

// Grid dimensions for heatmap
const GRID_COLS = 10;
const GRID_ROWS = 5;

// Convert court position (meters) to grid cell
function courtPosToGrid(courtX: number, courtY: number): { col: number; row: number } {
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

// Single player's return heatmap with grid
function PlayerReturnGrid({ returnData }: { returnData: ReturnData }) {
  const maxOrigin = Math.max(...returnData.returnOrigins.flat(), 1);
  const maxLanding = Math.max(...returnData.returnLandings.flat(), 1);

  if (returnData.totalReturns === 0) {
    return (
      <Card style={{ border: "1px solid var(--gray-5)" }}>
        <Flex direction="column" gap="2" p="4" align="center">
          <Text size="3" weight="medium">
            {returnData.displayName}
          </Text>
          <Text size="2" color="gray">No returns detected</Text>
        </Flex>
      </Card>
    );
  }

  const cellWidth = 100 / GRID_COLS;
  const cellHeight = 100 / GRID_ROWS;

  return (
    <Card style={{ border: "1px solid var(--gray-6)", overflow: "hidden" }}>
      <Flex direction="column" gap="3" p="4">
        {/* Header */}
        <Flex justify="between" align="center">
          <Heading size="3" weight="medium">
            {returnData.displayName}
          </Heading>
          <Badge color="gray" variant="soft">
            {returnData.totalReturns} return{returnData.totalReturns !== 1 ? "s" : ""}
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
            <Text size="1" color="gray">Return position</Text>
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
            {returnData.returnOrigins.flatMap((row, y) =>
              row.map((originValue, x) => {
                const landingValue = returnData.returnLandings[y][x];
                const originIntensity = originValue / maxOrigin;
                const landingIntensity = landingValue / maxLanding;
                
                // Yellow = return position, Green = landing/target
                let bgColor = "var(--gray-4)";
                
                if (originIntensity > 0 && landingIntensity > 0) {
                  if (originIntensity >= landingIntensity) {
                    bgColor = `rgba(255, 200, 50, ${0.4 + originIntensity * 0.5})`;
                  } else {
                    bgColor = `rgba(122, 219, 143, ${0.4 + landingIntensity * 0.5})`;
                  }
                } else if (originIntensity > 0) {
                  bgColor = `rgba(255, 200, 50, ${0.4 + originIntensity * 0.5})`;
                } else if (landingIntensity > 0) {
                  bgColor = `rgba(122, 219, 143, ${0.4 + landingIntensity * 0.5})`;
                }
                
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
                        ? `Return: ${originValue}x, Target: ${landingValue}x`
                        : originValue > 0
                        ? `Return position: ${originValue}x`
                        : landingValue > 0
                        ? `Target: ${landingValue}x`
                        : ""
                    }
                  />
                );
              })
            )}
            
            {/* SVG overlay for trajectories */}
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
                {returnData.returnPairs.map((pair, idx) => {
                  const x1 = (pair.originCol + 0.5) * cellWidth;
                  const y1 = (pair.originRow + 0.5) * cellHeight;
                  const x2 = (pair.landingCol + 0.5) * cellWidth;
                  const y2 = (pair.landingRow + 0.5) * cellHeight;
                  
                  return (
                    <linearGradient
                      key={`grad-${idx}`}
                      id={`return-gradient-${returnData.playerId}-${idx}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor={getTrailColor(1)} />
                      <stop offset="100%" stopColor={getTrailColor(0)} />
                    </linearGradient>
                  );
                })}
              </defs>
              {returnData.returnPairs.map((pair, idx) => {
                const x1 = (pair.originCol + 0.5) * cellWidth;
                const y1 = (pair.originRow + 0.5) * cellHeight;
                const x2 = (pair.landingCol + 0.5) * cellWidth;
                const y2 = (pair.landingRow + 0.5) * cellHeight;
                
                const midX = (x1 + x2) / 2;
                const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                const arcHeight = Math.min(15, distance * 0.3);
                const midY = (y1 + y2) / 2 - arcHeight;
                
                const arcPath = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
                
                return (
                  <g key={idx} opacity={0.85}>
                    <path
                      d={arcPath}
                      fill="none"
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                    <path
                      d={arcPath}
                      fill="none"
                      stroke={`url(#return-gradient-${returnData.playerId}-${idx})`}
                      strokeWidth="0.8"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}
            </svg>
            
            {/* Numbers overlay */}
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
              {returnData.returnOrigins.flatMap((row, y) =>
                row.map((originValue, x) => {
                  const landingValue = returnData.returnLandings[y][x];
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
              <RocketIcon width={14} height={14} style={{ color: "var(--gray-10)" }} />
              <Text size="1" color="gray">Avg Speed</Text>
            </Flex>
            <Text size="4" weight="bold">
              {returnData.avgSpeed > 0 ? returnData.avgSpeed.toFixed(0) : "—"}
              {returnData.avgSpeed > 0 && <Text size="2" weight="regular" color="gray"> km/h</Text>}
            </Text>
          </Flex>

          <Box style={{ width: 1, background: "var(--gray-5)", alignSelf: "stretch" }} />

          <Flex direction="column" align="center" gap="1">
            <Flex align="center" gap="1">
              <LightningBoltIcon width={14} height={14} style={{ color: "var(--gray-10)" }} />
              <Text size="1" color="gray">Top Speed</Text>
            </Flex>
            <Text size="4" weight="bold">
              {returnData.topSpeed > 0 ? returnData.topSpeed.toFixed(0) : "—"}
              {returnData.topSpeed > 0 && <Text size="2" weight="regular" color="gray"> km/h</Text>}
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}

export function ReturnHeatmap({ result, playerDisplayNames = {} }: ReturnHeatmapProps) {
  const returnDataList = useMemo(() => {
    const players = result.players || [];
    const ballBounces = result.ball_bounces || [];

    // Filter to valid players
    const validPlayers = players
      .filter(p => p.swing_count >= PLAYER_CONFIG.MIN_SWINGS_THRESHOLD)
      .sort((a, b) => b.swing_count - a.swing_count);

    if (validPlayers.length === 0) return [];

    // Get all swings with player_id attached, sorted by timestamp
    const allSwings: SwingWithPlayer[] = validPlayers
      .flatMap(p => p.swings?.map(s => ({ ...s, player_id: p.player_id })) || [])
      .sort((a, b) => (a.ball_hit?.timestamp ?? a.start.timestamp) - (b.ball_hit?.timestamp ?? b.start.timestamp));

    // Find all returns: the swing after a serve by a different player
    const returns: Array<{ swing: SwingWithPlayer; servingPlayerId: number }> = [];
    
    for (let i = 0; i < allSwings.length - 1; i++) {
      const currentSwing = allSwings[i];
      if (currentSwing.serve) {
        // Look for the next swing by a different player
        for (let j = i + 1; j < allSwings.length; j++) {
          const nextSwing = allSwings[j];
          if (nextSwing.player_id !== currentSwing.player_id) {
            // This is the return
            returns.push({ swing: nextSwing, servingPlayerId: currentSwing.player_id });
            break;
          }
        }
      }
    }

    // Build return data for each player
    const returnDataMap: Record<number, ReturnData> = {};
    
    validPlayers.forEach((player, idx) => {
      const playerIndex = idx + 1;
      const color = PLAYER_CONFIG.colors[idx % PLAYER_CONFIG.colors.length].primary;
      const displayName = playerDisplayNames[player.player_id] || `Player ${playerIndex}`;

      returnDataMap[player.player_id] = {
        playerId: player.player_id,
        playerIndex,
        displayName,
        color,
        returnOrigins: createEmptyGrid(),
        returnLandings: createEmptyGrid(),
        returnPairs: [],
        avgSpeed: 0,
        topSpeed: 0,
        totalReturns: 0,
      };
    });

    // Process each return
    returns.forEach(({ swing }) => {
      const playerData = returnDataMap[swing.player_id];
      if (!playerData) return;

      const returnTime = swing.ball_hit?.timestamp ?? swing.start.timestamp;

      // Find the first bounce after this return
      const nextBounce = ballBounces.find(b =>
        b.timestamp > returnTime &&
        b.timestamp < returnTime + 3
      );

      if (nextBounce && nextBounce.court_pos) {
        const landingX = nextBounce.court_pos[0];
        const landingY = nextBounce.court_pos[1];
        
        let landing = courtPosToGrid(landingX, landingY);

        // Infer return origin: player is on opposite side of where ball lands
        const landsOnNearSide = landingY < COURT.netPosition;
        const originY = landsOnNearSide ? COURT.length - 1 : 1;
        const mirroredX = COURT.width - landingX;
        
        let origin = courtPosToGrid(mirroredX, originY);
        
        // Normalize: if return goes right→left, mirror both
        if (origin.col > landing.col) {
          origin = { col: GRID_COLS - 1 - origin.col, row: GRID_ROWS - 1 - origin.row };
          landing = { col: GRID_COLS - 1 - landing.col, row: GRID_ROWS - 1 - landing.row };
        }
        
        playerData.returnOrigins[origin.row][origin.col]++;
        playerData.returnLandings[landing.row][landing.col]++;
        playerData.returnPairs.push({
          originCol: origin.col,
          originRow: origin.row,
          landingCol: landing.col,
          landingRow: landing.row,
        });
        playerData.totalReturns++;
        
        if (swing.ball_speed > 0) {
          playerData.topSpeed = Math.max(playerData.topSpeed, swing.ball_speed);
        }
      }
    });

    // Calculate average speeds
    Object.values(returnDataMap).forEach(data => {
      if (data.totalReturns > 0) {
        const playerReturns = returns.filter(r => r.swing.player_id === data.playerId);
        const speeds = playerReturns
          .map(r => r.swing.ball_speed)
          .filter(s => s > 0);
        if (speeds.length > 0) {
          data.avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        }
      }
    });

    return Object.values(returnDataMap);
  }, [result, playerDisplayNames]);

  // Filter to only show players with returns
  const playersWithReturns = returnDataList.filter(r => r.totalReturns > 0);
  const totalReturns = playersWithReturns.reduce((sum, p) => sum + p.totalReturns, 0);

  if (playersWithReturns.length === 0 || totalReturns === 0) {
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
          <Text size="2" color="gray" weight="medium">No return data available</Text>
          <Text size="1" color="gray">Returns will appear here once detected</Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="4">
      <Flex wrap="wrap" gap="4">
        {playersWithReturns.map((returnData) => (
          <Box
            key={returnData.playerId}
            style={{
              flex: "1 1 320px",
              minWidth: 280,
              maxWidth: 420,
            }}
          >
            <PlayerReturnGrid returnData={returnData} />
          </Box>
        ))}
      </Flex>

      {/* Combined insights */}
      {playersWithReturns.length > 1 && totalReturns >= 2 && (
        <Flex gap="2" wrap="wrap">
          {/* Fastest return */}
          {(() => {
            const fastest = playersWithReturns.reduce((prev, curr) =>
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
                    {fastest.displayName} has the fastest return at {fastest.topSpeed.toFixed(0)} km/h
                  </Text>
                </Box>
              );
            }
            return null;
          })()}

          {/* Highest average */}
          {(() => {
            const highestAvg = playersWithReturns.reduce((prev, curr) =>
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

          {/* Most returns */}
          {(() => {
            const mostReturns = playersWithReturns.reduce((prev, curr) =>
              curr.totalReturns > prev.totalReturns ? curr : prev
            );
            if (mostReturns.totalReturns > 1) {
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
                    {mostReturns.displayName} returned the most with {mostReturns.totalReturns} returns
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

