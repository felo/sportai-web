import { useState, useCallback } from "react";
import type { DirtyFlags } from "../types";
import type { CustomEvent, EditingMoment } from "../components";
import { generateId } from "../utils";

interface UseCustomEventsOptions {
  setDirtyFlags: React.Dispatch<React.SetStateAction<DirtyFlags>>;
}

/**
 * Hook for managing custom events (user-created markers on the timeline).
 */
export function useCustomEvents({ setDirtyFlags }: UseCustomEventsOptions) {
  // Custom events state
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  
  // Dialog state
  const [customEventDialogOpen, setCustomEventDialogOpen] = useState(false);
  const [pendingCustomEventTime, setPendingCustomEventTime] = useState<{
    time: number;
    frame: number;
  } | null>(null);
  const [editingMoment, setEditingMoment] = useState<EditingMoment | null>(null);

  /**
   * Create a new custom event.
   */
  const handleCreateCustomEvent = useCallback(
    async (eventData: Omit<CustomEvent, "id" | "createdAt">) => {
      const newEvent: CustomEvent = {
        ...eventData,
        id: generateId("custom"),
        createdAt: Date.now(),
      };

      setCustomEvents((prev) => [...prev, newEvent]);
      setPendingCustomEventTime(null);
      setDirtyFlags((prev) => ({ ...prev, customEvents: true }));
    },
    [setDirtyFlags]
  );

  /**
   * Delete a custom event.
   */
  const handleDeleteCustomEvent = useCallback(
    (eventId: string) => {
      setCustomEvents((prev) => prev.filter((e) => e.id !== eventId));
      setDirtyFlags((prev) => ({ ...prev, customEvents: true }));
    },
    [setDirtyFlags]
  );

  /**
   * Update a custom event's properties.
   */
  const handleUpdateCustomEvent = useCallback(
    (id: string, updates: { name: string; color: string }) => {
      setCustomEvents((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, name: updates.name, color: updates.color } : e
        )
      );
      setDirtyFlags((prev) => ({ ...prev, customEvents: true }));
      setEditingMoment(null);
    },
    [setDirtyFlags]
  );

  /**
   * Handle timeline area click for custom event creation.
   */
  const handleTimelineAreaClick = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement>,
      duration: number,
      videoFPS: number,
      isDragging: boolean,
      timelineRef: React.RefObject<HTMLDivElement | null>
    ) => {
      // Don't create new event if we just finished dragging
      if (isDragging) {
        return;
      }

      // Only trigger if clicking on empty space (not on existing events)
      if ((e.target as HTMLElement).closest("[data-event-marker]")) {
        return;
      }

      // Check if video is ready with valid duration
      if (duration <= 0 || !timelineRef.current) {
        return;
      }

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const time = percent * duration;
      const frame = Math.floor(time * videoFPS);

      setPendingCustomEventTime({ time, frame });
      setCustomEventDialogOpen(true);
    },
    []
  );

  /**
   * Start editing a moment (opens dialog in edit mode).
   */
  const startEditingMoment = useCallback(
    (moment: {
      id: string;
      type: "custom" | "comment";
      label: string;
      color: string;
      time: number;
      frame: number;
    }) => {
      setEditingMoment({
        id: moment.id,
        type: moment.type,
        label: moment.label,
        color: moment.color,
        time: moment.time,
        frame: moment.frame,
      });
      setCustomEventDialogOpen(true);
    },
    []
  );

  /**
   * Close the editing dialog.
   */
  const closeEditingDialog = useCallback(() => {
    setEditingMoment(null);
    setCustomEventDialogOpen(false);
  }, []);

  return {
    // State
    customEvents,
    setCustomEvents,
    customEventDialogOpen,
    setCustomEventDialogOpen,
    pendingCustomEventTime,
    setPendingCustomEventTime,
    editingMoment,
    setEditingMoment,

    // Actions
    handleCreateCustomEvent,
    handleDeleteCustomEvent,
    handleUpdateCustomEvent,
    handleTimelineAreaClick,
    startEditingMoment,
    closeEditingDialog,
  };
}
