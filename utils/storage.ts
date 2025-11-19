import type { Message } from "@/types/chat";

const STORAGE_KEY = "sportai-chat-messages";

/**
 * Maximum number of messages to keep in history
 * This prevents localStorage from growing too large and maintains performance.
 * 
 * Rationale:
 * - Average message: ~1-5KB (user prompts + AI responses)
 * - 100 messages ≈ 100-500KB (well under localStorage 5-10MB limit)
 * - Keeps ~50 conversations (user + assistant pairs)
 * - Maintains good performance for rendering and scrolling
 */
export const MAX_MESSAGE_HISTORY = 100;

/**
 * Estimated size per message in bytes (rough approximation)
 */
const ESTIMATED_BYTES_PER_MESSAGE = 3000;

/**
 * Maximum storage size in bytes (conservative: ~2MB to leave room for other data)
 */
const MAX_STORAGE_SIZE_BYTES = 2 * 1024 * 1024;

/**
 * Serializable version of Message (without File objects and blob URLs)
 */
type SerializableMessage = Omit<Message, "videoFile" | "videoPreview">;

/**
 * Load messages from localStorage
 * Automatically trims old messages if they exceed the limit
 */
export function loadMessagesFromStorage(): Message[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as SerializableMessage[];
    
    // Trim messages if they exceed the limit (cleanup old data)
    const trimmed = trimMessages(parsed);
    
    // If we trimmed, save the trimmed version back
    if (trimmed.length < parsed.length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch (error) {
        // If saving fails, continue with trimmed version in memory
        console.warn("Failed to save trimmed messages back to storage:", error);
      }
    }
    
    // Convert back to Message[] format (without videoFile/videoPreview)
    return trimmed.map((msg) => ({
      ...msg,
      videoFile: null,
      videoPreview: null,
    }));
  } catch (error) {
    console.error("Failed to load messages from storage:", error);
    return [];
  }
}

/**
 * Trim messages to keep only the most recent ones (FIFO)
 * This ensures we don't exceed the message limit
 */
function trimMessages(
  messages: SerializableMessage[]
): SerializableMessage[] {
  if (messages.length <= MAX_MESSAGE_HISTORY) {
    return messages;
  }

  // Keep only the most recent messages
  const trimmed = messages.slice(-MAX_MESSAGE_HISTORY);
  console.info(
    `Trimmed message history: kept ${trimmed.length} most recent messages (removed ${messages.length - trimmed.length} older messages)`
  );
  return trimmed;
}

/**
 * Estimate the size of serialized messages in bytes
 */
function estimateStorageSize(messages: SerializableMessage[]): number {
  // Rough estimate: JSON overhead + message content
  return messages.length * ESTIMATED_BYTES_PER_MESSAGE;
}

/**
 * Save messages to localStorage (excluding File objects and blob URLs)
 * Automatically trims old messages if limit is exceeded
 */
export function saveMessagesToStorage(messages: Message[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    // Remove File objects and blob URLs before saving
    let serializable: SerializableMessage[] = messages.map((msg) => {
      const { videoFile, videoPreview, ...rest } = msg;
      return rest;
    });

    // Trim messages if we exceed the limit
    serializable = trimMessages(serializable);

    // Check estimated size and trim more aggressively if needed
    const estimatedSize = estimateStorageSize(serializable);
    if (estimatedSize > MAX_STORAGE_SIZE_BYTES) {
      // Calculate how many messages we can keep based on size limit
      const maxMessagesBySize = Math.floor(
        MAX_STORAGE_SIZE_BYTES / ESTIMATED_BYTES_PER_MESSAGE
      );
      const targetLimit = Math.min(maxMessagesBySize, MAX_MESSAGE_HISTORY);
      
      if (serializable.length > targetLimit) {
        serializable = serializable.slice(-targetLimit);
        console.warn(
          `Storage size limit approaching. Trimmed to ${serializable.length} messages to stay under ${(MAX_STORAGE_SIZE_BYTES / 1024 / 1024).toFixed(1)}MB`
        );
      }
    }

    const serialized = JSON.stringify(serializable);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error("Failed to save messages to storage:", error);
    // Handle quota exceeded error gracefully
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn("LocalStorage quota exceeded. Attempting to trim messages...");
      
      try {
        // Try to save with fewer messages
        const serializable: SerializableMessage[] = messages
          .slice(-Math.floor(MAX_MESSAGE_HISTORY / 2))
          .map((msg) => {
            const { videoFile, videoPreview, ...rest } = msg;
            return rest;
          });
        
        const serialized = JSON.stringify(serializable);
        localStorage.setItem(STORAGE_KEY, serialized);
        console.info(
          `Successfully saved ${serializable.length} messages after trimming due to quota`
        );
      } catch (retryError) {
        // If still failing, clear storage as last resort
        console.error("Failed to save even after trimming. Clearing storage.");
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Ignore errors when clearing
        }
      }
    }
  }
}

/**
 * Clear messages from localStorage
 */
export function clearMessagesFromStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear messages from storage:", error);
  }
}

