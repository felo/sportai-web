import type { MomentReport } from "@/components/videoPoseViewerV2/types";

// ============================================================================
// Component Props
// ============================================================================

export interface ReportsViewProps {
  reports: MomentReport[];
  onDeleteReport?: (reportId: string) => void;
  onViewMoment?: (time: number) => void;
}

export interface ReportCardProps {
  report: MomentReport;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onViewMoment?: () => void;
}
