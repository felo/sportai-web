"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, IconButton, Tooltip, Text, Button, Badge } from "@radix-ui/themes";
import { 
  ArrowLeftIcon, 
  GearIcon, 
  DoubleArrowRightIcon,
  GridIcon,
  VideoIcon,
} from "@radix-ui/react-icons";
import {
  VideoPoseViewerV2,
  PoseConfigurationPanel,
  DEFAULT_VIEWER_CONFIG,
  type ViewerConfig,
  type ViewerState,
  type ViewerActions,
  type PoseDetectionResult,
  type ProtocolEvent,
  PROTOCOL_EVENT_COLORS,
  AVAILABLE_PROTOCOLS,
} from "@/components/videoPoseViewerV2";
import { getSportColor } from "@/components/tasks/viewer/utils";

interface TechniqueViewerProps {
  videoUrl: string;
  onBack?: () => void;
  /** Sport name (e.g., "Tennis", "Padel") */
  sport?: string;
}

export function TechniqueViewer({ videoUrl, onBack, sport }: TechniqueViewerProps) {
  // Viewer configuration (externally controlled)
  const [config, setConfig] = useState<ViewerConfig>(DEFAULT_VIEWER_CONFIG);

  // Pose enabled state
  const [poseEnabled, setPoseEnabled] = useState(true);

  // Panel visibility
  const [showPanel, setShowPanel] = useState(false);

  // View mode: "player" shows video player, "swings" shows swing gallery
  const [viewMode, setViewMode] = useState<"player" | "swings">("player");

  // Protocol events (detected by enabled protocols after preprocessing)
  const [protocolEvents, setProtocolEvents] = useState<ProtocolEvent[]>([]);

  // Viewer state (read from viewer)
  const [viewerState, setViewerState] = useState<ViewerState>({
    videoUrl: "",
    isVideoReady: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentFrame: 0,
    totalFrames: 0,
    videoFPS: 30,
    fpsDetectionMethod: 'default',
    videoDimensions: { width: 0, height: 0 },
    isPortrait: false,
    isModelLoading: false,
    isDetecting: false,
    currentPoses: [],
    selectedPoseIndex: 0,
    isPreprocessing: false,
    preprocessProgress: 0,
    usingPreprocessedPoses: false,
    preprocessedFrameCount: 0,
    protocolEvents: [],
    handednessResult: null,
    error: null,
  });

  // Viewer ref for actions
  const viewerRef = useRef<ViewerActions>(null);

  // Viewer callbacks
  const handlePoseChange = useCallback((poses: PoseDetectionResult[], frame: number) => {
    setViewerState((prev) => ({
      ...prev,
      currentPoses: poses,
      currentFrame: frame,
    }));
  }, []);

  const handleVideoLoad = useCallback(
    (width: number, height: number, duration: number, fps: number) => {
      setViewerState((prev) => ({
        ...prev,
        isVideoReady: true,
        videoDimensions: { width, height },
        isPortrait: height > width,
        duration,
        videoFPS: fps,
        totalFrames: Math.floor(duration * fps),
      }));
    },
    []
  );

  const handlePlaybackChange = useCallback((isPlaying: boolean) => {
    setViewerState((prev) => ({ ...prev, isPlaying }));
  }, []);

  const handleTimeUpdate = useCallback((currentTime: number, currentFrame: number) => {
    setViewerState((prev) => ({ ...prev, currentTime, currentFrame }));
  }, []);

  const handleFPSDetected = useCallback((fps: number, method: 'default' | 'counted' | 'metadata') => {
    setViewerState((prev) => ({
      ...prev,
      videoFPS: fps,
      fpsDetectionMethod: method,
      totalFrames: Math.floor(prev.duration * fps),
    }));
  }, []);

  const handlePreprocessComplete = useCallback((frameCount: number, fps: number) => {
    setViewerState((prev) => ({
      ...prev,
      usingPreprocessedPoses: true,
      preprocessedFrameCount: frameCount,
      isPreprocessing: false,
    }));
  }, []);

  const handleError = useCallback((error: string) => {
    setViewerState((prev) => ({ ...prev, error }));
  }, []);

  const handleProtocolEvents = useCallback((events: ProtocolEvent[]) => {
    setProtocolEvents(events);
  }, []);

  const handleHandednessDetected = useCallback((dominantHand: "left" | "right", confidence: number) => {
    setViewerState((prev) => ({
      ...prev,
      handednessResult: { dominantHand, confidence },
    }));
  }, []);

  // Memoize callbacks to prevent infinite re-renders
  const viewerCallbacks = useMemo(
    () => ({
      onPoseChange: handlePoseChange,
      onVideoLoad: handleVideoLoad,
      onPlaybackChange: handlePlaybackChange,
      onTimeUpdate: handleTimeUpdate,
      onFPSDetected: handleFPSDetected,
      onPreprocessComplete: handlePreprocessComplete,
      onHandednessDetected: handleHandednessDetected,
      onProtocolEvents: handleProtocolEvents,
      onError: handleError,
    }),
    [
      handlePoseChange,
      handleVideoLoad,
      handlePlaybackChange,
      handleTimeUpdate,
      handleFPSDetected,
      handlePreprocessComplete,
      handleHandednessDetected,
      handleProtocolEvents,
      handleError,
    ]
  );

  // Get swing events count
  const swingCount = useMemo(() => {
    return protocolEvents.filter(e => e.protocolId === "swing-detection-v3").length;
  }, [protocolEvents]);

  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "var(--gray-1)",
        overflow: "hidden",
      }}
    >
      <Flex style={{ width: "100%", height: "100%" }}>
        {/* Main Viewer Area */}
        <Box
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top Bar */}
          <Flex
            align="center"
            justify="between"
            style={{
              padding: "12px 16px",
              backgroundColor: "var(--gray-1)",
              borderBottom: "1px solid var(--gray-a5)",
            }}
          >
            <Flex align="center" gap="3">
              {onBack && (
                <Tooltip content="Back to Library">
                  <IconButton
                    size="2"
                    variant="ghost"
                    onClick={onBack}
                    style={{ color: "white" }}
                  >
                    <ArrowLeftIcon width={18} height={18} />
                  </IconButton>
                </Tooltip>
              )}
              {sport && (
                <Badge color={getSportColor(sport)} size="2">
                  {sport.charAt(0).toUpperCase() + sport.slice(1)}
                </Badge>
              )}
              <Badge variant="soft" size="2">
                Technique
              </Badge>
              {viewerState.handednessResult && (
                <Badge variant="soft" size="2">
                  {viewerState.handednessResult.dominantHand === "right" ? "Right" : "Left"}-handed
                </Badge>
              )}
            </Flex>

            <Flex align="center" gap="2">
              {/* View Swings / View Player toggle */}
              {swingCount > 0 && (
                <Tooltip content={viewMode === "player" ? "View detected swings" : "View full video"}>
                  <IconButton
                    size="2"
                    variant={viewMode === "swings" ? "solid" : "ghost"}
                    onClick={() => setViewMode(viewMode === "player" ? "swings" : "player")}
                    style={{ color: "white" }}
                  >
                    {viewMode === "player" ? (
                      <GridIcon width={18} height={18} />
                    ) : (
                      <VideoIcon width={18} height={18} />
                    )}
                  </IconButton>
                </Tooltip>
              )}
              
              <Tooltip content={showPanel ? "Hide settings" : "Show settings"}>
                <IconButton
                  size="2"
                  variant={showPanel ? "solid" : "ghost"}
                  onClick={() => setShowPanel(!showPanel)}
                  style={{ color: "white" }}
                >
                  {showPanel ? (
                    <DoubleArrowRightIcon width={18} height={18} />
                  ) : (
                    <GearIcon width={18} height={18} />
                  )}
                </IconButton>
              </Tooltip>
            </Flex>
          </Flex>

          {/* Video Viewer - always mounted, visibility controlled by viewMode */}
          <Box 
            style={{ 
              flex: viewMode === "player" ? 1 : 0,
              position: "relative",
              display: viewMode === "player" ? "block" : "none",
            }}
          >
            <VideoPoseViewerV2
              ref={viewerRef}
              videoUrl={videoUrl}
              config={config}
              poseEnabled={poseEnabled}
              callbacks={viewerCallbacks}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          </Box>

          {/* Swings Gallery - only visible when in swings mode */}
          {viewMode === "swings" && (
            <Box
              style={{
                flex: 1,
                overflow: "auto",
                padding: "24px",
                backgroundColor: "var(--gray-1)",
              }}
            >
              {/* Gallery Header */}
              {swingCount > 0 && (
                <Flex align="center" justify="between" style={{ marginBottom: "20px" }}>
                  <Flex align="center" gap="3">
                    <Text size="4" weight="bold" style={{ color: "white" }}>
                      Detected Swings
                    </Text>
                    <Box
                      style={{
                        backgroundColor: "var(--blue-9)",
                        color: "white",
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontWeight: 600,
                        fontSize: "14px",
                      }}
                    >
                      {swingCount}
                    </Box>
                  </Flex>
                  <Text size="1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Click a swing to view in full player
                  </Text>
                </Flex>
              )}

              <Flex wrap="wrap" gap="4" justify="start">
                {protocolEvents
                  .filter((e) => e.protocolId === "swing-detection-v3")
                  .map((event, index) => {
                    const metadata = event.metadata as Record<string, unknown>;
                    const swingType = metadata?.swingType as string;
                    const velocityKmh = metadata?.velocityKmh as number;
                    const clipDuration = metadata?.clipDuration as number;
                    const confidence = metadata?.confidence as number;
                    
                    return (
                      <Box
                        key={event.id}
                        style={{
                          width: "200px",
                          cursor: "pointer",
                          transition: "transform 0.2s, box-shadow 0.2s",
                          backgroundColor: "rgba(30, 30, 30, 0.9)",
                          border: "2px solid var(--blue-a5)",
                          borderRadius: "8px",
                          overflow: "hidden",
                        }}
                        onClick={() => {
                          viewerRef.current?.seekTo(event.startTime);
                          setViewMode("player");
                        }}
                      >
                        {/* Swing preview */}
                        <Box
                          style={{
                            height: "100px",
                            backgroundColor: "var(--blue-a3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                          }}
                        >
                          <Box
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "linear-gradient(135deg, var(--blue-a4) 0%, transparent 50%)",
                            }}
                          />
                          <Flex direction="column" align="center" gap="1">
                            <Text
                              size="5"
                              weight="bold"
                              style={{ color: "var(--blue-9)" }}
                            >
                              {swingType === "forehand" ? "FH" : swingType === "backhand" ? "BH" : "Swing"}
                            </Text>
                            <Text size="1" style={{ color: "rgba(255,255,255,0.5)" }}>
                              {event.startTime.toFixed(2)}s - {event.endTime.toFixed(2)}s
                            </Text>
                          </Flex>
                          {/* Swing number badge */}
                          <Box
                            style={{
                              position: "absolute",
                              top: "8px",
                              left: "8px",
                              backgroundColor: "var(--blue-9)",
                              color: "white",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontWeight: 600,
                              fontSize: "12px",
                            }}
                          >
                            #{index + 1}
                          </Box>
                        </Box>

                        {/* Swing info */}
                        <Box style={{ padding: "12px" }}>
                          <Flex justify="between" align="center" style={{ marginBottom: "8px" }}>
                            <Text size="2" weight="medium" style={{ color: "white" }}>
                              {event.label.split(" ").slice(0, 2).join(" ")}
                            </Text>
                            {confidence && (
                              <Text size="1" style={{ color: "rgba(255,255,255,0.5)" }}>
                                {(confidence * 100).toFixed(0)}%
                              </Text>
                            )}
                          </Flex>
                          <Flex gap="3">
                            {velocityKmh && (
                              <Flex direction="column">
                                <Text size="1" style={{ color: "rgba(255,255,255,0.4)" }}>
                                  Speed
                                </Text>
                                <Text size="2" weight="medium" style={{ color: "var(--blue-9)" }}>
                                  {velocityKmh.toFixed(0)} km/h
                                </Text>
                              </Flex>
                            )}
                            {clipDuration && (
                              <Flex direction="column">
                                <Text size="1" style={{ color: "rgba(255,255,255,0.4)" }}>
                                  Duration
                                </Text>
                                <Text size="2" weight="medium" style={{ color: "white" }}>
                                  {clipDuration.toFixed(1)}s
                                </Text>
                              </Flex>
                            )}
                          </Flex>
                        </Box>
                      </Box>
                    );
                  })}
              </Flex>

              {swingCount === 0 && (
                <Flex
                  align="center"
                  justify="center"
                  style={{ height: "300px" }}
                >
                  <Flex direction="column" align="center" gap="3">
                    <GridIcon width={48} height={48} style={{ color: "rgba(255,255,255,0.2)" }} />
                    <Text size="2" style={{ color: "rgba(255,255,255,0.4)" }}>
                      No swings detected yet
                    </Text>
                    <Text size="1" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Enable Swing Detection V3 in settings and preprocess the video
                    </Text>
                  </Flex>
                </Flex>
              )}
            </Box>
          )}

          {/* Timeline Scrubber - only show in player mode */}
          {viewMode === "player" && (
            <Box
              style={{
                padding: "8px 16px 12px",
                backgroundColor: "var(--gray-1)",
                borderTop: "1px solid var(--gray-a5)",
              }}
            >
              {/* Time display */}
              <Flex justify="between" style={{ marginBottom: "6px" }}>
                <Text size="1" style={{ color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace" }}>
                  {viewerState.currentTime.toFixed(2)}s
                </Text>
                <Text size="1" style={{ color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace" }}>
                  {viewerState.currentFrame} / {viewerState.totalFrames}
                </Text>
                <Text size="1" style={{ color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace" }}>
                  {viewerState.duration.toFixed(2)}s
                </Text>
              </Flex>

              {/* Protocol Event Markers - above timeline */}
              {protocolEvents.length > 0 && (
                <Flex
                  style={{
                    position: "relative",
                    height: "24px",
                    marginBottom: "4px",
                  }}
                >
                  {protocolEvents.map((event) => {
                    const startPercent = viewerState.duration > 0 
                      ? (event.startTime / viewerState.duration) * 100 
                      : 0;
                    const endPercent = viewerState.duration > 0 
                      ? (event.endTime / viewerState.duration) * 100 
                      : 0;
                    const widthPercent = Math.max(1, endPercent - startPercent);
                    const isRange = event.endFrame !== event.startFrame;
                    const color = "var(--blue-9)";
                    
                    return (
                      <Tooltip key={event.id} content={`${event.label} (${event.startTime.toFixed(2)}s)`}>
                        <Box
                          onClick={() => viewerRef.current?.seekTo(event.startTime)}
                          style={{
                            position: "absolute",
                            left: `${startPercent}%`,
                            width: isRange ? `${widthPercent}%` : "6px",
                            height: "20px",
                            backgroundColor: color,
                            borderRadius: "4px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: `0 0 8px ${color}80`,
                            transition: "transform 0.15s, box-shadow 0.15s",
                          }}
                        >
                          {isRange && widthPercent > 3 && (
                            <Text size="1" style={{ color: "black", fontSize: "9px", fontWeight: 600 }}>
                              {event.label.split(" ")[0] === "?" ? "Swing" : event.label.split(" ")[0]}
                            </Text>
                          )}
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Flex>
              )}
              
              {/* Draggable Timeline */}
              <Box
                style={{
                  position: "relative",
                  height: "32px",
                  backgroundColor: "var(--gray-3)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  touchAction: "none",
                }}
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const handleSeek = (clientX: number) => {
                    const x = clientX - rect.left;
                    const percent = Math.max(0, Math.min(1, x / rect.width));
                    const time = percent * viewerState.duration;
                    viewerRef.current?.seekTo(time);
                  };
                  
                  handleSeek(e.clientX);
                  
                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    handleSeek(moveEvent.clientX);
                  };
                  
                  const handleMouseUp = () => {
                    document.removeEventListener("mousemove", handleMouseMove);
                    document.removeEventListener("mouseup", handleMouseUp);
                  };
                  
                  document.addEventListener("mousemove", handleMouseMove);
                  document.addEventListener("mouseup", handleMouseUp);
                }}
              >
                {/* Progress bar */}
                <Box
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: `${viewerState.duration > 0 ? (viewerState.currentTime / viewerState.duration) * 100 : 0}%`,
                    backgroundColor: "#7ADB8F",
                    borderRadius: "4px 0 0 4px",
                    transition: "width 0.05s ease-out",
                  }}
                />
                
                {/* Playhead */}
                <Box
                  style={{
                    position: "absolute",
                    top: "-2px",
                    left: `${viewerState.duration > 0 ? (viewerState.currentTime / viewerState.duration) * 100 : 0}%`,
                    transform: "translateX(-50%)",
                    width: "4px",
                    height: "36px",
                    backgroundColor: "#fff",
                    borderRadius: "2px",
                    boxShadow: "0 0 4px rgba(0, 0, 0, 0.5)",
                  }}
                />
                
                {/* Frame markers (every 10%) */}
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((percent) => (
                  <Box
                    key={percent}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: `${percent}%`,
                      transform: "translateY(-50%)",
                      width: "1px",
                      height: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                    }}
                  />
                ))}
              </Box>

            </Box>
          )}
        </Box>

        {/* Configuration Panel */}
        {showPanel && (
          <Box
            style={{
              width: "400px",
              height: "100%",
              borderLeft: "1px solid var(--gray-a5)",
              overflow: "auto",
            }}
          >
            <PoseConfigurationPanel
              config={config}
              onConfigChange={setConfig}
              state={viewerState}
              actions={viewerRef.current}
              poseEnabled={poseEnabled}
              onPoseEnabledChange={setPoseEnabled}
            />
          </Box>
        )}
      </Flex>
    </Box>
  );
}
