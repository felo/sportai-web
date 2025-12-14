import { useState, useCallback, useEffect, useRef } from "react";
import type { SwingEdgeDrag, DirtyFlags } from "../types";
import type { ProtocolEvent, ViewerActions } from "@/components/videoPoseViewerV2";
import type { SwingBoundaryAdjustment } from "../utils";
import { MIN_SWING_DURATION } from "../constants";

interface UseSwingEdgeDragOptions {
  duration: number;
  videoFPS: number;
  viewerRef: React.RefObject<ViewerActions | null>;
  protocolEvents: ProtocolEvent[];
  swingBoundaryAdjustments: Map<string, SwingBoundaryAdjustment>;
  setSwingBoundaryAdjustments: React.Dispatch<
    React.SetStateAction<Map<string, SwingBoundaryAdjustment>>
  >;
  setDirtyFlags: React.Dispatch<React.SetStateAction<DirtyFlags>>;
  timelineRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hook for managing swing boundary edge dragging.
 * Allows users to adjust the start/end times of detected swings.
 */
export function useSwingEdgeDrag({
  duration,
  videoFPS,
  viewerRef,
  protocolEvents,
  swingBoundaryAdjustments,
  setSwingBoundaryAdjustments,
  setDirtyFlags,
  timelineRef,
}: UseSwingEdgeDragOptions) {
  const [swingEdgeDrag, setSwingEdgeDrag] = useState<SwingEdgeDrag | null>(null);
  const [swingEdgePreviewTime, setSwingEdgePreviewTime] = useState<number | null>(null);

  /**
   * Start dragging a swing edge.
   */
  const handleSwingEdgeDragStart = useCallback(
    (
      e: React.MouseEvent,
      eventId: string,
      edge: "start" | "end",
      originalTime: number
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setSwingEdgeDrag({ eventId, edge, originalTime });
      setSwingEdgePreviewTime(originalTime);
    },
    []
  );

  /**
   * Handle mouse move during swing edge drag.
   */
  const handleSwingEdgeDragMove = useCallback(
    (e: MouseEvent) => {
      if (!swingEdgeDrag || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percent * duration;

      setSwingEdgePreviewTime(newTime);

      // Seek video to preview position
      viewerRef.current?.seekTo(newTime);
    },
    [swingEdgeDrag, duration, timelineRef, viewerRef]
  );

  /**
   * Handle mouse up to finalize swing edge drag.
   */
  const handleSwingEdgeDragEnd = useCallback(() => {
    if (!swingEdgeDrag || swingEdgePreviewTime === null) {
      setSwingEdgeDrag(null);
      setSwingEdgePreviewTime(null);
      return;
    }

    // Find the event to get its current boundaries
    const event = protocolEvents.find((e) => e.id === swingEdgeDrag.eventId);
    if (!event) {
      setSwingEdgeDrag(null);
      setSwingEdgePreviewTime(null);
      return;
    }

    // Get existing adjustment or create new one
    const existing = swingBoundaryAdjustments.get(event.id) || {};
    const effectiveStart = existing.startTime ?? event.startTime;
    const effectiveEnd = existing.endTime ?? event.endTime;

    // Calculate new boundary
    const newAdjustment = { ...existing };
    if (swingEdgeDrag.edge === "start") {
      // Ensure start doesn't go past end
      const maxStartTime = effectiveEnd - MIN_SWING_DURATION;
      newAdjustment.startTime = Math.min(swingEdgePreviewTime, maxStartTime);
      newAdjustment.startFrame = Math.floor(newAdjustment.startTime * videoFPS);
    } else {
      // Ensure end doesn't go before start
      const minEndTime = effectiveStart + MIN_SWING_DURATION;
      newAdjustment.endTime = Math.max(swingEdgePreviewTime, minEndTime);
      newAdjustment.endFrame = Math.floor(newAdjustment.endTime * videoFPS);
    }

    setSwingBoundaryAdjustments((prev) => {
      const next = new Map(prev);
      next.set(event.id, newAdjustment);
      return next;
    });
    setDirtyFlags((prev) => ({ ...prev, swingBoundaries: true }));

    setSwingEdgeDrag(null);
    setSwingEdgePreviewTime(null);
  }, [
    swingEdgeDrag,
    swingEdgePreviewTime,
    protocolEvents,
    swingBoundaryAdjustments,
    videoFPS,
    setSwingBoundaryAdjustments,
    setDirtyFlags,
  ]);

  // Set up global mouse listeners for swing edge dragging
  useEffect(() => {
    if (swingEdgeDrag) {
      document.addEventListener("mousemove", handleSwingEdgeDragMove);
      document.addEventListener("mouseup", handleSwingEdgeDragEnd);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleSwingEdgeDragMove);
        document.removeEventListener("mouseup", handleSwingEdgeDragEnd);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [swingEdgeDrag, handleSwingEdgeDragMove, handleSwingEdgeDragEnd]);

  return {
    // State
    swingEdgeDrag,
    swingEdgePreviewTime,

    // Actions
    handleSwingEdgeDragStart,
  };
}
