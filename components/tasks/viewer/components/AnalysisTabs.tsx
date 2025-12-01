"use client";

import { useState, RefObject } from "react";
import { Box, Flex, Text, Card, Badge, Grid, Heading } from "@radix-ui/themes";
import {
  BarChartIcon,
  PersonIcon,
  StarIcon,
  TargetIcon,
  MixIcon,
} from "@radix-ui/react-icons";
import { StatisticsResult, Task, Player, BallBounce } from "../types";
import { HighlightsCard } from "./HighlightsCard";
import { MatchSummaryCard } from "./MatchSummaryCard";
import { PlayerCard } from "./PlayerCard";
import { BounceHeatmap } from "./BounceHeatmap";
import { ConfidenceCard } from "./ConfidenceCard";
import { TaskStatusCard } from "./TaskStatusCard";
import { getDynamicSwingsThreshold } from "../constants";

interface AnalysisTabsProps {
  result: StatisticsResult | null;
  task: Task;
  videoRef: RefObject<HTMLVideoElement | null>;
  portraits: Record<number, string>;
  enhancedBallBounces?: BallBounce[];
  playerDisplayNames?: Record<number, string>;
}

type TabId = "summary" | "players" | "highlights" | "tactical" | "technique";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
}

export function AnalysisTabs({
  result,
  task,
  videoRef,
  portraits,
  enhancedBallBounces,
  playerDisplayNames = {},
}: AnalysisTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("summary");

  const filteredPlayers: Player[] = result?.players
    ? (() => {
        const threshold = getDynamicSwingsThreshold(result.players);
        return result.players
          .filter((p) => p.swing_count >= threshold)
          .sort((a, b) => b.swing_count - a.swing_count);
      })()
    : [];

  const highlightsCount = result?.highlights?.length || 0;

  const tabs: Tab[] = [
    {
      id: "summary",
      label: "Match Summary",
      icon: <BarChartIcon width={16} height={16} />,
    },
    {
      id: "players",
      label: "Player Stats",
      icon: <PersonIcon width={16} height={16} />,
      badge: filteredPlayers.length > 0 ? filteredPlayers.length : undefined,
    },
    {
      id: "highlights",
      label: "Highlights",
      icon: <StarIcon width={16} height={16} />,
      badge: highlightsCount > 0 ? highlightsCount : undefined,
    },
    {
      id: "tactical",
      label: "Tactical",
      icon: <TargetIcon width={16} height={16} />,
    },
    {
      id: "technique",
      label: "Technique",
      icon: <MixIcon width={16} height={16} />,
      disabled: true,
    },
  ];

  return (
    <Box>
      {/* Tab Navigation */}
      <Card
        style={{
          border: "1px solid var(--gray-6)",
          borderRadius: "var(--radius-3)",
          marginBottom: "var(--space-4)",
          overflow: "hidden",
        }}
      >
        <Flex
          gap="0"
          style={{
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            backgroundColor: "var(--gray-2)",
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;

            return (
              <Box
                key={tab.id}
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                style={{
                  padding: "14px 20px",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  borderBottom: isActive
                    ? "2px solid var(--mint-9)"
                    : "2px solid transparent",
                  backgroundColor: isActive
                    ? "var(--gray-1)"
                    : "transparent",
                  opacity: isDisabled ? 0.4 : 1,
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !isDisabled) {
                    e.currentTarget.style.backgroundColor = "var(--gray-3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && !isDisabled) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <Flex align="center" gap="2">
                  <Box
                    style={{
                      color: isActive ? "var(--mint-11)" : "var(--gray-10)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {tab.icon}
                  </Box>
                  <Text
                    size="2"
                    weight={isActive ? "medium" : "regular"}
                    style={{
                      color: isActive ? "var(--gray-12)" : "var(--gray-11)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tab.label}
                  </Text>
                  {tab.badge !== undefined && (
                    <Badge
                      size="1"
                      color={isActive ? "mint" : "gray"}
                      variant="soft"
                      style={{ marginLeft: "4px" }}
                    >
                      {tab.badge}
                    </Badge>
                  )}
                  {isDisabled && (
                    <Badge size="1" color="gray" variant="outline">
                      Soon
                    </Badge>
                  )}
                </Flex>
              </Box>
            );
          })}
        </Flex>
      </Card>

      {/* Tab Content */}
      <Box
        style={{
          minHeight: "300px",
          animation: "fadeIn 0.2s ease-out",
        }}
      >
        {/* Match Summary Tab */}
        {activeTab === "summary" && (
          <SummaryTab
            result={result}
            task={task}
            enhancedBallBounces={enhancedBallBounces}
          />
        )}

        {/* Player Stats Tab */}
        {activeTab === "players" && (
          <PlayersTab
            filteredPlayers={filteredPlayers}
            playerDisplayNames={playerDisplayNames}
            portraits={portraits}
          />
        )}

        {/* Highlights Tab */}
        {activeTab === "highlights" && (
          <HighlightsTab result={result} videoRef={videoRef} />
        )}

        {/* Tactical Analysis Tab */}
        {activeTab === "tactical" && (
          <TacticalTab result={result} enhancedBallBounces={enhancedBallBounces} />
        )}

        {/* Technique Analysis Tab */}
        {activeTab === "technique" && <TechniqueTab />}
      </Box>
    </Box>
  );
}

// ============================================================================
// TAB CONTENT COMPONENTS
// ============================================================================

function SummaryTab({
  result,
  task,
  enhancedBallBounces,
}: {
  result: StatisticsResult | null;
  task: Task;
  enhancedBallBounces?: BallBounce[];
}) {
  if (!result) {
    return <TaskStatusCard task={task} />;
  }

  return (
    <Grid columns={{ initial: "1", md: "2" }} gap="4">
      <MatchSummaryCard result={result} enhancedBallBounces={enhancedBallBounces} />
      {result.confidences && (
        <ConfidenceCard confidences={result.confidences.final_confidences} />
      )}
    </Grid>
  );
}

function PlayersTab({
  filteredPlayers,
  playerDisplayNames,
  portraits,
}: {
  filteredPlayers: Player[];
  playerDisplayNames: Record<number, string>;
  portraits: Record<number, string>;
}) {
  // Calculate all the rankings
  const maxDistance = Math.max(...filteredPlayers.map(p => p.covered_distance || 0), 0);
  const maxSprintSpeed = Math.max(...filteredPlayers.map(p => p.fastest_sprint || 0), 0);
  const maxBallSpeed = Math.max(...filteredPlayers.flatMap(p => p.swings?.map(s => s.ball_speed || 0) || []), 0);
  const maxSwings = Math.max(...filteredPlayers.map(p => p.swings?.length || 0), 0);

  // Distance rankings
  const distanceRankings: Record<number, number> = {};
  [...filteredPlayers].sort((a, b) => (b.covered_distance || 0) - (a.covered_distance || 0))
    .forEach((p, i) => { if (i < 3 && p.covered_distance > 0) distanceRankings[p.player_id] = i + 1; });

  // Sprint rankings
  const sprintRankings: Record<number, number> = {};
  [...filteredPlayers].sort((a, b) => (b.fastest_sprint || 0) - (a.fastest_sprint || 0))
    .forEach((p, i) => { if (i < 3 && p.fastest_sprint > 0) sprintRankings[p.player_id] = i + 1; });

  // Ball speed rankings
  const ballSpeedRankings: Record<number, number> = {};
  const playerMaxSpeeds = filteredPlayers.map(p => ({
    playerId: p.player_id,
    maxSpeed: Math.max(...(p.swings?.map(s => s.ball_speed || 0) || [0]))
  }));
  playerMaxSpeeds.sort((a, b) => b.maxSpeed - a.maxSpeed)
    .forEach((p, i) => { if (i < 3 && p.maxSpeed > 0) ballSpeedRankings[p.playerId] = i + 1; });

  // Swings rankings
  const swingsRankings: Record<number, number> = {};
  [...filteredPlayers].sort((a, b) => (b.swings?.length || 0) - (a.swings?.length || 0))
    .forEach((p, i) => { if (i < 3 && (p.swings?.length || 0) > 0) swingsRankings[p.player_id] = i + 1; });

  if (filteredPlayers.length === 0) {
    return (
      <Flex
        align="center"
        justify="center"
        direction="column"
        gap="3"
        style={{ padding: "60px 20px" }}
      >
        <PersonIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
        <Text size="3" color="gray">
          No player data available yet
        </Text>
        <Text size="2" color="gray">
          Player statistics will appear here once the analysis is complete
        </Text>
      </Flex>
    );
  }

  return (
    <Box
      style={{
        overflowX: "auto",
        overflowY: "hidden",
        paddingBottom: 16,
        marginLeft: -16,
        marginRight: -16,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <Flex gap="4" style={{ width: "max-content" }}>
        {filteredPlayers.map((player, index) => (
          <Box key={player.player_id} style={{ width: 400, flexShrink: 0 }}>
            <PlayerCard
              player={player}
              displayIndex={index + 1}
              displayName={playerDisplayNames[player.player_id] || `Player ${index + 1}`}
              portrait={portraits[player.player_id]}
              maxDistance={maxDistance}
              distanceRank={distanceRankings[player.player_id]}
              maxBallSpeed={maxBallSpeed}
              ballSpeedRank={ballSpeedRankings[player.player_id]}
              maxSprintSpeed={maxSprintSpeed}
              sprintRank={sprintRankings[player.player_id]}
              swingsRank={swingsRankings[player.player_id]}
              maxSwings={maxSwings}
            />
          </Box>
        ))}
      </Flex>
    </Box>
  );
}

function HighlightsTab({
  result,
  videoRef,
}: {
  result: StatisticsResult | null;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  if (!result || !result.highlights || result.highlights.length === 0) {
    return (
      <Flex
        align="center"
        justify="center"
        direction="column"
        gap="3"
        style={{ padding: "60px 20px" }}
      >
        <StarIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
        <Text size="3" color="gray">
          No highlights detected
        </Text>
        <Text size="2" color="gray">
          Key moments from the match will appear here
        </Text>
      </Flex>
    );
  }

  return <HighlightsCard highlights={result.highlights} videoRef={videoRef} />;
}

function TacticalTab({
  result,
  enhancedBallBounces,
}: {
  result: StatisticsResult | null;
  enhancedBallBounces?: BallBounce[];
}) {
  if (!result) {
    return (
      <Flex
        align="center"
        justify="center"
        direction="column"
        gap="3"
        style={{ padding: "60px 20px" }}
      >
        <TargetIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
        <Text size="3" color="gray">
          Tactical analysis not available
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4">
      <Box>
        <Heading size="3" weight="medium" mb="3">
          Court Coverage
        </Heading>
        <Text size="2" color="gray" mb="4">
          Ball bounce distribution across the court
        </Text>
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

      {/* Placeholder for future tactical analysis features */}
      <Grid columns={{ initial: "1", md: "2" }} gap="4">
        <Card style={{ border: "1px solid var(--gray-5)", opacity: 0.6 }}>
          <Flex direction="column" gap="2" p="4" align="center" justify="center" style={{ minHeight: "150px" }}>
            <Text size="2" color="gray" weight="medium">
              Rally Patterns
            </Text>
            <Badge color="gray" variant="outline">Coming Soon</Badge>
          </Flex>
        </Card>
        <Card style={{ border: "1px solid var(--gray-5)", opacity: 0.6 }}>
          <Flex direction="column" gap="2" p="4" align="center" justify="center" style={{ minHeight: "150px" }}>
            <Text size="2" color="gray" weight="medium">
              Shot Placement
            </Text>
            <Badge color="gray" variant="outline">Coming Soon</Badge>
          </Flex>
        </Card>
      </Grid>
    </Flex>
  );
}

function TechniqueTab() {
  return (
    <Flex
      align="center"
      justify="center"
      direction="column"
      gap="4"
      style={{ padding: "60px 20px" }}
    >
      <Box
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          backgroundColor: "var(--gray-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MixIcon width={40} height={40} style={{ color: "var(--gray-8)" }} />
      </Box>
      <Heading size="4" weight="medium" style={{ color: "var(--gray-11)" }}>
        Technique Analysis
      </Heading>
      <Text size="2" color="gray" align="center" style={{ maxWidth: 400 }}>
        Detailed swing analysis, form breakdowns, and technique comparisons will be available in a future update.
      </Text>
      <Badge color="mint" variant="soft" size="2">
        Coming Soon
      </Badge>
    </Flex>
  );
}

