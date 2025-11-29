"use client";

import { Box, Flex, Grid, Heading, Badge, Text, Card } from "@radix-ui/themes";
import { Player } from "../types";
import { formatDuration } from "../utils";

interface PlayerCardProps {
  player: Player;
  displayIndex: number;
  displayName: string;
  portrait?: string;
}

export function PlayerCard({ player, displayIndex, displayName, portrait }: PlayerCardProps) {
  return (
    <Card style={{ border: "1px solid var(--gray-6)" }}>
      <Flex direction="column" gap="3" p="4">
        <Flex justify="between" align="center">
          <Flex align="center" gap="3">
            <Box
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid var(--mint-9)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: portrait ? "transparent" : "var(--mint-9)",
              }}
            >
              {portrait ? (
                <img
                  src={portrait}
                  alt={displayName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Text size="3" weight="bold" style={{ color: "white" }}>
                  P{displayIndex}
                </Text>
              )}
            </Box>
            <Heading size="4" weight="medium">
              {displayName}
            </Heading>
          </Flex>
          <Badge color="gray" variant="soft">
            {player.swing_count} swings
          </Badge>
        </Flex>

        <Grid columns="2" gap="3">
          <Box>
            <Text size="1" color="gray">
              Distance
            </Text>
            <Text size="3" weight="bold">
              {Math.round(player.covered_distance)}m
            </Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Top Speed
            </Text>
            <Text size="3" weight="bold">
              {Math.round(player.fastest_sprint)} km/h
            </Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Activity Score
            </Text>
            <Text size="3" weight="bold">
              {Math.round(player.activity_score)}
            </Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Fastest Sprint
            </Text>
            <Text size="3" weight="bold">
              @ {formatDuration(player.fastest_sprint_timestamp)}
            </Text>
          </Box>
        </Grid>

        <Box mt="2">
          <Text size="2" color="gray" mb="2">
            Swing Types
          </Text>
          <Flex gap="2" wrap="wrap">
            {Object.entries(player.swing_type_distribution)
              .sort(([, a], [, b]) => b - a)
              .map(([type, pct]) => (
                <Badge key={type} variant="soft" color="gray">
                  {type}: {Math.round(pct * 100)}%
                </Badge>
              ))}
          </Flex>
        </Box>
      </Flex>
    </Card>
  );
}

