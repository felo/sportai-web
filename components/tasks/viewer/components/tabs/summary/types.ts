// Summary tab shared types

export interface SwingTypeData {
  id: string;
  label: string;
  value: number;
  count: number;
  color: string;
}

export interface BounceCounts {
  floor: number;
  wall: number;
  swing: number;
  other: number;
}

export interface Confidences {
  pose: number;
  swing: number;
  ball: number;
  final: number;
}

export interface SummaryStats {
  teamCount: number;
  ralliesCount: number;
  totalSwings: number;
  totalDistanceCovered: number;
  totalRallyDuration: number;
  avgDistancePerPlayer: number;
  avgRallyDuration: number;
  avgShotsPerRally: number;
  avgRallyIntensity: number;
  maxRallyIntensity: number;
  maxSprintSpeed: number;
  avgSprintSpeed: number;
  maxBallSpeed: number;
  avgBallSpeed: number;
  serveCount: number;
  volleyCount: number;
  groundStrokeCount: number;
  totalSwingCount: number;
  maxServeSpeed: number;
  avgServeSpeed: number;
  maxVolleySpeed: number;
  avgVolleySpeed: number;
  maxGroundStrokeSpeed: number;
  avgGroundStrokeSpeed: number;
  hasSwingData: boolean;
  hasSpeedData: boolean;
  hasSprintData: boolean;
  swingTypeData: SwingTypeData[];
  bounceCounts: BounceCounts;
  bounceCount: number;
}











