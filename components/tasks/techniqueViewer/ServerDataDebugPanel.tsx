"use client";

import { useState, useEffect, useCallback } from "react";
import { Box, Flex, Text, Button, Badge, Code, ScrollArea } from "@radix-ui/themes";
import { ReloadIcon, TrashIcon, DownloadIcon, UploadIcon } from "@radix-ui/react-icons";
import { loadPoseData, savePoseData, deletePoseData, type StoredPoseData } from "@/lib/poseDataService";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";

interface ServerDataDebugPanelProps {
  videoS3Key: string | null;
  taskId?: string | null; // Optional, just for display reference
  preprocessedPoses: Map<number, PoseDetectionResult[]> | null;
  videoFPS: number;
  modelUsed: string;
  onPoseDataLoaded?: (data: StoredPoseData) => void;
  wasAutoLoaded?: boolean;
}

// Helper to show the S3 path that would be used for storage
function getPoseDataPath(videoS3Key: string): string {
  const sanitizedKey = videoS3Key.replace(/\//g, "_");
  return `pose-data/videos/${sanitizedKey}/poses.json.gz`;
}

export function ServerDataDebugPanel({
  videoS3Key,
  taskId,
  preprocessedPoses,
  videoFPS,
  modelUsed,
  onPoseDataLoaded,
  wasAutoLoaded,
}: ServerDataDebugPanelProps) {
  const [serverData, setServerData] = useState<StoredPoseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Load server data on mount
  const loadServerData = useCallback(async () => {
    if (!videoS3Key) return;
    
    setIsLoading(true);
    setError(null);
    
    const result = await loadPoseData(videoS3Key);
    
    if (result.success && result.data) {
      setServerData(result.data);
      setLastAction("Loaded from server");
      onPoseDataLoaded?.(result.data);
    } else if (result.error !== "No pose data found") {
      setError(result.error || "Failed to load");
    }
    
    setIsLoading(false);
  }, [videoS3Key, onPoseDataLoaded]);

  useEffect(() => {
    loadServerData();
  }, [loadServerData]);

  // Save current poses to server
  const handleSave = async () => {
    if (!videoS3Key || !preprocessedPoses || preprocessedPoses.size === 0) {
      setError(videoS3Key ? "No pose data to save" : "No video S3 key");
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await savePoseData(videoS3Key, preprocessedPoses, videoFPS, modelUsed);

    if (result.success) {
      setLastAction(`Saved ${preprocessedPoses.size} frames`);
      loadServerData(); // Reload to show saved data
    } else {
      setError(result.error || "Failed to save");
    }

    setIsSaving(false);
  };

  // Delete server data
  const handleDelete = async () => {
    if (!videoS3Key) return;

    setIsDeleting(true);
    setError(null);

    const success = await deletePoseData(videoS3Key);

    if (success) {
      setServerData(null);
      setLastAction("Deleted from server");
    } else {
      setError("Failed to delete");
    }

    setIsDeleting(false);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const estimateSize = (data: StoredPoseData): number => {
    return new Blob([JSON.stringify(data)]).size;
  };

  return (
    <Box
      style={{
        padding: "12px",
        backgroundColor: "var(--gray-2)",
        borderRadius: "8px",
        border: "1px solid var(--gray-6)",
      }}
    >
      <Flex direction="column" gap="3">
        {/* Header */}
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <Text size="2" weight="medium" color="gray">
              Server Data Debug
            </Text>
            {wasAutoLoaded && (
              <Badge size="1" color="green">
                Auto-loaded
              </Badge>
            )}
          </Flex>
          {videoS3Key ? (
            <Badge size="1" color="blue" title={videoS3Key}>
              S3: {videoS3Key.length > 20 ? `...${videoS3Key.slice(-20)}` : videoS3Key}
            </Badge>
          ) : (
            <Badge size="1" color="red">
              No S3 Key
            </Badge>
          )}
        </Flex>

        {/* Storage Info */}
        {videoS3Key && (
          <Box
            style={{
              padding: "6px 8px",
              backgroundColor: "var(--gray-3)",
              borderRadius: "4px",
              fontSize: "10px",
              fontFamily: "monospace",
              wordBreak: "break-all",
            }}
          >
            <Text size="1" color="gray">S3 Path: </Text>
            <Text size="1" style={{ opacity: 0.8 }}>{getPoseDataPath(videoS3Key)}</Text>
          </Box>
        )}

        {/* Status */}
        {error && (
          <Text size="1" color="red">
            ⚠️ {error}
          </Text>
        )}
        {lastAction && !error && (
          <Text size="1" color="green">
            ✓ {lastAction}
          </Text>
        )}

        {/* Server Data Info */}
        {serverData ? (
          <Box
            style={{
              padding: "8px",
              backgroundColor: "var(--gray-3)",
              borderRadius: "4px",
            }}
          >
            <Flex direction="column" gap="1">
              <Flex justify="between">
                <Text size="1" color="gray">Version:</Text>
                <Text size="1">{serverData.version}</Text>
              </Flex>
              <Flex justify="between">
                <Text size="1" color="gray">Created:</Text>
                <Text size="1">{new Date(serverData.createdAt).toLocaleString()}</Text>
              </Flex>
              <Flex justify="between">
                <Text size="1" color="gray">Model:</Text>
                <Text size="1">{serverData.modelUsed}</Text>
              </Flex>
              <Flex justify="between">
                <Text size="1" color="gray">Frames:</Text>
                <Text size="1">{serverData.totalFrames.toLocaleString()}</Text>
              </Flex>
              <Flex justify="between">
                <Text size="1" color="gray">FPS:</Text>
                <Text size="1">{serverData.videoFPS}</Text>
              </Flex>
              <Flex justify="between">
                <Text size="1" color="gray">Size:</Text>
                <Text size="1">{formatBytes(estimateSize(serverData))}</Text>
              </Flex>
              {serverData.thumbnails && (
                <Flex justify="between">
                  <Text size="1" color="gray">Thumbnails:</Text>
                  <Text size="1">{Object.keys(serverData.thumbnails).length}</Text>
                </Flex>
              )}
            </Flex>
          </Box>
        ) : (
          <Text size="1" color="gray" style={{ fontStyle: "italic" }}>
            {isLoading ? "Loading..." : "No data on server"}
          </Text>
        )}

        {/* Local Data Info */}
        <Box
          style={{
            padding: "8px",
            backgroundColor: "var(--gray-3)",
            borderRadius: "4px",
          }}
        >
          <Flex direction="column" gap="1">
            <Text size="1" weight="medium" color="gray">Local Data</Text>
            <Flex justify="between">
              <Text size="1" color="gray">Frames:</Text>
              <Text size="1">{preprocessedPoses?.size.toLocaleString() ?? 0}</Text>
            </Flex>
            <Flex justify="between">
              <Text size="1" color="gray">Model:</Text>
              <Text size="1">{modelUsed || "None"}</Text>
            </Flex>
          </Flex>
        </Box>

        {/* Actions */}
        <Flex gap="2" wrap="wrap">
          <Button
            size="1"
            variant="soft"
            onClick={loadServerData}
            disabled={isLoading || !videoS3Key}
          >
            <ReloadIcon />
            {isLoading ? "Loading..." : "Reload"}
          </Button>
          
          <Button
            size="1"
            variant="soft"
            color="green"
            onClick={handleSave}
            disabled={isSaving || !videoS3Key || !preprocessedPoses || preprocessedPoses.size === 0}
          >
            <UploadIcon />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          
          <Button
            size="1"
            variant="soft"
            color="red"
            onClick={handleDelete}
            disabled={isDeleting || !videoS3Key || !serverData}
          >
            <TrashIcon />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </Flex>

        {/* Raw Data Preview */}
        {serverData && (
          <Box>
            <Text size="1" color="gray" weight="medium">
              Sample Data (first frame):
            </Text>
            <ScrollArea style={{ maxHeight: "100px" }}>
              <Code size="1" style={{ display: "block", whiteSpace: "pre-wrap", fontSize: "9px" }}>
                {JSON.stringify(
                  serverData.poses[Object.keys(serverData.poses)[0] as unknown as number]?.[0]?.keypoints?.slice(0, 3) ?? "No poses",
                  null,
                  2
                )}
              </Code>
            </ScrollArea>
          </Box>
        )}
      </Flex>
    </Box>
  );
}

