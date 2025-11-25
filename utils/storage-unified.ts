/**
 * Unified storage interface that routes to localStorage or Supabase based on auth state
 */

import { getUser } from "@/lib/supabase";
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
 */
async function isAuthenticated(): Promise<{ authenticated: boolean; userId?: string }> {
  const user = await getUser();
  return {
    authenticated: !!user,
    userId: user?.id,
  };
}

/**
 * Load all chats (from Supabase if authenticated, localStorage otherwise)
 */
export async function loadChats(): Promise<Chat[]> {
  const { authenticated } = await isAuthenticated();
  
  if (authenticated) {
    try {
      return await loadChatsFromSupabase();
    } catch (error) {
      console.error("Failed to load from Supabase, falling back to localStorage:", error);
      return loadChatsFromLocal();
    }
  }
  
  return loadChatsFromLocal();
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
      await saveChatToSupabase(chat, userId);
    } catch (error) {
      console.error("Failed to save to Supabase:", error);
      // Already saved to localStorage, so return true
    }
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
  
  // Create chat using localStorage function (it generates the chat object)
  const chat = createChatLocal(messages, title, settings);
  
  // Only sync to Supabase if authenticated AND chat has messages
  if (authenticated && userId && messages.length > 0) {
    try {
      await saveChatToSupabase(chat, userId);
    } catch (error) {
      console.error("Failed to save new chat to Supabase:", error);
      // Chat is already saved to localStorage by createChatLocal
    }
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
  
  // Always update localStorage first
  updateChatLocal(chatId, updates, silent);
  
  if (authenticated && userId) {
    try {
      // Get the updated local chat to check if it has messages
      const localChat = getChatByIdLocal(chatId);
      const updatedMessages = updates.messages ?? localChat?.messages ?? [];
      const hasMessages = updatedMessages.length > 0;
      
      // Only sync to Supabase if chat has messages
      if (!hasMessages) {
        // If chat is now empty, delete it from Supabase (if it exists)
        await deleteChatFromSupabase(chatId).catch(() => {
          // Ignore errors - chat might not exist in Supabase
        });
        return true;
      }
      
      // Update in Supabase
      if (updates.messages) {
        // If messages are being updated, we need to save the whole chat
        const supabaseChat = await loadChatFromSupabase(chatId);
        
        if (supabaseChat) {
          // Chat exists in Supabase, update it
          const updatedChat = { ...supabaseChat, ...updates };
          await saveChatToSupabase(updatedChat, userId);
        } else if (localChat) {
          // Chat doesn't exist in Supabase yet, create it
          const updatedChat = { ...localChat, ...updates };
          await saveChatToSupabase(updatedChat, userId);
        }
      } else {
        // Just update metadata - but only if chat exists in Supabase
        const supabaseChat = await loadChatFromSupabase(chatId);
        if (supabaseChat) {
          await updateChatInSupabase(chatId, updates);
        } else if (localChat && localChat.messages.length > 0) {
          // Chat doesn't exist in Supabase but has messages, create it
          const updatedChat = { ...localChat, ...updates };
          await saveChatToSupabase(updatedChat, userId);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Failed to update in Supabase:", error);
      // Already updated localStorage
      return true;
    }
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
 * Export existing chat ID functions (these don't need auth routing)
 */
export { getCurrentChatId, setCurrentChatId };

