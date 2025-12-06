"use client";

import { Box, Flex, Text, Card } from "@radix-ui/themes";
import type { PlayerShotCardProps } from "../types";
import { PlayerHeader } from "./PlayerHeader";
import { CourtGrid } from "./CourtGrid";
import { SpeedStats } from "./SpeedStats";

/**
 * Individual player shot heatmap card with animated court grid
 */
export function PlayerShotCard({
  data,
  shotLabel,
  originLabel,
  countLabel,
  portrait,
  nickname,
  nicknameLoading,
}: PlayerShotCardProps) {
  if (data.totalShots === 0) {
    return (
      <Card style={{ border: "1px solid var(--gray-5)" }}>
        <Flex direction="column" gap="2" p="4" align="center">
          <Text size="3" weight="medium">
            {data.displayName}
          </Text>
          <Text size="2" color="gray">
            No {countLabel}s detected
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card style={{ border: "1px solid var(--gray-6)", overflow: "visible" }}>
      <Flex direction="column" gap="3" p="4">
        {/* Header with Portrait */}
        <PlayerHeader
          displayName={data.displayName}
          portrait={portrait}
          nickname={nickname}
          nicknameLoading={nicknameLoading}
          totalShots={data.totalShots}
          countLabel={countLabel}
        />

        {/* Legend */}
        <Flex gap="4" justify="center">
          <Flex align="center" gap="2">
            <Box
              style={{
                width: 12,
                height: 12,
                borderRadius: "2px",
                backgroundColor: "rgba(255, 200, 50, 0.8)",
              }}
            />
            <Text size="1" color="gray">
              {originLabel}
            </Text>
          </Flex>
          <Flex align="center" gap="2">
            <Box
              style={{
                width: 12,
                height: 12,
                borderRadius: "2px",
                backgroundColor: "rgba(122, 219, 143, 0.8)",
              }}
            />
            <Text size="1" color="gray">
              Target
            </Text>
          </Flex>
        </Flex>

        {/* Court grid with all layers */}
        <CourtGrid data={data} originLabel={originLabel} />

        {/* Speed stats */}
        <SpeedStats avgSpeed={data.avgSpeed} topSpeed={data.topSpeed} />
      </Flex>
    </Card>
  );
}
