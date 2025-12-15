import type { SwingExplanation } from "../types";

// Tennis-specific techniques
// Includes abbreviated swing type keys (fh, bh, 1h_bh, 2h_bh) used by ML model
export const tennisSwings: Record<string, SwingExplanation> = {
  "atp": {
    name: "ATP (Around The Post)",
    sport: "Tennis",
    description: "A shot that travels around the net post rather than over the net. Legal as long as it lands in the opponent's court.",
    keyPoints: [
      "Goes around the net post",
      "Doesn't need to go over net height",
      "Requires extreme angle",
      "Named after tennis tour (ATP)"
    ]
  },
  // Tennis abbreviated swing types (from ML model)
  "fh": {
    name: "Forehand",
    sport: "Tennis",
    description: "A groundstroke hit with the palm of the hand facing the direction of the stroke. The most natural and typically most powerful shot for most tennis players.",
    keyPoints: [
      "Hit on the dominant side of the body",
      "Uses full body rotation for power",
      "Contact point is in front of the body",
      "Modern tennis uses heavy topspin"
    ]
  },
  "bh": {
    name: "Backhand",
    sport: "Tennis",
    description: "A groundstroke hit with the back of the hand facing the direction of the shot. Can be executed with one or two hands on the racket.",
    keyPoints: [
      "Hit on the non-dominant side",
      "Can be one-handed or two-handed",
      "Requires good shoulder rotation",
      "Two-handed is more common in modern tennis"
    ]
  },
  "1h_bh": {
    name: "One-Handed Backhand",
    sport: "Tennis",
    description: "A backhand stroke executed with only the dominant hand on the racket. Provides greater reach and variety but requires more strength and timing.",
    keyPoints: [
      "Single hand on the racket",
      "Greater reach than two-handed",
      "More natural for slice shots",
      "Classic technique favored by some pros"
    ]
  },
  "2h_bh": {
    name: "Two-Handed Backhand",
    sport: "Tennis",
    description: "A backhand stroke executed with both hands on the racket. Provides more power and control, especially popular in modern tennis.",
    keyPoints: [
      "Both hands on the racket",
      "More power and stability",
      "Better for high balls",
      "Dominant in modern tennis"
    ]
  },
  "fh_overhead": {
    name: "Serve / Overhead",
    sport: "Tennis",
    description: "An overhead motion on the forehand side. This includes both the serve (to start points) and overhead smash (to finish points on high lobs). Both share similar mechanics.",
    keyPoints: [
      "Executed above the head",
      "Serve initiates every point",
      "Smash finishes points on lobs",
      "Same fundamental motion for both"
    ]
  },
  "bh_overhead": {
    name: "Backhand Overhead",
    sport: "Tennis",
    description: "An overhead smash hit on the backhand side, one of the most difficult shots in tennis. Usually hit when a lob goes over the head.",
    keyPoints: [
      "Very difficult shot",
      "Hit over the non-dominant shoulder",
      "Often requires jumping",
      "Less power than forehand overhead"
    ]
  },
  "fh_volley": {
    name: "Forehand Volley",
    sport: "Tennis",
    description: "A volley hit on the forehand side at the net, before the ball bounces. Requires quick reflexes and a compact stroke.",
    keyPoints: [
      "Hit at the net without bounce",
      "Compact punching motion",
      "Requires quick reflexes",
      "Continental grip typically used"
    ]
  },
  "bh_volley": {
    name: "Backhand Volley",
    sport: "Tennis",
    description: "A volley hit on the backhand side at the net, typically executed with one hand for better reach.",
    keyPoints: [
      "Usually one-handed for reach",
      "Compact stroke",
      "Often the weaker volley side",
      "Important for doubles play"
    ]
  },
  "fh_slice": {
    name: "Forehand Slice",
    sport: "Tennis",
    description: "A forehand hit with backspin, causing the ball to stay low and skid. Less common than backhand slice but useful for variety.",
    keyPoints: [
      "Hit with underspin",
      "Ball stays low after bounce",
      "Useful for approach shots",
      "Less common than backhand slice"
    ]
  },
  "bh_slice": {
    name: "Backhand Slice",
    sport: "Tennis",
    description: "A backhand hit with backspin, causing the ball to float and stay low. Essential defensive and transitional shot.",
    keyPoints: [
      "High-to-low swing path",
      "Ball floats and stays low",
      "Great for approach shots",
      "Key defensive weapon"
    ]
  },
  "fh_drop": {
    name: "Forehand Drop Shot",
    sport: "Tennis",
    description: "A delicate forehand shot that barely clears the net and dies in the opponent's court. Requires excellent touch.",
    keyPoints: [
      "Soft touch required",
      "Lands close to the net",
      "Disguise is crucial",
      "Best hit from inside baseline"
    ]
  },
  "bh_drop": {
    name: "Backhand Drop Shot",
    sport: "Tennis",
    description: "A delicate backhand shot that barely clears the net. Often easier to disguise than forehand drop shot.",
    keyPoints: [
      "Easier to disguise than forehand",
      "Uses similar preparation to slice",
      "Requires excellent touch",
      "Effective against baseline players"
    ]
  }
};
















