// ===========================================
// FEATURE FLAGS - Master toggles for experimental features
// ===========================================
export const FEATURE_FLAGS = {
  // Audio waveform analysis (experimental - disabled due to CORS issues)
  AUDIO_ANALYSIS_ENABLED: false,
};

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

