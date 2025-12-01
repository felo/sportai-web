"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Box, Flex, Text, Badge, Card, Progress, DropdownMenu, AlertDialog, Dialog, Button, Spinner } from "@radix-ui/themes";
import { PlayIcon, CheckCircledIcon, CrossCircledIcon, UpdateIcon, DotsVerticalIcon, TrashIcon, DownloadIcon, FileIcon, InfoCircledIcon, Cross2Icon, CopyIcon, CheckIcon } from "@radix-ui/react-icons";
import { IconButton } from "@/components/ui";
import buttonStyles from "@/styles/buttons.module.css";

// Video metadata interface
interface VideoMetadata {
  width: number | null;
  height: number | null;
  duration: number | null;
  fileSize: number | null;
  format: string | null;
  codec: string | null;
  bitrate: number | null;
  framerate: number | null;
}

// Common codec mappings based on container format
const FORMAT_CODEC_MAP: Record<string, string> = {
  "MP4": "H.264/AVC",
  "MOV": "H.264/ProRes",
  "WEBM": "VP8/VP9",
  "MKV": "H.264/H.265",
  "AVI": "Various",
  "M4V": "H.264",
  "3GP": "H.263/H.264",
  "OGV": "Theora",
};

interface Task {
  id: string;
  task_type: string;
  sport: "tennis" | "padel" | "pickleball";
  sportai_task_id: string | null;
  video_url: string;
  thumbnail_url: string | null;
  thumbnail_s3_key: string | null;
  video_length: number | null;
  status: "pending" | "processing" | "completed" | "failed";
  estimated_compute_time: number | null;
  request_params: Record<string, unknown> | null;
  result_s3_key: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface TaskTileProps {
  task: Task;
  onClick: () => void;
  onFetchResult?: () => void;
  isFetching?: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
  isPreparing?: boolean;
  onDownloadVideo?: () => void;
  onExportData?: () => void;
  isNew?: boolean;
}

const SPORT_COLORS: Record<Task["sport"], string> = {
  padel: "cyan",
  tennis: "orange",
  pickleball: "green",
};

const SPORT_ICONS: Record<Task["sport"], string> = {
  padel: "🎾",      // Padel uses similar balls to tennis
  tennis: "🎾",      // Classic tennis ball  
  pickleball: "🏓",  // Paddle sport
};

// Background colors for no-thumbnail state (matches sport badge colors)
const SPORT_BG_COLORS: Record<Task["sport"], string> = {
  padel: "var(--cyan-4)",
  tennis: "var(--orange-4)", 
  pickleball: "var(--green-4)",
};

const STATUS_CONFIG = {
  pending: { color: "orange" as const, icon: UpdateIcon, label: "Pending" },
  processing: { color: "blue" as const, icon: UpdateIcon, label: "Processing" },
  completed: { color: "green" as const, icon: CheckCircledIcon, label: "Completed" },
  failed: { color: "red" as const, icon: CrossCircledIcon, label: "Failed" },
};

function formatDuration(totalSeconds: number): string {
  // Always use absolute value to avoid negative display
  const absSeconds = Math.abs(totalSeconds);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = Math.floor(absSeconds % 60);
  
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  
  // Show 2 decimal places for MB and above, 0 for KB and below
  const decimals = i >= 2 ? 2 : 0;
  return `${size.toFixed(decimals)} ${units[i]}`;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function TaskTile({ task, onClick, onFetchResult, isFetching, onDelete, isDeleting, isPreparing, onDownloadVideo, onExportData, isNew }: TaskTileProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(task.thumbnail_url || null);
  const [thumbnailError, setThumbnailError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setTick] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  
  // Fetch video metadata when info dialog opens
  const fetchVideoMetadata = useCallback(async () => {
    if (videoMetadata) return; // Already fetched
    
    setLoadingMetadata(true);
    
    const metadata: VideoMetadata = {
      width: null,
      height: null,
      duration: task.video_length ?? null,
      fileSize: null,
      format: null,
      codec: null,
      bitrate: null,
      framerate: null,
    };
    
    // Extract format from URL
    const urlPath = task.video_url.split("?")[0];
    const extension = urlPath.split(".").pop()?.toLowerCase();
    if (extension) {
      metadata.format = extension.toUpperCase();
      // Infer likely codec from format
      metadata.codec = FORMAT_CODEC_MAP[metadata.format] || null;
    }
    
    // Try to get file size via HEAD request
    try {
      const response = await fetch(task.video_url, { method: "HEAD" });
      if (response.ok) {
        const contentLength = response.headers.get("content-length");
        if (contentLength) {
          metadata.fileSize = parseInt(contentLength, 10);
        }
        const contentType = response.headers.get("content-type");
        if (contentType && !metadata.format) {
          // Extract format from content-type (e.g., "video/mp4" -> "MP4")
          const formatMatch = contentType.match(/video\/(\w+)/);
          if (formatMatch) {
            metadata.format = formatMatch[1].toUpperCase();
            metadata.codec = FORMAT_CODEC_MAP[metadata.format] || null;
          }
        }
      }
    } catch {
      // CORS or network error - silently ignore
    }
    
    // Try to get video dimensions and framerate using HTML5 video element
    try {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.preload = "metadata";
      video.muted = true;
      
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          metadata.width = video.videoWidth;
          metadata.height = video.videoHeight;
          if (!metadata.duration && video.duration && isFinite(video.duration)) {
            metadata.duration = video.duration;
          }
          // Calculate bitrate if we have file size and duration
          if (metadata.fileSize && metadata.duration) {
            metadata.bitrate = Math.round((metadata.fileSize * 8) / metadata.duration / 1000); // kbps
          }
          resolve();
        };
        video.onerror = () => resolve();
        video.src = task.video_url;
        
        // Timeout after 5 seconds
        setTimeout(() => resolve(), 5000);
      });
      
      // Try to detect framerate using requestVideoFrameCallback (Chrome 83+, Safari 15.4+)
      if ("requestVideoFrameCallback" in video && metadata.duration && metadata.duration > 0.5) {
        try {
          video.currentTime = 0;
          await video.play();
          
          let frameCount = 0;
          let startTime: number | null = null;
          let lastFrameTime = 0;
          
          await new Promise<void>((resolve) => {
            const countFrames = (_now: number, frameMetadata: { presentedFrames?: number; mediaTime: number }) => {
              if (startTime === null) {
                startTime = frameMetadata.mediaTime;
              }
              frameCount++;
              lastFrameTime = frameMetadata.mediaTime;
              
              // Sample for ~0.5 seconds or 30 frames, whichever comes first
              const elapsed = lastFrameTime - startTime;
              if (elapsed >= 0.5 || frameCount >= 30) {
                if (elapsed > 0) {
                  metadata.framerate = Math.round(frameCount / elapsed);
                }
                resolve();
              } else {
                (video as HTMLVideoElement & { requestVideoFrameCallback: (callback: (now: number, metadata: { presentedFrames?: number; mediaTime: number }) => void) => number }).requestVideoFrameCallback(countFrames);
              }
            };
            
            (video as HTMLVideoElement & { requestVideoFrameCallback: (callback: (now: number, metadata: { presentedFrames?: number; mediaTime: number }) => void) => number }).requestVideoFrameCallback(countFrames);
            
            // Timeout after 2 seconds
            setTimeout(() => resolve(), 2000);
          });
          
          video.pause();
        } catch {
          // Framerate detection failed - that's ok
        }
      }
      
      video.src = "";
    } catch {
      // CORS or video error - silently ignore
    }
    
    setVideoMetadata(metadata);
    setLoadingMetadata(false);
  }, [task.video_url, task.video_length, videoMetadata]);
  
  // Fetch metadata when info dialog opens
  useEffect(() => {
    if (showInfoDialog && !videoMetadata) {
      fetchVideoMetadata();
    }
  }, [showInfoDialog, videoMetadata, fetchVideoMetadata]);
  
  // Force re-render every second for live progress updates
  useEffect(() => {
    if (task.status !== "processing" && task.status !== "pending") return;
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [task.status]);
  
  // Use stored thumbnail if available, otherwise generate from video
  useEffect(() => {
    // If we have a stored thumbnail, use it
    if (task.thumbnail_url) {
      setThumbnail(task.thumbnail_url);
      return;
    }
    
    // Skip if already have thumbnail or had an error
    if (thumbnail || thumbnailError) return;
    
    // Generate thumbnail from video as fallback
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";
    
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 4);
    };
    
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumbnail(canvas.toDataURL("image/jpeg", 0.7));
      }
    };
    
    video.onerror = () => {
      setThumbnailError(true);
    };
    
    video.src = task.video_url;
    
    return () => {
      video.pause();
      video.src = "";
    };
  }, [task.video_url, task.thumbnail_url, thumbnail, thumbnailError]);
  
  // Calculate progress for processing tasks
  // Server returns estimated_compute_time as negative = time remaining, positive = total time
  const getProgress = (): { percent: number; eta: string | null; isOverdue: boolean } => {
    if (task.status === "completed") return { percent: 100, eta: null, isOverdue: false };
    if (task.status === "failed") return { percent: 0, eta: null, isOverdue: false };
    if (!task.estimated_compute_time) return { percent: 0, eta: null, isOverdue: false };
    
    const createdAt = new Date(task.created_at).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - createdAt) / 1000);
    
    // If server returns negative, it's the remaining time directly
    // If positive, it's total estimated time
    let remainingSeconds: number;
    let totalEstimated: number;
    
    if (task.estimated_compute_time < 0) {
      // Server returns remaining time as negative value
      remainingSeconds = Math.abs(task.estimated_compute_time);
      totalEstimated = elapsedSeconds + remainingSeconds;
    } else {
      // Server returns total estimated time
      totalEstimated = task.estimated_compute_time;
      remainingSeconds = totalEstimated - elapsedSeconds;
    }
    
    const percent = Math.min(95, Math.max(5, (elapsedSeconds / totalEstimated) * 100));
    
    if (remainingSeconds < 0) {
      return { 
        percent: 95, 
        eta: `+${formatDuration(Math.abs(remainingSeconds))}`, 
        isOverdue: true 
      };
    }
    
    return { 
      percent, 
      eta: `~${formatDuration(remainingSeconds)}`, 
      isOverdue: false 
    };
  };
  
  const progress = getProgress();
  const statusConfig = STATUS_CONFIG[task.status];
  const StatusIcon = statusConfig.icon;
  const isActive = task.status === "processing" || task.status === "pending";
  // Allow clicking on any completed task - parent will handle fetching result if needed
  const canView = task.status === "completed";
  
  return (
    <Card
      style={{
        cursor: canView && !isPreparing ? "pointer" : "default",
        transition: "all 0.2s ease",
        border: "1px solid var(--gray-6)",
        overflow: "hidden",
        position: "relative",
      }}
      className="task-tile"
      onClick={canView && !isPreparing ? onClick : undefined}
    >
      {/* Thumbnail / Video Preview */}
      <Box
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          backgroundColor: "var(--gray-3)",
          overflow: "hidden",
        }}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Video thumbnail for ${task.sport}`}
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
              backgroundColor: SPORT_BG_COLORS[task.sport],
            }}
          >
            <Text size="8" style={{ opacity: 0.7 }}>
              {SPORT_ICONS[task.sport]}
            </Text>
          </Flex>
        )}
        
        {/* Sport badge overlay */}
        <Box
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
          }}
        >
          <Badge color={SPORT_COLORS[task.sport] as "cyan" | "orange" | "green"} variant="solid" size="1">
            {task.sport.charAt(0).toUpperCase() + task.sport.slice(1)}
          </Badge>
        </Box>
        
        {/* 3-dot menu overlay - always show for Video Info, other options conditional */}
        <Box
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              zIndex: 10,
            }}
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
                <DropdownMenu.Item onSelect={() => setShowInfoDialog(true)}>
                  <InfoCircledIcon width={14} height={14} />
                  <Text ml="2">Video info</Text>
                </DropdownMenu.Item>
                {onDownloadVideo && (
                  <DropdownMenu.Item onSelect={onDownloadVideo}>
                    <DownloadIcon width={14} height={14} />
                    <Text ml="2">Download video</Text>
                  </DropdownMenu.Item>
                )}
                {onExportData && task.result_s3_key && (
                  <DropdownMenu.Item onSelect={onExportData}>
                    <FileIcon width={14} height={14} />
                    <Text ml="2">Export data</Text>
                  </DropdownMenu.Item>
                )}
                {onDelete && (
                  <DropdownMenu.Separator />
                )}
                {onDelete && (
                  <DropdownMenu.Item 
                    color="red" 
                    onSelect={() => setShowDeleteDialog(true)}
                  >
                    <TrashIcon width={14} height={14} />
                    <Text ml="2">Delete</Text>
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Box>
        
        {/* Duration badge overlay */}
        {task.video_length && (
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
              {formatDuration(Math.round(task.video_length))}
            </Text>
          </Box>
        )}
        
        {/* Play overlay for completed tasks */}
        {canView && (
          <Flex
            align="center"
            justify="center"
            className={isPreparing ? "play-overlay play-overlay-preparing" : "play-overlay"}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.3)",
              opacity: isPreparing ? 1 : 0,
              transition: "opacity 0.2s ease",
            }}
          >
            <Box
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                backgroundColor: isPreparing ? "var(--gray-9)" : "var(--mint-9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              {isPreparing ? (
                <Spinner size="2" style={{ color: "white" }} />
              ) : (
                <PlayIcon width={24} height={24} color="white" />
              )}
            </Box>
          </Flex>
        )}
        
        {/* Progress bar for active tasks */}
        {isActive && (
          <Box
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "0 8px 8px",
            }}
          >
            <Box
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
                borderRadius: "6px",
                padding: "8px",
                backdropFilter: "blur(4px)",
              }}
            >
              <Flex justify="between" align="center" mb="1">
                <Text size="1" style={{ color: "white" }}>
                  {statusConfig.label}
                </Text>
                {progress.eta && (
                  <Text 
                    size="1" 
                    style={{ 
                      color: progress.isOverdue ? "var(--red-9)" : "var(--mint-9)",
                      fontWeight: 500,
                    }}
                  >
                    {progress.eta}
                  </Text>
                )}
              </Flex>
              <Progress 
                value={progress.percent} 
                color={progress.isOverdue ? "red" : "mint"}
                style={{ height: 6 }}
              />
            </Box>
          </Box>
        )}
      </Box>
      
      {/* Card content */}
      <Flex direction="column" gap="2" p="3">
        {/* Status and actions row */}
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <Badge color={statusConfig.color} variant="soft">
              <StatusIcon width={12} height={12} />
              <Text size="1" ml="1">{statusConfig.label}</Text>
            </Badge>
            
            {/* New badge for completed tasks that haven't been viewed */}
            {isNew && task.status === "completed" && (
              <Badge color="blue" variant="solid" size="1">
                New
              </Badge>
            )}
          </Flex>
          
          {task.status === "completed" && !task.result_s3_key && onFetchResult && (
            <IconButton
              icon={<UpdateIcon />}
              onClick={() => onFetchResult()}
              variant="soft"
              color="mint"
              size="1"
              ariaLabel="Fetch result"
              tooltip="Get result from SportAI"
              disabled={isFetching}
            />
          )}
        </Flex>
        
        {/* Task type */}
        <Text size="2" weight="medium" style={{ textTransform: "capitalize" }}>
          {task.task_type.replace(/_/g, " ")}
        </Text>
        
        {/* Time info */}
        <Text size="1" color="gray">
          {formatTimeAgo(task.created_at)}
        </Text>
        
        {/* Error message for failed tasks */}
        {task.status === "failed" && task.error_message && (
          <Text size="1" color="red" style={{ 
            overflow: "hidden", 
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {task.error_message}
          </Text>
        )}
      </Flex>
      
      {/* Hidden elements for thumbnail generation */}
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      
      {/* Delete confirmation dialog */}
      <AlertDialog.Root open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialog.Content maxWidth="400px" onClick={(e) => e.stopPropagation()}>
          <AlertDialog.Title>Delete Video</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Are you sure you want to delete this video analysis? This action cannot be undone.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button className={buttonStyles.actionButtonSquareSecondary}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                className={buttonStyles.actionButtonSquareRed}
                onClick={() => {
                  onDelete?.();
                  setShowDeleteDialog(false);
                }}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
      
      {/* Video Info Dialog */}
      <Dialog.Root open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <Dialog.Content maxWidth="420px" onClick={(e) => e.stopPropagation()}>
          <Flex justify="between" align="center" mb="3">
            <Dialog.Title size="4" weight="bold" style={{ margin: 0 }}>
              Video Information
            </Dialog.Title>
            <Dialog.Close>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                  color: "var(--gray-11)",
                }}
              >
                <Cross2Icon width={16} height={16} />
              </button>
            </Dialog.Close>
          </Flex>
          
          {/* Video Preview */}
          <Box
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16/9",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "var(--gray-3)",
              marginBottom: "16px",
            }}
          >
            {thumbnail ? (
              <img
                src={thumbnail}
                alt="Video thumbnail"
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
                  backgroundColor: SPORT_BG_COLORS[task.sport],
                }}
              >
                <Text size="8" style={{ opacity: 0.7 }}>
                  {SPORT_ICONS[task.sport]}
                </Text>
              </Flex>
            )}
            
            {/* Sport badge */}
            <Box
              style={{
                position: "absolute",
                top: "8px",
                left: "8px",
              }}
            >
              <Badge color={SPORT_COLORS[task.sport] as "cyan" | "orange" | "green"} variant="solid" size="1">
                {task.sport.charAt(0).toUpperCase() + task.sport.slice(1)}
              </Badge>
            </Box>
          </Box>
          
          {/* Video Details */}
          {loadingMetadata ? (
            <Flex align="center" justify="center" py="4">
              <Spinner size="2" />
              <Text size="2" color="gray" ml="2">Loading video details...</Text>
            </Flex>
          ) : (
            <Flex direction="column" gap="2">
              {/* Resolution */}
              <Flex justify="between" align="center" py="2" style={{ borderBottom: "1px solid var(--gray-4)" }}>
                <Text size="2" color="gray">Resolution</Text>
                <Text size="2" weight="medium">
                  {videoMetadata?.width && videoMetadata?.height 
                    ? `${videoMetadata.width} × ${videoMetadata.height}`
                    : "—"}
                </Text>
              </Flex>
              
              {/* Duration */}
              <Flex justify="between" align="center" py="2" style={{ borderBottom: "1px solid var(--gray-4)" }}>
                <Text size="2" color="gray">Duration</Text>
                <Text size="2" weight="medium">
                  {videoMetadata?.duration 
                    ? formatDuration(Math.round(videoMetadata.duration))
                    : task.video_length 
                      ? formatDuration(Math.round(task.video_length))
                      : "—"}
                </Text>
              </Flex>
              
              {/* File Size */}
              <Flex justify="between" align="center" py="2" style={{ borderBottom: "1px solid var(--gray-4)" }}>
                <Text size="2" color="gray">File Size</Text>
                <Text size="2" weight="medium">
                  {videoMetadata?.fileSize 
                    ? formatFileSize(videoMetadata.fileSize)
                    : "—"}
                </Text>
              </Flex>
              
              {/* Format */}
              <Flex justify="between" align="center" py="2" style={{ borderBottom: "1px solid var(--gray-4)" }}>
                <Text size="2" color="gray">Format</Text>
                <Text size="2" weight="medium">
                  {videoMetadata?.format || "—"}
                </Text>
              </Flex>
              
              {/* Codec (Encoding) */}
              <Flex justify="between" align="center" py="2" style={{ borderBottom: "1px solid var(--gray-4)" }}>
                <Text size="2" color="gray">Encoding</Text>
                <Text size="2" weight="medium">
                  {videoMetadata?.codec || "—"}
                </Text>
              </Flex>
              
              {/* Framerate */}
              <Flex justify="between" align="center" py="2" style={{ borderBottom: "1px solid var(--gray-4)" }}>
                <Text size="2" color="gray">Framerate</Text>
                <Text size="2" weight="medium">
                  {videoMetadata?.framerate 
                    ? `${videoMetadata.framerate} fps`
                    : "—"}
                </Text>
              </Flex>
              
              {/* Bitrate */}
              <Flex justify="between" align="center" py="2" style={{ borderBottom: "1px solid var(--gray-4)" }}>
                <Text size="2" color="gray">Bitrate</Text>
                <Text size="2" weight="medium">
                  {videoMetadata?.bitrate 
                    ? `${videoMetadata.bitrate.toLocaleString()} kbps`
                    : "—"}
                </Text>
              </Flex>
              
              {/* Task Status */}
              <Flex justify="between" align="center" py="2" style={{ borderBottom: "1px solid var(--gray-4)" }}>
                <Text size="2" color="gray">Analysis Status</Text>
                <Badge color={STATUS_CONFIG[task.status].color} variant="soft">
                  {STATUS_CONFIG[task.status].label}
                </Badge>
              </Flex>
              
              {/* Created Date */}
              <Flex justify="between" align="center" py="2" style={{ borderBottom: "1px solid var(--gray-4)" }}>
                <Text size="2" color="gray">Created</Text>
                <Text size="2" weight="medium">
                  {new Date(task.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </Flex>
              
              {/* Video URL (truncated) */}
              <Flex direction="column" gap="1" py="2">
                <Flex justify="between" align="center">
                  <Text size="2" color="gray">Source URL</Text>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(task.video_url);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      borderRadius: "4px",
                      color: copiedUrl ? "var(--green-11)" : "var(--gray-11)",
                      fontSize: "12px",
                      transition: "color 0.2s ease",
                    }}
                  >
                    {copiedUrl ? (
                      <>
                        <CheckIcon width={12} height={12} />
                        Copied
                      </>
                    ) : (
                      <>
                        <CopyIcon width={12} height={12} />
                        Copy
                      </>
                    )}
                  </button>
                </Flex>
                <Text 
                  size="1" 
                  style={{ 
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    color: "var(--accent-11)",
                    backgroundColor: "var(--gray-3)",
                    padding: "8px",
                    borderRadius: "4px",
                    maxHeight: "60px",
                    overflow: "auto",
                  }}
                >
                  {task.video_url}
                </Text>
              </Flex>
            </Flex>
          )}
          
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button className={buttonStyles.actionButtonSquareSecondary}>
                Close
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
      
      <style jsx>{`
        :global(.task-tile:hover) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
          border-color: var(--mint-9) !important;
        }
        
        :global(.task-tile:hover .play-overlay) {
          opacity: 1 !important;
        }
      `}</style>
    </Card>
  );
}

