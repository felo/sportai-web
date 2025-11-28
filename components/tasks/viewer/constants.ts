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

