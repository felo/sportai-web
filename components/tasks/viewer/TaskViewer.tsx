"use client";

import { useState, use, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Box, Card, Text } from "@radix-ui/themes";
import {
  PlayIcon,
  BarChartIcon,
  PersonIcon,
  StarIcon,
  TargetIcon,
  MixIcon,
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
import type { TimelineFilterState } from "./components";
import {
  LoadingState,
  ErrorState,
  TaskHeader,
  TabNavigation,
  RalliesTab,
  SummaryTab,
  PlayersTab,
  HighlightsTab,
  TacticalTab,
  TechniqueTab,
} from "./components";
import type { TabDefinition } from "./components";

interface TaskViewerProps {
  paramsPromise: Promise<{ taskId: string }>;
}

type TabId = "rallies" | "summary" | "players" | "highlights" | "tactical" | "technique";

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
  const [useVidstack, setUseVidstack] = useState(true);
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

  // Portraits disabled due to CORS issues
  const portraits: Record<number, string> = {};

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
      id: "highlights", 
      label: "Highlights", 
      icon: <StarIcon width={16} height={16} />, 
      badge: result?.highlights?.length || undefined 
    },
    { id: "tactical", label: "Tactical", icon: <TargetIcon width={16} height={16} /> },
    { id: "technique", label: "Technique", icon: <MixIcon width={16} height={16} />, disabled: true },
  ], [validPlayers.length, result?.highlights?.length]);

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
        {activeTab === "rallies" && (
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
            useVidstack={useVidstack}
            onUseVidstackChange={setUseVidstack}
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
        )}

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
