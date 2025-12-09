import { storageLogger } from "@/lib/logger";
import type { Chat, Message } from "@/types/chat";
import type { SerializableChat, ThinkingMode, MediaResolution, DomainExpertise } from "../types";
import { CHATS_STORAGE_KEY, CURRENT_CHAT_ID_KEY } from "../constants";
import { isSSR, generateUUID } from "../helpers";
import { serializeChat, deserializeChat } from "./serialization";
import { generateChatTitle } from "./titles";

/**
 * Load all chats from localStorage
 * @returns Array of chats, sorted by updatedAt (most recent first)
 */
export function loadChatsFromStorage(): Chat[] {
  if (isSSR()) {
    return [];
  }

  try {
    const stored = localStorage.getItem(CHATS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as SerializableChat[];
    return parsed.map(deserializeChat).sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    storageLogger.error("Failed to load chats from storage:", error);
    return [];
  }
}

/**
 * Save chats to localStorage
 * @param chats - Array of chats to save
 */
export function saveChatsToStorage(chats: Chat[]): void {
  if (isSSR()) {
    return;
  }

  try {
    const serializable = chats.map(serializeChat);
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    storageLogger.error("Failed to save chats to storage:", error);
    // Handle quota exceeded error gracefully
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      storageLogger.warn("LocalStorage quota exceeded. Attempting to trim chats...");
      try {
        // Keep only the most recent chats (limit to 50)
        const trimmed = chats
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 50)
          .map(serializeChat);
        localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(trimmed));
        storageLogger.info(`Successfully saved ${trimmed.length} chats after trimming due to quota`);
      } catch (retryError) {
        storageLogger.error("Failed to save even after trimming:", retryError);
      }
    }
  }
}

/**
 * Create a new chat and save it to storage
 * @param messages - Initial messages for the chat
 * @param title - Optional custom title for the chat (defaults to generated title from messages)
 * @param settings - Optional settings for the chat (defaults to "all-sports", "fast", "medium")
 * @returns The created chat
 */
export function createChat(
  messages: Message[] = [], 
  title?: string,
  settings?: {
    thinkingMode?: ThinkingMode;
    mediaResolution?: MediaResolution;
    domainExpertise?: DomainExpertise;
  }
): Chat {
  const now = Date.now();
  const chat: Chat = {
    id: generateUUID(),
    title: title || generateChatTitle(messages),
    createdAt: now,
    updatedAt: now,
    messages,
    // Initialize with provided settings or hardcoded defaults (all-sports, fast, medium)
    thinkingMode: settings?.thinkingMode ?? "fast",
    mediaResolution: settings?.mediaResolution ?? "medium",
    domainExpertise: settings?.domainExpertise ?? "all-sports",
  };

  const chats = loadChatsFromStorage();
  chats.unshift(chat); // Add to beginning
  saveChatsToStorage(chats);

  // Dispatch custom event to notify components of chat creation
  if (!isSSR()) {
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
    storageLogger.warn(`Chat with id ${chatId} not found`);
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
  
  storageLogger.debug(`Updating chat ${chatId}:`, {
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
  storageLogger.debug(`Verification - saved title: "${verifyChat?.title}"`);

  // Dispatch custom event to notify components of chat update (unless silent)
  if (!silent && !isSSR()) {
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
  if (!isSSR()) {
    window.dispatchEvent(new Event("chat-storage-change"));
  }
}

/**
 * Update settings for the current chat
 * @param chatId - ID of the chat to update settings for
 * @param settings - Settings to update
 */
export function updateChatSettings(
  chatId: string,
  settings: {
    thinkingMode?: ThinkingMode;
    mediaResolution?: MediaResolution;
    domainExpertise?: DomainExpertise;
  }
): void {
  updateChat(chatId, settings, true); // Silent update to prevent unnecessary re-renders
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
  if (isSSR()) {
    return undefined;
  }

  try {
    const stored = localStorage.getItem(CURRENT_CHAT_ID_KEY);
    return stored || undefined;
  } catch (error) {
    storageLogger.error("Failed to load current chat ID from storage:", error);
    return undefined;
  }
}

/**
 * Set the current active chat ID
 * @param chatId - ID of the chat to set as current
 */
export function setCurrentChatId(chatId: string | undefined): void {
  if (isSSR()) {
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
    storageLogger.error("Failed to save current chat ID to storage:", error);
  }
}

/**
 * Clear all chats from storage
 */
export function clearChatsFromStorage(): void {
  if (isSSR()) {
    return;
  }

  try {
    localStorage.removeItem(CHATS_STORAGE_KEY);
    localStorage.removeItem(CURRENT_CHAT_ID_KEY);
  } catch (error) {
    storageLogger.error("Failed to clear chats from storage:", error);
  }
}


