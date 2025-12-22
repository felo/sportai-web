/**
 * Velocity Conversion Utilities
 * 
 * Pure functions for converting between velocity units.
 */

import { ASSUMED_PERSON_HEIGHT, TORSO_TO_HEIGHT_RATIO } from "../constants";

/**
 * Calculate meters per pixel based on average torso height in the video.
 * Uses the assumption that torso height represents ~30% of a 1.7m person.
 * 
 * @param avgTorsoHeightPx - Average torso height in pixels (shoulder to hip distance)
 * @returns Meters per pixel conversion factor
 */
export function calculateMetersPerPixel(avgTorsoHeightPx: number): number {
  const torsoHeight = avgTorsoHeightPx > 0 ? avgTorsoHeightPx : 100; // fallback 100px
  return (ASSUMED_PERSON_HEIGHT * TORSO_TO_HEIGHT_RATIO) / torsoHeight;
}

/**
 * Convert velocity from pixels/frame to km/h.
 * 
 * Formula: velocity_kmh = velocity_px_per_frame * metersPerPixel * FPS * 3.6
 * 
 * @param velocityPxPerFrame - Velocity in pixels per frame
 * @param metersPerPixel - Conversion factor from calculateMetersPerPixel()
 * @param fps - Video frames per second
 * @returns Velocity in km/h
 */
export function convertVelocityToKmh(
  velocityPxPerFrame: number,
  metersPerPixel: number,
  fps: number
): number {
  const velocityMetersPerSecond = velocityPxPerFrame * metersPerPixel * fps;
  return velocityMetersPerSecond * 3.6;
}






