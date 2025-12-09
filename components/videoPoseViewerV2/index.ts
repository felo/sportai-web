/**
 * VideoPoseViewerV2 Module
 * 
 * A clean, modular, externally-controllable pose detection video viewer.
 */

// Main Components
export { VideoPoseViewerV2 } from "./VideoPoseViewerV2";
export { PoseConfigurationPanel } from "./PoseConfigurationPanel";
export { PlaybackTimeline, type EventBoundaryAdjustment } from "./PlaybackTimeline";
export { SwingCurveView, type MetricType, type WristType, type KneeType, type AngleType, type VelocityBodyPart } from "./SwingCurveView";

// Types
export * from "./types";

// Re-export commonly used types from hooks
export type { PoseDetectionResult, SupportedModel } from "@/hooks/usePoseDetection";

