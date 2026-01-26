/**
 * SwingCurveView Module
 * 
 * Exports the main component and all related types.
 */

// Main component
export { SwingCurveView, SwingCurveView as default } from "./SwingCurveView";

// Types
export type {
  SwingCurveViewProps,
  MetricType,
  WristType,
  KneeType,
  AngleType,
  VelocityBodyPart,
  OrientationType,
  ChartDataPoint,
  SwingChartProps,
  PhaseRegion,
  LowConfidenceRegion,
} from "./types";

// Constants (for external customization)
export {
  PHASE_COLORS,
  PHASE_LINE_COLORS,
  METRIC_COLORS,
  CHART_PADDING,
  PHASE_LABELS,
  BODY_PART_LABELS,
  ORIENTATION_LABELS,
  VELOCITY_BODY_PARTS,
} from "./constants";

// Utilities (for external use)
export { formatTime, getPhaseLabel, getMetricLabel } from "./utils";

// Sub-components (for composition)
export { SwingChart, ChartControls, EmptyState } from "./components";

// Hooks (for custom implementations)
export { useContainerSize, useChartData, useLowConfidenceRegions } from "./hooks";
