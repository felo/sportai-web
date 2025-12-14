"use client";

import { Box, Tooltip } from "@radix-ui/themes";
import type { ViewerActions } from "@/components/videoPoseViewerV2";
import type { VideoComment } from "./VideoCommentDialog";
import { VIDEO_COMMENT_TIME_TOLERANCE } from "../constants";

interface VideoCommentMarkersProps {
  videoComments: VideoComment[];
  currentTime: number;
  selectedVideoComment: string | null;
  draggedComment: {
    id: string;
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
  } | null;
  dragPreviewPosition: { x: number; y: number } | null;
  commentContainerRef: React.RefObject<HTMLDivElement>;
  viewerRef: React.RefObject<ViewerActions | null>;
  onCommentClick: (
    e: React.MouseEvent,
    commentId: string,
    commentTime: number,
    isDragging: boolean
  ) => void;
  onCommentDragStart: (e: React.MouseEvent, commentId: string) => void;
  onDeleteVideoComment: (commentId: string) => void;
}

/**
 * Renders video comment markers as draggable circles on the video overlay.
 * Comments are only shown when the current time is within tolerance of their timestamp.
 */
export function VideoCommentMarkers({
  videoComments,
  currentTime,
  selectedVideoComment,
  draggedComment,
  dragPreviewPosition,
  commentContainerRef,
  viewerRef,
  onCommentClick,
  onCommentDragStart,
  onDeleteVideoComment,
}: VideoCommentMarkersProps) {
  // Filter comments to show only those near current time
  const visibleComments = videoComments.filter(
    (comment) => Math.abs(comment.time - currentTime) < VIDEO_COMMENT_TIME_TOLERANCE
  );

  return (
    <Box
      ref={commentContainerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {visibleComments.map((comment) => {
        const isDragging = draggedComment?.id === comment.id;
        const displayX =
          isDragging && dragPreviewPosition
            ? dragPreviewPosition.x
            : comment.x;
        const displayY =
          isDragging && dragPreviewPosition
            ? dragPreviewPosition.y
            : comment.y;

        const tooltipContent = comment.description
          ? `${comment.title}: ${comment.description} (${comment.time.toFixed(2)}s • Frame ${comment.frame})`
          : `${comment.title} (${comment.time.toFixed(2)}s • Frame ${comment.frame})`;

        return (
          <Tooltip key={comment.id} content={tooltipContent}>
            <Box
              data-video-comment
              onClick={(e) =>
                onCommentClick(e, comment.id, comment.time, isDragging)
              }
              onMouseDown={(e) => onCommentDragStart(e, comment.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm(`Delete comment "${comment.title}"?`)) {
                  onDeleteVideoComment(comment.id);
                }
              }}
              style={{
                position: "absolute",
                left: `${displayX * 100}%`,
                top: `${displayY * 100}%`,
                transform: "translate(-50%, -50%)",
                width: selectedVideoComment === comment.id ? "28px" : "22px",
                height: selectedVideoComment === comment.id ? "28px" : "22px",
                borderRadius: "50%",
                backgroundColor: comment.color,
                boxShadow: isDragging
                  ? "0 0 0 4px white, 0 4px 20px rgba(0, 0, 0, 0.4)"
                  : selectedVideoComment === comment.id
                    ? `0 0 0 3px white, 0 0 16px ${comment.color}`
                    : "0 2px 8px rgba(0, 0, 0, 0.3)",
                border: "2px solid white",
                cursor: isDragging ? "grabbing" : "grab",
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: isDragging ? "none" : "all 0.15s ease",
                zIndex: isDragging
                  ? 100
                  : selectedVideoComment === comment.id
                    ? 20
                    : 15,
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  userSelect: "none",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
              >
                💬
              </span>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}
