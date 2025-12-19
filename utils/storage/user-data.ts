import { storageLogger } from "@/lib/logger";
import { STORAGE_KEY, CHATS_STORAGE_KEY, CURRENT_CHAT_ID_KEY } from "./constants";
import { isSSR } from "./helpers";

/**
 * Clear all user data from storage (on sign out)
 * This removes chats, messages, and migration status but keeps user preferences
 */
export function clearUserDataFromStorage(): void {
  if (isSSR()) {
    return;
  }

  try {
    // Clear chat data
    localStorage.removeItem(STORAGE_KEY); // sportai-chat-messages
    localStorage.removeItem(CHATS_STORAGE_KEY); // sportai-chats
    localStorage.removeItem(CURRENT_CHAT_ID_KEY); // sportai-current-chat-id
    
    // Clear migration status
    localStorage.removeItem("sportai-migration-completed");
    localStorage.removeItem("sportai-migration-prompt-dismissed");
    
    storageLogger.info("Cleared all user data on sign out");
    
    // Dispatch event to notify components
    window.dispatchEvent(new Event("chat-storage-change"));
  } catch (error) {
    storageLogger.error("Failed to clear user data from storage:", error);
  }
}










