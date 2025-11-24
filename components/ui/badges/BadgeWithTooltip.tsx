"use client";

import { Badge, Tooltip } from "@radix-ui/themes";

export interface BadgeWithTooltipProps {
  /** Badge text */
  text: string;
  /** Tooltip content */
  tooltip: string;
  /** Badge variant */
  variant?: "soft" | "solid" | "outline" | "surface";
  /** Badge color */
  color?: "gray" | "mint" | "red" | "blue" | "green" | "yellow" | "orange";
  /** Badge radius */
  radius?: "none" | "small" | "medium" | "large" | "full";
  /** Badge size */
  size?: "1" | "2" | "3";
  /** Tooltip side */
  tooltipSide?: "top" | "bottom" | "left" | "right";
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * BadgeWithTooltip - A badge with tooltip on hover
 * 
 * Features:
 * - Badge with consistent styling
 * - Tooltip on hover
 * - Flexible positioning
 * 
 * @example
 * ```tsx
 * <BadgeWithTooltip
 *   text="API version 0.5.58"
 *   tooltip="Stable v0.5.58 - Last updated 2025-10-01"
 *   variant="soft"
 *   color="gray"
 *   radius="full"
 * />
 * ```
 */
export function BadgeWithTooltip({
  text,
  tooltip,
  variant = "soft",
  color = "gray",
  radius = "medium",
  size = "2",
  tooltipSide = "bottom",
  className,
  style,
}: BadgeWithTooltipProps) {
  return (
    <Tooltip content={tooltip} side={tooltipSide}>
      <Badge
        variant={variant}
        color={color}
        radius={radius}
        size={size}
        className={className}
        style={{
          cursor: "help",
          ...style,
        }}
      >
        {text}
      </Badge>
    </Tooltip>
  );
}

