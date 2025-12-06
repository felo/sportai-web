import type { AttributeConfig } from "../types";

// Attribute display config with friendly explanations
export const ATTRIBUTE_CONFIG: Record<string, AttributeConfig> = {
  power: {
    emoji: "💥",
    label: "Power",
    description: "How hard you hit! 🎾 Based on your ball speed and those crispy smashes.",
  },
  agility: {
    emoji: "⚡",
    label: "Agility",
    description: "Your speed demon score! 🏃 How fast you sprint and move around the court.",
  },
  consistency: {
    emoji: "🎯",
    label: "Consistency",
    description: "The steady hand award! ✨ How reliable and repeatable your shots are.",
  },
  attack: {
    emoji: "⚔️",
    label: "Attack",
    description: "Going for the kill! 🔥 Your aggressive shots, smashes, and net plays.",
  },
  defense: {
    emoji: "🛡️",
    label: "Defense",
    description: "The wall! 🧱 Your lobs, defensive saves, and ability to stay in the rally.",
  },
  coverage: {
    emoji: "📍",
    label: "Coverage",
    description: "Court commander! 🗺️ How much ground you cover and your positioning.",
  },
  variety: {
    emoji: "🎨",
    label: "Variety",
    description: "The creative one! 🎭 Your range of different shot types and unpredictability.",
  },
};

