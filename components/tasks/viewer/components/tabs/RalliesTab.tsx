"use client";

import { RefObject, Ref } from "react";
import { Box, Flex, Button } from "@radix-ui/themes";
import { Task, StatisticsResult, BallBounce, SwingWithPlayer, ActiveEventTooltip } from "../../types";
import type { TimelineFilterState } from "../TimelineFilter";
import {
  VideoPlayer,
  VidstackPlayer,
  RallyTimeline,
  MainTimeline,
  PadelCourt2D,
  VideoCourtLayout,
  TimelineFilter,
} from "../index";

interface RalliesTabProps {
  task: Task;
  result: StatisticsResult | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  rallyTimelineRef: RefObject<HTMLDivElement | null>;
  currentTime: number;
  selectedRallyIndex: number | null;
  onRallySelect: (index: number | null) => void;
  isVideoFullWidth: boolean;
  onVideoFullWidthChange: (value: boolean) => void;
  useVidstack: boolean;
  onUseVidstackChange: (value: boolean) => void;
  timelineFilters: TimelineFilterState;
  onTimelineFiltersChange: (filters: TimelineFilterState) => void;
  inferSwingBounces: boolean;
  onInferSwingBouncesChange: (value: boolean) => void;
  inferTrajectoryBounces: boolean;
  onInferTrajectoryBouncesChange: (value: boolean) => void;
  inferAudioBounces: boolean;
  onInferAudioBouncesChange: (value: boolean) => void;
  calibrationMatrix: number[][] | null;
  onCalibrationComplete: (matrix: number[][] | null) => void;
  playerDisplayNames: Record<number, string>;
  enhancedBallBounces: BallBounce[];
  allSwings: SwingWithPlayer[];
  activeEventTooltip: ActiveEventTooltip | null;
}

export function RalliesTab({
  task,
  result,
  videoRef,
  rallyTimelineRef,
  currentTime,
  selectedRallyIndex,
  onRallySelect,
  isVideoFullWidth,
  onVideoFullWidthChange,
  useVidstack,
  onUseVidstackChange,
  timelineFilters,
  onTimelineFiltersChange,
  inferSwingBounces,
  onInferSwingBouncesChange,
  inferTrajectoryBounces,
  onInferTrajectoryBouncesChange,
  inferAudioBounces,
  onInferAudioBouncesChange,
  calibrationMatrix,
  onCalibrationComplete,
  playerDisplayNames,
  enhancedBallBounces,
  allSwings,
  activeEventTooltip,
}: RalliesTabProps) {
  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      {/* Player Toggle & Timeline Filters */}
      <Flex gap="2" align="center" justify="between" style={{ marginBottom: "var(--space-3)" }}>
        <Flex gap="2" align="center">
          <Button
            size="1"
            variant={useVidstack ? "solid" : "soft"}
            onClick={() => onUseVidstackChange(true)}
          >
            Vidstack Player
          </Button>
          <Button
            size="1"
            variant={useVidstack ? "soft" : "outline"}
            color="gray"
            onClick={() => onUseVidstackChange(false)}
          >
            Legacy Player
          </Button>
        </Flex>
        
        {/* Timeline Filter */}
        {result && (
          <TimelineFilter
            filters={timelineFilters}
            onFilterChange={onTimelineFiltersChange}
            hasRallies={result.rallies && result.rallies.length > 0}
          />
        )}
      </Flex>

      {/* Video + Court Layout */}
      <VideoCourtLayout
        isFullWidth={isVideoFullWidth}
        showCourt={task.sport === "padel"}
        videoPlayer={
          useVidstack ? (
            <VidstackPlayer
              ref={videoRef as Ref<HTMLVideoElement>}
              videoUrl={task.video_url}
              ballPositions={result?.ball_positions}
              ballBounces={enhancedBallBounces}
              swings={allSwings}
              rallies={result?.rallies}
              isFullWidth={isVideoFullWidth}
              onFullWidthChange={onVideoFullWidthChange}
              inferSwingBounces={inferSwingBounces}
              onInferSwingBouncesChange={onInferSwingBouncesChange}
              inferTrajectoryBounces={inferTrajectoryBounces}
              onInferTrajectoryBouncesChange={onInferTrajectoryBouncesChange}
              inferAudioBounces={inferAudioBounces}
              onInferAudioBouncesChange={onInferAudioBouncesChange}
              playerDisplayNames={playerDisplayNames}
              showCalibrationButton={task.sport === "padel"}
              isCalibrated={calibrationMatrix !== null}
              onCalibrationComplete={onCalibrationComplete}
            />
          ) : (
            <VideoPlayer
              ref={videoRef as Ref<HTMLVideoElement>}
              videoUrl={task.video_url}
              ballPositions={result?.ball_positions}
              ballBounces={enhancedBallBounces}
              swings={allSwings}
              isFullWidth={isVideoFullWidth}
              onFullWidthChange={onVideoFullWidthChange}
              inferSwingBounces={inferSwingBounces}
              onInferSwingBouncesChange={onInferSwingBouncesChange}
              inferTrajectoryBounces={inferTrajectoryBounces}
              onInferTrajectoryBouncesChange={onInferTrajectoryBouncesChange}
              inferAudioBounces={inferAudioBounces}
              onInferAudioBouncesChange={onInferAudioBouncesChange}
              playerDisplayNames={playerDisplayNames}
              showCalibrationButton={task.sport === "padel"}
              isCalibrated={calibrationMatrix !== null}
              onCalibrationComplete={onCalibrationComplete}
            />
          )
        }
        courtComponent={
          <PadelCourt2D
            currentTime={currentTime}
            ballBounces={enhancedBallBounces}
            rallies={result?.rallies}
            playerPositions={result?.player_positions}
            swings={allSwings}
            playerDisplayNames={playerDisplayNames}
            calibrationMatrix={calibrationMatrix}
            showBounces={true}
            showPlayers={true}
          />
        }
      />

      {result && selectedRallyIndex !== null && (
        <RallyTimeline
          result={result}
          selectedRallyIndex={selectedRallyIndex}
          currentTime={currentTime}
          activeEventTooltip={activeEventTooltip}
          videoRef={videoRef}
          rallyTimelineRef={rallyTimelineRef}
          onClose={() => onRallySelect(null)}
          enhancedBallBounces={enhancedBallBounces}
          playerDisplayNames={playerDisplayNames}
        />
      )}

      {result && (
        <MainTimeline
          result={result}
          task={task}
          currentTime={currentTime}
          selectedRallyIndex={selectedRallyIndex}
          videoRef={videoRef}
          onRallySelect={onRallySelect}
          enhancedBallBounces={enhancedBallBounces}
          showOnlyRallies={timelineFilters.showOnlyRallies}
          rallyBuffer={timelineFilters.rallyBuffer}
        />
      )}
    </Box>
  );
}

