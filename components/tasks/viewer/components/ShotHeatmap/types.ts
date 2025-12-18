import type { BallSequenceType } from "@/types/tactical-analysis";
import type { DomainExpertise } from "@/utils/storage";

// Cell info for tooltips
export interface CellShotInfo {
  swingType: string;
  speed: number;
  isOrigin: boolean; // true = shot taken here, false = ball landed here
}

// Shot pair data
export interface ShotPair {
  originCol: number;
  originRow: number;
  landingCol: number;
  landingRow: number;
  swingType: string;
  speed: number;
}

// Player shot data
export interface PlayerShotData {
  playerId: number;
  playerIndex: number;
  displayName: string;
  origins: number[][];
  landings: number[][];
  pairs: ShotPair[];
  // Cell details: [row][col] -> array of shots in that cell
  originDetails: CellShotInfo[][][];
  landingDetails: CellShotInfo[][][];
  avgSpeed: number;
  topSpeed: number;
  totalShots: number;
}

// PlayerShotCard props
export interface PlayerShotCardProps {
  data: PlayerShotData;
  shotLabel: string; // "Serve", "Return", "Third ball"
  originLabel: string; // "Serve position", "Return position", etc.
  countLabel: string; // "serve", "return", "shot"
  ballType?: BallSequenceType; // For tactical analysis
  sport?: DomainExpertise; // For domain-specific analysis
  portrait?: string; // Player portrait image URL
  nickname?: string; // AI-generated player nickname
  nicknameLoading?: boolean; // Whether nickname is being generated
}

// ShotHeatmap props
export interface ShotHeatmapProps {
  data: PlayerShotData[];
  shotLabel: string;
  originLabel: string;
  countLabel: string;
  emptyMessage: string;
  ballType?: BallSequenceType;
  sport?: DomainExpertise;
  portraits?: Record<number, string>;
  nicknames?: Record<number, string>;
  nicknamesLoading?: boolean;
}

// CellTooltip props
export interface CellTooltipProps {
  originDetails: CellShotInfo[];
  landingDetails: CellShotInfo[];
  col: number;
  row: number;
  visible: boolean;
  originLabel: string;
}








