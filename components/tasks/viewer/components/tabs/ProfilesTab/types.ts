import type { StatisticsResult } from "../../../types";
import type { PlayerRankings } from "../../../hooks/usePlayerRankings";

export interface ProfilesTabProps {
  result: StatisticsResult | null;
  rankings: PlayerRankings;
  portraits?: Record<number, string>;
  playerDisplayNames?: Record<number, string>;
  sport?: "tennis" | "padel" | "pickleball";
}

export interface ProfileColor {
  primary: string;
  gradient: [string, string];
  fill: string;
  glow: string;
  name: string;
}

export interface AttributeConfig {
  icon: React.ComponentType<{ width?: number; height?: number; style?: React.CSSProperties }>;
  label: string;
  description: string;
}


