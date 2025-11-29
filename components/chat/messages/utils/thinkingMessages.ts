/**
 * Thinking messages displayed while AI is processing video content
 */
export const THINKING_MESSAGES_VIDEO = [
  "Initializing environment model…",
  "Detecting participants…",
  "Estimating motion paths…",
  "Understanding interaction dynamics…",
  "Reconstructing event timeline…",
  "Identifying key actions…",
  "Measuring performance indicators…",
  "Extracting behavioral patterns…",
  "Evaluating technique signatures…",
  "Computing tactical insights…",
  "Generating summary…",
];

/**
 * Thinking messages for deep/complex text queries (Pro model)
 * These communicate that the AI is taking extra care
 */
export const THINKING_MESSAGES_DEEP = [
  "This needs careful consideration…",
  "Let me think through this properly…",
  "Analyzing your question in depth…",
  "Taking time to give you a thorough answer…",
  "Working through the details…",
  "Considering multiple perspectives…",
  "Putting together a complete response…",
];

/**
 * Quick thinking messages for simple follow-ups (Flash model)
 */
export const THINKING_MESSAGES_QUICK = [
  "thinking…",
  "on it…",
  "got it…",
];

// Legacy export for backward compatibility
export const THINKING_MESSAGES = THINKING_MESSAGES_VIDEO;

/**
 * Get appropriate thinking message based on context
 */
export function getThinkingMessage(
  messageIndex: number,
  options: {
    hasVideo?: boolean;
    isFirstMessage?: boolean;
    isComplexQuery?: boolean;
  }
): string {
  const { hasVideo, isFirstMessage, isComplexQuery } = options;
  
  if (hasVideo) {
    // Video processing uses technical messages
    return THINKING_MESSAGES_VIDEO[messageIndex % THINKING_MESSAGES_VIDEO.length];
  }
  
  if (isFirstMessage || isComplexQuery) {
    // First message or complex query → show "taking care" messages
    return THINKING_MESSAGES_DEEP[messageIndex % THINKING_MESSAGES_DEEP.length];
  }
  
  // Simple follow-up → quick message
  return THINKING_MESSAGES_QUICK[messageIndex % THINKING_MESSAGES_QUICK.length];
}

