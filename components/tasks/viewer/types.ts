export interface Task {
  id: string;
  task_type: string;
  sport: "tennis" | "padel" | "pickleball" | "all";
  sportai_task_id: string | null;
  video_url: string;
  video_length: number | null;
  status: "pending" | "processing" | "completed" | "failed";
  estimated_compute_time: number | null;
  result_s3_key: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface SwingAnnotation {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2] normalized
  box_confidence: number;
  keypoints?: number[][]; // COCO 17-point format: [[x, y], ...]
  confidences?: number[]; // Confidence scores for each keypoint
  timestamp?: number; // Frame timestamp (if available)
  frame_nr?: number; // Frame number (if available)
}

export interface Swing {
  start: { timestamp: number; frame_nr: number };
  end: { timestamp: number; frame_nr: number };
  swing_type: string;
  ball_speed: number;
  volley: boolean;
  serve: boolean;
  ball_hit: { timestamp: number; frame_nr: number };
  ball_hit_location?: [number, number]; // Player court position [X, Y] in meters when ball was hit
  confidence?: number;
  annotations?: SwingAnnotation[];
  is_in_rally?: boolean; // Only show swings that are part of a rally
}

export interface Player {
  player_id: number;
  swing_count: number;
  covered_distance: number;
  fastest_sprint: number;
  fastest_sprint_timestamp: number;
  activity_score: number;
  swing_type_distribution: Record<string, number>;
  location_heatmap: number[][];
  swings: Swing[];
}

export interface Highlight {
  type: string;
  start: { timestamp: number };
  end: { timestamp: number };
  duration: number;
  swing_count: number;
}

export interface BallBounce {
  timestamp: number;
  court_pos: [number, number];
  player_id: number;
  type: string;
}

export interface PlayerPosition {
  timestamp: number;
  X: number; // Image/video coordinates (normalized 0-1)
  Y: number; // Image/video coordinates (normalized 0-1)
  court_X?: number; // Court position in meters (0-10m width)
  court_Y?: number; // Court position in meters (0-20m length)
}

/**
 * Thumbnail crop data for a single frame.
 * Each thumbnail has 4 bbox variants (smallest to largest):
 * 0: face only, 1: head+chest, 2: head+torso, 3: full person
 */
export interface ThumbnailCrop {
  bbox: [number, number, number, number][]; // 4 variants: [xmin, ymin, xmax, ymax] normalized
  frame_nr: number;
  timestamp: number;
  score: number; // Quality score (higher is better)
}

/**
 * Player stats within a single team session
 */
export interface TeamSessionPlayer {
  player_id: number;
  swings: Swing[];
  swing_type_distribution: Record<string, number>;
  swing_count: number;
  covered_distance: number;
  fastest_sprint: number;
  fastest_sprint_timestamp: number;
  activity_score: number;
  location_heatmap: number[][] | null;
}

/**
 * A team session represents a period where teams are in specific positions
 */
export interface TeamSession {
  start_time: number;
  end_time: number;
  team_front: number[];
  team_back: number[];
  players: TeamSessionPlayer[];
}

export interface StatisticsResult {
  players: Player[];
  team_sessions: TeamSession[];
  highlights: Highlight[];
  rallies: [number, number][];
  bounce_heatmap: number[][];
  ball_bounces: BallBounce[];
  ball_positions: Array<{
    timestamp: number;
    X: number;
    Y: number;
  }>;
  player_positions?: Record<string, PlayerPosition[]>; // Keyed by player_id
  confidences: {
    final_confidences: {
      pose: number;
      swing: number;
      ball: number;
      final: number;
    };
  };
  // Player thumbnail crops - keyed by player_id (as string)
  // Each player has up to 5 best thumbnail frames with 4 crop size variants
  thumbnail_crops?: Record<string, ThumbnailCrop[]>;
  // Debug data containing court detection info
  debug_data?: {
    court_keypoints?: ([number, number] | [null, null])[];
    video_info?: {
      width: number;
      height: number;
      fps: number;
      end_time: number;
      total_frames: number;
    };
  };
}

export interface SwingWithPlayer extends Swing {
  player_id: number;
}

export interface ActiveEventTooltip {
  text: string;
  position: number;
  id: string;
}

