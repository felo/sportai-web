"use client";

import { Flex, Text, HoverCard } from "@radix-ui/themes";
import type { SwingMetrics } from "../types";
import { ATTRIBUTE_CONFIG } from "../constants";

interface AttributeRowProps {
  attrKey: keyof SwingMetrics;
  value: number;
  accentColor: string;
}

/**
 * A single attribute row displaying the score and abbreviation.
 * Shows a hover card with full description on hover.
 */
export function AttributeRow({ attrKey, value, accentColor }: AttributeRowProps) {
  const config = ATTRIBUTE_CONFIG[attrKey];

  return (
    <HoverCard.Root openDelay={100} closeDelay={100}>
      <HoverCard.Trigger>
        <Flex align="center" gap="2" style={{ cursor: "help" }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: accentColor,
              width: 36,
              textAlign: "right",
            }}
          >
            {Math.round(value)}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--gray-11)",
              letterSpacing: 0.5,
            }}
          >
            {config.abbrev}
          </Text>
        </Flex>
      </HoverCard.Trigger>
      <HoverCard.Content
        side="top"
        sideOffset={8}
        style={{
          background: "var(--gray-2)",
          padding: "12px 16px",
          borderRadius: 12,
          border: `2px solid ${accentColor}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          width: 280,
        }}
      >
        <Text size="2" weight="bold" style={{ color: accentColor }}>
          {config.label}
        </Text>
        <Text
          size="1"
          color="gray"
          style={{ display: "block", marginTop: 4, lineHeight: 1.4 }}
        >
          {config.description}
        </Text>
        <Text size="2" weight="medium" style={{ display: "block", marginTop: 6 }}>
          Score: {Math.round(value)}
        </Text>
      </HoverCard.Content>
    </HoverCard.Root>
  );
}
