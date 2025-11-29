"use client";

import { useState, RefObject } from "react";
import { Box, Flex, Grid, Heading, Text, Card } from "@radix-ui/themes";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { IconButton } from "@/components/ui";
import { StatisticsResult, Task, Player, BallBounce } from "../types";
import { HighlightsCard } from "./HighlightsCard";
import { MatchSummaryCard } from "./MatchSummaryCard";
import { PlayerCard } from "./PlayerCard";
import { BounceHeatmap } from "./BounceHeatmap";
import { ConfidenceCard } from "./ConfidenceCard";
import { TaskStatusCard } from "./TaskStatusCard";

interface MatchInsightsProps {
  result: StatisticsResult | null;
  task: Task;
  videoRef: RefObject<HTMLVideoElement | null>;
  portraits: Record<number, string>;
  enhancedBallBounces?: BallBounce[];
  playerDisplayNames?: Record<number, string>;
}

export function MatchInsights({ result, task, videoRef, portraits, enhancedBallBounces, playerDisplayNames = {} }: MatchInsightsProps) {
  const [expanded, setExpanded] = useState(false);

  const filteredPlayers: Player[] = result?.players
    ? result.players.filter(p => p.swing_count >= 10).sort((a, b) => b.swing_count - a.swing_count)
    : [];

  return (
    <Card style={{ border: "1px solid var(--gray-6)" }}>
      <Flex
        justify="between"
        align="center"
        p="3"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: "pointer" }}
      >
        <Flex align="center" gap="2">
          <Heading size="4" weight="medium">
            Match Insights
          </Heading>
          {result && (
            <Text size="2" color="gray">
              {filteredPlayers.length} players • {(result.highlights || []).length} highlights
            </Text>
          )}
        </Flex>
        <IconButton
          icon={expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          variant="ghost"
          size="2"
          ariaLabel={expanded ? "Collapse insights" : "Expand insights"}
        />
      </Flex>

      {expanded && (
        <Box
          style={{
            animation: "slideDown 0.25s ease-out",
            overflow: "hidden",
            borderTop: "1px solid var(--gray-6)",
          }}
        >
          <Box p="4">
            <Grid columns={{ initial: "1", md: "2" }} gap="4">
              {/* Left Column - Highlights */}
              <Flex direction="column" gap="4">
                {result && <HighlightsCard highlights={result.highlights || []} videoRef={videoRef} />}
              </Flex>

              {/* Right Column - Stats */}
              <Flex direction="column" gap="4">
                {!result && <TaskStatusCard task={task} />}

                {result && <MatchSummaryCard result={result} enhancedBallBounces={enhancedBallBounces} />}

                {result &&
                  filteredPlayers.map((player, index) => (
                    <PlayerCard
                      key={player.player_id}
                      player={player}
                      displayIndex={index + 1}
                      displayName={playerDisplayNames[player.player_id] || `Player ${index + 1}`}
                      portrait={portraits[player.player_id]}
                    />
                  ))}

                {result && result.bounce_heatmap && (
                  <BounceHeatmap
                    heatmap={result.bounce_heatmap}
                    totalBounces={(result.ball_bounces || []).length}
                  />
                )}

                {result && result.confidences && (
                  <ConfidenceCard confidences={result.confidences.final_confidences} />
                )}
              </Flex>
            </Grid>
          </Box>
        </Box>
      )}
    </Card>
  );
}

