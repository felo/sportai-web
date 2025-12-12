"use client";

/**
 * MomentsGalleryView
 *
 * Gallery view displaying all detected moments (protocol events, custom events, video comments)
 * with frame thumbnails and action buttons.
 */

import { useMemo, useState, useCallback } from "react";
import { Box, Flex, Text, Select, Badge } from "@radix-ui/themes";
import {
  BookmarkIcon,
  MixerHorizontalIcon,
  ClockIcon,
} from "@radix-ui/react-icons";
import { MomentCard, type Moment, type MomentType } from "./MomentCard";
import type { ProtocolEvent } from "@/components/videoPoseViewerV2";
import type { CustomEvent } from "./CustomEventDialog";
import type { VideoComment } from "./VideoCommentDialog";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";

// ============================================================================
// Types
// ============================================================================

type FilterOption = "all" | "protocols" | "custom" | "comments" | string;
type SortOption = "time" | "type" | "confidence";

interface MomentsGalleryViewProps {
  /** Protocol events (from swing detection, etc.) */
  protocolEvents: ProtocolEvent[];
  /** Custom user-created events */
  customEvents: CustomEvent[];
  /** Video comments */
  videoComments: VideoComment[];
  /** Protocol event adjustments (event ID -> adjusted position) */
  protocolAdjustments: Map<string, { time: number; frame: number }>;
  /** Swing boundary adjustments */
  swingBoundaryAdjustments: Map<string, {
    startTime?: number;
    startFrame?: number;
    endTime?: number;
    endFrame?: number;
  }>;
  /** Video element for frame capture */
  videoElement: HTMLVideoElement | null;
  /** Callback when user clicks View on a moment */
  onViewMoment: (time: number) => void;
  /** Callback when user clicks Analyse on a moment */
  onAnalyseMoment: (moment: Moment) => void;
  /** Preprocessed pose data by frame number */
  poseData?: Map<number, PoseDetectionResult[]>;
  /** Callback when user deletes a custom event or comment */
  onDeleteMoment?: (moment: Moment) => void;
  /** Callback when user resets a protocol event adjustment */
  onResetAdjustment?: (moment: Moment) => void;
  /** Callback when user wants to edit a moment's name */
  onEditMomentName?: (moment: Moment) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getProtocolEventColor(protocolId: string): string {
  const colors: Record<string, string> = {
    "swing-detection-v3": "#8B5CF6",
    "swing-detection-v2": "#4ECDC4",
    "swing-detection-v1": "#FF6B6B",
    "loading-position": "#F59E0B",
    "serve-preparation": "#F59E0B",
    "tennis-contact-point": "#FFE66D",
    "serve-follow-through": "#95E1D3",
  };
  return colors[protocolId] || "#888";
}

// ============================================================================
// Component
// ============================================================================

export function MomentsGalleryView({
  protocolEvents,
  customEvents,
  videoComments,
  protocolAdjustments,
  swingBoundaryAdjustments,
  videoElement,
  onViewMoment,
  onAnalyseMoment,
  poseData,
  onDeleteMoment,
  onResetAdjustment,
  onEditMomentName,
}: MomentsGalleryViewProps) {
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sort, setSort] = useState<SortOption>("time");

  // Get pose confidence for a specific frame
  const getPoseConfidence = useCallback((frame: number): number | null => {
    if (!poseData) return null;
    const poses = poseData.get(frame);
    if (!poses || poses.length === 0) return null;
    // Return the score of the first (primary) pose
    return poses[0].score ?? null;
  }, [poseData]);

  // Handle delete
  const handleDelete = useCallback((moment: Moment) => {
    onDeleteMoment?.(moment);
  }, [onDeleteMoment]);

  // Handle reset adjustment
  const handleResetAdjustment = useCallback((moment: Moment) => {
    onResetAdjustment?.(moment);
  }, [onResetAdjustment]);

  // Handle edit name
  const handleEditName = useCallback((moment: Moment) => {
    onEditMomentName?.(moment);
  }, [onEditMomentName]);

  // Get effective time for a protocol event (with adjustment)
  const getEffectiveTime = useCallback((event: ProtocolEvent) => {
    const adjustment = protocolAdjustments.get(event.id);
    return adjustment ? adjustment.time : event.startTime;
  }, [protocolAdjustments]);

  const getEffectiveFrame = useCallback((event: ProtocolEvent) => {
    const adjustment = protocolAdjustments.get(event.id);
    return adjustment ? adjustment.frame : event.startFrame;
  }, [protocolAdjustments]);

  // Get effective swing boundaries
  const getEffectiveSwingBoundaries = useCallback((event: ProtocolEvent) => {
    const adjustment = swingBoundaryAdjustments.get(event.id);
    return {
      startTime: adjustment?.startTime ?? event.startTime,
      startFrame: adjustment?.startFrame ?? event.startFrame,
      endTime: adjustment?.endTime ?? event.endTime,
      endFrame: adjustment?.endFrame ?? event.endFrame,
      isAdjusted: !!adjustment,
    };
  }, [swingBoundaryAdjustments]);

  // Find parent swing for a protocol event
  const findParentSwing = useCallback((event: ProtocolEvent): { id: string; label: string } | null => {
    // Get swing events
    const swings = protocolEvents.filter(e => e.protocolId === "swing-detection-v3");
    
    // Find which swing this event belongs to (if any)
    for (let i = 0; i < swings.length; i++) {
      const swing = swings[i];
      const bounds = getEffectiveSwingBoundaries(swing);
      const eventTime = getEffectiveTime(event);
      
      // Check if event time falls within swing bounds (with a small tolerance)
      if (eventTime >= bounds.startTime - 0.1 && eventTime <= bounds.endTime + 0.1) {
        return {
          id: swing.id,
          label: `Swing #${i + 1}`,
        };
      }
    }
    
    return null;
  }, [protocolEvents, getEffectiveSwingBoundaries, getEffectiveTime]);

  // Convert all events to unified Moment format
  const allMoments = useMemo(() => {
    const moments: Moment[] = [];
    const seenIds = new Set<string>();

    // Add protocol events (with deduplication)
    // Skip swing events - they're already shown in the Swings tab
    protocolEvents.forEach((event) => {
      // Skip if we've already seen this ID
      if (seenIds.has(event.id)) return;
      
      // Skip swing detection events - shown in Swings tab
      const isSwing = event.protocolId === "swing-detection-v3" ||
                      event.protocolId === "swing-detection-v2" ||
                      event.protocolId === "swing-detection-v1";
      if (isSwing) return;
      
      seenIds.add(event.id);
      const effectiveTime = getEffectiveTime(event);
      const effectiveFrame = getEffectiveFrame(event);
      const isAdjusted = protocolAdjustments.has(event.id);

      // Find parent swing for this protocol event
      const parentSwing = findParentSwing(event);

      moments.push({
        id: event.id,
        type: "protocol",
        label: event.label,
        time: effectiveTime,
        frame: effectiveFrame,
        color: getProtocolEventColor(event.protocolId),
        protocolId: event.protocolId,
        isAdjusted: isAdjusted,
        parentSwingId: parentSwing?.id,
        parentSwingLabel: parentSwing?.label,
        metadata: event.metadata,
        originalEvent: event,
      });
    });

    // Add custom events (with deduplication)
    customEvents.forEach((event) => {
      if (seenIds.has(event.id)) return;
      seenIds.add(event.id);
      
      moments.push({
        id: event.id,
        type: "custom",
        label: event.name,
        time: event.time,
        frame: event.frame,
        color: event.color,
        originalEvent: event,
      });
    });

    // Add video comments (with deduplication)
    videoComments.forEach((comment) => {
      if (seenIds.has(comment.id)) return;
      seenIds.add(comment.id);
      
      moments.push({
        id: comment.id,
        type: "comment",
        label: comment.title,
        time: comment.time,
        frame: comment.frame,
        color: comment.color,
        metadata: {
          description: comment.description,
          x: comment.x,
          y: comment.y,
        },
        originalEvent: comment,
      });
    });

    return moments;
  }, [
    protocolEvents,
    customEvents,
    videoComments,
    protocolAdjustments,
    getEffectiveTime,
    getEffectiveFrame,
    findParentSwing,
  ]);

  // Get unique swing IDs for filter options
  const swingOptions = useMemo(() => {
    const swings = protocolEvents
      .filter(e => e.protocolId === "swing-detection-v3")
      .map((swing, index) => ({
        id: swing.id,
        label: `Swing #${index + 1}`,
      }));
    return swings;
  }, [protocolEvents]);

  // Filter moments
  const filteredMoments = useMemo(() => {
    let filtered = allMoments;

    switch (filter) {
      case "all":
        break;
      case "protocols":
        filtered = allMoments.filter(m => m.type === "protocol");
        break;
      case "custom":
        filtered = allMoments.filter(m => m.type === "custom");
        break;
      case "comments":
        filtered = allMoments.filter(m => m.type === "comment");
        break;
      default:
        // Filter by parent swing ID (moments belonging to a specific swing)
        filtered = allMoments.filter(m => m.parentSwingId === filter);
        break;
    }

    return filtered;
  }, [allMoments, filter]);

  // Sort moments
  const sortedMoments = useMemo(() => {
    const sorted = [...filteredMoments];

    switch (sort) {
      case "time":
        sorted.sort((a, b) => a.time - b.time);
        break;
      case "type":
        sorted.sort((a, b) => {
          // Order: protocol events first, then custom, then comments
          const typeOrder: Record<MomentType, number> = {
            protocol: 0,
            custom: 1,
            comment: 2,
          };
          const orderA = typeOrder[a.type];
          const orderB = typeOrder[b.type];
          if (orderA !== orderB) return orderA - orderB;
          return a.time - b.time;
        });
        break;
      case "confidence":
        sorted.sort((a, b) => {
          const confA = (a.metadata?.confidence as number) ?? 0;
          const confB = (b.metadata?.confidence as number) ?? 0;
          return confB - confA; // Highest confidence first
        });
        break;
    }

    return sorted;
  }, [filteredMoments, sort]);

  // Handle view action
  const handleView = useCallback((moment: Moment) => {
    onViewMoment(moment.time);
  }, [onViewMoment]);

  // Handle analyse action
  const handleAnalyse = useCallback((moment: Moment) => {
    onAnalyseMoment(moment);
  }, [onAnalyseMoment]);

  // Count by type
  const counts = useMemo(() => ({
    total: allMoments.length,
    protocols: allMoments.filter(m => m.type === "protocol").length,
    custom: allMoments.filter(m => m.type === "custom").length,
    comments: allMoments.filter(m => m.type === "comment").length,
  }), [allMoments]);

  return (
    <Box
      style={{
        flex: 1,
        overflow: "auto",
        padding: "24px",
        backgroundColor: "var(--gray-1)",
      }}
    >
      {/* Header */}
      <Flex align="center" justify="between" style={{ marginBottom: "20px" }}>
        <Flex align="center" gap="3">
          <Text size="4" weight="bold" style={{ color: "white" }}>
            Moments
          </Text>
          <Badge size="2" color="gray">
            {sortedMoments.length}
          </Badge>
        </Flex>

        <Flex align="center" gap="3">
          {/* Filter dropdown */}
          <Flex align="center" gap="2">
            <MixerHorizontalIcon width={14} height={14} style={{ color: "rgba(255,255,255,0.5)" }} />
            <Select.Root value={filter} onValueChange={(value) => setFilter(value as FilterOption)}>
              <Select.Trigger variant="soft" style={{ minWidth: "140px" }} />
              <Select.Content>
                <Select.Group>
                  <Select.Label>Filter</Select.Label>
                  <Select.Item value="all">All moments ({counts.total})</Select.Item>
                  <Select.Item value="protocols">Protocol events ({counts.protocols})</Select.Item>
                  <Select.Item value="custom">Custom markers ({counts.custom})</Select.Item>
                  <Select.Item value="comments">Video comments ({counts.comments})</Select.Item>
                </Select.Group>
                {swingOptions.length > 0 && (
                  <Select.Group>
                    <Select.Label>By Swing</Select.Label>
                    {swingOptions.map((swing) => (
                      <Select.Item key={swing.id} value={swing.id}>
                        {swing.label}
                      </Select.Item>
                    ))}
                  </Select.Group>
                )}
              </Select.Content>
            </Select.Root>
          </Flex>

          {/* Sort dropdown */}
          <Flex align="center" gap="2">
            <ClockIcon width={14} height={14} style={{ color: "rgba(255,255,255,0.5)" }} />
            <Select.Root value={sort} onValueChange={(value) => setSort(value as SortOption)}>
              <Select.Trigger variant="soft" style={{ minWidth: "120px" }} />
              <Select.Content>
                <Select.Group>
                  <Select.Label>Sort by</Select.Label>
                  <Select.Item value="time">Time</Select.Item>
                  <Select.Item value="type">Type</Select.Item>
                  <Select.Item value="confidence">Confidence</Select.Item>
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </Flex>
        </Flex>
      </Flex>

      {/* Moments Grid */}
      {sortedMoments.length > 0 ? (
        <Flex wrap="wrap" gap="4" justify="start">
          {sortedMoments.map((moment) => (
            <MomentCard
              key={moment.id}
              moment={moment}
              videoElement={videoElement}
              onView={handleView}
              onAnalyse={handleAnalyse}
              poseConfidence={getPoseConfidence(moment.frame)}
              onDelete={handleDelete}
              onResetAdjustment={handleResetAdjustment}
              onEditName={handleEditName}
            />
          ))}
        </Flex>
      ) : (
        <Flex
          align="center"
          justify="center"
          style={{ height: "300px" }}
        >
          <Flex direction="column" align="center" gap="3">
            <BookmarkIcon
              width={48}
              height={48}
              style={{ color: "rgba(255,255,255,0.2)" }}
            />
            <Text size="2" style={{ color: "rgba(255,255,255,0.4)" }}>
              {filter === "all"
                ? "No moments yet"
                : "No moments match this filter"}
            </Text>
            <Text size="1" style={{ color: "rgba(255,255,255,0.3)" }}>
              {filter === "all"
                ? "Add markers or comments on the timeline to create moments"
                : "Try a different filter or add custom markers"}
            </Text>
          </Flex>
        </Flex>
      )}
    </Box>
  );
}

export default MomentsGalleryView;
