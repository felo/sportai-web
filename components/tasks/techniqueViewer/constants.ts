// Import directly from types to avoid circular dependency
// (videoPoseViewerV2/index.ts → VideoPoseViewerV2.tsx → techniqueViewer/components → constants.ts → videoPoseViewerV2/index.ts)
import { ANGLE_PRESETS } from "@/components/videoPoseViewerV2/types";
import type { ViewerState } from "@/components/videoPoseViewerV2/types";
import type { DirtyFlags } from "./types";

// ============================================================================
// Angle Presets for Full Annotation Capture
// ============================================================================

/**
 * All angle presets used for comprehensive pose capture during analysis.
 * Each tuple represents [pointA, pointB, pointC] keypoint indices.
 */
export const ALL_ANGLES: Array<[number, number, number]> = [
  ANGLE_PRESETS.leftElbow,
  ANGLE_PRESETS.rightElbow,
  ANGLE_PRESETS.leftKnee,
  ANGLE_PRESETS.rightKnee,
  ANGLE_PRESETS.leftShoulder,
  ANGLE_PRESETS.rightShoulder,
  ANGLE_PRESETS.leftHip,
  ANGLE_PRESETS.rightHip,
  ANGLE_PRESETS.torsoTilt,
];

// ============================================================================
// Initial Viewer State
// ============================================================================

export const INITIAL_VIEWER_STATE: ViewerState = {
  videoUrl: "",
  isVideoReady: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  currentFrame: 0,
  totalFrames: 0,
  videoFPS: 30,
  fpsDetectionMethod: "default",
  videoDimensions: { width: 0, height: 0 },
  isPortrait: false,
  isModelLoading: false,
  isDetecting: false,
  currentPoses: [],
  selectedPoseIndex: 0,
  isPreprocessing: false,
  preprocessProgress: 0,
  usingPreprocessedPoses: false,
  preprocessedFrameCount: 0,
  protocolEvents: [],
  handednessResult: null,
  activeTab: "swings",
  error: null,
};

// ============================================================================
// Timeline Configuration
// ============================================================================

/** Frame marker positions (percentage) on the timeline */
export const TIMELINE_MARKERS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

/** Time tolerance for showing video comments (in seconds) */
export const VIDEO_COMMENT_TIME_TOLERANCE = 0.5;

/** Debounce delay for unified save (in milliseconds) */
export const SAVE_DEBOUNCE_MS = 500;

/** Minimum swing duration for boundary validation (in seconds) */
export const MIN_SWING_DURATION = 0.05;

// ============================================================================
// Dirty Flags Default
// ============================================================================

export { DEFAULT_DIRTY_FLAGS } from "./types";









