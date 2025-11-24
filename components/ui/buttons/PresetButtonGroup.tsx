"use client";

import { Flex, Button, Text } from "@radix-ui/themes";
import buttonStyles from "@/styles/buttons.module.css";

export interface PresetButton {
  /** Unique key for the button */
  key: string;
  /** Button label */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Active state */
  active?: boolean;
}

export interface PresetButtonGroupProps {
  /** Group label */
  label?: string;
  /** Array of preset buttons */
  buttons: PresetButton[];
  /** Button size */
  size?: "1" | "2" | "3";
  /** Gap between buttons */
  gap?: "1" | "2" | "3";
  /** Allow wrapping */
  wrap?: boolean;
  /** Disabled state for all buttons */
  disabled?: boolean;
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * PresetButtonGroup - A group of small preset action buttons
 * 
 * Features:
 * - Optional group label
 * - Consistent button styling
 * - Active state support
 * - Flexible wrapping
 * 
 * @example
 * ```tsx
 * <PresetButtonGroup
 *   label="Arms"
 *   buttons={[
 *     { key: 'l-arm', label: 'L Arm', onClick: () => selectLeftArm() },
 *     { key: 'r-arm', label: 'R Arm', onClick: () => selectRightArm() },
 *   ]}
 * />
 * ```
 */
export function PresetButtonGroup({
  label,
  buttons,
  size = "1",
  gap = "1",
  wrap = true,
  disabled = false,
  className,
  style,
}: PresetButtonGroupProps) {
  return (
    <Flex direction="column" gap="1" className={className} style={style}>
      {label && (
        <Text size="1" color="gray" weight="medium">
          {label}
        </Text>
      )}
      <Flex gap={gap} wrap={wrap ? "wrap" : "nowrap"}>
        {buttons.map((button) => (
          <Button
            key={button.key}
            size={size}
            className={buttonStyles.actionButtonSquare}
            onClick={button.onClick}
            disabled={disabled}
            style={{
              opacity: button.active ? 1 : 0.5,
            }}
          >
            {button.label}
          </Button>
        ))}
      </Flex>
    </Flex>
  );
}

