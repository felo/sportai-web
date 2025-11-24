"use client";

import { Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  /** Message to display */
  message: string;
  /** Optional icon or custom content */
  icon?: ReactNode;
  /** Text size */
  size?: "1" | "2" | "3";
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * EmptyState - A consistent empty state message
 * 
 * Features:
 * - Gray colored text
 * - Optional icon
 * - Consistent spacing and padding
 * 
 * @example
 * ```tsx
 * <EmptyState message="No chats yet" />
 * ```
 */
export function EmptyState({
  message,
  icon,
  size = "2",
  align = "left",
  className,
  style,
}: EmptyStateProps) {
  return (
    <Text
      size={size}
      color="gray"
      align={align}
      className={className}
      style={{
        padding: "var(--space-2) var(--space-3)",
        ...style,
      }}
    >
      {icon && <span style={{ marginRight: "8px" }}>{icon}</span>}
      {message}
    </Text>
  );
}

