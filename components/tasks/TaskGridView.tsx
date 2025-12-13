"use client";

import { Flex, Text, Grid } from "@radix-ui/themes";
import { TaskTile, type Task } from "./TaskTile";
import { EmptyState } from "@/components/ui";
import { useRefreshedSampleTasks } from "./sampleTasks";

interface TaskGridViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onFetchResult: (taskId: string) => void;
  fetchingResult: string | null;
  onDeleteTask?: (taskId: string) => void;
  deletingTask?: string | null;
  preparingTask?: string | null;
  onDownloadVideo?: (task: Task) => void;
  onExportData?: (taskId: string) => void;
  isTaskNew?: (taskId: string) => boolean;
  showSamples?: boolean;
}

export function TaskGridView({ tasks, onTaskClick, onFetchResult, fetchingResult, onDeleteTask, deletingTask, preparingTask, onDownloadVideo, onExportData, isTaskNew, showSamples = true }: TaskGridViewProps) {
  const sampleTasks = useRefreshedSampleTasks();
  const hasTasks = tasks.length > 0;
  const hasSamples = showSamples && sampleTasks.length > 0;
  
  if (!hasTasks && !hasSamples) {
    return (
      <Flex align="center" justify="center" py="8">
        <EmptyState message="No videos match the current filters." />
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
        `${activeTasks.length} ${activeTasks.length === 1 ? "analysis" : "analyses"}`
      )}
      
      {/* Completed tasks */}
      {renderTaskSection(
        completedTasks, 
        "Completed", 
        `${completedTasks.length} ${completedTasks.length === 1 ? "analysis" : "analyses"}`
      )}
      
      {/* Failed tasks */}
      {renderTaskSection(
        failedTasks, 
        "Failed", 
        `${failedTasks.length} ${failedTasks.length === 1 ? "analysis" : "analyses"}`
      )}
      
      {/* Sample videos section */}
      {hasSamples && renderTaskSection(
        sampleTasks,
        "Sample Videos",
        "Try these demo analyses",
        true
      )}
    </Flex>
  );
}

