/**
 * Technique Scoring Utilities
 * 
 * Calculates technique scores from swing detection data
 */

import type { ProtocolEvent } from "@/components/videoPoseViewerV2";

export interface TechniqueMetrics {
  /** Overall technique score (0-100) */
  overall: number;
  /** Timing & Rhythm score (0-100) */
  timing: number;
  /** Power Generation score (0-100) */
  power: number;
  /** Form & Control score (0-100) */
  form: number;
  /** Recovery & Balance score (0-100) */
  recovery: number;
  /** Preparation/Loading score (0-100) */
  preparation: number;
  /** Contact Point score (0-100) - for serves */
  contactPoint?: number;
  /** Consistency score (0-100) - only if multiple swings */
  consistency?: number;
}

export interface TechniqueRatingTier {
  label: string;
  gradient: [string, string];
  glow: string;
  emoji: string;
}

// Color palette matching the app design
export const TECHNIQUE_COLORS = {
  mint: {
    primary: "#7ADB8F",
    gradient: ["#7ADB8F", "#10B981"],
    fill: "rgba(122, 219, 143, 0.25)",
    glow: "rgba(122, 219, 143, 0.5)",
  },
  blue: {
    primary: "#60A5FA",
    gradient: ["#60A5FA", "#3B82F6"],
    fill: "rgba(96, 165, 250, 0.25)",
    glow: "rgba(96, 165, 250, 0.5)",
  },
  amber: {
    primary: "#F59E0B",
    gradient: ["#FBBF24", "#F59E0B"],
    fill: "rgba(245, 158, 11, 0.25)",
    glow: "rgba(245, 158, 11, 0.5)",
  },
  purple: {
    primary: "#A78BFA",
    gradient: ["#A78BFA", "#8B5CF6"],
    fill: "rgba(167, 139, 250, 0.25)",
    glow: "rgba(167, 139, 250, 0.5)",
  },
  rose: {
    primary: "#FB7185",
    gradient: ["#FDA4AF", "#F43F5E"],
    fill: "rgba(251, 113, 133, 0.25)",
    glow: "rgba(251, 113, 133, 0.5)",
  },
  cyan: {
    primary: "#22D3EE",
    gradient: ["#67E8F9", "#06B6D4"],
    fill: "rgba(34, 211, 238, 0.25)",
    glow: "rgba(34, 211, 238, 0.5)",
  },
};

/**
 * Get rating tier based on score
 */
export function getTechniqueRatingTier(score: number): TechniqueRatingTier {
  if (score >= 90) return {
    label: "Elite",
    gradient: ["#FFD700", "#FFA500"],
    glow: "rgba(255, 215, 0, 0.4)",
    emoji: "🏆",
  };
  if (score >= 80) return {
    label: "Pro",
    gradient: ["#C0C0C0", "#E8E8E8"],
    glow: "rgba(192, 192, 192, 0.4)",
    emoji: "⭐",
  };
  if (score >= 70) return {
    label: "Advanced",
    gradient: ["#CD7F32", "#B8860B"],
    glow: "rgba(205, 127, 50, 0.4)",
    emoji: "🎯",
  };
  if (score >= 60) return {
    label: "Intermediate",
    gradient: ["#4A90A4", "#2E5A6B"],
    glow: "rgba(74, 144, 164, 0.4)",
    emoji: "📈",
  };
  return {
    label: "Developing",
    gradient: ["#6B7280", "#4B5563"],
    glow: "rgba(107, 114, 128, 0.4)",
    emoji: "🌱",
  };
}

/**
 * Calculate technique scores from swing event metadata
 */
export function calculateTechniqueScore(
  swingEvent: ProtocolEvent,
  allEvents: ProtocolEvent[],
  videoFPS: number = 30
): TechniqueMetrics {
  const metadata = swingEvent.metadata as Record<string, unknown> | undefined;
  
  // Extract swing-specific events (loading, contact, follow-through)
  const relatedEvents = allEvents.filter(e => {
    const timeWindow = e.startTime >= swingEvent.startTime - 0.5 && 
                       e.startTime <= swingEvent.endTime + 0.5;
    return timeWindow && e.protocolId !== "swing-detection-v3";
  });
  
  const loadingEvent = relatedEvents.find(e => e.protocolId === "loading-position");
  const contactEvent = relatedEvents.find(e => e.protocolId === "tennis-contact-point");
  const prepEvent = relatedEvents.find(e => e.protocolId === "serve-preparation");
  const followEvent = relatedEvents.find(e => e.protocolId === "serve-follow-through");
  
  // Calculate individual metrics
  
  // 1. Timing Score - based on swing duration and phase transitions
  const swingDuration = swingEvent.endTime - swingEvent.startTime;
  const optimalDuration = 0.8; // seconds for a good swing
  const durationDeviation = Math.abs(swingDuration - optimalDuration) / optimalDuration;
  const timingScore = Math.max(0, Math.min(100, 100 - (durationDeviation * 50)));
  
  // 2. Power Score - based on velocity
  const velocityKmh = (metadata?.velocityKmh as number) || 0;
  const maxExpectedVelocity = 150; // km/h for a powerful swing
  const powerScore = Math.min(100, (velocityKmh / maxExpectedVelocity) * 100);
  
  // 3. Form Score - based on orientation and confidence
  const loadingOrientation = loadingEvent 
    ? (loadingEvent.metadata as Record<string, unknown>)?.loadingPeakOrientation as number 
    : null;
  const confidence = (metadata?.confidence as number) || 0.5;
  // Good form = consistent detection + proper body rotation
  const rotationScore = loadingOrientation !== null 
    ? Math.min(100, Math.abs(loadingOrientation) * 2) // Reward good body rotation
    : 50;
  const formScore = (confidence * 50) + (rotationScore / 2);
  
  // 4. Recovery Score - based on follow-through presence and swing end
  const hasFollowThrough = !!followEvent;
  const recoveryScore = hasFollowThrough ? 85 : 60;
  
  // 5. Preparation Score - based on loading position detection
  const hasPreparation = !!loadingEvent || !!prepEvent;
  const preparationScore = hasPreparation ? 85 : 55;
  
  // 6. Contact Point Score - for serves
  let contactPointScore: number | undefined;
  if (contactEvent) {
    const contactHeight = (contactEvent.metadata as Record<string, unknown>)?.contactPointHeight as number;
    // Higher contact point is better for serves (1.5-2.0x shoulder height is ideal)
    if (contactHeight) {
      contactPointScore = Math.min(100, (contactHeight / 2) * 100);
    }
  }
  
  // Calculate overall score with weighted average
  const weights = {
    timing: 0.20,
    power: 0.25,
    form: 0.25,
    recovery: 0.15,
    preparation: 0.15,
  };
  
  const overall = Math.round(
    timingScore * weights.timing +
    powerScore * weights.power +
    formScore * weights.form +
    recoveryScore * weights.recovery +
    preparationScore * weights.preparation
  );
  
  return {
    overall,
    timing: Math.round(timingScore),
    power: Math.round(powerScore),
    form: Math.round(formScore),
    recovery: Math.round(recoveryScore),
    preparation: Math.round(preparationScore),
    contactPoint: contactPointScore !== undefined ? Math.round(contactPointScore) : undefined,
  };
}

/**
 * Calculate consistency score across multiple swings
 */
export function calculateConsistencyScore(swings: TechniqueMetrics[]): number {
  if (swings.length < 2) return 0;
  
  // Calculate standard deviation of overall scores
  const overalls = swings.map(s => s.overall);
  const avg = overalls.reduce((a, b) => a + b, 0) / overalls.length;
  const variance = overalls.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / overalls.length;
  const stdDev = Math.sqrt(variance);
  
  // Lower std dev = higher consistency (max 100 when std dev is 0)
  return Math.max(0, Math.round(100 - stdDev * 2));
}

/**
 * Get swing type display info
 * Supports both padel format (forehand, backhand) and tennis format (fh, bh, 1h_bh, 2h_bh)
 */
export function getSwingTypeInfo(swingType?: string): { label: string; color: string; icon: string } {
  const types: Record<string, { label: string; color: string; icon: string }> = {
    // Standard / Padel format
    forehand: { label: "Forehand", color: TECHNIQUE_COLORS.mint.primary, icon: "🎾" },
    backhand: { label: "Backhand", color: TECHNIQUE_COLORS.blue.primary, icon: "🎾" },
    backhand_one_hand: { label: "Backhand (1H)", color: TECHNIQUE_COLORS.blue.primary, icon: "🎾" },
    backhand_two_hand: { label: "Backhand (2H)", color: TECHNIQUE_COLORS.blue.secondary, icon: "🎾" },
    serve: { label: "Serve", color: TECHNIQUE_COLORS.amber.primary, icon: "🚀" },
    volley: { label: "Volley", color: TECHNIQUE_COLORS.purple.primary, icon: "⚡" },
    smash: { label: "Smash", color: TECHNIQUE_COLORS.rose.primary, icon: "💥" },
    overhead: { label: "Overhead", color: TECHNIQUE_COLORS.rose.primary, icon: "💥" },
    // Tennis format (abbreviated) - from ML model
    fh: { label: "Forehand", color: TECHNIQUE_COLORS.mint.primary, icon: "🎾" },
    bh: { label: "Backhand", color: TECHNIQUE_COLORS.blue.primary, icon: "🎾" },
    "1h_bh": { label: "Backhand (1H)", color: TECHNIQUE_COLORS.blue.primary, icon: "🎾" },
    "2h_bh": { label: "Backhand (2H)", color: TECHNIQUE_COLORS.blue.secondary, icon: "🎾" },
    fh_overhead: { label: "Serve / Overhead", color: TECHNIQUE_COLORS.amber.primary, icon: "🚀" },
    bh_overhead: { label: "Backhand Overhead", color: TECHNIQUE_COLORS.rose.secondary, icon: "💥" },
    fh_volley: { label: "Forehand Volley", color: TECHNIQUE_COLORS.purple.primary, icon: "⚡" },
    bh_volley: { label: "Backhand Volley", color: TECHNIQUE_COLORS.purple.secondary, icon: "⚡" },
    unknown: { label: "Swing", color: TECHNIQUE_COLORS.cyan.primary, icon: "🏸" },
  };
  
  return types[swingType?.toLowerCase() || "unknown"] || types.unknown;
}

/**
 * Format speed display
 */
export function formatSpeed(kmh: number | undefined): string {
  if (!kmh || kmh < 3) return "—";
  return `${Math.round(kmh)} km/h`;
}

/**
 * Get phase color for swing phase visualization
 */
export function getPhaseColor(phase: string): string {
  const phaseColors: Record<string, string> = {
    loading: "#6366F1",
    backswing: "#3B82F6",
    forward: "#F59E0B",
    contact: "#EF4444",
    "follow-through": "#10B981",
    recovery: "#6B7280",
  };
  return phaseColors[phase] || "#6B7280";
}




