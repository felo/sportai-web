"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Flex,
  Text,
  Heading,
  Card,
  Badge,
  Spinner,
  Grid,
  Button,
  Tooltip,
} from "@radix-ui/themes";
import { ArrowLeftIcon, DownloadIcon, Cross2Icon, ChevronDownIcon, ChevronUpIcon, GearIcon } from "@radix-ui/react-icons";
import { IconButton, ToggleSwitch } from "@/components/ui";
import buttonStyles from "@/styles/buttons.module.css";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePlayerPortraits } from "./usePlayerPortraits";

interface Task {
  id: string;
  task_type: string;
  sport: "tennis" | "padel" | "pickleball";
  sportai_task_id: string | null;
  video_url: string;
  video_length: number | null;
  status: "pending" | "processing" | "completed" | "failed";
  estimated_compute_time: number | null;
  result_s3_key: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface StatisticsResult {
  players: Array<{
    player_id: number;
    swing_count: number;
    covered_distance: number;
    fastest_sprint: number;
    fastest_sprint_timestamp: number;
    activity_score: number;
    swing_type_distribution: Record<string, number>;
    location_heatmap: number[][];
    swings: Array<{
      start: { timestamp: number; frame_nr: number };
      end: { timestamp: number; frame_nr: number };
      swing_type: string;
      ball_speed: number;
      volley: boolean;
      serve: boolean;
      ball_hit: { timestamp: number; frame_nr: number };
    }>;
  }>;
  team_sessions: Array<{
    start_time: number;
    end_time: number;
    front_team: number[];
    back_team: number[];
  }>;
  highlights: Array<{
    type: string;
    start: { timestamp: number };
    end: { timestamp: number };
    duration: number;
    swing_count: number;
  }>;
  rallies: [number, number][];
  bounce_heatmap: number[][];
  ball_bounces: Array<{
    timestamp: number;
    court_pos: [number, number];
    player_id: number;
    type: string;
  }>;
  ball_positions: Array<{
    timestamp: number;
    X: number;
    Y: number;
  }>;
  confidences: {
    final_confidences: {
      pose: number;
      swing: number;
      ball: number;
      final: number;
    };
  };
}

interface TaskViewerProps {
  paramsPromise: Promise<{ taskId: string }>;
}

// Helper function to format swing type names
function formatSwingType(swingType: string): string {
  return swingType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Configuration constants - easy to adjust
const CONFIG = {
  // Video playback update frequency (ms)
  PLAYHEAD_UPDATE_INTERVAL: 50,
  
  // Timeline interaction
  RALLY_START_OFFSET_SECONDS: 2, // Show N seconds before rally start (to see serve)
  EVENT_DETECTION_THRESHOLD: 0.3, // Seconds tolerance for event glow
  EVENT_TOOLTIP_THRESHOLD: 0.15, // Seconds tolerance for auto-showing tooltip
  EVENT_TOOLTIP_DURATION: 2000, // How long tooltip stays visible (ms)
  
  // Video resize constraints
  VIDEO_MIN_WIDTH: 300,
  VIDEO_MAX_WIDTH: 1200,
  VIDEO_DEFAULT_WIDTH: 800,
};

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
  const [currentTime, setCurrentTime] = useState(0);
  const [videoWidth, setVideoWidth] = useState(CONFIG.VIDEO_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  const [showBallTrajectory, setShowBallTrajectory] = useState(false);
  const [activeEventTooltip, setActiveEventTooltip] = useState<{
    text: string;
    position: number;
    id: string;
  } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const rallyTimelineRef = useRef<HTMLDivElement>(null);
  const lastTriggeredEventRef = useRef<string | null>(null);
  
  // Extract player portraits from video (disabled for now - CORS issues)
  // const filteredPlayers = result?.players.filter(p => p.swing_count >= 10) || [];
  // const { portraits } = usePlayerPortraits(filteredPlayers, videoRef.current);
  const portraits: Record<number, string> = {}; // Empty - always use fallback
  
  // Track video playback time with high frequency updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    let animationId: number;
    let lastUpdate = 0;
    
    const updateTime = (timestamp: number) => {
      if (timestamp - lastUpdate >= CONFIG.PLAYHEAD_UPDATE_INTERVAL) {
        setCurrentTime(video.currentTime);
        lastUpdate = timestamp;
      }
      animationId = requestAnimationFrame(updateTime);
    };
    
    animationId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animationId);
  }, [videoRef.current]);

  // Detect when playhead hits events in rally timeline and show tooltip
  useEffect(() => {
    if (!result || selectedRallyIndex === null) return;
    
    const [rallyStart, rallyEnd] = result.rallies[selectedRallyIndex];
    const rallyDuration = rallyEnd - rallyStart;
    
    // Get swings in this rally
    const rallySwings = result.players
      .filter(p => p.swing_count >= 10)
      .flatMap(player => 
        player.swings
          .filter(s => s.ball_hit.timestamp >= rallyStart && s.ball_hit.timestamp <= rallyEnd)
          .map(s => ({ ...s, player_id: player.player_id }))
      );
    
    // Check if playhead is near any swing
    for (const swing of rallySwings) {
      const eventId = `swing-${swing.ball_hit.timestamp}`;
      if (Math.abs(currentTime - swing.ball_hit.timestamp) < CONFIG.EVENT_TOOLTIP_THRESHOLD) {
        if (lastTriggeredEventRef.current !== eventId) {
          lastTriggeredEventRef.current = eventId;
          const playerIndex = result.players
            .filter(p => p.swing_count >= 10)
            .sort((a, b) => b.swing_count - a.swing_count)
            .findIndex(p => p.player_id === swing.player_id) + 1;
          const speed = swing.ball_speed ? `${Math.round(swing.ball_speed)} km/h` : "";
          const position = ((swing.ball_hit.timestamp - rallyStart) / rallyDuration) * 100;
          
          setActiveEventTooltip({
            text: `P${playerIndex} – ${formatSwingType(swing.swing_type)}${speed ? ` – ${speed}` : ""}`,
            position,
            id: eventId,
          });
          
          // Auto-hide tooltip
          setTimeout(() => {
            setActiveEventTooltip(prev => prev?.id === eventId ? null : prev);
          }, CONFIG.EVENT_TOOLTIP_DURATION);
        }
        break;
      }
    }
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
      
      // Fetch the actual result data
      const resultResponse = await fetch(url);
      if (!resultResponse.ok) throw new Error("Failed to download result");
      
      const resultData = await resultResponse.json();
      setResult(resultData);
      
      // Update task to show it has result
      setTask(prev => prev ? { ...prev, result_s3_key: `task-results/${task.id}.json` } : null);
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getSportColor = (sport: string): "cyan" | "orange" | "green" => {
    const colors: Record<string, "cyan" | "orange" | "green"> = {
      padel: "cyan",
      tennis: "orange",
      pickleball: "green",
    };
    return colors[sport] || "cyan";
  };

  if (authLoading || loading) {
    return (
      <Box style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--gray-1)" }}>
        <Spinner size="3" />
      </Box>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  if (error && !task) {
    return (
      <Box style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--gray-1)" }}>
        <Card style={{ padding: "var(--space-5)", textAlign: "center" }}>
          <Text color="red" size="3">{error}</Text>
          <Box mt="4">
            <button className={buttonStyles.actionButtonSquareSecondary} onClick={() => router.push("/tasks")}>
              Back to Tasks
            </button>
          </Box>
        </Card>
      </Box>
    );
  }

  if (!task) return null;

  return (
    <Box style={{ 
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "var(--gray-1)", 
      padding: "var(--space-4)",
      overflowY: "auto",
    }}>
      <Box style={{ maxWidth: "1400px", margin: "0 auto", paddingBottom: "var(--space-6)" }}>
        {/* Header */}
        <Flex justify="between" align="center" mb="5">
          <Flex align="center" gap="4">
            <IconButton
              icon={<ArrowLeftIcon />}
              onClick={() => router.push("/tasks")}
              variant="ghost"
              size="2"
              ariaLabel="Back to tasks"
              tooltip="Back to Tasks"
            />
            <Flex align="center" gap="3">
              <Badge color={getSportColor(task.sport)} size="2">
                {task.sport.charAt(0).toUpperCase() + task.sport.slice(1)}
              </Badge>
              <Badge variant="soft" size="2">{task.task_type}</Badge>
              <Text size="2" color="gray">
                Task: {task.sportai_task_id?.slice(0, 8) || task.id.slice(0, 8)}
              </Text>
            </Flex>
          </Flex>
          
          {task.status === "completed" && !result && (
            <button
              className={buttonStyles.actionButtonSquare}
              onClick={fetchResult}
              disabled={loadingResult}
            >
              {loadingResult ? <Spinner size="1" /> : <Text></Text>}
              {loadingResult ? "Loading..." : "Load"}
            </button>
          )}
        </Flex>

        {/* Error Display */}
        {error && (
          <Card style={{ marginBottom: "var(--space-4)", backgroundColor: "var(--red-3)" }}>
            <Text color="red">{error}</Text>
          </Card>
        )}

        {/* Video Player - Centered with Resizable Edges */}
        <Flex justify="center" style={{ marginBottom: "var(--space-4)" }}>
          {/* Left placeholder for future content */}
          <Box style={{ flex: 1 }} />
          
          {/* Video with resize handles */}
          <Box
            ref={videoContainerRef}
            style={{
              position: "relative",
              width: `${videoWidth}px`,
              maxWidth: "100%",
              minWidth: `${CONFIG.VIDEO_MIN_WIDTH}px`,
              aspectRatio: "16 / 9",
              backgroundColor: "var(--gray-3)",
              borderRadius: "var(--radius-3)",
              overflow: "hidden",
            }}
          >
            <video
              ref={videoRef}
              src={task.video_url}
              controls
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: "var(--radius-3)",
              }}
            />
            
            {/* Video Settings Button - Top Right */}
            <Box
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                zIndex: 100,
              }}
            >
              <IconButton
                icon={<GearIcon />}
                onClick={() => setShowVideoSettings(!showVideoSettings)}
                variant="solid"
                size="2"
                ariaLabel="Video settings"
                style={{
                  backgroundColor: showVideoSettings ? "var(--mint-9)" : "rgba(0, 0, 0, 0.6)",
                  backdropFilter: "blur(4px)",
                }}
              />
            </Box>
            
            {/* Video Settings Panel - Slides in from right */}
            {showVideoSettings && (
              <Box
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: "280px",
                  backgroundColor: "var(--gray-2)",
                  borderLeft: "1px solid var(--gray-6)",
                  borderRadius: "0 var(--radius-3) var(--radius-3) 0",
                  padding: "var(--space-4)",
                  overflowY: "auto",
                  zIndex: 99,
                  animation: "slideInFromRight 0.3s ease-out",
                  boxShadow: "-4px 0 12px rgba(0,0,0,0.1)",
                }}
              >
                <Flex direction="column" gap="4">
                  <Flex justify="between" align="center">
                    <Heading size="3" weight="medium">Video Settings</Heading>
                    <IconButton
                      icon={<Cross2Icon />}
                      onClick={() => setShowVideoSettings(false)}
                      variant="ghost"
                      size="1"
                      ariaLabel="Close settings"
                    />
                  </Flex>
                  
                  <Box
                    style={{
                      height: "1px",
                      backgroundColor: "var(--gray-6)",
                    }}
                  />
                  
                  {/* Ball Trajectory Toggle */}
                  <ToggleSwitch
                    checked={showBallTrajectory}
                    onCheckedChange={setShowBallTrajectory}
                    label="Show ball trajectory"
                  />
                </Flex>
              </Box>
            )}
            
            {/* Left resize handle */}
            <Box
              onMouseDown={(e: React.MouseEvent) => {
                e.preventDefault();
                setIsResizing(true);
                const startX = e.clientX;
                const startWidth = videoWidth;
                
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const delta = startX - moveEvent.clientX;
                  const newWidth = Math.max(CONFIG.VIDEO_MIN_WIDTH, Math.min(CONFIG.VIDEO_MAX_WIDTH, startWidth + delta * 2));
                  setVideoWidth(newWidth);
                };
                
                const onMouseUp = () => {
                  setIsResizing(false);
                  document.removeEventListener("mousemove", onMouseMove);
                  document.removeEventListener("mouseup", onMouseUp);
                };
                
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
              }}
              style={{
                position: "absolute",
                left: "-4px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "8px",
                height: "60px",
                backgroundColor: isResizing ? "var(--mint-9)" : "var(--gray-8)",
                borderRadius: "4px",
                cursor: "ew-resize",
                opacity: 0.6,
                transition: "opacity 0.2s, background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.backgroundColor = "var(--mint-9)";
              }}
              onMouseLeave={(e) => {
                if (!isResizing) {
                  e.currentTarget.style.opacity = "0.6";
                  e.currentTarget.style.backgroundColor = "var(--gray-8)";
                }
              }}
            />
            
            {/* Right resize handle */}
            <Box
              onMouseDown={(e: React.MouseEvent) => {
                e.preventDefault();
                setIsResizing(true);
                const startX = e.clientX;
                const startWidth = videoWidth;
                
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const delta = moveEvent.clientX - startX;
                  const newWidth = Math.max(CONFIG.VIDEO_MIN_WIDTH, Math.min(CONFIG.VIDEO_MAX_WIDTH, startWidth + delta * 2));
                  setVideoWidth(newWidth);
                };
                
                const onMouseUp = () => {
                  setIsResizing(false);
                  document.removeEventListener("mousemove", onMouseMove);
                  document.removeEventListener("mouseup", onMouseUp);
                };
                
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
              }}
              style={{
                position: "absolute",
                right: "-4px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "8px",
                height: "60px",
                backgroundColor: isResizing ? "var(--mint-9)" : "var(--gray-8)",
                borderRadius: "4px",
                cursor: "ew-resize",
                opacity: 0.6,
                transition: "opacity 0.2s, background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.backgroundColor = "var(--mint-9)";
              }}
              onMouseLeave={(e) => {
                if (!isResizing) {
                  e.currentTarget.style.opacity = "0.6";
                  e.currentTarget.style.backgroundColor = "var(--gray-8)";
                }
              }}
            />
          </Box>
          
          {/* Right placeholder for future content */}
          <Box style={{ flex: 1 }} />
        </Flex>

        {/* Detailed Rally Timeline - Between Video and Main Timeline */}
        {result && selectedRallyIndex !== null && (
          <Box
            style={{
              animation: "slideDown 0.5s ease-out",
              overflow: "hidden",
            }}
          >
            <Card style={{ border: "1px solid var(--mint-9)", marginBottom: "var(--space-3)" }}>
              <Flex direction="column" gap="2" p="3">
              {(() => {
                const [rallyStart, rallyEnd] = result.rallies[selectedRallyIndex];
                const rallyDuration = rallyEnd - rallyStart;
                
                // Get bounces in this rally
                const rallyBounces = result.ball_bounces.filter(
                  b => b.timestamp >= rallyStart && b.timestamp <= rallyEnd
                );
                
                // Get swings in this rally from all players
                const rallySwings = result.players
                  .filter(p => p.swing_count >= 10)
                  .flatMap(player => 
                    player.swings
                      .filter(s => s.ball_hit.timestamp >= rallyStart && s.ball_hit.timestamp <= rallyEnd)
                      .map(s => ({ ...s, player_id: player.player_id }))
                  )
                  .sort((a, b) => a.ball_hit.timestamp - b.ball_hit.timestamp);
                
                return (
                  <>
                    <Flex justify="between" align="center">
                      <Flex align="center" gap="2">
                        <Heading size="4" weight="medium">Rally {selectedRallyIndex + 1}</Heading>
                        <Badge color="mint">{formatDuration(rallyDuration)}</Badge>
                        <Text size="2" color="gray">
                          {rallySwings.length} swings • {rallyBounces.length} bounces
                        </Text>
                      </Flex>
                      <Flex align="center" gap="3">
                        {/* Legend */}
                        <Flex gap="3">
                          <Flex align="center" gap="1">
                            <Box style={{ width: 4, height: 12, backgroundColor: "var(--blue-9)", borderRadius: 2 }} />
                            <Text size="1" color="gray">Swing</Text>
                          </Flex>
                          <Flex align="center" gap="1">
                            <Box style={{ width: 10, height: 10, backgroundColor: "var(--orange-9)", borderRadius: "50%" }} />
                            <Text size="1" color="gray">Floor</Text>
                          </Flex>
                          <Flex align="center" gap="1">
                            <Box style={{ width: 10, height: 10, backgroundColor: "var(--purple-9)", borderRadius: "50%" }} />
                            <Text size="1" color="gray">Swing</Text>
                          </Flex>
                        </Flex>
                        <IconButton
                          icon={<Cross2Icon />}
                          variant="ghost"
                          size="1"
                          onClick={() => setSelectedRallyIndex(null)}
                          ariaLabel="Close rally details"
                        />
                      </Flex>
                    </Flex>
                    
                    {/* Rally timeline */}
                    <Box
                      ref={rallyTimelineRef}
                      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = clickX / rect.width;
                        const targetTime = rallyStart + (percentage * rallyDuration);
                        if (videoRef.current) {
                          videoRef.current.currentTime = targetTime;
                        }
                      }}
                      style={{
                        height: "44px",
                        backgroundColor: "var(--gray-3)",
                        borderRadius: "var(--radius-3)",
                        position: "relative",
                        overflow: "visible",
                        marginTop: "16px",
                        cursor: "pointer",
                      }}
                    >
                      {/* Swings - with larger hit area */}
                      {rallySwings.map((swing, idx) => {
                        const relativeTime = swing.ball_hit.timestamp - rallyStart;
                        const position = (relativeTime / rallyDuration) * 100;
                        const playerIndex = result.players
                          .filter(p => p.swing_count >= 10)
                          .sort((a, b) => b.swing_count - a.swing_count)
                          .findIndex(p => p.player_id === swing.player_id) + 1;
                        // Glow when playhead is near this swing
                        const isNearPlayhead = Math.abs(currentTime - swing.ball_hit.timestamp) < CONFIG.EVENT_DETECTION_THRESHOLD;
                        
                        return (
                          <Tooltip key={`swing-${idx}`} content={`P${playerIndex} ${formatSwingType(swing.swing_type)} @ ${formatDuration(swing.ball_hit.timestamp)}`}>
                            <Box
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (videoRef.current) {
                                  videoRef.current.currentTime = swing.ball_hit.timestamp;
                                }
                              }}
                              onMouseEnter={(e) => {
                                const inner = e.currentTarget.querySelector('[data-swing-inner]') as HTMLElement;
                                if (inner) {
                                  inner.style.transform = "scaleX(1.5)";
                                  inner.style.boxShadow = "0 0 12px rgba(59, 130, 246, 0.8)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                const inner = e.currentTarget.querySelector('[data-swing-inner]') as HTMLElement;
                                if (inner) {
                                  inner.style.transform = "scaleX(1)";
                                  inner.style.boxShadow = isNearPlayhead ? "0 0 12px rgba(59, 130, 246, 0.8)" : "none";
                                }
                              }}
                              style={{
                                position: "absolute",
                                left: `${position}%`,
                                top: 0,
                                width: "16px",
                                height: "100%",
                                transform: "translateX(-50%)",
                                cursor: "pointer",
                                zIndex: 5,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Box
                                data-swing-inner=""
                                style={{
                                  width: "4px",
                                  height: "70%",
                                  backgroundColor: "var(--blue-9)",
                                  borderRadius: "2px",
                                  boxShadow: isNearPlayhead ? "0 0 12px rgba(59, 130, 246, 0.8)" : "none",
                                  transition: "all 0.15s ease",
                                  transform: "scaleX(1)",
                                }}
                              />
                            </Box>
                          </Tooltip>
                        );
                      })}
                      
                      {/* Bounces - with larger hit area */}
                      {rallyBounces.map((bounce, idx) => {
                        const relativeTime = bounce.timestamp - rallyStart;
                        const position = (relativeTime / rallyDuration) * 100;
                        // Glow when playhead is near this bounce
                        const isNearPlayhead = Math.abs(currentTime - bounce.timestamp) < CONFIG.EVENT_DETECTION_THRESHOLD;
                        const glowColor = bounce.type === "floor" 
                          ? "rgba(245, 158, 11, 0.8)"  // orange glow
                          : "rgba(168, 85, 247, 0.8)"; // purple glow
                        
                        return (
                          <Tooltip key={`bounce-${idx}`} content={`${bounce.type} bounce @ ${formatDuration(bounce.timestamp)}`}>
                            <Box
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (videoRef.current) {
                                  videoRef.current.currentTime = bounce.timestamp;
                                }
                              }}
                              onMouseEnter={(e) => {
                                const inner = e.currentTarget.querySelector('[data-bounce-inner]') as HTMLElement;
                                if (inner) {
                                  inner.style.transform = "scale(1.5)";
                                  inner.style.boxShadow = `0 0 16px ${glowColor}`;
                                }
                              }}
                              onMouseLeave={(e) => {
                                const inner = e.currentTarget.querySelector('[data-bounce-inner]') as HTMLElement;
                                if (inner) {
                                  inner.style.transform = "scale(1)";
                                  inner.style.boxShadow = isNearPlayhead ? `0 0 16px ${glowColor}` : "none";
                                }
                              }}
                              style={{
                                position: "absolute",
                                left: `${position}%`,
                                top: 0,
                                width: "24px",
                                height: "100%",
                                transform: "translateX(-50%)",
                                cursor: "pointer",
                                zIndex: 10,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Box
                                data-bounce-inner=""
                                style={{
                                  width: "14px",
                                  height: "14px",
                                  borderRadius: "50%",
                                  backgroundColor: bounce.type === "floor" ? "var(--orange-9)" : "var(--purple-9)",
                                  border: "2px solid white",
                                  boxShadow: isNearPlayhead ? `0 0 16px ${glowColor}` : "none",
                                  transition: "all 0.15s ease",
                                  transform: "scale(1)",
                                }}
                              />
                            </Box>
                          </Tooltip>
                        );
                      })}
                      
                      {/* Rally playhead - only show if current time is within rally */}
                      {currentTime >= rallyStart && currentTime <= rallyEnd && (
                        <>
                          <Box
                            style={{
                              position: "absolute",
                              left: `${((currentTime - rallyStart) / rallyDuration) * 100}%`,
                              top: 0,
                              width: "2px",
                              height: "100%",
                              backgroundColor: "var(--red-9)",
                              zIndex: 20,
                              pointerEvents: "none",
                            }}
                          />
                          <Box
                            style={{
                              position: "absolute",
                              left: `${((currentTime - rallyStart) / rallyDuration) * 100}%`,
                              top: "-20px",
                              transform: "translateX(-50%)",
                              backgroundColor: "var(--red-9)",
                              color: "white",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              whiteSpace: "nowrap",
                              zIndex: 21,
                              pointerEvents: "none",
                            }}
                          >
                            {formatDuration(currentTime)}
                          </Box>
                        </>
                      )}
                      
                      {/* Auto-show event tooltip */}
                      {activeEventTooltip && rallyTimelineRef.current && (() => {
                        const rect = rallyTimelineRef.current!.getBoundingClientRect();
                        const leftPos = rect.left + (rect.width * activeEventTooltip.position / 100);
                        const topPos = rect.top - 50;
                        
                        return (
                          <Box
                            style={{
                              position: "fixed",
                              left: `${leftPos}px`,
                              top: `${topPos}px`,
                              transform: "translateX(-50%)",
                              backgroundColor: "var(--blue-9)",
                              color: "white",
                              padding: "6px 12px",
                              borderRadius: "var(--radius-2)",
                              fontSize: "12px",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              zIndex: 9999,
                              pointerEvents: "none",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                              animation: "fadeIn 0.2s ease-out",
                            }}
                          >
                            {activeEventTooltip.text}
                          </Box>
                        );
                      })()}
                    </Box>
                  </>
                );
              })()}
              </Flex>
            </Card>
          </Box>
        )}

        {/* Main Timeline - Full Width */}
        {result && (
          <Card style={{ border: "1px solid var(--gray-6)", marginBottom: "var(--space-3)" }}>
            <Flex direction="column" gap="2" p="3">
              <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                  <Heading size="4" weight="medium">Timeline</Heading>
                  <Text size="2" color="gray">
                    {result.rallies.length} rallies • {result.ball_bounces.length} bounces
                  </Text>
                </Flex>
                <Flex align="center" gap="1">
                  <Box style={{ width: 10, height: 10, backgroundColor: "var(--mint-9)", borderRadius: 2 }} />
                  <Text size="1" color="gray">Rally</Text>
                </Flex>
              </Flex>
              {(() => {
                // Get actual video duration from result data
                const lastRally = result.rallies[result.rallies.length - 1];
                const lastBounce = result.ball_bounces[result.ball_bounces.length - 1];
                const estimatedDuration = Math.max(
                  task.video_length || 0,
                  lastRally ? lastRally[1] : 0,
                  lastBounce ? lastBounce.timestamp : 0
                );
                const totalDuration = estimatedDuration || 300;
                
                return (
                  <Box
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percentage = clickX / rect.width;
                      const targetTime = percentage * totalDuration;
                      if (videoRef.current) {
                        videoRef.current.currentTime = targetTime;
                      }
                    }}
                    style={{
                      height: "36px",
                      backgroundColor: "var(--gray-3)",
                      borderRadius: "var(--radius-3)",
                      position: "relative",
                      overflow: "visible",
                      marginTop: "16px",
                      cursor: "pointer",
                    }}
                  >
                    {/* Rally markers */}
                    {result.rallies.map(([start, end], i) => {
                      const left = (start / totalDuration) * 100;
                      const width = ((end - start) / totalDuration) * 100;
                      const isPlayheadInRally = currentTime >= start && currentTime <= end;
                      const isSelected = selectedRallyIndex === i;
                      
                      return (
                        <Tooltip key={i} content={`Rally ${i + 1}: ${formatDuration(start)} - ${formatDuration(end)} (${formatDuration(end - start)})`}>
                          <Box
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              setSelectedRallyIndex(i);
                              if (videoRef.current) {
                                // Seek to just before rally start to show the serve
                                videoRef.current.currentTime = Math.max(0, start - CONFIG.RALLY_START_OFFSET_SECONDS);
                              }
                            }}
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
                              e.currentTarget.style.backgroundColor = isPlayheadInRally || isSelected ? "var(--mint-a8)" : "var(--mint-a5)";
                            }}
                          />
                        </Tooltip>
                      );
                    })}
                    
                    {/* Playhead */}
                    <Box
                      style={{
                        position: "absolute",
                        left: `${(currentTime / totalDuration) * 100}%`,
                        top: 0,
                        width: "2px",
                        height: "100%",
                        backgroundColor: "var(--red-9)",
                        zIndex: 20,
                        pointerEvents: "none",
                      }}
                    />
                    {/* Playhead time indicator */}
                    <Box
                      style={{
                        position: "absolute",
                        left: `${(currentTime / totalDuration) * 100}%`,
                        top: "-20px",
                        transform: "translateX(-50%)",
                        backgroundColor: "var(--red-9)",
                        color: "white",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        whiteSpace: "nowrap",
                        zIndex: 21,
                        pointerEvents: "none",
                      }}
                    >
                      {formatDuration(currentTime)}
                    </Box>
                  </Box>
                );
              })()}
            </Flex>
          </Card>
        )}

        {/* Match Insights - Collapsible */}
        <Card style={{ border: "1px solid var(--gray-6)" }}>
          <Flex
            justify="between"
            align="center"
            p="3"
            onClick={() => setInsightsExpanded(!insightsExpanded)}
            style={{ cursor: "pointer" }}
          >
            <Flex align="center" gap="2">
              <Heading size="4" weight="medium">Match Insights</Heading>
              {result && (
                <Text size="2" color="gray">
                  {result.players.filter(p => p.swing_count >= 10).length} players • {result.highlights.length} highlights
                </Text>
              )}
            </Flex>
            <IconButton
              icon={insightsExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
              variant="ghost"
              size="2"
              ariaLabel={insightsExpanded ? "Collapse insights" : "Expand insights"}
            />
          </Flex>
          
          {insightsExpanded && (
            <Box
              style={{
                animation: "slideDown 0.25s ease-out",
                overflow: "hidden",
                borderTop: "1px solid var(--gray-6)",
              }}
            >
              <Box p="4">
                <Grid columns={{ initial: "1", md: "2" }} gap="4">
                  {/* Left Column - Highlights */}
                  <Flex direction="column" gap="4">
                    {/* Highlights */}
            {result && result.highlights.length > 0 && (
              <Card style={{ border: "1px solid var(--gray-6)" }}>
                <Flex direction="column" gap="3" p="4">
                  <Heading size="4" weight="medium">Highlights</Heading>
                  <Flex direction="column" gap="2">
                    {result.highlights
                      .slice(0, 10) // Show top 10 only
                      .map((highlight, i) => (
                        <Flex
                          key={i}
                          justify="between"
                          align="center"
                          p="2"
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = highlight.start.timestamp;
                              videoRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--gray-4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--gray-3)";
                          }}
                          style={{
                            backgroundColor: "var(--gray-3)",
                            borderRadius: "var(--radius-2)",
                            cursor: "pointer",
                            transition: "background-color 0.2s ease",
                          }}
                        >
                          <Flex align="center" gap="2">
                            <Badge 
                              color={highlight.type.includes("longest") ? "blue" : "orange"} 
                              variant="soft"
                            >
                              {highlight.type.replace(/_/g, " ")}
                            </Badge>
                            <Text size="2">{formatDuration(highlight.duration)}</Text>
                          </Flex>
                          <Text size="2" color="gray">
                            @ {formatDuration(highlight.start.timestamp)}
                          </Text>
                        </Flex>
                      ))}
                  </Flex>
                  {result.highlights.length > 10 && (
                    <Text size="1" color="gray" align="center">
                      +{result.highlights.length - 10} more highlights
                    </Text>
                  )}
                </Flex>
              </Card>
            )}
          </Flex>

          {/* Right Column - Stats */}
          <Flex direction="column" gap="4">
            {/* Task Status */}
            {!result && (
              <Card style={{ border: "1px solid var(--gray-6)" }}>
                <Flex direction="column" gap="3" p="4" align="center">
                  <Text size="3" color="gray">
                    {task.status === "completed" 
                      ? "Click 'Load Result Data' to view statistics"
                      : task.status === "processing"
                      ? "Task is still processing..."
                      : task.status === "failed"
                      ? `Error: ${task.error_message}`
                      : "Task is pending..."}
                  </Text>
                </Flex>
              </Card>
            )}

            {/* Match Summary */}
            {result && (
              <Card style={{ border: "1px solid var(--gray-6)" }}>
                <Flex direction="column" gap="3" p="4">
                  <Heading size="4" weight="medium">Match Summary</Heading>
                  <Grid columns="2" gap="3">
                    <Box>
                      <Text size="1" color="gray">Players</Text>
                      <Text size="3" weight="bold">
                        {result.players.filter(p => p.swing_count >= 10).length}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="1" color="gray">Total Swings</Text>
                      <Text size="3" weight="bold">
                        {result.players
                          .filter(p => p.swing_count >= 10)
                          .reduce((sum, p) => sum + p.swing_count, 0)}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="1" color="gray">Rallies</Text>
                      <Text size="3" weight="bold">{result.rallies.length}</Text>
                    </Box>
                    <Box>
                      <Text size="1" color="gray">Bounces</Text>
                      <Text size="3" weight="bold">{result.ball_bounces.length}</Text>
                    </Box>
                  </Grid>
                </Flex>
              </Card>
            )}

            {/* Player Stats - Filter out false positives (< 10 swings) */}
            {result && result.players
              .filter(player => player.swing_count >= 10)
              .sort((a, b) => b.swing_count - a.swing_count)
              .map((player) => (
              <Card key={player.player_id} style={{ border: "1px solid var(--gray-6)" }}>
                <Flex direction="column" gap="3" p="4">
                  <Flex justify="between" align="center">
                    <Flex align="center" gap="3">
                      <Box
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          border: "2px solid var(--mint-9)",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: portraits[player.player_id] ? "transparent" : "var(--mint-9)",
                        }}
                      >
                        {portraits[player.player_id] ? (
                          <img
                            src={portraits[player.player_id]}
                            alt={`Player ${player.player_id}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <Text size="3" weight="bold" style={{ color: "white" }}>
                            P{result.players.filter(p => p.swing_count >= 10).sort((a, b) => b.swing_count - a.swing_count).findIndex(p => p.player_id === player.player_id) + 1}
                          </Text>
                        )}
                      </Box>
                      <Heading size="4" weight="medium">Player {player.player_id}</Heading>
                    </Flex>
                    <Badge color="gray" variant="soft">{player.swing_count} swings</Badge>
                  </Flex>
                  
                  <Grid columns="2" gap="3">
                    <Box>
                      <Text size="1" color="gray">Distance</Text>
                      <Text size="3" weight="bold">{Math.round(player.covered_distance)}m</Text>
                    </Box>
                    <Box>
                      <Text size="1" color="gray">Top Speed</Text>
                      <Text size="3" weight="bold">{Math.round(player.fastest_sprint)} km/h</Text>
                    </Box>
                    <Box>
                      <Text size="1" color="gray">Activity Score</Text>
                      <Text size="3" weight="bold">{Math.round(player.activity_score)}</Text>
                    </Box>
                    <Box>
                      <Text size="1" color="gray">Fastest Sprint</Text>
                      <Text size="3" weight="bold">@ {formatDuration(player.fastest_sprint_timestamp)}</Text>
                    </Box>
                  </Grid>

                  {/* Swing Distribution */}
                  <Box mt="2">
                    <Text size="2" color="gray" mb="2">Swing Types</Text>
                    <Flex gap="2" wrap="wrap">
                      {Object.entries(player.swing_type_distribution)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, pct]) => (
                          <Badge key={type} variant="soft" color="gray">
                            {type}: {Math.round(pct * 100)}%
                          </Badge>
                        ))}
                    </Flex>
                  </Box>
                </Flex>
              </Card>
            ))}

            {/* Bounce Heatmap */}
            {result && result.bounce_heatmap && (
              <Card style={{ border: "1px solid var(--gray-6)" }}>
                <Flex direction="column" gap="3" p="4">
                  <Heading size="4" weight="medium">Bounce Heatmap</Heading>
                  <Box
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${result.bounce_heatmap[0]?.length || 10}, 1fr)`,
                      gap: "2px",
                      aspectRatio: `${result.bounce_heatmap[0]?.length || 10} / ${result.bounce_heatmap.length || 20}`,
                      maxWidth: "200px",
                    }}
                  >
                    {result.bounce_heatmap.flatMap((row, y) =>
                      row.map((value, x) => {
                        const maxValue = Math.max(...result.bounce_heatmap.flat());
                        const intensity = maxValue > 0 ? value / maxValue : 0;
                        return (
                          <Box
                            key={`${x}-${y}`}
                            style={{
                              backgroundColor: intensity > 0 
                                ? `rgba(122, 219, 143, ${intensity})` 
                                : "var(--gray-4)",
                              borderRadius: "2px",
                            }}
                            title={`${value} bounces`}
                          />
                        );
                      })
                    )}
                  </Box>
                  <Text size="1" color="gray">
                    {result.ball_bounces.length} total bounces detected
                  </Text>
                </Flex>
              </Card>
            )}

            {/* Confidence Scores */}
            {result && result.confidences && (
              <Card style={{ border: "1px solid var(--gray-6)" }}>
                <Flex direction="column" gap="3" p="4">
                  <Heading size="4" weight="medium">Detection Confidence</Heading>
                  <Grid columns="2" gap="3">
                    <Box>
                      <Text size="1" color="gray">Pose</Text>
                      <Text size="2">{Math.round(result.confidences.final_confidences.pose * 100)}%</Text>
                    </Box>
                    <Box>
                      <Text size="1" color="gray">Swing</Text>
                      <Text size="2">{Math.round(result.confidences.final_confidences.swing * 100)}%</Text>
                    </Box>
                    <Box>
                      <Text size="1" color="gray">Ball</Text>
                      <Text size="2">{Math.round(result.confidences.final_confidences.ball * 100)}%</Text>
                    </Box>
                    <Box>
                      <Text size="1" color="gray">Overall</Text>
                      <Text size="2" weight="bold" color="mint">
                        {Math.round(result.confidences.final_confidences.final * 100)}%
                      </Text>
                    </Box>
                  </Grid>
                </Flex>
              </Card>
            )}
                  </Flex>
                </Grid>
              </Box>
            </Box>
          )}
        </Card>
      </Box>
    </Box>
  );
}

