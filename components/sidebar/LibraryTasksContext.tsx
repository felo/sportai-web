"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

const SEEN_TASKS_KEY = "sportai-seen-completed-tasks";
const POLL_INTERVAL = 60000; // 1 minute

interface LibraryTasksContextValue {
  processingCount: number;
  newCompletedCount: number;
  markTasksAsSeen: () => void;
  markTaskAsSeen: (taskId: string) => void;
  isTaskNew: (taskId: string) => boolean;
  isLoading: boolean;
  refresh: () => void;
}

const LibraryTasksContext = createContext<LibraryTasksContextValue>({
  processingCount: 0,
  newCompletedCount: 0,
  markTasksAsSeen: () => {},
  markTaskAsSeen: () => {},
  isTaskNew: () => false,
  isLoading: true,
  refresh: () => {},
});

export function useLibraryTasks() {
  return useContext(LibraryTasksContext);
}

// Get seen task IDs from localStorage
function getSeenTaskIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(SEEN_TASKS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// Save seen task IDs to localStorage
function saveSeenTaskIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEEN_TASKS_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignore storage errors
  }
}

// Check if this is the first time using the app (no seen tasks stored)
function isFirstTimeUser(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SEEN_TASKS_KEY) === null;
}

export function LibraryTasksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [processingCount, setProcessingCount] = useState(0);
  const [newCompletedCount, setNewCompletedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const seenTaskIdsRef = useRef<Set<string>>(new Set());
  const isFirstTimeRef = useRef<boolean>(true);

  // Load seen tasks on mount
  useEffect(() => {
    seenTaskIdsRef.current = getSeenTaskIds();
    isFirstTimeRef.current = isFirstTimeUser();
  }, []);

  const fetchTaskStatus = useCallback(async () => {
    if (!user) {
      setProcessingCount(0);
      setNewCompletedCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/tasks", {
        headers: { Authorization: `Bearer ${user.id}` },
      });

      if (!response.ok) throw new Error("Failed to fetch tasks");

      const { tasks } = await response.json();
      
      // Count processing/pending tasks
      const processing = tasks.filter(
        (t: { status: string }) => t.status === "processing" || t.status === "pending"
      ).length;
      
      // Get completed tasks
      const completedTasks = tasks.filter(
        (t: { status: string }) => t.status === "completed"
      );

      // For first-time users, auto-seed all existing completed tasks as "seen"
      // so they don't see a large "New" count on first load
      if (isFirstTimeRef.current && completedTasks.length > 0) {
        completedTasks.forEach((t: { id: string }) => seenTaskIdsRef.current.add(t.id));
        saveSeenTaskIds(seenTaskIdsRef.current);
        isFirstTimeRef.current = false;
      }

      // Count completed tasks that haven't been seen
      const newCompleted = completedTasks.filter(
        (t: { id: string }) => !seenTaskIdsRef.current.has(t.id)
      ).length;

      setProcessingCount(processing);
      setNewCompletedCount(newCompleted);
    } catch {
      // Silent fail for background polling
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch and polling
  useEffect(() => {
    fetchTaskStatus();
    
    const interval = setInterval(fetchTaskStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTaskStatus]);

  // Mark all completed tasks as seen (call when user visits Library)
  const markTasksAsSeen = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/tasks", {
        headers: { Authorization: `Bearer ${user.id}` },
      });

      if (!response.ok) return;

      const { tasks } = await response.json();
      const completedIds = tasks
        .filter((t: { status: string }) => t.status === "completed")
        .map((t: { id: string }) => t.id);

      // Add all completed task IDs to seen set
      completedIds.forEach((id: string) => seenTaskIdsRef.current.add(id));
      saveSeenTaskIds(seenTaskIdsRef.current);
      
      setNewCompletedCount(0);
    } catch {
      // Silent fail
    }
  }, [user]);

  // Mark a single task as seen (call when user clicks on a task)
  const markTaskAsSeen = useCallback((taskId: string) => {
    if (seenTaskIdsRef.current.has(taskId)) return;
    
    seenTaskIdsRef.current.add(taskId);
    saveSeenTaskIds(seenTaskIdsRef.current);
    
    // Update new completed count
    setNewCompletedCount(prev => Math.max(0, prev - 1));
  }, []);

  // Check if a task is new (not seen)
  const isTaskNew = useCallback((taskId: string) => {
    return !seenTaskIdsRef.current.has(taskId);
  }, []);

  return (
    <LibraryTasksContext.Provider
      value={{ processingCount, newCompletedCount, markTasksAsSeen, markTaskAsSeen, isTaskNew, isLoading, refresh: fetchTaskStatus }}
    >
      {children}
    </LibraryTasksContext.Provider>
  );
}

