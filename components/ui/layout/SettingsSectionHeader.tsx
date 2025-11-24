"use client";

import { Flex, Text, Switch } from "@radix-ui/themes";

export interface SettingsSectionHeaderProps {
  /** Section title */
  title: string;
  /** Section description */
  description: string;
  /** Whether the section is enabled */
  enabled: boolean;
  /** Callback when enabled state changes */
  onEnabledChange: (enabled: boolean) => void;
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
 * SettingsSectionHeader - A header for settings sections with toggle
 * 
 * Features:
 * - Title and description on left
 * - Toggle switch on right
 * - Consistent spacing and alignment
 * - Used to enable/disable entire feature sections
 * 
 * @example
 * ```tsx
 * <SettingsSectionHeader
 *   title="Pose Detection"
 *   description="Track body movement and skeleton"
 *   enabled={isPoseEnabled}
 *   onEnabledChange={setIsPoseEnabled}
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
      <Switch
        checked={enabled}
        onCheckedChange={onEnabledChange}
        disabled={disabled}
      />
    </Flex>
  );
}

