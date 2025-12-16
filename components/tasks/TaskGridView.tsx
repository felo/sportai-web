"use client";

import { Flex, Text, Grid, Skeleton } from "@radix-ui/themes";
import { TaskTile, TaskTileSkeleton, type Task } from "./TaskTile";
import { EmptyState } from "@/components/ui";

interface TaskGridViewProps {
  tasks: Task[];
  sampleTasks?: Task[];
  onTaskClick: (taskId: string) => void;
  onFetchResult: (taskId: string) => void;
  fetchingResult: string | null;
  onDeleteTask?: (taskId: string) => void;
  deletingTask?: string | null;
  preparingTask?: string | null;
  onDownloadVideo?: (task: Task) => void;
  onExportData?: (taskId: string) => void;
  onExportPoseData?: (task: Task) => void;
  isTaskNew?: (taskId: string) => boolean;
  showSamples?: boolean;
  /** Show loading skeletons instead of tasks */
  loading?: boolean;
}

export function TaskGridView({ tasks, sampleTasks = [], onTaskClick, onFetchResult, fetchingResult, onDeleteTask, deletingTask, preparingTask, onDownloadVideo, onExportData, onExportPoseData, isTaskNew, showSamples = true, loading = false }: TaskGridViewProps) {
  const hasTasks = tasks.length > 0;
  const hasSamples = showSamples && sampleTasks.length > 0;
  
  console.log("[TaskGridView] Sample tasks:", sampleTasks.length, sampleTasks.map(t => ({ id: t.id, video_url: t.video_url?.substring(0, 60) })));
  
  // Show loading skeletons
  if (loading) {
    return (
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="3">
          <Skeleton width="120px" height="24px" />
          <Grid
            columns={{
              initial: "1",
              xs: "2",
              sm: "2",
              md: "3",
              lg: "4",
            }}
            gap="4"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <TaskTileSkeleton key={i} />
            ))}
          </Grid>
        </Flex>
      </Flex>
    );
  }
  
  if (!hasTasks && !hasSamples) {
    return (
      <Flex align="center" justify="center" py="8">
        <EmptyState message="No videos available. Try adjusting the filters." />
      </Flex>
    );
  }
  
  // Group tasks by status for better organization
  const activeTasks = tasks.filter(t => t.status === "processing" || t.status === "pending");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const failedTasks = tasks.filter(t => t.status === "failed");
  
  const renderTaskSection = (sectionTasks: Task[], title: string, subtitle?: string, isSampleSection?: boolean) => {
    if (sectionTasks.length === 0) return null;
    
    return (
      <Flex direction="column" gap="3">
        <Flex align="baseline" gap="2">
          <Text size="3" weight="medium" color="gray">
            {title}
          </Text>
          {subtitle && (
            <Text size="2" color="gray">
              {subtitle}
            </Text>
          )}
        </Flex>
        <Grid
          columns={{
            initial: "1",
            xs: "2",
            sm: "2",
            md: "3",
            lg: "4",
          }}
          gap="4"
        >
          {sectionTasks.map(task => (
            <TaskTile
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
              onFetchResult={isSampleSection ? undefined : () => onFetchResult(task.id)}
              isFetching={fetchingResult === task.id}
              onDelete={isSampleSection ? undefined : (onDeleteTask ? () => onDeleteTask(task.id) : undefined)}
              isDeleting={deletingTask === task.id}
              isPreparing={preparingTask === task.id}
              onDownloadVideo={isSampleSection ? undefined : (onDownloadVideo ? () => onDownloadVideo(task) : undefined)}
              onExportData={isSampleSection ? undefined : (onExportData ? () => onExportData(task.id) : undefined)}
              onExportPoseData={isSampleSection ? undefined : (onExportPoseData ? () => onExportPoseData(task) : undefined)}
              isNew={isSampleSection ? false : isTaskNew?.(task.id)}
            />
          ))}
        </Grid>
      </Flex>
    );
  };
  
  return (
    <Flex direction="column" gap="6">
      {/* Active/Processing tasks first */}
      {renderTaskSection(
        activeTasks, 
        "In Progress", 
        `(${activeTasks.length})`
      )}
      
      {/* Completed tasks */}
      {renderTaskSection(
        completedTasks, 
        "Analyses", 
        `(${completedTasks.length})`
      )}
      
      {/* Failed tasks */}
      {renderTaskSection(
        failedTasks, 
        "Failed", 
        `(${failedTasks.length})`
      )}
      
      {/* Sample videos section - only show if we have sample tasks passed in */}
      {hasSamples && sampleTasks.length > 0 && renderTaskSection(
        sampleTasks,
        "Samples",
        "Try these sample analyses",
        true
      )}
    </Flex>
  );
}

