"use client";

import { Box, Flex, Text } from "@radix-ui/themes";
import { LightningBoltIcon } from "@radix-ui/react-icons";

interface SpeedStatsProps {
  avgSpeed: number;
  topSpeed: number;
}

/**
 * Speed statistics section showing average and top speed
 */
export function SpeedStats({ avgSpeed, topSpeed }: SpeedStatsProps) {
  return (
    <Flex gap="4" justify="center" pt="2" style={{ borderTop: "1px solid var(--gray-5)" }}>
      <Flex direction="column" align="center" gap="1">
        <Flex align="center" gap="1">
          <Text size="1" color="gray">
            Avg Speed
          </Text>
        </Flex>
        <Text size="4" weight="bold">
          {avgSpeed > 0 ? avgSpeed.toFixed(0) : "—"}
          {avgSpeed > 0 && (
            <Text size="2" weight="regular" color="gray">
              {" "}
              km/h
            </Text>
          )}
        </Text>
      </Flex>

      <Box style={{ width: 1, background: "var(--gray-5)", alignSelf: "stretch" }} />

      <Flex direction="column" align="center" gap="1">
        <Flex align="center" gap="1">
          <LightningBoltIcon width={14} height={14} style={{ color: "var(--gray-10)" }} />
          <Text size="1" color="gray">
            Top Speed
          </Text>
        </Flex>
        <Text size="4" weight="bold">
          {topSpeed > 0 ? topSpeed.toFixed(0) : "—"}
          {topSpeed > 0 && (
            <Text size="2" weight="regular" color="gray">
              {" "}
              km/h
            </Text>
          )}
        </Text>
      </Flex>
    </Flex>
  );
}
