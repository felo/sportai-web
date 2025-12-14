"use client";

import {
  TargetIcon,
  BookmarkIcon,
  ChatBubbleIcon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import type { MomentReport } from "@/components/videoPoseViewerV2/types";

// ============================================================================
// Report Icon
// ============================================================================

/**
 * Get icon component for report based on moment type.
 */
export function getReportIcon(report: MomentReport) {
  if (report.protocolId) {
    switch (report.protocolId) {
      case "tennis-contact-point":
        return <TargetIcon width={16} height={16} />;
      default:
        return <BookmarkIcon width={16} height={16} />;
    }
  }

  switch (report.momentType) {
    case "comment":
      return <ChatBubbleIcon width={16} height={16} />;
    case "custom":
      return <Pencil1Icon width={16} height={16} />;
    default:
      return <BookmarkIcon width={16} height={16} />;
  }
}

// ============================================================================
// Badge Color
// ============================================================================

/**
 * Get badge color based on moment type.
 */
export function getBadgeColor(report: MomentReport): "blue" | "green" | "orange" | "purple" {
  if (report.protocolId) return "blue";
  switch (report.momentType) {
    case "comment":
      return "purple";
    case "custom":
      return "green";
    default:
      return "orange";
  }
}

// Re-export shared formatDate for backwards compatibility
export { formatDate } from "@/components/shared/utils";
