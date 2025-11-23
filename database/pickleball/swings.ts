import type { SwingExplanation } from "../types";

// Pickleball-specific techniques
export const pickleballSwings: Record<string, SwingExplanation> = {
  "dink": {
    name: "Dink",
    sport: "Pickleball",
    description: "A soft shot hit from the non-volley zone (kitchen) that arcs over the net and lands in the opponent's non-volley zone. A fundamental pickleball shot.",
    keyPoints: [
      "Soft, controlled shot",
      "Hit from and lands in the kitchen",
      "Requires touch and patience",
      "Key to winning at the net"
    ]
  },
  "erne": {
    name: "Erne",
    sport: "Pickleball",
    description: "An advanced shot where a player jumps around the non-volley zone to volley the ball from the side of the court.",
    keyPoints: [
      "Advanced aggressive shot",
      "Player jumps around the kitchen",
      "Volleys from the sideline",
      "Named after Erne Perry"
    ]
  },
  "third shot drive": {
    name: "Third Shot Drive",
    sport: "Pickleball",
    description: "An aggressive alternative to the third shot drop, where the ball is hit hard and deep instead of soft. Used to keep opponents back or to attack weak returns.",
    keyPoints: [
      "Aggressive third shot option",
      "Hit hard and deep",
      "Keeps opponents back",
      "Riskier than third shot drop"
    ]
  }
};

