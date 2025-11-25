/**
 * Unified storage interface that routes to localStorage or Supabase based on auth state
 */

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
    console.error("[storage-unified] Error checking auth:", error);
    return {
      authenticated: false,
      userId: undefined,
    };
  }
}

/**
 * Load all chats (from Supabase if authenticated, localStorage otherwise)
 * When authenticated, merges localStorage chats with Supabase chats to include empty chats
 */
export async function loadChats(): Promise<Chat[]> {
  const { authenticated } = await isAuthenticated();
  
  console.log("[storage-unified] loadChats - authenticated:", authenticated);
  
  if (authenticated) {
    try {
      const supabaseChats = await loadChatsFromSupabase();
      const localChats = loadChatsFromLocal();
      
      console.log("[storage-unified] loadChats - raw data:", {
        supabaseChats: supabaseChats.map(c => ({ id: c.id, title: c.title, messages: c.messages.length })),
        localChats: localChats.map(c => ({ id: c.id, title: c.title, messages: c.messages.length })),
      });
      
      // Merge chats: prefer Supabase version for chats that exist in both
      // but include localStorage-only chats (empty chats that haven't been synced)
      const supabaseChatIds = new Set(supabaseChats.map(c => c.id));
      const localOnlyChats = localChats.filter(c => !supabaseChatIds.has(c.id));
      
      console.log("[storage-unified] localOnlyChats:", localOnlyChats.map(c => ({ id: c.id, title: c.title, messages: c.messages.length })));
      
      // Combine and sort by createdAt (descending) for stable chronological order
      const allChats = [...supabaseChats, ...localOnlyChats].sort((a, b) => b.createdAt - a.createdAt);
      
      console.log("[storage-unified] loadChats result:", {
        supabase: supabaseChats.length,
        localOnly: localOnlyChats.length,
        total: allChats.length,
        chats: allChats.map(c => ({ id: c.id, title: c.title, messages: c.messages.length })),
      });
      
      return allChats;
    } catch (error) {
      console.error("Failed to load from Supabase, falling back to localStorage:", error);
      return loadChatsFromLocal();
    }
  }
  
  const localChats = loadChatsFromLocal();
  console.log("[storage-unified] loadChats (not authenticated):", {
    total: localChats.length,
    chats: localChats.map(c => ({ id: c.id, title: c.title, messages: c.messages.length })),
  });
  
  return localChats;
}

/**
 * Load a single chat by ID
 */
export async function loadChat(chatId: string): Promise<Chat | undefined> {
  const { authenticated } = await isAuthenticated();
  
  if (authenticated) {
    try {
      const chat = await loadChatFromSupabase(chatId);
      return chat || undefined;
    } catch (error) {
      console.error("Failed to load from Supabase, falling back to localStorage:", error);
      return getChatByIdLocal(chatId);
    }
  }
  
  return getChatByIdLocal(chatId);
}

/**
 * Save/update a chat
 * Note: Empty chats (no messages) are only saved to localStorage, not Supabase
 */
export async function saveChat(chat: Chat): Promise<boolean> {
  const { authenticated, userId } = await isAuthenticated();
  const hasMessages = chat.messages && chat.messages.length > 0;
  
  console.log("[storage-unified] saveChat:", {
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
      console.log("[storage-unified] Syncing chat to Supabase:", chat.id);
      await saveChatToSupabase(chat, userId);
    } catch (error) {
      console.error("[storage-unified] Failed to save to Supabase:", error);
      // Already saved to localStorage, so return true
    }
  } else {
    console.log("[storage-unified] Not syncing to Supabase (auth:", authenticated, "hasMessages:", hasMessages, ")");
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
  
  console.log("[storage-unified] createNewChat:", {
    authenticated,
    userId: userId?.substring(0, 8) + "...",
    hasMessages: messages.length > 0,
    messageCount: messages.length,
  });
  
  // Create chat using localStorage function (it generates the chat object)
  const chat = createChatLocal(messages, title, settings);
  
  console.log("[storage-unified] Chat created in localStorage:", {
    id: chat.id,
    title: chat.title,
    messages: chat.messages.length,
  });
  
  // Verify it was saved
  const localChats = loadChatsFromLocal();
  const savedChat = localChats.find(c => c.id === chat.id);
  console.log("[storage-unified] Verification - chat in localStorage:", {
    found: !!savedChat,
    totalChats: localChats.length,
    chatIds: localChats.map(c => c.id),
  });
  
  // Only sync to Supabase if authenticated AND chat has messages
  if (authenticated && userId && messages.length > 0) {
    try {
      console.log("[storage-unified] Syncing new chat to Supabase:", chat.id);
      await saveChatToSupabase(chat, userId);
      console.log("[storage-unified] ✅ New chat synced to Supabase successfully:", chat.id);
    } catch (error) {
      console.error("[storage-unified] ❌ Failed to save new chat to Supabase:", error);
      // Chat is already saved to localStorage by createChatLocal
    }
  } else {
    console.log("[storage-unified] Not syncing new chat to Supabase:", {
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
  
  console.log("[storage-unified] updateExistingChat:", {
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
        console.warn("[storage-unified] Could not find chat in localStorage:", chatId);
        return true; // Already updated in localStorage (updateChatLocal above)
      }
      
      const updatedMessages = updates.messages ?? localChat.messages ?? [];
      const hasMessages = updatedMessages.length > 0;
      
      console.log("[storage-unified] Auth check passed:", {
        hasMessages,
        updatedMessagesCount: updatedMessages.length,
        chatFound: !!localChat,
      });
      
      // Only sync to Supabase if chat has messages
      if (!hasMessages) {
        console.log("[storage-unified] Chat has no messages, deleting from Supabase:", chatId);
        // If chat is now empty, delete it from Supabase (if it exists)
        await deleteChatFromSupabase(chatId).catch(() => {
          // Ignore errors - chat might not exist in Supabase
        });
        return true;
      }
      
      // Update in Supabase
      if (updates.messages) {
        console.log("[storage-unified] Updating messages in Supabase for chat:", chatId);
        // If messages are being updated, we need to save the whole chat
        const supabaseChat = await loadChatFromSupabase(chatId);
        
        if (supabaseChat) {
          console.log("[storage-unified] Chat exists in Supabase, updating:", chatId);
          // Chat exists in Supabase, update it
          const updatedChat = { ...supabaseChat, ...updates };
          await saveChatToSupabase(updatedChat, userId);
          console.log("[storage-unified] ✅ Chat updated in Supabase successfully:", chatId);
        } else if (localChat) {
          console.log("[storage-unified] Chat doesn't exist in Supabase, creating:", chatId);
          // Chat doesn't exist in Supabase yet, create it
          const updatedChat = { ...localChat, ...updates };
          await saveChatToSupabase(updatedChat, userId);
          console.log("[storage-unified] ✅ Chat created in Supabase successfully:", chatId);
        }
      } else {
        console.log("[storage-unified] Updating metadata only for chat:", chatId);
        // Just update metadata - but only if chat exists in Supabase
        const supabaseChat = await loadChatFromSupabase(chatId);
        if (supabaseChat) {
          console.log("[storage-unified] Chat exists, updating metadata:", chatId);
          await updateChatInSupabase(chatId, updates);
          console.log("[storage-unified] ✅ Metadata updated in Supabase successfully:", chatId);
        } else if (localChat && localChat.messages.length > 0) {
          console.log("[storage-unified] Chat doesn't exist but has messages, creating:", chatId);
          // Chat doesn't exist in Supabase but has messages, create it
          const updatedChat = { ...localChat, ...updates };
          await saveChatToSupabase(updatedChat, userId);
          console.log("[storage-unified] ✅ Chat created in Supabase successfully:", chatId);
        } else {
          console.log("[storage-unified] Skipping Supabase update - chat doesn't exist or has no messages");
        }
      }
      
      return true;
    } catch (error) {
      console.error("[storage-unified] ❌ Failed to update in Supabase:", error);
      // Already updated localStorage
      return true;
    }
  } else {
    console.log("[storage-unified] Not syncing to Supabase:", {
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
      console.error("Failed to delete from Supabase, deleting from localStorage only:", error);
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

