import type { SwingExplanation } from "../types";

// Tennis-specific terminology
export const tennisTerminology: Record<string, SwingExplanation> = {
  "deuce": {
    name: "Deuce",
    sport: "Tennis",
    description: "When the score is tied at 40-40. A player must win two consecutive points from deuce to win the game.",
    keyPoints: [
      "Score tied at 40-40",
      "Must win by 2 points",
      "Followed by advantage",
      "High-pressure situation"
    ]
  },
  "advantage": {
    name: "Advantage",
    sport: "Tennis",
    description: "The point after deuce. If the player with advantage wins the next point, they win the game. If they lose, it goes back to deuce.",
    keyPoints: [
      "One point ahead after deuce",
      "Win next point = win game",
      "Lose next point = back to deuce",
      "Can be ad-in or ad-out"
    ]
  },
  "ace": {
    name: "Ace",
    sport: "Tennis",
    description: "A serve that the opponent fails to touch with their racket. An immediate point winner.",
    keyPoints: [
      "Untouched serve",
      "Immediate point",
      "Measure of serving power/placement",
      "Goal of every server"
    ]
  },
  "let serve": {
    name: "Let (Serve)",
    sport: "Tennis / Padel",
    description: "A serve that touches the net but lands in the correct service box. The serve is replayed with no penalty. Commonly called a 'let serve'.",
    keyPoints: [
      "Serve touches net but lands in",
      "Point is replayed",
      "No penalty",
      "Can happen multiple times"
    ]
  }
};

