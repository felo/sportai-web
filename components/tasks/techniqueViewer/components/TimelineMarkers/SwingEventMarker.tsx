import { Box, Tooltip, Text } from "@radix-ui/themes";
import type { ProtocolEvent, ViewerActions } from "@/components/videoPoseViewerV2";
import { getEffectiveSwingBoundaries, getTimelinePosition } from "../../utils";
import type { SwingBoundaryAdjustment } from "../../utils";
import { MIN_SWING_DURATION } from "../../constants";

interface SwingEventMarkerProps {
  event: ProtocolEvent;
  duration: number;
  swingBoundaryAdjustments: Map<string, SwingBoundaryAdjustment>;
  swingEdgeDrag: {
    eventId: string;
    edge: "start" | "end";
    originalTime: number;
  } | null;
  swingEdgePreviewTime: number | null;
  viewerRef: React.RefObject<ViewerActions | null>;
  onSwingEdgeDragStart: (
    e: React.MouseEvent,
    eventId: string,
    edge: "start" | "end",
    originalTime: number
  ) => void;
}

/**
 * Component for rendering swing event markers (blue ranges) on the timeline.
 * Includes draggable handles for adjusting swing boundaries.
 */
export function SwingEventMarker({
  event,
  duration,
  swingBoundaryAdjustments,
  swingEdgeDrag,
  swingEdgePreviewTime,
  viewerRef,
  onSwingEdgeDragStart,
}: SwingEventMarkerProps) {
  const { startTime, endTime, isAdjusted } = getEffectiveSwingBoundaries(
    event,
    swingBoundaryAdjustments
  );
  const isDraggingThis = swingEdgeDrag?.eventId === event.id;

  // Use preview time if dragging this event's edge
  let displayStartTime = startTime;
  let displayEndTime = endTime;
  if (isDraggingThis && swingEdgePreviewTime !== null) {
    if (swingEdgeDrag!.edge === "start") {
      displayStartTime = Math.min(swingEdgePreviewTime, endTime - MIN_SWING_DURATION);
    } else {
      displayEndTime = Math.max(swingEdgePreviewTime, startTime + MIN_SWING_DURATION);
    }
  }

  const startPercent = getTimelinePosition(displayStartTime, duration);
  const endPercent = getTimelinePosition(displayEndTime, duration);
  const widthPercent = Math.max(1, endPercent - startPercent);
  const isRange = event.endFrame !== event.startFrame;
  const color = "var(--blue-9)";

  return (
    <Box
      key={event.id}
      data-event-marker
      style={{
        position: "absolute",
        left: `${startPercent}%`,
        top: "50%",
        transform: "translateY(-50%)",
        width: isRange ? `${widthPercent}%` : "6px",
        height: "18px",
      }}
    >
      {/* Main swing bar */}
      <Tooltip
        content={`${event.label} (${displayStartTime.toFixed(2)}s - ${displayEndTime.toFixed(2)}s)${isAdjusted ? " [adjusted]" : ""}`}
      >
        <Box
          onClick={(e) => {
            e.stopPropagation();
            viewerRef.current?.seekTo(displayStartTime);
          }}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: color,
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isDraggingThis
              ? `0 0 12px ${color}`
              : `0 0 8px ${color}80`,
            transition: isDraggingThis ? "none" : "box-shadow 0.15s",
            border: isAdjusted ? "2px solid white" : "none",
          }}
        >
          {isRange && widthPercent > 3 && (
            <Text
              size="1"
              style={{ color: "black", fontSize: "9px", fontWeight: 600 }}
            >
              {event.label.split(" ")[0] === "?"
                ? "Swing"
                : event.label.split(" ")[0]}
            </Text>
          )}
        </Box>
      </Tooltip>

      {/* Left drag handle (start edge) */}
      {isRange && (
        <Box
          onMouseDown={(e) =>
            onSwingEdgeDragStart(e, event.id, "start", displayStartTime)
          }
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "8px",
            cursor: "ew-resize",
            backgroundColor:
              isDraggingThis && swingEdgeDrag?.edge === "start"
                ? "rgba(255, 255, 255, 0.9)"
                : "rgba(255, 255, 255, 0.4)",
            borderRadius: "4px 0 0 4px",
            transition: "background-color 0.15s",
            zIndex: 10,
          }}
        />
      )}

      {/* Right drag handle (end edge) */}
      {isRange && (
        <Box
          onMouseDown={(e) =>
            onSwingEdgeDragStart(e, event.id, "end", displayEndTime)
          }
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "8px",
            cursor: "ew-resize",
            backgroundColor:
              isDraggingThis && swingEdgeDrag?.edge === "end"
                ? "rgba(255, 255, 255, 0.9)"
                : "rgba(255, 255, 255, 0.4)",
            borderRadius: "0 4px 4px 0",
            transition: "background-color 0.15s",
            zIndex: 10,
          }}
        />
      )}
    </Box>
  );
}
