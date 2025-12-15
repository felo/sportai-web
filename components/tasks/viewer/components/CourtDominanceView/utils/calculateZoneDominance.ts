import type { PlayerPosition } from "../../../types";
import type { ZoneDefinition, ZoneStat } from "../types";
import { getCourtConfig, type Sport } from "../constants/grid";

/**
 * Calculate zone dominance statistics from player position data.
 * Only counts time during active rallies.
 * 
 * IMPORTANT: Zone definitions use Y=0 at baseline, increasing toward net.
 * But court_Y from video tracking has Y=0 at net (top of frame), increasing toward baseline.
 * We flip the Y coordinate here to match zone definitions.
 */
export function calculateZoneDominance(
  playerPositions: PlayerPosition[],
  zones: ZoneDefinition[],
  rallies: [number, number][],
  sport: Sport = "padel"
): ZoneStat[] {
  const courtConfig = getCourtConfig(sport);
  
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
    // Skip if court coordinates not available
    if (pos.court_X === undefined || pos.court_Y === undefined) return;

    const courtX = pos.court_X;
    let courtY: number;
    
    // ACTUAL DATA FORMAT (from debug logs):
    // - Tennis tracking uses REAL METERS for the FULL COURT
    // - Y=0 at one baseline, Y=11.885 at net, Y=23.77 at other baseline
    // - Range can extend beyond (negative = behind baseline, >23.77 = beyond other baseline)
    //
    // Zone definitions use Y=0 at baseline, Y=11.885 at net (matching tracking orientation!)
    // NO FLIP NEEDED - orientations already match!
    //
    // For half-court view, we map both sides to the 0-11.885 range:
    // - Your side (Y = 0 to 11.885): Use directly
    // - Opponent's side (Y > 11.885): Mirror to equivalent position on your side
    
    let rawCourtY = pos.court_Y;
    
    if (sport === "tennis") {
      const NET_POSITION = 11.885; // Net is at center of full court
      const FULL_COURT = 23.77;
      
      // Handle positions behind baseline (negative Y)
      if (rawCourtY < 0) {
        courtY = 0; // Clamp to baseline (Deep Defense)
      }
      // Your side of the court (baseline to net)
      else if (rawCourtY <= NET_POSITION) {
        courtY = rawCourtY; // Use directly - already in correct range
      }
      // Opponent's side of the court (past the net)
      else {
        // Mirror to equivalent position on your side
        // Y=12 (just past net) → ~11.885 (at net) → Net Zone
        // Y=20 (near opponent's baseline) → ~3.77 (mid-court on your side)
        courtY = FULL_COURT - rawCourtY;
        // Clamp to valid range (in case of tracking beyond court)
        if (courtY < 0) courtY = 0;
      }
    } else {
      // Padel: uses 0-20 range for full court, 0-10 per half
      let rawY = rawCourtY;
      if (rawY > 10) {
        rawY = 20 - rawY; // Mirror opponent's side
      }
      if (rawY < 0) rawY = 0;
      courtY = rawY;
    }

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





