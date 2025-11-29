export const CONFIG = {
  // Video playback update frequency (ms)
  PLAYHEAD_UPDATE_INTERVAL: 50,
  
  // Timeline interaction
  RALLY_START_OFFSET_SECONDS: 2, // Show N seconds before rally start (to see serve)
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
    // Default for unknown types
    default: {
      rgb: { r: 122, g: 219, b: 143 },     // Mint green
      hex: "#7ADB8F",
    },
  },
  
  // Ripple animation settings
  ripple: {
    durationMs: 500,           // How long the ripple animation lasts
    minRadius: 5,              // Starting radius (before perspective)
    maxRadius: 35,             // Ending radius (before perspective)
    lineWidth: 3,              // Stroke width
    startOpacity: 0.9,         // Opacity at start of animation
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

