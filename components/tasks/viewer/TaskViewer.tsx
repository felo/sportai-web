"use client";

import { useState, useEffect, use, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Box, Card, Text, Flex, Button, Badge, Grid, Heading } from "@radix-ui/themes";
import {
  PlayIcon,
  BarChartIcon,
  PersonIcon,
  StarIcon,
  TargetIcon,
  MixIcon,
} from "@radix-ui/react-icons";
import { useAuth } from "@/components/auth/AuthProvider";
import { Task, StatisticsResult, BallBounce } from "./types";
import { useVideoPlayback, useEventTooltip } from "./hooks";
import { PLAYER_CONFIG } from "./constants";
import {
  LoadingState,
  ErrorState,
  TaskHeader,
  VideoPlayer,
  VidstackPlayer,
  RallyTimeline,
  MainTimeline,
  PadelCourt2D,
  VideoCourtLayout,
  MatchSummaryCard,
  ConfidenceCard,
  PlayerCard,
  HighlightsCard,
  BounceHeatmap,
  TaskStatusCard,
  TimelineFilter,
} from "./components";
import type { TimelineFilterState } from "./components";

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
  // Toggle between Vidstack (default) and legacy VideoPlayer
  const [useVidstack, setUseVidstack] = useState(true);
  // Timeline filters
  const [timelineFilters, setTimelineFilters] = useState<TimelineFilterState>({
    showOnlyRallies: true, // Default to showing only rallies
    rallyBuffer: 1, // Default 1 second before rally start
  });
  // Top-level navigation tabs
  const [activeTab, setActiveTab] = useState<"rallies" | "summary" | "players" | "highlights" | "tactical" | "technique">("rallies");
  
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

  // Calculate max distance covered among all valid players (for relative visualization)
  const maxDistanceCovered = useMemo(() => {
    if (validPlayers.length === 0) return 0;
    return Math.max(...validPlayers.map(p => p.covered_distance));
  }, [validPlayers]);

  // Calculate distance rankings (1st, 2nd, 3rd) for each player
  const distanceRankings = useMemo((): Record<number, number> => {
    if (validPlayers.length === 0) return {};
    
    const playerDistances = validPlayers.map(p => ({
      playerId: p.player_id,
      distance: p.covered_distance || 0
    })).filter(p => p.distance > 0);
    
    // Sort by distance descending
    playerDistances.sort((a, b) => b.distance - a.distance);
    
    // Assign ranks (1, 2, 3)
    const rankings: Record<number, number> = {};
    playerDistances.forEach((p, index) => {
      if (index < 3) {
        rankings[p.playerId] = index + 1;
      }
    });
    
    return rankings;
  }, [validPlayers]);

  // Calculate max ball speed among all valid players (for leader badge)
  const maxBallSpeed = useMemo(() => {
    if (validPlayers.length === 0) return 0;
    return Math.max(...validPlayers.map(p => {
      if (!p.swings || p.swings.length === 0) return 0;
      return Math.max(...p.swings.map(s => s.ball_speed));
    }));
  }, [validPlayers]);

  // Calculate ball speed rankings (1st, 2nd, 3rd) for each player
  const ballSpeedRankings = useMemo((): Record<number, number> => {
    if (validPlayers.length === 0) return {};
    
    const playerSpeeds = validPlayers.map(p => ({
      playerId: p.player_id,
      maxSpeed: p.swings && p.swings.length > 0 
        ? Math.max(...p.swings.map(s => s.ball_speed))
        : 0
    })).filter(p => p.maxSpeed > 0);
    
    // Sort by speed descending
    playerSpeeds.sort((a, b) => b.maxSpeed - a.maxSpeed);
    
    // Assign ranks (1, 2, 3)
    const rankings: Record<number, number> = {};
    playerSpeeds.forEach((p, index) => {
      if (index < 3) {
        rankings[p.playerId] = index + 1;
      }
    });
    
    return rankings;
  }, [validPlayers]);

  // Calculate max sprint speed and rankings
  const maxSprintSpeed = useMemo(() => {
    if (validPlayers.length === 0) return 0;
    return Math.max(...validPlayers.map(p => p.fastest_sprint || 0));
  }, [validPlayers]);

  const sprintRankings = useMemo((): Record<number, number> => {
    if (validPlayers.length === 0) return {};
    
    const playerSprints = validPlayers.map(p => ({
      playerId: p.player_id,
      sprint: p.fastest_sprint || 0
    })).filter(p => p.sprint > 0);
    
    playerSprints.sort((a, b) => b.sprint - a.sprint);
    
    const rankings: Record<number, number> = {};
    playerSprints.forEach((p, index) => {
      if (index < 3) {
        rankings[p.playerId] = index + 1;
      }
    });
    
    return rankings;
  }, [validPlayers]);

  // Calculate swing count rankings (most active player)
  const maxSwings = useMemo(() => {
    if (validPlayers.length === 0) return 0;
    return Math.max(...validPlayers.map(p => p.swings?.length || 0));
  }, [validPlayers]);

  const swingsRankings = useMemo((): Record<number, number> => {
    if (validPlayers.length === 0) return {};
    
    const playerSwings = validPlayers.map(p => ({
      playerId: p.player_id,
      swingCount: p.swings?.length || 0
    })).filter(p => p.swingCount > 0);
    
    playerSwings.sort((a, b) => b.swingCount - a.swingCount);
    
    const rankings: Record<number, number> = {};
    playerSwings.forEach((p, index) => {
      if (index < 3) {
        rankings[p.playerId] = index + 1;
      }
    });
    
    return rankings;
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

  // Calculate total video duration (for position indicators)
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

  // Auto-select first rally when result loads and showOnlyRallies is enabled
  useEffect(() => {
    if (!result?.rallies || result.rallies.length === 0) return;
    if (!timelineFilters.showOnlyRallies) return;
    if (selectedRallyIndex !== null) return; // Already have a selection
    
    // Auto-select the first rally
    setSelectedRallyIndex(0);
  }, [result?.rallies, timelineFilters.showOnlyRallies, selectedRallyIndex]);

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

  // Auto-skip between rallies when "show only rallies" filter is enabled
  useEffect(() => {
    if (!timelineFilters.showOnlyRallies || !result?.rallies || !videoRef.current) return;
    
    const rallies = result.rallies;
    if (rallies.length === 0) return;
    
    // Check if video is playing
    const video = videoRef.current;
    if (video.paused) return;
    
    const buffer = timelineFilters.rallyBuffer;
    
    // Find if we're currently inside a rally (including buffer zone before)
    const currentRallyIndex = rallies.findIndex(
      ([start, end]) => currentTime >= Math.max(0, start - buffer) && currentTime <= end
    );
    
    if (currentRallyIndex !== -1) {
      // We're inside a rally (or its buffer) - check if we're about to exit
      const [, rallyEnd] = rallies[currentRallyIndex];
      const timeToEnd = rallyEnd - currentTime;
      
      // If we're within 0.1s of the rally end, prepare to skip
      if (timeToEnd <= 0.1 && timeToEnd > 0) {
        const nextRallyIndex = currentRallyIndex + 1;
        if (nextRallyIndex < rallies.length) {
          // Skip to next rally (with buffer)
          const [nextRallyStart] = rallies[nextRallyIndex];
          video.currentTime = Math.max(0, nextRallyStart - buffer);
        }
        // If no more rallies, video will naturally end or loop
      }
    } else {
      // We're outside a rally - find the next rally to skip to
      const nextRallyIndex = rallies.findIndex(([start]) => start > currentTime);
      
      if (nextRallyIndex !== -1) {
        // Skip to the next rally (with buffer)
        const [nextRallyStart] = rallies[nextRallyIndex];
        video.currentTime = Math.max(0, nextRallyStart - buffer);
      } else if (currentTime < Math.max(0, rallies[0][0] - buffer)) {
        // We're before the first rally's buffer zone - skip to it
        video.currentTime = Math.max(0, rallies[0][0] - buffer);
      }
      // If after last rally, let video play to end naturally
    }
  }, [currentTime, timelineFilters.showOnlyRallies, timelineFilters.rallyBuffer, result?.rallies]);

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

  // Tab definitions
  const tabs = [
    { id: "rallies" as const, label: "Rallies", icon: <PlayIcon width={16} height={16} /> },
    { id: "summary" as const, label: "Match Summary", icon: <BarChartIcon width={16} height={16} /> },
    { id: "players" as const, label: "Player Stats", icon: <PersonIcon width={16} height={16} />, badge: validPlayers.length > 0 ? validPlayers.length : undefined },
    { id: "highlights" as const, label: "Highlights", icon: <StarIcon width={16} height={16} />, badge: result?.highlights?.length || undefined },
    { id: "tactical" as const, label: "Tactical", icon: <TargetIcon width={16} height={16} /> },
    { id: "technique" as const, label: "Technique", icon: <MixIcon width={16} height={16} />, disabled: true },
  ];

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

      {/* Tab Navigation - Full width */}
      <Box
        style={{
          borderBottom: "1px solid var(--gray-5)",
          backgroundColor: "var(--gray-2)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Box style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 var(--space-4)" }}>
          <Flex
            gap="0"
            style={{
              overflowX: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isDisabled = tab.disabled;

              return (
                <Box
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  style={{
                    padding: "14px 24px",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    borderBottom: isActive ? "2px solid var(--mint-9)" : "2px solid transparent",
                    backgroundColor: isActive ? "var(--gray-1)" : "transparent",
                    opacity: isDisabled ? 0.4 : 1,
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive && !isDisabled) {
                      e.currentTarget.style.backgroundColor = "var(--gray-3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive && !isDisabled) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <Flex align="center" gap="2">
                    <Box style={{ color: isActive ? "var(--mint-11)" : "var(--gray-10)", display: "flex", alignItems: "center" }}>
                      {tab.icon}
                    </Box>
                    <Text size="2" weight={isActive ? "medium" : "regular"} style={{ color: isActive ? "var(--gray-12)" : "var(--gray-11)", whiteSpace: "nowrap" }}>
                      {tab.label}
                    </Text>
                    {tab.badge !== undefined && (
                      <Badge size="1" color={isActive ? "mint" : "gray"} variant="soft">
                        {tab.badge}
                      </Badge>
                    )}
                    {isDisabled && (
                      <Badge size="1" color="gray" variant="outline">Soon</Badge>
                    )}
                  </Flex>
                </Box>
              );
            })}
          </Flex>
        </Box>
      </Box>

      {error && (
        <Box style={{ padding: "var(--space-4)", maxWidth: "1400px", margin: "0 auto" }}>
          <Card style={{ backgroundColor: "var(--red-3)" }}>
            <Text color="red">{error}</Text>
          </Card>
        </Box>
      )}

      {/* Tab Content */}
      <Box style={{ padding: "var(--space-4)", maxWidth: "1400px", margin: "0 auto", paddingBottom: "var(--space-6)" }}>
        
        {/* ==================== RALLIES TAB ==================== */}
        {activeTab === "rallies" && (
          <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
            {/* Player Toggle & Timeline Filters */}
            <Flex gap="2" align="center" justify="between" style={{ marginBottom: "var(--space-3)" }}>
              <Flex gap="2" align="center">
                <Button size="1" variant={useVidstack ? "solid" : "soft"} onClick={() => setUseVidstack(true)}>
                  Vidstack Player
                </Button>
                <Button size="1" variant={useVidstack ? "soft" : "outline"} color="gray" onClick={() => setUseVidstack(false)}>
                  Legacy Player
                </Button>
              </Flex>
              
              {/* Timeline Filter */}
              {result && (
                <TimelineFilter
                  filters={timelineFilters}
                  onFilterChange={setTimelineFilters}
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
                    ref={videoRef}
                    videoUrl={task.video_url}
                    ballPositions={result?.ball_positions}
                    ballBounces={enhancedBallBounces}
                    swings={allSwings}
                    rallies={result?.rallies}
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
                ) : (
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
                showOnlyRallies={timelineFilters.showOnlyRallies}
                rallyBuffer={timelineFilters.rallyBuffer}
              />
            )}
          </Box>
        )}

        {/* ==================== MATCH SUMMARY TAB ==================== */}
        {activeTab === "summary" && (
          <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
            {!result ? (
              <TaskStatusCard task={task} />
            ) : (
              <Grid columns={{ initial: "1", md: "2" }} gap="4">
                <MatchSummaryCard result={result} enhancedBallBounces={enhancedBallBounces} />
                {result.confidences && (
                  <ConfidenceCard confidences={result.confidences.final_confidences} />
                )}
              </Grid>
            )}
          </Box>
        )}

        {/* ==================== PLAYER STATS TAB ==================== */}
        {activeTab === "players" && (
          <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
            {validPlayers.length === 0 ? (
              <Flex align="center" justify="center" direction="column" gap="3" style={{ padding: "60px 20px" }}>
                <PersonIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
                <Text size="3" color="gray">No player data available yet</Text>
                <Text size="2" color="gray">Player statistics will appear here once the analysis is complete</Text>
              </Flex>
            ) : (
              <Box style={{ position: "relative" }}>
                {/* Left edge indicator - shows more content */}
                <Box
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 48,
                    background: "linear-gradient(to right, var(--gray-3), transparent)",
                    pointerEvents: "none",
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Box style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: "50%", 
                    background: "var(--gray-5)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    opacity: 0.8,
                  }}>
                    <Text size="2" style={{ color: "var(--gray-11)" }}>←</Text>
                  </Box>
                </Box>
                {/* Right edge indicator - shows more content */}
                <Box
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 48,
                    background: "linear-gradient(to left, var(--gray-3), transparent)",
                    pointerEvents: "none",
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Box style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: "50%", 
                    background: "var(--gray-5)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    opacity: 0.8,
                  }}>
                    <Text size="2" style={{ color: "var(--gray-11)" }}>→</Text>
                  </Box>
                </Box>
                <Box
                  style={{
                    overflowX: "auto",
                    overflowY: "hidden",
                    paddingBottom: 16,
                    paddingLeft: 48,
                    paddingRight: 48,
                    scrollSnapType: "x mandatory",
                    cursor: "grab",
                    scrollBehavior: "smooth",
                  }}
                  onMouseDown={(e) => {
                    const container = e.currentTarget;
                    container.style.cursor = "grabbing";
                    container.style.scrollSnapType = "none";
                    const startX = e.pageX - container.offsetLeft;
                    const scrollLeft = container.scrollLeft;
                    
                    const onMouseMove = (e: MouseEvent) => {
                      e.preventDefault();
                      const x = e.pageX - container.offsetLeft;
                      const walk = (x - startX) * 1.5;
                      container.scrollLeft = scrollLeft - walk;
                    };
                    
                    const onMouseUp = () => {
                      container.style.cursor = "grab";
                      // Re-enable snap with a slight delay for smooth transition
                      setTimeout(() => {
                        container.style.scrollSnapType = "x mandatory";
                      }, 50);
                      document.removeEventListener("mousemove", onMouseMove);
                      document.removeEventListener("mouseup", onMouseUp);
                    };
                    
                    document.addEventListener("mousemove", onMouseMove);
                    document.addEventListener("mouseup", onMouseUp);
                  }}
                >
                <Flex gap="4" style={{ width: "max-content" }}>
                  {/* Sort players by overall ranking (winner to honorable mention) */}
                  {(() => {
                    // Calculate medal points for each player (1st=3pts, 2nd=2pts, 3rd=1pt)
                    const getRankPoints = (playerId: number) => {
                      const ranks = [
                        distanceRankings[playerId],
                        sprintRankings[playerId],
                        ballSpeedRankings[playerId],
                        swingsRankings[playerId]
                      ].filter(r => r !== undefined && r <= 3) as number[];
                      return ranks.reduce((sum, r) => sum + (4 - r), 0);
                    };
                    const getGoldCount = (playerId: number) => {
                      return [distanceRankings[playerId], sprintRankings[playerId], ballSpeedRankings[playerId], swingsRankings[playerId]]
                        .filter(r => r === 1).length;
                    };

                    // Sort and assign overall ranks
                    const sortedPlayers = [...validPlayers].sort((a, b) => {
                      const pointsA = getRankPoints(a.player_id);
                      const pointsB = getRankPoints(b.player_id);
                      if (pointsB !== pointsA) return pointsB - pointsA;
                      return getGoldCount(b.player_id) - getGoldCount(a.player_id);
                    });

                    // Create overall ranking map (1st, 2nd, 3rd, 4+ = honorable mention)
                    const overallRankings: Record<number, number> = {};
                    sortedPlayers.forEach((p, index) => {
                      overallRankings[p.player_id] = index + 1;
                    });

                    return sortedPlayers.map((player) => (
                      <Box key={player.player_id} style={{ maxWidth: 320, flexShrink: 0, scrollSnapAlign: "center" }}>
                        <PlayerCard
                          player={player}
                          displayIndex={player.displayIndex}
                          displayName={player.displayName}
                          portrait={portraits[player.player_id]}
                          maxDistance={maxDistanceCovered}
                          distanceRank={distanceRankings[player.player_id]}
                          maxBallSpeed={maxBallSpeed}
                          ballSpeedRank={ballSpeedRankings[player.player_id]}
                          maxSprintSpeed={maxSprintSpeed}
                          sprintRank={sprintRankings[player.player_id]}
                          swingsRank={swingsRankings[player.player_id]}
                          maxSwings={maxSwings}
                          overallRank={overallRankings[player.player_id]}
                        />
                      </Box>
                    ));
                  })()}
                </Flex>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* ==================== HIGHLIGHTS TAB ==================== */}
        {activeTab === "highlights" && (
          <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
            {!result || !result.highlights || result.highlights.length === 0 ? (
              <Flex align="center" justify="center" direction="column" gap="3" style={{ padding: "60px 20px" }}>
                <StarIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
                <Text size="3" color="gray">No highlights detected</Text>
                <Text size="2" color="gray">Key moments from the match will appear here</Text>
              </Flex>
            ) : (
              <HighlightsCard highlights={result.highlights} videoRef={videoRef} />
            )}
          </Box>
        )}

        {/* ==================== TACTICAL TAB ==================== */}
        {activeTab === "tactical" && (
          <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
            {!result ? (
              <Flex align="center" justify="center" direction="column" gap="3" style={{ padding: "60px 20px" }}>
                <TargetIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
                <Text size="3" color="gray">Tactical analysis not available</Text>
              </Flex>
            ) : (
              <Flex direction="column" gap="4">
                <Box>
                  <Heading size="3" weight="medium" mb="3">Court Coverage</Heading>
                  <Text size="2" color="gray" mb="4">Ball bounce distribution across the court</Text>
                  {result.bounce_heatmap ? (
                    <BounceHeatmap
                      heatmap={result.bounce_heatmap}
                      totalBounces={(enhancedBallBounces || result.ball_bounces || []).length}
                    />
                  ) : (
                    <Card style={{ padding: "40px", textAlign: "center" }}>
                      <Text color="gray">No bounce heatmap data available</Text>
                    </Card>
                  )}
                </Box>

                <Grid columns={{ initial: "1", md: "2" }} gap="4">
                  <Card style={{ border: "1px solid var(--gray-5)", opacity: 0.6 }}>
                    <Flex direction="column" gap="2" p="4" align="center" justify="center" style={{ minHeight: "150px" }}>
                      <Text size="2" color="gray" weight="medium">Rally Patterns</Text>
                      <Badge color="gray" variant="outline">Coming Soon</Badge>
                    </Flex>
                  </Card>
                  <Card style={{ border: "1px solid var(--gray-5)", opacity: 0.6 }}>
                    <Flex direction="column" gap="2" p="4" align="center" justify="center" style={{ minHeight: "150px" }}>
                      <Text size="2" color="gray" weight="medium">Shot Placement</Text>
                      <Badge color="gray" variant="outline">Coming Soon</Badge>
                    </Flex>
                  </Card>
                </Grid>
              </Flex>
            )}
          </Box>
        )}

        {/* ==================== TECHNIQUE TAB ==================== */}
        {activeTab === "technique" && (
          <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
            <Flex align="center" justify="center" direction="column" gap="4" style={{ padding: "60px 20px" }}>
              <Box
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  backgroundColor: "var(--gray-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MixIcon width={40} height={40} style={{ color: "var(--gray-8)" }} />
              </Box>
              <Heading size="4" weight="medium" style={{ color: "var(--gray-11)" }}>Technique Analysis</Heading>
              <Text size="2" color="gray" align="center" style={{ maxWidth: 400 }}>
                Detailed swing analysis, form breakdowns, and technique comparisons will be available in a future update.
              </Text>
              <Badge color="mint" variant="soft" size="2">Coming Soon</Badge>
            </Flex>
          </Box>
        )}
      </Box>
    </Box>
  );
}
