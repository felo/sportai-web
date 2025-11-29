"use client";

import { RefObject } from "react";
import { Box, Flex, Heading, Text, Tooltip, Card } from "@radix-ui/themes";
import { CONFIG } from "../constants";
import { StatisticsResult, Task, BallBounce } from "../types";
import { formatDuration } from "../utils";

interface MainTimelineProps {
  result: StatisticsResult;
  task: Task;
  currentTime: number;
  selectedRallyIndex: number | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  onRallySelect: (index: number) => void;
  enhancedBallBounces?: BallBounce[];
}

export function MainTimeline({
  result,
  task,
  currentTime,
  selectedRallyIndex,
  videoRef,
  onRallySelect,
  enhancedBallBounces,
}: MainTimelineProps) {
  // Use enhanced bounces if provided
  const allBounces = enhancedBallBounces || result.ball_bounces;
  
  const lastRally = result.rallies[result.rallies.length - 1];
  const lastBounce = allBounces[allBounces.length - 1];
  const estimatedDuration = Math.max(
    task.video_length || 0,
    lastRally ? lastRally[1] : 0,
    lastBounce ? lastBounce.timestamp : 0
  );
  const totalDuration = estimatedDuration || 300;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const targetTime = percentage * totalDuration;
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleRallyClick = (e: React.MouseEvent, index: number, start: number) => {
    e.stopPropagation();
    onRallySelect(index);
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, start - CONFIG.RALLY_START_OFFSET_SECONDS);
    }
  };

  return (
    <Card style={{ border: "1px solid var(--gray-6)", marginBottom: "var(--space-3)" }}>
      <Flex direction="column" gap="2" p="3">
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <Heading size="4" weight="medium">
              Timeline
            </Heading>
            <Text size="2" color="gray">
              {result.rallies.length} rallies • {allBounces.length} bounces
            </Text>
          </Flex>
          <Flex align="center" gap="1">
            <Box style={{ width: 10, height: 10, backgroundColor: "var(--mint-9)", borderRadius: 2 }} />
            <Text size="1" color="gray">Rally</Text>
          </Flex>
        </Flex>

        <Box
          onClick={handleTimelineClick}
          style={{
            height: "36px",
            backgroundColor: "var(--gray-3)",
            borderRadius: "var(--radius-3)",
            position: "relative",
            overflow: "visible",
            marginTop: "16px",
            cursor: "pointer",
          }}
        >
          {/* Rally markers */}
          {result.rallies.map(([start, end], i) => {
            const left = (start / totalDuration) * 100;
            const width = ((end - start) / totalDuration) * 100;
            const isPlayheadInRally = currentTime >= start && currentTime <= end;
            const isSelected = selectedRallyIndex === i;

            return (
              <Tooltip
                key={i}
                content={`Rally ${i + 1}: ${formatDuration(start)} - ${formatDuration(end)} (${formatDuration(end - start)})`}
              >
                <Box
                  onClick={(e: React.MouseEvent) => handleRallyClick(e, i, start)}
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    width: `${Math.max(width, 0.5)}%`,
                    height: "100%",
                    backgroundColor: isPlayheadInRally || isSelected ? "var(--mint-a8)" : "var(--mint-a5)",
                    borderLeft: isSelected ? "3px solid var(--mint-11)" : "2px solid var(--mint-9)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isPlayheadInRally ? "0 0 20px rgba(122,219,143,0.6)" : "none",
                    zIndex: 5,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isPlayheadInRally) {
                      e.currentTarget.style.backgroundColor = "var(--mint-a7)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      isPlayheadInRally || isSelected ? "var(--mint-a8)" : "var(--mint-a5)";
                  }}
                />
              </Tooltip>
            );
          })}

          {/* Playhead */}
          <Box
            style={{
              position: "absolute",
              left: `${(currentTime / totalDuration) * 100}%`,
              top: 0,
              width: "2px",
              height: "100%",
              backgroundColor: "var(--red-9)",
              zIndex: 20,
              pointerEvents: "none",
            }}
          />
          <Box
            style={{
              position: "absolute",
              left: `${(currentTime / totalDuration) * 100}%`,
              top: "-20px",
              transform: "translateX(-50%)",
              backgroundColor: "var(--red-9)",
              color: "white",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "10px",
              whiteSpace: "nowrap",
              zIndex: 21,
              pointerEvents: "none",
            }}
          >
            {formatDuration(currentTime)}
          </Box>
        </Box>
      </Flex>
    </Card>
  );
}

