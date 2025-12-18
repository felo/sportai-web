"use client";

/**
 * TasksPage
 *
 * Main page for managing video analysis tasks.
 * Supports both grid and list views, filtering, and task creation (developer mode).
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, Text, Card, Spinner, Badge, Button, Table, Skeleton } from "@radix-ui/themes";
import { CopyIcon, CheckIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { useAuth } from "@/components/auth/AuthProvider";
import { Sidebar, useLibraryTasks } from "@/components/sidebar";
import { useSidebar } from "@/components/SidebarContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PageHeader } from "@/components/ui";
import { createNewChat, setCurrentChatId } from "@/utils/storage-unified";
import { getDeveloperMode, getGuestTasks } from "@/utils/storage";
import { TaskGridView } from "../TaskGridView";
import { isSampleTask, useRefreshedSampleTasks } from "../sampleTasks";
import type { Task } from "./types";
import { STATUS_COLORS, SPORT_COLORS, SPORT_LABELS, TASK_TYPES, TICK_INTERVAL_MS } from "./constants";
import { formatDate, formatDuration, formatElapsed, downloadVideo } from "./utils";
import { useTaskManagement, useTaskFiltering, useVideoUpload } from "./hooks";
import { NewTaskForm, TaskFilters, SortableHeader } from "./components";

/**
 * Main TasksPage component.
 */
export function TasksPage() {
  const router = useRouter();
  const { user, session, loading: authLoading } = useAuth();
  const { isCollapsed, isInitialLoad } = useSidebar();
  const isMobile = useIsMobile();
  const { markTaskAsSeen, isTaskNew } = useLibraryTasks();
  const sampleTasks = useRefreshedSampleTasks();

  // Guest tasks from localStorage
  const [guestTasks, setGuestTasks] = useState<Task[]>([]);

  // UI state
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [developerMode, setDeveloperMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Form state
  const [videoUrl, setVideoUrl] = useState("");
  const [taskType, setTaskType] = useState("technique");
  const [sport, setSport] = useState("all");

  // Task management hook - use access token for secure API calls
  const taskManagement = useTaskManagement({
    userId: user?.id ?? null,
    accessToken: session?.access_token ?? null,
    markTaskAsSeen,
  });
  const {
    tasks,
    setTasks,
    loading,
    error,
    setError,
    submitting,
    fetchingResult,
    deletingTask,
    preparingTask,
    submitTask,
    deleteTask,
    fetchResult,
    downloadResult,
    downloadPoseData,
    handleTaskClick,
  } = taskManagement;

  // Combine all tasks
  const allTasks = useMemo(
    () => [...tasks, ...guestTasks, ...sampleTasks],
    [tasks, guestTasks, sampleTasks]
  );

  // Task filtering hook
  const filtering = useTaskFiltering({ tasks: allTasks });
  const { filteredTasks, filterSport, setFilterSport, filterTaskType, setFilterTaskType, sortColumn, sortDirection, handleSort } = filtering;

  // Video upload hook
  const videoUpload = useVideoUpload({
    accessToken: session?.access_token ?? null,
    onTaskCreated: (task) => setTasks((prev) => [task, ...prev]),
    onError: setError,
  });

  // Load guest tasks from localStorage
  useEffect(() => {
    const loadGuestTasks = () => {
      const storedGuestTasks = getGuestTasks() as Task[];
      setGuestTasks(storedGuestTasks);
    };

    loadGuestTasks();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sportai_guest_tasks") loadGuestTasks();
    };
    const handleGuestTasksChanged = () => loadGuestTasks();

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("guest-tasks-changed", handleGuestTasksChanged);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("guest-tasks-changed", handleGuestTasksChanged);
    };
  }, []);

  // Load developer mode
  useEffect(() => {
    setDeveloperMode(getDeveloperMode());

    const handleDeveloperModeChange = () => setDeveloperMode(getDeveloperMode());
    window.addEventListener("developer-mode-change", handleDeveloperModeChange);
    return () => window.removeEventListener("developer-mode-change", handleDeveloperModeChange);
  }, []);

  // Auto-switch to technique when sport changes to "all"
  useEffect(() => {
    if (sport === "all" && taskType !== "technique") {
      setTaskType("technique");
    }
  }, [sport, taskType]);

  // Force re-render every 30s for time remaining
  const [, setTick] = useState(0);
  useEffect(() => {
    const hasActiveTasks = tasks.some((t) => t.status === "processing" || t.status === "pending");
    if (!hasActiveTasks) return;

    const timer = setInterval(() => setTick((t) => t + 1), TICK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [tasks]);

  // Clipboard helpers
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

  // Handle new chat
  const handleNewChat = useCallback(async () => {
    const newChat = await createNewChat();
    setCurrentChatId(newChat.id);
    router.push("/");
  }, [router]);

  // Badge helpers
  const getStatusBadge = (status: Task["status"]) => (
    <Badge color={STATUS_COLORS[status]}>{status}</Badge>
  );

  const getTypeBadge = (type: string) => {
    const typeLabel = TASK_TYPES.find(t => t.value === type)?.label || type;
    return <Badge variant="soft">{typeLabel}</Badge>;
  };

  const getSportBadge = (sportValue: Task["sport"]) => {
    if (sportValue === "all") return null;
    return (
      <Badge color={SPORT_COLORS[sportValue as keyof typeof SPORT_COLORS]}>
        {SPORT_LABELS[sportValue as keyof typeof SPORT_LABELS]}
      </Badge>
    );
  };

  const formatTimeRemaining = (task: Task): React.ReactNode => {
    if (!task.estimated_compute_time) return null;

    const createdAt = new Date(task.created_at).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - createdAt) / 1000);
    const estimatedSeconds = Math.abs(task.estimated_compute_time);
    const remainingSeconds = estimatedSeconds - elapsedSeconds;

    if (remainingSeconds < 0) {
      return (
        <Text color="red" size="2">
          {formatDuration(Math.abs(remainingSeconds))} overdue
        </Text>
      );
    }

    return `~${formatDuration(remainingSeconds)}`;
  };

  // Determine if we're in a loading state for the task grid
  // Show the page shell immediately, only show skeletons in the grid area
  const isLoadingTasks = authLoading || (user && loading);

  return (
    <>
      <Sidebar />
      <PageHeader onNewChat={handleNewChat} />
      <Box
        style={{
          height: "100vh",
          backgroundColor: "var(--gray-1)",
          padding: "24px",
          paddingTop: isMobile ? "calc(16px + 12px + env(safe-area-inset-top))" : "calc(57px + 24px)",
          paddingBottom: isMobile ? "calc(96px + env(safe-area-inset-bottom))" : "48px",
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
            <NewTaskForm
              videoUrl={videoUrl}
              onVideoUrlChange={setVideoUrl}
              taskType={taskType}
              onTaskTypeChange={setTaskType}
              sport={sport}
              onSportChange={setSport}
              submitting={submitting}
              onSubmit={() => {
                submitTask(videoUrl, taskType, sport);
                setVideoUrl("");
              }}
              selectedFile={videoUpload.selectedFile}
              uploadingVideo={videoUpload.uploadingVideo}
              uploadProgress={videoUpload.uploadProgress}
              fileInputRef={videoUpload.fileInputRef}
              onFileSelect={videoUpload.handleFileSelect}
              onClearFile={videoUpload.clearSelectedFile}
              onFileUploadSubmit={() => videoUpload.handleFileUploadSubmit(taskType, sport)}
            />
          )}

          {/* Filters and View Toggle */}
          <TaskFilters
            filterSport={filterSport}
            onFilterSportChange={setFilterSport}
            filterTaskType={filterTaskType}
            onFilterTaskTypeChange={setFilterTaskType}
            filteredCount={filteredTasks.length}
            totalCount={allTasks.length}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Grid View */}
          {viewMode === "grid" && (
            <TaskGridView
              tasks={filteredTasks.filter((t) => !isSampleTask(t.id))}
              sampleTasks={sampleTasks}
              onTaskClick={handleTaskClick}
              onFetchResult={fetchResult}
              fetchingResult={fetchingResult}
              onDeleteTask={(taskId) => deleteTask(taskId, guestTasks, setGuestTasks)}
              deletingTask={deletingTask}
              preparingTask={preparingTask}
              onDownloadVideo={downloadVideo}
              onExportData={downloadResult}
              onExportPoseData={downloadPoseData}
              isTaskNew={isTaskNew}
              loading={isLoadingTasks ?? undefined}
            />
          )}

          {/* List View (Table) */}
          {viewMode === "list" && (
            <Card>
              {isLoadingTasks ? (
                <Flex direction="column" gap="3" p="4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Flex key={i} gap="4" align="center">
                      <Skeleton width="60px" height="20px" />
                      <Skeleton width="80px" height="20px" />
                      <Skeleton width="70px" height="20px" />
                      <Skeleton width="100px" height="20px" />
                      <Skeleton width="80px" height="20px" />
                    </Flex>
                  ))}
                </Flex>
              ) : filteredTasks.length === 0 ? (
                <Flex align="center" justify="center" py="8">
                  <Text color="gray">
                    {allTasks.length === 0
                      ? user
                        ? "Your PRO video analyses will appear here in the Library."
                        : "Sign in to upload and analyze your own videos."
                      : "No tasks match the selected filters."}
                  </Text>
                </Flex>
              ) : (
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      {developerMode && (
                        <Table.ColumnHeaderCell>
                          <SortableHeader column="taskId" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort}>
                            Task ID
                          </SortableHeader>
                        </Table.ColumnHeaderCell>
                      )}
                      <Table.ColumnHeaderCell>
                        <SortableHeader column="sport" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort}>
                          Sport
                        </SortableHeader>
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>
                        <SortableHeader column="type" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort}>
                          Type
                        </SortableHeader>
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>
                        <SortableHeader column="status" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort}>
                          Status
                        </SortableHeader>
                      </Table.ColumnHeaderCell>
                      {developerMode && (
                        <Table.ColumnHeaderCell>
                          <SortableHeader column="videoUrl" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort}>
                            Video URL
                          </SortableHeader>
                        </Table.ColumnHeaderCell>
                      )}
                      {developerMode && (
                        <Table.ColumnHeaderCell>
                          <SortableHeader column="length" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort}>
                            Length
                          </SortableHeader>
                        </Table.ColumnHeaderCell>
                      )}
                      <Table.ColumnHeaderCell>
                        <SortableHeader column="created" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort}>
                          Created
                        </SortableHeader>
                      </Table.ColumnHeaderCell>
                      {developerMode && (
                        <Table.ColumnHeaderCell>
                          <SortableHeader column="elapsed" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort}>
                            Elapsed
                          </SortableHeader>
                        </Table.ColumnHeaderCell>
                      )}
                      <Table.ColumnHeaderCell>
                        <SortableHeader column="timeLeft" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort}>
                          Time Left
                        </SortableHeader>
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>
                        <SortableHeader column="analysis" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort}>
                          Analysis
                        </SortableHeader>
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
                                {copiedId === (task.sportai_task_id || task.id) ? (
                                  <CheckIcon style={{ color: "var(--green-9)" }} />
                                ) : (
                                  <CopyIcon />
                                )}
                              </Button>
                            </Flex>
                          </Table.Cell>
                        )}
                        <Table.Cell>{getSportBadge(task.sport)}</Table.Cell>
                        <Table.Cell>{getTypeBadge(task.task_type)}</Table.Cell>
                        <Table.Cell>
                          <Flex align="center" gap="2">
                            {isSampleTask(task.id) ? (
                              <Badge color="gray" variant="soft">sample</Badge>
                            ) : (
                              <>
                                {getStatusBadge(task.status)}
                                {isTaskNew(task.id) && task.status === "completed" && (
                                  <Badge color="blue" variant="solid" size="1">New</Badge>
                                )}
                              </>
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
                                {copiedUrl === task.video_url ? (
                                  <CheckIcon style={{ color: "var(--green-9)" }} />
                                ) : (
                                  <CopyIcon />
                                )}
                              </Button>
                            </Flex>
                          </Table.Cell>
                        )}
                        {developerMode && (
                          <Table.Cell>
                            {task.video_length ? formatDuration(Math.round(task.video_length)) : "-"}
                          </Table.Cell>
                        )}
                        <Table.Cell>{isSampleTask(task.id) ? "-" : formatDate(task.created_at)}</Table.Cell>
                        {developerMode && <Table.Cell>{formatElapsed(task)}</Table.Cell>}
                        <Table.Cell>
                          {isSampleTask(task.id) ? (
                            "-"
                          ) : task.status === "completed" ? (
                            <Text color="green" size="2">Done</Text>
                          ) : task.status === "failed" ? (
                            <Text color="red" size="2">Failed</Text>
                          ) : (
                            formatTimeRemaining(task) || "-"
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {task.status === "completed" && (
                            <Button
                              variant="soft"
                              size="1"
                              onClick={() => handleTaskClick(task.id)}
                              disabled={preparingTask === task.id}
                            >
                              {preparingTask === task.id ? <Spinner size="1" /> : <EyeOpenIcon />}
                              View
                            </Button>
                          )}
                          {task.status === "failed" && task.error_message && (
                            <Text size="1" color="red" style={{ maxWidth: "150px", display: "block" }}>
                              {task.error_message}
                            </Text>
                          )}
                          {task.status === "failed" && !task.error_message && (
                            <Text size="1" color="red">Failed</Text>
                          )}
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

export default TasksPage;

