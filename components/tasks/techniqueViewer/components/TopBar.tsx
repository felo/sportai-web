"use client";

import { Box, Flex, IconButton, Tooltip, Text, Badge, DropdownMenu } from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  GearIcon,
  DoubleArrowRightIcon,
  GridIcon,
  VideoIcon,
  ChatBubbleIcon,
  AngleIcon,
} from "@radix-ui/react-icons";
import { ANGLE_PRESETS } from "@/components/videoPoseViewerV2";
import { getSportColor } from "@/components/tasks/viewer/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { ViewMode } from "../types";

interface TopBarProps {
  // Navigation
  onBack?: () => void;
  backLabel: string;
  
  // Sport & Context
  sport?: string;
  handednessResult: { dominantHand: "left" | "right"; confidence: number } | null;
  swingCount: number;
  overallConfidence: number | null;
  
  // View Mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  
  // Annotation Mode
  annotationMode: boolean;
  onAnnotationModeChange: (enabled: boolean) => void;
  
  // Angle Config
  showAngles: boolean;
  hasActiveAngles: boolean;
  useComplementaryAngles: boolean;
  anglePrecision: number;
  measuredAngles: Array<[number, number, number]>;
  isAngleActive: (angle: [number, number, number]) => boolean;
  toggleAngle: (angle: [number, number, number]) => void;
  onShowAnglesChange: (show: boolean) => void;
  onUseComplementaryAnglesChange: (use: boolean) => void;
  onAnglePrecisionChange: (precision: number) => void;
  
  // Settings Panel
  showPanel: boolean;
  onShowPanelChange: (show: boolean) => void;
  
  // Developer Mode
  developerMode?: boolean;
}

/**
 * Top bar component for TechniqueViewer.
 * Contains navigation, badges, toggles, and settings.
 */
export function TopBar({
  onBack,
  backLabel,
  sport,
  handednessResult,
  swingCount,
  overallConfidence,
  viewMode,
  onViewModeChange,
  annotationMode,
  onAnnotationModeChange,
  showAngles,
  hasActiveAngles,
  useComplementaryAngles,
  anglePrecision,
  measuredAngles,
  isAngleActive,
  toggleAngle,
  onShowAnglesChange,
  onUseComplementaryAnglesChange,
  onAnglePrecisionChange,
  showPanel,
  onShowPanelChange,
  developerMode = false,
}: TopBarProps) {
  const isMobile = useIsMobile();

  return (
    <Flex
      align="center"
      justify="between"
      style={{
        height: "57px",
        padding: "0 16px",
        backgroundColor: "var(--gray-1)",
        borderBottom: "1px solid var(--gray-6)",
      }}
    >
      <Flex align="center" gap="3">
        {onBack && (
          <Tooltip content={backLabel}>
            <IconButton
              size="2"
              variant="ghost"
              onClick={onBack}
              style={{ color: "white" }}
            >
              <ArrowLeftIcon width={18} height={18} />
            </IconButton>
          </Tooltip>
        )}
        {!isMobile && sport && sport !== "all" && (
          <Badge color={getSportColor(sport)} size="2">
            {sport.charAt(0).toUpperCase() + sport.slice(1)}
          </Badge>
        )}
        {!isMobile && (
          <Badge variant="soft" size="2">
            Technique
          </Badge>
        )}
        {!isMobile && handednessResult && (
          <Badge variant="soft" size="2">
            {handednessResult.dominantHand === "right" ? "Right" : "Left"}-handed
          </Badge>
        )}
        {!isMobile && swingCount > 0 && (
          <Badge color="blue" size="2">
            {swingCount} Swing{swingCount !== 1 ? "s" : ""}
          </Badge>
        )}
        {overallConfidence !== null && (
          <Tooltip
            content={
              <Text size="1" style={{ display: "block", maxWidth: "240px" }}>
                How reliably the AI tracks body movement.
                <br />
                <br />
                • 70%+ Excellent — highly accurate tracking
                <br />
                • 50-70% Good — reliable for most analysis
                <br />
                • Below 50% — consider re-recording with better visibility
              </Text>
            }
          >
            <Badge
              color={
                overallConfidence >= 0.7
                  ? "green"
                  : overallConfidence >= 0.5
                    ? "yellow"
                    : "orange"
              }
              size="2"
              style={{ cursor: "help" }}
            >
              {(overallConfidence * 100).toFixed(0)}% Confidence
            </Badge>
          </Tooltip>
        )}
      </Flex>

      <Flex align="center" gap="4">
        {/* Annotation Mode Toggle - like Figma's comment mode */}
        {viewMode === "player" && (
          <Tooltip content={annotationMode ? "Exit annotation mode" : "Add annotations"}>
            <IconButton
              size="2"
              variant={annotationMode ? "solid" : "ghost"}
              onClick={() => onAnnotationModeChange(!annotationMode)}
              style={{
                color: annotationMode ? "var(--gray-1)" : "white",
                backgroundColor: annotationMode ? "var(--accent-9)" : undefined,
              }}
            >
              <ChatBubbleIcon width={18} height={18} />
            </IconButton>
          </Tooltip>
        )}

        {/* Angles Dropdown Menu - toggle angle measurements on overlay */}
        {viewMode === "player" && (
          <DropdownMenu.Root>
            <Tooltip content="Angle measurements">
              <DropdownMenu.Trigger>
                <IconButton
                  size="2"
                  variant={showAngles && hasActiveAngles ? "solid" : "ghost"}
                  style={{
                    color: showAngles && hasActiveAngles ? "var(--gray-1)" : "white",
                    backgroundColor:
                      showAngles && hasActiveAngles ? "var(--accent-9)" : undefined,
                  }}
                >
                  <AngleIcon width={18} height={18} />
                </IconButton>
              </DropdownMenu.Trigger>
            </Tooltip>
            <DropdownMenu.Content size="1" style={{ minWidth: "200px" }}>
              {/* Master toggle */}
              <DropdownMenu.CheckboxItem
                checked={showAngles}
                onCheckedChange={(checked) => onShowAnglesChange(checked)}
                onSelect={(e) => e.preventDefault()}
              >
                Show Angles
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.CheckboxItem
                checked={useComplementaryAngles}
                onCheckedChange={(checked) => onUseComplementaryAnglesChange(checked)}
                onSelect={(e) => e.preventDefault()}
              >
                Use Outer Angles (180°−)
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.CheckboxItem
                checked={anglePrecision > 0}
                onCheckedChange={(checked) => onAnglePrecisionChange(checked ? 1 : 0)}
                onSelect={(e) => e.preventDefault()}
              >
                Show Decimals
              </DropdownMenu.CheckboxItem>

              <DropdownMenu.Separator />

              {/* Arms section */}
              <DropdownMenu.Label>Arms</DropdownMenu.Label>
              <DropdownMenu.CheckboxItem
                checked={isAngleActive(ANGLE_PRESETS.leftElbow)}
                onCheckedChange={() => toggleAngle(ANGLE_PRESETS.leftElbow)}
                onSelect={(e) => e.preventDefault()}
              >
                Left Elbow
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.CheckboxItem
                checked={isAngleActive(ANGLE_PRESETS.rightElbow)}
                onCheckedChange={() => toggleAngle(ANGLE_PRESETS.rightElbow)}
                onSelect={(e) => e.preventDefault()}
              >
                Right Elbow
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.CheckboxItem
                checked={isAngleActive(ANGLE_PRESETS.leftShoulder)}
                onCheckedChange={() => toggleAngle(ANGLE_PRESETS.leftShoulder)}
                onSelect={(e) => e.preventDefault()}
              >
                Left Shoulder
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.CheckboxItem
                checked={isAngleActive(ANGLE_PRESETS.rightShoulder)}
                onCheckedChange={() => toggleAngle(ANGLE_PRESETS.rightShoulder)}
                onSelect={(e) => e.preventDefault()}
              >
                Right Shoulder
              </DropdownMenu.CheckboxItem>

              <DropdownMenu.Separator />

              {/* Legs section */}
              <DropdownMenu.Label>Legs</DropdownMenu.Label>
              <DropdownMenu.CheckboxItem
                checked={isAngleActive(ANGLE_PRESETS.leftKnee)}
                onCheckedChange={() => toggleAngle(ANGLE_PRESETS.leftKnee)}
                onSelect={(e) => e.preventDefault()}
              >
                Left Knee
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.CheckboxItem
                checked={isAngleActive(ANGLE_PRESETS.rightKnee)}
                onCheckedChange={() => toggleAngle(ANGLE_PRESETS.rightKnee)}
                onSelect={(e) => e.preventDefault()}
              >
                Right Knee
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.CheckboxItem
                checked={isAngleActive(ANGLE_PRESETS.leftHip)}
                onCheckedChange={() => toggleAngle(ANGLE_PRESETS.leftHip)}
                onSelect={(e) => e.preventDefault()}
              >
                Left Hip
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.CheckboxItem
                checked={isAngleActive(ANGLE_PRESETS.rightHip)}
                onCheckedChange={() => toggleAngle(ANGLE_PRESETS.rightHip)}
                onSelect={(e) => e.preventDefault()}
              >
                Right Hip
              </DropdownMenu.CheckboxItem>

              <DropdownMenu.Separator />

              {/* Torso section */}
              <DropdownMenu.Label>Torso</DropdownMenu.Label>
              <DropdownMenu.CheckboxItem
                checked={isAngleActive(ANGLE_PRESETS.torsoTilt)}
                onCheckedChange={() => toggleAngle(ANGLE_PRESETS.torsoTilt)}
                onSelect={(e) => e.preventDefault()}
              >
                Torso Tilt
              </DropdownMenu.CheckboxItem>

              <DropdownMenu.Separator />

              {/* Count indicator */}
              <Box style={{ padding: "4px 12px" }}>
                <Text size="1" color="gray">
                  {measuredAngles.length} angle{measuredAngles.length !== 1 ? "s" : ""}{" "}
                  selected
                </Text>
              </Box>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        )}

        {/* View Swings / View Player toggle */}
        {developerMode && swingCount > 0 && (
          <Tooltip
            content={viewMode === "player" ? "View detected swings" : "View full video"}
          >
            <IconButton
              size="2"
              variant={viewMode === "swings" ? "solid" : "ghost"}
              onClick={() =>
                onViewModeChange(viewMode === "player" ? "swings" : "player")
              }
              style={{ color: "white" }}
            >
              {viewMode === "player" ? (
                <GridIcon width={18} height={18} />
              ) : (
                <VideoIcon width={18} height={18} />
              )}
            </IconButton>
          </Tooltip>
        )}

        {developerMode && (
          <Tooltip content={showPanel ? "Hide settings" : "Show settings"}>
            <IconButton
              size="2"
              variant={showPanel ? "solid" : "ghost"}
              onClick={() => onShowPanelChange(!showPanel)}
              style={{ color: "white" }}
            >
              {showPanel ? (
                <DoubleArrowRightIcon width={18} height={18} />
              ) : (
                <GearIcon width={18} height={18} />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Flex>
    </Flex>
  );
}
