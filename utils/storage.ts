import type { Message, Chat } from "@/types/chat";

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
 * Refresh video URLs from S3 keys for messages that have expired URLs
 * This is called asynchronously after loading messages
 */
export async function refreshVideoUrls(messages: Message[]): Promise<Message[]> {
  const messagesWithKeys = messages.filter((msg) => msg.videoS3Key && !msg.videoUrl);
  
  if (messagesWithKeys.length === 0) {
    return messages;
  }

  console.log(`[Storage] Refreshing ${messagesWithKeys.length} video URL(s) from S3 keys...`);

  const refreshedMessages = await Promise.all(
    messages.map(async (msg) => {
      // Refresh if we have an S3 key (presigned URLs expire, so always refresh)
      if (msg.videoS3Key) {
        try {
          const response = await fetch("/api/s3/download-url", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key: msg.videoS3Key,
              expiresIn: 7 * 24 * 3600, // 7 days
            }),
          });

          if (response.ok) {
            const { downloadUrl } = await response.json();
            console.log(`[Storage] ✅ Refreshed video URL for key: ${msg.videoS3Key}`);
            return { ...msg, videoUrl: downloadUrl };
          } else {
            console.warn(`[Storage] ⚠️ Failed to refresh video URL for key: ${msg.videoS3Key}`);
            return msg;
          }
        } catch (error) {
          console.error(`[Storage] ❌ Error refreshing video URL for key: ${msg.videoS3Key}`, error);
          return msg;
        }
      }
      return msg;
    })
  );

  return refreshedMessages;
}

/**
 * Load messages from localStorage
 * Automatically trims old messages if they exceed the limit
 * Refreshes video URLs from S3 keys if needed
 */
export async function loadMessagesFromStorage(): Promise<Message[]> {
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
    const messages: Message[] = trimmed.map((msg) => ({
      ...msg,
      videoFile: null,
      videoPreview: null,
    }));

    return messages;
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

/**
 * Developer mode storage key
 */
const DEVELOPER_MODE_KEY = "developer-mode";

/**
 * Theatre mode storage key
 */
const THEATRE_MODE_KEY = "theatre-mode";

/**
 * Chats storage key
 */
const CHATS_STORAGE_KEY = "sportai-chats";

/**
 * Current chat ID storage key
 */
const CURRENT_CHAT_ID_KEY = "sportai-current-chat-id";

/**
 * Get developer mode setting from localStorage
 * @returns true if developer mode is enabled, false otherwise
 */
export function getDeveloperMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const stored = localStorage.getItem(DEVELOPER_MODE_KEY);
    return stored === "true";
  } catch (error) {
    console.error("Failed to load developer mode from storage:", error);
    return false;
  }
}

/**
 * Save developer mode setting to localStorage
 * @param enabled - Whether developer mode should be enabled
 */
export function setDeveloperMode(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(DEVELOPER_MODE_KEY, enabled ? "true" : "false");
  } catch (error) {
    console.error("Failed to save developer mode to storage:", error);
  }
}

/**
 * Get theatre mode setting from localStorage
 * @returns true if theatre mode is enabled, false otherwise (defaults to true)
 */
export function getTheatreMode(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    const stored = localStorage.getItem(THEATRE_MODE_KEY);
    // Default to true if not set
    if (stored === null) {
      return true;
    }
    return stored === "true";
  } catch (error) {
    console.error("Failed to load theatre mode from storage:", error);
    return true;
  }
}

/**
 * Save theatre mode setting to localStorage
 * @param enabled - Whether theatre mode should be enabled
 */
export function setTheatreMode(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(THEATRE_MODE_KEY, enabled ? "true" : "false");
  } catch (error) {
    console.error("Failed to save theatre mode to storage:", error);
  }
}

/**
 * Thinking mode type
 */
export type ThinkingMode = "fast" | "deep";

/**
 * Media resolution type
 */
export type MediaResolution = "low" | "medium" | "high";

/**
 * Domain expertise type
 */
export type DomainExpertise = "all-sports" | "tennis" | "pickleball" | "padel";

/**
 * Thinking mode storage key
 */
const THINKING_MODE_KEY = "thinking-mode";

/**
 * Media resolution storage key
 */
const MEDIA_RESOLUTION_KEY = "media-resolution";

/**
 * Domain expertise storage key
 */
const DOMAIN_EXPERTISE_KEY = "domain-expertise";

/**
 * Get thinking mode setting from localStorage
 * @returns "fast" or "deep", defaults to "fast"
 */
export function getThinkingMode(): ThinkingMode {
  if (typeof window === "undefined") {
    return "fast";
  }

  try {
    const stored = localStorage.getItem(THINKING_MODE_KEY);
    return (stored === "deep" || stored === "fast") ? stored : "fast";
  } catch (error) {
    console.error("Failed to load thinking mode from storage:", error);
    return "fast";
  }
}

/**
 * Save thinking mode setting to localStorage
 * @param mode - "fast" or "deep"
 */
export function setThinkingMode(mode: ThinkingMode): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(THINKING_MODE_KEY, mode);
  } catch (error) {
    console.error("Failed to save thinking mode to storage:", error);
  }
}

/**
 * Get media resolution setting from localStorage
 * @returns "low", "medium", or "high", defaults to "medium"
 */
export function getMediaResolution(): MediaResolution {
  if (typeof window === "undefined") {
    return "medium";
  }

  try {
    const stored = localStorage.getItem(MEDIA_RESOLUTION_KEY);
    return (stored === "low" || stored === "medium" || stored === "high") ? stored : "medium";
  } catch (error) {
    console.error("Failed to load media resolution from storage:", error);
    return "medium";
  }
}

/**
 * Save media resolution setting to localStorage
 * @param resolution - "low", "medium", or "high"
 */
export function setMediaResolution(resolution: MediaResolution): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(MEDIA_RESOLUTION_KEY, resolution);
  } catch (error) {
    console.error("Failed to save media resolution to storage:", error);
  }
}

/**
 * Get domain expertise setting from localStorage
 * @returns "all-sports", "tennis", "pickleball", or "padel", defaults to "all-sports"
 */
export function getDomainExpertise(): DomainExpertise {
  if (typeof window === "undefined") {
    return "all-sports";
  }

  try {
    const stored = localStorage.getItem(DOMAIN_EXPERTISE_KEY);
    return (stored === "all-sports" || stored === "tennis" || stored === "pickleball" || stored === "padel") 
      ? stored 
      : "all-sports";
  } catch (error) {
    console.error("Failed to load domain expertise from storage:", error);
    return "all-sports";
  }
}

/**
 * Save domain expertise setting to localStorage
 * @param expertise - "all-sports", "tennis", "pickleball", or "padel"
 */
export function setDomainExpertise(expertise: DomainExpertise): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(DOMAIN_EXPERTISE_KEY, expertise);
  } catch (error) {
    console.error("Failed to save domain expertise to storage:", error);
  }
}

/**
 * Serializable version of Chat (without File objects and blob URLs)
 */
type SerializableChat = Omit<Chat, "messages"> & {
  messages: SerializableMessage[];
};

/**
 * Generate a unique chat ID
 */
function generateChatId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate an AI-powered chat title from the first exchange
 * Uses Gemini API to create a concise, descriptive title
 */
export async function generateAIChatTitle(messages: Message[]): Promise<string> {
  const firstUserMessage = messages.find((msg) => msg.role === "user");
  const firstAssistantMessage = messages.find((msg) => msg.role === "assistant");
  
  if (!firstUserMessage) return "New Chat";
  
  // If we have both user and assistant messages, generate a smart title
  if (firstAssistantMessage && firstAssistantMessage.content.trim()) {
    try {
      // Check if user message has video but no text
      const hasVideoOnly = (firstUserMessage.videoFile || firstUserMessage.videoUrl) && 
                          !firstUserMessage.content.trim();
      
      // Truncate messages to keep token usage minimal (200 chars each)
      const userExcerpt = firstUserMessage.content.trim().slice(0, 200);
      const assistantExcerpt = firstAssistantMessage.content.trim().slice(0, 200);
      
      // Improve prompt for video-only messages to include analysis details
      let titlePrompt: string;
      if (hasVideoOnly) {
        titlePrompt = `Generate a concise, descriptive title (maximum 6 words) for this video analysis conversation. The title should include what was analyzed (e.g., "Tennis serve technique analysis" or "Basketball shooting form review"). Base it on the assistant's response:\n\nAssistant: ${assistantExcerpt}\n\nTitle:`;
      } else {
        titlePrompt = `Generate a concise, descriptive title (maximum 6 words) for this conversation:\n\nUser: ${userExcerpt}\n\nAssistant: ${assistantExcerpt}\n\nTitle:`;
      }
      
      // Use FormData for the API request (required by the API route)
      const formData = new FormData();
      formData.append("prompt", titlePrompt);
      formData.append("thinkingMode", "fast");
      formData.append("mediaResolution", "low");
      
      const response = await fetch("/api/gemini", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const title = data.response?.trim() || generateChatTitle(messages);
      
      // Ensure title is reasonable length (fallback if AI generates something too long)
      return title.length > 60 ? title.slice(0, 57) + "..." : title;
    } catch (error) {
      console.error("Failed to generate AI title:", error);
      // Fallback to text-based title generation
      return generateChatTitle(messages);
    }
  }
  
  // Fallback to text-based extraction if no assistant response yet
  return generateChatTitle(messages);
}

/**
 * Generate a chat title from the first user message
 * Improved version with better text extraction
 */
function generateChatTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((msg) => msg.role === "user");
  if (firstUserMessage) {
    // If message has video but no text, use a video-specific title
    if ((firstUserMessage.videoFile || firstUserMessage.videoUrl) && 
        !firstUserMessage.content.trim()) {
      return "Video Analysis";
    }
    
    const content = firstUserMessage.content.trim();
    if (content.length === 0) return "New Chat";
    
    // Try to extract first sentence (up to 50 chars)
    const firstSentence = content.match(/^[^.!?]+[.!?]?/)?.[0];
    if (firstSentence && firstSentence.length <= 50) {
      return firstSentence;
    }
    
    // Otherwise, truncate at word boundary near 50 chars
    if (content.length > 50) {
      const truncated = content.slice(0, 47);
      const lastSpace = truncated.lastIndexOf(' ');
      return lastSpace > 20 
        ? truncated.slice(0, lastSpace) + '...'
        : truncated + '...';
    }
    
    return content;
  }
  return "New Chat";
}

/**
 * Convert Chat to SerializableChat (removes File objects and blob URLs)
 */
function serializeChat(chat: Chat): SerializableChat {
  return {
    ...chat,
    messages: chat.messages.map((msg) => {
      const { videoFile, videoPreview, ...rest } = msg;
      return rest;
    }),
  };
}

/**
 * Convert SerializableChat back to Chat
 */
function deserializeChat(serialized: SerializableChat): Chat {
  return {
    ...serialized,
    messages: serialized.messages.map((msg) => ({
      ...msg,
      videoFile: null,
      videoPreview: null,
    })),
  };
}

/**
 * Load all chats from localStorage
 * @returns Array of chats, sorted by updatedAt (most recent first)
 */
export function loadChatsFromStorage(): Chat[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(CHATS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as SerializableChat[];
    return parsed.map(deserializeChat).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error("Failed to load chats from storage:", error);
    return [];
  }
}

/**
 * Save chats to localStorage
 * @param chats - Array of chats to save
 */
export function saveChatsToStorage(chats: Chat[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const serializable = chats.map(serializeChat);
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.error("Failed to save chats to storage:", error);
    // Handle quota exceeded error gracefully
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn("LocalStorage quota exceeded. Attempting to trim chats...");
      try {
        // Keep only the most recent chats (limit to 50)
        const trimmed = chats
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 50)
          .map(serializeChat);
        localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(trimmed));
        console.info(`Successfully saved ${trimmed.length} chats after trimming due to quota`);
      } catch (retryError) {
        console.error("Failed to save even after trimming:", retryError);
      }
    }
  }
}

/**
 * Create a new chat and save it to storage
 * @param messages - Initial messages for the chat
 * @param title - Optional custom title for the chat (defaults to generated title from messages)
 * @returns The created chat
 */
export function createChat(messages: Message[] = [], title?: string): Chat {
  const now = Date.now();
  const chat: Chat = {
    id: generateChatId(),
    title: title || generateChatTitle(messages),
    createdAt: now,
    updatedAt: now,
    messages,
  };

  const chats = loadChatsFromStorage();
  chats.unshift(chat); // Add to beginning
  saveChatsToStorage(chats);

  // Dispatch custom event to notify components of chat creation
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("chat-storage-change"));
  }

  return chat;
}

/**
 * Update an existing chat
 * @param chatId - ID of the chat to update
 * @param updates - Partial chat data to update
 * @param silent - If true, don't dispatch the chat-storage-change event (prevents loops)
 */
export function updateChat(chatId: string, updates: Partial<Chat>, silent: boolean = false): void {
  const chats = loadChatsFromStorage();
  const index = chats.findIndex((chat) => chat.id === chatId);

  if (index === -1) {
    console.warn(`Chat with id ${chatId} not found`);
    return;
  }

  // Only update updatedAt if content actually changed (not just refreshing URLs)
  // Compare message IDs and content, ignoring File objects and URLs
  const hasContentChange = updates.messages && 
    (updates.messages.length !== chats[index].messages.length ||
     updates.messages.some((msg, i) => 
       msg.id !== chats[index].messages[i]?.id || 
       msg.content !== chats[index].messages[i]?.content ||
       msg.role !== chats[index].messages[i]?.role
     ));

  // Determine the title:
  // 1. Use provided title if explicitly set
  // 2. Regenerate from messages ONLY if message content actually changed (not just URL refreshes)
  // 3. Otherwise keep existing title
  const newTitle = updates.title !== undefined
    ? updates.title
    : (hasContentChange && updates.messages
        ? generateChatTitle(updates.messages)
        : chats[index].title);

  // Create updated chat object - spread updates first, then override with computed values
  // This ensures title and updatedAt are set correctly
  const { title: _, messages: __, ...otherUpdates } = updates;
  const updatedChat = {
    ...chats[index],
    ...otherUpdates,
    updatedAt: hasContentChange ? Date.now() : chats[index].updatedAt,
    title: newTitle,
    // Include messages if provided
    ...(updates.messages && { messages: updates.messages }),
  };
  
  console.log(`[Storage] Updating chat ${chatId}:`, {
    oldTitle: chats[index].title,
    newTitle: newTitle,
    updatesTitle: updates.title,
    finalTitle: updatedChat.title,
  });

  chats[index] = updatedChat;
  saveChatsToStorage(chats);
  
  // Verify it was saved correctly
  const verifyChats = loadChatsFromStorage();
  const verifyChat = verifyChats.find(c => c.id === chatId);
  console.log(`[Storage] Verification - saved title: "${verifyChat?.title}"`);

  // Dispatch custom event to notify components of chat update (unless silent)
  if (!silent && typeof window !== "undefined") {
    window.dispatchEvent(new Event("chat-storage-change"));
  }
}

/**
 * Delete a chat from storage
 * @param chatId - ID of the chat to delete
 */
export function deleteChat(chatId: string): void {
  const chats = loadChatsFromStorage();
  const filtered = chats.filter((chat) => chat.id !== chatId);
  saveChatsToStorage(filtered);

  // Dispatch custom event to notify components of chat deletion
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("chat-storage-change"));
  }
}

/**
 * Get a specific chat by ID
 * @param chatId - ID of the chat to retrieve
 * @returns The chat if found, undefined otherwise
 */
export function getChatById(chatId: string): Chat | undefined {
  const chats = loadChatsFromStorage();
  return chats.find((chat) => chat.id === chatId);
}

/**
 * Get the current active chat ID from storage
 * @returns The current chat ID, or undefined if not set
 */
export function getCurrentChatId(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const stored = localStorage.getItem(CURRENT_CHAT_ID_KEY);
    return stored || undefined;
  } catch (error) {
    console.error("Failed to load current chat ID from storage:", error);
    return undefined;
  }
}

/**
 * Set the current active chat ID
 * @param chatId - ID of the chat to set as current
 */
export function setCurrentChatId(chatId: string | undefined): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (chatId) {
      localStorage.setItem(CURRENT_CHAT_ID_KEY, chatId);
    } else {
      localStorage.removeItem(CURRENT_CHAT_ID_KEY);
    }
    // Dispatch custom event to notify components of current chat change
    window.dispatchEvent(new Event("chat-storage-change"));
  } catch (error) {
    console.error("Failed to save current chat ID to storage:", error);
  }
}

/**
 * Clear all chats from storage
 */
export function clearChatsFromStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(CHATS_STORAGE_KEY);
    localStorage.removeItem(CURRENT_CHAT_ID_KEY);
  } catch (error) {
    console.error("Failed to clear chats from storage:", error);
  }
}

