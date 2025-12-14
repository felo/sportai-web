import { Box, Tooltip } from "@radix-ui/themes";
import type { ViewerActions } from "@/components/videoPoseViewerV2";
import type { CustomEvent } from "../CustomEventDialog";
import { getTimelinePosition } from "../../utils";

interface CustomEventMarkerProps {
  event: CustomEvent;
  duration: number;
  draggedMarkerId: string | null;
  dragPreviewTime: number | null;
  viewerRef: React.RefObject<ViewerActions | null>;
  onDragStart: (
    e: React.MouseEvent,
    type: "custom" | "protocol",
    id: string,
    originalTime: number
  ) => void;
}

/**
 * Component for rendering custom event markers (user-created) on the timeline.
 */
export function CustomEventMarker({
  event,
  duration,
  draggedMarkerId,
  dragPreviewTime,
  viewerRef,
  onDragStart,
}: CustomEventMarkerProps) {
  const isDragging = draggedMarkerId === event.id;
  const effectiveTime =
    isDragging && dragPreviewTime !== null ? dragPreviewTime : event.time;
  const positionPercent = getTimelinePosition(effectiveTime, duration);

  return (
    <Tooltip
      content={`${event.name} (${effectiveTime.toFixed(2)}s) - drag to move, right-click to delete`}
    >
      <Box
        data-event-marker
        data-marker-id={event.id}
        data-marker-type="custom"
        onMouseDown={(e) => onDragStart(e, "custom", event.id, event.time)}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDragging) viewerRef.current?.seekTo(event.time);
        }}
        style={{
          position: "absolute",
          left: `${positionPercent}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "20px",
          height: "20px",
          backgroundColor: event.color,
          borderRadius: "50%",
          cursor: isDragging ? "grabbing" : "grab",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isDragging
            ? `0 0 16px ${event.color}`
            : `0 0 8px ${event.color}99`,
          transition: isDragging ? "none" : "transform 0.15s, box-shadow 0.15s",
          border: "2px solid rgba(255, 255, 255, 0.4)",
          zIndex: isDragging ? 100 : 15,
          opacity: isDragging ? 0.9 : 1,
        }}
      />
    </Tooltip>
  );
}
