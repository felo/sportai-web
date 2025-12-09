"use client";

import { useMemo, useId } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import type { ZoneDefinition, ZoneStat } from "../types";
import { GRID_COLS, GRID_ROWS } from "../constants/grid";

interface CourtZoneGridProps {
  zones: ZoneDefinition[];
  zoneStats: ZoneStat[];
  isVisible: boolean;
}

/**
 * Court grid visualization - matches ShotHeatmap style.
 * Renders a half-court view with zone overlays.
 */
export function CourtZoneGrid({ zones, zoneStats, isVisible }: CourtZoneGridProps) {
  const uniqueId = useId();

  // Create a grid of cells with zone assignments
  const cellZones = useMemo(() => {
    const grid: (ZoneDefinition | null)[][] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      grid[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        // Find which zone this cell belongs to
        const zone = zones.find(
          (z) => col >= z.colMin && col < z.colMax && row >= z.rowMin && row < z.rowMax
        );
        grid[row][col] = zone || null;
      }
    }
    return grid;
  }, [zones]);

  return (
    <Box
      style={{
        position: "relative",
        background: "var(--gray-3)",
        borderRadius: "var(--radius-3)",
        padding: "8px",
        border: "1px solid var(--gray-6)",
      }}
    >
      <Box
        style={{
          position: "relative",
          aspectRatio: "1 / 1", // Square for half court (10m × 10m)
        }}
      >
        {/* Grid cells */}
        <Box
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
            gap: "2px",
          }}
        >
          {cellZones.flatMap((row, rowIdx) =>
            row.map((zone, colIdx) => {
              const stat = zone ? zoneStats.find((s) => s.zoneId === zone.id) : null;
              const intensity = stat
                ? Math.max(0.2, Math.min(0.7, stat.percentage / 40))
                : 0.1;
              const cellDelay = (colIdx + rowIdx) * 40;

              return (
                <Box
                  key={`${uniqueId}-${rowIdx}-${colIdx}`}
                  style={{
                    backgroundColor: zone ? zone.color : "var(--gray-4)",
                    opacity: isVisible ? intensity : 0,
                    borderRadius: "2px",
                    transition: `opacity 0.5s ease-out ${cellDelay}ms`,
                  }}
                />
              );
            })
          )}
        </Box>

        {/* Zone labels overlay */}
        <Box
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          {zones.map((zone, idx) => {
            const stat = zoneStats.find((s) => s.zoneId === zone.id);
            const percentage = stat?.percentage || 0;

            // Calculate actual visual center based on rendered cells
            let minRow = GRID_ROWS,
              maxRow = -1,
              minCol = GRID_COLS,
              maxCol = -1;
            cellZones.forEach((row, rowIdx) => {
              row.forEach((cellZone, colIdx) => {
                if (cellZone?.id === zone.id) {
                  minRow = Math.min(minRow, rowIdx);
                  maxRow = Math.max(maxRow, rowIdx);
                  minCol = Math.min(minCol, colIdx);
                  maxCol = Math.max(maxCol, colIdx);
                }
              });
            });

            // Skip zones with no cells assigned
            if (maxRow < 0 || maxCol < 0) return null;

            // Calculate center: find the midpoint of the cell range
            const left = (((minCol + maxCol + 1) / 2) / GRID_COLS) * 100;
            const top = (((minRow + maxRow + 1) / 2) / GRID_ROWS) * 100;

            return (
              <Flex
                key={zone.id}
                direction="column"
                align="center"
                justify="center"
                gap="0"
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  top: `${top}%`,
                  transform: "translate(-50%, -50%)",
                  opacity: isVisible ? 1 : 0,
                  transition: `opacity 0.4s ease-out ${0.3 + idx * 0.05}s`,
                }}
              >
                <Box
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.65)",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    size="4"
                    weight="bold"
                    align="center"
                    style={{
                      color: "white",
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.02em",
                      textAlign: "center",
                    }}
                  >
                    {percentage.toFixed(0)}%
                  </Text>
                </Box>
              </Flex>
            );
          })}
        </Box>

        {/* Net indicator (at top) */}
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            backgroundColor: "var(--gray-12)",
            borderRadius: "2px 2px 0 0",
          }}
        />
        <Text
          size="4"
          weight="bold"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            color: "var(--gray-12)",
          }}
        >
          NET ↑
        </Text>

        {/* Back wall indicator (at bottom) */}
        <Text
          size="4"
          weight="bold"
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            color: "var(--gray-12)",
          }}
        >
          BACK WALL ↓
        </Text>
      </Box>
    </Box>
  );
}


