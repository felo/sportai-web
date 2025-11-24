"use client";

import { Flex } from "@radix-ui/themes";
import type { ReactNode } from "react";

export interface SettingsSectionProps {
  /** Section content */
  children: ReactNode;
  /** Show top border separator */
  showBorder?: boolean;
  /** Padding top spacing */
  pt?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
  /** Gap between items */
  gap?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * SettingsSection - A wrapper for settings sections with consistent styling
 * 
 * Features:
 * - Optional top border separator
 * - Consistent padding and gap
 * - Flex column layout
 * 
 * @example
 * ```tsx
 * <SettingsSection showBorder pt="3" gap="2">
 *   <SettingsSectionHeader ... />
 *   <ToggleSwitch ... />
 *   <RangeSlider ... />
 * </SettingsSection>
 * ```
 */
export function SettingsSection({
  children,
  showBorder = true,
  pt = "3",
  gap = "2",
  className,
  style,
}: SettingsSectionProps) {
  return (
    <Flex
      direction="column"
      gap={gap}
      pt={pt}
      className={className}
      style={{
        borderTop: showBorder ? "1px solid var(--gray-a5)" : undefined,
        ...style,
      }}
    >
      {children}
    </Flex>
  );
}

