"use client";

import { Box, Flex, Heading, Text, Tooltip } from "@radix-ui/themes";
import { Cross2Icon, InfoCircledIcon } from "@radix-ui/react-icons";
import { IconButton, ToggleSwitch } from "@/components/ui";
import { FEATURE_FLAGS } from "../constants";

interface VideoSettingsProps {
  showBallTracker: boolean;
  onBallTrackerChange: (value: boolean) => void;
  usePerspective: boolean;
  onPerspectiveChange: (value: boolean) => void;
  showTrail: boolean;
  onTrailChange: (value: boolean) => void;
  useSmoothing: boolean;
  onSmoothingChange: (value: boolean) => void;
  showBounceRipples: boolean;
  onBounceRipplesChange: (value: boolean) => void;
  showVelocity: boolean;
  onVelocityChange: (value: boolean) => void;
  showPlayerBoxes: boolean;
  onPlayerBoxesChange: (value: boolean) => void;
  showPose: boolean;
  onPoseChange: (value: boolean) => void;
  showCourtKeypoints: boolean;
  onCourtKeypointsChange: (value: boolean) => void;
  hasCourtKeypoints?: boolean; // Whether court keypoint data is available
  // Data enhancement
  inferSwingBounces: boolean;
  onInferSwingBouncesChange: (value: boolean) => void;
  inferTrajectoryBounces: boolean;
  onInferTrajectoryBouncesChange: (value: boolean) => void;
  inferAudioBounces: boolean;
  onInferAudioBouncesChange: (value: boolean) => void;
  onClose: () => void;
}

export function VideoSettings({
  showBallTracker,
  onBallTrackerChange,
  usePerspective,
  onPerspectiveChange,
  showTrail,
  onTrailChange,
  useSmoothing,
  onSmoothingChange,
  showBounceRipples,
  onBounceRipplesChange,
  showVelocity,
  onVelocityChange,
  showPlayerBoxes,
  onPlayerBoxesChange,
  showPose,
  onPoseChange,
  showCourtKeypoints,
  onCourtKeypointsChange,
  hasCourtKeypoints = false,
  inferSwingBounces,
  onInferSwingBouncesChange,
  inferTrajectoryBounces,
  onInferTrajectoryBouncesChange,
  inferAudioBounces,
  onInferAudioBouncesChange,
  onClose,
}: VideoSettingsProps) {
  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: "280px",
        backgroundColor: "var(--gray-2)",
        borderLeft: "1px solid var(--gray-6)",
        borderRadius: "0 var(--radius-3) var(--radius-3) 0",
        padding: "var(--space-4)",
        overflowY: "auto",
        zIndex: 99,
        animation: "slideInFromRight 0.3s ease-out",
        boxShadow: "-4px 0 12px rgba(0,0,0,0.1)",
      }}
    >
      <Flex direction="column" gap="4">
        <Flex justify="between" align="center">
          <Heading size="3" weight="medium">
            Video Settings
          </Heading>
          <IconButton
            icon={<Cross2Icon />}
            onClick={onClose}
            variant="ghost"
            size="1"
            ariaLabel="Close settings"
          />
        </Flex>

        <Box style={{ height: "1px", backgroundColor: "var(--gray-6)" }} />

        <ToggleSwitch
          checked={showBallTracker}
          onCheckedChange={onBallTrackerChange}
          label="Ball indicator"
        />

        <ToggleSwitch
          checked={showTrail}
          onCheckedChange={onTrailChange}
          label="Ball trail"
        />

        {showTrail && (
          <ToggleSwitch
            checked={useSmoothing}
            onCheckedChange={onSmoothingChange}
            label="Smooth trail"
          />
        )}

        <ToggleSwitch
          checked={showBounceRipples}
          onCheckedChange={onBounceRipplesChange}
          label="Bounce ripples"
        />

        <ToggleSwitch
          checked={showVelocity}
          onCheckedChange={onVelocityChange}
          label="Swing type and speed"
        />

        <ToggleSwitch
          checked={showPlayerBoxes}
          onCheckedChange={onPlayerBoxesChange}
          label="Player swing boxes"
        />

        <ToggleSwitch
          checked={showPose}
          onCheckedChange={onPoseChange}
          label="Player pose"
        />

        {(showBallTracker || showTrail || showBounceRipples || showVelocity) && (
          <ToggleSwitch
            checked={usePerspective}
            onCheckedChange={onPerspectiveChange}
            label="Overlay perspective"
          />
        )}

        {/* Data Enhancement Section */}
        <Box style={{ height: "1px", backgroundColor: "var(--gray-6)", marginTop: "var(--space-2)" }} />
        
        <Heading size="2" weight="medium" style={{ color: "var(--gray-11)" }}>
          Data Enhancement
        </Heading>

        <ToggleSwitch
          checked={inferSwingBounces}
          onCheckedChange={onInferSwingBouncesChange}
          label="Infer shot bounces"
        />

        <ToggleSwitch
          checked={inferTrajectoryBounces}
          onCheckedChange={onInferTrajectoryBouncesChange}
          label="Infer bounces from trajectory"
        />

        {FEATURE_FLAGS.AUDIO_ANALYSIS_ENABLED && (
          <Flex align="center" gap="2">
            <ToggleSwitch
              checked={inferAudioBounces}
              onCheckedChange={onInferAudioBouncesChange}
              label="Infer bounces from audio"
              disabled={true}
            />
            <Tooltip content="Requires CORS-enabled video. Coming soon!">
              <InfoCircledIcon style={{ color: "var(--gray-9)", cursor: "help" }} />
            </Tooltip>
          </Flex>
        )}

        {/* Debug Section */}
        {hasCourtKeypoints && (
          <>
            <Box style={{ height: "1px", backgroundColor: "var(--gray-6)", marginTop: "var(--space-2)" }} />
            
            <Heading size="2" weight="medium" style={{ color: "var(--gray-11)" }}>
              Debug Overlays
            </Heading>

            <Flex align="center" gap="2">
              <ToggleSwitch
                checked={showCourtKeypoints}
                onCheckedChange={onCourtKeypointsChange}
                label="Court detection keypoints"
              />
              <Tooltip content="Shows the AI-detected court keypoints used for coordinate mapping">
                <InfoCircledIcon style={{ color: "var(--gray-9)", cursor: "help" }} />
              </Tooltip>
            </Flex>
          </>
        )}
      </Flex>
    </Box>
  );
}

