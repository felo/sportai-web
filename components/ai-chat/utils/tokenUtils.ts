/**
 * Token calculation utilities for AI Chat
 */

import { estimateTextTokens, estimateVideoTokens } from "@/lib/token-utils";

/**
 * Calculate input tokens for user messages
 */
export function calculateUserMessageTokens(content: string, videoFile: File | null): number {
  let tokens = estimateTextTokens(content);
  if (videoFile) {
    const isImage = videoFile.type.startsWith("image/");
    if (isImage) {
      const imageSizeKB = videoFile.size / 1024;
      tokens += 257 + Math.ceil((imageSizeKB / 100) * 85);
    } else {
      tokens += estimateVideoTokens(videoFile.size, videoFile.type);
    }
  }
  return tokens;
}










