import type { PlayerProfileAttributes } from "@/types/player-profile";

/**
 * Calculate SportAI Rating from player attributes
 * Uses balanced scoring: 70% average + 30% minimum (rewards well-rounded players)
 * Returns a value in the 40-99 range (FIFA-style)
 */
export function calculateSportAIRating(attributes: PlayerProfileAttributes): number {
  const values = Object.values(attributes);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  
  // 70% average, 30% minimum (rewards balance, penalizes weaknesses)
  const balanced = (average * 0.7) + (min * 0.3);
  
  // Scale to 40-99 range
  return Math.round(40 + (balanced * 0.59));
}

/**
 * Get tier info based on rating
 */
export function getRatingTier(rating: number): {
  label: string;
  gradient: [string, string];
  glow: string;
} {
  if (rating >= 90) return {
    label: "Elite",
    gradient: ["#FFD700", "#FFA500"],
    glow: "rgba(255, 215, 0, 0.4)",
  };
  if (rating >= 80) return {
    label: "Pro",
    gradient: ["#C0C0C0", "#E8E8E8"],
    glow: "rgba(192, 192, 192, 0.4)",
  };
  if (rating >= 70) return {
    label: "Advanced",
    gradient: ["#CD7F32", "#B8860B"],
    glow: "rgba(205, 127, 50, 0.4)",
  };
  if (rating >= 60) return {
    label: "Intermediate",
    gradient: ["#4A90A4", "#2E5A6B"],
    glow: "rgba(74, 144, 164, 0.4)",
  };
  return {
    label: "Developing",
    gradient: ["#6B7280", "#4B5563"],
    glow: "rgba(107, 114, 128, 0.4)",
  };
}

