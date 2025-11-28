"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCurrentChatId,
  setCurrentChatId as saveCurrentChatId,
  createNewChat,
  deleteExistingChat,
  updateExistingChat,
  loadChats,
  syncChatsFromSupabase,
} from "@/utils/storage-unified";
import type { Chat } from "@/types/chat";
import type { SidebarChatsState } from "@/components/sidebar/types";

interface UseSidebarChatsOptions {
  onChatSwitchAttempt?: () => Promise<boolean> | boolean;
  onClearChat?: () => void;
  closeSidebar?: () => void;
}

export function useSidebarChats({
  onChatSwitchAttempt,
  onClearChat,
  closeSidebar,
}: UseSidebarChatsOptions = {}): SidebarChatsState {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(undefined);
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);

  // Helper to load chats from the appropriate source
  const refreshChats = useCallback(async () => {
    const loadedChats = await loadChats();
    setChats(loadedChats);
  }, []);

  // Initial load and event listeners
  useEffect(() => {
    // Initial load: Sync from Supabase, then load chats
    // This is the ONLY time we hit the network on mount
    syncChatsFromSupabase().then(() => {
      refreshChats(); // Fast: reads from localStorage
    });
    setCurrentChatId(getCurrentChatId());

    // Listen for chat storage changes (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sportai-chats" || e.key === "sportai-current-chat-id" || !e.key) {
        refreshChats(); // Fast: reads from localStorage only
        setCurrentChatId(getCurrentChatId());
      }
    };

    // Listen for chat storage changes (from same tab - custom event)
    const handleChatStorageChange = () => {
      // Use requestAnimationFrame to ensure React processes the state update
      // This ensures the UI updates even if the event fires synchronously
      requestAnimationFrame(() => {
        refreshChats(); // Fast: reads from localStorage only
        setCurrentChatId(getCurrentChatId());
      });
    };

    // Listen for auth state changes (sign in/out)
    const handleAuthStateChange = () => {
      console.log("[Sidebar] Auth state changed, syncing from Supabase...");
      // Re-sync from Supabase when auth state changes
      syncChatsFromSupabase().then(() => {
        refreshChats(); // Fast: reads from localStorage
      });
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("chat-storage-change", handleChatStorageChange);
    window.addEventListener("auth-state-change", handleAuthStateChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("chat-storage-change", handleChatStorageChange);
      window.removeEventListener("auth-state-change", handleAuthStateChange);
    };
  }, [refreshChats]);

  // Create a new chat
  const handleCreateChat = useCallback(async () => {
    // Check if chat is thinking before creating new chat
    if (onChatSwitchAttempt) {
      const result = await Promise.resolve(onChatSwitchAttempt());
      if (!result) {
        return; // User cancelled
      }
    }
    const newChat = await createNewChat();
    saveCurrentChatId(newChat.id);
    closeSidebar?.();
    // State will be updated via event handler
  }, [onChatSwitchAttempt, closeSidebar]);

  // Switch to a different chat
  const handleSwitchChat = useCallback(
    async (chatId: string) => {
      // Don't switch if already on this chat
      if (currentChatId === chatId) {
        closeSidebar?.();
        return;
      }

      // Check if current chat is thinking before switching
      if (onChatSwitchAttempt) {
        const result = await Promise.resolve(onChatSwitchAttempt());
        if (!result) {
          return; // User cancelled
        }
      }

      // If switching from a chat with no messages, delete it
      if (currentChatId) {
        // Fast: read from localStorage only
        const allChats = await loadChats();
        const currentChat = allChats.find((c) => c.id === currentChatId);
        if (currentChat && currentChat.messages.length === 0) {
          // Check if this is not the last chat
          if (allChats.length > 1) {
            await deleteExistingChat(currentChatId);
            await refreshChats();
          } else {
            // If it's the last chat, just clear it instead
            onClearChat?.();
          }
        } else if (currentChat && currentChat.messages.length > 0) {
          // Only check onChatSwitchAttempt if there are messages
          if (onChatSwitchAttempt) {
            const result = await Promise.resolve(onChatSwitchAttempt());
            if (!result) {
              return; // User cancelled
            }
          }
        }
      }
      saveCurrentChatId(chatId);
      closeSidebar?.();
      // State will be updated via event handler
    },
    [currentChatId, onChatSwitchAttempt, onClearChat, closeSidebar, refreshChats]
  );

  // Delete a chat
  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      // If deleting the current chat while it's thinking, warn the user
      if (currentChatId === chatId && onChatSwitchAttempt) {
        const result = await Promise.resolve(onChatSwitchAttempt());
        if (!result) {
          return; // User cancelled
        }
      }

      // Check if this is the last chat - if so, clear it instead of deleting
      if (chats.length === 1) {
        // Last chat - clear messages instead of deleting
        console.log("[Sidebar] Last chat - clearing messages instead of deleting");
        await updateExistingChat(chatId, { messages: [] }, false);
        // Refresh chat list
        await refreshChats();
        // Also clear the chat in the UI state
        if (currentChatId === chatId) {
          onClearChat?.();
        }
      } else {
        // Not the last chat - delete normally
        await deleteExistingChat(chatId);
        await refreshChats();
        if (currentChatId === chatId) {
          // Switch to the first available chat
          const newCurrentChatId = chats.find((c) => c.id !== chatId)?.id;
          setCurrentChatId(newCurrentChatId);
          saveCurrentChatId(newCurrentChatId);
        }
      }
    },
    [currentChatId, chats, onChatSwitchAttempt, onClearChat, refreshChats]
  );

  // Clear the last chat (used when it's the only chat and user wants to delete)
  const handleClearLastChat = useCallback(
    async (chatId: string) => {
      await updateExistingChat(chatId, { messages: [] }, false);
      await refreshChats();
      if (currentChatId === chatId) {
        onClearChat?.();
      }
    },
    [currentChatId, onClearChat, refreshChats]
  );

  return {
    chats,
    currentChatId,
    hoveredChatId,
    setHoveredChatId,
    handleCreateChat,
    handleDeleteChat,
    handleSwitchChat,
    handleClearLastChat,
    refreshChats,
  };
}




