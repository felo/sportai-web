"use client";

import { Button, Text, Tooltip } from "@radix-ui/themes";
import buttonStyles from "@/styles/buttons.module.css";

interface AnglePresetButtonProps {
  label: string;
  jointIndices: [number, number, number];
  tooltip: string;
  measuredAngles: Array<[number, number, number]>;
  onToggle: (indices: [number, number, number]) => void;
  onActivate?: () => void; // For velocity tracking when activated
  disabled?: boolean;
}

/**
 * A button component for toggling angle measurements on specific joints.
 * Displays active/inactive state and supports optional activation callbacks.
 */
export function AnglePresetButton({
  label,
  jointIndices,
  tooltip,
  measuredAngles,
  onToggle,
  onActivate,
  disabled = false,
}: AnglePresetButtonProps) {
  const [a, b, c] = jointIndices;
  
  // Check if this angle is currently active (either forward or reversed)
  const isActive = measuredAngles.some(
    ([ja, jb, jc]) => (ja === a && jb === b && jc === c) || (ja === c && jb === b && jc === a)
  );

  const handleClick = () => {
    // Call onActivate when the angle is being activated (not deactivated)
    if (!isActive && onActivate) {
      onActivate();
    }
    onToggle(jointIndices);
  };

  return (
    <Tooltip content={tooltip}>
      <Button
        onClick={handleClick}
        disabled={disabled}
        className={buttonStyles.actionButtonSquare}
        size="2"
        style={{ opacity: isActive ? 1 : 0.5 }}
      >
        <Text size="1" weight="bold">{label}</Text>
      </Button>
    </Tooltip>
  );
}




