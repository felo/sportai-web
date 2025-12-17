"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import type { Task } from "../types";
import { TASK_POLL_INTERVAL_MS } from "../constants";
import {
  extractFirstFrameFromUrl,
  extractFirstFrameWithDuration,
  uploadThumbnailToS3,
} from "@/utils/video-utils";
import { extractS3KeyFromUrl } from "@/lib/s3";
import { deleteGuestTask, isGuestTask } from "@/utils/storage";
import { isSampleTask } from "../../sampleTasks";
import { loadPoseData } from "@/lib/poseDataService";
import { supabase } from "@/lib/supabase";

interface UseTaskManagementOptions {
  /** User ID - for logging/display purposes only */
  userId: string | null;
  /** JWT access token for authenticated API calls */
  accessToken: string | null;
  markTaskAsSeen: (taskId: string) => void;
}

interface UseTaskManagementReturn {
  // State
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;

  // Action states
  submitting: boolean;
  fetchingResult: string | null;
  deletingTask: string | null;
  preparingTask: string | null;

  // Actions
  fetchTasks: () => Promise<void>;
  submitTask: (videoUrl: string, taskType: string, sport: string) => Promise<void>;
  deleteTask: (taskId: string, guestTasks: Task[], setGuestTasks: React.Dispatch<React.SetStateAction<Task[]>>) => Promise<void>;
  fetchResult: (taskId: string) => Promise<void>;
  downloadResult: (taskId: string) => Promise<void>;
  downloadPoseData: (task: Task) => Promise<void>;
  handleTaskClick: (taskId: string) => Promise<void>;
}

/**
 * Hook for managing task CRUD operations and status polling.
 */
export function useTaskManagement({
  userId,
  accessToken,
  markTaskAsSeen,
}: UseTaskManagementOptions): UseTaskManagementReturn {
  const router = useRouter();

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [submitting, setSubmitting] = useState(false);
  const [fetchingResult, setFetchingResult] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<string | null>(null);
  const [preparingTask, setPreparingTask] = useState<string | null>(null);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/tasks", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Handle 401 - try to refresh session
      if (response.status === 401) {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          // Token refresh failed - don't set error, just stop loading
          setLoading(false);
          return;
        }
        // Let the auth state change trigger a re-fetch with new token
        setLoading(false);
        return;
      }

      if (!response.ok) throw new Error("Failed to fetch tasks");

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Submit new task
  const submitTask = useCallback(
    async (videoUrl: string, taskType: string, sport: string) => {
      if (!accessToken || !videoUrl.trim()) return;

      setSubmitting(true);
      setError(null);

      try {
        const trimmedUrl = videoUrl.trim();

        // Try to extract thumbnail and duration
        let thumbnailUrl: string | null = null;
        let thumbnailS3Key: string | null = null;
        let videoLength: number | null = null;

        try {
          logger.debug("[TasksPage] Extracting thumbnail from video URL...");
          const { frameBlob, durationSeconds } = await extractFirstFrameFromUrl(trimmedUrl, 640, 0.7);
          videoLength = durationSeconds;

          if (frameBlob) {
            const uploadResult = await uploadThumbnailToS3(frameBlob);
            if (uploadResult) {
              thumbnailUrl = uploadResult.thumbnailUrl;
              thumbnailS3Key = uploadResult.thumbnailS3Key;
            }
          }
        } catch (thumbErr) {
          logger.warn("[TasksPage] Thumbnail extraction failed:", thumbErr);
        }

        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            taskType,
            sport,
            videoUrl: trimmedUrl,
            thumbnailUrl,
            thumbnailS3Key,
            videoLength,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create task");
        }

        const { task } = await response.json();
        setTasks((prev) => [task, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create task");
      } finally {
        setSubmitting(false);
      }
    },
    [accessToken]
  );

  // Delete task
  const deleteTask = useCallback(
    async (
      taskId: string,
      guestTasks: Task[],
      setGuestTasks: React.Dispatch<React.SetStateAction<Task[]>>
    ) => {
      setDeletingTask(taskId);
      setError(null);

      try {
        // Handle guest tasks
        if (isGuestTask(taskId)) {
          deleteGuestTask(taskId);
          setGuestTasks((prev) => prev.filter((t) => t.id !== taskId));
          return;
        }

        if (!accessToken) return;

        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to delete task");
        }

        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete task");
      } finally {
        setDeletingTask(null);
      }
    },
    [accessToken]
  );

  // Fetch result
  const fetchResult = useCallback(
    async (taskId: string) => {
      if (!accessToken) return;

      setFetchingResult(taskId);
      setError(null);

      try {
        const response = await fetch(`/api/tasks/${taskId}/result?force=true`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.status === 202) {
          throw new Error("Task is still being processed on SportAI servers");
        }

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch result");
        }

        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, result_s3_key: `task-results/${taskId}.json` } : t
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch result");
      } finally {
        setFetchingResult(null);
      }
    },
    [accessToken]
  );

  // Download result
  const downloadResult = useCallback(
    async (taskId: string) => {
      if (!accessToken) return;

      try {
        const response = await fetch(`/api/tasks/${taskId}/download`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to get download URL");
        }

        const { url, filename } = await response.json();

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to download result");
      }
    },
    [accessToken]
  );

  // Download pose data (for technique videos)
  const downloadPoseData = useCallback(
    async (task: Task) => {
      try {
        // Extract S3 key from video URL
        const videoS3Key = task.video_s3_key || extractS3KeyFromUrl(task.video_url);
        
        if (!videoS3Key) {
          throw new Error("No video S3 key available for this task");
        }

        // Load pose data from S3
        const result = await loadPoseData(videoS3Key);
        
        if (!result.success || !result.data) {
          throw new Error(result.error || "No pose data found for this video");
        }

        // Create a clean export object with pose data and annotations
        // Include keypointOrder for optimized format compatibility
        const exportData = {
          version: result.data.version,
          exportedAt: new Date().toISOString(),
          videoFPS: result.data.videoFPS,
          totalFrames: result.data.totalFrames,
          modelUsed: result.data.modelUsed,
          keypointOrder: result.data.keypointOrder, // For optimized format
          poses: result.data.poses,
          metadata: result.data.metadata,
          annotations: {
            customEvents: result.data.customEvents || [],
            videoComments: result.data.videoComments || [],
            protocolAdjustments: result.data.protocolAdjustments || [],
            swingBoundaryAdjustments: result.data.swingBoundaryAdjustments || [],
          },
          thumbnails: result.data.thumbnails,
          userPreferences: result.data.userPreferences,
        };

        // Create blob and download - use minified JSON for smaller file size
        const blob = new Blob([JSON.stringify(exportData)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = `technique-analysis-${task.id}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to export pose data");
      }
    },
    []
  );

  // Handle task click
  const handleTaskClick = useCallback(
    async (taskId: string) => {
      // Sample tasks - navigate directly
      if (isSampleTask(taskId)) {
        router.push(`/library/${taskId}`);
        return;
      }

      // Guest tasks - navigate directly
      if (isGuestTask(taskId)) {
        router.push(`/library/${taskId}`);
        return;
      }

      if (!accessToken) return;

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      setPreparingTask(taskId);
      setError(null);
      markTaskAsSeen(taskId);

      // If we already have the result, navigate directly
      if (task.result_s3_key) {
        router.push(`/library/${taskId}`);
        return;
      }

      // Technique tasks don't have SportAI results - navigate directly
      if (task.task_type === "technique") {
        router.push(`/library/${taskId}`);
        return;
      }

      // Need to fetch the result first
      try {
        const response = await fetch(`/api/tasks/${taskId}/result`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.status === 202) {
          throw new Error("Task is still being processed on SportAI servers");
        }

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch result");
        }

        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, result_s3_key: `task-results/${taskId}.json` } : t
          )
        );

        router.push(`/library/${taskId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to prepare video");
        setPreparingTask(null);
      }
    },
    [accessToken, tasks, router, markTaskAsSeen]
  );

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Status polling
  useEffect(() => {
    const activeTasks = tasks.filter((t) => t.status === "processing" || t.status === "pending");
    if (activeTasks.length === 0 || !accessToken) return;

    const checkStatus = async () => {
      for (const task of activeTasks) {
        try {
          const response = await fetch(`/api/tasks/${task.id}/status`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          // Handle 401 - try to refresh session, then skip this poll cycle
          if (response.status === 401) {
            await supabase.auth.refreshSession();
            return; // Exit early, let next poll use refreshed token
          }

          if (response.ok) {
            const { task: updatedTask } = await response.json();
            if (updatedTask && updatedTask.status !== task.status) {
              setTasks((prev) =>
                prev.map((t) => (t.id === task.id ? updatedTask : t))
              );
            }
          }
        } catch {
          // Silent fail for status polling
        }
      }
    };

    const interval = setInterval(checkStatus, TASK_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [tasks, accessToken]);

  return {
    tasks,
    setTasks,
    loading,
    error,
    setError,
    submitting,
    fetchingResult,
    deletingTask,
    preparingTask,
    fetchTasks,
    submitTask,
    deleteTask,
    fetchResult,
    downloadResult,
    downloadPoseData,
    handleTaskClick,
  };
}

