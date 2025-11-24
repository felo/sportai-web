"use client";

import { Flex, Spinner, Text } from "@radix-ui/themes";

export interface LoadingStateProps {
  /** Loading message to display */
  message?: string;
  /** Spinner size */
  size?: "1" | "2" | "3";
  /** Gap between spinner and text */
  gap?: "1" | "2" | "3" | "4";
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * LoadingState - A consistent loading indicator with message
 * 
 * Features:
 * - Spinner with optional message
 * - Consistent spacing and alignment
 * - Flexible sizing
 * 
 * @example
 * ```tsx
 * <LoadingState message="Loading model..." />
 * ```
 */
export function LoadingState({
  message = "Loading...",
  size = "2",
  gap = "2",
  className,
  style,
}: LoadingStateProps) {
  return (
    <Flex align="center" gap={gap} className={className} style={style}>
      <Spinner size={size} />
      <Text size={size} color="gray">
        {message}
      </Text>
    </Flex>
  );
}

