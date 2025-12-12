"use client";

/**
 * MomentCard
 *
 * A card component displaying a single "moment" (protocol event, custom event, or video comment)
 * with a frame preview thumbnail, metadata, and action buttons.
 * 
 * Design aligned with TaskTile component for consistent library UI.
 */

import { useEffect, useState } from "react";
import { Box, Flex, Text, Badge, Card, DropdownMenu, Spinner, Button, Tooltip } from "@radix-ui/themes";
import {
  RocketIcon,
  TargetIcon,
  CheckCircledIcon,
  ChatBubbleIcon,
  BookmarkIcon,
  MagicWandIcon,
  DragHandleDots2Icon,
  Pencil1Icon,
  Pencil2Icon,
  DotsVerticalIcon,
  TrashIcon,
  ResetIcon,
  PlayIcon,
} from "@radix-ui/react-icons";
import type { ProtocolEvent } from "@/components/videoPoseViewerV2";
import type { CustomEvent } from "./CustomEventDialog";
import type { VideoComment } from "./VideoCommentDialog";
import buttonStyles from "@/styles/buttons.module.css";

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Determines if text should be dark or light based on background color brightness.
 * Uses relative luminance calculation for accessibility (WCAG 2.0).
 */
export function getContrastTextColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? "rgba(0, 0, 0, 0.9)" : "white";
}

// ============================================================================
// Thumbnail Cache & Queue (module-level, persists across component instances)
// ============================================================================

const DEBUG = false; // Set to true for thumbnail debugging
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

  // Wait for video to be ready if needed
  if (videoElement.readyState < 2) {
    log(`processQueue: Waiting for video to be ready (readyState=${videoElement.readyState})`);
    await new Promise<void>((resolve) => {
      const checkReady = () => {
        if (videoElement.readyState >= 2) {
          log(`processQueue: Video now ready`);
          videoElement.removeEventListener("canplay", checkReady);
          videoElement.removeEventListener("loadeddata", checkReady);
          resolve();
        }
      };
      videoElement.addEventListener("canplay", checkReady);
      videoElement.addEventListener("loadeddata", checkReady);
      // Also check immediately in case it became ready
      checkReady();
      // Timeout fallback
      setTimeout(() => {
        log(`processQueue: Video ready timeout, proceeding anyway`);
        videoElement.removeEventListener("canplay", checkReady);
        videoElement.removeEventListener("loadeddata", checkReady);
        resolve();
      }, 2000);
    });
  }

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
  /** Pose confidence for this frame (0-1) - provided by parent from pose data */
  poseConfidence?: number | null;
  /** Callback when "Delete marker" is clicked (only for custom events/comments) */
  onDelete?: (moment: Moment) => void;
  /** Callback when "Reset adjustment" is clicked (only for adjusted moments) */
  onResetAdjustment?: (moment: Moment) => void;
  /** Callback when "Edit name" is clicked */
  onEditName?: (moment: Moment) => void;
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

// ============================================================================
// Component
// ============================================================================

export function MomentCard({
  moment,
  videoElement,
  onView,
  onAnalyse,
  isSelected = false,
  poseConfidence,
  onDelete,
  onResetAdjustment,
  onEditName,
}: MomentCardProps) {
  // Initialize from cache if available
  const initialCached = videoElement ? getCachedThumbnail(videoElement.src, moment.frame) : null;
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initialCached);
  const [isCapturing, setIsCapturing] = useState(!initialCached);
  
  // Handle analyse click
  const handleAnalyseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAnalyse(moment);
  };

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

    // Request capture - don't check readyState, let the queue handle it
    log(`MomentCard[${moment.frame}]: Requesting capture`);
    setIsCapturing(true);

    requestThumbnailCapture(videoElement, moment.time, moment.frame)
      .then((url) => {
        // Always update state if we got a valid URL
        // Don't use cancelled flag - if thumbnail is valid, use it
        if (url) {
          log(`MomentCard[${moment.frame}]: Promise resolved with thumbnail`);
          setThumbnailUrl(url);
        } else {
          log(`MomentCard[${moment.frame}]: Promise resolved with null`);
        }
        setIsCapturing(false);
      });

    // No cleanup needed - we want the thumbnail even if component re-renders
  }, [videoElement, moment.time, moment.frame, thumbnailUrl]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${seconds.toFixed(1)}s`;
  };

  // Use pose confidence if available, otherwise fall back to metadata confidence
  const confidence = poseConfidence ?? (moment.metadata?.confidence as number | undefined);

  return (
    <Card
      className="moment-card"
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
        border: isSelected
          ? "2px solid var(--accent-9)"
          : moment.isAdjusted
          ? "2px solid var(--amber-7)"
          : "1px solid var(--gray-6)",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={() => onView(moment)}
    >
      {/* Thumbnail Area - 16:9 aspect ratio like TaskTile */}
      <Box
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          backgroundColor: "var(--gray-3)",
          overflow: "hidden",
        }}
      >
        {/* Thumbnail Image */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={moment.label}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <Flex
            align="center"
            justify="center"
            style={{
              width: "100%",
              height: "100%",
              background: `linear-gradient(135deg, ${moment.color}30 0%, var(--gray-3) 100%)`,
            }}
          >
            {isCapturing ? (
              <Spinner size="2" />
            ) : (
              <Box
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: `${moment.color}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {getMomentIcon(moment)}
              </Box>
            )}
          </Flex>
        )}

        {/* Type Badge - top left (using marker color with contrast text) */}
        <Box
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            backgroundColor: moment.color,
            color: getContrastTextColor(moment.color),
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
          <span>{moment.label}</span>
        </Box>

        {/* Menu Dropdown - top right (like TaskTile) */}
        <Box
          style={{ position: "absolute", top: "8px", right: "8px", zIndex: 10 }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: "rgba(0,0,0,0.6)",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(4px)",
                }}
              >
                <DotsVerticalIcon width={16} height={16} color="white" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onSelect={() => onView(moment)}>
                <PlayIcon width={14} height={14} />
                <Text ml="2">View frame</Text>
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => onAnalyse(moment)}>
                <MagicWandIcon width={14} height={14} />
                <Text ml="2">Analyse</Text>
              </DropdownMenu.Item>
              {/* Edit name - only for user-created markers (custom events and comments) */}
              {onEditName && (moment.type === "custom" || moment.type === "comment") && (
                <DropdownMenu.Item onSelect={() => onEditName(moment)}>
                  <Pencil2Icon width={14} height={14} />
                  <Text ml="2">Edit name</Text>
                </DropdownMenu.Item>
              )}
              {/* Reset adjustment - only for adjusted protocol events */}
              {moment.isAdjusted && onResetAdjustment && (
                <>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item onSelect={() => onResetAdjustment(moment)}>
                    <ResetIcon width={14} height={14} />
                    <Text ml="2">Reset adjustment</Text>
                  </DropdownMenu.Item>
                </>
              )}
              {/* Delete marker - only for custom events and comments */}
              {(moment.type === "custom" || moment.type === "comment") && onDelete && (
                <>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item color="red" onSelect={() => onDelete(moment)}>
                    <TrashIcon width={14} height={14} />
                    <Text ml="2">Delete marker</Text>
                  </DropdownMenu.Item>
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Box>

        {/* Confidence Badge - bottom left with tooltip */}
        {confidence != null && (
          <Tooltip
            content={
              <Text size="1" style={{ display: "block", maxWidth: "240px" }}>
                Pose detection confidence for this moment.
                <br /><br />
                • 70%+ Excellent — highly accurate tracking
                <br />
                • 50-70% Good — reliable for most analysis
                <br />
                • Below 50% — detection may be less reliable
              </Text>
            }
          >
            <Box
              style={{
                position: "absolute",
                bottom: "8px",
                left: "8px",
                backgroundColor: confidence >= 0.7 ? "rgba(34, 197, 94, 0.9)" : confidence >= 0.5 ? "rgba(234, 179, 8, 0.9)" : "rgba(100, 100, 100, 0.9)",
                padding: "2px 6px",
                borderRadius: "4px",
                cursor: "help",
              }}
            >
              <Text size="1" style={{ color: "white", fontWeight: 500 }}>
                {(confidence * 100).toFixed(0)}%
              </Text>
            </Box>
          </Tooltip>
        )}

        {/* Duration/Time Badge - bottom right (like TaskTile) */}
        <Box
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            backgroundColor: "rgba(0,0,0,0.75)",
            padding: "2px 6px",
            borderRadius: "4px",
          }}
        >
          <Text size="1" style={{ color: "white", fontWeight: 500 }}>
            {formatTime(moment.time)}
          </Text>
        </Box>

      </Box>

      {/* Content Area - structured like TaskTile */}
      <Flex direction="column" gap="2" p="3" style={{ flex: 1 }}>
        {/* Status row with badges */}
        <Flex align="center" gap="2" wrap="wrap">
          {/* Adjusted indicator */}
          {moment.isAdjusted && (
            <Badge color="amber" variant="soft" size="1">
              Adjusted
            </Badge>
          )}
          {/* Parent swing context */}
          {moment.parentSwingLabel && (
            <Badge color="blue" variant="soft" size="1">
              {moment.parentSwingLabel}
            </Badge>
          )}
        </Flex>

        {/* Analyse Moment button - anchored to bottom */}
        <Button
          size="2"
          className={buttonStyles.actionButtonSquare}
          onClick={handleAnalyseClick}
          style={{ marginTop: "auto" }}
        >
          <MagicWandIcon width={14} height={14} />
          Analyse
        </Button>
      </Flex>

      {/* Hover styles - matching TaskTile */}
      <style jsx>{`
        :global(.moment-card:hover) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
          border-color: var(--mint-9) !important;
        }
      `}</style>
    </Card>
  );
}

export default MomentCard;
