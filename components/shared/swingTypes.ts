/**
 * Swing type definitions for technique analysis
 * Shared across the application for consistency
 */

export interface SwingOption {
  value: string;
  label: string;
}

// Common swings shared across all racket sports
// Values must match Shark API expected formats (e.g., "forehand_drive" not "forehand")
export const COMMON_SWINGS: SwingOption[] = [
  { value: "forehand_drive", label: "Forehand" },
  { value: "backhand_drive", label: "Backhand" },
  { value: "forehand_volley", label: "Forehand Volley" },
  { value: "backhand_volley", label: "Backhand Volley" },
  { value: "serve", label: "Serve" },
  { value: "drop_shot", label: "Drop Shot" },
  { value: "lob", label: "Lob" },
];

// Tennis-specific swings
export const TENNIS_SWINGS: SwingOption[] = [
  { value: "1h_backhand", label: "One-Handed Backhand" },
  { value: "2h_backhand", label: "Two-Handed Backhand" },
];

// Padel-specific swings
export const PADEL_SWINGS: SwingOption[] = [
  { value: "bandeja", label: "Bandeja" },
  { value: "vibora", label: "Víbora" },
  { value: "chiquita", label: "Chiquita" },
  { value: "bajada", label: "Bajada" },
  { value: "remate", label: "Remate" },
];

// Pickleball-specific swings
// Note: Values must match Shark API expected formats
export const PICKLEBALL_SWINGS: SwingOption[] = [
  { value: "dink", label: "Dink" },
];

/**
 * Get swing options for a specific sport
 */
export function getSwingOptionsForSport(sport: string | undefined): {
  common: SwingOption[];
  sportSpecific: SwingOption[];
  sportLabel: string | null;
} {
  let sportSpecific: SwingOption[] = [];
  let sportLabel: string | null = null;

  switch (sport) {
    case "tennis":
      sportSpecific = TENNIS_SWINGS;
      sportLabel = "Tennis Specific";
      break;
    case "padel":
      sportSpecific = PADEL_SWINGS;
      sportLabel = "Padel Specific";
      break;
    case "pickleball":
      sportSpecific = PICKLEBALL_SWINGS;
      sportLabel = "Pickleball Specific";
      break;
  }

  return {
    common: COMMON_SWINGS,
    sportSpecific,
    sportLabel,
  };
}

/**
 * Get all swings as a flat array for a sport
 */
export function getAllSwingsForSport(sport: string | undefined): SwingOption[] {
  const { common, sportSpecific } = getSwingOptionsForSport(sport);
  return [...common, ...sportSpecific];
}

/**
 * Get the label for a swing value
 */
export function getSwingLabel(value: string, sport?: string): string | undefined {
  const allSwings = getAllSwingsForSport(sport);
  return allSwings.find(s => s.value === value)?.label;
}
