/**
 * SwingCurveView Utilities
 * 
 * Pure helper functions for formatting and data transformation.
 */

import type { SwingPhase } from "../hooks";
import type { MetricType, VelocityBodyPart, OrientationType } from "./types";
import { PHASE_LABELS, BODY_PART_LABELS, ORIENTATION_LABELS } from "./constants";

/**
 * Format seconds as a time string (e.g., "1:23.4" or "23.4s")
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return mins > 0 ? `${mins}:${secs.padStart(4, "0")}` : `${secs}s`;
}

/**
 * Get human-readable label for a swing phase
 */
export function getPhaseLabel(phase: SwingPhase): string {
  return PHASE_LABELS[phase] || phase;
}

/**
 * Get the Y-axis label for a given metric type
 */
export function getMetricLabel(
  metricType: MetricType, 
  velocityBodyPart: VelocityBodyPart,
  orientationType: OrientationType
): string {
  const bodyPartLabel = BODY_PART_LABELS[velocityBodyPart];
  
  switch (metricType) {
    case "velocity":
      return `${bodyPartLabel} Velocity (km/h)`;
    case "acceleration":
      return `${bodyPartLabel} Acceleration (km/h/s)`;
    case "orientation":
      return ORIENTATION_LABELS[orientationType];
    case "kneeBend":
      return "Angles (°)";
    case "score":
      return "Swing Score";
    default:
      return "";
  }
}
