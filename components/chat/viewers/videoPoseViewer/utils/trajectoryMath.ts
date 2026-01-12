/**
 * Trajectory smoothing utilities using Catmull-Rom splines.
 * Creates smooth curves through points, simulating higher FPS for realistic human motion.
 */

export interface TrajectoryPoint {
  x: number;
  y: number;
  frame?: number;
}

/**
 * Catmull-Rom spline interpolation.
 * Creates smooth curves through points.
 */
export function catmullRomSpline(
  p0: TrajectoryPoint,
  p1: TrajectoryPoint,
  p2: TrajectoryPoint,
  p3: TrajectoryPoint,
  t: number
): TrajectoryPoint {
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

/**
 * Calculate velocity between two points (pixels per frame).
 */
export function calculatePointVelocity(
  p1: TrajectoryPoint,
  p2: TrajectoryPoint
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dt = (p2.frame ?? 1) - (p1.frame ?? 0) || 1;
  return Math.sqrt(dx * dx + dy * dy) / dt;
}

/**
 * Generate smoothed trajectory points using adaptive Catmull-Rom splines.
 * Adapts smoothing based on movement velocity for more realistic human motion.
 */
export function smoothTrajectory(
  points: TrajectoryPoint[]
): TrajectoryPoint[] {
  if (points.length < 2) return points.map((p) => ({ x: p.x, y: p.y }));

  if (points.length === 2) {
    // Use cubic Bezier for 2 points with estimated control points
    const segments = 10;
    const smoothed: TrajectoryPoint[] = [];
    const p0 = points[0];
    const p1 = points[1];

    // Estimate control points based on direction
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const cp1x = p0.x + dx * 0.3;
    const cp1y = p0.y + dy * 0.3;
    const cp2x = p1.x - dx * 0.3;
    const cp2y = p1.y - dy * 0.3;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = t * t;
      const t3 = t2 * t;

      smoothed.push({
        x: mt3 * p0.x + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * p1.x,
        y: mt3 * p0.y + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * p1.y,
      });
    }
    return smoothed;
  }

  const smoothed: TrajectoryPoint[] = [];

  // Add first point
  smoothed.push({ x: points[0].x, y: points[0].y });

  // Calculate velocities for adaptive smoothing
  const velocities: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    velocities.push(calculatePointVelocity(points[i], points[i + 1]));
  }
  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;

  // Interpolate between each pair of points with adaptive segment count
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];

    // Adaptive segment count based on velocity
    // Faster movements get more segments for smoother curves
    // Slower movements get fewer segments to maintain natural feel
    const velocity = velocities[i] || avgVelocity;
    const velocityRatio = Math.min(velocity / (avgVelocity || 1), 3); // Cap at 3x
    const baseSegments = 8;
    const segments = Math.max(
      5,
      Math.round(baseSegments * (1 + velocityRatio * 0.5))
    );

    // Generate interpolated points between p1 and p2
    for (let j = 1; j <= segments; j++) {
      const t = j / segments;
      const interpolated = catmullRomSpline(p0, p1, p2, p3, t);
      smoothed.push(interpolated);
    }
  }

  return smoothed;
}
