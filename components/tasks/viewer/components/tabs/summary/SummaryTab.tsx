"use client";

import { useState, useEffect, useMemo } from "react";
import { Box, Grid, Flex, Heading, Card } from "@radix-ui/themes";
import { Task, StatisticsResult, BallBounce } from "../../../types";
import { TaskStatusCard } from "../../index";
import { CountingContext } from "./CountingContext";
import { calculateSummaryStats } from "./utils";
import { formatDuration, formatDistanceKm, formatDistanceM, formatRallyLength, formatShotsPerRally, formatIntensity } from "./utils";
import {
  SpeedometerDisplay,
  SwingTypesChart,
  ServesVolleysDisplay,
  BouncesDisplay,
  ConfidenceDisplay,
  QuickStatCard,
  EmptyState,
} from "./components";

// Animation timing constants
const CARD_FADE_DURATION = 400;
const CARD_STAGGER_DELAY = 80;
const TOTAL_ROWS = 5;

// CSS keyframes for card fade-in
const cardFadeKeyframes = `
@keyframes cardFadeInFromTop {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

interface SummaryTabProps {
  task: Task;
  result: StatisticsResult | null;
  enhancedBallBounces: BallBounce[];
}

export function SummaryTab({ task, result, enhancedBallBounces }: SummaryTabProps) {
  const [cardsVisible, setCardsVisible] = useState(false);
  const [startCounting, setStartCounting] = useState(false);

  // Trigger animations after mount
  useEffect(() => {
    if (!result) return;
    
    const fadeTimer = setTimeout(() => setCardsVisible(true), 50);
    const countTimer = setTimeout(() => {
      setStartCounting(true);
    }, 50 + (TOTAL_ROWS - 1) * CARD_STAGGER_DELAY + CARD_FADE_DURATION + 100);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(countTimer);
    };
  }, [result]);

  // Calculate all stats from result
  const stats = useMemo(() => {
    if (!result) return null;
    return calculateSummaryStats({ result, enhancedBallBounces });
  }, [result, enhancedBallBounces]);

  if (!result || !stats) {
    return (
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        <TaskStatusCard task={task} />
      </Box>
    );
  }

  const getRowAnimation = (rowIndex: number) => ({
    opacity: 0,
    transform: "translateY(-20px)",
    animation: cardsVisible 
      ? `cardFadeInFromTop ${CARD_FADE_DURATION}ms ease-out ${rowIndex * CARD_STAGGER_DELAY}ms forwards`
      : "none",
  });

  return (
    <CountingContext.Provider value={startCounting}>
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        <style dangerouslySetInnerHTML={{ __html: cardFadeKeyframes }} />
        
        {/* Quick Stats Row 1 */}
        <Grid columns={{ initial: "2", sm: "3", md: "6" }} gap="3" mb="4" style={getRowAnimation(0)}>
          <QuickStatCard label="Teams" value={stats.teamCount} />
          <QuickStatCard label="Rallies" value={stats.ralliesCount} />
          <QuickStatCard label="Total Swings" value={stats.totalSwings} />
          <QuickStatCard label="Distance Covered" value={stats.totalDistanceCovered} formatValue={formatDistanceKm} />
          <QuickStatCard label="Active Play" value={stats.totalRallyDuration} formatValue={formatDuration} />
          <QuickStatCard label="Avg. Distance" value={stats.avgDistancePerPlayer} formatValue={formatDistanceM} />
        </Grid>

        {/* Quick Stats Row 2 */}
        <Grid columns={{ initial: "2", sm: "4" }} gap="3" mb="4" style={getRowAnimation(1)}>
          <QuickStatCard label="Avg. Rally Length" value={stats.avgRallyDuration} formatValue={formatRallyLength} />
          <QuickStatCard label="Avg. Shots/Rally" value={stats.avgShotsPerRally} formatValue={formatShotsPerRally} />
          <QuickStatCard label="Rally Intensity (Avg)" value={stats.avgRallyIntensity} formatValue={formatIntensity} />
          <QuickStatCard label="Rally Intensity (Max)" value={stats.maxRallyIntensity} formatValue={formatIntensity} />
        </Grid>

        {/* Main Cards Row 1: Speeds & Serves */}
        <Grid columns={{ initial: "1", md: "3" }} gap="4" mb="4" style={getRowAnimation(2)}>
          <Card style={{ border: "1px solid var(--gray-5)" }}>
            <Flex direction="column" gap="3" p="4">
              <Heading size="3" weight="medium">Overall Shot Power</Heading>
              {stats.hasSpeedData ? (
                <SpeedometerDisplay maxSpeed={stats.maxBallSpeed} avgSpeed={stats.avgBallSpeed} label="Shot" unit="km/h" />
              ) : (
                <EmptyState message="No speed data available" />
              )}
            </Flex>
          </Card>

          <Card style={{ border: "1px solid var(--gray-5)" }}>
            <Flex direction="column" gap="3" p="4">
              <Heading size="3" weight="medium">Overall Sprint Speed</Heading>
              {stats.hasSprintData ? (
                <SpeedometerDisplay maxSpeed={stats.maxSprintSpeed} avgSpeed={stats.avgSprintSpeed} label="Sprint" unit="km/h" colorScheme="sprint" />
              ) : (
                <EmptyState message="No sprint data available" />
              )}
            </Flex>
          </Card>

          <Card style={{ border: "1px solid var(--gray-5)" }}>
            <Flex direction="column" gap="3" p="4">
              <Heading size="3" weight="medium">Serves & Volleys</Heading>
              <ServesVolleysDisplay
                serveCount={stats.serveCount}
                volleyCount={stats.volleyCount}
                groundStrokeCount={stats.groundStrokeCount}
                totalSwings={stats.totalSwingCount}
                avgServeSpeed={stats.avgServeSpeed}
                maxServeSpeed={stats.maxServeSpeed}
                avgVolleySpeed={stats.avgVolleySpeed}
                maxVolleySpeed={stats.maxVolleySpeed}
                avgGroundStrokeSpeed={stats.avgGroundStrokeSpeed}
                maxGroundStrokeSpeed={stats.maxGroundStrokeSpeed}
              />
            </Flex>
          </Card>
        </Grid>

        {/* Main Cards Row 2 */}
        <Grid columns={{ initial: "1", md: "3" }} gap="4" mb="4" style={getRowAnimation(3)}>
          <Card style={{ border: "1px solid var(--gray-5)" }}>
            <Flex direction="column" gap="3" p="4">
              <Heading size="3" weight="medium">Swing Types</Heading>
              {stats.hasSwingData ? (
                <SwingTypesChart data={stats.swingTypeData} totalSwings={stats.totalSwingCount} />
              ) : (
                <EmptyState message="No swing data available" />
              )}
            </Flex>
          </Card>

          <Card style={{ border: "1px solid var(--gray-5)" }}>
            <Flex direction="column" gap="3" p="4">
              <Heading size="3" weight="medium">Ball Bounces</Heading>
              <BouncesDisplay total={stats.bounceCount} bounceCounts={stats.bounceCounts} />
            </Flex>
          </Card>

          {result.confidences ? (
            <ConfidenceDisplay confidences={result.confidences.final_confidences} />
          ) : (
            <Card style={{ border: "1px solid var(--gray-5)" }}>
              <Flex direction="column" gap="3" p="4">
                <Heading size="3" weight="medium">AI Detection Confidence</Heading>
                <EmptyState message="No confidence data available" />
              </Flex>
            </Card>
          )}
        </Grid>
      </Box>
    </CountingContext.Provider>
  );
}
