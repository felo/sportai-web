/**
 * Velocity Configuration Types
 * 
 * Types for velocity tracking and display.
 */

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
