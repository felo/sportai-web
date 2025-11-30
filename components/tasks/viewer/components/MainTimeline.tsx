"use client";

import { RefObject, useMemo, useRef, useCallback } from "react";
import { Box, Flex, Heading, Text, Tooltip, Card, Badge } from "@radix-ui/themes";
import { CONFIG } from "../constants";
import { StatisticsResult, Task, BallBounce } from "../types";
import { formatDuration } from "../utils";
import { DraggablePlayhead } from "./DraggablePlayhead";

interface MainTimelineProps {
  result: StatisticsResult;
  task: Task;
  currentTime: number;
  selectedRallyIndex: number | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  onRallySelect: (index: number) => void;
  enhancedBallBounces?: BallBounce[];
  showOnlyRallies?: boolean;
  rallyBuffer?: number;
}

export function MainTimeline({
  result,
  task,
  currentTime,
  selectedRallyIndex,
  videoRef,
  onRallySelect,
  enhancedBallBounces,
  showOnlyRallies = false,
  rallyBuffer = CONFIG.RALLY_START_OFFSET_SECONDS,
}: MainTimelineProps) {
  // Use enhanced bounces if provided, fallback to empty array
  const allBounces = enhancedBallBounces || result.ball_bounces || [];
  const rallies = result.rallies || [];
  
  // Calculate total swings from all players
  const totalSwings = result.players?.reduce((sum, player) => sum + player.swing_count, 0) || 0;
  
  const lastRally = rallies[rallies.length - 1];
  const lastBounce = allBounces[allBounces.length - 1];
  const estimatedDuration = Math.max(
    task.video_length || 0,
    lastRally ? lastRally[1] : 0,
    lastBounce ? lastBounce.timestamp : 0
  );
  const totalDuration = estimatedDuration || 300;

  // Calculate rally-only metrics
  const rallyMetrics = useMemo(() => {
    if (!showOnlyRallies || rallies.length === 0) {
      return null;
    }

    // Calculate total rally duration
    const totalRallyDuration = rallies.reduce((sum, [start, end]) => sum + (end - start), 0);
    
    // Calculate cumulative start positions for each rally
    const rallyPositions: { start: number; end: number; originalStart: number; originalEnd: number }[] = [];
    let cumulativeTime = 0;
    
    for (const [start, end] of rallies) {
      const duration = end - start;
      rallyPositions.push({
        start: cumulativeTime,
        end: cumulativeTime + duration,
        originalStart: start,
        originalEnd: end,
      });
      cumulativeTime += duration;
    }

    return {
      totalRallyDuration,
      rallyPositions,
    };
  }, [rallies, showOnlyRallies]);

  // Convert real time to collapsed timeline position
  const getCollapsedPosition = (time: number): number => {
    if (!rallyMetrics) return (time / totalDuration) * 100;

    for (let i = 0; i < rallies.length; i++) {
      const [rallyStart, rallyEnd] = rallies[i];
      const { start: collapsedStart, end: collapsedEnd } = rallyMetrics.rallyPositions[i];
      
      if (time >= rallyStart && time <= rallyEnd) {
        // Time is within this rally - calculate position within
        const relativePosition = (time - rallyStart) / (rallyEnd - rallyStart);
        const collapsedPosition = collapsedStart + relativePosition * (collapsedEnd - collapsedStart);
        return (collapsedPosition / rallyMetrics.totalRallyDuration) * 100;
      }
    }
    
    // Time is between rallies or outside - find nearest rally
    for (let i = 0; i < rallies.length - 1; i++) {
      const [, currentEnd] = rallies[i];
      const [nextStart] = rallies[i + 1];
      
      if (time > currentEnd && time < nextStart) {
        // Between rallies - snap to end of current rally
        return (rallyMetrics.rallyPositions[i].end / rallyMetrics.totalRallyDuration) * 100;
      }
    }
    
    // Before first rally or after last rally
    if (time < rallies[0][0]) {
      return 0;
    }
    return 100;
  };

  // Convert collapsed timeline click to real time
  const getTimeFromCollapsedPosition = (percentage: number): number => {
    if (!rallyMetrics) return percentage * totalDuration;

    const targetCollapsedTime = percentage * rallyMetrics.totalRallyDuration;
    
    for (let i = 0; i < rallyMetrics.rallyPositions.length; i++) {
      const { start, end, originalStart, originalEnd } = rallyMetrics.rallyPositions[i];
      
      if (targetCollapsedTime >= start && targetCollapsedTime <= end) {
        const relativePosition = (targetCollapsedTime - start) / (end - start);
        return originalStart + relativePosition * (originalEnd - originalStart);
      }
    }
    
    return rallies[rallies.length - 1][1]; // Default to end of last rally
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    
    const targetTime = showOnlyRallies && rallyMetrics
      ? getTimeFromCollapsedPosition(percentage)
      : percentage * totalDuration;
    
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleRallyClick = (e: React.MouseEvent, index: number, start: number) => {
    e.stopPropagation();
    onRallySelect(index);
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, start - rallyBuffer);
    }
  };

  // Timeline ref for drag operations
  const timelineRef = useRef<HTMLDivElement>(null);

  // Convert percentage to time (for drag operations)
  const positionToTime = useCallback((percentage: number): number => {
    return showOnlyRallies && rallyMetrics
      ? getTimeFromCollapsedPosition(percentage)
      : percentage * totalDuration;
  }, [showOnlyRallies, rallyMetrics, totalDuration, getTimeFromCollapsedPosition]);

  // Seek handler for playhead drag
  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  // Get current playhead position
  const playheadPosition = showOnlyRallies && rallyMetrics
    ? getCollapsedPosition(currentTime)
    : (currentTime / totalDuration) * 100;

  // Calculate elapsed rally time (time spent in rallies up to current position)
  const elapsedRallyTime = useMemo(() => {
    if (!showOnlyRallies || !rallyMetrics) return null;

    let elapsed = 0;
    for (let i = 0; i < rallies.length; i++) {
      const [rallyStart, rallyEnd] = rallies[i];
      
      if (currentTime < rallyStart) {
        // Current time is before this rally - stop counting
        break;
      } else if (currentTime >= rallyStart && currentTime <= rallyEnd) {
        // Currently inside this rally - add partial time
        elapsed += currentTime - rallyStart;
        break;
      } else {
        // Fully past this rally - add full rally duration
        elapsed += rallyEnd - rallyStart;
      }
    }
    
    return elapsed;
  }, [showOnlyRallies, rallyMetrics, rallies, currentTime]);

  // Effective duration for display
  const effectiveDuration = showOnlyRallies && rallyMetrics
    ? rallyMetrics.totalRallyDuration
    : totalDuration;

  return (
    <Card style={{ border: "1px solid var(--gray-6)", marginBottom: "var(--space-3)" }}>
      <Flex direction="column" gap="2" p="3">
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <Heading size="4" weight="medium">
              Timeline
            </Heading>
            {showOnlyRallies && rallyMetrics && (
              <Badge color="mint" size="1" variant="soft">
                Rallies only • {formatDuration(rallyMetrics.totalRallyDuration)}
              </Badge>
            )}
            <Box display={{ initial: "none", sm: "block" }}>
              <Text size="2" color="gray">
                {rallies.length} rallies • {totalSwings} swings • {allBounces.length} bounces
              </Text>
            </Box>
          </Flex>
          <Flex align="center" gap="1">
            <Box style={{ width: 10, height: 10, backgroundColor: "var(--mint-9)", borderRadius: 2 }} />
            <Text size="1" color="gray">Rally</Text>
          </Flex>
        </Flex>

        <Box
          ref={timelineRef}
          onClick={handleTimelineClick}
          style={{
            height: "36px",
            backgroundColor: showOnlyRallies ? "var(--mint-a3)" : "var(--gray-3)",
            borderRadius: "var(--radius-3)",
            position: "relative",
            overflow: "visible",
            marginTop: "16px",
            cursor: "pointer",
            transition: "background-color 0.2s ease",
          }}
        >
          {/* Rally markers */}
          {showOnlyRallies && rallyMetrics ? (
            // Collapsed view - rallies fill the entire timeline
            rallyMetrics.rallyPositions.map((pos, i) => {
              const left = (pos.start / rallyMetrics.totalRallyDuration) * 100;
              const width = ((pos.end - pos.start) / rallyMetrics.totalRallyDuration) * 100;
              const isPlayheadInRally = currentTime >= pos.originalStart && currentTime <= pos.originalEnd;
              const isSelected = selectedRallyIndex === i;

              return (
                <Tooltip
                  key={i}
                  content={`Rally ${i + 1}: ${formatDuration(pos.originalStart)} - ${formatDuration(pos.originalEnd)} (${formatDuration(pos.originalEnd - pos.originalStart)})`}
                >
                  <Box
                    onClick={(e: React.MouseEvent) => handleRallyClick(e, i, pos.originalStart)}
                    style={{
                      position: "absolute",
                      left: `${left}%`,
                      width: `${Math.max(width, 0.5)}%`,
                      height: "100%",
                      backgroundColor: isPlayheadInRally || isSelected ? "var(--mint-a8)" : "var(--mint-a5)",
                      borderLeft: i > 0 ? "2px solid var(--gray-6)" : "none",
                      borderRight: isSelected ? "none" : "1px solid var(--mint-9)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isPlayheadInRally ? "0 0 20px rgba(122,219,143,0.6)" : "none",
                      zIndex: 5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
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
                  >
                    <Text 
                      size="1" 
                      style={{ 
                        color: "var(--mint-11)", 
                        fontWeight: 600,
                        fontSize: width > 8 ? "12px" : width > 4 ? "10px" : width > 2 ? "8px" : "6px",
                        opacity: width > 1 ? 1 : 0.7,
                        userSelect: "none",
                      }}
                    >
                      {i + 1}
                    </Text>
                  </Box>
                </Tooltip>
              );
            })
          ) : (
            // Normal view - rallies positioned by real time
            rallies.map(([start, end], i) => {
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
            })
          )}

          {/* Playhead - draggable */}
          <DraggablePlayhead
            currentTime={currentTime}
            position={playheadPosition}
            onSeek={handleSeek}
            positionToTime={positionToTime}
            timelineRef={timelineRef}
            displayTime={elapsedRallyTime ?? undefined}
          />
        </Box>
      </Flex>
    </Card>
  );
}

