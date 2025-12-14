import { Box, Tooltip } from "@radix-ui/themes";
import {
  RocketIcon,
  TargetIcon,
  CheckCircledIcon,
} from "@radix-ui/react-icons";
import type { ProtocolEvent, ViewerActions } from "@/components/videoPoseViewerV2";
import { getProtocolEventTime, getTimelinePosition } from "../../utils";
import type { ProtocolAdjustment } from "../../utils";

interface ProtocolEventMarkerProps {
  event: ProtocolEvent;
  duration: number;
  protocolAdjustments: Map<string, ProtocolAdjustment>;
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

// Icon mapping by protocol ID
const PROTOCOL_ICONS: Record<string, typeof RocketIcon> = {
  "loading-position": RocketIcon,
  "serve-preparation": RocketIcon,
  "tennis-contact-point": TargetIcon,
  "serve-follow-through": CheckCircledIcon,
};

// Color mapping by protocol ID
const PROTOCOL_COLORS: Record<string, string> = {
  "loading-position": "#F59E0B",
  "serve-preparation": "#F59E0B",
  "tennis-contact-point": "#FFE66D",
  "serve-follow-through": "#95E1D3",
};

// Shadow color mapping
const PROTOCOL_SHADOW_COLORS: Record<string, string> = {
  "loading-position": "rgba(245, 158, 11, 0.6)",
  "serve-preparation": "rgba(245, 158, 11, 0.6)",
  "tennis-contact-point": "rgba(255, 230, 109, 0.6)",
  "serve-follow-through": "rgba(149, 225, 211, 0.6)",
};

// Tooltip content builders
function getTooltipContent(event: ProtocolEvent, effectiveTime: number, isAdjusted: boolean): string {
  const metadata = event.metadata as Record<string, unknown>;
  
  switch (event.protocolId) {
    case "loading-position": {
      const orientation = metadata?.loadingPeakOrientation as number;
      return `Loading Position: ${orientation?.toFixed(0)}° (${effectiveTime.toFixed(2)}s)${isAdjusted ? " [adjusted]" : ""} - drag to move`;
    }
    case "serve-preparation": {
      const armHeight = metadata?.armHeight as number;
      return `Preparation: ${armHeight?.toFixed(1)}x above shoulder (${effectiveTime.toFixed(2)}s)${isAdjusted ? " [adjusted]" : ""} - drag to move`;
    }
    case "tennis-contact-point": {
      const contactHeight = metadata?.contactPointHeight as number;
      return `Contact Point: ${contactHeight?.toFixed(1)}x above shoulder (${effectiveTime.toFixed(2)}s)${isAdjusted ? " [adjusted]" : ""} - drag to move`;
    }
    case "serve-follow-through":
      return `Follow Through (${effectiveTime.toFixed(2)}s)${isAdjusted ? " [adjusted]" : ""} - drag to move`;
    default:
      return `${event.label} (${effectiveTime.toFixed(2)}s)${isAdjusted ? " [adjusted]" : ""} - drag to move`;
  }
}

/**
 * Reusable component for rendering protocol event markers on the timeline.
 */
export function ProtocolEventMarker({
  event,
  duration,
  protocolAdjustments,
  draggedMarkerId,
  dragPreviewTime,
  viewerRef,
  onDragStart,
}: ProtocolEventMarkerProps) {
  const isDragging = draggedMarkerId === event.id;
  const effectiveTime =
    isDragging && dragPreviewTime !== null
      ? dragPreviewTime
      : getProtocolEventTime(event, protocolAdjustments);
  const positionPercent = getTimelinePosition(effectiveTime, duration);
  const isAdjusted = protocolAdjustments.has(event.id);

  const IconComponent = PROTOCOL_ICONS[event.protocolId] || RocketIcon;
  const bgColor = PROTOCOL_COLORS[event.protocolId] || "#F59E0B";
  const shadowColor = PROTOCOL_SHADOW_COLORS[event.protocolId] || "rgba(245, 158, 11, 0.6)";

  return (
    <Tooltip content={getTooltipContent(event, effectiveTime, isAdjusted)}>
      <Box
        data-event-marker
        data-marker-id={event.id}
        data-marker-type="protocol"
        onMouseDown={(e) => onDragStart(e, "protocol", event.id, event.startTime)}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDragging) viewerRef.current?.seekTo(effectiveTime);
        }}
        style={{
          position: "absolute",
          left: `${positionPercent}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "20px",
          height: "20px",
          backgroundColor: bgColor,
          borderRadius: "50%",
          cursor: isDragging ? "grabbing" : "grab",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isDragging
            ? `0 0 16px ${shadowColor.replace("0.6", "0.9")}`
            : `0 0 8px ${shadowColor}`,
          transition: isDragging ? "none" : "transform 0.15s, box-shadow 0.15s",
          border: isAdjusted
            ? "2px solid rgba(255, 255, 255, 0.8)"
            : "2px solid rgba(255, 255, 255, 0.3)",
          zIndex: isDragging ? 100 : 10,
          opacity: isDragging ? 0.9 : 1,
        }}
      >
        <IconComponent width={12} height={12} style={{ color: "black" }} />
      </Box>
    </Tooltip>
  );
}
