"use client";

import { Box, Flex, Grid, Heading, Text, Card } from "@radix-ui/themes";

interface ConfidenceCardProps {
  confidences: {
    pose: number;
    swing: number;
    ball: number;
    final: number;
  };
}

export function ConfidenceCard({ confidences }: ConfidenceCardProps) {
  return (
    <Card style={{ border: "1px solid var(--gray-6)" }}>
      <Flex direction="column" gap="3" p="4">
        <Heading size="4" weight="medium">
          Detection Confidence
        </Heading>
        <Grid columns="2" gap="3">
          <Box>
            <Text size="1" color="gray">
              Pose
            </Text>
            <Text size="2">{Math.round(confidences.pose * 100)}%</Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Swing
            </Text>
            <Text size="2">{Math.round(confidences.swing * 100)}%</Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Ball
            </Text>
            <Text size="2">{Math.round(confidences.ball * 100)}%</Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              Overall
            </Text>
            <Text size="2" weight="bold" color="mint">
              {Math.round(confidences.final * 100)}%
            </Text>
          </Box>
        </Grid>
      </Flex>
    </Card>
  );
}














