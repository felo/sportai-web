"use client";

import Image from "next/image";
import { Box, Flex, Heading, Text, Card, Separator } from "@radix-ui/themes";
import { Player } from "../types";
import { PlayerCharts } from "./PlayerCharts";
import { MedalSummary, collectEarnedMedals } from "./shared";

interface PlayerCardProps {
  player: Player;
  displayIndex: number;
  displayName: string;
  portrait?: string;
  maxDistance?: number;
  distanceRank?: number;
  maxBallSpeed?: number;
  ballSpeedRank?: number;
  maxSprintSpeed?: number;
  sprintRank?: number;
  swingsRank?: number;
  maxSwings?: number;
  overallRank?: number;
}

export function PlayerCard({ player, displayIndex, displayName, portrait, maxDistance, distanceRank, maxBallSpeed, ballSpeedRank, maxSprintSpeed, sprintRank, swingsRank, maxSwings, overallRank = 4 }: PlayerCardProps) {
  const hasChartData = 
    Object.keys(player.swing_type_distribution).length > 0 || 
    (player.swings && player.swings.length > 0);

  // Collect earned medals using shared helper
  const earnedMedals = collectEarnedMedals({ distanceRank, sprintRank, ballSpeedRank, swingsRank });

  return (
    <Card style={{ border: "1px solid var(--gray-6)", height: "100%" }}>
      <Flex direction="column" gap="3" p="4" style={{ height: "100%" }}>
        {/* Player header with photo and name centered */}
        <Flex direction="column" align="center" gap="2">
          <Box
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              overflow: "hidden",
              border: "3px solid var(--mint-9)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: portrait ? "transparent" : "var(--mint-9)",
              boxShadow: "0 4px 12px rgba(45, 212, 191, 0.3)",
            }}
          >
            {portrait ? (
              <Image
                src={portrait}
                alt={displayName}
                fill
                sizes="72px"
                style={{ 
                  objectFit: "cover",
                  objectPosition: "top",
                }}
              />
            ) : (
              <Text size="5" weight="bold" style={{ color: "white" }}>
                P{displayIndex}
              </Text>
            )}
          </Box>
          <Heading size="5" weight="medium" style={{ textAlign: "center" }}>
            {displayName}
          </Heading>
        </Flex>

        {/* Medal summary using shared component */}
        <MedalSummary 
          earnedMedals={earnedMedals}
          overallRank={overallRank}
          displayIndex={displayIndex}
        />

        {/* Charts Section */}
        {hasChartData && (
          <>
            <Separator size="4" />
            <PlayerCharts player={player} displayName={displayName} maxDistance={maxDistance} distanceRank={distanceRank} maxBallSpeed={maxBallSpeed} ballSpeedRank={ballSpeedRank} maxSprintSpeed={maxSprintSpeed} sprintRank={sprintRank} swingsRank={swingsRank} maxSwings={maxSwings} />
          </>
        )}
      </Flex>
    </Card>
  );
}

