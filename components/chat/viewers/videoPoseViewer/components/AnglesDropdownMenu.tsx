"use client";

import { Box, Button, DropdownMenu, Text, Tooltip } from "@radix-ui/themes";
import { RulerSquareIcon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";

export interface AnglesDropdownMenuProps {
  measuredAngles: Array<[number, number, number]>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleAnglePreset: (angle: [number, number, number]) => void;
  onVelocityWristChange: (wrist: "left" | "right") => void;
}

// Angle preset definitions
const ANGLE_PRESETS = {
  leftElbow: { indices: [5, 7, 9] as [number, number, number], label: "Left Elbow" },
  rightElbow: { indices: [6, 8, 10] as [number, number, number], label: "Right Elbow" },
  leftKnee: { indices: [11, 13, 15] as [number, number, number], label: "Left Knee" },
  rightKnee: { indices: [12, 14, 16] as [number, number, number], label: "Right Knee" },
};

/**
 * Check if an angle matches a preset (in either order)
 */
function hasAngle(
  measuredAngles: Array<[number, number, number]>,
  preset: [number, number, number]
): boolean {
  const [a, b, c] = preset;
  return measuredAngles.some(
    ([x, y, z]) => (x === a && y === b && z === c) || (x === c && y === b && z === a)
  );
}

/**
 * Dropdown menu for adding/removing joint angle measurements.
 */
export function AnglesDropdownMenu({
  measuredAngles,
  isOpen,
  onOpenChange,
  onToggleAnglePreset,
  onVelocityWristChange,
}: AnglesDropdownMenuProps) {
  const hasLeftElbow = hasAngle(measuredAngles, ANGLE_PRESETS.leftElbow.indices);
  const hasRightElbow = hasAngle(measuredAngles, ANGLE_PRESETS.rightElbow.indices);
  const hasLeftKnee = hasAngle(measuredAngles, ANGLE_PRESETS.leftKnee.indices);
  const hasRightKnee = hasAngle(measuredAngles, ANGLE_PRESETS.rightKnee.indices);

  return (
    <Box style={{ marginLeft: "auto" }}>
      <DropdownMenu.Root open={isOpen} onOpenChange={onOpenChange}>
        <Tooltip content="Add or remove joint angle measurements">
          <DropdownMenu.Trigger>
            <Button
              className={buttonStyles.actionButtonSquare}
              size="2"
              style={{
                opacity: measuredAngles.length > 0 ? 1 : 0.5,
              }}
            >
              <RulerSquareIcon width="16" height="16" />
            </Button>
          </DropdownMenu.Trigger>
        </Tooltip>
        <DropdownMenu.Content>
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              if (!hasLeftElbow) {
                onVelocityWristChange("left");
              }
              onToggleAnglePreset(ANGLE_PRESETS.leftElbow.indices);
            }}
          >
            <Text>Left Elbow</Text>
            {hasLeftElbow && (
              <Text ml="auto" size="1" color="gray">
                ✓
              </Text>
            )}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              if (!hasRightElbow) {
                onVelocityWristChange("right");
              }
              onToggleAnglePreset(ANGLE_PRESETS.rightElbow.indices);
            }}
          >
            <Text>Right Elbow</Text>
            {hasRightElbow && (
              <Text ml="auto" size="1" color="gray">
                ✓
              </Text>
            )}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onToggleAnglePreset(ANGLE_PRESETS.leftKnee.indices);
            }}
          >
            <Text>Left Knee</Text>
            {hasLeftKnee && (
              <Text ml="auto" size="1" color="gray">
                ✓
              </Text>
            )}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onToggleAnglePreset(ANGLE_PRESETS.rightKnee.indices);
            }}
          >
            <Text>Right Knee</Text>
            {hasRightKnee && (
              <Text ml="auto" size="1" color="gray">
                ✓
              </Text>
            )}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Box>
  );
}


