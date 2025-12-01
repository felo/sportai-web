"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Flex, Text, Badge, Card, Progress } from "@radix-ui/themes";
import { PlayIcon, CheckCircledIcon, CrossCircledIcon, UpdateIcon } from "@radix-ui/react-icons";
import { IconButton } from "@/components/ui";

interface Task {
  id: string;
  task_type: string;
  sport: "tennis" | "padel" | "pickleball";
  sportai_task_id: string | null;
  video_url: string;
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
}

const SPORT_COLORS: Record<Task["sport"], string> = {
  padel: "cyan",
  tennis: "orange",
  pickleball: "green",
};

const SPORT_ICONS: Record<Task["sport"], string> = {
  padel: "🎾",
  tennis: "🎾",
  pickleball: "🏓",
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

export function TaskTile({ task, onClick, onFetchResult, isFetching }: TaskTileProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setTick] = useState(0);
  
  // Force re-render every second for live progress updates
  useEffect(() => {
    if (task.status !== "processing" && task.status !== "pending") return;
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [task.status]);
  
  // Generate thumbnail from video
  useEffect(() => {
    if (thumbnail || thumbnailError) return;
    
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
  }, [task.video_url, thumbnail, thumbnailError]);
  
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
  const canView = task.status === "completed" && task.result_s3_key;
  
  return (
    <Card
      style={{
        cursor: canView ? "pointer" : "default",
        transition: "all 0.2s ease",
        border: "1px solid var(--gray-6)",
        overflow: "hidden",
        position: "relative",
      }}
      className="task-tile"
      onClick={canView ? onClick : undefined}
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
              backgroundColor: "var(--gray-4)",
            }}
          >
            <Text size="6" style={{ opacity: 0.5 }}>
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
            className="play-overlay"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.3)",
              opacity: 0,
              transition: "opacity 0.2s ease",
            }}
          >
            <Box
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                backgroundColor: "var(--mint-9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              <PlayIcon width={24} height={24} color="white" />
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
          <Badge color={statusConfig.color} variant="soft">
            <StatusIcon width={12} height={12} />
            <Text size="1" ml="1">{statusConfig.label}</Text>
          </Badge>
          
          {task.status === "completed" && !task.result_s3_key && onFetchResult && (
            <IconButton
              icon={<UpdateIcon />}
              onClick={(e) => {
                e.stopPropagation();
                onFetchResult();
              }}
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

