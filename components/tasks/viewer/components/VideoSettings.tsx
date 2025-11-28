"use client";

import { Box, Flex, Heading } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import { IconButton, ToggleSwitch } from "@/components/ui";

interface VideoSettingsProps {
  showBallTracker: boolean;
  onBallTrackerChange: (value: boolean) => void;
  usePerspective: boolean;
  onPerspectiveChange: (value: boolean) => void;
  onClose: () => void;
}

export function VideoSettings({
  showBallTracker,
  onBallTrackerChange,
  usePerspective,
  onPerspectiveChange,
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
          label="Show ball tracker"
        />

        {showBallTracker && (
          <ToggleSwitch
            checked={usePerspective}
            onCheckedChange={onPerspectiveChange}
            label="Overlay perspective"
          />
        )}
      </Flex>
    </Box>
  );
}

