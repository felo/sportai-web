import type { ProtocolEvent } from "@/components/videoPoseViewerV2";
import type { CustomEvent } from "../CustomEventDialog";
import type { VideoComment } from "../VideoCommentDialog";

// ============================================================================
// Moment Types
// ============================================================================

export type MomentType = "protocol" | "custom" | "comment";

export interface Moment {
  /** Unique identifier */
  id: string;
  /** Type of moment */
  type: MomentType;
  /** Display label */
  label: string;
  /** Time in seconds */
  time: number;
  /** Frame number */
  frame: number;
  /** End time (for range events like swings) */
  endTime?: number;
  /** End frame */
  endFrame?: number;
  /** Color for the marker */
  color: string;
  /** Protocol ID (if protocol event) */
  protocolId?: string;
  /** Whether this moment's position has been adjusted by the user */
  isAdjusted?: boolean;
  /** Parent swing ID (if this moment belongs to a swing) */
  parentSwingId?: string;
  /** Parent swing label */
  parentSwingLabel?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Original event reference */
  originalEvent?: ProtocolEvent | CustomEvent | VideoComment;
}

// ============================================================================
// Component Props
// ============================================================================

export interface MomentCardProps {
  /** The moment to display */
  moment: Moment;
  /** Video element to capture frame from */
  videoElement: HTMLVideoElement | null;
  /** Callback when "View" is clicked */
  onView: (moment: Moment) => void;
  /** Callback when "Analyse" is clicked */
  onAnalyse: (moment: Moment) => void;
  /** Whether this card is currently selected */
  isSelected?: boolean;
  /** Pose confidence for this frame (0-1) - provided by parent from pose data */
  poseConfidence?: number | null;
  /** Callback when "Delete marker" is clicked (only for custom events/comments) */
  onDelete?: (moment: Moment) => void;
  /** Callback when "Reset adjustment" is clicked (only for adjusted moments) */
  onResetAdjustment?: (moment: Moment) => void;
  /** Callback when "Edit name" is clicked */
  onEditName?: (moment: Moment) => void;
}
