"use client";

import { useState } from "react";
import { Card, Flex, Text, Badge } from "@radix-ui/themes";
import { UpdateIcon } from "@radix-ui/react-icons";
import { IconButton } from "@/components/ui";

import type { TaskTileProps } from "./types";
import { STATUS_CONFIG } from "./constants";
import { formatTimeAgo } from "./utils";
import { isSampleTask } from "../sampleTasks";
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
  onExportPoseData,
  isNew,
}: TaskTileProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  const { thumbnail, isGenerating, regenerate, containerRef } = useThumbnail({
    videoUrl: task.video_url,
    thumbnailUrl: task.thumbnail_url,
  });
  
  console.log("[TaskTile] Rendering:", task.id, { thumbnail: !!thumbnail, isGenerating, videoUrl: task.video_url?.substring(0, 60) });

  const progress = useTaskProgress({ task });

  const statusConfig = STATUS_CONFIG[task.status];
  const StatusIcon = statusConfig.icon;
  const canView = task.status === "completed";

  return (
    <Card
      ref={containerRef as React.RefObject<HTMLDivElement>}
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
        onExportPoseData={onExportPoseData}
      />

      {/* Card content */}
      <Flex direction="column" gap="2" p="3">
        {/* Title row with badges aligned right */}
        <Flex justify="between" align="center">
          <Text size="2" weight="medium" style={{ textTransform: "capitalize" }}>
            {task.task_type.replace(/_/g, " ")}
          </Text>

          <Flex align="center" gap="2">
            {isSampleTask(task.id) ? (
              <Badge color="gray" variant="soft">
                <Text size="1">Sample</Text>
              </Badge>
            ) : (
              <>
                {/* Only show status badge for non-completed tasks */}
                {task.status !== "completed" && (
                  <Badge color={statusConfig.color} variant="soft">
                    <StatusIcon width={12} height={12} />
                    <Text size="1" ml="1">
                      {statusConfig.label}
                    </Text>
                  </Badge>
                )}

                {isNew && task.status === "completed" && (
                  <Badge color="blue" variant="solid" size="1">
                    New
                  </Badge>
                )}

                {/* Fetch result button - only for SportAI tasks (not technique) */}
                {task.status === "completed" && !task.result_s3_key && onFetchResult && task.task_type !== "technique" && (
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
              </>
            )}
          </Flex>
        </Flex>

        {/* Time info - hide for sample tasks */}
        {!isSampleTask(task.id) && (
          <Text size="1" color="gray">
            {formatTimeAgo(task.created_at)}
          </Text>
        )}

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
        isRegenerating={isGenerating}
        onRegenerateThumbnail={regenerate}
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

