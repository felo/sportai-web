/**
 * Protocol Configuration Types
 * 
 * Types for analysis protocols, swing detection, and protocol events.
 */

// ============================================================================
// Protocol Definitions
// ============================================================================

export type ProtocolId = 
  | "swing-detection-v1"
  | "swing-detection-v2"
  | "swing-detection-v3"
  | "loading-position"
  | "serve-preparation"
  | "serve-follow-through"
  | "handedness-detection"
  | "tennis-contact-point"
  | "tennis-landing"
  | "tennis-trophy"
  | "wrist-speed";

export interface ProtocolDefinition {
  /** Unique identifier */
  id: ProtocolId;
  /** Display name */
  name: string;
  /** Description of what the protocol does */
  description: string;
  /** Category for grouping */
  category: "swing" | "technique" | "metrics";
  /** Whether this protocol is experimental */
  experimental?: boolean;
}

export const AVAILABLE_PROTOCOLS: ProtocolDefinition[] = [
  {
    id: "swing-detection-v1",
    name: "Swing Detection v1",
    description: "Detects swing phases using wrist velocity and acceleration patterns",
    category: "swing",
  },
  {
    id: "swing-detection-v2",
    name: "Swing Detection v2",
    description: "Enhanced swing detection with improved phase transitions",
    category: "swing",
    experimental: true,
  },
  {
    id: "swing-detection-v3",
    name: "Swing Detection v3",
    description: "Orientation-enhanced detection: correlates body rotation with wrist velocity for better accuracy",
    category: "swing",
  },
  {
    id: "loading-position",
    name: "Loading Position",
    description: "Detects the peak coil/backswing position in non-serve swings (requires Swing Detection v3)",
    category: "technique",
  },
  {
    id: "handedness-detection",
    name: "Handedness Detection",
    description: "Auto-detects if player is left or right-handed based on wrist velocity patterns",
    category: "metrics",
  },
  {
    id: "tennis-contact-point",
    name: "Tennis Contact Point",
    description: "Detects contact point (highest wrist during forward swing) in serves - conditional on Swing Detection v3",
    category: "technique",
  },
  {
    id: "serve-preparation",
    name: "Serve Preparation",
    description: "Detects preparation position (~0.4s before contact) in serves - conditional on Swing Detection v3",
    category: "technique",
  },
  {
    id: "serve-follow-through",
    name: "Serve Follow Through",
    description: "Detects follow-through/landing position after serve - conditional on Swing Detection v3",
    category: "technique",
  },
  {
    id: "tennis-trophy",
    name: "Tennis Trophy Position",
    description: "Legacy - use serve-preparation instead",
    category: "technique",
    experimental: true,
  },
  {
    id: "tennis-landing",
    name: "Tennis Landing",
    description: "Legacy - use serve-follow-through instead",
    category: "technique",
    experimental: true,
  },
  {
    id: "wrist-speed",
    name: "Wrist Speed",
    description: "Tracks and measures wrist velocity throughout swing",
    category: "metrics",
  },
];

export interface ProtocolsConfig {
  /** Protocols that should run automatically after preprocessing */
  enabledProtocols: ProtocolId[];
  /** Show protocol results overlay on video */
  showResultsOverlay: boolean;
  /** Log protocol execution to console */
  logExecution: boolean;
}

export const DEFAULT_PROTOCOLS_CONFIG: ProtocolsConfig = {
  enabledProtocols: ["swing-detection-v3", "loading-position", "serve-preparation", "tennis-contact-point", "serve-follow-through", "handedness-detection"],
  showResultsOverlay: true,
  logExecution: false,
};

// ============================================================================
// Swing Detection V3 Configuration
// ============================================================================

export type WristMode = "both" | "max" | "dominant";

export interface SwingDetectionV3Config {
  /** Enable V3 swing detection */
  enabled: boolean;
  /** Minimum wrist velocity to consider as potential swing (px/frame) */
  minVelocityThreshold: number;
  /** Minimum velocity in km/h to count as a valid swing */
  minVelocityKmh: number;
  /** Percentile for adaptive velocity threshold */
  velocityPercentile: number;
  /** Which wrist(s) to use for velocity */
  wristMode: WristMode;
  /** Minimum rotation velocity to count (degrees/frame) */
  minRotationVelocity: number;
  /** Require body rotation for swing detection */
  requireRotation: boolean;
  /** Weight for rotation in swing score (0-1) */
  rotationWeight: number;
  /** Minimum frames for a valid swing */
  minSwingDuration: number;
  /** Maximum frames for a valid swing */
  maxSwingDuration: number;
  /** Minimum seconds between consecutive swings */
  minTimeBetweenSwings: number;
  /** Rotation velocity threshold for loading phase (degrees/frame) */
  loadingRotationThreshold: number;
  /** Ratio of peak to count as contact */
  contactVelocityRatio: number;
  /** Moving average window size for smoothing */
  smoothingWindow: number;
  /** Minimum keypoint confidence */
  minConfidence: number;
  /** Enable forehand/backhand classification */
  classifySwingType: boolean;
  /** Player's dominant hand */
  handedness: "right" | "left";
  /** Show swing visualization on video */
  showSwingOverlay: boolean;
  /** Show swing phases in different colors */
  showPhaseColors: boolean;
  /** Seconds before followEnd to start the clip */
  clipLeadTime: number;
  /** Seconds after followEnd to end the clip */
  clipTrailTime: number;
}

export const DEFAULT_SWING_DETECTION_V3_CONFIG: SwingDetectionV3Config = {
  enabled: false,
  minVelocityThreshold: 1,
  minVelocityKmh: 3,
  velocityPercentile: 75,
  wristMode: "both",
  minRotationVelocity: 0.5,
  requireRotation: true,
  rotationWeight: 0.3,
  minSwingDuration: 5,
  maxSwingDuration: 60,
  minTimeBetweenSwings: 0.8,
  loadingRotationThreshold: 1.5,
  contactVelocityRatio: 0.9,
  smoothingWindow: 3,
  minConfidence: 0.3,
  classifySwingType: true,
  handedness: "right",
  showSwingOverlay: false,
  showPhaseColors: false,
  clipLeadTime: 2.0,
  clipTrailTime: 1.0,
};

// ============================================================================
// Protocol Events
// ============================================================================

export type SwingPhase = "preparation" | "backswing" | "forward" | "contact" | "follow-through";

export interface ProtocolEvent {
  /** Unique event ID */
  id: string;
  /** Protocol that generated this event */
  protocolId: ProtocolId;
  /** Event type (e.g., "swing", "contact", "trophy") */
  type: string;
  /** Start frame */
  startFrame: number;
  /** End frame (same as startFrame for point events) */
  endFrame: number;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Event label for display */
  label: string;
  /** Color for visualization */
  color: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface SwingEvent extends ProtocolEvent {
  type: "swing";
  /** Current swing phase */
  phase: SwingPhase;
  /** Peak wrist speed during swing (if available) */
  peakSpeed?: number;
}

export const PROTOCOL_EVENT_COLORS: Record<string, string> = {
  "swing-detection-v1": "#FF6B6B",
  "swing-detection-v2": "#4ECDC4",
  "swing-detection-v3": "#8B5CF6",
  "loading-position": "#F59E0B",
  "serve-preparation": "#F59E0B",
  "serve-follow-through": "#95E1D3",
  "handedness-detection": "#22D3EE",
  "tennis-contact-point": "#FFE66D",
  "tennis-landing": "#95E1D3",
  "tennis-trophy": "#A855F7",
  "wrist-speed": "#F38181",
  // Phases
  preparation: "#6B7280",
  backswing: "#3B82F6",
  forward: "#F59E0B",
  contact: "#EF4444",
  "follow-through": "#10B981",
  // V3 phases
  loading: "#6366F1",
  swing: "#F59E0B",
  follow: "#10B981",
  recovery: "#6B7280",
};
