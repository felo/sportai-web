"use client";

/**
 * PlaybackTimeline
 * 
 * A playback slider with protocol event markers.
 * Shows detected swings, contact points, and other events on the timeline.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Box, Flex, Text, Tooltip } from "@radix-ui/themes";
import type { ProtocolEvent } from "./types";
import { PROTOCOL_EVENT_COLORS, AVAILABLE_PROTOCOLS } from "./types";

// ============================================================================
// Props
// ============================================================================

interface PlaybackTimelineProps {
  /** Current time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Current frame number */
  currentFrame: number;
  /** Total frame count */
  totalFrames: number;
  /** Video FPS */
  fps: number;
  /** Protocol events to display */
  events: ProtocolEvent[];
  /** Whether video is playing */
  isPlaying: boolean;
  /** Seek to time callback */
  onSeek: (time: number) => void;
  /** Seek to frame callback */
  onSeekFrame: (frame: number) => void;
  /** Whether the timeline is disabled */
  disabled?: boolean;
  /** Show event labels on hover */
  showEventLabels?: boolean;
  /** Height of the timeline track */
  trackHeight?: number;
  /** Height of event markers */
  eventMarkerHeight?: number;
}

// ============================================================================
// Component
// ============================================================================

export function PlaybackTimeline({
  currentTime,
  duration,
  currentFrame,
  totalFrames,
  fps,
  events,
  isPlaying,
  onSeek,
  onSeekFrame,
  disabled = false,
  showEventLabels = true,
  trackHeight = 8,
  eventMarkerHeight = 20,
}: PlaybackTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<ProtocolEvent | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; time: number } | null>(null);

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Group events by type for layered display
  const eventsByProtocol = useMemo(() => {
    const grouped = new Map<string, ProtocolEvent[]>();
    for (const event of events) {
      const list = grouped.get(event.protocolId) || [];
      list.push(event);
      grouped.set(event.protocolId, list);
    }
    return grouped;
  }, [events]);

  // Get position percentage for a time value
  const getPositionPercent = useCallback(
    (time: number) => {
      if (duration <= 0) return 0;
      return (time / duration) * 100;
    },
    [duration]
  );

  // Handle click/drag on track
  const handleTrackInteraction = useCallback(
    (clientX: number) => {
      if (disabled || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percent * duration;
      onSeek(newTime);
    },
    [disabled, duration, onSeek]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      setIsDragging(true);
      handleTrackInteraction(e.clientX);
    },
    [disabled, handleTrackInteraction]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const time = percent * duration;

      setHoverPosition({ x, time });

      if (isDragging) {
        handleTrackInteraction(e.clientX);
      }
    },
    [isDragging, duration, handleTrackInteraction]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoverPosition(null);
    setHoveredEvent(null);
  }, []);

  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  }, []);

  return (
    <Box
      style={{
        width: "100%",
        padding: "8px 0",
        userSelect: "none",
      }}
    >
      {/* Time display */}
      <Flex justify="between" style={{ marginBottom: "4px" }}>
        <Text size="1" style={{ fontFamily: "monospace", color: "var(--gray-11)" }}>
          {formatTime(currentTime)}
        </Text>
        <Text size="1" style={{ fontFamily: "monospace", color: "var(--gray-11)" }}>
          Frame {currentFrame} / {totalFrames}
        </Text>
        <Text size="1" style={{ fontFamily: "monospace", color: "var(--gray-11)" }}>
          {formatTime(duration)}
        </Text>
      </Flex>

      {/* Timeline container */}
      <Box
        style={{
          position: "relative",
          paddingTop: `${eventMarkerHeight + 4}px`,
        }}
      >
        {/* Event markers layer */}
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: `${eventMarkerHeight}px`,
            pointerEvents: "none",
          }}
        >
          {events.map((event) => {
            const startPercent = getPositionPercent(event.startTime);
            const endPercent = getPositionPercent(event.endTime);
            const widthPercent = Math.max(0.5, endPercent - startPercent);
            const color = event.color || PROTOCOL_EVENT_COLORS[event.protocolId] || "#888";
            const isRange = event.endFrame !== event.startFrame;

            return (
              <Tooltip key={event.id} content={`${event.label} (${formatTime(event.startTime)})`}>
                <Box
                  style={{
                    position: "absolute",
                    left: `${startPercent}%`,
                    width: isRange ? `${widthPercent}%` : "4px",
                    height: "100%",
                    backgroundColor: color,
                    borderRadius: isRange ? "3px" : "2px",
                    opacity: hoveredEvent?.id === event.id ? 1 : 0.8,
                    cursor: "pointer",
                    pointerEvents: "auto",
                    transition: "opacity 0.15s, transform 0.15s",
                    transform: hoveredEvent?.id === event.id ? "scaleY(1.1)" : "scaleY(1)",
                    boxShadow: hoveredEvent?.id === event.id
                      ? `0 2px 8px ${color}66`
                      : "none",
                  }}
                  onMouseEnter={() => setHoveredEvent(event)}
                  onMouseLeave={() => setHoveredEvent(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(event.startTime);
                  }}
                />
              </Tooltip>
            );
          })}
        </Box>

        {/* Track background */}
        <Box
          ref={trackRef}
          style={{
            position: "relative",
            height: `${trackHeight}px`,
            backgroundColor: "var(--gray-4)",
            borderRadius: `${trackHeight / 2}px`,
            cursor: disabled ? "default" : "pointer",
            overflow: "hidden",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Progress fill */}
          <Box
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: `${progress}%`,
              backgroundColor: "var(--accent-9)",
              borderRadius: `${trackHeight / 2}px`,
              transition: isDragging ? "none" : "width 0.05s",
            }}
          />

          {/* Playhead */}
          <Box
            style={{
              position: "absolute",
              top: "50%",
              left: `${progress}%`,
              transform: "translate(-50%, -50%)",
              width: "14px",
              height: "14px",
              backgroundColor: "white",
              borderRadius: "50%",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              border: "2px solid var(--accent-9)",
              transition: isDragging ? "none" : "left 0.05s",
            }}
          />

          {/* Hover indicator */}
          {hoverPosition && !isDragging && (
            <Box
              style={{
                position: "absolute",
                top: 0,
                left: `${(hoverPosition.time / duration) * 100}%`,
                width: "2px",
                height: "100%",
                backgroundColor: "var(--gray-8)",
                transform: "translateX(-50%)",
                pointerEvents: "none",
              }}
            />
          )}
        </Box>

        {/* Hover time tooltip */}
        {hoverPosition && !isDragging && (
          <Box
            style={{
              position: "absolute",
              top: `${eventMarkerHeight + trackHeight + 8}px`,
              left: `${(hoverPosition.time / duration) * 100}%`,
              transform: "translateX(-50%)",
              backgroundColor: "var(--gray-12)",
              color: "var(--gray-1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "10px",
              fontFamily: "monospace",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            {formatTime(hoverPosition.time)} (F{Math.floor(hoverPosition.time * fps)})
          </Box>
        )}
      </Box>

      {/* Event legend */}
      {events.length > 0 && showEventLabels && (
        <Flex wrap="wrap" gap="2" style={{ marginTop: "8px" }}>
          {Array.from(eventsByProtocol.entries()).map(([protocolId, protocolEvents]) => {
            const protocol = AVAILABLE_PROTOCOLS.find((p) => p.id === protocolId);
            const color = PROTOCOL_EVENT_COLORS[protocolId] || "#888";
            return (
              <Flex key={protocolId} align="center" gap="1">
                <Box
                  style={{
                    width: "8px",
                    height: "8px",
                    backgroundColor: color,
                    borderRadius: "2px",
                  }}
                />
                <Text size="1" color="gray">
                  {protocol?.name || protocolId} ({protocolEvents.length})
                </Text>
              </Flex>
            );
          })}
        </Flex>
      )}

      {/* Hovered event details */}
      {hoveredEvent && (
        <Box
          style={{
            marginTop: "8px",
            padding: "8px 12px",
            backgroundColor: "var(--gray-3)",
            borderRadius: "6px",
            borderLeft: `3px solid ${hoveredEvent.color || PROTOCOL_EVENT_COLORS[hoveredEvent.protocolId]}`,
          }}
        >
          <Text size="2" weight="medium" style={{ display: "block" }}>
            {hoveredEvent.label}
          </Text>
          <Flex gap="3" style={{ marginTop: "4px" }}>
            <Text size="1" color="gray">
              {formatTime(hoveredEvent.startTime)}
              {hoveredEvent.endFrame !== hoveredEvent.startFrame && ` → ${formatTime(hoveredEvent.endTime)}`}
            </Text>
            <Text size="1" color="gray">
              Frame {hoveredEvent.startFrame}
              {hoveredEvent.endFrame !== hoveredEvent.startFrame && ` → ${hoveredEvent.endFrame}`}
            </Text>
          </Flex>
        </Box>
      )}
    </Box>
  );
}

export default PlaybackTimeline;

