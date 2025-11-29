"use client";

import { Box, Flex, Grid, Heading, Text, Card } from "@radix-ui/themes";
import { StatisticsResult, BallBounce } from "../types";

interface MatchSummaryCardProps {
  result: StatisticsResult;
  enhancedBallBounces?: BallBounce[];
}

export function MatchSummaryCard({ result, enhancedBallBounces }: MatchSummaryCardProps) {
  const players = result.players || [];
  const rallies = result.rallies || [];
  const ballBounces = result.ball_bounces || [];
  
  const filteredPlayers = players.filter(p => p.swing_count >= 10);
  const totalSwings = filteredPlayers.reduce((sum, p) => sum + p.swing_count, 0);
  const bounceCount = enhancedBallBounces?.length ?? ballBounces.length;

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
              {rallies.length}
            </Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Bounces
            </Text>
            <Text size="3" weight="bold">
              {bounceCount}
            </Text>
          </Box>
        </Grid>
      </Flex>
    </Card>
  );
}

