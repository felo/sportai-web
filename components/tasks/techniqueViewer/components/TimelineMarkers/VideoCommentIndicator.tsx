import { Box, Tooltip } from "@radix-ui/themes";
import type { ViewerActions } from "@/components/videoPoseViewerV2";
import type { VideoComment } from "../VideoCommentDialog";
import { getTimelinePosition } from "../../utils";

interface VideoCommentIndicatorProps {
  comment: VideoComment;
  duration: number;
  viewerRef: React.RefObject<ViewerActions | null>;
}

/**
 * Small dot indicator on the timeline for video comments.
 * Shows position of comments and allows clicking to jump to them.
 */
export function VideoCommentIndicator({
  comment,
  duration,
  viewerRef,
}: VideoCommentIndicatorProps) {
  const positionPercent = getTimelinePosition(comment.time, duration);

  return (
    <Tooltip
      content={`📍 ${comment.title} (${comment.time.toFixed(2)}s • Frame ${comment.frame}) - click to jump`}
    >
      <Box
        onClick={(e) => {
          e.stopPropagation();
          viewerRef.current?.seekTo(comment.time);
        }}
        style={{
          position: "absolute",
          left: `${positionPercent}%`,
          bottom: "2px",
          transform: "translateX(-50%)",
          width: "8px",
          height: "8px",
          backgroundColor: comment.color,
          borderRadius: "50%",
          cursor: "pointer",
          boxShadow: `0 0 4px ${comment.color}99`,
          border: "1px solid rgba(255, 255, 255, 0.3)",
          zIndex: 5,
          opacity: 0.8,
        }}
      />
    </Tooltip>
  );
}
