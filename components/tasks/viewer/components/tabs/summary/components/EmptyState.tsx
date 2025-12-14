"use client";

import { Flex, Text } from "@radix-ui/themes";

interface EmptyStateProps {
  message: string;
}

/**
 * Empty state placeholder for missing data.
 */
export function EmptyState({ message }: EmptyStateProps) {
  return (
    <Flex
      align="center"
      justify="center"
      style={{ height: 200, color: "var(--gray-9)" }}
    >
      <Text size="2">{message}</Text>
    </Flex>
  );
}





