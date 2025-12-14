import type { PlayerPosition } from "../../../types";
import type { ZoneDefinition, ZoneStat } from "../types";
import { HALF_COURT } from "../constants/grid";

/**
 * Calculate zone dominance statistics from player position data.
 * Only counts time during active rallies.
 */
export function calculateZoneDominance(
  playerPositions: PlayerPosition[],
  zones: ZoneDefinition[],
  rallies: [number, number][]
): ZoneStat[] {
  // Only count time during rallies (active play)
  const rallyPositions = playerPositions.filter((pos) =>
    rallies.some(([start, end]) => pos.timestamp >= start && pos.timestamp <= end)
  );

  if (rallyPositions.length === 0) {
    return zones.map((z) => ({
      zoneId: z.id,
      zoneName: z.name,
      timeSpent: 0,
      percentage: 0,
      entryCount: 0,
    }));
  }

  const zoneTimes: Record<string, { time: number; entries: number }> = {};
  zones.forEach((z) => (zoneTimes[z.id] = { time: 0, entries: 0 }));

  let totalTime = 0;
  let lastTimestamp = rallyPositions[0]?.timestamp || 0;
  let lastZone: string | null = null;

  // Sort positions by timestamp
  const sortedPositions = [...rallyPositions].sort((a, b) => a.timestamp - b.timestamp);

  sortedPositions.forEach((pos) => {
    // Use court_X and court_Y (actual court coordinates in meters)
    // court_X: 0-10m (width), court_Y: 0-20m (length, but half court is 0-10m)
    // Skip if court coordinates not available
    if (pos.court_X === undefined || pos.court_Y === undefined) return;

    // For half court analysis, we use positions on one side (0-10m depth)
    // court_Y 0-10 = near side, 10-20 = far side
    const courtX = pos.court_X;
    const courtY = pos.court_Y <= 10 ? pos.court_Y : pos.court_Y - 10; // Map to 0-10 range

    // Find which zone this position is in
    const zone = zones.find(
      (z) =>
        courtX >= z.xMin && courtX <= z.xMax && courtY >= z.yMin && courtY <= z.yMax
    );

    if (zone) {
      const dt = pos.timestamp - lastTimestamp;
      // Only count if delta is reasonable (not a gap between rallies)
      if (dt > 0 && dt < 2) {
        zoneTimes[zone.id].time += dt;
        totalTime += dt;
      }

      // Track zone entries (when player moves to a new zone)
      if (lastZone !== zone.id) {
        zoneTimes[zone.id].entries++;
        lastZone = zone.id;
      }
    }

    lastTimestamp = pos.timestamp;
  });

  return zones.map((z) => ({
    zoneId: z.id,
    zoneName: z.name,
    timeSpent: zoneTimes[z.id].time,
    percentage: totalTime > 0 ? (zoneTimes[z.id].time / totalTime) * 100 : 0,
    entryCount: zoneTimes[z.id].entries,
  }));
}





