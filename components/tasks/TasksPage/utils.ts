import type { Task } from "./types";

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format a date string into a locale-specific string.
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

// ============================================================================
// Duration Formatting
// ============================================================================

/**
 * Format total seconds into a human-readable duration string.
 * Examples: "5s", "3m 45s", "2h 15m"
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  } else if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

// ============================================================================
// Elapsed Time
// ============================================================================

/**
 * Calculate and format the elapsed time for a task.
 */
export function formatElapsed(task: Task): string {
  const startTime = new Date(task.created_at).getTime();

  // For completed/failed tasks, use completed_at or updated_at as fallback
  let endTime: number;
  if (task.status === "completed" || task.status === "failed") {
    endTime = task.completed_at
      ? new Date(task.completed_at).getTime()
      : new Date(task.updated_at).getTime();
  } else {
    endTime = Date.now();
  }

  const elapsedSeconds = Math.floor((endTime - startTime) / 1000);
  return formatDuration(elapsedSeconds);
}

// ============================================================================
// Time Remaining
// ============================================================================

/**
 * Calculate the remaining time for a task.
 * Returns negative values if overdue.
 */
export function getTimeRemaining(task: Task): number | null {
  if (!task.estimated_compute_time) return null;

  const createdAt = new Date(task.created_at).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - createdAt) / 1000);
  const estimatedSeconds = Math.abs(task.estimated_compute_time);

  return estimatedSeconds - elapsedSeconds;
}

/**
 * Check if a task is overdue based on estimated time.
 */
export function isTaskOverdue(task: Task): boolean {
  const remaining = getTimeRemaining(task);
  return remaining !== null && remaining < 0;
}

// ============================================================================
// Clipboard
// ============================================================================

/**
 * Copy text to clipboard.
 */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

// ============================================================================
// Video Download
// ============================================================================

/**
 * Download a video from URL.
 * Falls back to opening in new tab if download fails (e.g., CORS).
 */
export async function downloadVideo(task: Task): Promise<void> {
  try {
    // Extract filename from URL or use task ID
    const urlParts = task.video_url.split("/");
    const filename = urlParts[urlParts.length - 1].split("?")[0] || `video-${task.id}.mp4`;

    // Use fetch to download the video as a blob
    const response = await fetch(task.video_url);
    if (!response.ok) throw new Error("Failed to fetch video");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL
    URL.revokeObjectURL(url);
  } catch {
    // Fallback: open video in new tab if download fails (e.g., CORS issues)
    window.open(task.video_url, "_blank");
  }
}



