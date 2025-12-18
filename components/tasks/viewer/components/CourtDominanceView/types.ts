export type ZoneSystemId = "traffic-light" | "6-zone" | "9-zone" | "functional";

export interface ZoneDefinition {
  id: string;
  name: string;
  emoji: string;
  color: string;
  // Boundaries in meters (from back wall, on half court 0-10m)
  yMin: number; // Distance from back wall (0 = back wall, 10 = net)
  yMax: number;
  xMin: number; // 0 = left side
  xMax: number; // 10 = right side
  // Grid cell boundaries (for rendering)
  colMin: number;
  colMax: number;
  rowMin: number;
  rowMax: number;
  // Tactical description
  description: string;
  tacticalAdvice: string;
  // Is this a "pressure" zone (defensive/transition)?
  isPressureZone?: boolean;
}

export interface ZoneSystem {
  id: ZoneSystemId;
  name: string;
  description: string;
  zones: ZoneDefinition[];
  coachingTips: string;
}

export interface ZoneStat {
  zoneId: string;
  zoneName: string;
  timeSpent: number; // seconds
  percentage: number; // % of total time
  entryCount: number; // how many times entered
}

export interface PlayerDominance {
  playerId: number;
  playerName: string;
  totalTime: number;
  zones: ZoneStat[];
  dominantZone: string; // zone where they spent most time
  dominantZonePercentage: number;
  pressureZoneTime: number; // time spent in "bad" zones
  pressurePercentage: number;
}








