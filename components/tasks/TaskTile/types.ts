// Video metadata from browser APIs
export interface VideoMetadata {
  width: number | null;
  height: number | null;
  duration: number | null;
  fileSize: number | null;
  format: string | null;
  codec: string | null;
  bitrate: number | null;
  framerate: number | null;
}

// Task data from API
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

// Props for the main TaskTile component
export interface TaskTileProps {
  task: Task;
  onClick: () => void;
  onFetchResult?: () => void;
  isFetching?: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
  isPreparing?: boolean;
  onDownloadVideo?: () => void;
  onExportData?: () => void;
  isNew?: boolean;
}

// Progress state for processing tasks
export interface TaskProgress {
  percent: number;
  eta: string | null;
  isOverdue: boolean;
}

// Status configuration
export interface StatusConfig {
  color: "orange" | "blue" | "green" | "red";
  icon: React.ComponentType<{ width?: string | number; height?: string | number }>;
  label: string;
}


