/**
 * Server-Sent Events (SSE) Utilities
 *
 * Helper functions for creating SSE-formatted streaming responses.
 * Used by the racket recommendation feature in the technique-chat API.
 */

import type { SSEEventType } from "@/types/external-api";

/**
 * Format a single SSE event
 *
 * @param event - The event type (e.g., "recommendation", "text", "done")
 * @param data - The data to send (will be JSON stringified if object)
 * @returns Formatted SSE event string
 *
 * @example
 * formatSSEEvent("recommendation", { name: "Shark-Hunter" })
 * // Returns: "event: recommendation\ndata: {\"name\":\"Shark-Hunter\"}\n\n"
 */
export function formatSSEEvent(event: SSEEventType, data: unknown): string {
  const dataString = typeof data === "string" ? data : JSON.stringify(data);
  return `event: ${event}\ndata: ${dataString}\n\n`;
}

/**
 * Encode an SSE event to Uint8Array for streaming
 *
 * @param event - The event type
 * @param data - The data to send
 * @returns Encoded Uint8Array ready for stream controller
 */
export function encodeSSEEvent(event: SSEEventType, data: unknown): Uint8Array {
  return new TextEncoder().encode(formatSSEEvent(event, data));
}

/**
 * Standard SSE response headers
 */
export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no", // Disable nginx buffering
} as const;

/**
 * Create SSE response headers with additional custom headers
 *
 * @param additionalHeaders - Extra headers to include
 * @returns Combined headers object
 */
export function createSSEHeaders(
  additionalHeaders: Record<string, string> = {}
): Record<string, string> {
  return {
    ...SSE_HEADERS,
    ...additionalHeaders,
  };
}
