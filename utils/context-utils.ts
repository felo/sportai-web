import type { Message } from "@/types/chat";
import { estimateTextTokens } from "@/lib/token-utils";

/**
 * Maximum tokens to include in conversation context
 * This balances context vs. cost:
 * - 5,000 tokens ≈ ~20KB of text
 * - Keeps ~10-15 messages typically
 * - Well under Gemini's 2M token limit
 * - Keeps costs reasonable (~$0.01 per request)
 */
export const MAX_CONTEXT_TOKENS = 5000;

/**
 * Reduced tokens for simple follow-up questions
 * - 1,500 tokens ≈ ~6KB of text
 * - Keeps ~3-4 messages (last 2 turns)
 * - Faster response times for clarifying questions
 */
export const SIMPLE_FOLLOWUP_TOKENS = 1500;

/**
 * Maximum messages for simple follow-ups (last N turns = 2N messages)
 */
export const SIMPLE_FOLLOWUP_MAX_TURNS = 2;

/**
 * Patterns that indicate a simple follow-up question
 * These are referential or clarifying questions that don't need full context
 */
const SIMPLE_FOLLOWUP_PATTERNS = [
  // Referential questions
  /^what about/i,
  /^how about/i,
  /^and (what|how|the)/i,
  /^also/i,
  /^tell me more/i,
  /^can you explain/i,
  /^explain (that|this|more)/i,
  /^more (on|about|details)/i,
  // Clarifying questions
  /^(can|could) you (clarify|elaborate)/i,
  /^what (do you mean|does that mean)/i,
  /^(sorry|thanks),? (but |and )?(what|how|can)/i,
  // Follow-up specifics
  /^(specifically|in particular)/i,
  /^for (that|this|the)/i,
  /^regarding (that|this|the)/i,
  // Short acknowledgment + question
  /^(ok|okay|got it|i see|thanks)[,.]?\s*(what|how|can|and|but|so)/i,
  // Pronoun-heavy (references previous context)
  /^(it|that|this|they|those)\s+(is|are|was|were|looks?|seems?)/i,
];

/**
 * Keywords that indicate a complex query needing full context
 */
const COMPLEX_QUERY_PATTERNS = [
  /\b(compare|comparison|versus|vs\.?|difference between)\b/i,
  /\b(overall|throughout|all of|each of|entire|whole)\b/i,
  /\b(summarize|summary|recap)\b/i,
  /\b(first|second|third|earlier|previous|before)\b/i,
  /\b(analyze|analyse|review|evaluate)\b/i,
];

/**
 * Detect if a prompt is a simple follow-up question
 * Simple follow-ups can use reduced history for faster responses
 */
export function isSimpleFollowup(
  prompt: string,
  previousMessages: Message[]
): boolean {
  const trimmedPrompt = prompt.trim();
  
  // Very short questions (< 10 words) with history are usually simple follow-ups
  const wordCount = trimmedPrompt.split(/\s+/).length;
  const hasHistory = previousMessages.length >= 2;
  
  // Check for complex query patterns first (these need full context)
  for (const pattern of COMPLEX_QUERY_PATTERNS) {
    if (pattern.test(trimmedPrompt)) {
      return false;
    }
  }
  
  // Check for simple follow-up patterns
  for (const pattern of SIMPLE_FOLLOWUP_PATTERNS) {
    if (pattern.test(trimmedPrompt)) {
      return true;
    }
  }
  
  // Short questions with history are likely simple follow-ups
  if (hasHistory && wordCount <= 8 && trimmedPrompt.endsWith("?")) {
    return true;
  }
  
  // Token-based heuristic: very short prompts with existing history
  const promptTokens = estimateTextTokens(trimmedPrompt);
  if (hasHistory && promptTokens < 30) {
    return true;
  }
  
  return false;
}

/**
 * Get the query complexity level
 * Returns "simple" for quick follow-ups, "complex" for detailed queries
 */
export function getQueryComplexity(
  prompt: string,
  previousMessages: Message[]
): "simple" | "complex" {
  return isSimpleFollowup(prompt, previousMessages) ? "simple" : "complex";
}

/**
 * Convert messages to Gemini chat format
 * Gemini expects: [{ role: "user", parts: [{ text: "..." }] }, { role: "model", parts: [{ text: "..." }] }]
 * 
 * IMPORTANT: Gemini requires the first message to have role "user".
 * This function removes any leading "model" messages to ensure compliance.
 * 
 * Note: We filter out truly empty messages but KEEP messages that have video/media
 * even if their text content is empty, by adding a reference to the video.
 */
export function formatMessagesForGemini(messages: Message[]): Array<{
  role: "user" | "model";
  parts: Array<{ text: string }>;
}> {
  console.log("🔍 [formatMessagesForGemini] Input messages:", messages.length);
  
  const result: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  
  for (const msg of messages) {
    // For user messages with video but no text, add a video reference
    // This ensures the context includes that a video was shared
    let content = msg.content.trim();
    const hasVideo = !!(msg.videoUrl || msg.videoS3Key || msg.videoFile);
    
    console.log(`🔍 [formatMessagesForGemini] Processing: ${msg.role}, content="${content.slice(0, 50)}...", hasVideo=${hasVideo}`);
    
    if (msg.role === "user" && content.length === 0) {
      // Check if this message had a video
      if (hasVideo) {
        content = "[User shared a video for analysis]";
        console.log("🔍 [formatMessagesForGemini] Added video placeholder for empty video message");
      }
    }
    
    // Filter out truly empty messages
    if (content.length === 0) {
      console.log("🔍 [formatMessagesForGemini] Skipping empty message");
      continue;
    }
    
    result.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: content }],
    });
  }
  
  // CRITICAL: Gemini API requires the first message to be from "user"
  // Remove any leading "model" messages to prevent "First content should be with role 'user'" error
  while (result.length > 0 && result[0].role === "model") {
    console.log("🔍 [formatMessagesForGemini] Removing leading model message to ensure first message is user");
    result.shift();
  }
  
  console.log("🔍 [formatMessagesForGemini] Output messages:", result.length);
  return result;
}

/**
 * Trim messages to fit within token limit
 * Keeps the most recent messages that fit within MAX_CONTEXT_TOKENS
 * Returns messages in chronological order (oldest to newest)
 * 
 * @param messages - Array of messages to trim
 * @param maxTokens - Maximum tokens to include (default: MAX_CONTEXT_TOKENS)
 * @param maxMessages - Optional maximum number of messages to include
 */
export function trimMessagesByTokens(
  messages: Message[],
  maxTokens: number = MAX_CONTEXT_TOKENS,
  maxMessages?: number
): Message[] {
  if (messages.length === 0) {
    return [];
  }

  // Start from the most recent message and work backwards
  const trimmed: Message[] = [];
  let totalTokens = 0;

  // Iterate backwards through messages
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = estimateTextTokens(message.content);

    // Check message count limit
    if (maxMessages !== undefined && trimmed.length >= maxMessages) {
      break;
    }

    // If adding this message would exceed the limit, stop
    if (totalTokens + messageTokens > maxTokens && trimmed.length > 0) {
      break;
    }

    // Add message to the beginning (since we're iterating backwards)
    trimmed.unshift(message);
    totalTokens += messageTokens;
  }

  return trimmed;
}

/**
 * Trim messages for simple follow-up queries
 * Uses reduced token limit and message count for faster responses
 */
export function trimMessagesForSimpleFollowup(
  messages: Message[]
): Message[] {
  // Keep only last N turns (2 * N messages for user + assistant pairs)
  const maxMessages = SIMPLE_FOLLOWUP_MAX_TURNS * 2;
  return trimMessagesByTokens(messages, SIMPLE_FOLLOWUP_TOKENS, maxMessages);
}

/**
 * Get conversation context for API call
 * Returns trimmed messages formatted for Gemini API
 * 
 * @param messages - Full message history
 * @param includeCurrent - Whether to include the current message being generated
 * @param currentPrompt - Current user prompt (for complexity detection)
 */
export function getConversationContext(
  messages: Message[],
  includeCurrent: boolean = false,
  currentPrompt?: string
): Array<{
  role: "user" | "model";
  parts: Array<{ text: string }>;
}> {
  // If including current message, use all messages
  // Otherwise, only exclude the last assistant message if it's a placeholder (empty/streaming)
  const messagesToUse = includeCurrent
    ? messages
    : messages.filter((msg, index) => {
        // If not the last message, always include
        if (index !== messages.length - 1) {
          return true;
        }
        // If last message is not assistant, include it
        if (msg.role !== "assistant") {
          return true;
        }
        // Last message is assistant - only exclude if empty/streaming (placeholder)
        const isPlaceholder = !msg.content.trim() || msg.isStreaming;
        return !isPlaceholder; // Keep if NOT a placeholder
      });

  // Determine if this is a simple follow-up (for faster responses)
  let trimmed: Message[];
  
  if (currentPrompt && isSimpleFollowup(currentPrompt, messagesToUse)) {
    // Use reduced context for simple follow-ups
    trimmed = trimMessagesForSimpleFollowup(messagesToUse);
    
    // Log for debugging (remove in production)
    if (typeof console !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('[Context] Using simple follow-up mode:', {
        originalMessages: messagesToUse.length,
        trimmedMessages: trimmed.length,
        prompt: currentPrompt.slice(0, 50) + '...',
      });
    }
  } else {
    // Use full context for complex queries
    trimmed = trimMessagesByTokens(messagesToUse);
  }
  
  return formatMessagesForGemini(trimmed);
}

/**
 * Get optimized conversation context with complexity detection
 * This is the recommended function for API calls
 * 
 * @param messages - Full message history
 * @param currentPrompt - Current user prompt
 * @returns Object with formatted context and detected complexity
 */
export function getOptimizedContext(
  messages: Message[],
  currentPrompt: string
): {
  context: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
  complexity: "simple" | "complex";
  originalMessageCount: number;
  trimmedMessageCount: number;
  tokensUsed: number;
  maxTokens: number;
} {
  // Only exclude the last assistant message if it's empty/streaming (placeholder for current response)
  // We KEEP completed assistant responses - they contain the video analysis context!
  const messagesToUse = messages.filter((msg, index) => {
    // If not the last message, always include
    if (index !== messages.length - 1) {
      return true;
    }
    // If last message is not assistant, include it
    if (msg.role !== "assistant") {
      return true;
    }
    // Last message is assistant - only exclude if empty/streaming (placeholder)
    const isPlaceholder = !msg.content.trim() || msg.isStreaming;
    if (isPlaceholder) {
      console.log("🔍 [getOptimizedContext] Excluding placeholder assistant message");
      return false;
    }
    // Completed assistant response - KEEP IT!
    console.log("🔍 [getOptimizedContext] Keeping completed assistant response");
    return true;
  });
  
  console.log("🔍 [getOptimizedContext] Input:", messages.length, "→ After filter:", messagesToUse.length);
  
  const complexity = getQueryComplexity(currentPrompt, messagesToUse);
  
  // Determine max tokens based on complexity
  const maxTokens = complexity === "simple" ? SIMPLE_FOLLOWUP_TOKENS : MAX_CONTEXT_TOKENS;
  
  const trimmed = complexity === "simple"
    ? trimMessagesForSimpleFollowup(messagesToUse)
    : trimMessagesByTokens(messagesToUse);
  
  // Calculate actual tokens used
  const tokensUsed = trimmed.reduce(
    (sum, msg) => sum + estimateTextTokens(msg.content || ""),
    0
  );
  
  return {
    context: formatMessagesForGemini(trimmed),
    complexity,
    originalMessageCount: messagesToUse.length,
    trimmedMessageCount: trimmed.length,
    tokensUsed,
    maxTokens,
  };
}

