"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export interface CircularIconButtonProps {
  /** Icon element to display */
  icon: ReactNode;
  /** Click handler */
  onClick: (e: React.MouseEvent) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Active state (highlighted) */
  active?: boolean;
  /** Button size */
  size?: "small" | "medium" | "large";
  /** Aria label for accessibility */
  ariaLabel: string;
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * CircularIconButton - A circular button with icon, hover states, and animations
 * 
 * Features:
 * - Perfect circle shape
 * - Hover effects (scale, color)
 * - Active state styling
 * - Loading state support
 * - Smooth transitions
 * 
 * @example
 * ```tsx
 * <CircularIconButton
 *   icon={<Volume2 size={16} />}
 *   onClick={handlePlay}
 *   ariaLabel="Play audio"
 *   active={isPlaying}
 *   loading={isLoading}
 * />
 * ```
 */
export function CircularIconButton({
  icon,
  onClick,
  disabled = false,
  loading = false,
  active = false,
  size = "medium",
  ariaLabel,
  className,
  style,
}: CircularIconButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Size mapping
  const sizeMap = {
    small: "24px",
    medium: "32px",
    large: "40px",
  };

  const buttonSize = sizeMap[size];

  // State-based colors
  const backgroundColor = active
    ? isHovered
      ? "var(--mint-4)"
      : "var(--mint-3)"
    : isHovered
    ? "var(--gray-3)"
    : "var(--gray-2)";

  const borderColor = isHovered
    ? active
      ? "var(--mint-7)"
      : "var(--gray-7)"
    : "var(--gray-6)";

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      className={className}
      style={{
        width: buttonSize,
        height: buttonSize,
        borderRadius: "50%",
        border: "1px solid " + borderColor,
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled || loading ? "default" : "pointer",
        transition: "all 0.2s ease",
        opacity: disabled || loading ? 0.6 : 1,
        transform: isHovered && !disabled && !loading ? "scale(1.1)" : "scale(1)",
        ...style,
      }}
      onMouseEnter={() => !disabled && !loading && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon}
    </button>
  );
}

