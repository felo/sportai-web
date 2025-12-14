import type { SwingMetrics, AttributeConfig } from "./types";

// ============================================================================
// Attribute Configuration
// ============================================================================

export const ATTRIBUTE_CONFIG: Record<keyof SwingMetrics, AttributeConfig> = {
  footwork: {
    label: "Footwork",
    abbrev: "FTW",
    description: "Knee bend depth during the swing. Good footwork shows proper athletic stance and lower body engagement.",
  },
  hip: {
    label: "Hip",
    abbrev: "HIP",
    description: "Peak hip rotation velocity. Measures how fast the hips rotate through the swing. 100 = 10 km/h.",
  },
  rotation: {
    label: "Rotation",
    abbrev: "ROT",
    description: "Peak shoulder rotation velocity. Measures how fast the shoulders rotate through the swing. 100 = 10 km/h.",
  },
  power: {
    label: "Power",
    abbrev: "PWR",
    description: "Peak wrist velocity at contact. Higher speed indicates more powerful shots. 100 = 50 km/h.",
  },
  agility: {
    label: "Agility",
    abbrev: "AGI",
    description: "Peak acceleration during the swing. Higher acceleration shows explosive movement capability. 100 = 200 km/h/s.",
  },
};

// ============================================================================
// Chart Theme
// ============================================================================

export const CHART_THEME = {
  background: "transparent",
  text: {
    fill: "var(--gray-11)",
    fontSize: 11,
    fontFamily: "inherit",
  },
  grid: {
    line: {
      stroke: "var(--gray-6)",
      strokeWidth: 1,
    },
  },
  tooltip: {
    container: {
      background: "var(--gray-2)",
      color: "var(--gray-12)",
      borderRadius: "8px",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
      padding: "10px 14px",
      border: "1px solid var(--gray-6)",
    },
  },
};

// ============================================================================
// Rating Tiers
// ============================================================================

export const RATING_TIERS = {
  ELITE: { min: 90, label: "Elite", gradient: ["#FFD700", "#FFA500"] as [string, string], glow: "rgba(255, 215, 0, 0.4)" },
  PRO: { min: 80, label: "Pro", gradient: ["#C0C0C0", "#E8E8E8"] as [string, string], glow: "rgba(192, 192, 192, 0.4)" },
  ADVANCED: { min: 70, label: "Advanced", gradient: ["#CD7F32", "#B8860B"] as [string, string], glow: "rgba(205, 127, 50, 0.4)" },
  INTERMEDIATE: { min: 60, label: "Intermediate", gradient: ["#4A90A4", "#2E5A6B"] as [string, string], glow: "rgba(74, 144, 164, 0.4)" },
  DEVELOPING: { min: 0, label: "Developing", gradient: ["#6B7280", "#4B5563"] as [string, string], glow: "rgba(107, 114, 128, 0.4)" },
};

// ============================================================================
// Normalization Ranges
// ============================================================================

export const NORMALIZATION_RANGES = {
  power: { min: 0, max: 50 },         // 0-50 km/h wrist velocity
  agility: { min: 0, max: 200 },      // 0-200 km/h/s acceleration
  footwork: { min: 0, max: 90 },      // 0-90 degree knee bend
  hip: { min: 0, max: 10 },           // 0-10 km/h hip velocity
  rotation: { min: 0, max: 10 },      // 0-10 km/h shoulder velocity
};

// ============================================================================
// Attribute Display Order
// ============================================================================

export const LEFT_ATTRIBUTES: (keyof SwingMetrics)[] = ["power", "agility", "footwork"];
export const RIGHT_ATTRIBUTES: (keyof SwingMetrics)[] = ["hip", "rotation"];
