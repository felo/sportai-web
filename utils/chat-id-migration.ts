/**
 * Migration utility to convert old chat IDs to UUID format
 * 
 * Old format: chat-{timestamp}-{randomString}
 * New format: proper UUID v4 (e.g., 4111a51f-c541-4dfc-9705-4a61ce637a1a)
 */

import type { Chat } from "@/types/chat";

const MIGRATION_KEY = "chat-id-migration-completed";

/**
 * Generate a proper UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Check if a chat ID is in old format (starts with "chat-")
 */
function isOldFormatChatId(id: string): boolean {
  return id.startsWith("chat-");
}

/**
 * Check if migration has already been completed
 */
function isMigrationCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MIGRATION_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Mark migration as completed
 */
function markMigrationCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MIGRATION_KEY, "true");
  } catch (error) {
    console.error("[Migration] Failed to mark migration as completed:", error);
  }
}

/**
 * Migrate chat IDs from old format to UUID format
 * This updates both the chats and the current chat ID in localStorage
 * 
 * @returns Object with migration stats
 */
export function migrateChatIds(): { migrated: number; skipped: number; failed: number } {
  if (typeof window === "undefined") {
    return { migrated: 0, skipped: 0, failed: 0 };
  }

  // Check if migration already completed
  if (isMigrationCompleted()) {
    console.log("[Migration] Chat ID migration already completed, skipping");
    return { migrated: 0, skipped: 0, failed: 0 };
  }

  console.log("[Migration] Starting chat ID migration...");
  const stats = { migrated: 0, skipped: 0, failed: 0 };

  try {
    // Load chats from localStorage
    const chatsKey = "sportai-chats";
    const storedChats = localStorage.getItem(chatsKey);
    
    if (!storedChats) {
      console.log("[Migration] No chats found in localStorage");
      markMigrationCompleted();
      return stats;
    }

    const chats: Chat[] = JSON.parse(storedChats);
    const oldToNewIdMap = new Map<string, string>();
    const migratedChats: Chat[] = [];

    // Migrate each chat
    for (const chat of chats) {
      if (isOldFormatChatId(chat.id)) {
        const newId = generateUUID();
        oldToNewIdMap.set(chat.id, newId);
        
        console.log(`[Migration] Migrating chat: ${chat.id} → ${newId}`);
        
        migratedChats.push({
          ...chat,
          id: newId,
        });
        stats.migrated++;
      } else {
        // Already a valid UUID, keep as is
        migratedChats.push(chat);
        stats.skipped++;
      }
    }

    // Save migrated chats back to localStorage
    if (stats.migrated > 0) {
      localStorage.setItem(chatsKey, JSON.stringify(migratedChats));
      console.log(`[Migration] ✅ Migrated ${stats.migrated} chat(s) to UUID format`);

      // Update current chat ID if it was using old format
      const currentChatIdKey = "sportai-current-chat-id";
      const currentChatId = localStorage.getItem(currentChatIdKey);
      
      if (currentChatId && oldToNewIdMap.has(currentChatId)) {
        const newCurrentChatId = oldToNewIdMap.get(currentChatId)!;
        localStorage.setItem(currentChatIdKey, newCurrentChatId);
        console.log(`[Migration] Updated current chat ID: ${currentChatId} → ${newCurrentChatId}`);
      }
    }

    // Mark migration as completed
    markMigrationCompleted();

    console.log("[Migration] Chat ID migration completed:", stats);
    return stats;
  } catch (error) {
    console.error("[Migration] ❌ Failed to migrate chat IDs:", error);
    stats.failed++;
    return stats;
  }
}

/**
 * Check if any chats need migration (for UI notification)
 */
export function needsChatIdMigration(): boolean {
  if (typeof window === "undefined") return false;
  if (isMigrationCompleted()) return false;

  try {
    const storedChats = localStorage.getItem("sportai-chats");
    if (!storedChats) return false;

    const chats: Chat[] = JSON.parse(storedChats);
    return chats.some(chat => isOldFormatChatId(chat.id));
  } catch {
    return false;
  }
}




