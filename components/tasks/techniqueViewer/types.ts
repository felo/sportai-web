import type { ViewerConfig, ViewerState, ProtocolEvent, MomentReport } from "@/components/videoPoseViewerV2";

// ============================================================================
// Props
// ============================================================================

export interface TechniqueViewerProps {
  videoUrl: string;
  onBack?: () => void;
  /** Label for the back button tooltip (e.g., "Back to Library", "Back to Chat") */
  backLabel?: string;
  /** Sport name (e.g., "Tennis", "Padel") */
  sport?: string;
  /** Task ID for server data persistence */
  taskId?: string;
  /** Developer mode - shows additional debug info */
  developerMode?: boolean;
}

// ============================================================================
// View Modes
// ============================================================================

export type ViewMode = "player" | "swings";

// ============================================================================
// Drag State Types
// ============================================================================

export interface DraggedMarker {
  type: "custom" | "protocol";
  id: string;
  originalTime: number;
}

export interface SwingEdgeDrag {
  eventId: string;
  edge: "start" | "end";
  originalTime: number;
}

export interface DraggedComment {
  id: string;
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
}

// ============================================================================
// Context Menu
// ============================================================================

export interface ContextMenuTarget {
  type: "custom" | "protocol" | "empty";
  id?: string;
  eventType?: string;
}

export interface ContextMenuPosition {
  time: number;
  frame: number;
}

// ============================================================================
// Dirty Flags (for tracking unsaved changes)
// ============================================================================

export interface DirtyFlags {
  videoComments: boolean;
  swingBoundaries: boolean;
  protocolAdjustments: boolean;
  customEvents: boolean;
  userPreferences: boolean;
}

export const DEFAULT_DIRTY_FLAGS: DirtyFlags = {
  videoComments: false,
  swingBoundaries: false,
  protocolAdjustments: false,
  customEvents: false,
  userPreferences: false,
};

// ============================================================================
// Pending States (for dialogs)
// ============================================================================

export interface PendingCustomEventTime {
  time: number;
  frame: number;
}

export interface PendingVideoComment {
  x: number;
  y: number;
  time: number;
  frame: number;
}

// ============================================================================
// Re-exports from components (for convenience)
// ============================================================================

export type { ViewerConfig, ViewerState, ProtocolEvent, MomentReport };
