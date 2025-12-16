import type { BallSequenceType } from "@/types/tactical-analysis";

export type TacticalSubTab = "all-shots" | "ball-sequence" | "court-dominance";

export interface SubTabConfig {
  id: TacticalSubTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export interface BallTabConfig {
  id: number;
  label: string;
  name: string;
  description: string;
  originLabel: string;
  countLabel: string;
  ballType: BallSequenceType;
}

export interface BallSequenceClickData {
  ballType: BallSequenceType;
  ballLabel: string;
  playerContext?: string;
}







