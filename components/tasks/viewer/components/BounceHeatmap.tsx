"use client";

import { Box, Flex, Heading, Text, Card } from "@radix-ui/themes";

interface BounceHeatmapProps {
  heatmap: number[][];
  totalBounces: number;
}

export function BounceHeatmap({ heatmap, totalBounces }: BounceHeatmapProps) {
  const maxValue = Math.max(...heatmap.flat());

  return (
    <Card style={{ border: "1px solid var(--gray-6)" }}>
      <Flex direction="column" gap="3" p="4">
        <Heading size="4" weight="medium">
          Bounce Heatmap
        </Heading>
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${heatmap[0]?.length || 10}, 1fr)`,
            gap: "2px",
            aspectRatio: `${heatmap[0]?.length || 10} / ${heatmap.length || 20}`,
            maxWidth: "200px",
          }}
        >
          {heatmap.flatMap((row, y) =>
            row.map((value, x) => {
              const intensity = maxValue > 0 ? value / maxValue : 0;
              return (
                <Box
                  key={`${x}-${y}`}
                  style={{
                    backgroundColor:
                      intensity > 0 ? `rgba(122, 219, 143, ${intensity})` : "var(--gray-4)",
                    borderRadius: "2px",
                  }}
                  title={`${value} bounces`}
                />
              );
            })
          )}
        </Box>
        <Text size="1" color="gray">
          {totalBounces} total bounces detected
        </Text>
      </Flex>
    </Card>
  );
}














