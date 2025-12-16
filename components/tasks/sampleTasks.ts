import { useState, useEffect } from "react";
import type { Task } from "./TaskTile/types";

/**
 * Extended sample task with optional pose data URL for direct loading.
 */
export interface SampleTask extends Task {
  /** Direct URL to pose data JSON for samples stored in public buckets */
  poseDataUrl?: string;
}

/**
 * Sample tasks that are shown to all users in the Library.
 * These are hardcoded demo videos that don't require API calls.
 */
export const SAMPLE_TASKS: SampleTask[] = [
  {
    id: "sample-tennis-serve",
    task_type: "technique",
    sport: "tennis",
    sportai_task_id: null,
    video_url: "https://sportai-llm-uploads-public.s3.eu-north-1.amazonaws.com/samples/technique-analysis-serve-sample.mp4",
    // video_s3_key is null because this is in the PUBLIC bucket (doesn't need presigned URL refresh)
    video_s3_key: null,
    // Static thumbnail from public bucket (CORS prevents dynamic generation)
    thumbnail_url: "https://sportai-llm-uploads-public.s3.eu-north-1.amazonaws.com/samples/technique-analysis-serve-sample-thumbnail.jpg",
    thumbnail_s3_key: null,
    video_length: 3,
    status: "completed",
    estimated_compute_time: null,
    request_params: null,
    result_s3_key: null,
    error_message: null,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    // Direct URL for pose data (public bucket, no presigned URL needed)
    poseDataUrl: "https://sportai-llm-uploads-public.s3.eu-north-1.amazonaws.com/samples/technique-analysis-serve-sample.json",
  },
  {
    id: "sample-padel-match-one",
    task_type: "statistics",
    sport: "padel",
    sportai_task_id: null,
    video_url: "https://sportai-llm-uploads-public.s3.eu-north-1.amazonaws.com/samples/match-report-analysis-sample.mp4",
    video_s3_key: null,
    thumbnail_url: "https://sportai-llm-uploads-public.s3.eu-north-1.amazonaws.com/samples/match-report-analysis-sample-thumbnail.jpg",
    thumbnail_s3_key: null,
    video_length: 600, // 10 minutes
    status: "completed",
    estimated_compute_time: null,
    request_params: null,
    result_s3_key: "task-results/dabba2e0-4a92-492e-9f36-08e6d1b5e06e.json",
    error_message: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Check if a task ID is a sample task
 */
export function isSampleTask(taskId: string): boolean {
  return taskId.startsWith("sample-");
}

/**
 * Get a sample task by ID
 */
export function getSampleTask(taskId: string): SampleTask | undefined {
  return SAMPLE_TASKS.find(t => t.id === taskId);
}

/**
 * Refresh a presigned URL from an S3 key
 */
async function refreshS3Url(key: string): Promise<string | null> {
  try {
    const response = await fetch("/api/s3/download-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        expiresIn: 7 * 24 * 3600, // 7 days
      }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.downloadUrl || null;
    }
  } catch {
    // Silent fail - return null
  }
  return null;
}

/**
 * Hook to get sample tasks with refreshed S3 URLs
 * Automatically refreshes video and thumbnail URLs for samples with S3 keys
 */
export function useRefreshedSampleTasks(): Task[] {
  const [refreshedTasks, setRefreshedTasks] = useState<Task[]>(SAMPLE_TASKS);

  useEffect(() => {
    let cancelled = false;

    async function refreshUrls() {
      // Find tasks that need URL refresh (have S3 keys)
      const tasksNeedingRefresh = SAMPLE_TASKS.filter(
        (t) => t.video_s3_key || t.thumbnail_s3_key
      );

      if (tasksNeedingRefresh.length === 0) return;

      // Refresh URLs in parallel
      const refreshedMap = new Map<string, { video_url?: string; thumbnail_url?: string }>();

      await Promise.all(
        tasksNeedingRefresh.map(async (task) => {
          const updates: { video_url?: string; thumbnail_url?: string } = {};

          // Refresh video URL if S3 key exists
          if (task.video_s3_key) {
            const freshUrl = await refreshS3Url(task.video_s3_key);
            if (freshUrl) updates.video_url = freshUrl;
          }

          // Refresh thumbnail URL if S3 key exists
          if (task.thumbnail_s3_key) {
            const freshUrl = await refreshS3Url(task.thumbnail_s3_key);
            if (freshUrl) updates.thumbnail_url = freshUrl;
          }

          if (Object.keys(updates).length > 0) {
            refreshedMap.set(task.id, updates);
          }
        })
      );

      if (cancelled) return;

      // Apply updates
      if (refreshedMap.size > 0) {
        setRefreshedTasks(
          SAMPLE_TASKS.map((task) => {
            const updates = refreshedMap.get(task.id);
            return updates ? { ...task, ...updates } : task;
          })
        );
      }
    }

    refreshUrls();

    return () => {
      cancelled = true;
    };
  }, []);

  return refreshedTasks;
}

