/**
 * Unified storage interface - FAST, LOCAL-FIRST
 *
 * Architecture:
 * - localStorage is the PRIMARY CACHE and source of truth for reads (instant, no network)
 * - Supabase is used for persistence and sync across devices (background only)
 * - All reads (loadChats, loadChat) are FAST: they always use localStorage
 * - Writes update localStorage immediately, then sync to Supabase in background
 * - Use syncChatsFromSupabase() only on mount and auth changes to sync from cloud
 */

import { storageLogger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import type { Chat, Message } from "@/types/chat";

// LocalStorage functions
import {
  loadChatsFromStorage as loadChatsFromLocal,
  saveChatsToStorage as saveChatsToLocal,
  createChat as createChatLocal,
  updateChat as updateChatLocal,
  deleteChat as deleteChatLocal,
  getChatById as getChatByIdLocal,
  getCurrentChatId,
  setCurrentChatId,
} from "./storage/index";

// Supabase functions
import {
  loadChatListFromSupabase,
  saveChatToSupabase,
  deleteChatFromSupabase,
} from "./storage-supabase";

/**
 * Check if user is authenticated
 * Uses getSession() which reads from localStorage synchronously
 * This is more reliable immediately after OAuth compared to getUser()
 */
async function isAuthenticated(): Promise<{ authenticated: boolean; userId?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      authenticated: !!session,
      userId: session?.user?.id,
    };
  } catch (error) {
    storageLogger.error("Error checking auth:", error);
    return {
      authenticated: false,
      userId: undefined,
    };
  }
}

/**
 * Load all chats - FAST: Always reads from localStorage first
 * localStorage is the source of truth for immediate reads
 * Supabase is used only for initial sync and background updates
 */
export async function loadChats(): Promise<Chat[]> {
  // FAST PATH: Always read from localStorage (instant, no network)
  const localChats = loadChatsFromLocal();

  storageLogger.debug("loadChats - fast path (localStorage):", {
    total: localChats.length,
    chats: localChats.map(c => ({ id: c.id, title: c.title, messages: c.messages.length })),
  });

  return localChats;
}

/**
 * Sync chat list from Supabase to localStorage (background operation)
 * This is optimized for sidebar - only fetches metadata, not messages (1 query instead of N+1)
 * Call this on mount, auth changes, or explicit refresh
 *
 * Note: This syncs chat metadata only. Messages are loaded on-demand when viewing a chat.
 */
export async function syncChatsFromSupabase(): Promise<Chat[]> {
  const { authenticated } = await isAuthenticated();

  if (!authenticated) {
    storageLogger.debug("syncChatsFromSupabase - not authenticated, skipping");
    return loadChatsFromLocal();
  }

  try {
    storageLogger.debug("syncChatsFromSupabase - fetching chat list from Supabase (metadata only)...");
    // Use optimized function that only fetches chat metadata (1 query)
    const supabaseChats = await loadChatListFromSupabase();
    // Read localStorage AFTER Supabase fetch to capture any chats created during the fetch
    const localChats = loadChatsFromLocal();

    storageLogger.debug("syncChatsFromSupabase - raw data:", {
      supabaseChats: supabaseChats.map(c => ({ id: c.id, title: c.title })),
      localChats: localChats.map(c => ({ id: c.id, title: c.title, messages: c.messages.length })),
    });

    // Merge chats:
    // - For chats that exist in both: keep local messages (Supabase only has metadata)
    // - For Supabase-only chats: add them with empty messages (will load on-demand)
    // - For localStorage-only chats: keep them (empty chats that haven't been synced)
    const supabaseChatIds = new Set(supabaseChats.map(c => c.id));
    const localChatMap = new Map(localChats.map(c => [c.id, c]));

    const mergedChats: Chat[] = [];

    // Process Supabase chats - update metadata but preserve local messages
    for (const supabaseChat of supabaseChats) {
      const localChat = localChatMap.get(supabaseChat.id);
      if (localChat) {
        // Chat exists locally - update metadata, keep local messages
        mergedChats.push({
          ...supabaseChat,
          messages: localChat.messages, // Preserve local messages
        });
      } else {
        // New chat from Supabase - add with empty messages (will load on-demand)
        mergedChats.push(supabaseChat);
      }
    }

    // Add localStorage-only chats (empty chats that haven't been synced)
    const localOnlyChats = localChats.filter(c => !supabaseChatIds.has(c.id));
    mergedChats.push(...localOnlyChats);

    storageLogger.debug("localOnlyChats:", localOnlyChats.map(c => ({ id: c.id, title: c.title, messages: c.messages.length })));

    // Sort by createdAt (descending)
    const allChats = mergedChats.sort((a, b) => b.createdAt - a.createdAt);

    // Update localStorage with merged chats
    saveChatsToLocal(allChats);

    // Dispatch event so components can refresh their data from localStorage
    // This ensures useAIChat reloads if the current chat's messages changed
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("chat-storage-change"));
    }

    storageLogger.info("syncChatsFromSupabase complete:", {
      supabase: supabaseChats.length,
      localOnly: localOnlyChats.length,
      total: allChats.length,
    });

    return allChats;
  } catch (error) {
    storageLogger.error("Failed to sync from Supabase:", error);
    return loadChatsFromLocal();
  }
}

/**
 * Load a single chat by ID - FAST: Always reads from localStorage
 * localStorage is the source of truth for immediate reads
 */
export async function loadChat(chatId: string): Promise<Chat | undefined> {
  // FAST PATH: Always read from localStorage (instant, no network)
  return getChatByIdLocal(chatId);
}

/**
 * Save/update a chat
 * Note: Empty chats (no messages) are only saved to localStorage, not Supabase
 */
export async function saveChat(chat: Chat): Promise<boolean> {
  const { authenticated, userId } = await isAuthenticated();
  const hasMessages = chat.messages && chat.messages.length > 0;

  storageLogger.debug("saveChat:", {
    chatId: chat.id,
    authenticated,
    hasMessages,
    userId: userId?.substring(0, 8) + "...",
  });

  // Always save to localStorage first
  const chats = loadChatsFromLocal();
  const existingIndex = chats.findIndex((c) => c.id === chat.id);
  if (existingIndex >= 0) {
    chats[existingIndex] = chat;
  } else {
    chats.unshift(chat);
  }
  saveChatsToLocal(chats);

  // Only sync to Supabase if authenticated AND chat has messages
  if (authenticated && userId && hasMessages) {
    try {
      storageLogger.debug("Syncing chat to Supabase:", chat.id);
      await saveChatToSupabase(chat, userId);
    } catch (error) {
      storageLogger.error("Failed to save to Supabase:", error);
      // Already saved to localStorage, so return true
    }
  } else {
    storageLogger.debug("Not syncing to Supabase (auth:", authenticated, "hasMessages:", hasMessages, ")");
  }

  return true;
}

/**
 * Create a new chat
 * Note: Empty chats (no messages) are only saved to localStorage, not Supabase
 */
export async function createNewChat(
  messages: Message[] = [],
  title?: string,
  settings?: {
    thinkingMode?: "fast" | "deep";
    mediaResolution?: "low" | "medium" | "high";
    domainExpertise?: "all-sports" | "tennis" | "pickleball" | "padel";
  }
): Promise<Chat> {
  const { authenticated, userId } = await isAuthenticated();

  storageLogger.debug("createNewChat:", {
    authenticated,
    userId: userId?.substring(0, 8) + "...",
    hasMessages: messages.length > 0,
    messageCount: messages.length,
  });

  // Create chat using localStorage function (it generates the chat object)
  const chat = createChatLocal(messages, title, settings);

  storageLogger.debug("Chat created in localStorage:", {
    id: chat.id,
    title: chat.title,
    messages: chat.messages.length,
  });

  // Verify it was saved
  const localChats = loadChatsFromLocal();
  const savedChat = localChats.find(c => c.id === chat.id);
  storageLogger.debug("Verification - chat in localStorage:", {
    found: !!savedChat,
    totalChats: localChats.length,
    chatIds: localChats.map(c => c.id),
  });

  // Only sync to Supabase if authenticated AND chat has messages
  if (authenticated && userId && messages.length > 0) {
    try {
      storageLogger.debug("Syncing new chat to Supabase:", chat.id);
      await saveChatToSupabase(chat, userId);
      storageLogger.info("New chat synced to Supabase successfully:", chat.id);
    } catch (error) {
      storageLogger.error("Failed to save new chat to Supabase:", error);
      // Chat is already saved to localStorage by createChatLocal
    }
  } else {
    storageLogger.debug("Not syncing new chat to Supabase:", {
      authenticated,
      hasUserId: !!userId,
      hasMessages: messages.length > 0,
      reason: !authenticated ? "not authenticated" : !userId ? "no userId" : "no messages",
    });
  }

  return chat;
}

/**
 * Update a chat
 * Note: Empty chats (no messages) are only saved to localStorage, not Supabase
 */
export async function updateExistingChat(
  chatId: string,
  updates: Partial<Chat>,
  silent: boolean = false
): Promise<boolean> {
  const { authenticated, userId } = await isAuthenticated();

  storageLogger.debug("updateExistingChat:", {
    chatId,
    authenticated,
    userId: userId?.substring(0, 8) + "...",
    hasMessagesUpdate: !!updates.messages,
    messageCount: updates.messages?.length,
  });

  // Always update localStorage first
  updateChatLocal(chatId, updates, silent);

  if (authenticated && userId) {
    try {
      // Get the updated local chat to check if it has messages
      const localChat = getChatByIdLocal(chatId);

      // If we can't find the chat, something is wrong - don't delete it!
      if (!localChat) {
        storageLogger.warn("Could not find chat in localStorage:", chatId);
        return true; // Already updated in localStorage (updateChatLocal above)
      }

      const updatedMessages = updates.messages ?? localChat.messages ?? [];
      const hasMessages = updatedMessages.length > 0;

      storageLogger.debug("Auth check passed:", {
        hasMessages,
        updatedMessagesCount: updatedMessages.length,
        chatFound: !!localChat,
      });

      // Only sync to Supabase if chat has messages
      if (!hasMessages) {
        storageLogger.debug("Chat has no messages, deleting from Supabase:", chatId);
        // If chat is now empty, delete it from Supabase (if it exists)
        await deleteChatFromSupabase(chatId).catch(() => {
          // Ignore errors - chat might not exist in Supabase
        });
        return true;
      }

      // Update in Supabase using upsert pattern (no need to check existence first)
      if (updates.messages) {
        storageLogger.debug("Updating messages in Supabase for chat:", chatId);
        // Use local chat as base and apply updates - saveChatToSupabase uses upsert
        const updatedChat = { ...localChat, ...updates };
        await saveChatToSupabase(updatedChat, userId);
        storageLogger.info("Chat upserted in Supabase successfully:", chatId);
      } else {
        storageLogger.debug("Updating metadata only for chat:", chatId);
        // For metadata-only updates, use updateChatInSupabase which handles non-existent chats gracefully
        // If the chat doesn't exist in Supabase but has messages locally, create it
        if (localChat.messages.length > 0) {
          // Use upsert to create/update the chat with its messages
          const updatedChat = { ...localChat, ...updates };
          await saveChatToSupabase(updatedChat, userId);
          storageLogger.info("Chat upserted in Supabase successfully:", chatId);
        } else {
          storageLogger.debug("Skipping Supabase update - chat has no messages");
        }
      }

      return true;
    } catch (error) {
      storageLogger.error("Failed to update in Supabase:", error);
      // Already updated localStorage
      return true;
    }
  } else {
    storageLogger.debug("Not syncing to Supabase:", {
      authenticated,
      reason: !authenticated ? "not authenticated" : "no userId",
    });
  }

  return true;
}

/**
 * Delete a chat
 */
export async function deleteExistingChat(chatId: string): Promise<boolean> {
  const { authenticated } = await isAuthenticated();

  if (authenticated) {
    try {
      await deleteChatFromSupabase(chatId);
      // Also delete from localStorage
      deleteChatLocal(chatId);
      return true;
    } catch (error) {
      storageLogger.error("Failed to delete from Supabase, deleting from localStorage only:", error);
      deleteChatLocal(chatId);
      return true;
    }
  }

  // Not authenticated, use localStorage
  deleteChatLocal(chatId);
  return true;
}

/**
 * Export getChatById as an alias to loadChat for backward compatibility
 */
export const getChatById = loadChat;

/**
 * Export existing chat ID functions (these don't need auth routing)
 */
export { getCurrentChatId, setCurrentChatId };
