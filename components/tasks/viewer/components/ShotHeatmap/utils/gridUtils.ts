import { COURT, GRID_COLS, GRID_ROWS } from "../constants";
import type { CellShotInfo } from "../types";

/**
 * Convert court position (meters) to grid cell
 */
export function courtPosToGrid(
  courtX: number,
  courtY: number
): { col: number; row: number } {
  const col = Math.floor((courtY / COURT.length) * GRID_COLS);
  const row = Math.floor((courtX / COURT.width) * GRID_ROWS);
  return {
    col: Math.max(0, Math.min(GRID_COLS - 1, col)),
    row: Math.max(0, Math.min(GRID_ROWS - 1, row)),
  };
}

/**
 * Create empty grid for shot counts
 */
export function createEmptyGrid(): number[][] {
  return Array(GRID_ROWS)
    .fill(null)
    .map(() => Array(GRID_COLS).fill(0));
}

/**
 * Create empty details grid for shot info
 */
export function createEmptyDetailsGrid(): CellShotInfo[][][] {
  return Array(GRID_ROWS)
    .fill(null)
    .map(() =>
      Array(GRID_COLS)
        .fill(null)
        .map(() => [])
    );
}

/**
 * Get side label based on column position
 */
export function getSideLabel(col: number): string {
  return col < 6 ? "Near Side" : "Far Side";
}

/**
 * Get width label based on row position
 */
export function getWidthLabel(row: number): string {
  return row < 2 ? "Left" : row > 3 ? "Right" : "Center";
}







