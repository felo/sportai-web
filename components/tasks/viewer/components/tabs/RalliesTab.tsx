"use client";

import { RefObject, Ref } from "react";
import { Box, Flex } from "@radix-ui/themes";
import { Task, StatisticsResult, BallBounce, SwingWithPlayer } from "../../types";
import type { TimelineFilterState } from "../TimelineFilter";
// import { useVideoThumbnails } from "../../hooks";
import {
  VidstackPlayer,
  RallyTimeline,
  MainTimeline,
  PadelCourt2D,
  TennisCourt2D,
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
  onVideoError?: (message: string) => void;
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
  onVideoError,
}: RalliesTabProps) {
  // Video thumbnails for timeline preview (disabled - limited value, causes issues)
  // const { vttUrl: thumbnails } = useVideoThumbnails(task.video_url, {
  //   count: 60,
  //   width: 160,
  //   height: 90,
  // });

  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      {/* Timeline Filter */}
      {result && (
        <Flex justify="end" style={{ marginBottom: "var(--space-3)" }}>
          <TimelineFilter
            filters={timelineFilters}
            onFilterChange={onTimelineFiltersChange}
            hasRallies={result.rallies && result.rallies.length > 0}
            showCourtOptions={["padel", "tennis"].includes(task.sport)}
          />
        </Flex>
      )}

      {/* Video + Court Layout */}
      <VideoCourtLayout
        isFullWidth={isVideoFullWidth}
        showCourt={["padel", "tennis"].includes(task.sport)}
        videoPlayer={
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
            showCalibrationButton={false}
            isCalibrated={calibrationMatrix !== null}
            onCalibrationComplete={onCalibrationComplete}
            courtKeypoints={result?.debug_data?.court_keypoints}
            sport={task.sport}
            onVideoError={onVideoError}
            rallyBuffer={timelineFilters.rallyBuffer}
          />
        }
        courtComponent={
          task.sport === "tennis" ? (
            <TennisCourt2D
              currentTime={currentTime}
              ballBounces={enhancedBallBounces}
              rallies={result?.rallies}
              playerPositions={result?.player_positions}
              swings={allSwings}
              playerDisplayNames={playerDisplayNames}
              showBounces={true}
              showPlayers={true}
            />
          ) : (
            <PadelCourt2D
              currentTime={currentTime}
              ballBounces={enhancedBallBounces}
              rallies={result?.rallies}
              playerPositions={result?.player_positions}
              swings={allSwings}
              playerDisplayNames={playerDisplayNames}
              showBounces={true}
              showPlayers={true}
              showTeamZoneSync={timelineFilters.showTeamZoneSync}
            />
          )
        }
      />

      {result && selectedRallyIndex !== null && (
        <RallyTimeline
          result={result}
          selectedRallyIndex={selectedRallyIndex}
          currentTime={currentTime}
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

