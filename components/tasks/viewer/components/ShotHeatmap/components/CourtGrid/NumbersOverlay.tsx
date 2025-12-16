"use client";

import { Box, Flex, Text } from "@radix-ui/themes";
import { GRID_COLS, GRID_ROWS, NUMBERS_FADE_DURATION } from "../../constants";

interface NumbersOverlayProps {
  origins: number[][];
  landings: number[][];
  hoveredCell: { col: number; row: number } | null;
  trajectoriesComplete: boolean;
}

/**
 * Numbers overlay showing shot counts in each cell
 */
export function NumbersOverlay({
  origins,
  landings,
  hoveredCell,
  trajectoriesComplete,
}: NumbersOverlayProps) {
  return (
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
      {origins.flatMap((row, y) =>
        row.map((originValue, x) => {
          const landingValue = landings[y][x];
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
                transition: trajectoriesComplete
                  ? "transform 0.15s ease, filter 0.15s ease"
                  : "none",
                transform: isHovered && hasData ? "scale(1.3)" : "scale(1)",
                filter:
                  isHovered && hasData
                    ? "drop-shadow(0 0 6px rgba(255,255,255,0.8))"
                    : "none",
                zIndex: isHovered ? 10 : 1,
              }}
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
  );
}







