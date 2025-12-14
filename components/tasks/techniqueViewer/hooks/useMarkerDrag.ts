import { useState, useCallback, useEffect, useRef } from "react";
import type { DraggedMarker, DirtyFlags } from "../types";
import type { ViewerActions } from "@/components/videoPoseViewerV2";
import type { CustomEvent } from "../components";

interface UseMarkerDragOptions {
  duration: number;
  videoFPS: number;
  viewerRef: React.RefObject<ViewerActions | null>;
  customEvents: CustomEvent[];
  setCustomEvents: React.Dispatch<React.SetStateAction<CustomEvent[]>>;
  protocolAdjustments: Map<string, { time: number; frame: number }>;
  setProtocolAdjustments: React.Dispatch<
    React.SetStateAction<Map<string, { time: number; frame: number }>>
  >;
  setDirtyFlags: React.Dispatch<React.SetStateAction<DirtyFlags>>;
}

/**
 * Hook for managing timeline marker dragging (both custom events and protocol events).
 */
export function useMarkerDrag({
  duration,
  videoFPS,
  viewerRef,
  customEvents,
  setCustomEvents,
  protocolAdjustments,
  setProtocolAdjustments,
  setDirtyFlags,
}: UseMarkerDragOptions) {
  const [draggedMarker, setDraggedMarker] = useState<DraggedMarker | null>(null);
  const [dragPreviewTime, setDragPreviewTime] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null!);

  /**
   * Start dragging a marker.
   */
  const handleMarkerDragStart = useCallback(
    (
      e: React.MouseEvent,
      type: "custom" | "protocol",
      id: string,
      originalTime: number
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggedMarker({ type, id, originalTime });
      setDragPreviewTime(originalTime);
    },
    []
  );

  /**
   * Handle mouse move during drag.
   */
  const handleMarkerDragMove = useCallback(
    (e: MouseEvent) => {
      if (!draggedMarker || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percent * duration;

      setDragPreviewTime(newTime);

      // Seek video to preview position
      viewerRef.current?.seekTo(newTime);
    },
    [draggedMarker, duration, viewerRef]
  );

  /**
   * Handle mouse up to finalize drag.
   */
  const handleMarkerDragEnd = useCallback(
    (e: MouseEvent) => {
      if (!draggedMarker || !timelineRef.current) {
        setDraggedMarker(null);
        setDragPreviewTime(null);
        return;
      }

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percent * duration;
      const newFrame = Math.floor(newTime * videoFPS);

      if (draggedMarker.type === "custom") {
        // Update custom event position
        setCustomEvents((prev) =>
          prev.map((event) =>
            event.id === draggedMarker.id
              ? { ...event, time: newTime, frame: newFrame }
              : event
          )
        );
        setDirtyFlags((prev) => ({ ...prev, customEvents: true }));
      } else {
        // Update protocol event adjustment
        setProtocolAdjustments((prev) => {
          const next = new Map(prev);
          next.set(draggedMarker.id, { time: newTime, frame: newFrame });
          return next;
        });
        setDirtyFlags((prev) => ({ ...prev, protocolAdjustments: true }));
      }

      setDraggedMarker(null);
      setDragPreviewTime(null);
    },
    [
      draggedMarker,
      duration,
      videoFPS,
      setCustomEvents,
      setProtocolAdjustments,
      setDirtyFlags,
    ]
  );

  // Set up global mouse listeners for dragging
  useEffect(() => {
    if (draggedMarker) {
      document.addEventListener("mousemove", handleMarkerDragMove);
      document.addEventListener("mouseup", handleMarkerDragEnd);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMarkerDragMove);
        document.removeEventListener("mouseup", handleMarkerDragEnd);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [draggedMarker, handleMarkerDragMove, handleMarkerDragEnd]);

  return {
    // State
    draggedMarker,
    dragPreviewTime,
    timelineRef,

    // Actions
    handleMarkerDragStart,
  };
}
