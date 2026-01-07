import { OVERLAY_COLORS } from "../../../constants";

// Trail colors (same as PadelCourt2D)
export const TRAIL_COLORS = {
  current: OVERLAY_COLORS.trail.current,
  old: OVERLAY_COLORS.trail.old,
};

/**
 * Get interpolated trail color based on progress (0 = current, 1 = old)
 */
export function getTrailColor(progress: number): string {
  const r = Math.round(
    TRAIL_COLORS.current.r + (TRAIL_COLORS.old.r - TRAIL_COLORS.current.r) * progress
  );
  const g = Math.round(
    TRAIL_COLORS.current.g + (TRAIL_COLORS.old.g - TRAIL_COLORS.current.g) * progress
  );
  const b = Math.round(
    TRAIL_COLORS.current.b + (TRAIL_COLORS.old.b - TRAIL_COLORS.current.b) * progress
  );
  return `rgb(${r}, ${g}, ${b})`;
}














