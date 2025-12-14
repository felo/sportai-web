/**
 * Guest task storage using localStorage
 * Enables technique tasks for non-authenticated users
 */

import type { Task } from "@/components/tasks/TaskTile/types";

const GUEST_TASKS_KEY = "sportai_guest_tasks";

/**
 * Get all guest tasks from localStorage
 */
export function getGuestTasks(): Task[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(GUEST_TASKS_KEY);
    if (!stored) return [];
    
    const tasks = JSON.parse(stored) as Task[];
    // Sort by created_at descending (newest first)
    return tasks.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch {
    return [];
  }
}

/**
 * Get a single guest task by ID
 */
export function getGuestTask(taskId: string): Task | null {
  const tasks = getGuestTasks();
  return tasks.find(t => t.id === taskId) || null;
}

/**
 * Save a new guest task to localStorage
 */
export function saveGuestTask(task: Task): void {
  if (typeof window === "undefined") return;
  
  const tasks = getGuestTasks();
  // Remove existing task with same ID if it exists
  const filtered = tasks.filter(t => t.id !== task.id);
  filtered.push(task);
  
  try {
    localStorage.setItem(GUEST_TASKS_KEY, JSON.stringify(filtered));
    // Dispatch event to notify listeners of guest task changes
    window.dispatchEvent(new CustomEvent("guest-tasks-changed"));
  } catch (e) {
    // localStorage might be full
    console.warn("Failed to save guest task:", e);
  }
}

/**
 * Update an existing guest task
 */
export function updateGuestTask(taskId: string, updates: Partial<Task>): void {
  if (typeof window === "undefined") return;
  
  const tasks = getGuestTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  
  if (index === -1) return;
  
  tasks[index] = { ...tasks[index], ...updates, updated_at: new Date().toISOString() };
  
  try {
    localStorage.setItem(GUEST_TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn("Failed to update guest task:", e);
  }
}

/**
 * Delete a guest task from localStorage
 */
export function deleteGuestTask(taskId: string): void {
  if (typeof window === "undefined") return;
  
  const tasks = getGuestTasks();
  const filtered = tasks.filter(t => t.id !== taskId);
  
  try {
    localStorage.setItem(GUEST_TASKS_KEY, JSON.stringify(filtered));
    // Dispatch event to notify listeners of guest task changes
    window.dispatchEvent(new CustomEvent("guest-tasks-changed"));
  } catch (e) {
    console.warn("Failed to delete guest task:", e);
  }
}

/**
 * Clear all guest tasks (useful after migration to authenticated account)
 */
export function clearGuestTasks(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_TASKS_KEY);
}

/**
 * Check if a task ID is a guest task
 */
export function isGuestTask(taskId: string): boolean {
  return taskId.startsWith("guest-");
}

/**
 * Generate a unique guest task ID
 */
export function generateGuestTaskId(): string {
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new guest technique task
 */
export function createGuestTechniqueTask(params: {
  videoUrl: string;
  sport: "tennis" | "padel" | "pickleball" | "all";
  thumbnailUrl?: string | null;
  videoLength?: number | null;
}): Task {
  const now = new Date().toISOString();
  const task: Task = {
    id: generateGuestTaskId(),
    task_type: "technique",
    sport: params.sport,
    sportai_task_id: null,
    video_url: params.videoUrl,
    video_s3_key: null,
    thumbnail_url: params.thumbnailUrl || null,
    thumbnail_s3_key: null,
    video_length: params.videoLength || null,
    status: "completed", // Technique tasks are immediately completed (client-side)
    estimated_compute_time: null,
    request_params: null,
    result_s3_key: null,
    error_message: null,
    created_at: now,
    updated_at: now,
    completed_at: now,
  };
  
  saveGuestTask(task);
  return task;
}

/**
 * Get count of guest tasks
 */
export function getGuestTaskCount(): number {
  return getGuestTasks().length;
}

/**
 * Migrate guest tasks to a user's account
 * Creates server-side task records and clears local storage
 * @param userId - The authenticated user's ID
 * @returns Object with success status and migration stats
 */
export async function migrateGuestTasks(userId: string): Promise<{
  success: boolean;
  migrated: number;
  error?: string;
}> {
  const guestTasks = getGuestTasks();
  
  if (guestTasks.length === 0) {
    return { success: true, migrated: 0 };
  }
  
  try {
    // Batch insert all guest tasks in one API call
    const response = await fetch("/api/tasks/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userId}`,
      },
      body: JSON.stringify({
        tasks: guestTasks.map(task => ({
          taskType: task.task_type,
          sport: task.sport,
          videoUrl: task.video_url,
          thumbnailUrl: task.thumbnail_url,
          thumbnailS3Key: task.thumbnail_s3_key,
          videoLength: task.video_length,
        })),
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Migration failed: ${response.status}`);
    }
    
    const { count } = await response.json();
    
    // Clear guest tasks from localStorage after successful migration
    clearGuestTasks();
    
    return { success: true, migrated: count };
  } catch (error) {
    return {
      success: false,
      migrated: 0,
      error: error instanceof Error ? error.message : "Migration failed",
    };
  }
}
