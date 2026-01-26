/**
 * SwingCurveView Types
 * 
 * Type definitions for the swing curve visualization component.
 */

import type { SwingDetectionResultV3, SwingPhase } from "../hooks";

// ============================================================================
// Metric Selection Types
// ============================================================================

/** Available metrics to display in the chart */
export type MetricType = "velocity" | "acceleration" | "orientation" | "kneeBend" | "score";

/** Which wrist/side to show for velocity metrics */
export type WristType = "left" | "right" | "both";

/** Which knee/side to show for knee bend metrics */
export type KneeType = "left" | "right" | "both";

/** Which joint angle to show in the Angles view */
export type AngleType = "knee" | "shoulder" | "elbow" | "hip";

/** Which body part velocity to show */
export type VelocityBodyPart = "wrist" | "ankle" | "knee" | "hip" | "shoulder" | "elbow";

/** Which orientation metric to show */
export type OrientationType = "body" | "hipAngular" | "shoulderAngular" | "xFactor";

// ============================================================================
// Component Props
// ============================================================================

export interface SwingCurveViewProps {
  /** Swing detection result with frame data */
  swingResult: SwingDetectionResultV3 | null;
  /** Video FPS for time calculations */
  videoFPS: number;
  /** Current frame for playhead indicator */
  currentFrame: number;
  /** Total frames in video */
  totalFrames: number;
  /** Callback when user clicks on the chart to seek */
  onSeekToFrame?: (frame: number) => void;
  /** Whether preprocessing/analysis is in progress */
  isAnalyzing?: boolean;
  /** Developer mode - shows additional metrics like swing score */
  developerMode?: boolean;
  /** Selected metric tab (controlled) */
  selectedMetric?: MetricType;
  /** Callback when metric changes */
  onMetricChange?: (metric: MetricType) => void;
  /** Selected wrist (controlled) */
  selectedWrist?: WristType;
  /** Callback when wrist changes */
  onWristChange?: (wrist: WristType) => void;
  /** Selected knee/side (controlled) */
  selectedKnee?: KneeType;
  /** Callback when knee/side changes */
  onKneeChange?: (knee: KneeType) => void;
  /** Selected angle type for angles view (controlled) */
  selectedAngleType?: AngleType;
  /** Callback when angle type changes */
  onAngleTypeChange?: (angleType: AngleType) => void;
  /** Selected body part for velocity view (controlled) */
  selectedVelocityBodyPart?: VelocityBodyPart;
  /** Callback when velocity body part changes */
  onVelocityBodyPartChange?: (bodyPart: VelocityBodyPart) => void;
  /** Selected orientation type for orientation view (controlled) */
  selectedOrientationType?: OrientationType;
  /** Callback when orientation type changes */
  onOrientationTypeChange?: (orientationType: OrientationType) => void;
  /** Confidence threshold for highlighting low-confidence frames (0-1) (controlled) */
  confidenceThreshold?: number;
  /** Callback when confidence threshold changes */
  onConfidenceThresholdChange?: (threshold: number) => void;
  /** Whether to show outer angles (180° - angle) instead of inner angles */
  useComplementaryAngles?: boolean;
  /** Custom class name */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
}

// ============================================================================
// Chart Data Types
// ============================================================================

/** A single data point for the chart */
export interface ChartDataPoint {
  frame: number;
  time: number;
  value: number | null;
  phase: SwingPhase;
}

/** Props for the SwingChart SVG component */
export interface SwingChartProps {
  data: ChartDataPoint[];
  rawData?: ChartDataPoint[];
  width: number;
  height: number;
  metricType: MetricType;
  currentFrame: number;
  onSeekToFrame?: (frame: number) => void;
  showPhases?: boolean;
  secondaryData?: ChartDataPoint[];
  secondaryLabel?: string;
  lowConfidenceRegions?: Array<{ startFrame: number; endFrame: number }>;
  velocityBodyPart?: VelocityBodyPart;
  orientationType?: OrientationType;
}

/** A region representing a swing phase */
export interface PhaseRegion {
  phase: SwingPhase;
  startFrame: number;
  endFrame: number;
}

/** A region with low confidence data */
export interface LowConfidenceRegion {
  startFrame: number;
  endFrame: number;
}
