import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Task, StatisticsResult } from "../types";
import type { LoadingPhase } from "../components/LoadingState";
import { isSampleTask, getSampleTask } from "@/components/tasks/sampleTasks";
import { isGuestTask, getGuestTask } from "@/utils/storage";

/**
 * Fetch JSON from a URL, automatically decompressing gzip if needed.
 * Uses native DecompressionStream API for browser-based gzip handling.
 */
async function fetchJsonWithGzipSupport(url: string, isGzip: boolean): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to download result");
  }

  if (isGzip && response.body) {
    // Use native DecompressionStream for gzip decompression
    const decompressedStream = response.body.pipeThrough(new DecompressionStream("gzip"));
    const decompressedResponse = new Response(decompressedStream);
    return decompressedResponse.json();
  }
  
  return response.json();
}

interface UseTaskFetchingResult {
  task: Task | null;
  result: StatisticsResult | null;
  loading: boolean;
  loadingResult: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  fetchResult: () => Promise<void>;
  setTask: React.Dispatch<React.SetStateAction<Task | null>>;
  /** Current loading phase for display */
  loadingPhase: LoadingPhase;
}

export function useTaskFetching(taskId: string): UseTaskFetchingResult {
  const { user, session, loading: authLoading } = useAuth();
  
  const [task, setTask] = useState<Task | null>(null);
  const [result, setResult] = useState<StatisticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingResult, setLoadingResult] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("auth");
  const [error, setError] = useState<string | null>(null);

  // Fetch result data (can be called manually for retry)
  const fetchResult = useCallback(async () => {
    if (!user || !session?.access_token) return;
    
    setLoadingResult(true);
    setLoadingPhase("result");
    setError(null);
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/result`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (!response.ok) {
        if (response.status === 202) {
          // Still processing - not an error
          return;
        }
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch result");
      }
      
      const { url } = await response.json();
      
      const resultResponse = await fetch(url);
      if (!resultResponse.ok) throw new Error("Failed to download result");
      
      const resultData = await resultResponse.json();
      setResult(resultData);
      setLoadingPhase("done");
      
      setTask(prev =>
        prev ? { ...prev, result_s3_key: `task-results/${taskId}.json` } : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch result");
    } finally {
      setLoadingResult(false);
    }
  }, [user, session?.access_token, taskId]);

  // Main loading effect - fetch task and result in parallel
  useEffect(() => {
    if (authLoading) {
      setLoadingPhase("auth");
      return;
    }
    
    // Sample and guest tasks don't require authentication
    const isSample = isSampleTask(taskId);
    const isGuest = isGuestTask(taskId);
    
    if ((!user || !session?.access_token) && !isSample && !isGuest) {
      setLoading(false);
      return;
    }
    
    const loadTaskAndResult = async () => {
      setLoadingPhase("task");
      const startTime = Date.now();
      const MIN_LOADING_TIME = 2000; // Minimum time to show loading state (ms) - set to 2s for visibility
      
      // Helper to ensure minimum loading time
      const ensureMinLoadingTime = async () => {
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_LOADING_TIME) {
          await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
        }
      };
      
      try {
        // Handle sample tasks differently - load from static data + S3
        if (isSample) {
          const sampleTask = getSampleTask(taskId);
          if (!sampleTask) {
            await ensureMinLoadingTime();
            throw new Error("Sample task not found");
          }
          
          // Refresh video URL if S3 key exists
          let refreshedVideoUrl = sampleTask.video_url;
          if (sampleTask.video_s3_key) {
            try {
              const urlResponse = await fetch("/api/s3/download-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  key: sampleTask.video_s3_key,
                  expiresIn: 7 * 24 * 3600,
                }),
              });
              if (urlResponse.ok) {
                const { downloadUrl } = await urlResponse.json();
                if (downloadUrl) refreshedVideoUrl = downloadUrl;
              }
            } catch {
              // Use original URL on error
            }
          }
          
          // Set task with refreshed video URL
          setTask({
            ...sampleTask,
            video_url: refreshedVideoUrl,
          } as Task);
          
          // Fetch result - prefer direct URL (public bucket) over S3 key (private bucket)
          if (sampleTask.resultDataUrl) {
            // Direct URL for public bucket - no presigned URL needed
            setLoadingPhase("result");
            try {
              const isGzip = sampleTask.resultDataUrl.endsWith(".gz");
              const statisticsResult = await fetchJsonWithGzipSupport(sampleTask.resultDataUrl, isGzip);
              setResult(statisticsResult as StatisticsResult);
            } catch {
              // Result fetch failed - continue without result
            }
          } else if (sampleTask.result_s3_key) {
            // Private bucket - need presigned URL
            setLoadingPhase("result");
            try {
              const resultUrlResponse = await fetch("/api/s3/download-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  key: sampleTask.result_s3_key,
                  expiresIn: 3600, // 1 hour for result
                }),
              });
              
              if (resultUrlResponse.ok) {
                const { downloadUrl } = await resultUrlResponse.json();
                if (downloadUrl) {
                  // Check if the file is gzipped based on the key
                  const isGzip = sampleTask.result_s3_key.endsWith(".gz");
                  const statisticsResult = await fetchJsonWithGzipSupport(downloadUrl, isGzip);
                  setResult(statisticsResult as StatisticsResult);
                }
              }
            } catch {
              // Result fetch failed - continue without result
            }
          }
          
          setLoadingPhase("done");
          await ensureMinLoadingTime();
          return;
        }
        
        // Handle guest tasks - load from localStorage
        if (isGuest) {
          const guestTask = getGuestTask(taskId);
          if (!guestTask) {
            await ensureMinLoadingTime();
            throw new Error("Guest task not found");
          }
          
          // Guest tasks are technique tasks - no result to fetch
          setTask(guestTask as Task);
          setLoadingPhase("done");
          await ensureMinLoadingTime();
          return;
        }
        
        // Regular tasks - fetch from API
        // Fetch task details using the status endpoint (single task, not all)
        // AND start fetching result in parallel
        const [taskResponse, resultResponse] = await Promise.all([
          fetch(`/api/tasks/${taskId}/status`, {
            headers: { Authorization: `Bearer ${session!.access_token}` },
          }),
          fetch(`/api/tasks/${taskId}/result`, {
            method: "POST",
            headers: { Authorization: `Bearer ${session!.access_token}` },
          }),
        ]);
        
        // Handle task response
        if (!taskResponse.ok) {
          await ensureMinLoadingTime();
          throw new Error("Task not found");
        }
        
        const taskData = await taskResponse.json();
        if (!taskData.task) {
          await ensureMinLoadingTime();
          throw new Error("Task not found");
        }
        setTask(taskData.task);
        
        // Handle result response
        if (resultResponse.ok) {
          setLoadingPhase("result");
          const resultJson = await resultResponse.json();
          
          if (resultJson.url) {
            // Fetch the actual JSON from the presigned URL
            const jsonResponse = await fetch(resultJson.url);
            if (jsonResponse.ok) {
              const statisticsResult = await jsonResponse.json();
              setResult(statisticsResult);
            }
          }
        }
        // If 202, task is still processing - user will see task details but no result
        
        setLoadingPhase("done");
        await ensureMinLoadingTime();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load task");
      } finally {
        setLoading(false);
      }
    };
    
    loadTaskAndResult();
  }, [user, session?.access_token, authLoading, taskId]);

  return {
    task,
    result,
    loading: authLoading || loading,
    loadingResult,
    error,
    setError,
    fetchResult,
    setTask,
    loadingPhase,
  };
}
