"use client";

import { Box } from "@radix-ui/themes";
import { GRID_COLS } from "../../constants";
import type { CellShotInfo } from "../../types";
import { CellTooltip } from "../CellTooltip";

interface HoverLayerProps {
  origins: number[][];
  landings: number[][];
  originDetails: CellShotInfo[][][];
  landingDetails: CellShotInfo[][][];
  hoveredCell: { col: number; row: number } | null;
  setHoveredCell: (cell: { col: number; row: number } | null) => void;
  setSelectedCell: (cell: { col: number; row: number }) => void;
  originLabel: string;
}

/**
 * Interactive hover layer with tooltips
 */
export function HoverLayer({
  origins,
  landings,
  originDetails,
  landingDetails,
  hoveredCell,
  setHoveredCell,
  setSelectedCell,
  originLabel,
}: HoverLayerProps) {
  return (
    <Box
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gap: "2px",
        zIndex: 4,
        overflow: "visible",
      }}
    >
      {origins.flatMap((row, y) =>
        row.map((originValue, x) => {
          const landingValue = landings[y][x];
          const hasData = originValue > 0 || landingValue > 0;
          const isHovered = hoveredCell?.col === x && hoveredCell?.row === y;

          const cellOriginDetails = originDetails?.[y]?.[x] || [];
          const cellLandingDetails = landingDetails?.[y]?.[x] || [];

          const hoverStyle = isHovered
            ? hasData
              ? {
                  boxShadow:
                    "0 0 8px 2px rgba(255,255,255,0.5), inset 0 0 4px rgba(255,255,255,0.3)",
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
              onClick={() => setSelectedCell({ col: x, row: y })}
              style={{
                position: "relative",
                cursor: "pointer",
                borderRadius: "2px",
                transition: "all 0.15s ease",
                overflow: "visible",
                ...hoverStyle,
              }}
            >
              <CellTooltip
                originDetails={cellOriginDetails}
                landingDetails={cellLandingDetails}
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
  );
}



