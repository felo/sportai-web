import { loadChatsFromStorage } from "./storage";
import { saveChatsToSupabase, loadChatsFromSupabase } from "./storage-supabase";
import type { Chat } from "@/types/chat";

export interface MigrationStatus {
  status: "idle" | "migrating" | "success" | "error" | "cancelled";
  progress: number; // 0-100
  totalChats: number;
  migratedChats: number;
  error?: string;
}

/**
 * Check if user has local chats that need migration
 * Only considers chats that have at least one message (not empty chats)
 */
export function hasLocalChatsToMigrate(): boolean {
  const chats = loadChatsFromStorage();
  // Filter to only chats with actual messages
  const chatsWithMessages = chats.filter((chat) => chat.messages.length > 0);
  return chatsWithMessages.length > 0;
}

/**
 * Sync local chats to Supabase
 * Returns the status of the migration
 */
export async function syncLocalToSupabase(
  userId: string,
  onProgress?: (status: MigrationStatus) => void
): Promise<MigrationStatus> {
  const status: MigrationStatus = {
    status: "idle",
    progress: 0,
    totalChats: 0,
    migratedChats: 0,
  };

  try {
    // Load local chats and filter out empty ones
    const localChats = loadChatsFromStorage().filter((chat) => chat.messages.length > 0);
    
    if (localChats.length === 0) {
      status.status = "success";
      status.progress = 100;
      onProgress?.(status);
      return status;
    }

    status.totalChats = localChats.length;
    status.status = "migrating";
    onProgress?.(status);

    // Check existing chats in Supabase to avoid duplicates
    const existingChats = await loadChatsFromSupabase();
    const existingChatIds = new Set(existingChats.map((c) => c.id));

    // Filter out chats that already exist in Supabase
    const chatsToMigrate = localChats.filter((chat) => !existingChatIds.has(chat.id));

    if (chatsToMigrate.length === 0) {
      status.status = "success";
      status.progress = 100;
      status.migratedChats = localChats.length;
      onProgress?.(status);
      return status;
    }

    // Migrate chats one by one with progress updates
    let migratedCount = 0;
    for (const chat of chatsToMigrate) {
      try {
        const success = await saveChatsToSupabase([chat], userId);
        if (success) {
          migratedCount++;
          status.migratedChats = migratedCount;
          status.progress = Math.round((migratedCount / chatsToMigrate.length) * 100);
          onProgress?.(status);
        }
      } catch (error) {
        console.error(`Failed to migrate chat ${chat.id}:`, error);
        // Continue with other chats
      }
    }

    status.status = "success";
    status.progress = 100;
    onProgress?.(status);
    return status;
  } catch (error) {
    console.error("Migration failed:", error);
    status.status = "error";
    status.error = error instanceof Error ? error.message : "Unknown error occurred";
    onProgress?.(status);
    return status;
  }
}

/**
 * Merge Supabase chats with local chats
 * Useful for keeping local chats as backup
 */
export async function mergeChats(userId: string): Promise<Chat[]> {
  try {
    const localChats = loadChatsFromStorage();
    const supabaseChats = await loadChatsFromSupabase();

    // Create a map of all chats by ID (Supabase takes priority)
    const chatMap = new Map<string, Chat>();

    // Add local chats first
    for (const chat of localChats) {
      chatMap.set(chat.id, chat);
    }

    // Override with Supabase chats (they have priority)
    for (const chat of supabaseChats) {
      chatMap.set(chat.id, chat);
    }

    // Return sorted by updatedAt
    return Array.from(chatMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error("Failed to merge chats:", error);
    // Fallback to local chats
    return loadChatsFromStorage();
  }
}

/**
 * Clear migration flag from localStorage
 * Used to track if migration has been completed
 */
const MIGRATION_COMPLETED_KEY = "sportai-migration-completed";

export function isMigrationCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MIGRATION_COMPLETED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setMigrationCompleted(completed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (completed) {
      localStorage.setItem(MIGRATION_COMPLETED_KEY, "true");
    } else {
      localStorage.removeItem(MIGRATION_COMPLETED_KEY);
    }
  } catch (error) {
    console.error("Failed to set migration completed flag:", error);
  }
}

/**
 * Get migration prompt preference
 * Used to track if user dismissed the migration prompt
 */
const MIGRATION_PROMPT_DISMISSED_KEY = "sportai-migration-prompt-dismissed";

export function isMigrationPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MIGRATION_PROMPT_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setMigrationPromptDismissed(dismissed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (dismissed) {
      localStorage.setItem(MIGRATION_PROMPT_DISMISSED_KEY, "true");
    } else {
      localStorage.removeItem(MIGRATION_PROMPT_DISMISSED_KEY);
    }
  } catch (error) {
    console.error("Failed to set migration prompt dismissed flag:", error);
  }
}

