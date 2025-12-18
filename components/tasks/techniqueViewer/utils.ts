import type { ProtocolEvent, ProtocolId } from "@/components/videoPoseViewerV2";
import { MIN_SWING_DURATION } from "./constants";

// ============================================================================
// Sport-Specific Protocol Configuration
// ============================================================================

/**
 * Get enabled protocols based on sport type.
 * 
 * Rules:
 * - Tennis: swing detection + serve protocols
 * - Padel: swing detection only
 * - Pickleball: swing detection only
 * - Other sports: no protocols (but charts UI still visible)
 */
export function getEnabledProtocolsForSport(sport?: string): ProtocolId[] {
  const normalizedSport = sport?.toLowerCase();
  
  switch (normalizedSport) {
    case "tennis":
      return [
        "swing-detection-v3",
        "loading-position",
        "serve-preparation",
        "tennis-contact-point",
        "serve-follow-through",
        "handedness-detection",
      ];
    
    case "padel":
    case "pickleball":
      return [
        "swing-detection-v3",
        "loading-position",
        "handedness-detection",
      ];
    
    default:
      // Other sports: no protocols
      return [];
  }
}

/**
 * Check if a sport should have pose/protocol analysis enabled
 */
export function shouldEnableProtocolsForSport(sport?: string): boolean {
  const normalizedSport = sport?.toLowerCase();
  return ["tennis", "padel", "pickleball"].includes(normalizedSport ?? "");
}

// ============================================================================
// LLM Response Helpers
// ============================================================================

/**
 * Strips stream metadata suffix from LLM response text.
 * The LLM API appends "__STREAM_META__" followed by metadata that should not be displayed.
 */
export function stripStreamMetadata(text: string): string {
  const metaIndex = text.indexOf("__STREAM_META__");
  if (metaIndex !== -1) {
    return text.slice(0, metaIndex);
  }
  return text;
}

// ============================================================================
// Swing Boundary Helpers
// ============================================================================

export interface SwingBoundaryAdjustment {
  startTime?: number;
  startFrame?: number;
  endTime?: number;
  endFrame?: number;
}

export interface EffectiveSwingBoundaries {
  startTime: number;
  startFrame: number;
  endTime: number;
  endFrame: number;
  isAdjusted: boolean;
}

/**
 * Gets the effective swing boundaries for a protocol event,
 * applying any user adjustments if present.
 */
export function getEffectiveSwingBoundaries(
  event: ProtocolEvent,
  adjustments: Map<string, SwingBoundaryAdjustment>
): EffectiveSwingBoundaries {
  const adjustment = adjustments.get(event.id);
  return {
    startTime: adjustment?.startTime ?? event.startTime,
    startFrame: adjustment?.startFrame ?? event.startFrame,
    endTime: adjustment?.endTime ?? event.endTime,
    endFrame: adjustment?.endFrame ?? event.endFrame,
    isAdjusted: !!adjustment,
  };
}

// ============================================================================
// Protocol Event Helpers
// ============================================================================

export interface ProtocolAdjustment {
  time: number;
  frame: number;
}

/**
 * Gets the effective time for a protocol event,
 * applying any user position adjustment if present.
 */
export function getProtocolEventTime(
  event: ProtocolEvent,
  adjustments: Map<string, ProtocolAdjustment>
): number {
  const adjustment = adjustments.get(event.id);
  return adjustment ? adjustment.time : event.startTime;
}

// ============================================================================
// Timeline Position Helpers
// ============================================================================

/**
 * Calculates the percentage position on the timeline for a given time.
 */
export function getTimelinePosition(time: number, duration: number): number {
  return duration > 0 ? (time / duration) * 100 : 0;
}

/**
 * Calculates time from a timeline click position.
 */
export function getTimeFromPosition(
  clientX: number,
  rect: DOMRect,
  duration: number
): { time: number; percent: number } {
  const x = clientX - rect.left;
  const percent = Math.max(0, Math.min(1, x / rect.width));
  const time = percent * duration;
  return { time, percent };
}

/**
 * Calculates frame number from time and FPS.
 */
export function getFrameFromTime(time: number, fps: number): number {
  return Math.floor(time * fps);
}

// ============================================================================
// Swing Edge Validation
// ============================================================================

/**
 * Validates and clamps a new swing edge position to ensure
 * the swing maintains minimum duration.
 */
export function clampSwingEdge(
  edge: "start" | "end",
  newTime: number,
  otherEdgeTime: number
): number {
  if (edge === "start") {
    // Start can't go past end minus minimum duration
    return Math.min(newTime, otherEdgeTime - MIN_SWING_DURATION);
  } else {
    // End can't go before start plus minimum duration
    return Math.max(newTime, otherEdgeTime + MIN_SWING_DURATION);
  }
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generates a unique ID with a given prefix.
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
