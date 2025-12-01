"use client";

import { Box, Flex, Text, Grid } from "@radix-ui/themes";
import { TaskTile } from "./TaskTile";
import { EmptyState } from "@/components/ui";

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

interface TaskGridViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onFetchResult: (taskId: string) => void;
  fetchingResult: string | null;
}

export function TaskGridView({ tasks, onTaskClick, onFetchResult, fetchingResult }: TaskGridViewProps) {
  if (tasks.length === 0) {
    return (
      <Flex align="center" justify="center" py="8">
        <EmptyState message="No tasks yet. Submit a video URL to get started." />
      </Flex>
    );
  }
  
  // Group tasks by status for better organization
  const activeTasks = tasks.filter(t => t.status === "processing" || t.status === "pending");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const failedTasks = tasks.filter(t => t.status === "failed");
  
  const renderTaskSection = (sectionTasks: Task[], title: string, subtitle?: string) => {
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
              onFetchResult={() => onFetchResult(task.id)}
              isFetching={fetchingResult === task.id}
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
        `${activeTasks.length} ${activeTasks.length === 1 ? "task" : "tasks"}`
      )}
      
      {/* Completed tasks */}
      {renderTaskSection(
        completedTasks, 
        "Completed", 
        `${completedTasks.length} ${completedTasks.length === 1 ? "task" : "tasks"}`
      )}
      
      {/* Failed tasks */}
      {renderTaskSection(
        failedTasks, 
        "Failed", 
        `${failedTasks.length} ${failedTasks.length === 1 ? "task" : "tasks"}`
      )}
    </Flex>
  );
}

