"use client";

import { useState, use, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Card, Text, Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import {
  PlayIcon,
  BarChartIcon,
  PersonIcon,
  StarIcon,
  TargetIcon,
  MixIcon,
  ActivityLogIcon,
  ChatBubbleIcon,
} from "@radix-ui/react-icons";

// Custom two-person team icon matching Radix style
const TeamIcon = ({ width = 16, height = 16 }: { width?: number; height?: number }) => (
  <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M5.5 3C4.67157 3 4 3.67157 4 4.5C4 5.32843 4.67157 6 5.5 6C6.32843 6 7 5.32843 7 4.5C7 3.67157 6.32843 3 5.5 3ZM9.5 3C8.67157 3 8 3.67157 8 4.5C8 5.32843 8.67157 6 9.5 6C10.3284 6 11 5.32843 11 4.5C11 3.67157 10.3284 3 9.5 3ZM3 10C3 8.34315 4.34315 7 6 7H6.5C7.16667 7 7.75 7.25 8.25 7.5C8.75 7.25 9.33333 7 10 7H10.5C12.1569 7 13 8.34315 13 10V11.5C13 11.7761 12.7761 12 12.5 12H2.5C2.22386 12 2 11.7761 2 11.5V10C2 9.5 2.5 9 3 10Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);
import { useAuth } from "@/components/auth/AuthProvider";
import { isSampleTask } from "@/components/tasks/sampleTasks";
import { isGuestTask } from "@/utils/storage";
import { useVideoPlayback } from "./hooks";
import {
  useTaskFetching,
  usePlayerRankings,
  useEnhancedBounces,
  useAllSwings,
  useRallySelection,
  useFilteredBallPositions,
} from "./hooks";
import { usePlayerPortraits } from "./usePlayerPortraits";
import type { TimelineFilterState } from "./components";
import {
  LoadingState,
  ErrorState,
  TaskHeader,
  TabNavigation,
  RalliesTab,
  SummaryTab,
  PlayersTab,
  TeamsTab,
  HighlightsTab,
  TacticalTab,
  ProfilesTab,
  TechniqueTab,
  CoachingTab,
} from "./components";
import type { TabDefinition } from "./components";

interface TaskViewerProps {
  paramsPromise: Promise<{ taskId: string }>;
}

type TabId = "rallies" | "summary" | "players" | "teams" | "highlights" | "tactical" | "profiles" | "coaching" | "technique";

export function TaskViewer({ paramsPromise }: TaskViewerProps) {
  const params = use(paramsPromise);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const rallyTimelineRef = useRef<HTMLDivElement>(null);

  // Task and result fetching
  const {
    task,
    result,
    loading,
    loadingResult,
    error,
    setError,
    fetchResult,
    loadingPhase,
  } = useTaskFetching(params.taskId);

  // UI State
  const [selectedRallyIndex, setSelectedRallyIndex] = useState<number | null>(null);
  const [isVideoFullWidth, setIsVideoFullWidth] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("rallies");
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});
  const [calibrationMatrix, setCalibrationMatrix] = useState<number[][] | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  
  // Bounce inference toggles
  const [inferSwingBounces, setInferSwingBounces] = useState(true);
  const [inferTrajectoryBounces, setInferTrajectoryBounces] = useState(true);
  const [inferAudioBounces, setInferAudioBounces] = useState(false);
  const [filterBallPositions, setFilterBallPositions] = useState(false);
  
  // Timeline filters
  const [timelineFilters, setTimelineFilters] = useState<TimelineFilterState>({
    showOnlyRallies: true,
    rallyBuffer: 1,
    showTeamZoneSync: true, // Team zone sync enabled by default
  });

  // Extract player portraits from video frames using a hidden video element
  const { portraits } = usePlayerPortraits(
    result?.thumbnail_crops,
    task?.video_url
  );

  // Video playback tracking
  const currentTime = useVideoPlayback(videoRef);

  // Player rankings and display info
  const rankings = usePlayerRankings(result, playerNames);
  const { validPlayers, playerDisplayNames } = rankings;

  // All swings flattened with player_id attached
  const allSwings = useAllSwings(result);

  // Enhanced bounces with inference
  const enhancedBallBounces = useEnhancedBounces(result, allSwings, {
    inferSwingBounces,
    inferTrajectoryBounces,
  });

  // Filter ball positions to remove teleportation artifacts, interpolate gaps, and smooth trajectory
  // Always compute filtered positions so we can compare both
  const { filteredPositions: filteredBallPositions, stats: ballFilterStats } = useFilteredBallPositions(
    result?.ball_positions,
    {
      removeOutliers: true,
      maxVelocity: 2.0, // Normalized units per second - tune if needed
      interpolateGaps: true,
      maxGapDuration: 0.5,
      smoothTrajectory: true,
      smoothingWindow: 3,
      fps: result?.debug_data?.video_info?.fps ?? 30,
    }
  );

  // Log filter stats for debugging (only when data changes)
  useEffect(() => {
    if (ballFilterStats.originalCount > 0 && ballFilterStats.removedOutliers > 0) {
      console.log(
        `[Ball Filter] Original: ${ballFilterStats.originalCount}, ` +
        `Removed outliers: ${ballFilterStats.removedOutliers}, ` +
        `Interpolated: ${ballFilterStats.interpolatedPoints}, ` +
        `Final: ${ballFilterStats.finalCount}`
      );
    }
  }, [ballFilterStats]);

  // Rally selection with auto-skip
  const { selectedRallyIndex: autoSelectedRallyIndex, setSelectedRallyIndex: setAutoSelectedRallyIndex } = useRallySelection({
    result,
    currentTime,
    timelineFilters,
    videoRef,
  });

  // Sync local state with auto-selected rally (so auto-selection works during playback)
  useEffect(() => {
    if (autoSelectedRallyIndex !== null && autoSelectedRallyIndex !== selectedRallyIndex) {
      setSelectedRallyIndex(autoSelectedRallyIndex);
    }
  }, [autoSelectedRallyIndex]);

  // Use the auto-selected rally index if local state is null
  const effectiveSelectedRallyIndex = selectedRallyIndex ?? autoSelectedRallyIndex;
  const handleRallySelect = (index: number | null) => {
    setSelectedRallyIndex(index);
    setAutoSelectedRallyIndex(index);
  };

  // Event tooltip for rally timeline
  // Calculate total video duration
  const totalDuration = useMemo(() => {
    const rallies = result?.rallies || [];
    const bounces = enhancedBallBounces || [];
    const lastRally = rallies[rallies.length - 1];
    const lastBounce = bounces[bounces.length - 1];
    
    return Math.max(
      task?.video_length || 0,
      lastRally ? lastRally[1] : 0,
      lastBounce ? lastBounce.timestamp : 0
    ) || 300;
  }, [task?.video_length, result?.rallies, enhancedBallBounces]);

  // Calculate minimum team swing count to determine if Teams tab should be shown
  const minTeamSwings = useMemo(() => {
    const sessions = result?.team_sessions || [];
    if (sessions.length === 0) return 0;
    
    // Aggregate swing counts per team (same logic as TeamsTab)
    const teamSwings = new Map<string, number>();
    
    sessions.forEach(session => {
      [session.team_front, session.team_back].forEach(ids => {
        if (!ids || ids.length !== 2) return;
        const teamKey = [...ids].sort((a, b) => a - b).join("-");
        
        const swingsInSession = ids.reduce((sum, playerId) => {
          const playerData = session.players.find(p => p.player_id === playerId);
          return sum + (playerData?.swing_count || 0);
        }, 0);
        
        teamSwings.set(teamKey, (teamSwings.get(teamKey) || 0) + swingsInSession);
      });
    });
    
    if (teamSwings.size === 0) return 0;
    return Math.min(...teamSwings.values());
  }, [result?.team_sessions]);

  // Tab definitions - hide Team Stats tab when only 2 players or any team has < 20 swings
  const tabs: TabDefinition[] = useMemo(() => {
    const allTabs: TabDefinition[] = [
      { id: "rallies", label: "Rallies", icon: <PlayIcon width={16} height={16} /> },
      { id: "summary", label: "Match Summary", icon: <BarChartIcon width={16} height={16} /> },
      { id: "profiles", label: "Player Profiles", icon: <ActivityLogIcon width={16} height={16} /> },
      { id: "players", label: "Player Stats", icon: <PersonIcon width={16} height={16} /> },
      { id: "teams", label: "Team Stats", icon: <TeamIcon width={16} height={16} /> },
      { id: "highlights", label: "Highlights", icon: <StarIcon width={16} height={16} /> },
      { id: "tactical", label: "Tactical", icon: <TargetIcon width={16} height={16} /> },
      { id: "coaching", label: "Coaching", icon: <ChatBubbleIcon width={16} height={16} />, disabled: true },
      { id: "technique", label: "Technique", icon: <MixIcon width={16} height={16} />, disabled: true },
    ];
    
    // Hide Team Stats tab for singles matches (2 or fewer players) or if any team has < 20 swings
    if (validPlayers.length <= 2 || minTeamSwings < 20) {
      return allTabs.filter(tab => tab.id !== "teams");
    }
    
    return allTabs;
  }, [validPlayers.length, minTeamSwings]);

  // Pause video when switching away from rallies tab
  useEffect(() => {
    if (activeTab !== "rallies" && videoRef.current) {
      videoRef.current.pause();
    }
  }, [activeTab]);

  // Loading state
  if (authLoading || loading) {
    return <LoadingState phase={loadingPhase} />;
  }

  // Auth redirect (except for sample and guest tasks)
  if (!user && !isSampleTask(params.taskId) && !isGuestTask(params.taskId)) {
    router.push("/");
    return null;
  }

  // Error state (no task)
  if (error && !task) {
    return <ErrorState error={error} onBack={() => router.push("/library")} />;
  }

  // No task found
  if (!task) return null;

  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "var(--gray-1)",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <Box 
        style={{ 
          height: "57px",
          borderBottom: "1px solid var(--gray-6)",
          display: "flex",
          alignItems: "center",
          padding: "0 var(--space-4)",
        }}
      >
        <Box style={{ maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
          <TaskHeader
            task={task}
            result={result}
            loadingResult={loadingResult}
            onBack={() => router.push("/library")}
            onLoadResult={fetchResult}
          />
        </Box>
      </Box>

      {/* Tab Navigation */}
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabId)}
      />

      {/* Error display */}
      {error && (
        <Box style={{ padding: "var(--space-4)", maxWidth: "1400px", margin: "0 auto" }}>
          <Card style={{ backgroundColor: "var(--red-3)" }}>
            <Text color="red">{error}</Text>
          </Card>
        </Box>
      )}
      
      {/* Video loading error - mild warning */}
      {videoError && (
        <Box style={{ padding: "var(--space-4)", paddingBottom: 0, maxWidth: "1400px", margin: "0 auto" }}>
          <Callout.Root color="orange" size="1">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{videoError}</Callout.Text>
          </Callout.Root>
        </Box>
      )}

      {/* Tab Content */}
      <Box style={{ padding: "var(--space-4)", maxWidth: "1400px", margin: "0 auto", paddingBottom: "var(--space-6)" }}>
        {/* RalliesTab is always mounted but hidden when not active to preserve video state */}
        <Box style={{ display: activeTab === "rallies" ? "block" : "none" }}>
          <RalliesTab
            task={task}
            result={result}
            videoRef={videoRef}
            rallyTimelineRef={rallyTimelineRef}
            currentTime={currentTime}
            selectedRallyIndex={effectiveSelectedRallyIndex}
            onRallySelect={handleRallySelect}
            isVideoFullWidth={isVideoFullWidth}
            onVideoFullWidthChange={setIsVideoFullWidth}
            timelineFilters={timelineFilters}
            onTimelineFiltersChange={setTimelineFilters}
            inferSwingBounces={inferSwingBounces}
            onInferSwingBouncesChange={setInferSwingBounces}
            inferTrajectoryBounces={inferTrajectoryBounces}
            onInferTrajectoryBouncesChange={setInferTrajectoryBounces}
            inferAudioBounces={inferAudioBounces}
            onInferAudioBouncesChange={setInferAudioBounces}
            filterBallPositions={filterBallPositions}
            onFilterBallPositionsChange={setFilterBallPositions}
            calibrationMatrix={calibrationMatrix}
            onCalibrationComplete={setCalibrationMatrix}
            playerDisplayNames={playerDisplayNames}
            enhancedBallBounces={enhancedBallBounces}
            allSwings={allSwings}
            onVideoError={setVideoError}
            filteredBallPositions={filteredBallPositions}
          />
        </Box>

        {activeTab === "summary" && (
          <SummaryTab
            task={task}
            result={result}
            enhancedBallBounces={enhancedBallBounces}
          />
        )}

        {activeTab === "players" && (
          <PlayersTab
            rankings={rankings}
            portraits={portraits}
          />
        )}

        {activeTab === "teams" && (
          <TeamsTab
            result={result}
            portraits={portraits}
            playerDisplayNames={playerDisplayNames}
            rankings={rankings}
          />
        )}

        {activeTab === "highlights" && (
          <HighlightsTab
            result={result}
            videoRef={videoRef}
            videoUrl={task?.video_url}
            portraits={portraits}
            playerDisplayNames={playerDisplayNames}
          />
        )}

        {activeTab === "tactical" && (
          <TacticalTab
            result={result}
            enhancedBallBounces={enhancedBallBounces}
            playerDisplayNames={playerDisplayNames}
            portraits={portraits}
            sport={task?.sport === "all" ? "padel" : task?.sport}
          />
        )}

        {activeTab === "profiles" && (
          <ProfilesTab
            result={result}
            rankings={rankings}
            portraits={portraits}
            playerDisplayNames={playerDisplayNames}
            sport={task?.sport === "all" ? "padel" : task?.sport}
          />
        )}

        {activeTab === "coaching" && (
          <CoachingTab
            result={result}
            rankings={rankings}
            playerDisplayNames={playerDisplayNames}
            sport={task?.sport}
          />
        )}

        {activeTab === "technique" && (
          <TechniqueTab />
        )}
      </Box>
    </Box>
  );
}
