"use client";

import { Box, Flex, Text, Card } from "@radix-ui/themes";
import { RocketIcon } from "@radix-ui/react-icons";
import type { ShotHeatmapProps } from "./types";
import { PlayerShotCard } from "./components";

/**
 * Reusable shot heatmap container displaying player shot distributions
 */
export function ShotHeatmap({
  data,
  shotLabel,
  originLabel,
  countLabel,
  emptyMessage,
  ballType = "serve",
  sport = "padel",
  portraits = {},
  nicknames = {},
  nicknamesLoading = false,
}: ShotHeatmapProps) {
  const playersWithShots = data
    .filter((d) => d.totalShots > 0)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const totalShots = playersWithShots.reduce((sum, p) => sum + p.totalShots, 0);

  if (playersWithShots.length === 0 || totalShots === 0) {
    return (
      <Card style={{ border: "1px solid var(--gray-5)" }}>
        <Flex
          direction="column"
          gap="2"
          p="4"
          align="center"
          justify="center"
          style={{ minHeight: 150 }}
        >
          <RocketIcon width={32} height={32} style={{ color: "var(--gray-8)" }} />
          <Text size="2" color="gray" weight="medium">
            {emptyMessage}
          </Text>
          <Text size="1" color="gray">
            {shotLabel}s will appear here once detected
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="4" style={{ overflow: "visible" }}>
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          overflow: "visible",
        }}
      >
        {playersWithShots.map((playerData) => (
          <PlayerShotCard
            key={playerData.playerId}
            data={playerData}
            shotLabel={shotLabel}
            originLabel={originLabel}
            countLabel={countLabel}
            ballType={ballType}
            sport={sport}
            portrait={portraits[playerData.playerId]}
            nickname={nicknames[playerData.playerId]}
            nicknameLoading={nicknamesLoading}
          />
        ))}
      </Box>

      {/* Insights */}
      {playersWithShots.length > 1 && totalShots >= 2 && (
        <Flex gap="2" wrap="wrap">
          {(() => {
            const fastest = playersWithShots.reduce((prev, curr) =>
              curr.topSpeed > prev.topSpeed ? curr : prev
            );
            if (fastest.topSpeed > 0) {
              return (
                <Box
                  style={{
                    padding: "6px 12px",
                    background: "var(--gray-a3)",
                    borderRadius: "var(--radius-2)",
                    border: "1px solid var(--gray-6)",
                  }}
                >
                  <Text size="1" color="gray">
                    {fastest.displayName} has the fastest {countLabel} at{" "}
                    {fastest.topSpeed.toFixed(0)} km/h
                  </Text>
                </Box>
              );
            }
            return null;
          })()}

          {(() => {
            const highestAvg = playersWithShots.reduce((prev, curr) =>
              curr.avgSpeed > prev.avgSpeed ? curr : prev
            );
            if (highestAvg.avgSpeed > 0) {
              return (
                <Box
                  style={{
                    padding: "6px 12px",
                    background: "var(--gray-a3)",
                    borderRadius: "var(--radius-2)",
                    border: "1px solid var(--gray-6)",
                  }}
                >
                  <Text size="1" color="gray">
                    {highestAvg.displayName} has the highest average at{" "}
                    {highestAvg.avgSpeed.toFixed(0)} km/h
                  </Text>
                </Box>
              );
            }
            return null;
          })()}

          {(() => {
            const most = playersWithShots.reduce((prev, curr) =>
              curr.totalShots > prev.totalShots ? curr : prev
            );
            if (most.totalShots > 1) {
              return (
                <Box
                  style={{
                    padding: "6px 12px",
                    background: "var(--gray-a3)",
                    borderRadius: "var(--radius-2)",
                    border: "1px solid var(--gray-6)",
                  }}
                >
                  <Text size="1" color="gray">
                    {most.displayName} hit the most with {most.totalShots} {countLabel}s
                  </Text>
                </Box>
              );
            }
            return null;
          })()}
        </Flex>
      )}
    </Flex>
  );
}





