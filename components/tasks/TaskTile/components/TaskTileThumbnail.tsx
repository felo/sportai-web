"use client";

import { useState, useCallback } from "react";
import { Box, Flex, Text, Badge, Progress, DropdownMenu, Spinner } from "@radix-ui/themes";
import {
  PlayIcon,
  DotsVerticalIcon,
  TrashIcon,
  DownloadIcon,
  FileIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import type { Task, TaskProgress } from "../types";
import { SPORT_COLORS, SPORT_ICONS, SPORT_BG_COLORS, STATUS_CONFIG } from "../constants";
import { formatDuration } from "../utils";

const MAX_THUMBNAIL_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

interface TaskTileThumbnailProps {
  task: Task;
  thumbnail: string | null;
  progress: TaskProgress;
  isPreparing?: boolean;
  onShowInfo: () => void;
  onShowDelete?: () => void;
  onDownloadVideo?: () => void;
  onExportData?: () => void;
  onExportPoseData?: () => void;
}

/**
 * Thumbnail area with overlays for sport badge, menu, duration, play button, and progress
 */
export function TaskTileThumbnail({
  task,
  thumbnail,
  progress,
  isPreparing,
  onShowInfo,
  onShowDelete,
  onDownloadVideo,
  onExportData,
  onExportPoseData,
}: TaskTileThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryKey, setRetryKey] = useState(0); // Force re-render of img element
  
  const isActive = task.status === "processing" || task.status === "pending";
  const canView = task.status === "completed";
  
  // Handle image load error with retry logic
  const handleImageError = useCallback(() => {
    if (retryCount < MAX_THUMBNAIL_RETRIES) {
      // Schedule a retry after delay
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setRetryKey(prev => prev + 1); // Force img element to re-mount and retry
      }, RETRY_DELAY_MS);
    } else {
      // Max retries reached, show placeholder
      setImageError(true);
    }
  }, [retryCount]);
  
  // Show placeholder if no thumbnail or if image failed after all retries
  const showPlaceholder = !thumbnail || imageError;

  return (
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
      {showPlaceholder ? (
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
      ) : (
        <img
          key={retryKey} // Force re-mount on retry
          src={thumbnail!}
          alt={`Video thumbnail for ${task.sport}`}
          loading="lazy"
          decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={handleImageError}
        />
      )}

      {/* Sport Badge - hidden for "other" (all) sport */}
      {task.sport !== "all" && (
        <Box style={{ position: "absolute", top: "8px", left: "8px" }}>
          <Badge color={SPORT_COLORS[task.sport]} variant="solid" size="1">
            {task.sport.charAt(0).toUpperCase() + task.sport.slice(1)}
          </Badge>
        </Box>
      )}

      {/* Menu Dropdown */}
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
            <DropdownMenu.Item onSelect={onShowInfo}>
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
            {onExportPoseData && task.task_type === "technique" && task.status === "completed" && (
              <DropdownMenu.Item onSelect={onExportPoseData}>
                <FileIcon width={14} height={14} />
                <Text ml="2">Export Data</Text>
              </DropdownMenu.Item>
            )}
            {onShowDelete && (
              <>
                <DropdownMenu.Separator />
                <DropdownMenu.Item color="red" onSelect={onShowDelete}>
                  <TrashIcon width={14} height={14} />
                  <Text ml="2">Delete</Text>
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Box>

      {/* Duration Badge */}
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

      {/* Play Overlay (for completed tasks) */}
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

      {/* Progress Bar (for active tasks) */}
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
                {STATUS_CONFIG[task.status].label}
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
  );
}


