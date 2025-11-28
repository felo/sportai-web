"use client";

import { Flex, Text, Switch } from "@radix-ui/themes";

export interface SettingsSectionHeaderProps {
  /** Section title */
  title: string;
  /** Section description */
  description: string;
  /** Whether the section is enabled (optional - if not provided, no toggle is shown) */
  enabled?: boolean;
  /** Callback when enabled state changes (optional - if not provided, no toggle is shown) */
  onEnabledChange?: (enabled: boolean) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Title size */
  titleSize?: "1" | "2" | "3" | "4";
  /** Description size */
  descriptionSize?: "1" | "2" | "3";
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * SettingsSectionHeader - A header for settings sections with optional toggle
 * 
 * Features:
 * - Title and description on left
 * - Optional toggle switch on right (only shown when enabled/onEnabledChange are provided)
 * - Consistent spacing and alignment
 * - Used to enable/disable entire feature sections
 * 
 * @example
 * ```tsx
 * // With toggle
 * <SettingsSectionHeader
 *   title="Pose Detection"
 *   description="Track body movement and skeleton"
 *   enabled={isPoseEnabled}
 *   onEnabledChange={setIsPoseEnabled}
 * />
 * 
 * // Without toggle (header only)
 * <SettingsSectionHeader
 *   title="Frame Analysis"
 *   description="Analyze current frame"
 * />
 * ```
 */
export function SettingsSectionHeader({
  title,
  description,
  enabled,
  onEnabledChange,
  disabled = false,
  titleSize = "2",
  descriptionSize = "1",
  className,
  style,
}: SettingsSectionHeaderProps) {
  const showToggle = enabled !== undefined && onEnabledChange !== undefined;
  
  return (
    <Flex 
      align="center" 
      justify="between"
      className={className}
      style={style}
    >
      <Flex direction="column" gap="1">
        <Text size={titleSize} weight="bold">
          {title}
        </Text>
        <Text size={descriptionSize} color="gray">
          {description}
        </Text>
      </Flex>
      {showToggle && (
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
          disabled={disabled}
        />
      )}
    </Flex>
  );
}

