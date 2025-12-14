/**
 * Message utility functions for AI Chat
 */

/**
 * Generate a UUID v4 for message IDs (Supabase compatible)
 */
export function generateMessageId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Strip stream metadata from response text
 * The API sends metadata at the end of streams prefixed with __STREAM_META__
 */
export function stripStreamMetadata(text: string): string {
  const metaIndex = text.indexOf("__STREAM_META__");
  if (metaIndex !== -1) {
    return text.slice(0, metaIndex);
  }
  return text;
}





