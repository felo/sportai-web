import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Task, StatisticsResult } from "../types";

interface UseTaskFetchingResult {
  task: Task | null;
  result: StatisticsResult | null;
  loading: boolean;
  loadingResult: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  fetchResult: () => Promise<void>;
  setTask: React.Dispatch<React.SetStateAction<Task | null>>;
}

export function useTaskFetching(taskId: string): UseTaskFetchingResult {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [task, setTask] = useState<Task | null>(null);
  const [result, setResult] = useState<StatisticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingResult, setLoadingResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch task details
  useEffect(() => {
    if (!user || authLoading) return;
    
    const fetchTask = async () => {
      try {
        const response = await fetch(`/api/tasks`, {
          headers: { Authorization: `Bearer ${user.id}` },
        });
        
        if (!response.ok) throw new Error("Failed to fetch tasks");
        
        const data = await response.json();
        const foundTask = data.tasks?.find((t: Task) => t.id === taskId);
        
        if (!foundTask) {
          throw new Error("Task not found");
        }
        
        setTask(foundTask);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load task");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTask();
  }, [user, authLoading, taskId]);

  // Fetch result data
  const fetchResult = useCallback(async () => {
    if (!user || !task) return;
    
    setLoadingResult(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/tasks/${task.id}/result`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.id}` },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch result");
      }
      
      const { url } = await response.json();
      
      const resultResponse = await fetch(url);
      if (!resultResponse.ok) throw new Error("Failed to download result");
      
      const resultData = await resultResponse.json();
      setResult(resultData);
      
      setTask(prev =>
        prev ? { ...prev, result_s3_key: `task-results/${task.id}.json` } : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch result");
    } finally {
      setLoadingResult(false);
    }
  }, [user, task]);

  // Auto-load result when task is completed
  useEffect(() => {
    if (task && task.status === "completed" && !result && !loadingResult) {
      fetchResult();
    }
  }, [task, result, loadingResult, fetchResult]);

  return {
    task,
    result,
    loading: authLoading || loading,
    loadingResult,
    error,
    setError,
    fetchResult,
    setTask,
  };
}




