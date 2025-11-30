"use client";

import { useMemo } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import { PlayerCard } from "../PlayerCard";
import type { PlayerRankings } from "../../hooks/usePlayerRankings";
import { getSortedPlayersWithOverallRank } from "../../hooks/usePlayerRankings";

interface PlayersTabProps {
  rankings: PlayerRankings;
  portraits: Record<number, string>;
}

export function PlayersTab({ rankings, portraits }: PlayersTabProps) {
  const { validPlayers } = rankings;

  // Get sorted players - all start medal animations together, winner finishes last
  const sortedPlayers = useMemo(() => {
    if (validPlayers.length === 0) return [];
    return getSortedPlayersWithOverallRank(rankings);
  }, [validPlayers, rankings]);

  if (sortedPlayers.length === 0) {
    return (
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        <Flex
          align="center"
          justify="center"
          direction="column"
          gap="3"
          style={{ padding: "60px 20px" }}
        >
          <PersonIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
          <Text size="3" color="gray">No player data available yet</Text>
          <Text size="2" color="gray">
            Player statistics will appear here once the analysis is complete
          </Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      <Box
        style={{
          overflowX: "auto",
          overflowY: "visible",
          paddingBottom: 16,
          scrollSnapType: "x mandatory",
          cursor: "grab",
          scrollBehavior: "smooth",
        }}
        onMouseDown={(e) => {
          const container = e.currentTarget;
          container.style.cursor = "grabbing";
          container.style.scrollSnapType = "none";
          const startX = e.pageX - container.offsetLeft;
          const scrollLeft = container.scrollLeft;
          
          const onMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 1.5;
            container.scrollLeft = scrollLeft - walk;
          };
          
          const onMouseUp = () => {
            container.style.cursor = "grab";
            setTimeout(() => {
              container.style.scrollSnapType = "x mandatory";
            }, 50);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
          };
          
          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        }}
      >
        <Flex gap="4" style={{ width: "max-content" }}>
          {sortedPlayers.map((player) => (
            <Box
              key={player.player_id}
              style={{ maxWidth: 320, flexShrink: 0, scrollSnapAlign: "center" }}
            >
              <PlayerCard
                player={player}
                displayIndex={player.displayIndex}
                displayName={player.displayName}
                portrait={portraits[player.player_id]}
                maxDistance={rankings.maxDistanceCovered}
                distanceRank={rankings.distanceRankings[player.player_id]}
                maxBallSpeed={rankings.maxBallSpeed}
                ballSpeedRank={rankings.ballSpeedRankings[player.player_id]}
                maxSprintSpeed={rankings.maxSprintSpeed}
                sprintRank={rankings.sprintRankings[player.player_id]}
                swingsRank={rankings.swingsRankings[player.player_id]}
                maxSwings={rankings.maxSwings}
                overallRank={player.overallRank}
              />
            </Box>
          ))}
        </Flex>
      </Box>
    </Box>
  );
}


