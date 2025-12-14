/**
 * Shared Time Utilities
 *
 * Provides time formatting functions used across the application.
 */

// ============================================================================
// Time Formatting
// ============================================================================

/**
 * Format seconds into a display string.
 * For times under 1 minute, shows decimal seconds.
 * For times over 1 minute, shows MM:SS format.
 *
 * @param seconds - Time in seconds
 * @returns Formatted string like "2.5s" or "1:30"
 *
 * @example
 * formatTime(2.5)   // "2.5s"
 * formatTime(90)    // "1:30"
 * formatTime(3661)  // "61:01"
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0
    ? `${mins}:${secs.toString().padStart(2, "0")}`
    : `${seconds.toFixed(1)}s`;
}

/**
 * Format seconds into MM:SS format (always includes minutes).
 *
 * @param seconds - Time in seconds
 * @returns Formatted string like "0:05" or "1:30"
 */
export function formatTimeMMSS(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format seconds into HH:MM:SS format for longer durations.
 *
 * @param seconds - Time in seconds
 * @returns Formatted string like "1:30:45"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format a timestamp into a human-readable date string.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a timestamp into a short date string.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string like "Dec 14, 2025"
 */
export function formatDateShort(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ============================================================================
// Frame/Time Conversion
// ============================================================================

/**
 * Convert frame number to time in seconds.
 *
 * @param frame - Frame number
 * @param fps - Frames per second
 * @returns Time in seconds
 */
export function frameToTime(frame: number, fps: number): number {
  return frame / fps;
}

/**
 * Convert time in seconds to frame number.
 *
 * @param time - Time in seconds
 * @param fps - Frames per second
 * @returns Frame number (rounded down)
 */
export function timeToFrame(time: number, fps: number): number {
  return Math.floor(time * fps);
}
