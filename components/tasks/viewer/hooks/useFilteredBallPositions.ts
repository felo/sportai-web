import { useMemo } from "react";

// ============================================================================
// TYPES
// ============================================================================

interface BallPosition {
  timestamp: number;
  X: number; // Normalized 0-1
  Y: number; // Normalized 0-1
}

interface FilteredBallPosition extends BallPosition {
  interpolated?: boolean; // True if this position was synthesized
  originalIndex?: number; // Index in original array (if not interpolated)
}

interface FilterOptions {
  /** Enable outlier removal (teleportation detection) */
  removeOutliers?: boolean;
  /** Maximum velocity threshold (normalized units per second). Default: 2.0 */
  maxVelocity?: number;
  /** Enable gap interpolation */
  interpolateGaps?: boolean;
  /** Maximum gap duration to interpolate (seconds). Default: 0.5 */
  maxGapDuration?: number;
  /** Enable temporal smoothing */
  smoothTrajectory?: boolean;
  /** Smoothing window size (number of frames). Default: 3 */
  smoothingWindow?: number;
  /** Video FPS for velocity calculations. Default: 30 */
  fps?: number;
}

interface FilterStats {
  originalCount: number;
  removedOutliers: number;
  interpolatedPoints: number;
  finalCount: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate Euclidean distance between two positions (normalized coordinates)
 */
function distance(p1: BallPosition, p2: BallPosition): number {
  const dx = p2.X - p1.X;
  const dy = p2.Y - p1.Y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate velocity between two positions (normalized units per second)
 */
function velocity(p1: BallPosition, p2: BallPosition): number {
  const dt = p2.timestamp - p1.timestamp;
  if (dt <= 0) return 0;
  return distance(p1, p2) / dt;
}

/**
 * Linear interpolation between two positions
 */
function lerp(p1: BallPosition, p2: BallPosition, t: number): BallPosition {
  return {
    timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * t,
    X: p1.X + (p2.X - p1.X) * t,
    Y: p1.Y + (p2.Y - p1.Y) * t,
  };
}

/**
 * Catmull-Rom spline interpolation for smoother curves
 * Uses 4 control points to interpolate between p1 and p2
 */
function catmullRomInterpolate(
  p0: BallPosition,
  p1: BallPosition,
  p2: BallPosition,
  p3: BallPosition,
  t: number,
  tension: number = 0.5
): BallPosition {
  const t2 = t * t;
  const t3 = t2 * t;

  // Catmull-Rom basis functions
  const h1 = -tension * t3 + 2 * tension * t2 - tension * t;
  const h2 = (2 - tension) * t3 + (tension - 3) * t2 + 1;
  const h3 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * t;
  const h4 = tension * t3 - tension * t2;

  return {
    timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * t,
    X: h1 * p0.X + h2 * p1.X + h3 * p2.X + h4 * p3.X,
    Y: h1 * p0.Y + h2 * p1.Y + h3 * p2.Y + h4 * p3.Y,
  };
}

// ============================================================================
// STAGE 1: OUTLIER REMOVAL (Teleportation Detection)
// ============================================================================

/**
 * Calculate angle between two vectors (in degrees)
 */
function angleBetweenVectors(v1x: number, v1y: number, v2x: number, v2y: number): number {
  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * Remove positions that represent impossible jumps (teleportation).
 * Uses multiple detection methods:
 * 1. Velocity-based: if ball moves faster than maxVelocity
 * 2. Angle-based: if trajectory suddenly changes direction sharply
 * 3. Multi-frame velocity: checks velocity over 3-frame windows
 * 4. Ping-pong patterns: ball alternating between distant locations
 */
function removeOutliers(
  positions: BallPosition[],
  maxVelocity: number
): { filtered: BallPosition[]; removedCount: number } {
  if (positions.length < 3) {
    return { filtered: [...positions], removedCount: 0 };
  }

  const filtered: BallPosition[] = [];
  let removedCount = 0;

  // First pass: mark positions with suspicious characteristics
  const suspicious = new Set<number>();

  // 1. Frame-to-frame velocity check
  for (let i = 1; i < positions.length; i++) {
    const vel = velocity(positions[i - 1], positions[i]);
    if (vel > maxVelocity) {
      suspicious.add(i - 1);
      suspicious.add(i);
    }
  }

  // 2. Multi-frame velocity check (over 3-frame window)
  // Catches cases where tracker smoothly transitions to false positive
  for (let i = 2; i < positions.length; i++) {
    const p0 = positions[i - 2];
    const p2 = positions[i];
    const dt = p2.timestamp - p0.timestamp;
    if (dt > 0) {
      const dist = distance(p0, p2);
      const avgVel = dist / dt;
      // Strict threshold for 3-frame window
      if (avgVel > maxVelocity * 1.2) {
        suspicious.add(i - 1);
        suspicious.add(i);
      }
    }
  }

  // 2b. Even longer window check (5 frames) for gradual drifts
  for (let i = 4; i < positions.length; i++) {
    const p0 = positions[i - 4];
    const p4 = positions[i];
    const dt = p4.timestamp - p0.timestamp;
    if (dt > 0) {
      const dist = distance(p0, p4);
      const avgVel = dist / dt;
      if (avgVel > maxVelocity * 1.5) {
        // Mark all intermediate frames
        for (let j = i - 3; j <= i; j++) {
          suspicious.add(j);
        }
      }
    }
  }

  // 3. Sharp angle detection - trajectory shouldn't change direction abruptly
  const SHARP_ANGLE_THRESHOLD = 90; // degrees - more sensitive
  for (let i = 1; i < positions.length - 1; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    const next = positions[i + 1];

    const incomingX = curr.X - prev.X;
    const incomingY = curr.Y - prev.Y;
    const outgoingX = next.X - curr.X;
    const outgoingY = next.Y - curr.Y;

    const angle = angleBetweenVectors(incomingX, incomingY, outgoingX, outgoingY);
    
    // If trajectory changes direction sharply AND moves a significant distance
    const incomingDist = Math.sqrt(incomingX * incomingX + incomingY * incomingY);
    const outgoingDist = Math.sqrt(outgoingX * outgoingX + outgoingY * outgoingY);
    
    if (angle > SHARP_ANGLE_THRESHOLD && incomingDist > 0.02 && outgoingDist > 0.02) {
      suspicious.add(i);
    }
  }

  // 4. Detect ping-pong patterns (alternating false positives)
  for (let i = 2; i < positions.length - 1; i++) {
    const prev2 = positions[i - 2];
    const prev1 = positions[i - 1];
    const curr = positions[i];

    const distToPrev2 = distance(curr, prev2);
    const distToPrev1 = distance(curr, prev1);

    // If current is closer to 2-frames-ago than 1-frame-ago, it's ping-pong
    if (distToPrev2 < distToPrev1 * 0.3 && distToPrev1 > 0.05) {
      suspicious.add(i - 1);
    }
  }

  // 5. Detect sustained deviation from initial trajectory
  // If the ball suddenly stays in a different region for multiple frames
  if (positions.length >= 6) {
    for (let windowStart = 0; windowStart < positions.length - 4; windowStart++) {
      // Calculate center of first 2 positions in window
      const startCenterX = (positions[windowStart].X + positions[windowStart + 1].X) / 2;
      const startCenterY = (positions[windowStart].Y + positions[windowStart + 1].Y) / 2;
      
      // Check if positions 2-4 frames later are far from this center
      for (let j = windowStart + 2; j < Math.min(windowStart + 5, positions.length); j++) {
        const dist = Math.sqrt(
          Math.pow(positions[j].X - startCenterX, 2) + 
          Math.pow(positions[j].Y - startCenterY, 2)
        );
        const dt = positions[j].timestamp - positions[windowStart].timestamp;
        
        // If position jumped far away quickly, mark intermediate frames
        // More aggressive: 15% of frame in under 0.15 seconds
        if (dist > 0.15 && dt < 0.15) {
          for (let k = windowStart + 1; k <= j; k++) {
            suspicious.add(k);
          }
        }
      }
    }
  }

  // 6. Velocity-adaptive distance check
  // Ball shouldn't teleport more than a velocity-based threshold per frame
  // Slower ball = tighter threshold, faster ball = more lenient
  const MIN_ALLOWED_DISTANCE = 0.03; // 3% minimum (for stationary/slow ball)
  const MAX_ALLOWED_DISTANCE = 0.12; // 12% maximum (for fast shots)
  const VELOCITY_DISTANCE_SCALE = 0.08; // How much velocity affects allowed distance
  
  for (let i = 1; i < positions.length; i++) {
    // Calculate local velocity from previous frames to set adaptive threshold
    let localVelocity = 0;
    if (i >= 2) {
      // Use velocity from 2 frames ago to current frame for context
      const lookback = Math.min(3, i);
      let totalVel = 0;
      for (let j = i - lookback; j < i; j++) {
        const d = distance(positions[j], positions[j + 1]);
        const dt = positions[j + 1].timestamp - positions[j].timestamp;
        if (dt > 0) {
          totalVel += d / dt;
        }
      }
      localVelocity = totalVel / lookback;
    }
    
    // Calculate adaptive threshold based on local velocity
    const adaptiveThreshold = Math.min(
      MAX_ALLOWED_DISTANCE,
      MIN_ALLOWED_DISTANCE + localVelocity * VELOCITY_DISTANCE_SCALE
    );
    
    const dist = distance(positions[i - 1], positions[i]);
    if (dist > adaptiveThreshold) {
      suspicious.add(i - 1);
      suspicious.add(i);
    }
  }

  // Final pass: build filtered list, removing suspicious positions
  // that don't fit the overall trajectory
  for (let i = 0; i < positions.length; i++) {
    if (!suspicious.has(i)) {
      filtered.push(positions[i]);
      continue;
    }

    // For suspicious positions, try to determine if they're valid
    const prev = i > 0 ? positions[i - 1] : null;
    const next = i < positions.length - 1 ? positions[i + 1] : null;

    let isConsistent = false;

    if (prev && next && !suspicious.has(i - 1) && !suspicious.has(i + 1)) {
      // Both neighbors are good - check if current fits the trajectory
      const expectedPos = lerp(prev, next, 0.5);
      const deviation = distance(positions[i], expectedPos);
      const neighborDist = distance(prev, next);

      // If deviation is small relative to neighbor distance, keep it
      isConsistent = deviation < neighborDist * 0.4;
    } else if (prev && !suspicious.has(i - 1)) {
      const vel = velocity(prev, positions[i]);
      isConsistent = vel < maxVelocity * 0.5;
    } else if (next && !suspicious.has(i + 1)) {
      const vel = velocity(positions[i], next);
      isConsistent = vel < maxVelocity * 0.5;
    }

    if (isConsistent) {
      filtered.push(positions[i]);
    } else {
      removedCount++;
    }
  }

  return { filtered, removedCount };
}

// ============================================================================
// STAGE 2: GAP INTERPOLATION
// ============================================================================

/**
 * Find gaps in the trajectory and interpolate missing positions.
 * A gap is defined as a time interval longer than expected frame interval.
 */
function interpolateGaps(
  positions: BallPosition[],
  maxGapDuration: number,
  fps: number
): { interpolated: FilteredBallPosition[]; addedCount: number } {
  if (positions.length < 2) {
    return {
      interpolated: positions.map((p, i) => ({ ...p, originalIndex: i })),
      addedCount: 0,
    };
  }

  const result: FilteredBallPosition[] = [];
  let addedCount = 0;
  const frameInterval = 1 / fps;
  const gapThreshold = frameInterval * 2.5; // Gap if more than 2.5 frame intervals

  for (let i = 0; i < positions.length; i++) {
    result.push({ ...positions[i], originalIndex: i });

    if (i < positions.length - 1) {
      const curr = positions[i];
      const next = positions[i + 1];
      const dt = next.timestamp - curr.timestamp;

      // Check if there's a gap that needs interpolation
      if (dt > gapThreshold && dt <= maxGapDuration) {
        // Calculate how many points to interpolate
        const numPoints = Math.round(dt / frameInterval) - 1;

        // Use Catmull-Rom spline if we have enough context
        const p0 = i > 0 ? positions[i - 1] : curr;
        const p1 = curr;
        const p2 = next;
        const p3 = i < positions.length - 2 ? positions[i + 2] : next;

        for (let j = 1; j <= numPoints; j++) {
          const t = j / (numPoints + 1);
          const interpolated = catmullRomInterpolate(p0, p1, p2, p3, t);
          result.push({ ...interpolated, interpolated: true });
          addedCount++;
        }
      }
    }
  }

  return { interpolated: result, addedCount };
}

// ============================================================================
// STAGE 3: TEMPORAL SMOOTHING
// ============================================================================

/**
 * Apply moving average smoothing to reduce high-frequency noise.
 * Preserves timestamp but smooths X and Y coordinates.
 */
function smoothTrajectory(
  positions: FilteredBallPosition[],
  windowSize: number
): FilteredBallPosition[] {
  if (positions.length < windowSize) {
    return positions;
  }

  const halfWindow = Math.floor(windowSize / 2);
  const smoothed: FilteredBallPosition[] = [];

  for (let i = 0; i < positions.length; i++) {
    // Determine the actual window bounds
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(positions.length - 1, i + halfWindow);

    // Calculate weighted average (center has more weight)
    let sumX = 0;
    let sumY = 0;
    let sumWeight = 0;

    for (let j = start; j <= end; j++) {
      // Gaussian-like weighting: center points have more influence
      const distFromCenter = Math.abs(j - i);
      const weight = 1 / (1 + distFromCenter * 0.5);

      sumX += positions[j].X * weight;
      sumY += positions[j].Y * weight;
      sumWeight += weight;
    }

    smoothed.push({
      ...positions[i],
      X: sumX / sumWeight,
      Y: sumY / sumWeight,
    });
  }

  return smoothed;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

const DEFAULT_OPTIONS: Required<FilterOptions> = {
  removeOutliers: true,
  maxVelocity: 0.6, // Normalized units per second - very aggressive filtering
  interpolateGaps: true,
  maxGapDuration: 0.5, // Max 0.5 seconds gap to interpolate
  smoothTrajectory: true,
  smoothingWindow: 3,
  fps: 30,
};

export function useFilteredBallPositions(
  positions: BallPosition[] | undefined,
  options: FilterOptions = {}
): {
  filteredPositions: FilteredBallPosition[];
  stats: FilterStats;
} {
  return useMemo(() => {
    if (!positions || positions.length === 0) {
      return {
        filteredPositions: [],
        stats: {
          originalCount: 0,
          removedOutliers: 0,
          interpolatedPoints: 0,
          finalCount: 0,
        },
      };
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Ensure positions are sorted by timestamp
    const sorted = [...positions].sort((a, b) => a.timestamp - b.timestamp);

    let current: BallPosition[] = sorted;
    let removedOutliers = 0;
    let interpolatedPoints = 0;

    // Stage 1: Remove outliers (teleportation)
    if (opts.removeOutliers) {
      const result = removeOutliers(current, opts.maxVelocity);
      current = result.filtered;
      removedOutliers = result.removedCount;
    }

    // Stage 2: Interpolate gaps
    let withMetadata: FilteredBallPosition[];
    if (opts.interpolateGaps) {
      const result = interpolateGaps(current, opts.maxGapDuration, opts.fps);
      withMetadata = result.interpolated;
      interpolatedPoints = result.addedCount;
    } else {
      withMetadata = current.map((p, i) => ({ ...p, originalIndex: i }));
    }

    // Stage 3: Temporal smoothing
    let final: FilteredBallPosition[];
    if (opts.smoothTrajectory) {
      final = smoothTrajectory(withMetadata, opts.smoothingWindow);
    } else {
      final = withMetadata;
    }

    return {
      filteredPositions: final,
      stats: {
        originalCount: positions.length,
        removedOutliers,
        interpolatedPoints,
        finalCount: final.length,
      },
    };
  }, [positions, options]);
}

// Export types for external use
export type { BallPosition, FilteredBallPosition, FilterOptions, FilterStats };

