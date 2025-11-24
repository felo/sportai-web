/**
 * Storage utilities for managing PRO upsell display state
 */

const PRO_UPSELL_SHOWN_KEY = "sportai-pro-upsell-shown";

/**
 * Check if PRO upsell has been shown for a specific chat
 */
export function hasShownProUpsell(chatId: string | undefined): boolean {
  if (typeof window === "undefined" || !chatId) {
    return false;
  }
  
  try {
    const stored = localStorage.getItem(PRO_UPSELL_SHOWN_KEY);
    if (!stored) return false;
    
    const shownChats = JSON.parse(stored) as string[];
    return shownChats.includes(chatId);
  } catch (error) {
    console.error("Failed to check PRO upsell status:", error);
    return false;
  }
}

/**
 * Mark that PRO upsell has been shown for a specific chat
 */
export function markProUpsellShown(chatId: string | undefined): void {
  if (typeof window === "undefined" || !chatId) {
    return;
  }
  
  try {
    const stored = localStorage.getItem(PRO_UPSELL_SHOWN_KEY);
    let shownChats: string[] = stored ? JSON.parse(stored) : [];
    
    if (!shownChats.includes(chatId)) {
      shownChats.push(chatId);
      // Keep only the last 100 chat IDs to prevent localStorage from growing too large
      if (shownChats.length > 100) {
        shownChats = shownChats.slice(-100);
      }
      localStorage.setItem(PRO_UPSELL_SHOWN_KEY, JSON.stringify(shownChats));
    }
  } catch (error) {
    console.error("Failed to mark PRO upsell as shown:", error);
  }
}

