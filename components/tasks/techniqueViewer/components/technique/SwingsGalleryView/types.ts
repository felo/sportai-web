import type { ProtocolEvent } from "@/components/videoPoseViewerV2";

// ============================================================================
// Component Props
// ============================================================================

export interface SwingsGalleryViewProps {
  protocolEvents: ProtocolEvent[];
  videoFPS: number;
  onPlaySwing: (time: number) => void;
  onViewModeChange: () => void;
}

// ============================================================================
// Helper Component Props
// ============================================================================

export interface QuickStatPillProps {
  label: string;
  value: number;
  icon: string;
  color: string;
}

export interface ScrollButtonProps {
  direction: "left" | "right";
  onClick: () => void;
}

export interface TipCardProps {
  icon: string;
  title: string;
  tip: string;
}
