import type { ThinkingMode, MediaResolution, DomainExpertise } from "./storage";

/**
 * CLIENT-SIDE SAFE PROMPTS
 * Only include prompts that are safe to expose to the client
 * System prompts and coaching instructions should be in lib/prompts.ts (server-only)
 */

export const PICKLEBALL_COACH_PROMPT =
  "Analyze this video. Act as a certified Pickleball coach. Please identify the players, the swings the bounces, and carefully watch this match and provide a technical performance audit, identifying any areas of improvement and specific exercises or drills to correct them.\n\nFocus on one of the players and let me know who you've picked.";

/**
 * Starter prompt configuration
 * Each prompt can pre-configure settings like thinking mode, media resolution, and domain expertise
 */
export interface StarterPromptConfig {
  id: string;
  title: string;
  description: string;
  prompt: string;
  videoUrl: string;
  // Optional pre-configured settings
  thinkingMode?: ThinkingMode;
  mediaResolution?: MediaResolution;
  domainExpertise?: DomainExpertise;
  playbackSpeed?: number; // Video playback speed (0.25, 0.5, 1.0, 1.5, 2.0, etc.)
}

/**
 * Starter prompts for the landing page
 * Each prompt can have its own demo video URL and pre-configured settings
 */
export const STARTER_PROMPTS: readonly StarterPromptConfig[] = [
  {
    id: "strategy-review",
    title: "Tactical Analysis",
    description: "Understand game tactics, shot selection, and player positioning",
    prompt:
      "Review the strategic decisions in this pickleball rally video. Analyze shot selection, court positioning, and tactical choices. What could be improved from a strategic perspective?",
    videoUrl: "https://res.cloudinary.com/djtxhrly7/video/upload/v1763676272/Pickleball%20Rally.mp4",
    thinkingMode: "fast",
    mediaResolution: "medium",
    domainExpertise: "pickleball",
    playbackSpeed: 1.0,
  },
  {
    id: "technique-analysis",
    title: "Technique Analysis",
    description: "Get detailed feedback on your form, stance, and swing mechanics",
    prompt:
      "Analyze the technique in this video. Focus on form, body positioning, and swing mechanics. Identify 2-3 key areas for improvement and suggest specific drills to help.",
    videoUrl: "https://res.cloudinary.com/djtxhrly7/video/upload/v1763677270/Tennis%20Serve.mp4",
    thinkingMode: "deep",
    mediaResolution: "high",
    domainExpertise: "tennis",
    playbackSpeed: 0.25, // Slow motion for detailed technique analysis
  },
  {
    id: "quick-tips",
    title: "Quick Tips",
    description: "Get 3-5 actionable tips to immediately improve your game",
    prompt:
      "Watch this video and provide 3-5 quick, actionable tips that would make the biggest immediate impact on performance. Keep it concise and practical.",
    videoUrl: "https://res.cloudinary.com/djtxhrly7/video/upload/v1763676272/Pickleball%20Rally.mp4",
    thinkingMode: "fast",
    mediaResolution: "low",
    domainExpertise: "pickleball",
    playbackSpeed: 1.0,
  },
];
