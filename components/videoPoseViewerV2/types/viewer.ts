/**
 * Viewer Types
 * 
 * Combined configuration, state, callbacks, and actions for the viewer.
 */

import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import type { ModelConfig } from "./model";
import type { 
  PostProcessingConfig, 
  ConfidenceConfig, 
  ResolutionConfig, 
  StabilizationConfig,
  PoseStabilityFilterConfig,
} from "./processing";
import type { 
  SkeletonDisplayConfig, 
  AngleConfig, 
  BodyOrientationConfig, 
  TrajectoryConfig,
} from "./display";
import type { VelocityConfig } from "./velocity";
import type { 
  ProtocolsConfig, 
  SwingDetectionV3Config, 
  ProtocolEvent,
} from "./protocols";
import type { 
  PreprocessingConfig, 
  PlaybackConfig, 
  DebugConfig,
} from "./playback";

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

// Note: DEFAULT_VIEWER_CONFIG is constructed in index.ts to avoid circular imports

// ============================================================================
// Viewer State
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
  /** How FPS was detected */
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
  /** Current active tab inside the viewer */
  activeTab: "swings" | "moments" | "reports" | "data-analysis" | "performance";
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
  /** Called when frame is captured */
  onFrameCapture?: (imageBlob: Blob, frame: number, poses: PoseDetectionResult[]) => void;
  /** Called when active tab changes inside the viewer */
  onActiveTabChange?: (activeTab: "swings" | "moments" | "reports" | "data-analysis" | "performance") => void;
}

// ============================================================================
// Viewer Control Actions
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
  /** Get the video element */
  getVideoElement: () => HTMLVideoElement | null;
}
