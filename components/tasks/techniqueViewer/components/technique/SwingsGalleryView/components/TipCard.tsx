"use client";

import { Box, Flex, Text, Card } from "@radix-ui/themes";
import type { TipCardProps } from "../types";

/**
 * A card displaying a technique improvement tip with icon and description.
 */
export function TipCard({ icon, title, tip }: TipCardProps) {
  return (
    <Card
      style={{
        flex: "1 1 200px",
        maxWidth: 300,
        padding: 16,
        background: "var(--gray-1)",
      }}
    >
      <Flex gap="3">
        <Text style={{ fontSize: 24 }}>{icon}</Text>
        <Box>
          <Text size="2" weight="bold" style={{ display: "block", marginBottom: 4 }}>
            {title}
          </Text>
          <Text size="1" color="gray">
            {tip}
          </Text>
        </Box>
      </Flex>
    </Card>
  );
}
