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
      "High-pressure situation"
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
  },
  "baseline": {
    name: "Baseline",
    sport: "Tennis",
    description: "The back line of the court, parallel to the net. This is where you hit groundstrokes and serve from. Shots landing inside the baseline (or on the line) are good; shots behind it are out.",
    keyPoints: [
      "Back line of the court",
      "Where groundstrokes and serves are hit",
      "Shots on the line are in",
      "Shots behind baseline are out"
    ]
  },
  "service line": {
    name: "Service Line",
    sport: "Tennis",
    description: "The line running parallel to the net in the middle of the court. Serves must land in front of this line to be good. This is also the area where most volleys are hit.",
    keyPoints: [
      "Middle court line parallel to net",
      "Serves must land before it",
      "Volley zone",
      "Defines service box depth"
    ]
  },
  "doubles alley": {
    name: "Doubles Alley",
    sport: "Tennis",
    description: "The area on either side of the court between the singles sideline and doubles sideline. Measures 1.37m (4.5 ft) wide and runs the full court length. Out of bounds in singles but in play for doubles, making it crucial for doubles strategy and positioning.",
    keyPoints: [
      "1.37m (4.5 ft) wide",
      "Runs full court length",
      "Out in singles play",
      "In bounds for doubles",
      "Key for doubles positioning"
    ]
  },
  "deuce side": {
    name: "Deuce Side",
    sport: "Tennis",
    description: "The right side of the court when facing the net, marked by the center hash on the baseline. Each game starts with a serve from the deuce side.",
    keyPoints: [
      "Right side facing net",
      "Starting side of each game",
      "Alternate with ad side each point"
    ]
  },
  "ad side": {
    name: "Ad Side",
    sport: "Tennis",
    description: "The left side of the court when facing the net. After playing a point on the deuce side, players switch to serve from the ad side, alternating until the game ends.",
    keyPoints: [
      "Left side facing net",
      "Second point of each game",
      "Alternate with deuce side"
    ]
  }
};

