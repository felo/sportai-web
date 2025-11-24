export const DEFAULT_VIDEO_FPS = 30;
export const DEFAULT_PERSON_HEIGHT_METERS = 1.8;
export const MAX_VELOCITY_KMH = 300;
export const LABEL_POSITION_STABILITY_FRAMES = 5;
export const MAX_PREPROCESSED_POINTS = 1000;
export const VELOCITY_HISTORY_LENGTH = 3;

export const CONFIDENCE_PRESETS = {
  standard: { minPoseScore: 0.25, minPartScore: 0.3 },
  high: { minPoseScore: 0.5, minPartScore: 0.5 },
  low: { minPoseScore: 0.15, minPartScore: 0.2 },
} as const;

export const RESOLUTION_PRESETS = {
  fast: { width: 160, height: 160 },
  balanced: { width: 256, height: 256 },
  accurate: { width: 384, height: 384 },
} as const;

export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0];

export const COMMON_FPS_VALUES = [24, 25, 30, 50, 60, 120];




