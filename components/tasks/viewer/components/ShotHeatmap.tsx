"use client";

import { useState, useEffect, useId } from "react";
import { Box, Flex, Text, Heading, Card, Badge } from "@radix-ui/themes";
import { RocketIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import { OVERLAY_COLORS } from "../constants";
import { formatSwingType } from "../utils";
import type { BallSequenceType } from "@/types/tactical-analysis";
import type { DomainExpertise } from "@/utils/storage";

// Trail colors (same as PadelCourt2D)
const TRAIL_COLORS = {
  current: OVERLAY_COLORS.trail.current,
  old: OVERLAY_COLORS.trail.old,
};

function getTrailColor(progress: number): string {
  const r = Math.round(TRAIL_COLORS.current.r + (TRAIL_COLORS.old.r - TRAIL_COLORS.current.r) * progress);
  const g = Math.round(TRAIL_COLORS.current.g + (TRAIL_COLORS.old.g - TRAIL_COLORS.current.g) * progress);
  const b = Math.round(TRAIL_COLORS.current.b + (TRAIL_COLORS.old.b - TRAIL_COLORS.current.b) * progress);
  return `rgb(${r}, ${g}, ${b})`;
}

// Padel court dimensions
export const COURT = {
  length: 20,           // meters (horizontal in display)
  width: 10,            // meters (vertical in display)
  netPosition: 10,      // center of court
  aspectRatio: 2,       // length / width = 20 / 10 = 2
};

// Grid dimensions (12x6 = 2:1 aspect ratio matching court)
export const GRID_COLS = 12;  // Along length (20m)
export const GRID_ROWS = 6;   // Along width (10m)

// Convert court position (meters) to grid cell
export function courtPosToGrid(courtX: number, courtY: number): { col: number; row: number } {
  const col = Math.floor((courtY / COURT.length) * GRID_COLS);
  const row = Math.floor((courtX / COURT.width) * GRID_ROWS);
  return {
    col: Math.max(0, Math.min(GRID_COLS - 1, col)),
    row: Math.max(0, Math.min(GRID_ROWS - 1, row)),
  };
}

// Create empty grid
export function createEmptyGrid(): number[][] {
  return Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(0));
}

// Cell info for tooltips
export interface CellShotInfo {
  swingType: string;
  speed: number;
  isOrigin: boolean; // true = shot taken here, false = ball landed here
}

// Shared types
export interface ShotPair {
  originCol: number;
  originRow: number;
  landingCol: number;
  landingRow: number;
  swingType: string;
  speed: number;
}

export interface PlayerShotData {
  playerId: number;
  playerIndex: number;
  displayName: string;
  origins: number[][];
  landings: number[][];
  pairs: ShotPair[];
  // Cell details: [row][col] -> array of shots in that cell
  originDetails: CellShotInfo[][][];
  landingDetails: CellShotInfo[][][];
  avgSpeed: number;
  topSpeed: number;
  totalShots: number;
}

// Create empty details grid
export function createEmptyDetailsGrid(): CellShotInfo[][][] {
  return Array(GRID_ROWS).fill(null).map(() => 
    Array(GRID_COLS).fill(null).map(() => [])
  );
}

// Tooltip component for cells
interface CellTooltipProps {
  originDetails: CellShotInfo[];
  landingDetails: CellShotInfo[];
  col: number;
  row: number;
  visible: boolean;
  originLabel: string;
}

function CellTooltip({ originDetails, landingDetails, col, row, visible, originLabel }: CellTooltipProps) {
  if (!visible) return null;

  const { velocity } = OVERLAY_COLORS;
  const hasData = originDetails.length > 0 || landingDetails.length > 0;
  
  // Calculate court position in meters (center of cell)
  // col maps to length (0-20m), row maps to width (0-10m)
  const courtLengthPos = ((col + 0.5) / GRID_COLS) * COURT.length; // 0-20m
  const courtWidthPos = ((row + 0.5) / GRID_ROWS) * COURT.width;   // 0-10m
  
  // Smart positioning: adjust based on cell position in grid
  // Left edge: align tooltip to the right
  // Right edge: align tooltip to the left
  // Middle: center it
  const isNearLeftEdge = col < 3;
  const isNearRightEdge = col >= GRID_COLS - 3;
  
  let horizontalPosition: React.CSSProperties;
  let arrowPosition: React.CSSProperties;
  
  if (isNearLeftEdge) {
    // Align tooltip to the right of the cell
    horizontalPosition = { left: 0, transform: "none" };
    arrowPosition = { left: "20px", transform: "none" };
  } else if (isNearRightEdge) {
    // Align tooltip to the left of the cell
    horizontalPosition = { right: 0, transform: "none" };
    arrowPosition = { right: "20px", left: "auto", transform: "none" };
  } else {
    // Center the tooltip
    horizontalPosition = { left: "50%", transform: "translateX(-50%)" };
    arrowPosition = { left: "50%", transform: "translateX(-50%)" };
  }
  
  // Group shots by type
  const originByType: Record<string, { count: number; speeds: number[] }> = {};
  originDetails.forEach(s => {
    if (!originByType[s.swingType]) originByType[s.swingType] = { count: 0, speeds: [] };
    originByType[s.swingType].count++;
    if (s.speed > 0) originByType[s.swingType].speeds.push(s.speed);
  });
  
  const landingByType: Record<string, { count: number; speeds: number[] }> = {};
  landingDetails.forEach(s => {
    if (!landingByType[s.swingType]) landingByType[s.swingType] = { count: 0, speeds: [] };
    landingByType[s.swingType].count++;
    if (s.speed > 0) landingByType[s.swingType].speeds.push(s.speed);
  });

  return (
    <Box
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        zIndex: 1000,
        pointerEvents: "none",
        animation: "fadeIn 0.15s ease-out",
        ...horizontalPosition,
      }}
    >
      <Box
        style={{
          backgroundColor: velocity.backgroundColor,
          border: `2px solid ${velocity.borderColor}`,
          borderRadius: velocity.borderRadius,
          padding: hasData ? "8px 12px" : "6px 10px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
          minWidth: hasData ? "120px" : "auto",
        }}
      >
        {/* Grid coordinate and court position - shown for all cells */}
        <Text
          size="1"
          style={{ 
            color: "rgba(255, 255, 255, 0.6)", 
            display: "block", 
            marginBottom: hasData ? "4px" : "0",
          }}
        >
          <Text style={{ fontFamily: "monospace", color: "rgba(255, 255, 255, 0.8)" }}>({col},{row})</Text>
          {" · "}📍 {courtLengthPos.toFixed(1)}m × {courtWidthPos.toFixed(1)}m
        </Text>

        {/* Origin shots */}
        {Object.entries(originByType).map(([type, data]) => {
          const avgSpeed = data.speeds.length > 0 
            ? Math.round(data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length)
            : 0;
          return (
            <Flex key={`origin-${type}`} align="center" gap="2" style={{ marginBottom: "2px" }}>
              <Box style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: "rgba(255, 200, 50, 0.9)" }} />
              <Text size="1" style={{ color: velocity.textColor }}>
                {formatSwingType(type)} ×{data.count}
                {avgSpeed > 0 && <Text style={{ color: velocity.unitColor }}> ({avgSpeed} km/h)</Text>}
              </Text>
            </Flex>
          );
        })}

        {/* Landing shots */}
        {Object.entries(landingByType).map(([type, data]) => {
          const avgSpeed = data.speeds.length > 0 
            ? Math.round(data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length)
            : 0;
          return (
            <Flex key={`landing-${type}`} align="center" gap="2" style={{ marginBottom: "2px" }}>
              <Box style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: "rgba(122, 219, 143, 0.9)" }} />
              <Text size="1" style={{ color: velocity.textColor }}>
                {formatSwingType(type)} ×{data.count}
                {avgSpeed > 0 && <Text style={{ color: velocity.unitColor }}> ({avgSpeed} km/h)</Text>}
              </Text>
            </Flex>
          );
        })}
      </Box>
      
      {/* Arrow */}
      <Box
        style={{
          position: "absolute",
          top: "100%",
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: `6px solid ${velocity.borderColor}`,
          ...arrowPosition,
        }}
      />
    </Box>
  );
}

interface PlayerShotCardProps {
  data: PlayerShotData;
  shotLabel: string; // "Serve", "Return", "Third ball"
  originLabel: string; // "Serve position", "Return position", etc.
  countLabel: string; // "serve", "return", "shot"
  ballType?: BallSequenceType; // For tactical analysis
  sport?: DomainExpertise; // For domain-specific analysis
}

// CSS keyframes for cell bounce animation
const cellBounceKeyframes = `
@keyframes cellBounceIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  70% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
`;

// Animation timing constants
const CELL_ANIMATION_DURATION = 600; // ms per cell bounce
const CELL_STAGGER_DELAY = 40; // ms between diagonal steps
const TRAJECTORY_ANIMATION_DURATION = 500; // ms per trajectory draw
const TRAJECTORY_TOTAL_TIME = 2000; // total time for all trajectories to complete (2 seconds)
const NUMBERS_FADE_DURATION = 400; // ms for numbers to fade in

// Calculate stagger delay based on number of trajectories to fit within total time
function getTrajectoryStagger(numTrajectories: number): number {
  if (numTrajectories <= 1) return 0;
  // Ensure all trajectories complete within TRAJECTORY_TOTAL_TIME
  // Last trajectory starts at (n-1) * stagger and finishes at (n-1) * stagger + duration
  const availableTime = TRAJECTORY_TOTAL_TIME - TRAJECTORY_ANIMATION_DURATION;
  return Math.max(30, availableTime / (numTrajectories - 1)); // minimum 30ms stagger
}

// Reusable player shot card component
export function PlayerShotCard({ 
  data, 
  shotLabel, 
  originLabel, 
  countLabel,
}: PlayerShotCardProps) {
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number } | null>(null);
  const [cellsAnimating, setCellsAnimating] = useState(false);
  const [cellsComplete, setCellsComplete] = useState(false);
  const [trajectoriesComplete, setTrajectoriesComplete] = useState(false);
  const uniqueId = useId();
  
  // Phase 1: Trigger cell animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setCellsAnimating(true), 50);
    return () => clearTimeout(timer);
  }, []);
  
  // Phase 2: Mark cells complete, then trajectories will start
  useEffect(() => {
    if (cellsAnimating) {
      // Max delay is (GRID_COLS - 1 + GRID_ROWS - 1) * stagger + animation duration
      const maxCellDelay = (GRID_COLS + GRID_ROWS - 2) * CELL_STAGGER_DELAY + CELL_ANIMATION_DURATION;
      const timer = setTimeout(() => setCellsComplete(true), maxCellDelay + 100);
      return () => clearTimeout(timer);
    }
  }, [cellsAnimating]);
  
  // Phase 3: Mark trajectories complete after they finish
  useEffect(() => {
    if (cellsComplete && data.pairs.length > 0) {
      // All trajectories complete within TRAJECTORY_TOTAL_TIME
      const timer = setTimeout(() => setTrajectoriesComplete(true), TRAJECTORY_TOTAL_TIME + 100);
      return () => clearTimeout(timer);
    } else if (cellsComplete && data.pairs.length === 0) {
      // No trajectories, go straight to showing numbers
      setTrajectoriesComplete(true);
    }
  }, [cellsComplete, data.pairs.length]);
  
  const maxOrigin = Math.max(...data.origins.flat(), 1);
  const maxLanding = Math.max(...data.landings.flat(), 1);

  if (data.totalShots === 0) {
    return (
      <Card style={{ border: "1px solid var(--gray-5)" }}>
        <Flex direction="column" gap="2" p="4" align="center">
          <Text size="3" weight="medium">{data.displayName}</Text>
          <Text size="2" color="gray">No {countLabel}s detected</Text>
        </Flex>
      </Card>
    );
  }

  const cellWidth = 100 / GRID_COLS;
  const cellHeight = 100 / GRID_ROWS;

  return (
    <Card style={{ border: "1px solid var(--gray-6)", overflow: "visible" }}>
      <Flex direction="column" gap="3" p="4">
        {/* Header */}
        <Flex justify="between" align="center">
          <Heading size="3" weight="medium">{data.displayName}</Heading>
          <Badge color="gray" variant="soft">
            {data.totalShots} {countLabel}{data.totalShots !== 1 ? "s" : ""}
          </Badge>
        </Flex>

        {/* Legend */}
        <Flex gap="4" justify="center">
          <Flex align="center" gap="2">
            <Box style={{ width: 12, height: 12, borderRadius: "2px", backgroundColor: "rgba(255, 200, 50, 0.8)" }} />
            <Text size="1" color="gray">{originLabel}</Text>
          </Flex>
          <Flex align="center" gap="2">
            <Box style={{ width: 12, height: 12, borderRadius: "2px", backgroundColor: "rgba(122, 219, 143, 0.8)" }} />
            <Text size="1" color="gray">Target</Text>
          </Flex>
        </Flex>

        {/* Court grid */}
        <Box
          style={{
            position: "relative",
            background: "var(--gray-3)",
            borderRadius: "var(--radius-3)",
            padding: "8px",
            border: "1px solid var(--gray-6)",
            overflow: "visible", // Allow tooltips to overflow
          }}
        >
          <Box
            style={{
              position: "relative",
              aspectRatio: `${COURT.aspectRatio} / 1`,  // Court is 2:1 (length:width)
              overflow: "visible", // Allow tooltips to overflow
            }}
          >
            {/* Inject keyframes */}
            <style dangerouslySetInnerHTML={{ __html: cellBounceKeyframes }} />
            
            {/* Background cells layer */}
            <Box
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                gap: "2px",
                zIndex: 1,
              }}
            >
              {data.origins.flatMap((row, y) =>
                row.map((originValue, x) => {
                  const landingValue = data.landings[y][x];
                  const originIntensity = originValue / maxOrigin;
                  const landingIntensity = landingValue / maxLanding;
                  const hasData = originValue > 0 || landingValue > 0;
                  const isHovered = hoveredCell?.col === x && hoveredCell?.row === y;
                  
                  let bgColor = "var(--gray-4)";
                  if (originIntensity > 0 && landingIntensity > 0) {
                    bgColor = originIntensity >= landingIntensity
                      ? `rgba(255, 200, 50, ${0.4 + originIntensity * 0.5})`
                      : `rgba(122, 219, 143, ${0.4 + landingIntensity * 0.5})`;
                  } else if (originIntensity > 0) {
                    bgColor = `rgba(255, 200, 50, ${0.4 + originIntensity * 0.5})`;
                  } else if (landingIntensity > 0) {
                    bgColor = `rgba(122, 219, 143, ${0.4 + landingIntensity * 0.5})`;
                  }
                  
                  const isNetColumn = x === Math.floor(GRID_COLS / 2);
                  
                  // Stagger delay: top-left to bottom-right (x + y creates diagonal wave)
                  const cellDelay = (x + y) * CELL_STAGGER_DELAY;
                  
                  return (
                    <Box
                      key={`bg-${x}-${y}`}
                      style={{
                        backgroundColor: bgColor,
                        borderRadius: "2px",
                        borderLeft: isNetColumn ? "2px solid var(--gray-8)" : undefined,
                        // Start invisible - animation will reveal with bounce
                        opacity: cellsComplete ? 1 : 0,
                        transform: cellsComplete 
                          ? (isHovered && hasData ? "scale(1.15)" : "scale(1)") 
                          : "scale(0)",
                        boxShadow: isHovered && hasData ? "0 0 10px 2px rgba(255,255,255,0.4)" : "none",
                        zIndex: isHovered && hasData ? 5 : 1,
                        // Use keyframe animation for initial bounce, then switch to hover transition
                        animation: cellsAnimating && !cellsComplete 
                          ? `cellBounceIn ${CELL_ANIMATION_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1) ${cellDelay}ms forwards`
                          : "none",
                        transition: cellsComplete 
                          ? "transform 0.15s ease, box-shadow 0.15s ease"
                          : "none",
                      }}
                    />
                  );
                })
              )}
            </Box>
            
            {/* SVG trajectories */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                overflow: "visible",
                zIndex: 2,
              }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                {data.pairs.map((pair, idx) => {
                  const x1 = (pair.originCol + 0.5) * cellWidth;
                  const y1 = (pair.originRow + 0.5) * cellHeight;
                  const x2 = (pair.landingCol + 0.5) * cellWidth;
                  const y2 = (pair.landingRow + 0.5) * cellHeight;
                  
                  return (
                    <linearGradient
                      key={`grad-${idx}`}
                      id={`shot-gradient-${uniqueId}-${data.playerId}-${idx}`}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor={getTrailColor(1)} />
                      <stop offset="100%" stopColor={getTrailColor(0)} />
                    </linearGradient>
                  );
                })}
              </defs>
              {(() => {
                // Calculate stagger based on total trajectories to fit within 2 seconds
                const trajectoryStagger = getTrajectoryStagger(data.pairs.length);
                
                return data.pairs.map((pair, idx) => {
                  const x1 = (pair.originCol + 0.5) * cellWidth;
                  const y1 = (pair.originRow + 0.5) * cellHeight;
                  const x2 = (pair.landingCol + 0.5) * cellWidth;
                  const y2 = (pair.landingRow + 0.5) * cellHeight;
                  
                  const midX = (x1 + x2) / 2;
                  const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                  const arcHeight = Math.min(15, distance * 0.3);
                  const midY = (y1 + y2) / 2 - arcHeight;
                  
                  const arcPath = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
                  
                  // Approximate arc length for animation (slightly longer than straight distance)
                  const arcLength = distance * 1.2;
                  
                  // Stagger delay: dynamically calculated to fit all trajectories in 2 seconds
                  const animationDelay = idx * trajectoryStagger;
                  
                  return (
                    <g key={idx} opacity={0.85}>
                      {/* Shadow path */}
                      <path 
                        d={arcPath} 
                        fill="none" 
                        stroke="rgba(0,0,0,0.3)" 
                        strokeWidth="1.2" 
                        strokeLinecap="round"
                        strokeDasharray={arcLength}
                        strokeDashoffset={cellsComplete ? 0 : arcLength}
                        style={{
                          transition: cellsComplete 
                            ? `stroke-dashoffset ${TRAJECTORY_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) ${animationDelay}ms`
                            : "none",
                        }}
                      />
                      {/* Gradient path */}
                      <path 
                        d={arcPath} 
                        fill="none" 
                        stroke={`url(#shot-gradient-${uniqueId}-${data.playerId}-${idx})`} 
                        strokeWidth="0.8" 
                        strokeLinecap="round"
                        strokeDasharray={arcLength}
                        strokeDashoffset={cellsComplete ? 0 : arcLength}
                        style={{
                          transition: cellsComplete 
                            ? `stroke-dashoffset ${TRAJECTORY_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) ${animationDelay}ms`
                            : "none",
                        }}
                      />
                      {/* Animated dot at the end of trajectory */}
                      <circle
                        cx={x2}
                        cy={y2}
                        r="1.5"
                        fill="rgba(122, 219, 143, 0.9)"
                        style={{
                          opacity: cellsComplete ? 1 : 0,
                          transform: cellsComplete ? 'scale(1)' : 'scale(0)',
                          transformOrigin: `${x2}px ${y2}px`,
                          transition: cellsComplete 
                            ? `opacity 200ms ease ${animationDelay + TRAJECTORY_ANIMATION_DURATION - 100}ms, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1) ${animationDelay + TRAJECTORY_ANIMATION_DURATION - 100}ms`
                            : "none",
                        }}
                      />
                    </g>
                  );
                });
              })()}
            </svg>
            
            {/* Numbers overlay - fades in after trajectories complete */}
            <Box
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
                gap: "2px",
                pointerEvents: "none",
                zIndex: 3,
                opacity: trajectoriesComplete ? 1 : 0,
                transition: `opacity ${NUMBERS_FADE_DURATION}ms ease`,
              }}
            >
              {data.origins.flatMap((row, y) =>
                row.map((originValue, x) => {
                  const landingValue = data.landings[y][x];
                  const hasData = originValue > 0 || landingValue > 0;
                  const isHovered = hoveredCell?.col === x && hoveredCell?.row === y;
                  
                  return (
                    <Flex 
                      key={`num-${x}-${y}`} 
                      align="center" 
                      justify="center" 
                      style={{ 
                        width: "100%", 
                        height: "100%",
                        transition: trajectoriesComplete ? "transform 0.15s ease, filter 0.15s ease" : "none",
                        transform: isHovered && hasData ? "scale(1.3)" : "scale(1)",
                        filter: isHovered && hasData ? "drop-shadow(0 0 6px rgba(255,255,255,0.8))" : "none",
                        zIndex: isHovered ? 10 : 1,
                      }}
                    >
                      {hasData && (
                        <Text size="1" weight="bold" style={{ color: "white", textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.5)", fontSize: "11px" }}>
                          {originValue > 0 ? originValue : landingValue}
                        </Text>
                      )}
                    </Flex>
                  );
                })
              )}
            </Box>

            {/* Interactive hover layer (on top) */}
            <Box
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                gap: "2px",
                zIndex: 4,
                overflow: "visible", // Allow tooltips to overflow
              }}
            >
              {data.origins.flatMap((row, y) =>
                row.map((originValue, x) => {
                  const landingValue = data.landings[y][x];
                  const hasData = originValue > 0 || landingValue > 0;
                  const isHovered = hoveredCell?.col === x && hoveredCell?.row === y;
                  
                  // Get cell details for tooltip
                  const originDetails = data.originDetails?.[y]?.[x] || [];
                  const landingDetails = data.landingDetails?.[y]?.[x] || [];
                  
                  // Different hover styles for cells with/without data
                  const hoverStyle = isHovered 
                    ? hasData 
                      ? { 
                          boxShadow: "0 0 8px 2px rgba(255,255,255,0.5), inset 0 0 4px rgba(255,255,255,0.3)",
                          background: "rgba(255,255,255,0.15)",
                        }
                      : { 
                          boxShadow: "0 0 6px 1px rgba(255,255,255,0.3)",
                          background: "rgba(0,0,0,0.25)",
                        }
                    : { background: "transparent" };
                  
                  return (
                    <Box
                      key={`hover-${x}-${y}`}
                      onMouseEnter={() => setHoveredCell({ col: x, row: y })}
                      onMouseLeave={() => setHoveredCell(null)}
                      style={{
                        position: "relative",
                        cursor: "pointer",
                        borderRadius: "2px",
                        transition: "all 0.15s ease",
                        overflow: "visible", // Allow tooltip to overflow
                        ...hoverStyle,
                      }}
                    >
                      {/* Tooltip */}
                      <CellTooltip
                        originDetails={originDetails}
                        landingDetails={landingDetails}
                        col={x}
                        row={y}
                        visible={isHovered}
                        originLabel={originLabel}
                      />
                    </Box>
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
              {data.avgSpeed > 0 ? data.avgSpeed.toFixed(0) : "—"}
              {data.avgSpeed > 0 && <Text size="2" weight="regular" color="gray"> km/h</Text>}
            </Text>
          </Flex>

          <Box style={{ width: 1, background: "var(--gray-5)", alignSelf: "stretch" }} />

          <Flex direction="column" align="center" gap="1">
            <Flex align="center" gap="1">
              <LightningBoltIcon width={14} height={14} style={{ color: "var(--gray-10)" }} />
              <Text size="1" color="gray">Top Speed</Text>
            </Flex>
            <Text size="4" weight="bold">
              {data.topSpeed > 0 ? data.topSpeed.toFixed(0) : "—"}
              {data.topSpeed > 0 && <Text size="2" weight="regular" color="gray"> km/h</Text>}
            </Text>
          </Flex>
        </Flex>

      </Flex>
    </Card>
  );
}

interface ShotHeatmapProps {
  data: PlayerShotData[];
  shotLabel: string;
  originLabel: string;
  countLabel: string;
  emptyMessage: string;
  ballType?: BallSequenceType;
  sport?: DomainExpertise;
}

// Reusable shot heatmap container
export function ShotHeatmap({ 
  data, 
  shotLabel, 
  originLabel, 
  countLabel, 
  emptyMessage,
  ballType = "serve",
  sport = "padel",
}: ShotHeatmapProps) {
  const playersWithShots = data
    .filter(d => d.totalShots > 0)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const totalShots = playersWithShots.reduce((sum, p) => sum + p.totalShots, 0);

  if (playersWithShots.length === 0 || totalShots === 0) {
    return (
      <Card style={{ border: "1px solid var(--gray-5)" }}>
        <Flex direction="column" gap="2" p="4" align="center" justify="center" style={{ minHeight: 150 }}>
          <RocketIcon width={32} height={32} style={{ color: "var(--gray-8)" }} />
          <Text size="2" color="gray" weight="medium">{emptyMessage}</Text>
          <Text size="1" color="gray">{shotLabel}s will appear here once detected</Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="4" style={{ overflow: "visible" }}>
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          overflow: "visible",
        }}
      >
        {playersWithShots.map((playerData) => (
          <PlayerShotCard 
            key={playerData.playerId} 
            data={playerData} 
            shotLabel={shotLabel} 
            originLabel={originLabel} 
            countLabel={countLabel}
            ballType={ballType}
            sport={sport}
          />
        ))}
      </Box>

      {/* Insights */}
      {playersWithShots.length > 1 && totalShots >= 2 && (
        <Flex gap="2" wrap="wrap">
          {(() => {
            const fastest = playersWithShots.reduce((prev, curr) => curr.topSpeed > prev.topSpeed ? curr : prev);
            if (fastest.topSpeed > 0) {
              return (
                <Box style={{ padding: "6px 12px", background: "var(--gray-a3)", borderRadius: "var(--radius-2)", border: "1px solid var(--gray-6)" }}>
                  <Text size="1" color="gray">{fastest.displayName} has the fastest {countLabel} at {fastest.topSpeed.toFixed(0)} km/h</Text>
                </Box>
              );
            }
            return null;
          })()}

          {(() => {
            const highestAvg = playersWithShots.reduce((prev, curr) => curr.avgSpeed > prev.avgSpeed ? curr : prev);
            if (highestAvg.avgSpeed > 0) {
              return (
                <Box style={{ padding: "6px 12px", background: "var(--gray-a3)", borderRadius: "var(--radius-2)", border: "1px solid var(--gray-6)" }}>
                  <Text size="1" color="gray">{highestAvg.displayName} has the highest average at {highestAvg.avgSpeed.toFixed(0)} km/h</Text>
                </Box>
              );
            }
            return null;
          })()}

          {(() => {
            const most = playersWithShots.reduce((prev, curr) => curr.totalShots > prev.totalShots ? curr : prev);
            if (most.totalShots > 1) {
              return (
                <Box style={{ padding: "6px 12px", background: "var(--gray-a3)", borderRadius: "var(--radius-2)", border: "1px solid var(--gray-6)" }}>
                  <Text size="1" color="gray">{most.displayName} hit the most with {most.totalShots} {countLabel}s</Text>
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

