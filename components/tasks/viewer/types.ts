export interface Task {
  id: string;
  task_type: string;
  sport: "tennis" | "padel" | "pickleball";
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

export interface Swing {
  start: { timestamp: number; frame_nr: number };
  end: { timestamp: number; frame_nr: number };
  swing_type: string;
  ball_speed: number;
  volley: boolean;
  serve: boolean;
  ball_hit: { timestamp: number; frame_nr: number };
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

export interface StatisticsResult {
  players: Player[];
  team_sessions: Array<{
    start_time: number;
    end_time: number;
    front_team: number[];
    back_team: number[];
  }>;
  highlights: Highlight[];
  rallies: [number, number][];
  bounce_heatmap: number[][];
  ball_bounces: BallBounce[];
  ball_positions: Array<{
    timestamp: number;
    X: number;
    Y: number;
  }>;
  confidences: {
    final_confidences: {
      pose: number;
      swing: number;
      ball: number;
      final: number;
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

