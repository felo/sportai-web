// Reuse grid dimensions from ShotHeatmap (for HALF court - one side only)
// Half court: 10m wide × 10m deep (from back wall to net)
export const HALF_COURT = {
  depth: 10, // meters from back wall to net
  width: 10, // meters side to side
  aspectRatio: 1, // 1:1 for half court
};

// Use 6x6 grid for half court (finer granularity for zone analysis)
export const GRID_COLS = 6; // Along width (10m side to side)
export const GRID_ROWS = 6; // Along depth (10m back to net)

// Helper to convert meter boundaries to grid cells
// Uses round for more even distribution and non-overlapping boundaries
export function metersToGrid(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): { colMin: number; colMax: number; rowMin: number; rowMax: number } {
  return {
    colMin: Math.round((xMin / HALF_COURT.width) * GRID_COLS),
    colMax: Math.round((xMax / HALF_COURT.width) * GRID_COLS),
    // Row 0 is at net (y=10), Row 5 is at back wall (y=0)
    rowMin: GRID_ROWS - Math.round((yMax / HALF_COURT.depth) * GRID_ROWS),
    rowMax: GRID_ROWS - Math.round((yMin / HALF_COURT.depth) * GRID_ROWS),
  };
}


