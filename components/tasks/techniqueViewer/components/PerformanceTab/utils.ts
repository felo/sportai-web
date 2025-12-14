import type { SwingMetrics, RatingTier, RadarDataPoint } from "./types";
import type { SwingFrameDataV3 } from "@/components/videoPoseViewerV2/hooks/useSwingDetectionV3";
import { ATTRIBUTE_CONFIG, RATING_TIERS } from "./constants";

// ============================================================================
// SAI Score Calculation
// ============================================================================

/**
 * Calculate SAI score from metrics (weighted average with balance bonus).
 * Returns a FIFA-style rating in the 40-99 range.
 */
export function calculateSAIScore(metrics: SwingMetrics): number {
  const values = Object.values(metrics);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  
  // 70% average, 30% minimum (rewards balance)
  const balanced = (average * 0.7) + (min * 0.3);
  
  // Scale to 40-99 range (FIFA-style)
  return Math.round(40 + (balanced * 0.59));
}

// ============================================================================
// Rating Tier
// ============================================================================

/**
 * Get tier info based on SAI rating.
 */
export function getRatingTier(rating: number): RatingTier {
  if (rating >= RATING_TIERS.ELITE.min) return RATING_TIERS.ELITE;
  if (rating >= RATING_TIERS.PRO.min) return RATING_TIERS.PRO;
  if (rating >= RATING_TIERS.ADVANCED.min) return RATING_TIERS.ADVANCED;
  if (rating >= RATING_TIERS.INTERMEDIATE.min) return RATING_TIERS.INTERMEDIATE;
  return RATING_TIERS.DEVELOPING;
}

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalize a value to 0-100 scale.
 */
export function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 50;
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

// ============================================================================
// Radar Chart Data
// ============================================================================

/**
 * Convert metrics to radar chart data format (rounded to integers).
 */
export function toRadarData(metrics: SwingMetrics): RadarDataPoint[] {
  return Object.entries(metrics).map(([key, value]) => ({
    attribute: ATTRIBUTE_CONFIG[key as keyof SwingMetrics].label,
    value: Math.round(value),
  }));
}

// ============================================================================
// Frame Data Analysis
// ============================================================================

/**
 * Find peak value in frame data for a swing.
 */
export function findPeakInSwing(
  frameData: SwingFrameDataV3[],
  startFrame: number,
  endFrame: number,
  getValue: (fd: SwingFrameDataV3) => number | null
): number {
  let peak = 0;
  for (const fd of frameData) {
    if (fd.frame >= startFrame && fd.frame <= endFrame) {
      const value = getValue(fd);
      if (value !== null && Math.abs(value) > Math.abs(peak)) {
        peak = value;
      }
    }
  }
  return peak;
}

// ============================================================================
// Metric Calculation Helpers
// ============================================================================

/**
 * Calculate knee bend score from max knee bend angle.
 * More bent = lower angle (closer to 90) = higher score.
 */
export function calculateKneeBendScore(maxKneeBend: number | null): number | null {
  if (maxKneeBend === null) return null;
  // Convert angle to "bend score" where more bend = higher score
  return 180 - maxKneeBend; // e.g., 135° angle = 45 bend score
}

/**
 * Get the higher of two optional velocity values.
 */
export function getMaxVelocity(left: number | null | undefined, right: number | null | undefined): number | null {
  const leftVal = left ?? 0;
  const rightVal = right ?? 0;
  const max = Math.max(leftVal, rightVal);
  return max > 0 ? max : null;
}
