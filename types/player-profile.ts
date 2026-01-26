/**
 * Player Profile Types for Spider Graph visualization
 *
 * Used for AI-powered player profile generation with radar chart attributes.
 */

/**
 * Player profile attributes scored 0-100
 */
export interface PlayerProfileAttributes {
  power: number;      // Ball speed and hard-hitting ability
  agility: number;    // Movement speed and court coverage efficiency
  consistency: number; // Shot reliability and accuracy
  attack: number;     // Aggressive shot selection and net play
  defense: number;    // Defensive positioning and recovery shots
  coverage: number;   // Court coverage and endurance
  variety: number;    // Range of shot types used
}

/**
 * Full player profile with AI-generated insights
 */
export interface PlayerProfile {
  playerId: number;
  playerName: string;
  attributes: PlayerProfileAttributes;
  summary: string;           // AI-generated 1-2 sentence summary
  playstyle: string;         // e.g., "The Wall", "Net Ninja"
  strengths: string[];       // Top 2-3 strengths
  areasToImprove: string[];  // Top 1-2 areas
}

/**
 * Player data sent to LLM for profile generation
 */
export interface PlayerProfileData {
  playerId: number;
  playerName: string;
  stats: {
    totalSwings: number;
    avgBallSpeed: number;
    maxBallSpeed: number;
    distanceCovered: number;
    fastestSprint: number;
    activityScore: number;
  };
  shotBreakdown: Record<string, {
    count: number;
    percentage: number;
    avgSpeed: number;
  }>;
  rankings: {
    powerRank: number | null;
    sprintRank: number | null;
    distanceRank: number | null;
    swingsRank: number | null;
  };
  totalPlayers: number;
}

/**
 * Request payload for player profile generation API
 */
export interface PlayerProfileRequest {
  players: PlayerProfileData[];
  sport: string;
}

/**
 * Response from player profile generation API
 */
export interface PlayerProfileResponse {
  profiles: PlayerProfile[];
  modelUsed: string;
}

/**
 * State for player profiles hook
 */
export interface PlayerProfileState {
  profiles: PlayerProfile[];
  isGenerating: boolean;
  error: string | null;
}
