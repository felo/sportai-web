/**
 * VideoPoseViewerV2 Types
 * 
 * Comprehensive type definitions for the externally-controllable pose viewer.
 * All configuration is exposed through props for external management.
 */

import type { PoseDetectionResult, SupportedModel, MoveNetModelType, BlazePoseModelType } from "@/hooks/usePoseDetection";

// ============================================================================
// Model Configuration
// ============================================================================

export interface ModelConfig {
  /** Selected model: MoveNet or BlazePose */
  model: SupportedModel;
  /** MoveNet model variant */
  moveNetType: MoveNetModelType;
  /** BlazePose model variant */
  blazePoseType: BlazePoseModelType;
  /** Maximum number of poses to detect (1-6, only for MultiPose) */
  maxPoses: number;
  /** Enable temporal smoothing in the detector */
  enableSmoothing: boolean;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  model: "MoveNet",
  moveNetType: "SinglePose.Thunder",
  blazePoseType: "full",
  maxPoses: 1,
  enableSmoothing: false,  // Disabled for deterministic results
};

// ============================================================================
// Post-Processing Configuration
// ============================================================================

export type SmoothingMethod = "temporal" | "exponential" | "kalman";

export interface PostProcessingConfig {
  /** Enable post-processing smoothing */
  smoothingEnabled: boolean;
  /** Smoothing algorithm to use */
  smoothingMethod: SmoothingMethod;
  /** Number of frames to consider for smoothing (1-10) */
  windowSize: number;
  /** Smoothing strength/factor (0-1) */
  smoothingStrength: number;
  /** Enable interpolation between frames */
  interpolationEnabled: boolean;
  /** Number of interpolated points between frames (1-10) */
  interpolationPoints: number;
  /** Minimum confidence to apply smoothing */
  minConfidenceForSmoothing: number;
  /** Enable velocity-based smoothing (reduces jitter on fast movements) */
  velocitySmoothing: boolean;
  /** Velocity threshold for adaptive smoothing */
  velocityThreshold: number;
}

export const DEFAULT_POST_PROCESSING_CONFIG: PostProcessingConfig = {
  smoothingEnabled: true,
  smoothingMethod: "temporal",
  windowSize: 3,
  smoothingStrength: 0.5,
  interpolationEnabled: false,
  interpolationPoints: 1,
  minConfidenceForSmoothing: 0.3,
  velocitySmoothing: false,
  velocityThreshold: 50,
};

// ============================================================================
// Confidence Configuration
// ============================================================================

export type ConfidencePreset = "low" | "standard" | "high" | "very-high" | "custom";

export interface ConfidenceConfig {
  /** Preset mode or custom */
  preset: ConfidencePreset;
  /** Minimum pose score threshold (0-1) */
  minPoseScore: number;
  /** Minimum keypoint score threshold (0-1) */
  minPartScore: number;
}

export const CONFIDENCE_PRESETS: Record<Exclude<ConfidencePreset, "custom">, { minPoseScore: number; minPartScore: number }> = {
  low: { minPoseScore: 0.1, minPartScore: 0.15 },
  standard: { minPoseScore: 0.25, minPartScore: 0.3 },
  high: { minPoseScore: 0.5, minPartScore: 0.5 },
  "very-high": { minPoseScore: 0.7, minPartScore: 0.7 },
};

export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  preset: "low",
  minPoseScore: 0.1,
  minPartScore: 0.15,
};

// ============================================================================
// Resolution Configuration
// ============================================================================

export type ResolutionPreset = "fastest" | "fast" | "balanced" | "accurate" | "high" | "maximum" | "ultra" | "custom";

export interface ResolutionConfig {
  /** Preset mode or custom */
  preset: ResolutionPreset;
  /** Input resolution width */
  width: number;
  /** Input resolution height */
  height: number;
}

export const RESOLUTION_PRESETS: Record<Exclude<ResolutionPreset, "custom">, { width: number; height: number }> = {
  fastest: { width: 128, height: 128 },
  fast: { width: 192, height: 192 },
  balanced: { width: 256, height: 256 },
  accurate: { width: 384, height: 384 },
  high: { width: 512, height: 512 },
  maximum: { width: 640, height: 640 },
  ultra: { width: 1024, height: 1024 },
};

export const DEFAULT_RESOLUTION_CONFIG: ResolutionConfig = {
  preset: "ultra",
  width: 1024,
  height: 1024,
};

// ============================================================================
// Skeleton Display Configuration
// ============================================================================

export interface SkeletonDisplayConfig {
  /** Show skeleton overlay */
  showSkeleton: boolean;
  /** Show keypoint dots */
  showKeypoints: boolean;
  /** Show connection lines */
  showConnections: boolean;
  /** Show face landmarks (nose, eyes, ears) */
  showFaceLandmarks: boolean;
  /** Show tracking ID labels for multi-pose */
  showTrackingId: boolean;
  /** Show bounding box around detected poses */
  showBoundingBox: boolean;
  /** Show confidence scores on keypoints */
  showConfidenceScores: boolean;
  /** Keypoint radius in pixels */
  keypointRadius: number;
  /** Connection line width in pixels */
  connectionWidth: number;
  /** Primary skeleton color */
  skeletonColor: string;
  /** Keypoint fill color */
  keypointColor: string;
  /** Keypoint outline color */
  keypointOutlineColor: string;
  /** Opacity of skeleton overlay (0-1) */
  opacity: number;
}

export const DEFAULT_SKELETON_DISPLAY: SkeletonDisplayConfig = {
  showSkeleton: true,
  showKeypoints: true,
  showConnections: true,
  showFaceLandmarks: false,
  showTrackingId: false,
  showBoundingBox: false,
  showConfidenceScores: false,
  keypointRadius: 4,
  connectionWidth: 2,
  skeletonColor: "#7ADB8F",
  keypointColor: "#FF9800",
  keypointOutlineColor: "#7ADB8F",
  opacity: 1.0,
};

// ============================================================================
// Angle Measurement Configuration
// ============================================================================

export interface AngleConfig {
  /** Show angle measurements */
  showAngles: boolean;
  /** List of angle triplets to measure [jointA, vertex, jointC] */
  measuredAngles: Array<[number, number, number]>;
  /** Enable click-to-add angle mode */
  enableAngleClicking: boolean;
  /** Currently selected joints for new angle (0-2 joints) */
  selectedAngleJoints: number[];
  /** Show angle value in degrees */
  showAngleValue: boolean;
  /** Show angle arc visualization */
  showAngleArc: boolean;
  /** Angle display precision (decimal places) */
  anglePrecision: number;
  /** Angle line color */
  angleColor: string;
  /** Angle arc color */
  arcColor: string;
  /** Angle text color */
  textColor: string;
  /** Angle font size */
  fontSize: number;
}

// Common angle presets for racket sports
export const ANGLE_PRESETS = {
  leftElbow: [5, 7, 9] as [number, number, number],    // Left shoulder-elbow-wrist
  rightElbow: [6, 8, 10] as [number, number, number],  // Right shoulder-elbow-wrist
  leftKnee: [11, 13, 15] as [number, number, number],  // Left hip-knee-ankle
  rightKnee: [12, 14, 16] as [number, number, number], // Right hip-knee-ankle
  leftShoulder: [7, 5, 11] as [number, number, number],  // Left elbow-shoulder-hip
  rightShoulder: [8, 6, 12] as [number, number, number], // Right elbow-shoulder-hip
  leftHip: [5, 11, 13] as [number, number, number],    // Left shoulder-hip-knee
  rightHip: [6, 12, 14] as [number, number, number],   // Right shoulder-hip-knee
  torsoTilt: [5, 11, 12] as [number, number, number],  // Shoulder-hip-hip (body lean)
};

export const DEFAULT_ANGLE_CONFIG: AngleConfig = {
  showAngles: true,
  measuredAngles: [ANGLE_PRESETS.rightElbow, ANGLE_PRESETS.rightKnee],
  enableAngleClicking: false,
  selectedAngleJoints: [],
  showAngleValue: true,
  showAngleArc: true,
  anglePrecision: 0,
  angleColor: "#A855F7",
  arcColor: "rgba(168, 85, 247, 0.3)",
  textColor: "#FFFFFF",
  fontSize: 20,
};

// ============================================================================
// Body Orientation Configuration
// ============================================================================

export interface BodyOrientationConfig {
  /** Show body orientation indicator */
  showOrientation: boolean;
  /** Show orientation ellipse below feet */
  showEllipse: boolean;
  /** Show direction line/arrow */
  showDirectionLine: boolean;
  /** Show angle value in degrees */
  showAngleValue: boolean;
  /** Ellipse color */
  ellipseColor: string;
  /** Direction line color */
  lineColor: string;
  /** Text color for angle */
  textColor: string;
  /** Ellipse size multiplier (relative to shoulder width) */
  ellipseSize: number;
  /** Direction line length multiplier */
  lineLength: number;
  /** Minimum confidence for keypoints */
  minConfidence: number;
}

export const DEFAULT_BODY_ORIENTATION_CONFIG: BodyOrientationConfig = {
  showOrientation: true,
  showEllipse: true,
  showDirectionLine: true,
  showAngleValue: true,
  ellipseColor: "rgba(74, 222, 128, 0.4)",
  lineColor: "#4ADE80",
  textColor: "#FFFFFF",
  ellipseSize: 300,
  lineLength: 1.0,
  minConfidence: 0.3,
};

// ============================================================================
// Trajectory Configuration
// ============================================================================

export interface TrajectoryConfig {
  /** Show joint trajectories */
  showTrajectories: boolean;
  /** Joint indices to track */
  selectedJoints: number[];
  /** Apply smoothing to trajectory paths */
  smoothTrajectories: boolean;
  /** Maximum number of points to retain in trajectory */
  maxTrajectoryPoints: number;
  /** Trajectory line width */
  lineWidth: number;
  /** Fade older points */
  enableFade: boolean;
  /** Trajectory colors per joint (cycles if fewer colors than joints) */
  colors: string[];
}

export const DEFAULT_TRAJECTORY_CONFIG: TrajectoryConfig = {
  showTrajectories: false,
  selectedJoints: [10], // Right wrist by default
  smoothTrajectories: true,
  maxTrajectoryPoints: 120,
  lineWidth: 2,
  enableFade: true,
  colors: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181"],
};

// ============================================================================
// Velocity Tracking Configuration
// ============================================================================

export interface VelocityConfig {
  /** Show velocity display */
  showVelocity: boolean;
  /** Which wrist to track */
  trackedWrist: "left" | "right" | "both";
  /** Show velocity in km/h */
  showKmh: boolean;
  /** Show velocity in mph */
  showMph: boolean;
  /** Show raw pixels/frame */
  showPixelsPerFrame: boolean;
  /** Show velocity graph */
  showGraph: boolean;
  /** Maximum velocity for graph scaling (km/h) */
  maxVelocityKmh: number;
  /** Player height in meters for velocity calculation */
  playerHeightMeters: number;
}

export const DEFAULT_VELOCITY_CONFIG: VelocityConfig = {
  showVelocity: false,
  trackedWrist: "right",
  showKmh: true,
  showMph: false,
  showPixelsPerFrame: false,
  showGraph: false,
  maxVelocityKmh: 200,
  playerHeightMeters: 1.8,
};

// ============================================================================
// Stabilization Configuration
// ============================================================================

export interface StabilizationConfig {
  /** Enable joint position stabilization (reduces jitter) */
  enabled: boolean;
  /** Stabilization strength (0-1) */
  strength: number;
  /** Velocity threshold below which stabilization applies */
  velocityThreshold: number;
  /** Apply stabilization to all joints or specific ones */
  applyToAllJoints: boolean;
  /** Specific joints to stabilize (if applyToAllJoints is false) */
  stabilizedJoints: number[];
}

export const DEFAULT_STABILIZATION_CONFIG: StabilizationConfig = {
  enabled: false,
  strength: 0.5,
  velocityThreshold: 5,
  applyToAllJoints: true,
  stabilizedJoints: [],
};

// ============================================================================
// Pose Stability Filter Configuration (Banana Frame Detection)
// ============================================================================

export interface PoseStabilityFilterConfig {
  /** Enable banana frame detection and recovery */
  enabled: boolean;
  /** Use simple mirror-only mode (skip state machine) */
  mirrorOnlyMode: boolean;
  /** Enable mirroring from stable opposite side */
  enableMirrorRecovery: boolean;
  /** Maximum segment length change per frame (ratio, e.g., 1.25 = 25%) */
  maxSegmentChange: number;
  /** Maximum angle change per frame (degrees) */
  maxAngleChange: number;
  /** Similarity threshold for recovery detection */
  similarityThreshold: number;
  /** Enable motion simulation during recovery */
  enableSimulation: boolean;
  /** Number of stable frames required to exit recovery */
  recoveryFrameCount: number;
}

export const DEFAULT_STABILITY_FILTER_CONFIG: PoseStabilityFilterConfig = {
  enabled: false,
  mirrorOnlyMode: true,
  enableMirrorRecovery: true,
  maxSegmentChange: 1.25,
  maxAngleChange: 25,
  similarityThreshold: 0.8,
  enableSimulation: false,
  recoveryFrameCount: 3,
};

// ============================================================================
// Preprocessing Configuration
// ============================================================================

export interface PreprocessingConfig {
  /** Allow automatic preprocessing when pose is enabled */
  allowAutoPreprocess: boolean;
  /** Target FPS for preprocessing (null = auto-detect) */
  targetFPS: number | null;
  /** Show preprocessing progress overlay */
  showProgress: boolean;
  /** Skip frames during preprocessing for speed (1 = every frame, 2 = every other frame) */
  frameSkip: number;
}

export const DEFAULT_PREPROCESSING_CONFIG: PreprocessingConfig = {
  allowAutoPreprocess: true,
  targetFPS: null,
  showProgress: true,
  frameSkip: 1,
};

// ============================================================================
// Playback Configuration
// ============================================================================

export interface PlaybackConfig {
  /** Playback speed multiplier */
  speed: number;
  /** Loop video */
  loop: boolean;
  /** Mute video */
  muted: boolean;
  /** Auto-play when loaded */
  autoPlay: boolean;
}

export const PLAYBACK_SPEEDS = [0.1, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0];

export const DEFAULT_PLAYBACK_CONFIG: PlaybackConfig = {
  speed: 1.0,
  loop: false,
  muted: true,
  autoPlay: false,
};

// ============================================================================
// Protocols Configuration
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

/** Which wrist(s) to use for velocity calculation */
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
  /** Which wrist(s) to use for velocity: "both" (sum), "max", or "dominant" */
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
  /** Seconds before followEnd to start the clip (for analysis) */
  clipLeadTime: number;
  /** Seconds after followEnd to end the clip (for analysis) */
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
// Protocol Events (detected by protocols)
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

/** Color scheme for protocol events */
export const PROTOCOL_EVENT_COLORS: Record<string, string> = {
  "swing-detection-v1": "#FF6B6B",
  "swing-detection-v2": "#4ECDC4",
  "swing-detection-v3": "#8B5CF6",
  "loading-position": "#F59E0B",  // Amber - marks peak coil/backswing
  "serve-preparation": "#F59E0B", // Amber - same as loading (rocket icon)
  "serve-follow-through": "#95E1D3", // Mint - follow through position
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

// ============================================================================
// Debug Configuration
// ============================================================================

export interface DebugConfig {
  /** Show debug overlay with frame info */
  showDebugOverlay: boolean;
  /** Show FPS counter */
  showFPS: boolean;
  /** Show detection timing */
  showDetectionTiming: boolean;
  /** Show memory usage */
  showMemoryUsage: boolean;
  /** Log detection results to console */
  logDetections: boolean;
  /** Show preprocessing stats */
  showPreprocessingStats: boolean;
  /** Show video metadata */
  showVideoMetadata: boolean;
}

export const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  showDebugOverlay: false,
  showFPS: true,
  showDetectionTiming: false,
  showMemoryUsage: false,
  logDetections: false,
  showPreprocessingStats: true,
  showVideoMetadata: false,
};

// ============================================================================
// Combined Viewer Configuration
// ============================================================================

export interface ViewerConfig {
  model: ModelConfig;
  postProcessing: PostProcessingConfig;
  confidence: ConfidenceConfig;
  resolution: ResolutionConfig;
  skeleton: SkeletonDisplayConfig;
  angles: AngleConfig;
  bodyOrientation: BodyOrientationConfig;
  trajectories: TrajectoryConfig;
  velocity: VelocityConfig;
  stabilization: StabilizationConfig;
  stabilityFilter: PoseStabilityFilterConfig;
  preprocessing: PreprocessingConfig;
  playback: PlaybackConfig;
  protocols: ProtocolsConfig;
  swingDetectionV3: SwingDetectionV3Config;
  debug: DebugConfig;
}

export const DEFAULT_VIEWER_CONFIG: ViewerConfig = {
  model: DEFAULT_MODEL_CONFIG,
  postProcessing: DEFAULT_POST_PROCESSING_CONFIG,
  confidence: DEFAULT_CONFIDENCE_CONFIG,
  resolution: DEFAULT_RESOLUTION_CONFIG,
  skeleton: DEFAULT_SKELETON_DISPLAY,
  angles: DEFAULT_ANGLE_CONFIG,
  bodyOrientation: DEFAULT_BODY_ORIENTATION_CONFIG,
  trajectories: DEFAULT_TRAJECTORY_CONFIG,
  velocity: DEFAULT_VELOCITY_CONFIG,
  stabilization: DEFAULT_STABILIZATION_CONFIG,
  stabilityFilter: DEFAULT_STABILITY_FILTER_CONFIG,
  preprocessing: DEFAULT_PREPROCESSING_CONFIG,
  playback: DEFAULT_PLAYBACK_CONFIG,
  protocols: DEFAULT_PROTOCOLS_CONFIG,
  swingDetectionV3: DEFAULT_SWING_DETECTION_V3_CONFIG,
  debug: DEFAULT_DEBUG_CONFIG,
};

// ============================================================================
// Viewer State (read-only, exposed by the viewer)
// ============================================================================

export interface ViewerState {
  /** Current video URL */
  videoUrl: string;
  /** Video is loaded and ready */
  isVideoReady: boolean;
  /** Video is currently playing */
  isPlaying: boolean;
  /** Current video time in seconds */
  currentTime: number;
  /** Video duration in seconds */
  duration: number;
  /** Current frame number */
  currentFrame: number;
  /** Total frame count */
  totalFrames: number;
  /** Detected video FPS */
  videoFPS: number;
  /** How FPS was detected: 'default' | 'counted' | 'metadata' */
  fpsDetectionMethod: 'default' | 'counted' | 'metadata';
  /** Video dimensions */
  videoDimensions: { width: number; height: number };
  /** Is video portrait orientation */
  isPortrait: boolean;
  /** Pose model is loading */
  isModelLoading: boolean;
  /** Pose detection is running */
  isDetecting: boolean;
  /** Current detected poses */
  currentPoses: PoseDetectionResult[];
  /** Selected pose index (for multi-pose) */
  selectedPoseIndex: number;
  /** Preprocessing in progress */
  isPreprocessing: boolean;
  /** Preprocessing progress (0-100) */
  preprocessProgress: number;
  /** Using preprocessed poses */
  usingPreprocessedPoses: boolean;
  /** Total preprocessed frames */
  preprocessedFrameCount: number;
  /** Protocol events detected */
  protocolEvents: ProtocolEvent[];
  /** Detected handedness result */
  handednessResult: {
    dominantHand: "left" | "right";
    confidence: number;
  } | null;
  /** Current active tab inside the viewer (swings or data-analysis) */
  activeTab: "swings" | "data-analysis";
  /** Error message if any */
  error: string | null;
}

// ============================================================================
// Viewer Callbacks
// ============================================================================

export interface ViewerCallbacks {
  /** Called when pose detection results change */
  onPoseChange?: (poses: PoseDetectionResult[], frame: number) => void;
  /** Called when video metadata loads */
  onVideoLoad?: (width: number, height: number, duration: number, fps: number) => void;
  /** Called when playback state changes */
  onPlaybackChange?: (isPlaying: boolean) => void;
  /** Called when current time changes */
  onTimeUpdate?: (currentTime: number, currentFrame: number) => void;
  /** Called when FPS is detected */
  onFPSDetected?: (fps: number, method: 'default' | 'counted' | 'metadata') => void;
  /** Called when preprocessing completes */
  onPreprocessComplete?: (frameCount: number, fps: number) => void;
  /** Called when handedness is detected */
  onHandednessDetected?: (dominantHand: "left" | "right", confidence: number) => void;
  /** Called when protocol events are detected/updated */
  onProtocolEvents?: (events: ProtocolEvent[]) => void;
  /** Called on error */
  onError?: (error: string) => void;
  /** Called when frame is captured (for analysis) */
  onFrameCapture?: (imageBlob: Blob, frame: number, poses: PoseDetectionResult[]) => void;
  /** Called when active tab changes inside the viewer */
  onActiveTabChange?: (activeTab: "swings" | "data-analysis") => void;
}

// ============================================================================
// Viewer Control Actions (imperative handle)
// ============================================================================

export interface ViewerActions {
  /** Play video */
  play: () => void;
  /** Pause video */
  pause: () => void;
  /** Toggle play/pause */
  togglePlay: () => void;
  /** Seek to specific time */
  seekTo: (time: number) => void;
  /** Seek to specific frame */
  seekToFrame: (frame: number) => void;
  /** Step forward one frame */
  stepForward: () => void;
  /** Step backward one frame */
  stepBackward: () => void;
  /** Start preprocessing */
  startPreprocessing: () => Promise<void>;
  /** Cancel preprocessing */
  cancelPreprocessing: () => void;
  /** Clear preprocessed data */
  clearPreprocessing: () => void;
  /** Capture current frame with annotations */
  captureFrame: () => Promise<Blob | null>;
  /** Get current poses */
  getCurrentPoses: () => PoseDetectionResult[];
  /** Set selected pose index */
  setSelectedPose: (index: number) => void;
  /** Rerun all enabled protocols */
  rerunProtocols: () => void;
  /** Get preprocessed poses (for saving to server) */
  getPreprocessedPoses: () => Map<number, PoseDetectionResult[]>;
  /** Set preprocessed poses (for loading from server) */
  setPreprocessedPoses: (poses: Map<number, PoseDetectionResult[]>, fps: number) => void;
}

// ============================================================================
// Joint Names Mapping
// ============================================================================

export const MOVENET_JOINT_NAMES: Record<number, string> = {
  0: "Nose",
  1: "Left Eye",
  2: "Right Eye",
  3: "Left Ear",
  4: "Right Ear",
  5: "Left Shoulder",
  6: "Right Shoulder",
  7: "Left Elbow",
  8: "Right Elbow",
  9: "Left Wrist",
  10: "Right Wrist",
  11: "Left Hip",
  12: "Right Hip",
  13: "Left Knee",
  14: "Right Knee",
  15: "Left Ankle",
  16: "Right Ankle",
};

export const BLAZEPOSE_JOINT_NAMES: Record<number, string> = {
  0: "Nose",
  1: "Left Eye (Inner)",
  2: "Left Eye",
  3: "Left Eye (Outer)",
  4: "Right Eye (Inner)",
  5: "Right Eye",
  6: "Right Eye (Outer)",
  7: "Left Ear",
  8: "Right Ear",
  9: "Mouth (Left)",
  10: "Mouth (Right)",
  11: "Left Shoulder",
  12: "Right Shoulder",
  13: "Left Elbow",
  14: "Right Elbow",
  15: "Left Wrist",
  16: "Right Wrist",
  17: "Left Pinky",
  18: "Right Pinky",
  19: "Left Index",
  20: "Right Index",
  21: "Left Thumb",
  22: "Right Thumb",
  23: "Left Hip",
  24: "Right Hip",
  25: "Left Knee",
  26: "Right Knee",
  27: "Left Ankle",
  28: "Right Ankle",
  29: "Left Heel",
  30: "Right Heel",
  31: "Left Foot Index",
  32: "Right Foot Index",
};

export function getJointName(index: number, model: SupportedModel): string {
  const names = model === "BlazePose" ? BLAZEPOSE_JOINT_NAMES : MOVENET_JOINT_NAMES;
  return names[index] || `Joint ${index}`;
}

export function getJointCount(model: SupportedModel): number {
  return model === "BlazePose" ? 33 : 17;
}
