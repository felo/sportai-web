"use client";

import { useCallback } from "react";
import { Box, Flex, Text, ContextMenu } from "@radix-ui/themes";
import { PlusIcon, ResetIcon, TrashIcon } from "@radix-ui/react-icons";
import type { ProtocolEvent, ViewerActions } from "@/components/videoPoseViewerV2";
import type { CustomEvent, VideoComment } from "./index";
import type { ContextMenuTarget, ContextMenuPosition, DirtyFlags } from "../types";
import type { SwingBoundaryAdjustment, ProtocolAdjustment } from "../utils";
import { TIMELINE_MARKERS } from "../constants";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  SwingEventMarker,
  ProtocolEventMarker,
  CustomEventMarker,
  VideoCommentIndicator,
} from "./TimelineMarkers";

interface TimelineScrubberProps {
  // Viewer state
  currentTime: number;
  currentFrame: number;
  duration: number;
  totalFrames: number;
  videoFPS: number;
  
  // Events
  protocolEvents: ProtocolEvent[];
  customEvents: CustomEvent[];
  videoComments: VideoComment[];
  
  // Adjustments
  protocolAdjustments: Map<string, ProtocolAdjustment>;
  swingBoundaryAdjustments: Map<string, SwingBoundaryAdjustment>;
  
  // Drag state
  draggedMarker: { type: "custom" | "protocol"; id: string; originalTime: number } | null;
  dragPreviewTime: number | null;
  swingEdgeDrag: { eventId: string; edge: "start" | "end"; originalTime: number } | null;
  swingEdgePreviewTime: number | null;
  timelineRef: React.RefObject<HTMLDivElement>;
  
  // Context menu
  contextMenuTarget: ContextMenuTarget | null;
  setContextMenuTarget: React.Dispatch<React.SetStateAction<ContextMenuTarget | null>>;
  contextMenuPosition: ContextMenuPosition | null;
  setContextMenuPosition: React.Dispatch<React.SetStateAction<ContextMenuPosition | null>>;
  
  // Actions
  viewerRef: React.RefObject<ViewerActions | null>;
  onMarkerDragStart: (
    e: React.MouseEvent,
    type: "custom" | "protocol",
    id: string,
    originalTime: number
  ) => void;
  onSwingEdgeDragStart: (
    e: React.MouseEvent,
    eventId: string,
    edge: "start" | "end",
    originalTime: number
  ) => void;
  onTimelineAreaClick: (
    e: React.MouseEvent<HTMLDivElement>,
    duration: number,
    videoFPS: number,
    isDragging: boolean,
    timelineRef: React.RefObject<HTMLDivElement | null>
  ) => void;
  setCustomEvents: React.Dispatch<React.SetStateAction<CustomEvent[]>>;
  setProtocolAdjustments: React.Dispatch<React.SetStateAction<Map<string, ProtocolAdjustment>>>;
  setDirtyFlags: React.Dispatch<React.SetStateAction<DirtyFlags>>;
  setPendingCustomEventTime: React.Dispatch<React.SetStateAction<{ time: number; frame: number } | null>>;
  setCustomEventDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Timeline scrubber with event markers, context menu, and seek functionality.
 */
export function TimelineScrubber({
  currentTime,
  currentFrame,
  duration,
  totalFrames,
  videoFPS,
  protocolEvents,
  customEvents,
  videoComments,
  protocolAdjustments,
  swingBoundaryAdjustments,
  draggedMarker,
  dragPreviewTime,
  swingEdgeDrag,
  swingEdgePreviewTime,
  timelineRef,
  contextMenuTarget,
  setContextMenuTarget,
  contextMenuPosition,
  setContextMenuPosition,
  viewerRef,
  onMarkerDragStart,
  onSwingEdgeDragStart,
  onTimelineAreaClick,
  setCustomEvents,
  setProtocolAdjustments,
  setDirtyFlags,
  setPendingCustomEventTime,
  setCustomEventDialogOpen,
}: TimelineScrubberProps) {
  const isMobile = useIsMobile();
  
  // Context menu handlers
  const handleContextMenuAddMarker = useCallback(() => {
    if (contextMenuPosition) {
      setPendingCustomEventTime(contextMenuPosition);
      setCustomEventDialogOpen(true);
    }
    setContextMenuPosition(null);
    setContextMenuTarget(null);
  }, [contextMenuPosition, setPendingCustomEventTime, setCustomEventDialogOpen, setContextMenuPosition, setContextMenuTarget]);

  const handleContextMenuResetPosition = useCallback(() => {
    if (contextMenuTarget?.type === "protocol" && contextMenuTarget.id) {
      setProtocolAdjustments((prev) => {
        const next = new Map(prev);
        next.delete(contextMenuTarget.id!);
        return next;
      });
      setDirtyFlags((prev) => ({ ...prev, protocolAdjustments: true }));
    }
    setContextMenuPosition(null);
    setContextMenuTarget(null);
  }, [contextMenuTarget, setProtocolAdjustments, setDirtyFlags, setContextMenuPosition, setContextMenuTarget]);

  const handleContextMenuDeleteMarker = useCallback(() => {
    if (contextMenuTarget?.type === "custom" && contextMenuTarget.id) {
      setCustomEvents((prev) => prev.filter((e) => e.id !== contextMenuTarget.id));
      setDirtyFlags((prev) => ({ ...prev, customEvents: true }));
    }
    setContextMenuPosition(null);
    setContextMenuTarget(null);
  }, [contextMenuTarget, setCustomEvents, setDirtyFlags, setContextMenuPosition, setContextMenuTarget]);

  // Handle timeline context menu
  const handleTimelineContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!timelineRef.current || duration <= 0) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const time = percent * duration;
      const frame = Math.floor(time * videoFPS);
      setContextMenuPosition({ time, frame });

      // Check if clicking on a marker
      const target = e.target as HTMLElement;
      const marker = target.closest("[data-event-marker]");
      if (marker) {
        const markerId = marker.getAttribute("data-marker-id");
        const markerType = marker.getAttribute("data-marker-type") as "custom" | "protocol";
        if (markerId && markerType) {
          setContextMenuTarget({ type: markerType, id: markerId });
        }
      } else {
        setContextMenuTarget({ type: "empty" });
      }
    },
    [duration, videoFPS, timelineRef, setContextMenuPosition, setContextMenuTarget]
  );

  // Swing events
  const swingEvents = protocolEvents.filter((e) => e.protocolId === "swing-detection-v3");
  
  // Other protocol events by type
  const loadingPositionEvents = protocolEvents.filter((e) => e.protocolId === "loading-position");
  const servePreparationEvents = protocolEvents.filter((e) => e.protocolId === "serve-preparation");
  const contactPointEvents = protocolEvents.filter((e) => e.protocolId === "tennis-contact-point");
  const followThroughEvents = protocolEvents.filter((e) => e.protocolId === "serve-follow-through");

  return (
    <Box
      style={{
        padding: "8px 16px 12px",
        backgroundColor: "var(--gray-1)",
        borderTop: "1px solid var(--gray-6)",
      }}
    >
      {/* Time display */}
      <Flex justify="between" style={{ marginBottom: "6px" }}>
        <Text
          size="1"
          style={{ color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace" }}
        >
          {currentTime.toFixed(2)}s
        </Text>
        <Text
          size="1"
          style={{ color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace" }}
        >
          {currentFrame} / {totalFrames}
        </Text>
        <Text
          size="1"
          style={{ color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace" }}
        >
          {duration.toFixed(2)}s
        </Text>
      </Flex>

      {/* Event Markers */}
      <ContextMenu.Root
        onOpenChange={(open) => {
          if (!open) {
            setContextMenuTarget(null);
            setContextMenuPosition(null);
          }
        }}
      >
        <ContextMenu.Trigger>
          <Box
            ref={timelineRef}
            onClick={(e) =>
              onTimelineAreaClick(e, duration, videoFPS, !!draggedMarker, timelineRef)
            }
            onContextMenu={handleTimelineContextMenu}
            onMouseEnter={(e) => {
              if (!draggedMarker) {
                e.currentTarget.style.backgroundColor = "rgba(122, 219, 143, 0.1)";
                e.currentTarget.style.borderColor = "rgba(122, 219, 143, 0.7)";
              }
            }}
            onMouseLeave={(e) => {
              if (!draggedMarker) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
              }
            }}
            style={{
              position: "relative",
              height: "24px",
              marginBottom: "4px",
              cursor: draggedMarker ? "grabbing" : "crosshair",
              backgroundColor: draggedMarker
                ? "rgba(122, 219, 143, 0.15)"
                : "transparent",
              borderRadius: "4px",
              border: draggedMarker
                ? "1px solid rgba(122, 219, 143, 0.7)"
                : "1px dashed rgba(255, 255, 255, 0.5)",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
            }}
          >
            {/* Swing events */}
            {swingEvents.map((event) => (
              <SwingEventMarker
                key={event.id}
                event={event}
                duration={duration}
                swingBoundaryAdjustments={swingBoundaryAdjustments}
                swingEdgeDrag={swingEdgeDrag}
                swingEdgePreviewTime={swingEdgePreviewTime}
                viewerRef={viewerRef}
                onSwingEdgeDragStart={onSwingEdgeDragStart}
              />
            ))}

            {/* Loading position events */}
            {loadingPositionEvents.map((event) => (
              <ProtocolEventMarker
                key={event.id}
                event={event}
                duration={duration}
                protocolAdjustments={protocolAdjustments}
                draggedMarkerId={draggedMarker?.id ?? null}
                dragPreviewTime={dragPreviewTime}
                viewerRef={viewerRef}
                onDragStart={onMarkerDragStart}
              />
            ))}

            {/* Serve preparation events */}
            {servePreparationEvents.map((event) => (
              <ProtocolEventMarker
                key={event.id}
                event={event}
                duration={duration}
                protocolAdjustments={protocolAdjustments}
                draggedMarkerId={draggedMarker?.id ?? null}
                dragPreviewTime={dragPreviewTime}
                viewerRef={viewerRef}
                onDragStart={onMarkerDragStart}
              />
            ))}

            {/* Contact point events */}
            {contactPointEvents.map((event) => (
              <ProtocolEventMarker
                key={event.id}
                event={event}
                duration={duration}
                protocolAdjustments={protocolAdjustments}
                draggedMarkerId={draggedMarker?.id ?? null}
                dragPreviewTime={dragPreviewTime}
                viewerRef={viewerRef}
                onDragStart={onMarkerDragStart}
              />
            ))}

            {/* Follow-through events */}
            {followThroughEvents.map((event) => (
              <ProtocolEventMarker
                key={event.id}
                event={event}
                duration={duration}
                protocolAdjustments={protocolAdjustments}
                draggedMarkerId={draggedMarker?.id ?? null}
                dragPreviewTime={dragPreviewTime}
                viewerRef={viewerRef}
                onDragStart={onMarkerDragStart}
              />
            ))}

            {/* Custom events */}
            {customEvents.map((event) => (
              <CustomEventMarker
                key={event.id}
                event={event}
                duration={duration}
                draggedMarkerId={draggedMarker?.id ?? null}
                dragPreviewTime={dragPreviewTime}
                viewerRef={viewerRef}
                onDragStart={onMarkerDragStart}
              />
            ))}

            {/* Video comment indicators */}
            {videoComments.map((comment) => (
              <VideoCommentIndicator
                key={comment.id}
                comment={comment}
                duration={duration}
                viewerRef={viewerRef}
              />
            ))}

            {/* Hint text - shows different message on mobile vs desktop */}
            {customEvents.length === 0 && (
              <Flex
                align="center"
                justify="center"
                gap="1"
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              >
                <Text
                  size="1"
                  style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "10px" }}
                >
                  {isMobile ? "+ Tap to add marker" : "+ Right-click to add marker"}
                </Text>
              </Flex>
            )}
          </Box>
        </ContextMenu.Trigger>
        <ContextMenu.Content size="1">
          <ContextMenu.Item onClick={handleContextMenuAddMarker}>
            <Flex align="center" gap="2">
              <PlusIcon />
              <Text>Add marker here</Text>
            </Flex>
          </ContextMenu.Item>
          {contextMenuTarget?.type === "protocol" &&
            protocolAdjustments.has(contextMenuTarget.id!) && (
              <ContextMenu.Item onClick={handleContextMenuResetPosition}>
                <Flex align="center" gap="2">
                  <ResetIcon />
                  <Text>Reset to original position</Text>
                </Flex>
              </ContextMenu.Item>
            )}
          {contextMenuTarget?.type === "custom" && (
            <>
              <ContextMenu.Separator />
              <ContextMenu.Item color="red" onClick={handleContextMenuDeleteMarker}>
                <Flex align="center" gap="2">
                  <TrashIcon />
                  <Text>Delete marker</Text>
                </Flex>
              </ContextMenu.Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Root>

      {/* Draggable Timeline */}
      <Box
        style={{
          position: "relative",
          height: "32px",
          backgroundColor: "var(--gray-3)",
          borderRadius: "4px",
          cursor: "pointer",
          touchAction: "none",
        }}
        onMouseDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const handleSeek = (clientX: number) => {
            const x = clientX - rect.left;
            const percent = Math.max(0, Math.min(1, x / rect.width));
            const time = percent * duration;
            viewerRef.current?.seekTo(time);
          };

          handleSeek(e.clientX);

          const handleMouseMove = (moveEvent: MouseEvent) => {
            handleSeek(moveEvent.clientX);
          };

          const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
          };

          document.addEventListener("mousemove", handleMouseMove);
          document.addEventListener("mouseup", handleMouseUp);
        }}
      >
        {/* Progress bar */}
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
            backgroundColor: "#7ADB8F",
            borderRadius: "4px 0 0 4px",
            transition: "width 0.05s ease-out",
          }}
        />

        {/* Playhead */}
        <Box
          style={{
            position: "absolute",
            top: "-2px",
            left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
            transform: "translateX(-50%)",
            width: "4px",
            height: "36px",
            backgroundColor: "#fff",
            borderRadius: "2px",
            boxShadow: "0 0 4px rgba(0, 0, 0, 0.5)",
          }}
        />

        {/* Frame markers (every 10%) */}
        {TIMELINE_MARKERS.map((percent) => (
          <Box
            key={percent}
            style={{
              position: "absolute",
              top: "50%",
              left: `${percent}%`,
              transform: "translateY(-50%)",
              width: "1px",
              height: "12px",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
