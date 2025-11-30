// ===========================================
// FEATURE FLAGS - Master toggles for experimental features
// ===========================================
export const FEATURE_FLAGS = {
  // Audio waveform analysis (experimental - disabled due to CORS issues)
  AUDIO_ANALYSIS_ENABLED: false,
};

// ===========================================
// SWING TYPE COLORS - Consistent across all charts
// ===========================================
export const SWING_TYPE_COLORS: Record<string, string> = {
  forehand: "#10B981",        // Emerald
  backhand: "#06B6D4",        // Cyan
  backhand_one_hand: "#06B6D4",
  backhand_two_hand: "#0EA5E9", // Sky
  backhand_2h: "#0EA5E9",
  serve: "#8B5CF6",           // Purple
  volley: "#F59E0B",          // Amber
  overhead: "#84CC16",        // Lime
  smash: "#84CC16",
  drop: "#EC4899",            // Pink
  dropshot: "#EC4899",
  slice: "#14B8A6",           // Teal
  lob: "#6366F1",             // Indigo
  flat: "#A855F7",            // Purple variant
  kick: "#D946EF",            // Fuchsia
  topspin: "#14B8A6",
  other: "#6B7280",           // Gray
  unknown: "#9CA3AF",         // Light gray
};

// Fallback colors for unrecognized swing types
export const SWING_TYPE_FALLBACK_COLORS = [
  "#10B981", "#3B82F6", "#8B5CF6", "#F59E0B",
  "#06B6D4", "#6366F1", "#14B8A6", "#84CC16",
];

/**
 * Get color for a swing type with fallback
 */
export function getSwingTypeColor(swingType: string, fallbackIndex: number = 0): string {
  const normalized = swingType.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return SWING_TYPE_COLORS[normalized] || SWING_TYPE_FALLBACK_COLORS[fallbackIndex % SWING_TYPE_FALLBACK_COLORS.length];
}

// ===========================================
// CHART THEME - Nivo/D3 compatible
// ===========================================
export const CHART_THEME = {
  background: "transparent",
  text: {
    fontSize: 11,
    fill: "var(--gray-11)",
  },
  axis: {
    domain: {
      line: {
        stroke: "var(--gray-6)",
        strokeWidth: 1,
      },
    },
    ticks: {
      line: {
        stroke: "var(--gray-6)",
        strokeWidth: 1,
      },
      text: {
        fontSize: 10,
        fill: "var(--gray-10)",
      },
    },
    legend: {
      text: {
        fontSize: 11,
        fill: "var(--gray-11)",
        fontWeight: 500,
      },
    },
  },
  grid: {
    line: {
      stroke: "var(--gray-4)",
      strokeWidth: 1,
    },
  },
  legends: {
    text: {
      fontSize: 11,
      fill: "var(--gray-11)",
    },
  },
  tooltip: {
    container: {
      background: "var(--gray-2)",
      color: "var(--gray-12)",
      fontSize: 12,
      borderRadius: 8,
      boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      border: "1px solid var(--gray-6)",
    },
  },
};

// ===========================================
// WINNER NICKNAMES - Fun titles for leaders
// ===========================================
export const WINNER_NICKNAMES = {
  most_shots: [
    "Rally Monster", "Shot Factory", "Tap-Tap Titan", "Rally Machine",
    "Ball Cyclone", "Volley Vortex", "Endless Rallyer", "Hit Storm",
    "Shot Engine", "Rally Goblin",
  ],
  fastest_sprint: [
    "Lightning Legs", "Turbo Dash", "Flash Step", "Speed Demon",
    "Quickfire Stride", "Rocket Runner", "Blitz Feet", "Turbo Sneakers",
    "Flash Motion", "Sprint Wizard",
  ],
  most_distance: [
    "Court Explorer", "Endless Runner", "Energy Machine", "Marathon Maker",
    "Distance Dynamo", "Court Wanderer", "Stamina Sprinter", "Mileage Master",
    "Roaming Rocket", "Track Trotter",
  ],
  hardest_shot: [
    "Smash Cannon", "Rocket Racket", "Boom Ball", "Power Blaster",
    "Thunder Smash", "Ball Crusher", "Impact Titan", "Velocity Vandal",
    "Smash Reactor", "Shockwave Shot",
  ],
} as const;

export type WinnerCategory = keyof typeof WINNER_NICKNAMES;

/**
 * Get a random nickname for a winner category (stable per session using seed)
 */
export function getRandomNickname(category: WinnerCategory, seed: number): string {
  const nicknames = WINNER_NICKNAMES[category];
  const index = Math.abs(seed) % nicknames.length;
  return nicknames[index];
}

// ===========================================
// PLAYER SETTINGS
// ===========================================
export const PLAYER_CONFIG = {
  // Minimum swings to be considered a "valid" player
  MIN_SWINGS_THRESHOLD: 10,
  
  // Colors for each player (used for heatmaps, dots, boxes)
  colors: [
    { 
      primary: "#3B82F6",      // Blue - Player 1
      heatmap: "rgba(59, 130, 246, 0.6)",
      rgb: { r: 59, g: 130, b: 246 },
    },
    { 
      primary: "#EF4444",      // Red - Player 2
      heatmap: "rgba(239, 68, 68, 0.6)",
      rgb: { r: 239, g: 68, b: 68 },
    },
    { 
      primary: "#10B981",      // Emerald - Player 3
      heatmap: "rgba(16, 185, 129, 0.6)",
      rgb: { r: 16, g: 185, b: 129 },
    },
    { 
      primary: "#F59E0B",      // Amber - Player 4
      heatmap: "rgba(245, 158, 11, 0.6)",
      rgb: { r: 245, g: 158, b: 11 },
    },
  ],
};

export const CONFIG = {
  // Video playback update frequency (ms)
  PLAYHEAD_UPDATE_INTERVAL: 50,
  
  // Timeline interaction
  RALLY_START_OFFSET_SECONDS: 1, // Show N seconds before rally start (to see serve)
  EVENT_DETECTION_THRESHOLD: 0.3, // Seconds tolerance for event glow
  EVENT_TOOLTIP_THRESHOLD: 0.15, // Seconds tolerance for auto-showing tooltip
  EVENT_TOOLTIP_DURATION: 2000, // How long tooltip stays visible (ms)
  
  // Video resize constraints
  VIDEO_MIN_WIDTH: 300,
  VIDEO_MAX_WIDTH: 1200,
  VIDEO_DEFAULT_WIDTH: 800,
};

// ===========================================
// OVERLAY COLORS - Centralized color config
// ===========================================
export const OVERLAY_COLORS = {
  // Ball trail colors (gradient from current to old)
  trail: {
    current: { r: 122, g: 219, b: 143 },  // Mint green #7ADB8F
    old: { r: 255, g: 200, b: 50 },        // Yellow
  },
  
  // Ball indicator
  indicator: {
    fill: "rgba(122, 219, 143, 0.3)",
    stroke: "#7ADB8F",
    glow: "rgba(122, 219, 143, 0.4)",
    crosshair: "rgba(122, 219, 143, 0.5)",
  },
  
  // Bounce ripple effects (matching RallyTimeline)
  bounce: {
    floor: {
      rgb: { r: 245, g: 158, b: 11 },      // Orange - var(--orange-9)
      hex: "#F59E0B",
    },
    swing: {
      rgb: { r: 168, g: 85, b: 247 },      // Purple - var(--purple-9)
      hex: "#A855F7",
    },
    inferred: {
      rgb: { r: 236, g: 72, b: 153 },      // Pink - var(--pink-9) - between orange and purple
      hex: "#EC4899",
    },
    // Default for unknown types
    default: {
      rgb: { r: 122, g: 219, b: 143 },     // Mint green
      hex: "#7ADB8F",
    },
  },
  
  // Ripple animation settings
  ripple: {
    durationMs: 500,           // How long the ripple animation lasts
    minRadius: 7.5,            // Starting radius (before perspective) - 1.5x bigger
    maxRadius: 52.5,           // Ending radius (before perspective) - 1.5x bigger
    lineWidth: 4.5,            // Stroke width - 1.5x bigger
    startOpacity: 0.95,        // Opacity at start of animation - less transparent
  },
  
  // Velocity display settings
  velocity: {
    backgroundColor: "rgba(30, 30, 30, 0.85)",
    borderColor: "#7ADB8F",
    textColor: "#FFFFFF",
    unitColor: "#7ADB8F",
    fontSize: 16,              // Font size in pixels (before perspective scaling)
    padding: 8,                // Padding inside the box
    borderRadius: 6,           // Border radius
    displayDurationMs: 1500,   // How long to show velocity after swing
    fadeInMs: 150,             // Fade in duration
    fadeOutMs: 300,            // Fade out duration
    offsetFromBall: 40,        // Distance from ball position (before perspective)
  },
  
  // Player bounding box settings
  playerBox: {
    // Colors for each player (cycles if more players)
    colors: [
      { stroke: "#3B82F6", fill: "rgba(59, 130, 246, 0.15)" },   // Blue - Player 1
      { stroke: "#EF4444", fill: "rgba(239, 68, 68, 0.15)" },    // Red - Player 2
      { stroke: "#10B981", fill: "rgba(16, 185, 129, 0.15)" },   // Emerald - Player 3
      { stroke: "#F59E0B", fill: "rgba(245, 158, 11, 0.15)" },   // Amber - Player 4
    ],
    lineWidth: 2,
    labelFontSize: 12,
    labelPadding: 4,
    labelBackgroundOpacity: 0.85,
    displayDurationMs: 1500,   // How long to show after swing (same as velocity)
  },
};

