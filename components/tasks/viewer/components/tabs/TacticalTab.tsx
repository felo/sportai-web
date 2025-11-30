"use client";

import { Box, Flex, Text, Card, Grid, Heading, Badge } from "@radix-ui/themes";
import { TargetIcon } from "@radix-ui/react-icons";
import { StatisticsResult, BallBounce } from "../../types";
import { BounceHeatmap } from "../BounceHeatmap";
import { ServeHeatmap } from "../ServeHeatmap";
import { ReturnHeatmap } from "../ReturnHeatmap";
import { ThirdBallHeatmap } from "../ThirdBallHeatmap";
import { RallyNetwork } from "../RallyNetwork";

interface TacticalTabProps {
  result: StatisticsResult | null;
  enhancedBallBounces: BallBounce[];
  playerDisplayNames?: Record<number, string>;
}

export function TacticalTab({ result, enhancedBallBounces, playerDisplayNames = {} }: TacticalTabProps) {
  if (!result) {
    return (
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        <Flex
          align="center"
          justify="center"
          direction="column"
          gap="3"
          style={{ padding: "60px 20px" }}
        >
          <TargetIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
          <Text size="3" color="gray">Tactical analysis not available</Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      <Flex direction="column" gap="4">
        {/* Serve Analysis */}
        <Box>
          <Heading size="3" weight="medium" mb="3">Serve Analysis</Heading>
          <Text size="2" color="gray" mb="3">
            Where each player tends to serve and their serve speeds
          </Text>
          <ServeHeatmap result={result} playerDisplayNames={playerDisplayNames} />
        </Box>

        {/* Return Analysis */}
        <Box>
          <Heading size="3" weight="medium" mb="3">Return Analysis</Heading>
          <Text size="2" color="gray" mb="3">
            Where each player returns serves and their return speeds
          </Text>
          <ReturnHeatmap result={result} playerDisplayNames={playerDisplayNames} />
        </Box>

        {/* Third Ball Analysis */}
        <Box>
          <Heading size="3" weight="medium" mb="3">Third Ball Analysis</Heading>
          <Text size="2" color="gray" mb="3">
            The server&apos;s first shot after the return
          </Text>
          <ThirdBallHeatmap result={result} playerDisplayNames={playerDisplayNames} />
        </Box>

        {/* Court Coverage */}
        <Box>
          <Heading size="3" weight="medium" mb="3">Court Coverage</Heading>
          <Text size="2" color="gray" mb="3">Ball bounce distribution across the court</Text>
          {result.bounce_heatmap ? (
            <BounceHeatmap
              heatmap={result.bounce_heatmap}
              totalBounces={(enhancedBallBounces || result.ball_bounces || []).length}
            />
          ) : (
            <Card style={{ padding: "40px", textAlign: "center" }}>
              <Text color="gray">No bounce heatmap data available</Text>
            </Card>
          )}
        </Box>

        {/* Rally Patterns Network */}
        <Box>
          <Heading size="3" weight="medium" mb="3">Rally Patterns</Heading>
          <Text size="2" color="gray" mb="3">
            How players connect to their preferred shot types
          </Text>
          <RallyNetwork result={result} playerDisplayNames={playerDisplayNames} />
        </Box>
      </Flex>
    </Box>
  );
}


