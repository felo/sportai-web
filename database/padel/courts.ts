import type { SwingExplanation } from "../types";

// Padel court types
export const padelCourts: Record<string, SwingExplanation> = {
  "indoor court": {
    name: "Indoor Court",
    sport: "Padel",
    description: "Padel courts inside enclosed facilities. Controlled environment without weather factors. Walls are typically glass and metal structure.",
    keyPoints: [
      "Controlled environment",
      "No weather interference",
      "Consistent playing conditions",
      "Glass walls standard"
    ]
  },
  "outdoor court": {
    name: "Outdoor Court",
    sport: "Padel",
    description: "Padel courts outside, requiring weather-resistant materials. Wind and sun can significantly affect play and ball trajectory off the walls.",
    keyPoints: [
      "Weather dependent",
      "Wind affects ball and walls",
      "Sun glare can be challenging",
      "Requires weather-resistant materials"
    ]
  },
  "panoramic court": {
    name: "Panoramic Court",
    sport: "Padel",
    description: "A premium padel court with all-glass walls providing 360-degree visibility. Offers spectacular viewing experience for spectators.",
    keyPoints: [
      "All walls are glass",
      "Maximum spectator visibility",
      "Premium playing experience",
      "Common in professional venues"
    ]
  },
  "single glass court": {
    name: "Single Glass Court",
    sport: "Padel",
    description: "Standard padel court with glass walls only on the back sections and metal/wire mesh on the sides. Most common court type.",
    keyPoints: [
      "Glass back walls",
      "Metal mesh side walls",
      "Most common type",
      "Good visibility and durability"
    ]
  },
  "artificial turf": {
    name: "Artificial Turf Court",
    sport: "Padel",
    description: "Padel court with synthetic grass surface. Provides good grip and ball control with lower maintenance than natural surfaces.",
    keyPoints: [
      "Synthetic grass surface",
      "Good grip and control",
      "Low maintenance",
      "Most popular surface choice"
    ]
  }
};

