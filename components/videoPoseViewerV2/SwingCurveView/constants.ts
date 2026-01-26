/**
 * SwingCurveView Constants
 * 
 * Color schemes, chart configuration, and label mappings.
 */

import type { SwingPhase } from "../hooks";
import type { VelocityBodyPart, OrientationType } from "./types";

// ============================================================================
// Phase Colors
// ============================================================================

/** Background colors for swing phase regions */
export const PHASE_COLORS: Record<SwingPhase, string> = {
  neutral: "rgba(107, 114, 128, 0.15)",  // Gray, very subtle
  loading: "rgba(99, 102, 241, 0.25)",   // Indigo
  swing: "rgba(245, 158, 11, 0.25)",     // Amber
  contact: "rgba(239, 68, 68, 0.35)",    // Red
  follow: "rgba(16, 185, 129, 0.25)",    // Green
  recovery: "rgba(107, 114, 128, 0.2)",  // Gray
};

/** Line colors for swing phase boundaries */
export const PHASE_LINE_COLORS: Record<SwingPhase, string> = {
  neutral: "#6B7280",
  loading: "#6366F1",
  swing: "#F59E0B",
  contact: "#EF4444",
  follow: "#10B981",
  recovery: "#6B7280",
};

// ============================================================================
// Metric Colors
// ============================================================================

/** Colors for different metric types */
export const METRIC_COLORS = {
  velocity: "#8B5CF6",      // Purple
  acceleration: "#F97316",  // Orange
  orientation: "#22D3EE",   // Cyan
  kneeBend: "#F472B6",      // Pink
  score: "#F59E0B",         // Amber
  leftWrist: "#EC4899",     // Pink
  rightWrist: "#3B82F6",    // Blue
} as const;

// ============================================================================
// Chart Configuration
// ============================================================================

/** Padding values for the chart area */
export const CHART_PADDING = { 
  top: 24, 
  right: 16, 
  bottom: 40, 
  left: 56 
} as const;

// ============================================================================
// Labels
// ============================================================================

/** Human-readable labels for swing phases */
export const PHASE_LABELS: Record<SwingPhase, string> = {
  neutral: "Neutral",
  loading: "Loading",
  swing: "Swing",
  contact: "Contact",
  follow: "Follow-through",
  recovery: "Recovery",
};

/** Human-readable labels for body parts */
export const BODY_PART_LABELS: Record<VelocityBodyPart, string> = {
  wrist: "Wrist",
  ankle: "Ankle",
  knee: "Knee",
  hip: "Hip",
  shoulder: "Shoulder",
  elbow: "Elbow",
};

/** Human-readable labels for orientation types */
export const ORIENTATION_LABELS: Record<OrientationType, string> = {
  body: "Body Orientation (°)",
  hipAngular: "Hip Angular Vel (°/s)",
  shoulderAngular: "Shoulder Angular Vel (°/s)",
  xFactor: "X-Factor (°)",
};

/** All available body parts for velocity/acceleration views */
export const VELOCITY_BODY_PARTS: VelocityBodyPart[] = [
  "wrist", 
  "ankle", 
  "knee", 
  "hip", 
  "shoulder", 
  "elbow"
];
