/**
 * Token estimation and pricing utilities for Gemini API
 */

// Rough estimate: ~4 characters per token for English text
const CHARS_PER_TOKEN = 4;

/**
 * Estimate token count for text
 */
export function estimateTextTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimate token count for video based on media resolution
 * Based on Gemini 3 docs:
 * - Low/Medium: ~70 tokens per frame
 * - High: ~280 tokens per frame
 * Default assumption: medium resolution (~70 tokens/frame)
 * Average video: ~30 fps, estimate based on duration
 */
export function estimateVideoTokens(
  videoSizeBytes: number,
  mimeType: string
): number {
  // Rough estimate: assume medium resolution
  // For a typical video, estimate ~1-2 tokens per KB of video data
  // This is a rough approximation - actual token count depends on resolution settings
  const tokensPerKB = 1.5;
  const videoSizeKB = videoSizeBytes / 1024;
  return Math.ceil(videoSizeKB * tokensPerKB);
}

/**
 * Calculate approximate pricing for Gemini 3 Pro
 * Pricing (per 1M tokens):
 * - Input: $2 (<200k tokens) or $4 (>200k tokens)
 * - Output: $12 (<200k tokens) or $18 (>200k tokens)
 */
export function calculatePricing(inputTokens: number, outputTokens: number): {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  inputPricePerM: number;
  outputPricePerM: number;
} {
  const inputPricePerM = inputTokens < 200000 ? 2 : 4;
  const outputPricePerM = outputTokens < 200000 ? 12 : 18;
  
  const inputCost = (inputTokens / 1_000_000) * inputPricePerM;
  const outputCost = (outputTokens / 1_000_000) * outputPricePerM;
  const totalCost = inputCost + outputCost;
  
  return {
    inputCost,
    outputCost,
    totalCost,
    inputPricePerM,
    outputPricePerM,
  };
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.001) {
    return `$${(cost * 1000).toFixed(3)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}

