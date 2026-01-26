/**
 * Moments Types
 * 
 * Types for user-created events, comments, and analysis reports.
 */

// ============================================================================
// Custom Events
// ============================================================================

/** Custom user-created timeline event */
export interface CustomEvent {
  id: string;
  name: string;
  color: string;
  time: number;
  frame: number;
  createdAt: number;
}

// ============================================================================
// Video Comments
// ============================================================================

/** Video comment with position */
export interface VideoComment {
  id: string;
  title: string;
  description: string;
  color: string;
  x: number;
  y: number;
  time: number;
  frame: number;
  createdAt: number;
}

// ============================================================================
// Moment Reports
// ============================================================================

/** A single analysis report for a moment */
export interface MomentReport {
  id: string;
  momentId: string;
  momentLabel: string;
  momentType: "protocol" | "custom" | "comment";
  protocolId?: string;
  time: number;
  frame: number;
  previewUrl?: string;
  content: string;
  isStreaming: boolean;
  createdAt: number;
  sport?: string;
}

// ============================================================================
// Moments Configuration
// ============================================================================

export interface MomentsConfig {
  /** Custom user-created events */
  customEvents: CustomEvent[];
  /** Video comments */
  videoComments: VideoComment[];
  /** Protocol event position adjustments (event ID -> adjusted position) */
  protocolAdjustments: Map<string, { time: number; frame: number }>;
  /** Swing boundary adjustments */
  swingBoundaryAdjustments: Map<string, {
    startTime?: number;
    startFrame?: number;
    endTime?: number;
    endFrame?: number;
  }>;
  /** Analysis reports for moments */
  reports?: MomentReport[];
  /** Callback when user clicks View on a moment */
  onViewMoment?: (time: number) => void;
  /** Callback when user clicks Analyse on a moment */
  onAnalyseMoment?: (moment: unknown) => void;
  /** Callback when user deletes a custom event or comment */
  onDeleteMoment?: (moment: unknown) => void;
  /** Callback when user resets a protocol event adjustment */
  onResetAdjustment?: (moment: unknown) => void;
  /** Callback when user wants to edit a moment's name */
  onEditMomentName?: (moment: unknown) => void;
  /** Callback when user deletes a report */
  onDeleteReport?: (reportId: string) => void;
}
