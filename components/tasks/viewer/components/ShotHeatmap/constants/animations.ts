// CSS keyframes for cell bounce animation
export const CELL_BOUNCE_KEYFRAMES = `
@keyframes cellBounceIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  70% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
`;

// Nickname shimmer animation keyframes
export const NICKNAME_SHIMMER_KEYFRAMES = `
@keyframes nicknameShimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;

// Pulse animation keyframes
export const PULSE_KEYFRAMES = `
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.15); }
}
`;

// Animation timing constants
export const CELL_ANIMATION_DURATION = 600; // ms per cell bounce
export const CELL_STAGGER_DELAY = 40; // ms between diagonal steps
export const TRAJECTORY_ANIMATION_DURATION = 500; // ms per trajectory draw
export const TRAJECTORY_TOTAL_TIME = 2000; // total time for all trajectories to complete (2 seconds)
export const NUMBERS_FADE_DURATION = 400; // ms for numbers to fade in

/**
 * Calculate stagger delay based on number of trajectories to fit within total time
 */
export function getTrajectoryStagger(numTrajectories: number): number {
  if (numTrajectories <= 1) return 0;
  // Ensure all trajectories complete within TRAJECTORY_TOTAL_TIME
  // Last trajectory starts at (n-1) * stagger and finishes at (n-1) * stagger + duration
  const availableTime = TRAJECTORY_TOTAL_TIME - TRAJECTORY_ANIMATION_DURATION;
  return Math.max(30, availableTime / (numTrajectories - 1)); // minimum 30ms stagger
}


