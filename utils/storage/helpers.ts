/**
 * Check if running in SSR (server-side rendering)
 */
export function isSSR(): boolean {
  return typeof window === "undefined";
}

/**
 * Generate a unique chat ID (UUID v4 format for Supabase compatibility)
 */
export function generateUUID(): string {
  // Use crypto.randomUUID() if available (modern browsers), otherwise fallback
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








