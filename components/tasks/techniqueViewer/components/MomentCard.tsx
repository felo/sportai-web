"use client";

/**
 * MomentCard
 *
 * A card component displaying a single "moment" (protocol event, custom event, or video comment)
 * with a frame preview thumbnail, metadata, and action buttons.
 */

import { useEffect, useState } from "react";
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
// Thumbnail Cache & Queue (module-level, persists across component instances)
// ============================================================================

const DEBUG = true;
function log(...args: unknown[]) {
  if (DEBUG) console.log("[Thumbnails]", ...args);
}

// Cache: "videoSrc:frame" -> data URL
const thumbnailCache = new Map<string, string>();

// Pending promises: components waiting for their thumbnail
const pendingCallbacks = new Map<string, Array<(url: string) => void>>();

// Queue for sequential capture
type CaptureRequest = {
  key: string;
  time: number;
  frame: number;
};
let captureQueue: CaptureRequest[] = [];
let isProcessingQueue = false;
let currentVideoElement: HTMLVideoElement | null = null;

function getCacheKey(videoSrc: string, frame: number): string {
  const srcKey = videoSrc.split("/").pop() || videoSrc.slice(-50);
  return `${srcKey}:${frame}`;
}

// Get cached thumbnail (sync)
function getCachedThumbnail(videoSrc: string, frame: number): string | null {
  const key = getCacheKey(videoSrc, frame);
  return thumbnailCache.get(key) ?? null;
}

// Request thumbnail capture - returns a promise that resolves when ready
function requestThumbnailCapture(
  videoElement: HTMLVideoElement,
  time: number,
  frame: number
): Promise<string | null> {
  const key = getCacheKey(videoElement.src, frame);
  log(`Request: frame=${frame}, key=${key}`);

  // Already cached - return immediately
  if (thumbnailCache.has(key)) {
    log(`  -> Already cached`);
    return Promise.resolve(thumbnailCache.get(key)!);
  }

  // Create promise for this request
  return new Promise((resolve) => {
    // Add callback to pending list
    if (!pendingCallbacks.has(key)) {
      pendingCallbacks.set(key, []);
    }
    pendingCallbacks.get(key)!.push(resolve);
    log(`  -> Added callback, total waiting: ${pendingCallbacks.get(key)!.length}`);

    // Add to queue if not already there
    if (!captureQueue.some(r => r.key === key)) {
      captureQueue.push({ key, time, frame });
      log(`  -> Added to queue, queue length: ${captureQueue.length}`);
      currentVideoElement = videoElement;
      processQueue();
    } else {
      log(`  -> Already in queue`);
    }
  });
}

async function processQueue() {
  if (isProcessingQueue) {
    log(`processQueue: Already processing, returning`);
    return;
  }
  if (captureQueue.length === 0) {
    log(`processQueue: Queue empty, returning`);
    return;
  }
  if (!currentVideoElement) {
    log(`processQueue: No video element, returning`);
    return;
  }

  isProcessingQueue = true;
  const videoElement = currentVideoElement;
  log(`processQueue: Starting, queue length: ${captureQueue.length}`);

  // Store original state
  const originalTime = videoElement.currentTime;
  const wasPlaying = !videoElement.paused;
  log(`  Original state: time=${originalTime.toFixed(2)}, playing=${wasPlaying}`);

  if (wasPlaying) {
    videoElement.pause();
  }

  // Process all requests
  let processed = 0;
  while (captureQueue.length > 0) {
    const request = captureQueue.shift()!;
    log(`  Processing: frame=${request.frame}, remaining: ${captureQueue.length}`);

    // Skip if already cached
    if (thumbnailCache.has(request.key)) {
      log(`    -> Already cached, notifying callbacks`);
      notifyCallbacks(request.key, thumbnailCache.get(request.key)!);
      continue;
    }

    try {
      // Seek to frame
      log(`    -> Seeking to ${request.time.toFixed(2)}s`);
      videoElement.currentTime = request.time;

      // Wait for seek
      await new Promise<void>((resolve) => {
        let resolved = false;
        const handleSeeked = () => {
          if (!resolved) {
            resolved = true;
            videoElement.removeEventListener("seeked", handleSeeked);
            log(`    -> Seeked event received`);
            resolve();
          }
        };
        videoElement.addEventListener("seeked", handleSeeked);
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            videoElement.removeEventListener("seeked", handleSeeked);
            log(`    -> Seek timeout`);
            resolve();
          }
        }, 200);
      });

      // Small delay for frame render
      await new Promise(r => setTimeout(r, 50));

      // Capture
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx && videoElement.videoWidth > 0) {
        const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
        canvas.width = 200;
        canvas.height = Math.round(200 / aspectRatio);
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        thumbnailCache.set(request.key, dataUrl);
        log(`    -> Captured and cached`);
        
        // Notify waiting components
        notifyCallbacks(request.key, dataUrl);
        processed++;
      } else {
        log(`    -> Failed: no context or video not ready`);
        notifyCallbacks(request.key, null as unknown as string);
      }
    } catch (error) {
      log(`    -> Error:`, error);
      notifyCallbacks(request.key, null as unknown as string);
    }
  }

  // Restore original state
  log(`  Restoring: time=${originalTime.toFixed(2)}, playing=${wasPlaying}`);
  videoElement.currentTime = originalTime;
  if (wasPlaying) {
    videoElement.play();
  }

  log(`processQueue: Done, processed ${processed} items`);
  isProcessingQueue = false;
  
  // Check if more items were added while processing
  if (captureQueue.length > 0) {
    log(`  More items in queue, scheduling next run`);
    setTimeout(processQueue, 10);
  }
}

function notifyCallbacks(key: string, url: string) {
  const callbacks = pendingCallbacks.get(key);
  if (callbacks && callbacks.length > 0) {
    log(`  Notifying ${callbacks.length} callbacks for ${key}`);
    callbacks.forEach(cb => cb(url));
    pendingCallbacks.delete(key);
  }
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
  // Initialize from cache if available
  const initialCached = videoElement ? getCachedThumbnail(videoElement.src, moment.frame) : null;
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initialCached);
  const [isCapturing, setIsCapturing] = useState(!initialCached);

  // Request capture if not cached
  useEffect(() => {
    // Already have thumbnail
    if (thumbnailUrl) {
      log(`MomentCard[${moment.frame}]: Already have thumbnail`);
      return;
    }
    
    if (!videoElement) {
      log(`MomentCard[${moment.frame}]: No video element`);
      return;
    }

    // Check cache again
    const cached = getCachedThumbnail(videoElement.src, moment.frame);
    if (cached) {
      log(`MomentCard[${moment.frame}]: Found in cache on effect run`);
      setThumbnailUrl(cached);
      setIsCapturing(false);
      return;
    }

    if (videoElement.readyState < 2) {
      log(`MomentCard[${moment.frame}]: Video not ready (readyState=${videoElement.readyState})`);
      return;
    }

    // Request capture - promise will resolve when ready
    log(`MomentCard[${moment.frame}]: Requesting capture`);
    setIsCapturing(true);
    let cancelled = false;

    requestThumbnailCapture(videoElement, moment.time, moment.frame)
      .then((url) => {
        if (!cancelled && url) {
          log(`MomentCard[${moment.frame}]: Promise resolved with thumbnail`);
          setThumbnailUrl(url);
          setIsCapturing(false);
        } else if (!cancelled) {
          log(`MomentCard[${moment.frame}]: Promise resolved with null`);
          setIsCapturing(false);
        }
      });

    return () => {
      log(`MomentCard[${moment.frame}]: Cleanup, setting cancelled=true`);
      cancelled = true;
    };
  }, [videoElement, moment.time, moment.frame, thumbnailUrl]);

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
            direction="column"
            gap="2"
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(135deg, ${moment.color}20 0%, transparent 50%)`,
            }}
          >
            <Box
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: moment.color,
                opacity: 0.4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {getMomentIcon(moment)}
            </Box>
            {isCapturing && (
              <Text size="1" style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>
                Loading...
              </Text>
            )}
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
