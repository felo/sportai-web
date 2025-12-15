import type { ProtocolEvent } from "@/components/videoPoseViewerV2";
import type { SwingDetectionResultV3 } from "@/components/videoPoseViewerV2/hooks";

// ============================================================================
// Component Props
// ============================================================================

export interface PerformanceTabProps {
  /** Protocol events containing swing data */
  protocolEvents: ProtocolEvent[];
  /** Video element for frame capture */
  videoElement: HTMLVideoElement | null;
  /** Video FPS for time calculations */
  videoFPS: number;
  /** Callback to seek to a specific time */
  onSeekTo?: (time: number) => void;
  /** Swing detection result with frame-level data */
  swingResult?: SwingDetectionResultV3 | null;
}

// ============================================================================
// Data Types
// ============================================================================

export interface SwingMetrics {
  footwork: number;   // From knee bend (0-100)
  hip: number;        // From peak hip velocity (0-100), 100 = 10 km/h
  rotation: number;   // From x-factor separation (0-100), 100 = 150 degrees
  power: number;      // From peak wrist velocity (0-100)
  agility: number;    // From peak acceleration (0-100)
}

export interface SwingPerformanceData {
  id: string;
  index: number;
  metrics: SwingMetrics;
  saiScore: number;
  peakVelocityKmh: number;
  peakShoulderVelocityKmh: number;
  peakHipVelocityKmh: number;
  peakXFactor: number;
  rotationRange: number;
  swingType: string;
  contactTime: number;
  contactFrame: number;
  startFrame: number;
  endFrame: number;
  rawMetrics: {
    kneeBend: number | null;
    peakHipVelocity: number | null;
    peakShoulderVelocity: number | null;
    peakXFactor: number | null;
    peakWristVelocity: number | null;
    peakAcceleration: number | null;
  };
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AttributeConfig {
  label: string;
  abbrev: string;
  description: string;
}

export interface RatingTier {
  label: string;
  gradient: [string, string];
  glow: string;
}

// ============================================================================
// Radar Chart Types
// ============================================================================

export interface RadarDataPoint extends Record<string, unknown> {
  attribute: string;
  value: number;
}
