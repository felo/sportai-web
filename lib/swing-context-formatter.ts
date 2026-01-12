/**
 * Swing Context Formatter
 * 
 * Converts structured swing analysis JSON into a formatted text block
 * that can be included in the LLM system prompt.
 * 
 * Handles missing/null fields gracefully - the LLM can work with partial data.
 */

import type { SwingAnalysisContext, SwingFeature } from "@/types/external-api";

/**
 * Format a swing type string into human-readable form
 * e.g., "pickleball_forehand_drive" → "Pickleball Forehand Drive"
 */
function formatSwingType(swingType: string): string {
  return swingType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Format a single feature into readable text
 */
function formatFeature(feature: SwingFeature, includeDetails = true): string {
  const lines: string[] = [];
  
  const name = feature.human_name || feature.feature_name;
  const scoreText = feature.score !== undefined ? ` (score: ${feature.score.toFixed(1)}/100)` : "";
  
  lines.push(`- **${name}**${scoreText}`);
  
  if (includeDetails) {
    if (feature.observation) {
      lines.push(`  - Observation: ${feature.observation}`);
    }
    if (feature.suggestion) {
      lines.push(`  - Suggestion: ${feature.suggestion}`);
    }
    if (feature.value !== undefined && feature.unit) {
      lines.push(`  - Value: ${feature.value}${feature.unit}`);
    }
  }
  
  return lines.join("\n");
}

/**
 * Convert swing analysis context to LLM-friendly text format
 * 
 * This function is lenient with missing data - it only includes
 * sections that have actual data.
 */
export function formatSwingContextForLLM(context: Partial<SwingAnalysisContext>): string {
  const lines: string[] = [];
  
  // Header - always present if swing_type exists
  if (context.swing_type) {
    lines.push(`**Swing Type:** ${formatSwingType(context.swing_type)}`);
  }
  
  if (context.sport) {
    lines.push(`**Sport:** ${context.sport.charAt(0).toUpperCase() + context.sport.slice(1)}`);
  }
  
  if (context.playerLevel) {
    lines.push(`**Player Level:** ${context.playerLevel}`);
  }
  
  if (context.dominant_hand) {
    lines.push(`**Dominant Hand:** ${context.dominant_hand.charAt(0).toUpperCase() + context.dominant_hand.slice(1)}`);
  }
  
  if (context.player_height_mm) {
    const heightCm = (context.player_height_mm / 10).toFixed(0);
    const heightFtIn = `${Math.floor(context.player_height_mm / 304.8)}'${Math.round((context.player_height_mm % 304.8) / 25.4)}"`;
    lines.push(`**Player Height:** ${heightCm} cm (${heightFtIn})`);
  }
  
  if (context.progress !== undefined) {
    lines.push(`**Overall Progress:** ${context.progress.toFixed(1)}%`);
  }
  
  // Top priorities (areas to improve)
  if (context.summary?.top_priorities?.length) {
    lines.push("");
    lines.push("### Top Priorities for Improvement");
    for (const priority of context.summary.top_priorities) {
      lines.push(formatFeature(priority, true));
    }
  }
  
  // Strengths
  if (context.summary?.strengths?.length) {
    lines.push("");
    lines.push("### Strengths");
    for (const strength of context.summary.strengths) {
      lines.push(formatFeature(strength, false));
      if (strength.observation) {
        lines.push(`  - ${strength.observation}`);
      }
    }
  }
  
  // Category scores
  if (context.categories?.length) {
    lines.push("");
    lines.push("### Category Scores");
    for (const cat of context.categories) {
      lines.push(`- **${cat.name}**: ${cat.average_score.toFixed(1)}%`);
    }
  }
  
  // Wrist speed metrics
  if (context.metrics?.wrist_speed) {
    const ws = context.metrics.wrist_speed;
    lines.push("");
    lines.push("### Wrist Speed");
    if (ws.observation) {
      lines.push(ws.observation);
    }
    if (ws.player_wrist_velocity !== undefined) {
      lines.push(`- Velocity: ${ws.player_wrist_velocity.toFixed(2)} ${ws.unit || "m/s"}`);
    }
  }
  
  // Kinetic chain analysis
  if (context.metrics?.kinetic_chain) {
    const kc = context.metrics.kinetic_chain;
    lines.push("");
    lines.push("### Kinetic Chain Analysis");
    if (kc.description) {
      lines.push(`*${kc.description}*`);
      lines.push("");
    }
    if (kc.observation) {
      lines.push(`**Observation:** ${kc.observation}`);
    }
    if (kc.suggestion) {
      lines.push(`**Suggestion:** ${kc.suggestion}`);
    }
    
    // Peak timing success indicators
    if (kc.peaks) {
      const successItems: string[] = [];
      if (kc.peaks.hip_success) successItems.push(`Hip: ${kc.peaks.hip_success}`);
      if (kc.peaks.shoulder_success) successItems.push(`Shoulder: ${kc.peaks.shoulder_success}`);
      if (kc.peaks.wrist_success) successItems.push(`Wrist: ${kc.peaks.wrist_success}`);
      
      if (successItems.length > 0) {
        lines.push(`**Timing Success:** ${successItems.join(" | ")}`);
      }
    }
  }
  
  // All features (for detailed questions)
  if (context.all_features?.length) {
    lines.push("");
    lines.push("### All Feature Details");
    lines.push("*(Reference these for specific questions about individual techniques)*");
    lines.push("");
    
    for (const feature of context.all_features) {
      const name = feature.human_name || feature.feature_name;
      const scoreText = feature.score !== undefined ? `${feature.score.toFixed(1)}/100` : "N/A";
      const valueText = feature.value !== undefined && feature.unit 
        ? `${feature.value}${feature.unit}` 
        : "";
      
      lines.push(`- **${name}** [${scoreText}]${valueText ? ` = ${valueText}` : ""}`);
      if (feature.observation) {
        lines.push(`  - ${feature.observation}`);
      }
    }
  }
  
  // If we have very little data, add a note
  if (lines.length < 5) {
    lines.push("");
    lines.push("*Note: Limited swing data available. Provide general guidance based on what is known.*");
  }
  
  return lines.join("\n");
}

/**
 * Validate minimum required fields in swing context
 * Returns an error message if validation fails, or null if valid
 */
export function validateSwingContext(context: unknown): string | null {
  if (!context || typeof context !== "object") {
    return "Missing required field: swingContext";
  }
  
  const ctx = context as Record<string, unknown>;
  
  if (!ctx.swing_type || typeof ctx.swing_type !== "string") {
    return "Missing required field: swingContext.swing_type";
  }
  
  return null;
}
