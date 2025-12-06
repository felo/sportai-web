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
} from "./storage";

// Supabase functions
import {
  loadChatsFromSupabase,
  saveChatToSupabase,
  deleteChatFromSupabase,
  updateChatInSupabase,
  loadChatFromSupabase,
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
 * Sync chats from Supabase to localStorage (background operation)
 * Call this on mount, auth changes, or explicit refresh
 */
export async function syncChatsFromSupabase(): Promise<Chat[]> {
  const { authenticated } = await isAuthenticated();
  
  if (!authenticated) {
    storageLogger.debug("syncChatsFromSupabase - not authenticated, skipping");
    return loadChatsFromLocal();
  }
  
  try {
    storageLogger.debug("syncChatsFromSupabase - fetching from Supabase...");
    const supabaseChats = await loadChatsFromSupabase();
    const localChats = loadChatsFromLocal();
    
    storageLogger.debug("syncChatsFromSupabase - raw data:", {
      supabaseChats: supabaseChats.map(c => ({ id: c.id, title: c.title, messages: c.messages.length })),
      localChats: localChats.map(c => ({ id: c.id, title: c.title, messages: c.messages.length })),
    });
    
    // Merge chats: prefer Supabase version for chats that exist in both
    // but include localStorage-only chats (empty chats that haven't been synced)
    const supabaseChatIds = new Set(supabaseChats.map(c => c.id));
    const localOnlyChats = localChats.filter(c => !supabaseChatIds.has(c.id));
    
    storageLogger.debug("localOnlyChats:", localOnlyChats.map(c => ({ id: c.id, title: c.title, messages: c.messages.length })));
    
    // Combine and sort by createdAt (descending)
    const allChats = [...supabaseChats, ...localOnlyChats].sort((a, b) => b.createdAt - a.createdAt);
    
    // Update localStorage with merged chats
    saveChatsToLocal(allChats);
    
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
      
      // Update in Supabase
      if (updates.messages) {
        storageLogger.debug("Updating messages in Supabase for chat:", chatId);
        // If messages are being updated, we need to save the whole chat
        const supabaseChat = await loadChatFromSupabase(chatId);
        
        if (supabaseChat) {
          storageLogger.debug("Chat exists in Supabase, updating:", chatId);
          // Chat exists in Supabase, update it
          const updatedChat = { ...supabaseChat, ...updates };
          await saveChatToSupabase(updatedChat, userId);
          storageLogger.info("Chat updated in Supabase successfully:", chatId);
        } else if (localChat) {
          storageLogger.debug("Chat doesn't exist in Supabase, creating:", chatId);
          // Chat doesn't exist in Supabase yet, create it
          const updatedChat = { ...localChat, ...updates };
          await saveChatToSupabase(updatedChat, userId);
          storageLogger.info("Chat created in Supabase successfully:", chatId);
        }
      } else {
        storageLogger.debug("Updating metadata only for chat:", chatId);
        // Just update metadata - but only if chat exists in Supabase
        const supabaseChat = await loadChatFromSupabase(chatId);
        if (supabaseChat) {
          storageLogger.debug("Chat exists, updating metadata:", chatId);
          await updateChatInSupabase(chatId, updates);
          storageLogger.info("Metadata updated in Supabase successfully:", chatId);
        } else if (localChat && localChat.messages.length > 0) {
          storageLogger.debug("Chat doesn't exist but has messages, creating:", chatId);
          // Chat doesn't exist in Supabase but has messages, create it
          const updatedChat = { ...localChat, ...updates };
          await saveChatToSupabase(updatedChat, userId);
          storageLogger.info("Chat created in Supabase successfully:", chatId);
        } else {
          storageLogger.debug("Skipping Supabase update - chat doesn't exist or has no messages");
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

