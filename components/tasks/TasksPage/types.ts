// ============================================================================
// Task Types
// ============================================================================

export interface Task {
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

export type TaskStatus = Task["status"];
export type TaskSport = Task["sport"];

// ============================================================================
// Sorting Types
// ============================================================================

export type SortColumn =
  | "sport"
  | "type"
  | "status"
  | "created"
  | "timeLeft"
  | "analysis"
  | "taskId"
  | "videoUrl"
  | "length"
  | "elapsed";

export type SortDirection = "asc" | "desc";

// ============================================================================
// Filter Types
// ============================================================================

export interface TaskFilters {
  sport: string;
  taskType: string;
}

// ============================================================================
// Component Props
// ============================================================================

export interface TasksPageProps {
  // Currently no props, but can be extended
}





