"use client";

/**
 * MomentCard
 *
 * A card component displaying a single "moment" (protocol event, custom event, or video comment)
 * with a frame preview thumbnail, metadata, and action buttons.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { Box, Flex, Text, Button, Badge, Tooltip } from "@radix-ui/themes";
import {
  RocketIcon,
  TargetIcon,
  CheckCircledIcon,
  ChatBubbleIcon,
  BookmarkIcon,
  PlayIcon,
  MagicWandIcon,
  DragHandleDots2Icon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import type { ProtocolEvent } from "@/components/videoPoseViewerV2";
import type { CustomEvent } from "./CustomEventDialog";
import type { VideoComment } from "./VideoCommentDialog";

// ============================================================================
// Thumbnail Cache (module-level, persists across component instances)
// ============================================================================

// Cache key: "videoSrc:frame" -> data URL
const thumbnailCache = new Map<string, string>();

// Track ongoing captures to prevent duplicate requests
const pendingCaptures = new Map<string, Promise<string | null>>();

function getCacheKey(videoSrc: string, frame: number): string {
  // Use video src + frame as cache key
  // Extract just the filename/key part to keep cache keys reasonable
  const srcKey = videoSrc.split("/").pop() || videoSrc.slice(-50);
  return `${srcKey}:${frame}`;
}

async function captureFrameThumbnail(
  videoElement: HTMLVideoElement,
  time: number,
  frame: number
): Promise<string | null> {
  const cacheKey = getCacheKey(videoElement.src, frame);

  // Check cache first
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey)!;
  }

  // Check if capture is already in progress
  if (pendingCaptures.has(cacheKey)) {
    return pendingCaptures.get(cacheKey)!;
  }

  // Create capture promise
  const capturePromise = (async () => {
    try {
      // Store current state
      const originalTime = videoElement.currentTime;
      const wasPlaying = !videoElement.paused;

      if (wasPlaying) {
        videoElement.pause();
      }

      // Seek to the moment's time
      videoElement.currentTime = time;

      // Wait for the seek to complete
      await new Promise<void>((resolve) => {
        const handleSeeked = () => {
          videoElement.removeEventListener("seeked", handleSeeked);
          resolve();
        };
        videoElement.addEventListener("seeked", handleSeeked);
        // Timeout fallback
        setTimeout(() => {
          videoElement.removeEventListener("seeked", handleSeeked);
          resolve();
        }, 500);
      });

      // Create offscreen canvas for capture
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Set thumbnail dimensions (small for cache efficiency)
      const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
      canvas.width = 200;
      canvas.height = Math.round(200 / aspectRatio);

      // Draw the frame
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Convert to data URL (JPEG for smaller size)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

      // Store in cache
      thumbnailCache.set(cacheKey, dataUrl);

      // Restore original time
      videoElement.currentTime = originalTime;

      if (wasPlaying) {
        videoElement.play();
      }

      return dataUrl;
    } catch (error) {
      console.error("[MomentCard] Failed to capture thumbnail:", error);
      return null;
    } finally {
      // Remove from pending
      pendingCaptures.delete(cacheKey);
    }
  })();

  // Store in pending
  pendingCaptures.set(cacheKey, capturePromise);

  return capturePromise;
}

// ============================================================================
// Types
// ============================================================================

export type MomentType = "protocol" | "custom" | "comment";

export interface Moment {
  /** Unique identifier */
  id: string;
  /** Type of moment */
  type: MomentType;
  /** Display label */
  label: string;
  /** Time in seconds */
  time: number;
  /** Frame number */
  frame: number;
  /** End time (for range events like swings) */
  endTime?: number;
  /** End frame */
  endFrame?: number;
  /** Color for the marker */
  color: string;
  /** Protocol ID (if protocol event) */
  protocolId?: string;
  /** Whether this moment's position has been adjusted by the user */
  isAdjusted?: boolean;
  /** Parent swing ID (if this moment belongs to a swing) */
  parentSwingId?: string;
  /** Parent swing label */
  parentSwingLabel?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Original event reference */
  originalEvent?: ProtocolEvent | CustomEvent | VideoComment;
}

interface MomentCardProps {
  /** The moment to display */
  moment: Moment;
  /** Video element to capture frame from */
  videoElement: HTMLVideoElement | null;
  /** Callback when "View" is clicked */
  onView: (moment: Moment) => void;
  /** Callback when "Analyse" is clicked */
  onAnalyse: (moment: Moment) => void;
  /** Whether this card is currently selected */
  isSelected?: boolean;
}

// ============================================================================
// Icon Components
// ============================================================================

function getMomentIcon(moment: Moment): React.ReactNode {
  // Protocol-specific icons
  if (moment.protocolId) {
    switch (moment.protocolId) {
      case "loading-position":
      case "serve-preparation":
        return <RocketIcon width={14} height={14} />;
      case "tennis-contact-point":
        return <TargetIcon width={14} height={14} />;
      case "serve-follow-through":
        return <CheckCircledIcon width={14} height={14} />;
      case "swing-detection-v3":
      case "swing-detection-v2":
      case "swing-detection-v1":
        return <DragHandleDots2Icon width={14} height={14} />;
      default:
        return <BookmarkIcon width={14} height={14} />;
    }
  }

  // Type-based icons
  switch (moment.type) {
    case "comment":
      return <ChatBubbleIcon width={14} height={14} />;
    case "custom":
      return <Pencil1Icon width={14} height={14} />;
    default:
      return <BookmarkIcon width={14} height={14} />;
  }
}

function getProtocolLabel(protocolId: string): string {
  switch (protocolId) {
    case "loading-position":
      return "Loading Position";
    case "serve-preparation":
      return "Preparation";
    case "tennis-contact-point":
      return "Contact Point";
    case "serve-follow-through":
      return "Follow Through";
    case "swing-detection-v3":
    case "swing-detection-v2":
    case "swing-detection-v1":
      return "Swing";
    default:
      return protocolId;
  }
}

// ============================================================================
// Component
// ============================================================================

export function MomentCard({
  moment,
  videoElement,
  onView,
  onAnalyse,
  isSelected = false,
}: MomentCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const captureAttempted = useRef(false);

  // Check cache and capture thumbnail if needed
  useEffect(() => {
    if (!videoElement || videoElement.readyState < 2) return;
    if (captureAttempted.current) return;

    const cacheKey = getCacheKey(videoElement.src, moment.frame);

    // Check cache first (sync)
    if (thumbnailCache.has(cacheKey)) {
      setThumbnailUrl(thumbnailCache.get(cacheKey)!);
      return;
    }

    // Mark as attempted to prevent re-runs
    captureAttempted.current = true;
    setIsCapturing(true);

    // Capture with small random delay to stagger captures
    const delay = 50 + Math.random() * 150;
    const timeout = setTimeout(async () => {
      const url = await captureFrameThumbnail(videoElement, moment.time, moment.frame);
      if (url) {
        setThumbnailUrl(url);
      }
      setIsCapturing(false);
    }, delay);

    return () => clearTimeout(timeout);
  }, [videoElement, moment.time, moment.frame]);

  // Reset capture flag if moment changes significantly
  useEffect(() => {
    captureAttempted.current = false;
  }, [moment.id]);

  // Format time display
  const formatTime = (seconds: number) => {
    return seconds.toFixed(2) + "s";
  };

  // Check if this is a range event (swing)
  const isRange = moment.endTime !== undefined && moment.endTime !== moment.time;
  const duration = isRange ? (moment.endTime! - moment.time).toFixed(2) : null;

  // Extract useful metadata
  const velocityKmh = moment.metadata?.velocityKmh as number | undefined;
  const confidence = moment.metadata?.confidence as number | undefined;
  const orientation = moment.metadata?.loadingPeakOrientation as number | undefined;
  const contactHeight = moment.metadata?.contactPointHeight as number | undefined;
  const armHeight = moment.metadata?.armHeight as number | undefined;

  return (
    <Box
      style={{
        width: "200px",
        backgroundColor: isSelected ? "var(--accent-a3)" : "rgba(30, 30, 30, 0.9)",
        border: isSelected
          ? "2px solid var(--accent-9)"
          : moment.isAdjusted
          ? "2px solid rgba(255, 255, 255, 0.5)"
          : "1px solid var(--gray-6)",
        borderRadius: "8px",
        overflow: "hidden",
        transition: "all 0.2s ease",
        cursor: "pointer",
      }}
      onClick={() => onView(moment)}
    >
      {/* Thumbnail Area */}
      <Box
        style={{
          position: "relative",
          height: "112px",
          backgroundColor: "var(--gray-3)",
          overflow: "hidden",
        }}
      >
        {/* Cached thumbnail image */}
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={moment.label}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 1,
            }}
          />
        )}

        {/* Placeholder when no thumbnail */}
        {!thumbnailUrl && (
          <Flex
            align="center"
            justify="center"
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(135deg, ${moment.color}20 0%, transparent 50%)`,
            }}
          >
            <Box
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: moment.color,
                opacity: isCapturing ? 0.5 : 0.3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: isCapturing ? "pulse 1s infinite" : undefined,
              }}
            >
              {getMomentIcon(moment)}
            </Box>
          </Flex>
        )}

        {/* Type badge */}
        <Box
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            backgroundColor: moment.color,
            color: "white",
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          {getMomentIcon(moment)}
          <span>
            {moment.protocolId
              ? getProtocolLabel(moment.protocolId)
              : moment.type === "comment"
              ? "Comment"
              : "Marker"}
          </span>
        </Box>

        {/* Adjusted indicator */}
        {moment.isAdjusted && (
          <Tooltip content="Position adjusted by user">
            <Box
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                color: "var(--gray-12)",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: 500,
              }}
            >
              Adjusted
            </Box>
          </Tooltip>
        )}

        {/* Time overlay */}
        <Box
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "white",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "11px",
            fontFamily: "monospace",
          }}
        >
          {formatTime(moment.time)}
          {isRange && ` - ${formatTime(moment.endTime!)}`}
        </Box>
      </Box>

      {/* Content Area */}
      <Box style={{ padding: "12px" }}>
        {/* Label */}
        <Text
          size="2"
          weight="medium"
          style={{
            color: "white",
            display: "block",
            marginBottom: "4px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {moment.label}
        </Text>

        {/* Frame info */}
        <Text size="1" style={{ color: "rgba(255,255,255,0.5)", display: "block" }}>
          Frame #{moment.frame}
          {isRange && ` - #${moment.endFrame}`}
        </Text>

        {/* Parent swing context */}
        {moment.parentSwingLabel && (
          <Text
            size="1"
            style={{
              color: "var(--blue-9)",
              display: "block",
              marginTop: "2px",
            }}
          >
            {moment.parentSwingLabel}
          </Text>
        )}

        {/* Metadata */}
        {((velocityKmh != null && velocityKmh >= 20) || confidence != null || orientation != null || contactHeight != null || armHeight != null || duration) && (
          <Flex gap="2" wrap="wrap" style={{ marginTop: "8px" }}>
            {velocityKmh != null && velocityKmh >= 20 && (
              <Badge size="1" color="blue">
                {velocityKmh.toFixed(0)} km/h
              </Badge>
            )}
            {duration && (
              <Badge size="1" color="gray">
                {duration}s
              </Badge>
            )}
            {orientation != null && (
              <Badge size="1" color="amber">
                {orientation.toFixed(0)}°
              </Badge>
            )}
            {contactHeight != null && (
              <Badge size="1" color="yellow">
                {contactHeight.toFixed(1)}x
              </Badge>
            )}
            {armHeight != null && (
              <Badge size="1" color="orange">
                {armHeight.toFixed(1)}x
              </Badge>
            )}
            {confidence != null && (
              <Badge size="1" color={confidence >= 0.7 ? "green" : "gray"}>
                {(confidence * 100).toFixed(0)}%
              </Badge>
            )}
          </Flex>
        )}

        {/* Action buttons */}
        <Flex gap="2" style={{ marginTop: "12px" }}>
          <Button
            size="1"
            variant="soft"
            onClick={(e) => {
              e.stopPropagation();
              onView(moment);
            }}
            style={{ flex: 1 }}
          >
            <PlayIcon width={12} height={12} />
            View
          </Button>
          <Button
            size="1"
            variant="solid"
            onClick={(e) => {
              e.stopPropagation();
              onAnalyse(moment);
            }}
            style={{ flex: 1 }}
          >
            <MagicWandIcon width={12} height={12} />
            Analyse
          </Button>
        </Flex>
      </Box>
    </Box>
  );
}

export default MomentCard;
