import type { SwingExplanation } from "../types";

// Common terminology across Tennis, Pickleball, and Padel
export const sharedTerminology: Record<string, SwingExplanation> = {
  "baseline": {
    name: "Baseline",
    sport: "Tennis / Pickleball / Padel",
    description: "The line at the back of the court that marks the boundary for in-play balls. Players often position themselves near or behind this line during rallies.",
    keyPoints: [
      "Back boundary line of the court",
      "Serves must land beyond opponent's baseline",
      "Common position for groundstroke rallies",
      "Important for court positioning"
    ]
  },
  "rally": {
    name: "Rally",
    sport: "Tennis / Pickleball / Padel",
    description: "An extended exchange of shots between players or teams during a point. Longer rallies test consistency and endurance.",
    keyPoints: [
      "Continuous exchange of shots",
      "Tests consistency and strategy",
      "Can be fast-paced or tactical",
      "Ends when a point is won or lost"
    ]
  },
  "cross-court": {
    name: "Cross-Court",
    sport: "Tennis / Pickleball / Padel",
    description: "A shot hit diagonally across the court from one corner to the opposite corner. Provides more margin for error than down-the-line shots.",
    keyPoints: [
      "Diagonal shot across court",
      "Longer distance = more margin",
      "Safer than down-the-line",
      "Common in baseline rallies"
    ]
  },
  "down the line": {
    name: "Down the Line",
    sport: "Tennis / Pickleball / Padel",
    description: "A shot hit straight along the sideline, parallel to it. More aggressive but riskier than cross-court shots.",
    keyPoints: [
      "Straight along the sideline",
      "Shorter distance = less margin",
      "More aggressive option",
      "Often catches opponents off guard"
    ]
  },
  "mishit": {
    name: "Mishit",
    sport: "Tennis / Pickleball / Padel",
    description: "When the ball is struck poorly, often hitting the frame of the racket/paddle instead of the sweet spot. Results in loss of control and power.",
    keyPoints: [
      "Poor contact with the ball",
      "Often hits the frame",
      "Loss of control and power",
      "Can result from poor positioning or timing"
    ]
  }
};

