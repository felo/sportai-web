import type { SwingExplanation } from "../types";

// Pickleball court types
export const pickleballCourts: Record<string, SwingExplanation> = {
  "indoor court": {
    name: "Indoor Court",
    sport: "Pickleball",
    description: "Pickleball courts inside gymnasiums or dedicated facilities. Typically use sport court tiles or hardwood. Controlled environment without wind or sun factors.",
    keyPoints: [
      "Controlled environment",
      "No weather factors",
      "Consistent lighting",
      "Usually faster playing surface"
    ]
  },
  "outdoor court": {
    name: "Outdoor Court",
    sport: "Pickleball",
    description: "Pickleball courts outside, typically using concrete or asphalt surfaces. Players must account for wind, sun, and weather conditions.",
    keyPoints: [
      "Weather dependent",
      "Wind affects ball flight",
      "Sun can impact visibility",
      "More variables to manage"
    ]
  },
  "dedicated court": {
    name: "Dedicated Pickleball Court",
    sport: "Pickleball",
    description: "A court built specifically for pickleball with proper dimensions (20x44 feet). Offers optimal playing experience compared to converted tennis courts.",
    keyPoints: [
      "Built for pickleball specs",
      "20x44 feet dimensions",
      "Proper line markings",
      "Better than converted courts"
    ]
  },
  "converted court": {
    name: "Converted Tennis Court",
    sport: "Pickleball",
    description: "A tennis court adapted for pickleball by adding temporary or permanent pickleball lines. One tennis court can fit 2-4 pickleball courts.",
    keyPoints: [
      "Tennis court with pickleball lines",
      "2-4 pickleball courts per tennis court",
      "May have confusing line markings",
      "Common in multi-use facilities"
    ]
  }
};

