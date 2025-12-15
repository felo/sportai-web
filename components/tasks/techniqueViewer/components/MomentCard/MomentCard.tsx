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
import Image from "next/image";
import { Box, Flex, Text, Badge, Card, DropdownMenu, Spinner, Button, Tooltip } from "@radix-ui/themes";
import {
  MagicWandIcon,
  Pencil2Icon,
  DotsVerticalIcon,
  TrashIcon,
  ResetIcon,
  PlayIcon,
} from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";
import type { MomentCardProps } from "./types";
import { getContrastTextColor, formatTime } from "./utils";
import { getCachedThumbnailByFrame, requestThumbnailCaptureByFrame } from "@/components/shared/hooks";
import { getMomentIcon } from "./MomentIcon";

// Debug logging
const DEBUG = false;
function log(...args: unknown[]) {
  if (DEBUG) console.log("[MomentCard]", ...args);
}

/**
 * MomentCard displays a single moment with thumbnail, metadata, and actions.
 */
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
  const initialCached = videoElement ? getCachedThumbnailByFrame(videoElement.src, moment.frame) : null;
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
      log(`[${moment.frame}]: Already have thumbnail`);
      return;
    }

    if (!videoElement) {
      log(`[${moment.frame}]: No video element`);
      return;
    }

    // Check cache again
    const cached = getCachedThumbnailByFrame(videoElement.src, moment.frame);
    if (cached) {
      log(`[${moment.frame}]: Found in cache on effect run`);
      setThumbnailUrl(cached);
      setIsCapturing(false);
      return;
    }

    // Request capture
    log(`[${moment.frame}]: Requesting capture`);
    setIsCapturing(true);

    // Default to 30 FPS if not known - frame number is used primarily for cache key
    const fps = 30;
    requestThumbnailCaptureByFrame(videoElement, moment.frame, fps).then((url) => {
      if (url) {
        log(`[${moment.frame}]: Promise resolved with thumbnail`);
        setThumbnailUrl(url);
      } else {
        log(`[${moment.frame}]: Promise resolved with null`);
      }
      setIsCapturing(false);
    });
  }, [videoElement, moment.time, moment.frame, thumbnailUrl]);

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
      <ThumbnailArea
        moment={moment}
        thumbnailUrl={thumbnailUrl}
        isCapturing={isCapturing}
        confidence={confidence}
        onView={onView}
        onAnalyse={onAnalyse}
        onDelete={onDelete}
        onResetAdjustment={onResetAdjustment}
        onEditName={onEditName}
      />

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

// ============================================================================
// Sub-components
// ============================================================================

interface ThumbnailAreaProps {
  moment: MomentCardProps["moment"];
  thumbnailUrl: string | null;
  isCapturing: boolean;
  confidence: number | undefined;
  onView: MomentCardProps["onView"];
  onAnalyse: MomentCardProps["onAnalyse"];
  onDelete?: MomentCardProps["onDelete"];
  onResetAdjustment?: MomentCardProps["onResetAdjustment"];
  onEditName?: MomentCardProps["onEditName"];
}

function ThumbnailArea({
  moment,
  thumbnailUrl,
  isCapturing,
  confidence,
  onView,
  onAnalyse,
  onDelete,
  onResetAdjustment,
  onEditName,
}: ThumbnailAreaProps) {
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
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt={moment.label}
          fill
          sizes="(max-width: 640px) 100vw, 300px"
          style={{
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

      {/* Type Badge - top left */}
      <TypeBadge moment={moment} />

      {/* Menu Dropdown - top right */}
      <MenuDropdown
        moment={moment}
        onView={onView}
        onAnalyse={onAnalyse}
        onDelete={onDelete}
        onResetAdjustment={onResetAdjustment}
        onEditName={onEditName}
      />

      {/* Confidence Badge - bottom left */}
      {confidence != null && <ConfidenceBadge confidence={confidence} />}

      {/* Time Badge - bottom right */}
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
  );
}

interface TypeBadgeProps {
  moment: MomentCardProps["moment"];
}

function TypeBadge({ moment }: TypeBadgeProps) {
  return (
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
  );
}

interface MenuDropdownProps {
  moment: MomentCardProps["moment"];
  onView: MomentCardProps["onView"];
  onAnalyse: MomentCardProps["onAnalyse"];
  onDelete?: MomentCardProps["onDelete"];
  onResetAdjustment?: MomentCardProps["onResetAdjustment"];
  onEditName?: MomentCardProps["onEditName"];
}

function MenuDropdown({
  moment,
  onView,
  onAnalyse,
  onDelete,
  onResetAdjustment,
  onEditName,
}: MenuDropdownProps) {
  return (
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
          {/* Edit name - only for user-created markers */}
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
  );
}

interface ConfidenceBadgeProps {
  confidence: number;
}

function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  return (
    <Tooltip
      content={
        <Text size="1" style={{ display: "block", maxWidth: "240px" }}>
          Pose detection confidence for this moment.
          <br />
          <br />
          • 70%+ Excellent — highly accurate tracking
          <br />
          • 50-70% Good — reliable for most analysis
          <br />• Below 50% — detection may be less reliable
        </Text>
      }
    >
      <Box
        style={{
          position: "absolute",
          bottom: "8px",
          left: "8px",
          backgroundColor:
            confidence >= 0.7
              ? "rgba(34, 197, 94, 0.9)"
              : confidence >= 0.5
                ? "rgba(234, 179, 8, 0.9)"
                : "rgba(100, 100, 100, 0.9)",
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
  );
}

export default MomentCard;
