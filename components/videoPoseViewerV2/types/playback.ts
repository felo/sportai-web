/**
 * Playback Configuration Types
 * 
 * Types for video playback, preprocessing, and debug settings.
 */

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
  /** Skip frames during preprocessing for speed */
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
