/**
 * Shark Racket Catalog
 *
 * Product catalog for racket recommendations in the pickleball technique chat API.
 * Each racket has specific characteristics that match different player profiles.
 */

// ============================================================================
// Types
// ============================================================================

export interface RacketProduct {
  name: string;
  price_usd: number;
  focus: string;
  target_players: string[];
  name_implication: string;
  characteristics: string[];
  strengths: string[];
  limitations: string[];
}

export interface RacketBrand {
  brand: string;
  products: RacketProduct[];
}

// ============================================================================
// Shark Racket Catalog
// ============================================================================

export const SHARK_RACKET_CATALOG: RacketBrand = {
  brand: "Shark",
  products: [
    {
      name: "Shark-Bite",
      price_usd: 89.9,
      focus: "Control & entry-level play",
      target_players: [
        "Beginners",
        "Casual players",
        "Players learning touch shots (dinks, soft resets)",
      ],
      name_implication: "Grip on the ball, spin, forgiveness",
      characteristics: [
        "Softer face",
        "Larger sweet spot",
        "High forgiveness",
        "Lower raw power",
        "High consistency",
      ],
      strengths: ["Good for learning fundamentals"],
      limitations: ["Not suited for aggressive power hitters"],
    },
    {
      name: "Shark-Speedy",
      price_usd: 119.9,
      focus: "Speed & maneuverability",
      target_players: [
        "Intermediate players",
        "Players with fast hands at the net",
        "Players focused on quick volleys",
      ],
      name_implication: "Lightweight, fast swing speed",
      characteristics: [
        "Lightweight or well-balanced",
        "Fast swing speed",
        "Quick reaction capability",
      ],
      strengths: [
        "Excellent for doubles",
        "Strong in quick exchanges",
        "Good defensive and countering play",
      ],
      limitations: ["Slightly less stability than heavier paddles"],
    },
    {
      name: "Shark-Hunter",
      price_usd: 129.9,
      focus: "Balanced control and power (all-court)",
      target_players: ["Competitive intermediate players", "Advanced players"],
      name_implication: "Precision and controlled aggression",
      characteristics: [
        "Stable construction",
        "Controlled power",
        "Likely carbon face",
        "Enhanced spin",
        "Solid feel",
      ],
      strengths: [
        "Strong all-around performance",
        "Effective for target-based, pressure play",
      ],
      limitations: ["Requires better technique than entry-level paddles"],
    },
    {
      name: "Shark-Torpedo",
      price_usd: 149.9,
      focus: "Power & aggression",
      target_players: [
        "Advanced players",
        "Singles players",
        "Aggressive doubles players",
      ],
      name_implication: "Explosive, high-impact shots",
      characteristics: [
        "Power-oriented construction",
        "Thicker core",
        "Designed for drives and put-aways",
      ],
      strengths: [
        "Maximum power",
        "Strong penetration on shots",
        "Excellent for overheads and aggressive play",
      ],
      limitations: ["Less forgiving on soft shots", "Punishes mishits"],
    },
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a racket product by name
 */
export function getRacketByName(name: string): RacketProduct | undefined {
  return SHARK_RACKET_CATALOG.products.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get all racket names for validation
 */
export function getAllRacketNames(): string[] {
  return SHARK_RACKET_CATALOG.products.map((p) => p.name);
}

/**
 * Format the racket catalog for LLM prompt inclusion
 */
export function formatRacketCatalogForLLM(): string {
  const lines: string[] = [];

  lines.push(`## ${SHARK_RACKET_CATALOG.brand} Paddle Catalog\n`);

  for (const product of SHARK_RACKET_CATALOG.products) {
    lines.push(`### ${product.name} ($${product.price_usd.toFixed(2)})`);
    lines.push(`**Focus:** ${product.focus}`);
    lines.push(`**Best for:** ${product.target_players.join(", ")}`);
    lines.push(`**Characteristics:** ${product.characteristics.join(", ")}`);
    lines.push(`**Strengths:** ${product.strengths.join(", ")}`);
    lines.push(`**Limitations:** ${product.limitations.join(", ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Get the JSON schema for racket recommendation output
 * Used with Gemini's structured output mode
 */
export function getRacketRecommendationSchema(): object {
  return {
    type: "object",
    properties: {
      recommended_racket: {
        type: "string",
        enum: getAllRacketNames(),
        description: "The name of the recommended racket",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Confidence level in the recommendation",
      },
      primary_reasons: {
        type: "array",
        items: { type: "string" },
        description: "Top 2-3 reasons for this recommendation",
      },
    },
    required: ["recommended_racket", "confidence", "primary_reasons"],
  };
}
