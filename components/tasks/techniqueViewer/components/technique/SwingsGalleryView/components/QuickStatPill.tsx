"use client";

import { Flex, Text } from "@radix-ui/themes";
import type { QuickStatPillProps } from "../types";

/**
 * A pill-shaped badge showing a quick stat with icon, label, and value.
 */
export function QuickStatPill({ label, value, icon, color }: QuickStatPillProps) {
  return (
    <Flex
      align="center"
      gap="2"
      style={{
        padding: "8px 16px",
        borderRadius: 24,
        backgroundColor: `${color}15`,
        border: `1px solid ${color}33`,
      }}
    >
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text size="2" color="gray">{label}:</Text>
      <Text size="2" weight="bold" style={{ color }}>
        {value}
      </Text>
    </Flex>
  );
}
