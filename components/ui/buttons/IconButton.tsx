"use client";

import { Button, Tooltip } from "@radix-ui/themes";
import type { ReactNode } from "react";

export interface IconButtonProps {
  /** Icon element to display */
  icon: ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Button variant */
  variant?: "ghost" | "soft" | "solid" | "outline" | "surface";
  /** Button size */
  size?: "1" | "2" | "3" | "4";
  /** Disabled state */
  disabled?: boolean;
  /** Tooltip text */
  tooltip?: string;
  /** Tooltip delay in milliseconds (default 700ms) */
  tooltipDelay?: number;
  /** Color theme */
  color?: "gray" | "red" | "blue" | "green" | "yellow" | "orange" | "mint";
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Icon width (defaults to 20px for size 2) */
  iconWidth?: number;
  /** Icon height (defaults to 20px for size 2) */
  iconHeight?: number;
}

/**
 * IconButton - A consistent icon-only button component
 *
 * Features:
 * - Square shape with equal width/height
 * - Centered icon
 * - Optional tooltip
 * - Consistent sizing based on size prop
 * - Accessibility support with aria-label
 *
 * @example
 * ```tsx
 * <IconButton
 *   icon={<PlusIcon />}
 *   onClick={handleClick}
 *   tooltip="Add new item"
 *   ariaLabel="Add item"
 * />
 * ```
 */
export function IconButton({
  icon,
  onClick,
  variant = "ghost",
  size = "2",
  disabled = false,
  tooltip,
  tooltipDelay = 700,
  color = "gray",
  ariaLabel,
  className,
  style,
  iconWidth,
  iconHeight,
}: IconButtonProps) {
  // Calculate button size based on size prop
  const buttonSize = size === "1" ? "24px" : size === "2" ? "32px" : size === "3" ? "40px" : "48px";

  // Calculate icon size based on size prop (if not provided)
  const defaultIconSize = size === "1" ? 14 : size === "2" ? 20 : size === "3" ? 24 : 28;
  const finalIconWidth = iconWidth ?? defaultIconSize;
  const finalIconHeight = iconHeight ?? defaultIconSize;

  // Clone icon element with size props if it's a React element
  const iconWithSize = typeof icon === "object" && icon !== null && "type" in icon
    ? { ...icon, props: { ...icon.props, width: finalIconWidth, height: finalIconHeight } }
    : icon;

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      color={color}
      className={className}
      aria-label={ariaLabel}
      style={{
        minWidth: buttonSize,
        width: buttonSize,
        height: buttonSize,
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {iconWithSize}
    </Button>
  );

  // Wrap with tooltip if provided
  if (tooltip) {
    return <Tooltip content={tooltip} delayDuration={tooltipDelay}>{button}</Tooltip>;
  }

  return button;
}
