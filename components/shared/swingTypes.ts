/**
 * Swing type definitions for technique analysis
 * Shared across the application for consistency
 */

export interface SwingOption {
  value: string;
  label: string;
}

// Common swings shared across all racket sports
export const COMMON_SWINGS: SwingOption[] = [
  { value: "forehand", label: "Forehand" },
  { value: "backhand", label: "Backhand" },
  { value: "serve", label: "Serve" },
  { value: "volley", label: "Volley" },
  { value: "overhead", label: "Overhead / Smash" },
  { value: "slice", label: "Slice" },
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
export const PICKLEBALL_SWINGS: SwingOption[] = [
  { value: "dink", label: "Dink" },
  { value: "erne", label: "Erne" },
  { value: "third_shot_drive", label: "Third Shot Drive" },
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
