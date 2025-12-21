"use client";

import { useState, useEffect } from "react";
import type { Task, TaskProgress } from "../types";
import { formatDuration } from "../utils";

interface UseTaskProgressOptions {
  task: Task;
}

/**
 * Hook to calculate and track task progress with live updates
 * Returns progress percentage, ETA string, and overdue status
 */
export function useTaskProgress({ task }: UseTaskProgressOptions): TaskProgress {
  const [, setTick] = useState(0);

  // Force re-render every second for live progress updates
  useEffect(() => {
    if (task.status !== "processing" && task.status !== "pending") return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [task.status]);

  // Static states
  if (task.status === "completed") {
    return { percent: 100, eta: null, isOverdue: false };
  }
  if (task.status === "failed") {
    return { percent: 0, eta: null, isOverdue: false };
  }
  if (!task.estimated_compute_time) {
    return { percent: 0, eta: null, isOverdue: false };
  }

  // Calculate live progress
  const createdAt = new Date(task.created_at).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - createdAt) / 1000);

  // Server returns negative = remaining time, positive = total time
  let remainingSeconds: number;
  let totalEstimated: number;

  if (task.estimated_compute_time < 0) {
    remainingSeconds = Math.abs(task.estimated_compute_time);
    totalEstimated = elapsedSeconds + remainingSeconds;
  } else {
    totalEstimated = task.estimated_compute_time;
    remainingSeconds = totalEstimated - elapsedSeconds;
  }

  const percent = Math.min(95, Math.max(5, (elapsedSeconds / totalEstimated) * 100));

  if (remainingSeconds < 0) {
    return {
      percent: 95,
      eta: `+${formatDuration(Math.abs(remainingSeconds))}`,
      isOverdue: true,
    };
  }

  return {
    percent,
    eta: `~${formatDuration(remainingSeconds)}`,
    isOverdue: false,
  };
}











