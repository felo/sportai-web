import type { SwingExplanation } from "../types";

// Tennis court surfaces and types
export const tennisCourts: Record<string, SwingExplanation> = {
  "hard court": {
    name: "Hard Court",
    sport: "Tennis",
    description: "A tennis court surface made of rigid materials like concrete or asphalt with an acrylic coating. Provides consistent, medium-paced bounces. Most common surface worldwide.",
    keyPoints: [
      "Consistent, predictable bounce",
      "Medium pace",
      "Less demanding on body than clay",
      "Used at US Open and Australian Open"
    ]
  },
  "clay court": {
    name: "Clay Court",
    sport: "Tennis",
    description: "A tennis court surface made of crushed stone, brick, or shale. Produces a slower, higher bounce and allows players to slide. Favors baseline players.",
    keyPoints: [
      "Slow, high bounce",
      "Allows sliding",
      "Favors baseline play and defense",
      "Used at French Open (Roland Garros)"
    ]
  },
  "grass court": {
    name: "Grass Court",
    sport: "Tennis",
    description: "A tennis court surface made of natural grass. Provides the fastest, lowest bounce. Favors serve-and-volley players and aggressive play.",
    keyPoints: [
      "Fastest surface",
      "Low, skidding bounce",
      "Favors serve-and-volley",
      "Used at Wimbledon"
    ]
  },
  "carpet court": {
    name: "Carpet Court",
    sport: "Tennis",
    description: "An indoor tennis surface made of synthetic material laid over a hard base. Fast-playing and low-bouncing, similar to grass.",
    keyPoints: [
      "Indoor surface",
      "Fast, low bounce",
      "Synthetic material",
      "Less common in professional play"
    ]
  },
  "red clay": {
    name: "Red Clay",
    sport: "Tennis",
    description: "Traditional clay court surface made from crushed brick. Used at the French Open and most European clay courts. Slower and higher bouncing than other surfaces.",
    keyPoints: [
      "Crushed brick composition",
      "Slowest tennis surface",
      "High bounce",
      "Used at French Open"
    ]
  },
  "green clay": {
    name: "Green Clay (Har-Tru)",
    sport: "Tennis",
    description: "Clay court surface made from crushed basalt or metabasalt. Faster than red clay and more common in the United States.",
    keyPoints: [
      "Crushed stone composition",
      "Faster than red clay",
      "More common in USA",
      "Also called Har-Tru"
    ]
  },
  "acrylic court": {
    name: "Acrylic Court",
    sport: "Tennis",
    description: "Modern hard court with acrylic surface coating. Provides consistent bounce and is the most common professional surface.",
    keyPoints: [
      "Most common professional surface",
      "Consistent, medium pace",
      "Used at major tournaments",
      "Durable and low maintenance"
    ]
  }
};

