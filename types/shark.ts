/**
 * Shark Technique Analysis API Types
 *
 * Types for the SportAI Shark technique analysis API.
 * Used for analyzing swing technique in pickleball, tennis, and padel.
 */

/**
 * Metadata required for Shark API requests
 * Note: player_level is NOT supported by the Shark API - do not include it
 */
export interface SharkMetadata {
  uid: string;
  sport: "pickleball" | "tennis" | "padel";
  swing_type: string;
  dominant_hand: "left" | "right";
  player_height_mm: number;
  store_data?: boolean;
  ball_timestamp?: number;
  request_id?: string;
  timestamp?: string;
  form_session_id?: string;
}

/**
 * Individual technique feature from Shark analysis
 */
export interface SharkFeature {
  feature_name: string;
  feature_human_readable_name?: string;
  human_name?: string;
  level: "beginner" | "intermediate" | "advanced" | "professional";
  score: number;
  value: number;
  observation: string;
  suggestion: string;
  feature_categories?: string[];
  unit?: string;
  event?: {
    name: string;
    timestamp: number;
    frame_nr: number;
  };
  highlight_joints?: number[];
  highlight_limbs?: Record<string, [number, number]>;
}

/**
 * Feature category summary from Shark analysis
 */
export interface SharkFeatureCategory {
  average_score: number;
  feature_count: number;
  features: string[];
}

/**
 * Complete Shark analysis result
 */
export interface SharkAnalysisResult {
  status: "processing" | "done" | "error" | "failed";
  uid: string;
  warnings?: string[];
  errors?: string[];
  result?: {
    features: SharkFeature[];
    feature_categories: Record<string, SharkFeatureCategory>;
    kinetic_chain?: {
      speed_dict?: Record<string, {
        plot_values: number[];
        peak_index: number;
        peak_speed: number;
      }>;
    };
    wrist_speed?: {
      peak_speed?: number;
      unit?: string;
    };
  };
  video_entry_2D_json?: unknown;
  video_entry_3D_json?: unknown;
}

/**
 * Calculate the average score across all categories (ignoring 0 scores)
 */
export function calculateAverageScore(categories: Record<string, SharkFeatureCategory>): number {
  const scores = Object.values(categories)
    .map(c => c.average_score)
    .filter(score => score > 0);

  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Get total feature count across all categories
 */
export function getTotalFeatureCount(categories: Record<string, SharkFeatureCategory>): number {
  return Object.values(categories).reduce((sum, c) => sum + c.feature_count, 0);
}

/**
 * Get category count (excluding empty categories)
 */
export function getCategoryCount(categories: Record<string, SharkFeatureCategory>): number {
  return Object.values(categories).filter(c => c.feature_count > 0).length;
}
