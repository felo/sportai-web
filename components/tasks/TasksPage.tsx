"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Tabs,
  SegmentedControl,
} from "@radix-ui/themes";
import { PlusIcon, CopyIcon, CheckIcon, DownloadIcon, EyeOpenIcon, UpdateIcon, ViewGridIcon, ListBulletIcon } from "@radix-ui/react-icons";
import { useAuth } from "@/components/auth/AuthProvider";
import { Sidebar } from "@/components/sidebar";
import { useSidebar } from "@/components/SidebarContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PageHeader } from "@/components/ui";
import { createNewChat, setCurrentChatId } from "@/utils/storage-unified";
import { getDeveloperMode } from "@/utils/storage";
import { TaskGridView } from "./TaskGridView";

const TASK_TYPES = [
  { value: "statistics", label: "Statistics" },
  // Add more task types as needed
  // { value: "activity_detection", label: "Activity Detection" },
];

const SPORTS = [
  { value: "padel", label: "Padel" },
  { value: "tennis", label: "Tennis" },
  { value: "pickleball", label: "Pickleball" },
];

interface Task {
  id: string;
  task_type: string;
  sport: "tennis" | "padel" | "pickleball";
  sportai_task_id: string | null;
  video_url: string;
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
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [taskType, setTaskType] = useState("statistics");
  const [sport, setSport] = useState("padel");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [developerMode, setDeveloperMode] = useState(false);
  
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
  
  // Submit new task
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !videoUrl.trim()) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({ 
          taskType,
          sport,
          videoUrl: videoUrl.trim(),
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
    const colors: Record<Task["sport"], "cyan" | "orange" | "green"> = {
      padel: "cyan",
      tennis: "orange",
      pickleball: "green",
    };
    const labels: Record<Task["sport"], string> = {
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
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
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
        <PageHeader title="Library" onNewChat={handleNewChat} />
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
        
        {/* New Task Form */}
        <Card style={{ marginBottom: "24px" }}>
          <form onSubmit={handleSubmit}>
            <Flex gap="3" align="end">
              <Box style={{ width: "120px" }}>
                <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
                  Sport
                </Text>
                <Select.Root value={sport} onValueChange={setSport} disabled={submitting}>
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
                  Task Type
                </Text>
                <Select.Root value={taskType} onValueChange={setTaskType} disabled={submitting}>
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    {TASK_TYPES.map(type => (
                      <Select.Item key={type.value} value={type.value}>
                        {type.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Box>
              
              <Box style={{ flex: 1 }}>
                <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
                  Video URL
                </Text>
                <TextField.Root
                  placeholder="https://example.com/video.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  disabled={submitting}
                />
              </Box>
              
              <Button type="submit" disabled={submitting || !videoUrl.trim()}>
                {submitting ? <Spinner size="1" /> : <PlusIcon />}
                Create Task
              </Button>
            </Flex>
          </form>
        </Card>
        
        {/* View Toggle */}
        <Flex justify="between" align="center" mb="3">
          <Text size="3" weight="medium" color="gray">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </Text>
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
            tasks={tasks}
            onTaskClick={(taskId) => router.push(`/library/${taskId}`)}
            onFetchResult={fetchResult}
            fetchingResult={fetchingResult}
          />
        )}
        
        {/* List View (Table) */}
        {viewMode === "list" && (
        <Card>
          {tasks.length === 0 ? (
            <Flex align="center" justify="center" py="8">
              <Text color="gray">No tasks yet. Submit a video URL to get started.</Text>
            </Flex>
          ) : (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  {developerMode && <Table.ColumnHeaderCell>Task ID</Table.ColumnHeaderCell>}
                  <Table.ColumnHeaderCell>Sport</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                  {developerMode && <Table.ColumnHeaderCell>Video URL</Table.ColumnHeaderCell>}
                  {developerMode && <Table.ColumnHeaderCell>Length</Table.ColumnHeaderCell>}
                  <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                  {developerMode && <Table.ColumnHeaderCell>Elapsed</Table.ColumnHeaderCell>}
                  <Table.ColumnHeaderCell>Time Left</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Result</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {tasks.map((task) => (
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
                    <Table.Cell>{getStatusBadge(task.status)}</Table.Cell>
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
                      <Flex gap="2" align="center">
                        {/* Get Result button - fetch from SportAI API (for all completed tasks) */}
                        {task.status === "completed" && (
                          <Button
                            variant={task.result_s3_key ? "soft" : "solid"}
                            size="1"
                            color="mint"
                            onClick={() => fetchResult(task.id)}
                            disabled={fetchingResult === task.id}
                            title={task.result_s3_key ? "Re-fetch result from SportAI" : "Fetch result from SportAI"}
                          >
                            {fetchingResult === task.id ? (
                              <Spinner size="1" />
                            ) : (
                              <UpdateIcon />
                            )}
                            {task.result_s3_key ? "Refresh" : "Get Result"}
                          </Button>
                        )}
                        
                        {/* View button - only for tasks with results stored */}
                        {task.status === "completed" && task.result_s3_key && (
                          <Button
                            variant="soft"
                            size="1"
                            onClick={() => router.push(`/library/${task.id}`)}
                          >
                            <EyeOpenIcon />
                            View
                          </Button>
                        )}
                        
                        {/* Download button - for tasks with results stored */}
                        {task.result_s3_key && (
                          <Button
                            variant="ghost"
                            size="1"
                            color="gray"
                            onClick={() => downloadResult(task.id)}
                            title="Download JSON"
                          >
                            <DownloadIcon />
                          </Button>
                        )}
                        
                        {/* Error message for failed tasks */}
                        {task.status === "failed" && task.error_message && (
                          <Text size="1" color="red" style={{ maxWidth: "150px", display: "block" }}>
                            {task.error_message}
                          </Text>
                        )}
                        
                        {/* Placeholder for pending/processing tasks */}
                        {(task.status === "pending" || task.status === "processing") && "-"}
                      </Flex>
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

