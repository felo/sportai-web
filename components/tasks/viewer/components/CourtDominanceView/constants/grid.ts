export type Sport = "padel" | "tennis" | "pickleball";

// Sport-specific half court configurations
// All measurements in meters, from baseline/back wall to net
export const COURT_CONFIGS = {
  padel: {
    depth: 10,           // meters from back wall to net
    width: 10,           // meters side to side
    extendedDepth: 10,   // No extended area (walls contain play)
    aspectRatio: 1,      // 1:1 for half court
    backLabel: "BACK WALL",
    frontLabel: "NET",
  },
  tennis: {
    depth: 11.885,       // meters from baseline to net (23.77 / 2)
    width: 10.97,        // doubles width
    extendedDepth: 17.885, // Include 6m behind baseline for tracking
    aspectRatio: 1.5,    // Taller grid to show behind baseline
    backLabel: "BASELINE",
    frontLabel: "NET",
    serviceLineDepth: 5.485, // Distance from net to service line (11.885 - 6.40)
  },
  pickleball: {
    depth: 6.7,          // Half court (13.4 / 2)
    width: 6.1,          // Court width
    extendedDepth: 6.7,
    aspectRatio: 1.1,
    backLabel: "BASELINE",
    frontLabel: "NET",
  },
} as const;

// Default to padel for backward compatibility
export const HALF_COURT = COURT_CONFIGS.padel;

// Grid dimensions - same for all sports, mapped to different court sizes
export const GRID_COLS = 6; // Along width
export const GRID_ROWS = 6; // Along depth (court only, not extended)

// Extended grid rows for tennis (includes behind baseline)
export const EXTENDED_GRID_ROWS = 9; // 6 for court + 3 for behind baseline

// Helper to get court config for a sport
export function getCourtConfig(sport: Sport = "padel") {
  return COURT_CONFIGS[sport] || COURT_CONFIGS.padel;
}

// Helper to convert meter boundaries to grid cells
// Uses round for more even distribution and non-overlapping boundaries
export function metersToGrid(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  sport: Sport = "padel"
): { colMin: number; colMax: number; rowMin: number; rowMax: number } {
  const config = getCourtConfig(sport);
  const gridRows = sport === "tennis" ? EXTENDED_GRID_ROWS : GRID_ROWS;
  const depth = sport === "tennis" ? config.extendedDepth : config.depth;
  
  return {
    colMin: Math.round((xMin / config.width) * GRID_COLS),
    colMax: Math.round((xMax / config.width) * GRID_COLS),
    // Row 0 is at net, last row is at back/baseline
    rowMin: gridRows - Math.round((yMax / depth) * gridRows),
    rowMax: gridRows - Math.round((yMin / depth) * gridRows),
  };
}

// Padel-specific helper (backward compatible)
export function metersToGridPadel(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): { colMin: number; colMax: number; rowMin: number; rowMax: number } {
  return metersToGrid(xMin, xMax, yMin, yMax, "padel");
}



