"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Box, Flex, Text, Tooltip } from "@radix-ui/themes";
import { PersonIcon, ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { PlayerCard } from "../PlayerCard";
import type { PlayerRankings } from "../../hooks/usePlayerRankings";
import { getSortedPlayersWithOverallRank } from "../../hooks/usePlayerRankings";

interface PlayersTabProps {
  rankings: PlayerRankings;
  portraits: Record<number, string>;
}

export function PlayersTab({ rankings, portraits }: PlayersTabProps) {
  const { validPlayers } = rankings;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Get sorted players - all start medal animations together, winner finishes last
  const sortedPlayers = useMemo(() => {
    if (validPlayers.length === 0) return [];
    return getSortedPlayersWithOverallRank(rankings);
  }, [validPlayers, rankings]);

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    
    updateScrollState();
    container.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    
    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, sortedPlayers.length]);

  const scrollToStart = () => {
    scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  const scrollToEnd = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ 
      left: scrollRef.current.scrollWidth, 
      behavior: "smooth" 
    });
  };

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
    <Box style={{ animation: "fadeIn 0.2s ease-out", position: "relative" }}>
      {/* Left scroll indicator */}
      {canScrollLeft && (
        <Box
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 16,
            width: 48,
            background: "linear-gradient(to right, var(--gray-1) 0%, transparent 100%)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            paddingLeft: 8,
            paddingTop: 80,
            zIndex: 10,
          }}
        >
          <Tooltip content="Scroll to start">
            <button
              onClick={scrollToStart}
              aria-label="Scroll to start"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "9999px",
                backgroundColor: "#7ADB8F",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.3s ease-out",
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = "#95E5A6";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(122, 219, 143, 0.6), 0 0 40px rgba(122, 219, 143, 0.4), 0 4px 16px rgba(122, 219, 143, 0.5)";
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = "#7ADB8F";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)";
              }}
            >
              <ChevronLeftIcon width={18} height={18} color="#1C1C1C" />
            </button>
          </Tooltip>
        </Box>
      )}

      {/* Right scroll indicator */}
      {canScrollRight && (
        <Box
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 16,
            width: 48,
            background: "linear-gradient(to left, var(--gray-1) 0%, transparent 100%)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-end",
            paddingRight: 8,
            paddingTop: 80,
            zIndex: 10,
          }}
        >
          <Tooltip content="Scroll to end">
            <button
              onClick={scrollToEnd}
              aria-label="Scroll to end"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "9999px",
                backgroundColor: "#7ADB8F",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.3s ease-out",
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = "#95E5A6";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(122, 219, 143, 0.6), 0 0 40px rgba(122, 219, 143, 0.4), 0 4px 16px rgba(122, 219, 143, 0.5)";
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = "#7ADB8F";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)";
              }}
            >
              <ChevronRightIcon width={18} height={18} color="#1C1C1C" />
            </button>
          </Tooltip>
        </Box>
      )}

      <Box
        ref={scrollRef}
        style={{
          overflowX: "auto",
          overflowY: "visible",
          paddingBottom: 16,
          cursor: "grab",
          scrollBehavior: "smooth",
        }}
        onMouseDown={(e) => {
          const container = e.currentTarget;
          container.style.cursor = "grabbing";
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
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
          };
          
          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        }}
      >
        <Flex gap="4" align="stretch" style={{ width: "max-content" }}>
          {sortedPlayers.map((player) => (
            <Box
              key={player.player_id}
              style={{ maxWidth: 320, flexShrink: 0, height: "100%" }}
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


