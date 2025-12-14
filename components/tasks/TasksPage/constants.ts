// ============================================================================
// Task Type Options
// ============================================================================

export const TASK_TYPES = [
  { value: "statistics", label: "Statistics" },
  { value: "technique", label: "Technique" },
  // Add more task types as needed
  // { value: "activity_detection", label: "Activity Detection" },
] as const;

// ============================================================================
// Sport Options
// ============================================================================

export const SPORTS = [
  { value: "all", label: "Other" },
  { value: "padel", label: "Padel" },
  { value: "tennis", label: "Tennis" },
  { value: "pickleball", label: "Pickleball" },
] as const;

// ============================================================================
// Status Colors
// ============================================================================

export const STATUS_COLORS = {
  pending: "orange",
  processing: "blue",
  completed: "green",
  failed: "red",
} as const;

// ============================================================================
// Sport Colors
// ============================================================================

export const SPORT_COLORS = {
  padel: "cyan",
  tennis: "orange",
  pickleball: "green",
} as const;

// ============================================================================
// Sport Labels
// ============================================================================

export const SPORT_LABELS = {
  padel: "Padel",
  tennis: "Tennis",
  pickleball: "Pickleball",
} as const;

// ============================================================================
// Sort Configuration
// ============================================================================

export const STATUS_SORT_ORDER = {
  pending: 0,
  processing: 1,
  completed: 2,
  failed: 3,
} as const;

// ============================================================================
// Polling Intervals
// ============================================================================

export const TASK_POLL_INTERVAL_MS = 30000; // 30 seconds
export const TICK_INTERVAL_MS = 30000; // 30 seconds for UI refresh
