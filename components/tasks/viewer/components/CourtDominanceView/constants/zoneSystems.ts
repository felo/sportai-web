import type { ZoneDefinition, ZoneSystem } from "../types";
import { metersToGrid, type Sport } from "./grid";

// =============================================================================
// PADEL ZONE SYSTEMS
// =============================================================================

// Traffic Light System (3 zones) - Classic coaching model for HALF COURT
const PADEL_TRAFFIC_LIGHT_ZONES: ZoneDefinition[] = [
  {
    id: "green",
    name: "Net Zone",
    emoji: "🟢",
    color: "#10B981",
    yMin: 7,
    yMax: 10,
    xMin: 0,
    xMax: 10,
    ...metersToGrid(0, 10, 7, 10),
    description: "Offensive position at the net",
    tacticalAdvice: "Finish points here with volleys and smashes",
  },
  {
    id: "orange",
    name: "Transition Zone",
    emoji: "🟠",
    color: "#F59E0B",
    yMin: 3.5,
    yMax: 7,
    xMin: 0,
    xMax: 10,
    ...metersToGrid(0, 10, 3.5, 7),
    description: "Mid-court transition area",
    tacticalAdvice: "Move forward when possible, don't stay here long",
    isPressureZone: true,
  },
  {
    id: "red",
    name: "Defense Zone",
    emoji: "🔴",
    color: "#EF4444",
    yMin: 0,
    yMax: 3.5,
    xMin: 0,
    xMax: 10,
    ...metersToGrid(0, 10, 0, 3.5),
    description: "Back court defensive position",
    tacticalAdvice: "Use lobs to reset, look for opportunities to advance",
    isPressureZone: true,
  },
];

// 6-Zone Tactical System - Split by depth AND side (HALF COURT)
const PADEL_SIX_ZONE_SYSTEM: ZoneDefinition[] = [
  // Net zones (7-10m from back wall)
  {
    id: "net-deuce",
    name: "Net Deuce",
    emoji: "🎯",
    color: "#10B981",
    yMin: 7,
    yMax: 10,
    xMin: 0,
    xMax: 5,
    ...metersToGrid(0, 5, 7, 10),
    description: "Net position on deuce side",
    tacticalAdvice: "Control the diagonal, intercept crosses",
  },
  {
    id: "net-ad",
    name: "Net Ad",
    emoji: "🎯",
    color: "#059669",
    yMin: 7,
    yMax: 10,
    xMin: 5,
    xMax: 10,
    ...metersToGrid(5, 10, 7, 10),
    description: "Net position on advantage side",
    tacticalAdvice: "Protect the line, attack the middle",
  },
  // Transition zones (3.5-7m from back wall)
  {
    id: "trans-deuce",
    name: "Transition Deuce",
    emoji: "⚡",
    color: "#F59E0B",
    yMin: 3.5,
    yMax: 7,
    xMin: 0,
    xMax: 5,
    ...metersToGrid(0, 5, 3.5, 7),
    description: "Mid-court deuce side",
    tacticalAdvice: "Move up or back quickly",
    isPressureZone: true,
  },
  {
    id: "trans-ad",
    name: "Transition Ad",
    emoji: "⚡",
    color: "#D97706",
    yMin: 3.5,
    yMax: 7,
    xMin: 5,
    xMax: 10,
    ...metersToGrid(5, 10, 3.5, 7),
    description: "Mid-court advantage side",
    tacticalAdvice: "Avoid lingering in no-man's land",
    isPressureZone: true,
  },
  // Defense zones (0-3.5m from back wall)
  {
    id: "defense-deuce",
    name: "Defense Deuce",
    emoji: "🛡️",
    color: "#EF4444",
    yMin: 0,
    yMax: 3.5,
    xMin: 0,
    xMax: 5,
    ...metersToGrid(0, 5, 0, 3.5),
    description: "Back court deuce corner",
    tacticalAdvice: "Use glass walls, lob to reset",
    isPressureZone: true,
  },
  {
    id: "defense-ad",
    name: "Defense Ad",
    emoji: "🛡️",
    color: "#DC2626",
    yMin: 0,
    yMax: 3.5,
    xMin: 5,
    xMax: 10,
    ...metersToGrid(5, 10, 0, 3.5),
    description: "Back court advantage corner",
    tacticalAdvice: "Recover position, look for counter",
    isPressureZone: true,
  },
];

// 9-Zone Grid System - Detailed 3×3 analysis (HALF COURT)
const PADEL_NINE_ZONE_SYSTEM: ZoneDefinition[] = [
  // Row 1: Net (6.67-10m from back wall)
  {
    id: "net-left",
    name: "Net Left",
    emoji: "1️⃣",
    color: "#10B981",
    yMin: 6.67,
    yMax: 10,
    xMin: 0,
    xMax: 3.33,
    ...metersToGrid(0, 3.33, 6.67, 10),
    description: "Net left corner",
    tacticalAdvice: "Strong position for right-handed players",
  },
  {
    id: "net-center",
    name: "Net Center",
    emoji: "2️⃣",
    color: "#059669",
    yMin: 6.67,
    yMax: 10,
    xMin: 3.33,
    xMax: 6.67,
    ...metersToGrid(3.33, 6.67, 6.67, 10),
    description: "Net center - the T",
    tacticalAdvice: "Control the T, dominate the net",
  },
  {
    id: "net-right",
    name: "Net Right",
    emoji: "3️⃣",
    color: "#047857",
    yMin: 6.67,
    yMax: 10,
    xMin: 6.67,
    xMax: 10,
    ...metersToGrid(6.67, 10, 6.67, 10),
    description: "Net right corner",
    tacticalAdvice: "Strong position for left-handed players",
  },
  // Row 2: Mid (3.33-6.67m from back wall)
  {
    id: "mid-left",
    name: "Mid Left",
    emoji: "4️⃣",
    color: "#F59E0B",
    yMin: 3.33,
    yMax: 6.67,
    xMin: 0,
    xMax: 3.33,
    ...metersToGrid(0, 3.33, 3.33, 6.67),
    description: "Mid left",
    tacticalAdvice: "Transition point - move forward or back",
    isPressureZone: true,
  },
  {
    id: "mid-center",
    name: "Mid Center",
    emoji: "5️⃣",
    color: "#D97706",
    yMin: 3.33,
    yMax: 6.67,
    xMin: 3.33,
    xMax: 6.67,
    ...metersToGrid(3.33, 6.67, 3.33, 6.67),
    description: "Mid center - no-man's land",
    tacticalAdvice: "Danger zone! Avoid staying here",
    isPressureZone: true,
  },
  {
    id: "mid-right",
    name: "Mid Right",
    emoji: "6️⃣",
    color: "#B45309",
    yMin: 3.33,
    yMax: 6.67,
    xMin: 6.67,
    xMax: 10,
    ...metersToGrid(6.67, 10, 3.33, 6.67),
    description: "Mid right",
    tacticalAdvice: "Transition point - move forward or back",
    isPressureZone: true,
  },
  // Row 3: Back (0-3.33m from back wall)
  {
    id: "back-left",
    name: "Back Left",
    emoji: "7️⃣",
    color: "#EF4444",
    yMin: 0,
    yMax: 3.33,
    xMin: 0,
    xMax: 3.33,
    ...metersToGrid(0, 3.33, 0, 3.33),
    description: "Back left corner",
    tacticalAdvice: "Use corner glass walls creatively",
    isPressureZone: true,
  },
  {
    id: "back-center",
    name: "Back Center",
    emoji: "8️⃣",
    color: "#DC2626",
    yMin: 0,
    yMax: 3.33,
    xMin: 3.33,
    xMax: 6.67,
    ...metersToGrid(3.33, 6.67, 0, 3.33),
    description: "Back center",
    tacticalAdvice: "Standard defensive position",
    isPressureZone: true,
  },
  {
    id: "back-right",
    name: "Back Right",
    emoji: "9️⃣",
    color: "#B91C1C",
    yMin: 0,
    yMax: 3.33,
    xMin: 6.67,
    xMax: 10,
    ...metersToGrid(6.67, 10, 0, 3.33),
    description: "Back right corner",
    tacticalAdvice: "Use corner glass walls creatively",
    isPressureZone: true,
  },
];

// Functional Zone System (Advanced) - Based on shot types (HALF COURT)
const PADEL_FUNCTIONAL_ZONES: ZoneDefinition[] = [
  {
    id: "volley",
    name: "Volley Zone",
    emoji: "🎯",
    color: "#10B981",
    yMin: 8.5,
    yMax: 10,
    xMin: 0,
    xMax: 10,
    ...metersToGrid(0, 10, 8.5, 10),
    description: "Prime finishing area",
    tacticalAdvice: "Take the ball early, put away with power",
  },
  {
    id: "bandeja",
    name: "Bandeja Zone",
    emoji: "🏸",
    color: "#3B82F6",
    yMin: 6,
    yMax: 8.5,
    xMin: 0,
    xMax: 10,
    ...metersToGrid(0, 10, 6, 8.5),
    description: "Bandeja and vibora territory",
    tacticalAdvice: "Control shots, push opponents back",
  },
  {
    id: "no-mans-land",
    name: "No-Man's Land",
    emoji: "⚠️",
    color: "#F59E0B",
    yMin: 4,
    yMax: 6,
    xMin: 0,
    xMax: 10,
    ...metersToGrid(0, 10, 4, 6),
    description: "Danger zone - transition only",
    tacticalAdvice: "Never stay here! Move forward or back",
    isPressureZone: true,
  },
  {
    id: "service-box",
    name: "Service Box",
    emoji: "📦",
    color: "#8B5CF6",
    yMin: 2,
    yMax: 4,
    xMin: 0,
    xMax: 10,
    ...metersToGrid(0, 10, 2, 4),
    description: "Rally building area",
    tacticalAdvice: "Work the point, look for net approach",
    isPressureZone: true,
  },
  {
    id: "glass-wall",
    name: "Glass Wall Zone",
    emoji: "🧱",
    color: "#EF4444",
    yMin: 0,
    yMax: 2,
    xMin: 0,
    xMax: 10,
    ...metersToGrid(0, 10, 0, 2),
    description: "Defensive survival area",
    tacticalAdvice: "Use walls creatively, lob to reset",
    isPressureZone: true,
  },
];

// =============================================================================
// TENNIS ZONE SYSTEMS
// =============================================================================
// Tennis half-court: 11.885m from baseline to net, with 6m extended behind baseline
// Y coordinates: 0 = baseline, 11.885 = net, -6 = behind baseline (for defense tracking)
// Note: Tennis zones measured from BASELINE (y=0) toward NET (y=11.885)

// Tennis Traffic Light System (4 zones including behind baseline)
const TENNIS_TRAFFIC_LIGHT_ZONES: ZoneDefinition[] = [
  {
    id: "net",
    name: "Net Zone",
    emoji: "🟢",
    color: "#10B981",
    yMin: 8.5,
    yMax: 17.885, // Extended to include full approach to net
    xMin: 0,
    xMax: 10.97,
    ...metersToGrid(0, 10.97, 8.5, 17.885, "tennis"),
    description: "Attacking position at the net",
    tacticalAdvice: "Finish points here with volleys and overheads",
  },
  {
    id: "transition",
    name: "No-Man's Land",
    emoji: "🟠",
    color: "#F59E0B",
    yMin: 5.5,
    yMax: 8.5,
    xMin: 0,
    xMax: 10.97,
    ...metersToGrid(0, 10.97, 5.5, 8.5, "tennis"),
    description: "Danger zone - pass through quickly!",
    tacticalAdvice: "Never rally from here - approach the net or retreat to baseline",
    isPressureZone: true,
  },
  {
    id: "baseline",
    name: "Baseline Zone",
    emoji: "🔵",
    color: "#3B82F6", // Blue - this is HOME in tennis
    yMin: 2.5,
    yMax: 5.5,
    xMin: 0,
    xMax: 10.97,
    ...metersToGrid(0, 10.97, 2.5, 5.5, "tennis"),
    description: "Rally position - your home base",
    tacticalAdvice: "Build points here, wait for short ball to attack",
  },
  {
    id: "deep-defense",
    name: "Deep Defense",
    emoji: "🔴",
    color: "#EF4444",
    yMin: 0,
    yMax: 2.5,
    xMin: 0,
    xMax: 10.97,
    ...metersToGrid(0, 10.97, 0, 2.5, "tennis"),
    description: "Behind baseline - defensive position",
    tacticalAdvice: "Neutralize with depth, work back to baseline position",
    isPressureZone: true,
  },
];

// Tennis 6-Zone Tactical System (Deuce/Ad + Depth)
const TENNIS_SIX_ZONE_SYSTEM: ZoneDefinition[] = [
  // Net zones
  {
    id: "net-deuce",
    name: "Net Deuce",
    emoji: "🎯",
    color: "#10B981",
    yMin: 8,
    yMax: 17.885,
    xMin: 0,
    xMax: 5.485,
    ...metersToGrid(0, 5.485, 8, 17.885, "tennis"),
    description: "Net position on deuce side",
    tacticalAdvice: "Cover the down-the-line, poach on crosses",
  },
  {
    id: "net-ad",
    name: "Net Ad",
    emoji: "🎯",
    color: "#059669",
    yMin: 8,
    yMax: 17.885,
    xMin: 5.485,
    xMax: 10.97,
    ...metersToGrid(5.485, 10.97, 8, 17.885, "tennis"),
    description: "Net position on advantage side",
    tacticalAdvice: "Control the backhand side, attack weak returns",
  },
  // Transition zones (no-man's land)
  {
    id: "trans-deuce",
    name: "Transition Deuce",
    emoji: "⚡",
    color: "#F59E0B",
    yMin: 4,
    yMax: 8,
    xMin: 0,
    xMax: 5.485,
    ...metersToGrid(0, 5.485, 4, 8, "tennis"),
    description: "Mid-court deuce side",
    tacticalAdvice: "Move through quickly - vulnerable to passing shots",
    isPressureZone: true,
  },
  {
    id: "trans-ad",
    name: "Transition Ad",
    emoji: "⚡",
    color: "#D97706",
    yMin: 4,
    yMax: 8,
    xMin: 5.485,
    xMax: 10.97,
    ...metersToGrid(5.485, 10.97, 4, 8, "tennis"),
    description: "Mid-court advantage side",
    tacticalAdvice: "No-man's land - keep moving forward or back",
    isPressureZone: true,
  },
  // Baseline zones
  {
    id: "baseline-deuce",
    name: "Baseline Deuce",
    emoji: "🏠",
    color: "#3B82F6",
    yMin: 0,
    yMax: 4,
    xMin: 0,
    xMax: 5.485,
    ...metersToGrid(0, 5.485, 0, 4, "tennis"),
    description: "Baseline deuce corner",
    tacticalAdvice: "Rally cross-court, look for inside-out opportunities",
  },
  {
    id: "baseline-ad",
    name: "Baseline Ad",
    emoji: "🏠",
    color: "#2563EB",
    yMin: 0,
    yMax: 4,
    xMin: 5.485,
    xMax: 10.97,
    ...metersToGrid(5.485, 10.97, 0, 4, "tennis"),
    description: "Baseline advantage corner",
    tacticalAdvice: "Control the backhand diagonal, set up forehand attacks",
  },
];

// Tennis Functional Zones (Based on shot types)
const TENNIS_FUNCTIONAL_ZONES: ZoneDefinition[] = [
  {
    id: "volley",
    name: "Volley Zone",
    emoji: "🎯",
    color: "#10B981",
    yMin: 9.5,
    yMax: 17.885,
    xMin: 0,
    xMax: 10.97,
    ...metersToGrid(0, 10.97, 9.5, 17.885, "tennis"),
    description: "Prime finishing area",
    tacticalAdvice: "Take balls out of the air, put away with authority",
  },
  {
    id: "approach",
    name: "Approach Zone",
    emoji: "🚀",
    color: "#8B5CF6",
    yMin: 6.5,
    yMax: 9.5,
    xMin: 0,
    xMax: 10.97,
    ...metersToGrid(0, 10.97, 6.5, 9.5, "tennis"),
    description: "Approach shot territory",
    tacticalAdvice: "Hit deep approach, close to net immediately",
  },
  {
    id: "no-mans-land",
    name: "No-Man's Land",
    emoji: "⚠️",
    color: "#F59E0B",
    yMin: 4,
    yMax: 6.5,
    xMin: 0,
    xMax: 10.97,
    ...metersToGrid(0, 10.97, 4, 6.5, "tennis"),
    description: "Danger zone - vulnerable to passing shots",
    tacticalAdvice: "NEVER rally from here! Move through quickly",
    isPressureZone: true,
  },
  {
    id: "rally",
    name: "Rally Zone",
    emoji: "🎾",
    color: "#3B82F6",
    yMin: 1.5,
    yMax: 4,
    xMin: 0,
    xMax: 10.97,
    ...metersToGrid(0, 10.97, 1.5, 4, "tennis"),
    description: "Baseline rally position",
    tacticalAdvice: "Build points, move opponent, wait for short ball",
  },
  {
    id: "defense",
    name: "Defense Zone",
    emoji: "🛡️",
    color: "#EF4444",
    yMin: 0,
    yMax: 1.5,
    xMin: 0,
    xMax: 10.97,
    ...metersToGrid(0, 10.97, 0, 1.5, "tennis"),
    description: "Deep defensive position",
    tacticalAdvice: "Neutralize with heavy topspin, buy time to recover",
    isPressureZone: true,
  },
];

// =============================================================================
// ZONE SYSTEM EXPORTS
// =============================================================================

// Padel zone systems
export const PADEL_ZONE_SYSTEMS: ZoneSystem[] = [
  {
    id: "traffic-light",
    name: "Traffic Light",
    description: "Simple 3-zone system (Green/Orange/Red)",
    zones: PADEL_TRAFFIC_LIGHT_ZONES,
    coachingTips:
      "Coaches use the Traffic Light system to teach court positioning basics. Green zone (net) is where you want to be to finish points. Orange zone (transition) should be crossed quickly—don't linger here. Red zone (defense) means you're under pressure; use lobs to reset and work your way forward.",
  },
  {
    id: "6-zone",
    name: "6-Zone Tactical",
    description: "Split by depth and court side",
    zones: PADEL_SIX_ZONE_SYSTEM,
    coachingTips:
      "The 6-Zone system helps coaches analyze court side balance. Players should control their side while being ready to cover the middle. Watch for patterns: Are you spending too much time on one side? Good teams rotate smoothly between deuce and ad sides while maintaining net presence.",
  },
  {
    id: "9-zone",
    name: "9-Zone Grid",
    description: "Detailed 3×3 grid analysis",
    zones: PADEL_NINE_ZONE_SYSTEM,
    coachingTips:
      "The 9-Zone grid provides granular positioning data. Coaches use this to identify specific weaknesses—like a player stuck in back corners or avoiding the center. Elite players dominate the net-center (the 'T') and minimize time in mid-court zones. Compare your heat map to pros to spot improvement areas.",
  },
  {
    id: "functional",
    name: "Functional",
    description: "Based on shot types and tactics",
    zones: PADEL_FUNCTIONAL_ZONES,
    coachingTips:
      "The Functional system maps zones to shot types. Volley zone is for finishing with power. Bandeja zone is where you control with overhead shots. No-man's land is dangerous—never stay here! Service box is for building points. Glass wall zone means you're defending; use the walls creatively to reset.",
  },
];

// Tennis zone systems
export const TENNIS_ZONE_SYSTEMS: ZoneSystem[] = [
  {
    id: "traffic-light",
    name: "Traffic Light",
    description: "4-zone system (Net/Transition/Baseline/Deep)",
    zones: TENNIS_TRAFFIC_LIGHT_ZONES,
    coachingTips:
      "The Tennis Traffic Light system shows court positioning fundamentals. Green (net) is where you finish points. Orange (no-man's land) is DANGEROUS—you'll get passed if you stay here! Blue (baseline) is your rally home base. Red (deep defense) means you're retrieving; work your way back to the baseline.",
  },
  {
    id: "6-zone",
    name: "6-Zone Tactical",
    description: "Split by depth and court side",
    zones: TENNIS_SIX_ZONE_SYSTEM,
    coachingTips:
      "The 6-Zone system analyzes court side balance. In singles, recover to center after each shot. Watch for patterns: Are you being pushed to one side? Elite players control the baseline center and approach on short balls. Minimize time in transition zones—they're vulnerable to passing shots.",
  },
  {
    id: "functional",
    name: "Functional",
    description: "Based on shot types and tactics",
    zones: TENNIS_FUNCTIONAL_ZONES,
    coachingTips:
      "The Functional system maps zones to shot types. Volley zone is for finishing with authority. Approach zone is for hitting deep and closing. No-man's land is where you get PASSED—never rally here! Rally zone is your baseline home. Defense zone means you're stretched; neutralize with depth.",
  },
];

// Helper to get zone systems for a specific sport
export function getZoneSystemsForSport(sport: Sport): ZoneSystem[] {
  switch (sport) {
    case "tennis":
      return TENNIS_ZONE_SYSTEMS;
    case "padel":
    default:
      return PADEL_ZONE_SYSTEMS;
  }
}

// Default export (backward compatible - uses Padel)
export const ZONE_SYSTEMS = PADEL_ZONE_SYSTEMS;



