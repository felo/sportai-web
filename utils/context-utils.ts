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
 * Convert messages to Gemini chat format
 * Gemini expects: [{ role: "user", parts: [{ text: "..." }] }, { role: "model", parts: [{ text: "..." }] }]
 */
export function formatMessagesForGemini(messages: Message[]): Array<{
  role: "user" | "model";
  parts: Array<{ text: string }>;
}> {
  return messages
    .filter((msg) => msg.content.trim().length > 0) // Filter out empty messages
    .map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));
}

/**
 * Trim messages to fit within token limit
 * Keeps the most recent messages that fit within MAX_CONTEXT_TOKENS
 * Returns messages in chronological order (oldest to newest)
 */
export function trimMessagesByTokens(
  messages: Message[],
  maxTokens: number = MAX_CONTEXT_TOKENS
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
 * Get conversation context for API call
 * Returns trimmed messages formatted for Gemini API
 */
export function getConversationContext(
  messages: Message[],
  includeCurrent: boolean = false
): Array<{
  role: "user" | "model";
  parts: Array<{ text: string }>;
}> {
  // If including current message, use all messages
  // Otherwise, exclude the last assistant message (which is being generated)
  const messagesToUse = includeCurrent
    ? messages
    : messages.filter(
        (msg, index) =>
          !(msg.role === "assistant" && index === messages.length - 1)
      );

  const trimmed = trimMessagesByTokens(messagesToUse);
  return formatMessagesForGemini(trimmed);
}

