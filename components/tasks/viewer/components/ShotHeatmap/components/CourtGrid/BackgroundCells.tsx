"use client";

import { Box } from "@radix-ui/themes";
import {
  GRID_COLS,
  CELL_BOUNCE_KEYFRAMES,
  CELL_ANIMATION_DURATION,
  CELL_STAGGER_DELAY,
} from "../../constants";

interface BackgroundCellsProps {
  origins: number[][];
  landings: number[][];
  maxOrigin: number;
  maxLanding: number;
  hoveredCell: { col: number; row: number } | null;
  cellsAnimating: boolean;
  cellsComplete: boolean;
}

/**
 * Background cells layer with animated heatmap coloring
 */
export function BackgroundCells({
  origins,
  landings,
  maxOrigin,
  maxLanding,
  hoveredCell,
  cellsAnimating,
  cellsComplete,
}: BackgroundCellsProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CELL_BOUNCE_KEYFRAMES }} />
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
        {origins.flatMap((row, y) =>
          row.map((originValue, x) => {
            const landingValue = landings[y][x];
            const originIntensity = originValue / maxOrigin;
            const landingIntensity = landingValue / maxLanding;
            const hasData = originValue > 0 || landingValue > 0;
            const isHovered = hoveredCell?.col === x && hoveredCell?.row === y;

            let bgColor = "var(--gray-4)";
            if (originIntensity > 0 && landingIntensity > 0) {
              bgColor =
                originIntensity >= landingIntensity
                  ? `rgba(255, 200, 50, ${0.4 + originIntensity * 0.5})`
                  : `rgba(122, 219, 143, ${0.4 + landingIntensity * 0.5})`;
            } else if (originIntensity > 0) {
              bgColor = `rgba(255, 200, 50, ${0.4 + originIntensity * 0.5})`;
            } else if (landingIntensity > 0) {
              bgColor = `rgba(122, 219, 143, ${0.4 + landingIntensity * 0.5})`;
            }

            const isNetColumn = x === Math.floor(GRID_COLS / 2);
            const cellDelay = (x + y) * CELL_STAGGER_DELAY;

            return (
              <Box
                key={`bg-${x}-${y}`}
                style={{
                  backgroundColor: bgColor,
                  borderRadius: "2px",
                  borderLeft: isNetColumn ? "2px solid var(--gray-8)" : undefined,
                  opacity: cellsComplete ? 1 : 0,
                  transform: cellsComplete
                    ? isHovered && hasData
                      ? "scale(1.15)"
                      : "scale(1)"
                    : "scale(0)",
                  boxShadow:
                    isHovered && hasData ? "0 0 10px 2px rgba(255,255,255,0.4)" : "none",
                  zIndex: isHovered && hasData ? 5 : 1,
                  animation:
                    cellsAnimating && !cellsComplete
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
    </>
  );
}





