"use client";

import { useState } from "react";
import { Card, Flex, Text, Badge } from "@radix-ui/themes";
import { UpdateIcon } from "@radix-ui/react-icons";
import { IconButton } from "@/components/ui";

import type { TaskTileProps } from "./types";
import { STATUS_CONFIG } from "./constants";
import { formatTimeAgo } from "./utils";
import { useThumbnail, useTaskProgress } from "./hooks";
import {
  TaskTileThumbnail,
  DeleteConfirmDialog,
  VideoInfoDialog,
} from "./components";

/**
 * Task tile card for displaying video analysis tasks in a grid
 */
export function TaskTile({
  task,
  onClick,
  onFetchResult,
  isFetching,
  onDelete,
  isDeleting,
  isPreparing,
  onDownloadVideo,
  onExportData,
  isNew,
}: TaskTileProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  const { thumbnail } = useThumbnail({
    videoUrl: task.video_url,
    thumbnailUrl: task.thumbnail_url,
  });

  const progress = useTaskProgress({ task });

  const statusConfig = STATUS_CONFIG[task.status];
  const StatusIcon = statusConfig.icon;
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
      {/* Thumbnail with overlays */}
      <TaskTileThumbnail
        task={task}
        thumbnail={thumbnail}
        progress={progress}
        isPreparing={isPreparing}
        onShowInfo={() => setShowInfoDialog(true)}
        onShowDelete={onDelete ? () => setShowDeleteDialog(true) : undefined}
        onDownloadVideo={onDownloadVideo}
        onExportData={onExportData}
      />

      {/* Card content */}
      <Flex direction="column" gap="2" p="3">
        {/* Status and actions row */}
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <Badge color={statusConfig.color} variant="soft">
              <StatusIcon width={12} height={12} />
              <Text size="1" ml="1">
                {statusConfig.label}
              </Text>
            </Badge>

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
          <Text
            size="1"
            color="red"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {task.error_message}
          </Text>
        )}
      </Flex>

      {/* Dialogs */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => onDelete?.()}
        isDeleting={isDeleting}
      />

      <VideoInfoDialog
        open={showInfoDialog}
        onOpenChange={setShowInfoDialog}
        task={task}
        thumbnail={thumbnail}
      />

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

