"use client";

import { useState, useEffect, use, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Box, Card, Text, Flex } from "@radix-ui/themes";
import { useAuth } from "@/components/auth/AuthProvider";
import { Task, StatisticsResult, BallBounce } from "./types";
import { useVideoPlayback, useEventTooltip } from "./hooks";
import { PLAYER_CONFIG } from "./constants";
import {
  LoadingState,
  ErrorState,
  TaskHeader,
  VideoPlayer,
  RallyTimeline,
  MainTimeline,
  MatchInsights,
  PadelCourt2D,
  VideoCourtLayout,
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
  const [isVideoFullWidth, setIsVideoFullWidth] = useState(false);
  const [inferSwingBounces, setInferSwingBounces] = useState(true);
  const [inferTrajectoryBounces, setInferTrajectoryBounces] = useState(true);
  const [inferAudioBounces, setInferAudioBounces] = useState(false); // Disabled until CORS is configured
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});
  const [calibrationMatrix, setCalibrationMatrix] = useState<number[][] | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const rallyTimelineRef = useRef<HTMLDivElement>(null);

  // Portraits disabled due to CORS issues
  const portraits: Record<number, string> = {};

  // Get valid players with display info (filtered by minimum swings)
  const validPlayers = useMemo(() => {
    if (!result || !result.players) return [];
    return result.players
      .filter(p => p.swing_count >= PLAYER_CONFIG.MIN_SWINGS_THRESHOLD)
      .sort((a, b) => b.swing_count - a.swing_count)
      .map((player, index) => ({
        ...player,
        displayIndex: index + 1,
        displayName: playerNames[player.player_id] || `Player ${index + 1}`,
      }));
  }, [result, playerNames]);

  // Create player_id -> displayName mapping for overlays
  const playerDisplayNames = useMemo((): Record<number, string> => {
    const map: Record<number, string> = {};
    validPlayers.forEach(player => {
      map[player.player_id] = player.displayName;
    });
    return map;
  }, [validPlayers]);

  const currentTime = useVideoPlayback(videoRef);
  const activeEventTooltip = useEventTooltip(result, selectedRallyIndex, currentTime);

  // Flatten all swings from all players with player_id attached
  // Filter out swings not in a rally
  const allSwings = useMemo(() => {
    if (!result || !result.players) return [];
    return result.players.flatMap(player =>
      player.swings
        .filter(swing => swing.is_in_rally !== false) // Keep in-rally and undefined (backwards compat)
        .map(swing => ({
          ...swing,
          player_id: player.player_id,
        }))
    );
  }, [result]);

  // Enhanced ball bounces - infer swing bounces from velocity data
  const enhancedBallBounces = useMemo(() => {
    const originalBounces = result?.ball_bounces || [];
    const syntheticBounces: BallBounce[] = [];
    
    if (!result?.ball_positions) {
      return originalBounces;
    }
    
    // 1. Infer swing bounces (at hit time)
    if (inferSwingBounces) {
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
    }
    
    // 2. Infer bounces from ball trajectory (velocity change + angle detection)
    if (inferTrajectoryBounces) {
      const positions = result.ball_positions;
      const allBounceTimestamps = [...originalBounces, ...syntheticBounces].map(b => b.timestamp);
      
      const yVelocityThreshold = 0.5;
      const xVelocityThreshold = 0.3;
      const SHARP_ANGLE_THRESHOLD = 55; // degrees - anything sharper is likely a bounce
      
      // Helper to calculate angle between two vectors (in degrees)
      const angleBetweenVectors = (v1x: number, v1y: number, v2x: number, v2y: number): number => {
        const dot = v1x * v2x + v1y * v2y;
        const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
        const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
        if (mag1 === 0 || mag2 === 0) return 0;
        const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        return Math.acos(cosAngle) * (180 / Math.PI);
      };
      
      for (let i = 2; i < positions.length - 2; i++) {
        const prev1 = positions[i - 1];
        const curr = positions[i];
        const next1 = positions[i + 1];
        
        // Check if a bounce already exists near this time
        const nearExisting = allBounceTimestamps.some(
          t => Math.abs(t - curr.timestamp) < 0.2
        );
        if (nearExisting) continue;
        
        // Calculate direction vectors
        const incomingX = curr.X - prev1.X;
        const incomingY = curr.Y - prev1.Y;
        const outgoingX = next1.X - curr.X;
        const outgoingY = next1.Y - curr.Y;
        
        // Calculate angle change (0° = same direction, 180° = complete reversal)
        const angleChange = angleBetweenVectors(incomingX, incomingY, outgoingX, outgoingY);
        
        // Calculate Y velocities (positive Y = going down in video frame)
        const velYBefore = incomingY / (curr.timestamp - prev1.timestamp);
        const velYAfter = outgoingY / (next1.timestamp - curr.timestamp);
        
        // Calculate X velocities
        const velXBefore = incomingX / (curr.timestamp - prev1.timestamp);
        const velXAfter = outgoingX / (next1.timestamp - curr.timestamp);
        
        let bounceType: string | null = null;
        
        // Method 1: Velocity-based detection (original)
        // Floor bounce: Y going down → up (positive → negative)
        if (velYBefore > yVelocityThreshold && velYAfter < -yVelocityThreshold * 0.3) {
          if (curr.Y > 0.1 && curr.Y < 0.95) {
            bounceType = "inferred"; // Floor bounce
          }
        }
        // Back wall bounce: DISABLED - too many false positives
        // else if (velYBefore < -yVelocityThreshold && velYAfter > yVelocityThreshold * 0.3) {
        //   if (curr.Y < 0.3) { // Near top of frame = back wall
        //     bounceType = "inferred_back";
        //   }
        // }
        // Side wall bounce: X velocity reverses significantly
        else if (
          (velXBefore > xVelocityThreshold && velXAfter < -xVelocityThreshold * 0.5) ||
          (velXBefore < -xVelocityThreshold && velXAfter > xVelocityThreshold * 0.5)
        ) {
          // Check it's near the edges (side walls)
          if (curr.X < 0.15 || curr.X > 0.85) {
            bounceType = "inferred_wall";
          }
        }
        
        // Method 2: Sharp angle detection (catches bounces velocity-based might miss)
        if (!bounceType && angleChange > SHARP_ANGLE_THRESHOLD) {
          // Classify by position on screen
          // Back wall disabled - too many false positives
          // if (curr.Y < 0.25) {
          //   bounceType = "inferred_back";
          // } else
          if (curr.X < 0.15 || curr.X > 0.85) {
            // Near sides - side wall
            bounceType = "inferred_wall";
          } else if (curr.Y > 0.5) {
            // Lower half - floor bounce
            bounceType = "inferred";
          } else {
            // Middle area - could be any bounce, default to floor
            bounceType = "inferred";
          }
        }
        
        if (bounceType) {
          syntheticBounces.push({
            timestamp: curr.timestamp,
            court_pos: [curr.X, curr.Y],
            player_id: -1,
            type: bounceType,
          });
          
          allBounceTimestamps.push(curr.timestamp);
          i += 3; // Skip ahead to avoid duplicates
        }
      }
    }
    
    // 3. Post-process: If an inferred bounce leads to a bounce on the OTHER side
    // of the court, it must have been a swing (ball can't cross net without being hit)
    const allBounces = [...originalBounces, ...syntheticBounces];
    allBounces.sort((a, b) => a.timestamp - b.timestamp);
    
    // Court center line in video coordinates (roughly Y = 0.5 means middle of court)
    const COURT_CENTER_Y = 0.5;
    
    for (let i = 0; i < allBounces.length - 1; i++) {
      const curr = allBounces[i];
      const next = allBounces[i + 1];
      
      // Check inferred bounces (floor and wall bounces)
      if (curr.type !== "inferred" && curr.type !== "inferred_wall") continue;
      
      // Get Y positions (court_pos[1] for court coords, or use normalized video coords)
      const currY = curr.court_pos[1];
      const nextY = next.court_pos[1];
      
      // Check if they're on opposite sides of the court
      // If curr is on one half and next is on the other half, a swing happened
      const currSide = currY > COURT_CENTER_Y ? "near" : "far";
      const nextSide = nextY > COURT_CENTER_Y ? "near" : "far";
      
      if (currSide !== nextSide) {
        // Ball crossed to the other side - this must have been a swing, not just a bounce
        // Check if there's already a swing detected between these bounces
        const hasSwingBetween = allSwings.some(
          s => s.ball_hit.timestamp > curr.timestamp && s.ball_hit.timestamp < next.timestamp
        );
        
        if (!hasSwingBetween) {
          // No swing detected - reclassify this as an inferred swing
          curr.type = "inferred_swing";
        }
      }
    }
    
    return allBounces;
  }, [result, allSwings, inferSwingBounces, inferTrajectoryBounces]);

  // Auto-select rally when playhead enters it
  useEffect(() => {
    if (!result || !result.rallies) return;
    
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

        {/* Video + Court Layout */}
        <VideoCourtLayout
          isFullWidth={isVideoFullWidth}
          showCourt={task.sport === "padel"}
          videoPlayer={
            <VideoPlayer
              ref={videoRef}
              videoUrl={task.video_url}
              ballPositions={result?.ball_positions}
              ballBounces={enhancedBallBounces}
              swings={allSwings}
              isFullWidth={isVideoFullWidth}
              onFullWidthChange={setIsVideoFullWidth}
              inferSwingBounces={inferSwingBounces}
              onInferSwingBouncesChange={setInferSwingBounces}
              inferTrajectoryBounces={inferTrajectoryBounces}
              onInferTrajectoryBouncesChange={setInferTrajectoryBounces}
              inferAudioBounces={inferAudioBounces}
              onInferAudioBouncesChange={setInferAudioBounces}
              playerDisplayNames={playerDisplayNames}
              showCalibrationButton={task.sport === "padel"}
              isCalibrated={calibrationMatrix !== null}
              onCalibrationComplete={setCalibrationMatrix}
            />
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
            onClose={() => setSelectedRallyIndex(null)}
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
          playerDisplayNames={playerDisplayNames}
        />
      </Box>
    </Box>
  );
}
