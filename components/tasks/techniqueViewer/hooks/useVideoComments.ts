import { useState, useCallback, useEffect, useRef } from "react";
import type { DirtyFlags, DraggedComment } from "../types";
import type { VideoComment } from "../components";
import type { ViewerActions } from "@/components/videoPoseViewerV2";
import { generateId } from "../utils";

interface UseVideoCommentsOptions {
  viewerRef: React.RefObject<ViewerActions | null>;
  setDirtyFlags: React.Dispatch<React.SetStateAction<DirtyFlags>>;
}

/**
 * Hook for managing video comments (position-based markers on the video).
 * Handles CRUD operations and drag-to-reposition functionality.
 */
export function useVideoComments({ viewerRef, setDirtyFlags }: UseVideoCommentsOptions) {
  // Video comments state
  const [videoComments, setVideoComments] = useState<VideoComment[]>([]);
  const [selectedVideoComment, setSelectedVideoComment] = useState<string | null>(null);

  // Dialog state
  const [videoCommentDialogOpen, setVideoCommentDialogOpen] = useState(false);
  const [pendingVideoComment, setPendingVideoComment] = useState<{
    x: number;
    y: number;
    time: number;
    frame: number;
  } | null>(null);

  // Drag state
  const [draggedComment, setDraggedComment] = useState<DraggedComment | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const commentContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Create a new video comment.
   */
  const handleCreateVideoComment = useCallback(
    async (commentData: Omit<VideoComment, "id" | "createdAt">) => {
      const newComment: VideoComment = {
        ...commentData,
        id: generateId("vc"),
        createdAt: Date.now(),
      };

      setVideoComments((prev) => [...prev, newComment]);
      setPendingVideoComment(null);
      setDirtyFlags((prev) => ({ ...prev, videoComments: true }));
    },
    [setDirtyFlags]
  );

  /**
   * Delete a video comment.
   */
  const handleDeleteVideoComment = useCallback(
    (commentId: string) => {
      setVideoComments((prev) => prev.filter((c) => c.id !== commentId));
      setSelectedVideoComment(null);
      setDirtyFlags((prev) => ({ ...prev, videoComments: true }));
    },
    [setDirtyFlags]
  );

  /**
   * Update a video comment's properties.
   */
  const handleUpdateVideoComment = useCallback(
    (id: string, updates: Partial<VideoComment>) => {
      setVideoComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
      setDirtyFlags((prev) => ({ ...prev, videoComments: true }));
    },
    [setDirtyFlags]
  );

  /**
   * Handle comment drag start.
   */
  const handleCommentDragStart = useCallback(
    (e: React.MouseEvent, commentId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const comment = videoComments.find((c) => c.id === commentId);
      if (!comment) return;

      setDraggedComment({
        id: commentId,
        startX: e.clientX,
        startY: e.clientY,
        originalX: comment.x,
        originalY: comment.y,
      });
      setDragPreviewPosition({ x: comment.x, y: comment.y });
      setSelectedVideoComment(commentId);
    },
    [videoComments]
  );

  /**
   * Handle comment drag move.
   */
  const handleCommentDragMove = useCallback(
    (e: MouseEvent) => {
      if (!draggedComment || !commentContainerRef.current) return;

      const rect = commentContainerRef.current.getBoundingClientRect();
      const deltaX = (e.clientX - draggedComment.startX) / rect.width;
      const deltaY = (e.clientY - draggedComment.startY) / rect.height;

      const newX = Math.max(0, Math.min(1, draggedComment.originalX + deltaX));
      const newY = Math.max(0, Math.min(1, draggedComment.originalY + deltaY));

      setDragPreviewPosition({ x: newX, y: newY });
    },
    [draggedComment]
  );

  /**
   * Handle comment drag end.
   */
  const handleCommentDragEnd = useCallback(async () => {
    if (!draggedComment || !dragPreviewPosition) {
      setDraggedComment(null);
      setDragPreviewPosition(null);
      return;
    }

    // Update the comment position
    setVideoComments((prev) =>
      prev.map((c) =>
        c.id === draggedComment.id
          ? { ...c, x: dragPreviewPosition.x, y: dragPreviewPosition.y }
          : c
      )
    );
    setDirtyFlags((prev) => ({ ...prev, videoComments: true }));

    setDraggedComment(null);
    setDragPreviewPosition(null);
  }, [draggedComment, dragPreviewPosition, setDirtyFlags]);

  // Effect to handle document-level mouse events for comment dragging
  useEffect(() => {
    if (!draggedComment) return;

    const handleMouseMove = (e: MouseEvent) => handleCommentDragMove(e);
    const handleMouseUp = () => handleCommentDragEnd();

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggedComment, handleCommentDragMove, handleCommentDragEnd]);

  /**
   * Handle video overlay click for adding comments.
   */
  const handleVideoOverlayClick = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement>,
      currentTime: number,
      currentFrame: number,
      isVideoReady: boolean,
      duration: number
    ) => {
      // Don't trigger if clicking on an existing comment marker
      if ((e.target as HTMLElement).closest("[data-video-comment]")) {
        return;
      }

      // Check if video is ready
      if (!isVideoReady || duration <= 0) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setPendingVideoComment({
        x,
        y,
        time: currentTime,
        frame: currentFrame,
      });
      setVideoCommentDialogOpen(true);
    },
    []
  );

  /**
   * Click handler for comment markers to seek to their time.
   */
  const handleCommentClick = useCallback(
    (e: React.MouseEvent, commentId: string, commentTime: number, isDragging: boolean) => {
      if (isDragging) return;
      e.stopPropagation();
      viewerRef.current?.seekTo(commentTime);
      setSelectedVideoComment(
        selectedVideoComment === commentId ? null : commentId
      );
    },
    [viewerRef, selectedVideoComment]
  );

  return {
    // State
    videoComments,
    setVideoComments,
    selectedVideoComment,
    setSelectedVideoComment,
    videoCommentDialogOpen,
    setVideoCommentDialogOpen,
    pendingVideoComment,
    setPendingVideoComment,
    draggedComment,
    dragPreviewPosition,
    commentContainerRef,

    // Actions
    handleCreateVideoComment,
    handleDeleteVideoComment,
    handleUpdateVideoComment,
    handleCommentDragStart,
    handleVideoOverlayClick,
    handleCommentClick,
  };
}
