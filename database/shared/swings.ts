import type { SwingExplanation } from "../types";

// Techniques common to Tennis, Pickleball, and Padel
export const sharedSwings: Record<string, SwingExplanation> = {
  "forehand": {
    name: "Forehand",
    sport: "Tennis / Pickleball / Padel",
    description: "A groundstroke hit with the palm of the hand facing the direction of the stroke. It's typically the most natural and powerful shot for most players.",
    keyPoints: [
      "Hit on the dominant side of the body",
      "Uses rotation of shoulders and hips for power",
      "Contact point is in front of the body",
      "Follow through across the body"
    ]
  },
  "backhand": {
    name: "Backhand",
    sport: "Tennis / Pickleball / Padel",
    description: "A groundstroke hit with the back of the hand facing the direction of the shot. Can be executed with one or two hands.",
    keyPoints: [
      "Hit on the non-dominant side",
      "Two-handed provides more power and control",
      "One-handed allows greater reach",
      "Requires good shoulder rotation"
    ]
  },
  "serve": {
    name: "Serve",
    sport: "Tennis / Pickleball / Padel",
    description: "The shot used to start each point. In tennis, it's an overhead motion. In pickleball, it must be hit underhand.",
    keyPoints: [
      "Initiates every point",
      "Tennis: overhead motion with toss",
      "Pickleball: underhand below waist",
      "Padel: underhand below waist with bounce"
    ]
  },
  "volley": {
    name: "Volley",
    sport: "Tennis / Pickleball / Padel",
    description: "A shot hit before the ball bounces, typically executed at the net. Requires quick reflexes and a compact swing.",
    keyPoints: [
      "Hit before the ball bounces",
      "Usually performed at the net",
      "Compact, punching motion",
      "Requires good hand-eye coordination"
    ]
  },
  "smash": {
    name: "Smash / Overhead",
    sport: "Tennis / Pickleball / Padel",
    description: "A powerful overhead shot used to return high balls, similar to a serve motion. Also called an overhead.",
    keyPoints: [
      "Hit above the head",
      "Similar motion to a serve",
      "Used to finish points",
      "Requires good timing and positioning"
    ]
  },
  "overhead": {
    name: "Overhead / Smash",
    sport: "Tennis / Pickleball / Padel",
    description: "A powerful overhead shot used to return high balls, similar to a serve motion. Also called a smash.",
    keyPoints: [
      "Hit above the head",
      "Similar motion to a serve",
      "Used to finish points",
      "Requires good timing and positioning"
    ]
  },
  "slice": {
    name: "Slice",
    sport: "Tennis / Pickleball / Padel",
    description: "A shot hit with backspin, causing the ball to stay low and skid after bouncing. Creates a different pace and trajectory.",
    keyPoints: [
      "Hit with underspin/backspin",
      "Ball stays low after bounce",
      "Used for variety and defense",
      "High-to-low swing path"
    ]
  },
  "topspin": {
    name: "Topspin",
    sport: "Tennis / Pickleball / Padel",
    description: "A shot hit with forward rotation, causing the ball to dip quickly and bounce high. The most common spin in modern tennis.",
    keyPoints: [
      "Forward rotation on the ball",
      "Ball dips and bounces high",
      "Low-to-high swing path",
      "Allows for aggressive, consistent play"
    ]
  },
  "flat": {
    name: "Flat",
    sport: "Tennis / Pickleball / Padel",
    description: "A shot hit with minimal spin, traveling in a relatively straight trajectory. Generates pace but has less margin for error than topspin.",
    keyPoints: [
      "Little to no spin",
      "Straight, fast trajectory",
      "Generates maximum pace",
      "Less margin than topspin"
    ]
  },
  "drop shot": {
    name: "Drop Shot",
    sport: "Tennis / Pickleball / Padel",
    description: "A soft shot that barely clears the net and lands close to it, designed to catch opponents off guard.",
    keyPoints: [
      "Soft touch shot",
      "Lands close to the net",
      "Used to surprise opponents",
      "Requires excellent feel and disguise"
    ]
  },
  "lob": {
    name: "Lob",
    sport: "Tennis / Pickleball / Padel",
    description: "A high, arcing shot intended to go over an opponent's head, typically used when they're at the net.",
    keyPoints: [
      "High, arcing trajectory",
      "Goes over opponent's head",
      "Defensive or offensive weapon",
      "Can be hit with topspin or slice"
    ]
  },
  "split step": {
    name: "Split Step",
    sport: "Tennis / Pickleball / Padel",
    description: "A small preparatory hop performed just before the opponent hits the ball. This athletic stance prepares you to move explosively in any direction.",
    keyPoints: [
      "Small hop before opponent's contact",
      "Lands on balls of feet",
      "Prepares explosive movement",
      "Essential for quick reactions"
    ]
  }
};

