"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Dialog, Flex, Text, Badge, Box, Spinner, Button } from "@radix-ui/themes";
import { Cross2Icon, CopyIcon, CheckIcon, ReloadIcon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";
import type { Task, VideoMetadata } from "../types";
import { SPORT_COLORS, SPORT_ICONS, SPORT_BG_COLORS, STATUS_CONFIG } from "../constants";
import { formatDuration, formatFileSize } from "../utils";
import { useVideoMetadata } from "../hooks";

interface VideoInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  thumbnail: string | null;
  isRegenerating?: boolean;
  onRegenerateThumbnail?: () => void;
}

/**
 * Dialog showing detailed video information and metadata
 */
export function VideoInfoDialog({
  open,
  onOpenChange,
  task,
  thumbnail,
  isRegenerating,
  onRegenerateThumbnail,
}: VideoInfoDialogProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const { metadata, isLoading, fetchMetadata } = useVideoMetadata({
    videoUrl: task.video_url,
    videoLength: task.video_length,
  });

  // Fetch metadata when dialog opens
  useEffect(() => {
    if (open && !metadata) {
      fetchMetadata();
    }
  }, [open, metadata, fetchMetadata]);

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(task.video_url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
          onClick={onRegenerateThumbnail}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16/9",
            borderRadius: "8px",
            overflow: "hidden",
            backgroundColor: "var(--gray-3)",
            marginBottom: "16px",
            cursor: onRegenerateThumbnail ? "pointer" : "default",
          }}
          title={onRegenerateThumbnail ? "Click to regenerate thumbnail" : undefined}
        >
          {isRegenerating ? (
            <Flex
              align="center"
              justify="center"
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: SPORT_BG_COLORS[task.sport],
              }}
            >
              <Spinner size="3" />
            </Flex>
          ) : thumbnail ? (
            <>
              <Image
                src={thumbnail}
                alt="Video thumbnail"
                fill
                sizes="420px"
                style={{ objectFit: "cover" }}
              />
              {onRegenerateThumbnail && (
                <Box
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "8px",
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    opacity: 0.7,
                    transition: "opacity 0.2s ease",
                  }}
                  className="refresh-hint"
                >
                  <ReloadIcon width={12} height={12} style={{ color: "white" }} />
                  <Text size="1" style={{ color: "white" }}>
                    Refresh
                  </Text>
                </Box>
              )}
            </>
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
          <Box style={{ position: "absolute", top: "8px", left: "8px" }}>
            <Badge color={SPORT_COLORS[task.sport]} variant="solid" size="1">
              {task.sport.charAt(0).toUpperCase() + task.sport.slice(1)}
            </Badge>
          </Box>
        </Box>

        {/* Metadata Rows */}
        {isLoading ? (
          <Flex align="center" justify="center" py="4">
            <Spinner size="2" />
            <Text size="2" color="gray" ml="2">
              Loading video details...
            </Text>
          </Flex>
        ) : (
          <Flex direction="column" gap="2">
            <MetadataRow label="Resolution" value={formatResolution(metadata)} />
            <MetadataRow label="Duration" value={formatMetadataDuration(metadata, task.video_length)} />
            <MetadataRow label="File Size" value={metadata?.fileSize ? formatFileSize(metadata.fileSize) : "—"} />
            <MetadataRow label="Format" value={metadata?.format || "—"} />
            <MetadataRow label="Encoding" value={metadata?.codec || "—"} />
            <MetadataRow label="Framerate" value={metadata?.framerate ? `${metadata.framerate} fps` : "—"} />
            <MetadataRow label="Bitrate" value={metadata?.bitrate ? `${metadata.bitrate.toLocaleString()} kbps` : "—"} />

            <Flex justify="between" align="center" py="2" style={{ borderBottom: "1px solid var(--gray-4)" }}>
              <Text size="2" color="gray">Analysis Status</Text>
              <Badge color={STATUS_CONFIG[task.status].color} variant="soft">
                {STATUS_CONFIG[task.status].label}
              </Badge>
            </Flex>

            <MetadataRow label="Created" value={formatCreatedDate(task.created_at)} />

            {/* Video URL */}
            <Flex direction="column" gap="1" py="2">
              <Flex justify="between" align="center">
                <Text size="2" color="gray">Source URL</Text>
                <button onClick={handleCopyUrl} style={copyButtonStyle(copiedUrl)}>
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
  );
}

// Helper Components
function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="between" align="center" py="2" style={{ borderBottom: "1px solid var(--gray-4)" }}>
      <Text size="2" color="gray">{label}</Text>
      <Text size="2" weight="medium">{value}</Text>
    </Flex>
  );
}

// Helper Functions
function formatResolution(metadata: VideoMetadata | null): string {
  if (metadata?.width && metadata?.height) {
    return `${metadata.width} × ${metadata.height}`;
  }
  return "—";
}

function formatMetadataDuration(metadata: VideoMetadata | null, videoLength: number | null): string {
  if (metadata?.duration) {
    return formatDuration(Math.round(metadata.duration));
  }
  if (videoLength) {
    return formatDuration(Math.round(videoLength));
  }
  return "—";
}

function formatCreatedDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function copyButtonStyle(copied: boolean): React.CSSProperties {
  return {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    borderRadius: "4px",
    color: copied ? "var(--green-11)" : "var(--gray-11)",
    fontSize: "12px",
    transition: "color 0.2s ease",
  };
}


