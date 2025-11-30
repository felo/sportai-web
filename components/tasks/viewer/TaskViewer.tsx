"use client";

import { useState, use, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Card, Text } from "@radix-ui/themes";
import {
  PlayIcon,
  BarChartIcon,
  PersonIcon,
  StarIcon,
  TargetIcon,
  MixIcon,
  GroupIcon,
} from "@radix-ui/react-icons";
import { useAuth } from "@/components/auth/AuthProvider";
import { useVideoPlayback, useEventTooltip } from "./hooks";
import {
  useTaskFetching,
  usePlayerRankings,
  useEnhancedBounces,
  useAllSwings,
  useRallySelection,
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
  TechniqueTab,
} from "./components";
import type { TabDefinition } from "./components";

interface TaskViewerProps {
  paramsPromise: Promise<{ taskId: string }>;
}

type TabId = "rallies" | "summary" | "players" | "teams" | "highlights" | "tactical" | "technique";

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
  } = useTaskFetching(params.taskId);

  // UI State
  const [selectedRallyIndex, setSelectedRallyIndex] = useState<number | null>(null);
  const [isVideoFullWidth, setIsVideoFullWidth] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("rallies");
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});
  const [calibrationMatrix, setCalibrationMatrix] = useState<number[][] | null>(null);
  
  // Bounce inference toggles
  const [inferSwingBounces, setInferSwingBounces] = useState(true);
  const [inferTrajectoryBounces, setInferTrajectoryBounces] = useState(true);
  const [inferAudioBounces, setInferAudioBounces] = useState(false);
  
  // Timeline filters
  const [timelineFilters, setTimelineFilters] = useState<TimelineFilterState>({
    showOnlyRallies: true,
    rallyBuffer: 1,
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

  // Rally selection with auto-skip
  const { selectedRallyIndex: autoSelectedRallyIndex, setSelectedRallyIndex: setAutoSelectedRallyIndex } = useRallySelection({
    result,
    currentTime,
    timelineFilters,
    videoRef,
  });

  // Use the auto-selected rally index if local state is null
  const effectiveSelectedRallyIndex = selectedRallyIndex ?? autoSelectedRallyIndex;
  const handleRallySelect = (index: number | null) => {
    setSelectedRallyIndex(index);
    setAutoSelectedRallyIndex(index);
  };

  // Event tooltip for rally timeline
  const activeEventTooltip = useEventTooltip(result, effectiveSelectedRallyIndex, currentTime);

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

  // Calculate team count from team_sessions (only count teams with 2 players)
  const teamCount = useMemo(() => {
    const teamSessions = result?.team_sessions || [];
    const uniqueTeams = new Set<string>();
    teamSessions.forEach(session => {
      if (session.team_front?.length === 2) {
        uniqueTeams.add(JSON.stringify([...session.team_front].sort((a, b) => a - b)));
      }
      if (session.team_back?.length === 2) {
        uniqueTeams.add(JSON.stringify([...session.team_back].sort((a, b) => a - b)));
      }
    });
    return uniqueTeams.size;
  }, [result?.team_sessions]);

  // Tab definitions
  const tabs: TabDefinition[] = useMemo(() => [
    { id: "rallies", label: "Rallies", icon: <PlayIcon width={16} height={16} /> },
    { id: "summary", label: "Match Summary", icon: <BarChartIcon width={16} height={16} /> },
    { 
      id: "players", 
      label: "Player Stats", 
      icon: <PersonIcon width={16} height={16} />, 
      badge: validPlayers.length > 0 ? validPlayers.length : undefined 
    },
    { 
      id: "teams", 
      label: "Team Stats", 
      icon: <GroupIcon width={16} height={16} />, 
      badge: teamCount > 0 ? teamCount : undefined 
    },
    { 
      id: "highlights", 
      label: "Highlights", 
      icon: <StarIcon width={16} height={16} />, 
      badge: result?.highlights?.length || undefined 
    },
    { id: "tactical", label: "Tactical", icon: <TargetIcon width={16} height={16} /> },
    { id: "technique", label: "Technique", icon: <MixIcon width={16} height={16} />, disabled: true },
  ], [validPlayers.length, teamCount, result?.highlights?.length]);

  // Pause video when switching away from rallies tab
  useEffect(() => {
    if (activeTab !== "rallies" && videoRef.current) {
      videoRef.current.pause();
    }
  }, [activeTab]);

  // Loading state
  if (authLoading || loading) {
    return <LoadingState />;
  }

  // Auth redirect
  if (!user) {
    router.push("/");
    return null;
  }

  // Error state (no task)
  if (error && !task) {
    return <ErrorState error={error} onBack={() => router.push("/tasks")} />;
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
      <Box style={{ padding: "var(--space-4)", paddingBottom: 0 }}>
        <Box style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <TaskHeader
            task={task}
            result={result}
            loadingResult={loadingResult}
            onBack={() => router.push("/tasks")}
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
            calibrationMatrix={calibrationMatrix}
            onCalibrationComplete={setCalibrationMatrix}
            playerDisplayNames={playerDisplayNames}
            enhancedBallBounces={enhancedBallBounces}
            allSwings={allSwings}
            activeEventTooltip={activeEventTooltip}
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
          />
        )}

        {activeTab === "highlights" && (
          <HighlightsTab
            highlights={result?.highlights}
            videoRef={videoRef}
          />
        )}

        {activeTab === "tactical" && (
          <TacticalTab
            result={result}
            enhancedBallBounces={enhancedBallBounces}
            playerDisplayNames={playerDisplayNames}
          />
        )}

        {activeTab === "technique" && (
          <TechniqueTab />
        )}
      </Box>
    </Box>
  );
}
