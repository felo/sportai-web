"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import {
  Box,
  Flex,
  Text,
  Button,
  TextField,
  Table,
  Badge,
  Spinner,
  Card,
  Select,
  SegmentedControl,
} from "@radix-ui/themes";
import { PlusIcon, CopyIcon, CheckIcon, DownloadIcon, EyeOpenIcon, UpdateIcon, ViewGridIcon, ListBulletIcon, ChevronUpIcon, ChevronDownIcon, UploadIcon, Cross2Icon } from "@radix-ui/react-icons";
import { useAuth } from "@/components/auth/AuthProvider";
import { Sidebar, useLibraryTasks } from "@/components/sidebar";
import { useSidebar } from "@/components/SidebarContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PageHeader } from "@/components/ui";
import { createNewChat, setCurrentChatId } from "@/utils/storage-unified";
import { getDeveloperMode } from "@/utils/storage";
import { TaskGridView } from "./TaskGridView";
import { extractFirstFrameFromUrl, extractFirstFrameWithDuration, uploadThumbnailToS3, validateVideoFile } from "@/utils/video-utils";
import { uploadToS3 } from "@/lib/s3";

const TASK_TYPES = [
  { value: "statistics", label: "Statistics" },
  { value: "technique", label: "Technique" },
  // Add more task types as needed
  // { value: "activity_detection", label: "Activity Detection" },
];

const SPORTS = [
  { value: "all", label: "Other" },
  { value: "padel", label: "Padel" },
  { value: "tennis", label: "Tennis" },
  { value: "pickleball", label: "Pickleball" },
];

interface Task {
  id: string;
  task_type: string;
  sport: "tennis" | "padel" | "pickleball" | "all";
  sportai_task_id: string | null;
  video_url: string;
  video_s3_key: string | null;
  thumbnail_url: string | null;
  thumbnail_s3_key: string | null;
  video_length: number | null;
  status: "pending" | "processing" | "completed" | "failed";
  estimated_compute_time: number | null;
  request_params: Record<string, unknown> | null;
  result_s3_key: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export function TasksPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isCollapsed, isInitialLoad } = useSidebar();
  const isMobile = useIsMobile();
  const { markTaskAsSeen, isTaskNew } = useLibraryTasks();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [taskType, setTaskType] = useState("technique");
  const [sport, setSport] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [developerMode, setDeveloperMode] = useState(false);
  
  // Filter state
  const [filterSport, setFilterSport] = useState<string>("show_all");
  const [filterTaskType, setFilterTaskType] = useState<string>("all");
  
  // Sort state
  type SortColumn = "sport" | "type" | "status" | "created" | "timeLeft" | "analysis" | "taskId" | "videoUrl" | "length" | "elapsed";
  type SortDirection = "asc" | "desc";
  const [sortColumn, setSortColumn] = useState<SortColumn>("created");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  // Handle column header click for sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };
  
  // Available task types based on sport selection
  // "All Sports" only supports technique tasks (client-side processing)
  const availableTaskTypes = useMemo(() => {
    if (sport === "all") {
      return TASK_TYPES.filter(t => t.value === "technique");
    }
    return TASK_TYPES;
  }, [sport]);
  
  // Auto-switch to technique when sport changes to "all"
  useEffect(() => {
    if (sport === "all" && taskType !== "technique") {
      setTaskType("technique");
    }
  }, [sport, taskType]);
  
  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    // First filter
    let result = tasks.filter(task => {
      if (filterSport !== "show_all" && task.sport !== filterSport) return false;
      if (filterTaskType !== "all" && task.task_type !== filterTaskType) return false;
      return true;
    });
    
    // Then sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case "sport":
          comparison = a.sport.localeCompare(b.sport);
          break;
        case "type":
          comparison = a.task_type.localeCompare(b.task_type);
          break;
        case "status":
          const statusOrder = { pending: 0, processing: 1, completed: 2, failed: 3 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case "created":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "timeLeft":
          // Sort by estimated remaining time
          const getTimeRemaining = (task: Task) => {
            if (task.status === "completed") return Infinity;
            if (task.status === "failed") return Infinity + 1;
            if (!task.estimated_compute_time) return Infinity - 1;
            const elapsed = (Date.now() - new Date(task.created_at).getTime()) / 1000;
            return task.estimated_compute_time - elapsed;
          };
          comparison = getTimeRemaining(a) - getTimeRemaining(b);
          break;
        case "analysis":
          // Sort by whether result exists
          const hasResultA = a.status === "completed" ? 1 : 0;
          const hasResultB = b.status === "completed" ? 1 : 0;
          comparison = hasResultA - hasResultB;
          break;
        case "taskId":
          comparison = (a.sportai_task_id || a.id).localeCompare(b.sportai_task_id || b.id);
          break;
        case "videoUrl":
          comparison = a.video_url.localeCompare(b.video_url);
          break;
        case "length":
          comparison = (a.video_length || 0) - (b.video_length || 0);
          break;
        case "elapsed":
          const getElapsed = (task: Task) => {
            const start = new Date(task.created_at).getTime();
            const end = task.status === "completed" || task.status === "failed"
              ? new Date(task.completed_at || task.updated_at).getTime()
              : Date.now();
            return end - start;
          };
          comparison = getElapsed(a) - getElapsed(b);
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    return result;
  }, [tasks, filterSport, filterTaskType, sortColumn, sortDirection]);
  
  // Load developer mode and listen for changes
  useEffect(() => {
    setDeveloperMode(getDeveloperMode());
    
    const handleDeveloperModeChange = () => {
      setDeveloperMode(getDeveloperMode());
    };
    
    window.addEventListener("developer-mode-change", handleDeveloperModeChange);
    return () => window.removeEventListener("developer-mode-change", handleDeveloperModeChange);
  }, []);
  
  const copyToClipboard = async (text: string, type: "id" | "url") => {
    await navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopiedUrl(text);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };
  
  const downloadResult = async (taskId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/download`, {
        headers: { Authorization: `Bearer ${user.id}` },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to get download URL");
      }
      
      const { url, filename } = await response.json();
      
      // Open in new tab or trigger download
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
  };
  
  const [fetchingResult, setFetchingResult] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<string | null>(null);
  const [preparingTask, setPreparingTask] = useState<string | null>(null);
  
  // Video upload state (dev mode only)
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Download video from URL
  const downloadVideo = async (task: Task) => {
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
    } catch (err) {
      // Fallback: open video in new tab if download fails (e.g., CORS issues)
      window.open(task.video_url, "_blank");
    }
  };
  
  // Delete a task from the database
  const deleteTask = async (taskId: string) => {
    if (!user) return;
    
    setDeletingTask(taskId);
    setError(null);
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.id}` },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete task");
      }
      
      // Remove task from state
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setDeletingTask(null);
    }
  };
  
  // Fetch result from SportAI API and store in S3 (without downloading)
  // Always uses force=true to bypass cache and get fresh data from SportAI
  const fetchResult = async (taskId: string) => {
    if (!user) return;
    
    setFetchingResult(taskId);
    setError(null);
    
    try {
      // Always force refresh to get latest data from SportAI API
      const response = await fetch(`/api/tasks/${taskId}/result?force=true`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.id}` },
      });
      
      if (response.status === 202) {
        throw new Error("Task is still being processed on SportAI servers");
      }
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch result");
      }
      
      // Result fetched and stored in S3
      // Update task in state to show it now has a result
      setTasks(prev => 
        prev.map(t => t.id === taskId ? { ...t, result_s3_key: `task-results/${taskId}.json` } : t)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch result");
    } finally {
      setFetchingResult(null);
    }
  };
  
  // Fetch and immediately download result
  const fetchAndDownloadResult = async (taskId: string) => {
    if (!user) return;
    
    setFetchingResult(taskId);
    setError(null);
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/result`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.id}` },
      });
      
      if (response.status === 202) {
        throw new Error("Task is still being processed");
      }
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch result");
      }
      
      const { url, filename } = await response.json();
      
      // Update task in state to show it now has a result
      setTasks(prev => 
        prev.map(t => t.id === taskId ? { ...t, result_s3_key: `task-results/${taskId}.json` } : t)
      );
      
      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch result");
    } finally {
      setFetchingResult(null);
    }
  };
  
  // Handle task click - fetch JSON if needed, then navigate
  const handleTaskClick = async (taskId: string) => {
    if (!user) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Show spinner immediately to provide feedback
    setPreparingTask(taskId);
    setError(null);
    
    // Mark task as seen when clicked
    markTaskAsSeen(taskId);
    
    // If we already have the result, navigate directly
    if (task.result_s3_key) {
      router.push(`/library/${taskId}`);
      // Note: we don't clear preparingTask here since we're navigating away
      return;
    }
    
    // Technique tasks don't have SportAI results - navigate directly
    if (task.task_type === "technique") {
      router.push(`/library/${taskId}`);
      return;
    }
    
    // Need to fetch the result first (for SportAI tasks like statistics)
    try {
      const response = await fetch(`/api/tasks/${taskId}/result`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.id}` },
      });
      
      if (response.status === 202) {
        throw new Error("Task is still being processed on SportAI servers");
      }
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch result");
      }
      
      // Update task in state to show it now has a result
      setTasks(prev => 
        prev.map(t => t.id === taskId ? { ...t, result_s3_key: `task-results/${taskId}.json` } : t)
      );
      
      // Navigate to the task viewer
      router.push(`/library/${taskId}`);
      // Note: we don't clear preparingTask here since we're navigating away
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to prepare video");
      setPreparingTask(null);
    }
  };
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);
  
  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch("/api/tasks", {
        headers: {
          Authorization: `Bearer ${user.id}`,
        },
      });
      
      if (!response.ok) throw new Error("Failed to fetch tasks");
      
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  
  // Check status for a single task
  const checkTaskStatus = useCallback(async (task: Task) => {
    if (!user) return null;
    try {
      const response = await fetch(`/api/tasks/${task.id}/status`, {
        headers: { Authorization: `Bearer ${user.id}` },
      });
      
      if (response.ok) {
        const { task: updatedTask } = await response.json();
        return updatedTask;
      }
    } catch {
      // Silent fail for status polling
    }
    return null;
  }, [user]);
  
  // Check all active tasks
  const checkAllActiveTasks = useCallback(async () => {
    const activeTasks = tasks.filter(t => t.status === "processing" || t.status === "pending");
    if (activeTasks.length === 0 || !user) return;
    
    const updates: Task[] = [];
    for (const task of activeTasks) {
      const updated = await checkTaskStatus(task);
      if (updated && updated.status !== task.status) {
        updates.push(updated);
      }
    }
    
    if (updates.length > 0) {
      setTasks(prev => 
        prev.map(t => {
          const updated = updates.find(u => u.id === t.id);
          return updated || t;
        })
      );
    }
  }, [tasks, user, checkTaskStatus]);
  
  // Immediate status check when tasks are first loaded
  const [hasCheckedInitial, setHasCheckedInitial] = useState(false);
  useEffect(() => {
    if (!loading && tasks.length > 0 && !hasCheckedInitial) {
      const activeTasks = tasks.filter(t => t.status === "processing" || t.status === "pending");
      if (activeTasks.length > 0) {
        checkAllActiveTasks();
      }
      setHasCheckedInitial(true);
    }
  }, [loading, tasks, hasCheckedInitial, checkAllActiveTasks]);
  
  // Poll for task status updates
  useEffect(() => {
    const activeTasks = tasks.filter(t => t.status === "processing" || t.status === "pending");
    if (activeTasks.length === 0 || !user) return;
    
    const interval = setInterval(checkAllActiveTasks, 30000);
    
    return () => clearInterval(interval);
  }, [tasks, user, checkAllActiveTasks]);
  
  // Handle file selection for video upload (dev mode)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        setError(validation.error || "Invalid video file");
        return;
      }
      setSelectedFile(file);
      setVideoUrl(""); // Clear URL when file is selected
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };
  
  // Clear selected file
  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Submit new task with uploaded video file
  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile) return;
    
    setUploadingVideo(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      // Step 1: Get presigned URL for S3 upload
      const urlResponse = await fetch("/api/s3/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          contentType: selectedFile.type,
        }),
      });
      
      if (!urlResponse.ok) {
        const errorData = await urlResponse.json();
        throw new Error(errorData.error || "Failed to get upload URL");
      }
      
      const { url: presignedUrl, downloadUrl, publicUrl } = await urlResponse.json();
      const videoUrl = downloadUrl || publicUrl;
      
      // Step 2: Upload file to S3
      await uploadToS3(presignedUrl, selectedFile, (progress) => {
        setUploadProgress(progress);
      });
      
      // Step 3: Extract thumbnail and duration from the file
      let thumbnailUrl: string | null = null;
      let thumbnailS3Key: string | null = null;
      let videoLength: number | null = null;
      
      try {
        logger.debug("[TasksPage] Extracting thumbnail from uploaded file...");
        const { frameBlob, durationSeconds } = await extractFirstFrameWithDuration(selectedFile, 640, 0.7);
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
      
      // Step 4: Create task with the uploaded video URL
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({
          taskType,
          sport,
          videoUrl,
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
      setTasks(prev => [task, ...prev]);
      clearSelectedFile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload video");
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };
  
  // Submit new task
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !videoUrl.trim()) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const trimmedUrl = videoUrl.trim();
      
      // Try to extract thumbnail and duration from the video URL
      // This runs in parallel-ish - we start extraction but don't wait for it
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
        } else {
          logger.debug("[TasksPage] Could not extract thumbnail (CORS or video issue)");
        }
      } catch (thumbErr) {
        // Non-blocking - continue without thumbnail
        logger.warn("[TasksPage] Thumbnail extraction failed:", thumbErr);
      }
      
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.id}`,
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
      setTasks(prev => [task, ...prev]);
      setVideoUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };
  
  const getStatusBadge = (status: Task["status"]) => {
    const colors: Record<Task["status"], "orange" | "blue" | "green" | "red"> = {
      pending: "orange",
      processing: "blue",
      completed: "green",
      failed: "red",
    };
    return <Badge color={colors[status]}>{status}</Badge>;
  };
  
  const getTypeBadge = (type: string) => {
    return <Badge variant="soft">{type}</Badge>;
  };
  
  const getSportBadge = (sportValue: Task["sport"]) => {
    // Don't show badge for "other" (all) sport
    if (sportValue === "all") return null;
    
    const colors: Record<Exclude<Task["sport"], "all">, "cyan" | "orange" | "green"> = {
      padel: "cyan",
      tennis: "orange",
      pickleball: "green",
    };
    const labels: Record<Exclude<Task["sport"], "all">, string> = {
      padel: "Padel",
      tennis: "Tennis",
      pickleball: "Pickleball",
    };
    return <Badge color={colors[sportValue]}>{labels[sportValue]}</Badge>;
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };
  
  const formatDuration = (totalSeconds: number) => {
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
  };
  
  const formatElapsed = (task: Task) => {
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
  };
  
  // Force re-render every 30s to update time remaining
  const [, setTick] = useState(0);
  useEffect(() => {
    const hasActiveTasks = tasks.some(t => t.status === "processing" || t.status === "pending");
    if (!hasActiveTasks) return;
    
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, [tasks]);
  
  const formatTimeRemaining = (task: Task): React.ReactNode => {
    if (!task.estimated_compute_time) return null;
    
    const createdAt = new Date(task.created_at).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - createdAt) / 1000);
    const estimatedSeconds = Math.abs(task.estimated_compute_time);
    const remainingSeconds = estimatedSeconds - elapsedSeconds;
    
    // Time exceeded estimate - show overdue in red
    if (remainingSeconds < 0) {
      const overdueSeconds = Math.abs(remainingSeconds);
      return (
        <Text color="red" size="2">
          {formatDuration(overdueSeconds)} overdue
        </Text>
      );
    }
    
    return `~${formatDuration(remainingSeconds)}`;
  };
  
  // Sortable header component
  const SortableHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
    <Flex
      align="center"
      gap="1"
      onClick={() => handleSort(column)}
      style={{ cursor: "pointer", userSelect: "none", textTransform: "uppercase", letterSpacing: "0.05em" }}
    >
      {children}
      {sortColumn === column ? (
        sortDirection === "asc" ? (
          <ChevronUpIcon width={12} height={12} />
        ) : (
          <ChevronDownIcon width={12} height={12} />
        )
      ) : (
        <Box style={{ width: 12, height: 12, opacity: 0.3 }}>
          <ChevronDownIcon width={12} height={12} />
        </Box>
      )}
    </Flex>
  );
  
  // Handle creating a new chat and navigating to it
  const handleNewChat = useCallback(async () => {
    const newChat = await createNewChat();
    setCurrentChatId(newChat.id);
    router.push("/");
  }, [router]);
  
  if (authLoading || loading) {
    return (
      <>
        <Sidebar />
        <PageHeader onNewChat={handleNewChat} />
        <Box 
          style={{ 
            height: "100vh", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            paddingTop: isMobile ? "calc(57px + env(safe-area-inset-top))" : "57px",
            marginLeft: isMobile ? 0 : isCollapsed ? "64px" : "280px",
            transition: isInitialLoad ? "none" : "margin-left 0.2s ease-in-out",
          }}
        >
          <Spinner size="3" />
        </Box>
      </>
    );
  }
  
  if (!user) return null;

  return (
    <>
      <Sidebar />
      <PageHeader 
        onNewChat={handleNewChat}
      />
      <Box
        style={{
          height: "100vh",
          backgroundColor: "var(--gray-1)",
          padding: "24px",
          paddingTop: isMobile ? "calc(57px + 24px + env(safe-area-inset-top))" : "calc(57px + 24px)",
          paddingBottom: "48px",
          marginLeft: isMobile ? 0 : isCollapsed ? "64px" : "280px",
          transition: isInitialLoad ? "none" : "margin-left 0.2s ease-in-out",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <Box style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Error Display */}
        {error && (
          <Card style={{ marginBottom: "24px", backgroundColor: "var(--red-3)" }}>
            <Text color="red">{error}</Text>
          </Card>
        )}
        
        {/* New Task Form - Developer Mode Only */}
        {developerMode && (
          <Card style={{ marginBottom: "24px" }}>
            <Flex gap="3" align="end" wrap="wrap">
              <Box style={{ width: "120px" }}>
                <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
                  Sport
                </Text>
                <Select.Root value={sport} onValueChange={setSport} disabled={submitting || uploadingVideo}>
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    {SPORTS.map(s => (
                      <Select.Item key={s.value} value={s.value}>
                        {s.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Box>
              
              <Box style={{ width: "140px" }}>
                <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
                  Analysis Type
                </Text>
                <Select.Root value={taskType} onValueChange={setTaskType} disabled={submitting || uploadingVideo}>
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    {availableTaskTypes.map(type => (
                      <Select.Item key={type.value} value={type.value}>
                        {type.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Box>
              
              {/* URL Input */}
              <Box style={{ flex: 1, minWidth: "200px" }}>
                <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
                  Video URL
                </Text>
                <TextField.Root
                  placeholder="https://example.com/video.mp4"
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    if (e.target.value) clearSelectedFile(); // Clear file when URL is entered
                  }}
                  disabled={submitting || uploadingVideo || !!selectedFile}
                />
              </Box>
              
              <Text size="2" color="gray" style={{ alignSelf: "center", paddingBottom: "6px" }}>or</Text>
              
              {/* File Upload */}
              <Box>
                <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
                  Upload Video
                </Text>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  disabled={submitting || uploadingVideo}
                  style={{ display: "none" }}
                />
                {selectedFile ? (
                  <Flex gap="2" align="center">
                    <Badge size="2" variant="soft" color="blue">
                      {selectedFile.name.length > 20 
                        ? `${selectedFile.name.slice(0, 17)}...` 
                        : selectedFile.name}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="1" 
                      onClick={clearSelectedFile}
                      disabled={uploadingVideo}
                    >
                      <Cross2Icon />
                    </Button>
                  </Flex>
                ) : (
                  <Button
                    variant="soft"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting || uploadingVideo || !!videoUrl.trim()}
                  >
                    <UploadIcon />
                    Choose File
                  </Button>
                )}
              </Box>
              
              {/* Submit Button - handles both URL and file upload */}
              {selectedFile ? (
                <Button 
                  onClick={(e) => handleFileUploadSubmit(e as unknown as React.FormEvent)}
                  disabled={uploadingVideo}
                >
                  {uploadingVideo ? (
                    <>
                      <Spinner size="1" />
                      {uploadProgress > 0 ? `${Math.round(uploadProgress)}%` : "Uploading..."}
                    </>
                  ) : (
                    <>
                      <PlusIcon />
                      Upload & Analyse
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                  disabled={submitting || !videoUrl.trim()}
                >
                  {submitting ? <Spinner size="1" /> : <PlusIcon />}
                  Analyse
                </Button>
              )}
            </Flex>
            
            {/* Upload Progress Bar */}
            {uploadingVideo && uploadProgress > 0 && (
              <Box style={{ marginTop: "12px" }}>
                <Box 
                  style={{ 
                    height: "4px", 
                    backgroundColor: "var(--gray-4)", 
                    borderRadius: "2px",
                    overflow: "hidden"
                  }}
                >
                  <Box 
                    style={{ 
                      height: "100%", 
                      width: `${uploadProgress}%`,
                      backgroundColor: "var(--accent-9)",
                      transition: "width 0.2s ease-out"
                    }}
                  />
                </Box>
              </Box>
            )}
          </Card>
        )}
        
        {/* Filters and View Toggle */}
        <Flex justify="between" align="center" mb="3" wrap="wrap" gap="3">
          <Flex gap="3" align="center">
            <Text size="2" weight="medium" color="gray">Videos</Text>
            
            {/* Sport Filter */}
            <Select.Root value={filterSport} onValueChange={setFilterSport} size="1">
              <Select.Trigger placeholder="All Sports" style={{ minWidth: "110px" }} />
              <Select.Content>
                <Select.Item value="show_all">All</Select.Item>
                {SPORTS.map(s => (
                  <Select.Item key={s.value} value={s.value}>
                    {s.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            
            {/* Analysis Type Filter */}
            <Select.Root value={filterTaskType} onValueChange={setFilterTaskType} size="1">
              <Select.Trigger placeholder="All Analysis" style={{ minWidth: "120px" }} />
              <Select.Content>
                <Select.Item value="all">All Analysis</Select.Item>
                {TASK_TYPES.map(type => (
                  <Select.Item key={type.value} value={type.value}>
                    {type.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            
            {/* Show count of filtered results */}
            {(filterSport !== "show_all" || filterTaskType !== "all") && (
              <Text size="1" color="gray">
                {filteredTasks.length} of {tasks.length}
              </Text>
            )}
          </Flex>
          
          <SegmentedControl.Root 
            value={viewMode} 
            onValueChange={(value) => setViewMode(value as "list" | "grid")}
            size="1"
          >
            <SegmentedControl.Item value="grid">
              <Flex align="center" gap="1">
                <ViewGridIcon width={14} height={14} />
                <Text size="1">Grid</Text>
              </Flex>
            </SegmentedControl.Item>
            <SegmentedControl.Item value="list">
              <Flex align="center" gap="1">
                <ListBulletIcon width={14} height={14} />
                <Text size="1">List</Text>
              </Flex>
            </SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>
        
        {/* Grid View */}
        {viewMode === "grid" && (
          <TaskGridView
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onFetchResult={fetchResult}
            fetchingResult={fetchingResult}
            onDeleteTask={deleteTask}
            deletingTask={deletingTask}
            preparingTask={preparingTask}
            onDownloadVideo={downloadVideo}
            onExportData={downloadResult}
            isTaskNew={isTaskNew}
          />
        )}
        
        {/* List View (Table) */}
        {viewMode === "list" && (
        <Card>
          {filteredTasks.length === 0 ? (
            <Flex align="center" justify="center" py="8">
              <Text color="gray">
                {tasks.length === 0 
                  ? "Your PRO video analyses will appear here in the Library."
                  : "No tasks match the selected filters."}
              </Text>
            </Flex>
          ) : (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  {developerMode && (
                    <Table.ColumnHeaderCell>
                      <SortableHeader column="taskId">Task ID</SortableHeader>
                    </Table.ColumnHeaderCell>
                  )}
                  <Table.ColumnHeaderCell>
                    <SortableHeader column="sport">Sport</SortableHeader>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>
                    <SortableHeader column="type">Type</SortableHeader>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>
                    <SortableHeader column="status">Status</SortableHeader>
                  </Table.ColumnHeaderCell>
                  {developerMode && (
                    <Table.ColumnHeaderCell>
                      <SortableHeader column="videoUrl">Video URL</SortableHeader>
                    </Table.ColumnHeaderCell>
                  )}
                  {developerMode && (
                    <Table.ColumnHeaderCell>
                      <SortableHeader column="length">Length</SortableHeader>
                    </Table.ColumnHeaderCell>
                  )}
                  <Table.ColumnHeaderCell>
                    <SortableHeader column="created">Created</SortableHeader>
                  </Table.ColumnHeaderCell>
                  {developerMode && (
                    <Table.ColumnHeaderCell>
                      <SortableHeader column="elapsed">Elapsed</SortableHeader>
                    </Table.ColumnHeaderCell>
                  )}
                  <Table.ColumnHeaderCell>
                    <SortableHeader column="timeLeft">Time Left</SortableHeader>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>
                    <SortableHeader column="analysis">Analysis</SortableHeader>
                  </Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredTasks.map((task) => (
                  <Table.Row key={task.id}>
                    {developerMode && (
                      <Table.Cell>
                        <Flex align="center" gap="1">
                          <Text size="1" style={{ fontFamily: "monospace" }}>
                            {(task.sportai_task_id || task.id).slice(0, 6)}
                          </Text>
                          <Button
                            variant="ghost"
                            size="1"
                            onClick={() => copyToClipboard(task.sportai_task_id || task.id, "id")}
                            style={{ padding: "2px", minWidth: "auto", marginLeft: "4px" }}
                          >
                            {copiedId === (task.sportai_task_id || task.id) 
                              ? <CheckIcon style={{ color: "var(--green-9)" }} />
                              : <CopyIcon />}
                          </Button>
                        </Flex>
                      </Table.Cell>
                    )}
                    <Table.Cell>{getSportBadge(task.sport)}</Table.Cell>
                    <Table.Cell>{getTypeBadge(task.task_type)}</Table.Cell>
                    <Table.Cell>
                      <Flex align="center" gap="2">
                        {getStatusBadge(task.status)}
                        {/* New badge for completed tasks that haven't been viewed */}
                        {isTaskNew(task.id) && task.status === "completed" && (
                          <Badge color="blue" variant="solid" size="1">New</Badge>
                        )}
                      </Flex>
                    </Table.Cell>
                    {developerMode && (
                      <Table.Cell>
                        <Flex align="center" gap="1">
                          <a
                            href={task.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                              maxWidth: "200px", 
                              overflow: "hidden", 
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              direction: "rtl",
                              textAlign: "left",
                              fontSize: "var(--font-size-2)",
                              color: "var(--accent-11)",
                              textDecoration: "none",
                            }}
                          >
                            {task.video_url}
                          </a>
                          <Button
                            variant="ghost"
                            size="1"
                            onClick={() => copyToClipboard(task.video_url, "url")}
                            style={{ padding: "2px", minWidth: "auto", marginLeft: "4px" }}
                          >
                            {copiedUrl === task.video_url 
                              ? <CheckIcon style={{ color: "var(--green-9)" }} />
                              : <CopyIcon />}
                          </Button>
                        </Flex>
                      </Table.Cell>
                    )}
                    {developerMode && (
                      <Table.Cell>
                        {task.video_length ? formatDuration(Math.round(task.video_length)) : "-"}
                      </Table.Cell>
                    )}
                    <Table.Cell>{formatDate(task.created_at)}</Table.Cell>
                    {developerMode && <Table.Cell>{formatElapsed(task)}</Table.Cell>}
                    <Table.Cell>
                      {task.status === "completed" ? (
                        <Text color="green" size="2">Done</Text>
                      ) : task.status === "failed" ? (
                        <Text color="red" size="2">Failed</Text>
                      ) : (
                        formatTimeRemaining(task) || "-"
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {/* View button for completed tasks */}
                      {task.status === "completed" && (
                        <Button
                          variant="soft"
                          size="1"
                          onClick={() => handleTaskClick(task.id)}
                          disabled={preparingTask === task.id}
                        >
                          {preparingTask === task.id ? (
                            <Spinner size="1" />
                          ) : (
                            <EyeOpenIcon />
                          )}
                          View
                        </Button>
                      )}
                      
                      {/* Error message for failed tasks */}
                      {task.status === "failed" && task.error_message && (
                        <Text size="1" color="red" style={{ maxWidth: "150px", display: "block" }}>
                          {task.error_message}
                        </Text>
                      )}
                      
                      {/* Placeholder for failed tasks without error message */}
                      {task.status === "failed" && !task.error_message && (
                        <Text size="1" color="red">Failed</Text>
                      )}
                      
                      {/* Placeholder for pending/processing tasks */}
                      {(task.status === "pending" || task.status === "processing") && (
                        <Text size="2" color="gray">-</Text>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Card>
        )}
        </Box>
      </Box>
    </>
  );
}

