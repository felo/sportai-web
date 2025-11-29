"use client";

import { useState, useEffect, use, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Box, Card, Text } from "@radix-ui/themes";
import { useAuth } from "@/components/auth/AuthProvider";
import { CONFIG } from "./constants";
import { Task, StatisticsResult, BallBounce } from "./types";
import { useVideoPlayback, useEventTooltip } from "./hooks";
import {
  LoadingState,
  ErrorState,
  TaskHeader,
  VideoPlayer,
  RallyTimeline,
  MainTimeline,
  MatchInsights,
} from "./components";

interface TaskViewerProps {
  paramsPromise: Promise<{ taskId: string }>;
}

export function TaskViewer({ paramsPromise }: TaskViewerProps) {
  const params = use(paramsPromise);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [task, setTask] = useState<Task | null>(null);
  const [result, setResult] = useState<StatisticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingResult, setLoadingResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRallyIndex, setSelectedRallyIndex] = useState<number | null>(null);
  const [videoWidth, setVideoWidth] = useState(CONFIG.VIDEO_DEFAULT_WIDTH);
  const [isVideoFullWidth, setIsVideoFullWidth] = useState(false);
  const [inferSwingBounces, setInferSwingBounces] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const rallyTimelineRef = useRef<HTMLDivElement>(null);

  // Portraits disabled due to CORS issues
  const portraits: Record<number, string> = {};

  const currentTime = useVideoPlayback(videoRef);
  const activeEventTooltip = useEventTooltip(result, selectedRallyIndex, currentTime);

  // Flatten all swings from all players with player_id attached
  const allSwings = useMemo(() => {
    if (!result) return [];
    return result.players.flatMap(player =>
      player.swings.map(swing => ({
        ...swing,
        player_id: player.player_id,
      }))
    );
  }, [result]);

  // Enhanced ball bounces - infer swing bounces from velocity data
  const enhancedBallBounces = useMemo(() => {
    const originalBounces = result?.ball_bounces || [];
    
    if (!inferSwingBounces || !result?.ball_positions) {
      return originalBounces;
    }
    
    const syntheticBounces: BallBounce[] = [];
    
    for (const swing of allSwings) {
      // Only for swings with velocity data
      if (!swing.ball_speed || swing.ball_speed <= 0) continue;
      
      const hitTime = swing.ball_hit.timestamp;
      
      // Check if bounce already exists at this time
      const existingBounce = originalBounces.find(
        b => Math.abs(b.timestamp - hitTime) < 0.15 && b.type === "swing"
      );
      if (existingBounce) continue;
      
      // Find ball position at hit time
      let closestPos = result.ball_positions[0];
      let closestDiff = Math.abs(result.ball_positions[0]?.timestamp - hitTime);
      
      for (const pos of result.ball_positions) {
        const diff = Math.abs(pos.timestamp - hitTime);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestPos = pos;
        }
        if (pos.timestamp > hitTime + 0.2) break;
      }
      
      if (closestPos && closestDiff < 0.15) {
        syntheticBounces.push({
          timestamp: hitTime,
          court_pos: [closestPos.X, closestPos.Y],
          player_id: swing.player_id,
          type: "swing",
        });
      }
    }
    
    return [...originalBounces, ...syntheticBounces];
  }, [result, allSwings, inferSwingBounces]);

  // Auto-select rally when playhead enters it
  useEffect(() => {
    if (!result) return;
    
    // Find which rally the playhead is currently in
    const currentRallyIndex = result.rallies.findIndex(
      ([start, end]) => currentTime >= start && currentTime <= end
    );
    
    if (currentRallyIndex !== -1) {
      // Playhead is inside a rally - select it if not already selected
      if (selectedRallyIndex !== currentRallyIndex) {
        setSelectedRallyIndex(currentRallyIndex);
      }
    }
    // Note: We don't auto-deselect when leaving a rally, user can close manually
  }, [currentTime, result, selectedRallyIndex]);

  // Fetch task details
  useEffect(() => {
    if (!user || authLoading) return;
    
    const fetchTask = async () => {
      try {
        const response = await fetch(`/api/tasks`, {
          headers: { Authorization: `Bearer ${user.id}` },
        });
        
        if (!response.ok) throw new Error("Failed to fetch tasks");
        
        const data = await response.json();
        const foundTask = data.tasks?.find((t: Task) => t.id === params.taskId);
        
        if (!foundTask) {
          throw new Error("Task not found");
        }
        
        setTask(foundTask);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load task");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTask();
  }, [user, authLoading, params.taskId]);

  // Fetch result data
  const fetchResult = async () => {
    if (!user || !task) return;
    
    setLoadingResult(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/tasks/${task.id}/result`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.id}` },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch result");
      }
      
      const { url } = await response.json();
      
      const resultResponse = await fetch(url);
      if (!resultResponse.ok) throw new Error("Failed to download result");
      
      const resultData = await resultResponse.json();
      setResult(resultData);
      
      setTask(prev =>
        prev ? { ...prev, result_s3_key: `task-results/${task.id}.json` } : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch result");
    } finally {
      setLoadingResult(false);
    }
  };
  
  // Auto-load result when task is completed
  useEffect(() => {
    if (task && task.status === "completed" && !result && !loadingResult) {
      fetchResult();
    }
  }, [task]);

  if (authLoading || loading) {
    return <LoadingState />;
  }

  if (!user) {
    router.push("/");
    return null;
  }

  if (error && !task) {
    return <ErrorState error={error} onBack={() => router.push("/tasks")} />;
  }

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
      padding: "var(--space-4)",
      overflowY: "auto",
      }}
    >
      <Box style={{ maxWidth: "1400px", margin: "0 auto", paddingBottom: "var(--space-6)" }}>
        <TaskHeader
          task={task}
          result={result}
          loadingResult={loadingResult}
          onBack={() => router.push("/tasks")}
          onLoadResult={fetchResult}
        />

        {error && (
          <Card style={{ marginBottom: "var(--space-4)", backgroundColor: "var(--red-3)" }}>
            <Text color="red">{error}</Text>
          </Card>
        )}

        <VideoPlayer
          ref={videoRef}
          videoUrl={task.video_url}
          videoWidth={isVideoFullWidth ? CONFIG.VIDEO_MAX_WIDTH : videoWidth}
          onWidthChange={setVideoWidth}
          ballPositions={result?.ball_positions}
          ballBounces={enhancedBallBounces}
          swings={allSwings}
          isFullWidth={isVideoFullWidth}
          onFullWidthChange={setIsVideoFullWidth}
          inferSwingBounces={inferSwingBounces}
          onInferSwingBouncesChange={setInferSwingBounces}
        />

        {result && selectedRallyIndex !== null && (
          <RallyTimeline
            result={result}
            selectedRallyIndex={selectedRallyIndex}
            currentTime={currentTime}
            activeEventTooltip={activeEventTooltip}
            videoRef={videoRef}
            rallyTimelineRef={rallyTimelineRef}
            onClose={() => setSelectedRallyIndex(null)}
            enhancedBallBounces={enhancedBallBounces}
          />
        )}

        {result && (
          <MainTimeline
            result={result}
            task={task}
            currentTime={currentTime}
            selectedRallyIndex={selectedRallyIndex}
            videoRef={videoRef}
            onRallySelect={setSelectedRallyIndex}
            enhancedBallBounces={enhancedBallBounces}
          />
        )}

        <MatchInsights
          result={result}
          task={task}
          videoRef={videoRef}
          portraits={portraits}
          enhancedBallBounces={enhancedBallBounces}
        />
      </Box>
    </Box>
  );
}
