"use client";

import { RefObject, useMemo, useRef, useCallback, useState, useEffect } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { CONFIG, OVERLAY_COLORS } from "../constants";
import { StatisticsResult, Task, BallBounce } from "../types";
import { formatDuration } from "../utils";
import { DraggablePlayhead } from "./DraggablePlayhead";

// Custom tooltip for rally hover
interface RallyTooltipProps {
  rallyIndex: number;
  startTime: number;
  endTime: number;
  position: number; // percentage
  visible: boolean;
}

function RallyTooltip({ rallyIndex, startTime, endTime, position, visible }: RallyTooltipProps) {
  if (!visible) return null;
  
  const duration = endTime - startTime;
  const { velocity } = OVERLAY_COLORS;
  
  return (
    <Box
      style={{
        position: "absolute",
        left: `${position}%`,
        bottom: "calc(100% + 8px)",
        transform: "translateX(-50%)",
        zIndex: 1000,
        pointerEvents: "none",
        animation: "fadeIn 0.15s ease-out",
      }}
    >
      {/* Tooltip content */}
      <Box
        style={{
          backgroundColor: velocity.backgroundColor,
          border: `2px solid ${velocity.borderColor}`,
          borderRadius: velocity.borderRadius,
          padding: "6px 10px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
        }}
      >
        <Flex align="center" gap="2">
          <Text
            size="2"
            weight="medium"
            style={{ color: velocity.textColor }}
          >
            Rally {rallyIndex + 1}
          </Text>
          <Text
            size="2"
            style={{ color: velocity.unitColor }}
          >
            {formatDuration(duration)}
          </Text>
        </Flex>
      </Box>
      
      {/* Arrow pointing down */}
      <Box
        style={{
          position: "absolute",
          left: "50%",
          top: "100%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: `6px solid ${velocity.borderColor}`,
        }}
      />
    </Box>
  );
}

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
  const [hoveredRallyIdx, setHoveredRallyIdx] = useState<number | null>(null);
  
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
  // Scroll container ref for auto-scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll when playhead reaches edge of visible area
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const timeline = timelineRef.current;
    if (!scrollContainer || !timeline) return;

    const timelineWidth = timeline.scrollWidth;
    const containerWidth = scrollContainer.clientWidth;
    
    // Only auto-scroll if content is wider than container
    if (timelineWidth <= containerWidth) return;

    // Calculate playhead position in pixels
    const playheadPixelPosition = (playheadPosition / 100) * timelineWidth;
    
    // Current scroll position
    const scrollLeft = scrollContainer.scrollLeft;
    const visibleRight = scrollLeft + containerWidth;
    
    // If playhead is near the right edge (within 50px), scroll to put it on the left
    if (playheadPixelPosition > visibleRight - 50) {
      scrollContainer.scrollTo({
        left: Math.max(0, playheadPixelPosition - 50),
        behavior: "smooth",
      });
    }
    // If playhead is before the visible area, scroll to show it
    else if (playheadPixelPosition < scrollLeft + 50) {
      scrollContainer.scrollTo({
        left: Math.max(0, playheadPixelPosition - 50),
        behavior: "smooth",
      });
    }
  }, [playheadPosition]);

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
    <Box style={{ marginBottom: "4px", padding: "6px 0", overflow: "visible" }}>
      <Flex direction="column" gap="0" p="0" style={{ overflow: "visible" }}>
        {/* Scrollable wrapper with fade mask */}
        <Box
          style={{
            position: "relative",
            overflow: "visible",
          }}
        >
          {/* Fade masks */}
          <Box
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "24px",
              background: "linear-gradient(to right, var(--gray-2), transparent)",
              zIndex: 10,
              pointerEvents: "none",
            }}
          />
          <Box
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "24px",
              background: "linear-gradient(to left, var(--gray-2), transparent)",
              zIndex: 10,
              pointerEvents: "none",
            }}
          />
          <Box
            ref={scrollContainerRef}
            style={{
              overflowX: "auto",
              overflowY: "visible",
            }}
          >
          <Box
            ref={timelineRef}
            onClick={handleTimelineClick}
            style={{
              height: "28px",
              // Minimum 36px per rally for touch targets
              minWidth: `${Math.max(rallies.length * 36, 100)}px`,
              backgroundColor: showOnlyRallies ? "var(--mint-a3)" : "var(--gray-3)",
              borderRadius: "4px",
              position: "relative",
              overflow: "visible",
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
              const isHovered = hoveredRallyIdx === i;

              return (
                <Box key={i}>
                  {/* Custom Tooltip */}
                  <RallyTooltip
                    rallyIndex={i}
                    startTime={pos.originalStart}
                    endTime={pos.originalEnd}
                    position={left + width / 2}
                    visible={isHovered}
                  />
                  <Box
                    onClick={(e: React.MouseEvent) => handleRallyClick(e, i, pos.originalStart)}
                    onMouseEnter={() => setHoveredRallyIdx(i)}
                    onMouseLeave={() => setHoveredRallyIdx(null)}
                    style={{
                      position: "absolute",
                      left: `${left}%`,
                      width: `${Math.max(width, 0.5)}%`,
                      height: "100%",
                      backgroundColor: isPlayheadInRally || isSelected || isHovered ? "var(--mint-a8)" : "var(--mint-a5)",
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
                  >
                    <Text 
                      size="1" 
                      style={{ 
                        color: "var(--mint-11)", 
                        fontWeight: 600,
                        fontSize: width > 8 ? "10px" : width > 4 ? "8px" : width > 2 ? "6px" : "5px",
                        opacity: width > 1 ? 1 : 0.7,
                        userSelect: "none",
                      }}
                    >
                      {i + 1}
                    </Text>
                  </Box>
                </Box>
              );
            })
          ) : (
            // Normal view - rallies positioned by real time
            rallies.map(([start, end], i) => {
              const left = (start / totalDuration) * 100;
              const width = ((end - start) / totalDuration) * 100;
              const isPlayheadInRally = currentTime >= start && currentTime <= end;
              const isSelected = selectedRallyIndex === i;
              const isHovered = hoveredRallyIdx === i;

              return (
                <Box key={i}>
                  {/* Custom Tooltip */}
                  <RallyTooltip
                    rallyIndex={i}
                    startTime={start}
                    endTime={end}
                    position={left + width / 2}
                    visible={isHovered}
                  />
                  <Box
                    onClick={(e: React.MouseEvent) => handleRallyClick(e, i, start)}
                    onMouseEnter={() => setHoveredRallyIdx(i)}
                    onMouseLeave={() => setHoveredRallyIdx(null)}
                    style={{
                      position: "absolute",
                      left: `${left}%`,
                      width: `${Math.max(width, 0.5)}%`,
                      height: "100%",
                      backgroundColor: isPlayheadInRally || isSelected || isHovered ? "var(--mint-a8)" : "var(--mint-a5)",
                      borderLeft: isSelected ? "3px solid var(--mint-11)" : "2px solid var(--mint-9)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isPlayheadInRally ? "0 0 20px rgba(122,219,143,0.6)" : "none",
                      zIndex: 5,
                    }}
                  />
                </Box>
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
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}

