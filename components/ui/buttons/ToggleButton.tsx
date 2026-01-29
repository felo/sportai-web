"use client";

import { Box, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

type ToggleButtonSize = "1" | "2" | "3";

export interface ToggleButtonProps {
  /** Button label text */
  label: string;
  /** Whether the button is currently active/selected */
  isActive: boolean;
  /** Click handler */
  onClick: () => void;
  /** Size variant - affects padding and text size */
  size?: ToggleButtonSize;
  /** Optional icon to display before the label */
  icon?: ReactNode;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Opacity when not active (useful for indicating no data) */
  inactiveOpacity?: number;
  /** Whether to prevent text wrapping */
  noWrap?: boolean;
  /** Whether to prevent shrinking in flex layouts */
  flexShrink?: boolean;
}

/**
 * ToggleButton - A consistent toggle/tab button component
 *
 * Used for mode switching, tab navigation, and toggle selections.
 * Shows active state with accent color background.
 *
 * @example
 * ```tsx
 * <ToggleButton
 *   label="Chat"
 *   isActive={mode === "chat"}
 *   onClick={() => setMode("chat")}
 * />
 * ```
 */
export function ToggleButton({
  label,
  isActive,
  onClick,
  size = "2",
  icon,
  disabled = false,
  inactiveOpacity = 1,
  noWrap = false,
  flexShrink = true,
}: ToggleButtonProps) {
  // Size-based styling
  const sizeStyles = {
    "1": {
      padding: "6px 12px",
      borderRadius: "var(--radius-2)",
      textSize: "1" as const,
    },
    "2": {
      padding: "8px 16px",
      borderRadius: "var(--radius-3)",
      textSize: "2" as const,
    },
    "3": {
      padding: "10px 16px",
      borderRadius: "var(--radius-3)",
      textSize: "2" as const,
    },
  };

  const { padding, borderRadius, textSize } = sizeStyles[size];

  return (
    <Box
      onClick={disabled ? undefined : onClick}
      style={{
        padding,
        borderRadius,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
        background: isActive ? "var(--accent-9)" : "var(--gray-3)",
        border: `1px solid ${isActive ? "var(--accent-9)" : "var(--gray-6)"}`,
        opacity: disabled ? 0.5 : (isActive ? 1 : inactiveOpacity),
        flexShrink: flexShrink ? undefined : 0,
        display: "flex",
        alignItems: "center",
        gap: icon ? "var(--space-2)" : undefined,
      }}
    >
      {icon}
      <Text
        size={textSize}
        weight="medium"
        style={{
          color: isActive ? "white" : "var(--gray-11)",
          whiteSpace: noWrap ? "nowrap" : undefined,
        }}
      >
        {label}
      </Text>
    </Box>
  );
}
