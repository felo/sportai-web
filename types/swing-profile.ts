/**
 * Swing Profile Types for Technique Analysis
 *
 * Used for AI-powered swing/technique profile generation with radar chart attributes.
 * Similar to player-profile but focused on individual swing biomechanics.
 */

/**
 * Swing technique attributes scored 0-100
 */
export interface SwingProfileAttributes {
  power: number; // Peak wrist velocity and force generation
  agility: number; // Acceleration and explosive movement
  footwork: number; // Knee bend and lower body positioning
  hip: number; // Hip rotation velocity and kinetic chain
  rotation: number; // Shoulder rotation and upper body mechanics
}

/**
 * Full swing profile with AI-generated insights
 */
export interface SwingProfile {
  swingId: string;
  swingIndex: number;
  swingType: string;
  attributes: SwingProfileAttributes;
  summary: string; // AI-generated 1-2 sentence technique summary
  techniqueName: string; // e.g., "Power Drive", "Controlled Finish"
  strengths: string[]; // Top 2-3 technique strengths
  focusAreas: string[]; // Top 1-2 areas to improve
}

/**
 * Swing data sent to LLM for profile generation
 */
export interface SwingProfileData {
  swingId: string;
  swingIndex: number;
  swingType: string;
  metrics: {
    power: number;
    agility: number;
    footwork: number;
    hip: number;
    rotation: number;
  };
  rawMetrics: {
    peakWristVelocityKmh: number;
    peakShoulderVelocityKmh: number;
    peakHipVelocityKmh: number;
    peakXFactor: number;
    peakAcceleration: number;
    kneeBend: number | null;
  };
  saiScore: number;
  contactTime: number;
}

/**
 * Request payload for swing profile generation API
 */
export interface SwingProfileRequest {
  swings: SwingProfileData[];
  sport: string;
}

/**
 * Response from swing profile generation API
 */
export interface SwingProfileResponse {
  profiles: SwingProfile[];
  modelUsed: string;
}

/**
 * State for swing profiles hook
 */
export interface SwingProfileState {
  profiles: SwingProfile[];
  isGenerating: boolean;
  error: string | null;
}





