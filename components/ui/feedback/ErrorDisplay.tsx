"use client";

import { Flex, Text } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

export interface ErrorDisplayProps {
  /** Error message to display */
  message: string;
  /** Show error icon */
  showIcon?: boolean;
  /** Text size */
  size?: "1" | "2" | "3";
  /** Gap between icon and text */
  gap?: "1" | "2" | "3";
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * ErrorDisplay - A consistent error message component
 * 
 * Features:
 * - Red colored text
 * - Optional warning icon
 * - Consistent spacing
 * 
 * @example
 * ```tsx
 * <ErrorDisplay message="Failed to load model" showIcon />
 * ```
 */
export function ErrorDisplay({
  message,
  showIcon = false,
  size = "2",
  gap = "2",
  className,
  style,
}: ErrorDisplayProps) {
  if (showIcon) {
    return (
      <Flex align="center" gap={gap} className={className} style={style}>
        <ExclamationTriangleIcon width="16" height="16" color="var(--red-9)" />
        <Text size={size} color="red">
          {message}
        </Text>
      </Flex>
    );
  }

  return (
    <Text size={size} color="red" className={className} style={style}>
      {message}
    </Text>
  );
}

