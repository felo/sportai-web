"use client";

import { Flex, Switch, Text, Tooltip } from "@radix-ui/themes";
import type { ReactNode } from "react";

export interface ToggleSwitchProps {
  /** Whether the switch is checked */
  checked: boolean;
  /** Callback when checked state changes */
  onCheckedChange: (checked: boolean) => void;
  /** Label text or custom content */
  label: string | ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Switch size */
  size?: "1" | "2" | "3";
  /** Label text size */
  labelSize?: "1" | "2" | "3";
  /** Label color */
  labelColor?: "gray" | "mint" | "red" | "blue" | "green";
  /** Additional description text */
  description?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Gap between switch and label */
  gap?: "1" | "2" | "3" | "4";
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Show status indicator when checked */
  showStatus?: boolean;
  /** Custom status text when checked */
  statusText?: string;
}

/**
 * ToggleSwitch - A consistent toggle switch with label
 * 
 * Features:
 * - Switch + label in a horizontal layout
 * - Optional description text below
 * - Optional tooltip
 * - Optional status indicator when checked
 * - Flexible sizing and styling
 * 
 * @example
 * ```tsx
 * <ToggleSwitch
 *   checked={showSkeleton}
 *   onCheckedChange={setShowSkeleton}
 *   label="Show skeleton"
 *   description="Display pose skeleton overlay"
 *   tooltip="Toggle skeleton visibility"
 * />
 * ```
 */
export function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  size = "2",
  labelSize = "2",
  labelColor = "gray",
  description,
  tooltip,
  gap = "2",
  className,
  style,
  showStatus = false,
  statusText = "• Active",
}: ToggleSwitchProps) {
  const content = (
    <Flex 
      direction="column" 
      gap={description ? "1" : "0"}
      className={className}
      style={style}
    >
      <Flex gap={gap} align="center">
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          size={size}
        />
        <Text size={labelSize} color={labelColor}>
          {label}
          {showStatus && checked && (
            <Text as="span" color="mint" ml="2">
              {statusText}
            </Text>
          )}
        </Text>
      </Flex>
      {description && (
        <Text size="1" color="gray" style={{ opacity: 0.7, paddingLeft: "calc(var(--space-" + size + ") + 28px)" }}>
          {description}
        </Text>
      )}
    </Flex>
  );

  if (tooltip) {
    return <Tooltip content={tooltip}>{content}</Tooltip>;
  }

  return content;
}

