"use client";

import { Box, Flex, Grid, Heading, Text, Card } from "@radix-ui/themes";
import { StatisticsResult } from "../types";

interface MatchSummaryCardProps {
  result: StatisticsResult;
}

export function MatchSummaryCard({ result }: MatchSummaryCardProps) {
  const filteredPlayers = result.players.filter(p => p.swing_count >= 10);
  const totalSwings = filteredPlayers.reduce((sum, p) => sum + p.swing_count, 0);

  return (
    <Card style={{ border: "1px solid var(--gray-6)" }}>
      <Flex direction="column" gap="3" p="4">
        <Heading size="4" weight="medium">
          Match Summary
        </Heading>
        <Grid columns="2" gap="3">
          <Box>
            <Text size="1" color="gray">
              Players
            </Text>
            <Text size="3" weight="bold">
              {filteredPlayers.length}
            </Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Total Swings
            </Text>
            <Text size="3" weight="bold">
              {totalSwings}
            </Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Rallies
            </Text>
            <Text size="3" weight="bold">
              {result.rallies.length}
            </Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Bounces
            </Text>
            <Text size="3" weight="bold">
              {result.ball_bounces.length}
            </Text>
          </Box>
        </Grid>
      </Flex>
    </Card>
  );
}

