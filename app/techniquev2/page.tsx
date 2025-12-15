"use client";

/**
 * TechniqueV2 Page
 * 
 * A clean testing page for VideoPoseViewerV2 with external configuration panel.
 * The viewer and configuration are separate components that communicate via props.
 */

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Box,
  Container,
  Flex,
  Text,
  Card,
  TextField,
  Button,
  Heading,
  IconButton,
  Tooltip,
  DropdownMenu,
  Spinner,
} from "@radix-ui/themes";
import {
  PlayIcon,
  Link2Icon,
  Cross2Icon,
  GearIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  VideoIcon,
  GridIcon,
  ArrowLeftIcon,
  DotsVerticalIcon,
  DownloadIcon,
} from "@radix-ui/react-icons";
import { useFFmpegClip, downloadBlob } from "@/hooks";
import buttonStyles from "@/styles/buttons.module.css";

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

// ============================================================================
// Page Component
// ============================================================================

export default function TechniqueV2Page() {
  return (
    <Suspense fallback={<TechniqueV2Loading />}>
      <TechniqueV2Content />
    </Suspense>
  );
}

function TechniqueV2Loading() {
  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "rgba(255, 255, 255, 0.5)" }}>Loading...</Text>
    </Box>
  );
}

function TechniqueV2Content() {
  const searchParams = useSearchParams();

  // URL state
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  // Lite mode from URL - hides top bar, bottom frame, and settings panel
  const lite = searchParams.get("lite") === "true";

  // Viewer configuration (externally controlled)
  const [config, setConfig] = useState<ViewerConfig>(DEFAULT_VIEWER_CONFIG);

  // Pose enabled state
  const [poseEnabled, setPoseEnabled] = useState(true);

  // Panel visibility - default to hidden in lite mode
  const [showPanel, setShowPanel] = useState(!lite);

  // View mode: "player" shows video player, "swings" shows swing gallery
  const [viewMode, setViewMode] = useState<"player" | "swings">("player");
  
  // Selected swing for isolated playback (clip boundaries)
  const [selectedSwing, setSelectedSwing] = useState<{
    startTime: number;
    endTime: number;
    label: string;
  } | null>(null);

  // Protocol events (detected by enabled protocols after preprocessing)
  const [protocolEvents, setProtocolEvents] = useState<ProtocolEvent[]>([]);
  
  // Thumbnails for swing events (event.id -> dataURL)
  const [swingThumbnails, setSwingThumbnails] = useState<Map<string, string>>(new Map());

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
    activeTab: "swings",
    error: null,
  });

  // Viewer ref for actions
  const viewerRef = useRef<ViewerActions>(null);

  // FFmpeg clip extraction
  const { extractClip, isLoading: isFFmpegLoading, isExtracting, progress: extractProgress, error: extractError } = useFFmpegClip();
  const [extractingEventId, setExtractingEventId] = useState<string | null>(null);

  // Handle clip download
  const handleDownloadClip = useCallback(async (event: ProtocolEvent) => {
    if (!loadedUrl || isExtracting) return;
    
    setExtractingEventId(event.id);
    
    try {
      const blob = await extractClip(loadedUrl, event.startTime, event.endTime);
      
      if (blob) {
        const swingType = (event.metadata?.swingType as string) || "swing";
        const filename = `${swingType}_${event.startTime.toFixed(1)}s-${event.endTime.toFixed(1)}s.mp4`;
        downloadBlob(blob, filename);
      }
    } catch (err) {
      console.error("Failed to download clip:", err);
    } finally {
      setExtractingEventId(null);
    }
  }, [loadedUrl, isExtracting, extractClip]);

  // Load video from URL query parameter
  useEffect(() => {
    const videoParam = searchParams.get("video");
    if (videoParam) {
      setLoadedUrl(videoParam);
      setVideoUrl(videoParam);
    }
  }, [searchParams]);

  // Handle loading video
  const handleLoadVideo = useCallback(() => {
    if (videoUrl.trim()) {
      setLoadedUrl(videoUrl.trim());
    }
  }, [videoUrl]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleLoadVideo();
      }
    },
    [handleLoadVideo]
  );

  const handleClear = useCallback(() => {
    setLoadedUrl(null);
    setVideoUrl("");
    setViewerState((prev) => ({
      ...prev,
      isVideoReady: false,
      isPlaying: false,
      currentPoses: [],
    }));
  }, []);

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

  // Capture thumbnails for swing events at their peak/contact moment
  const captureThumbnailsRef = useRef<boolean>(false);
  
  useEffect(() => {
    const swingEvents = protocolEvents.filter(e => e.protocolId === "swing-detection-v3");
    if (swingEvents.length === 0 || captureThumbnailsRef.current) return;
    
    // Get video element from viewer
    const videoContainer = document.querySelector('video');
    if (!videoContainer || !viewerState.isVideoReady) return;
    
    captureThumbnailsRef.current = true;
    
    const captureFrame = async (video: HTMLVideoElement, time: number): Promise<string> => {
      return new Promise((resolve) => {
        const originalTime = video.currentTime;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        const handleSeeked = () => {
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
          } else {
            resolve('');
          }
          video.removeEventListener('seeked', handleSeeked);
          // Restore original time
          video.currentTime = originalTime;
        };
        
        video.addEventListener('seeked', handleSeeked);
        video.currentTime = time;
      });
    };
    
    const captureAllThumbnails = async () => {
      const thumbnails = new Map<string, string>();
      const video = videoContainer as HTMLVideoElement;
      const wasPlaying = !video.paused;
      
      if (wasPlaying) {
        video.pause();
      }
      
      for (const event of swingEvents) {
        const metadata = event.metadata as Record<string, unknown>;
        const contactFrame = metadata?.contactFrame as number;
        const fps = viewerState.videoFPS || 30;
        const contactTime = contactFrame ? contactFrame / fps : (event.startTime + event.endTime) / 2;
        
        try {
          const dataUrl = await captureFrame(video, contactTime);
          if (dataUrl) {
            thumbnails.set(event.id, dataUrl);
          }
        } catch (err) {
          console.error('Failed to capture thumbnail:', err);
        }
      }
      
      setSwingThumbnails(thumbnails);
      
      if (wasPlaying) {
        video.play();
      }
    };
    
    // Small delay to ensure video is ready
    setTimeout(captureAllThumbnails, 200);
  }, [protocolEvents, viewerState.isVideoReady, viewerState.videoFPS]);

  // Reset thumbnails when video changes
  useEffect(() => {
    setSwingThumbnails(new Map());
    captureThumbnailsRef.current = false;
  }, [loadedUrl]);

  // Seek to selected swing when it changes
  const lastSeekTimeRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (selectedSwing && viewMode === "player") {
      // Only seek if we haven't already sought to this time
      if (lastSeekTimeRef.current !== selectedSwing.startTime) {
        lastSeekTimeRef.current = selectedSwing.startTime;
        // Immediate seek since viewer stays mounted
        viewerRef.current?.seekTo(selectedSwing.startTime);
        // Backup attempt in case first didn't work
        setTimeout(() => {
          viewerRef.current?.seekTo(selectedSwing.startTime);
        }, 100);
      }
    }
  }, [selectedSwing, viewMode]);

  // Reset the seek ref when clearing selected swing
  useEffect(() => {
    if (!selectedSwing) {
      lastSeekTimeRef.current = null;
    }
  }, [selectedSwing]);

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

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#0a0a0a",
        overflow: "hidden",
      }}
    >
      {!loadedUrl ? (
        // URL Input State
        <Container
          size="2"
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Card size="4" style={{ width: "100%", maxWidth: "600px" }}>
            <Flex direction="column" gap="5" align="center" py="4">
              <Heading size="6" weight="bold">
                Technique Analyzer V2
              </Heading>
              <Text size="2" color="gray" align="center">
                Paste a video URL to analyze technique with AI pose overlay
              </Text>

              <Flex gap="3" style={{ width: "100%" }}>
                <Box style={{ flex: 1 }}>
                  <TextField.Root
                    size="3"
                    placeholder="https://example.com/video.mp4"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                  >
                    <TextField.Slot>
                      <Link2Icon height="16" width="16" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>
                <Button
                  size="3"
                  onClick={handleLoadVideo}
                  disabled={!videoUrl.trim()}
                  className={buttonStyles.actionButton}
                >
                  <PlayIcon width="16" height="16" />
                  Load
                </Button>
              </Flex>

              <Text size="1" color="gray">
                Supported: MP4, WebM, MOV, HLS streams
              </Text>

              {/* Quick test videos */}
              <Flex direction="column" gap="2" style={{ width: "100%" }}>
                <Text size="1" weight="medium" color="gray">
                  Test Videos (CORS-enabled):
                </Text>
                <Flex wrap="wrap" gap="2">
                  <Button
                    size="1"
                    variant="soft"
                    onClick={() => {
                      setVideoUrl(
                        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                      );
                    }}
                  >
                    Big Buck Bunny
                  </Button>
                  <Button
                    size="1"
                    variant="soft"
                    onClick={() => {
                      setVideoUrl(
                        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
                      );
                    }}
                  >
                    Sample Video
                  </Button>
                </Flex>
                <Text size="1" color="gray">
                  Note: For best results, upload videos to S3 or use local files
                </Text>
              </Flex>
            </Flex>
          </Card>
        </Container>
      ) : (
        // Viewer State
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
            {/* Top Bar - hidden in lite mode */}
            {!lite && (
              <Flex
                align="center"
                justify="between"
                style={{
                  padding: "12px 16px",
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <Flex align="center" gap="3">
                  <Tooltip content="Close video">
                    <IconButton
                      size="2"
                      variant="ghost"
                      onClick={handleClear}
                      style={{ color: "white" }}
                    >
                      <Cross2Icon width={18} height={18} />
                    </IconButton>
                  </Tooltip>
                  <Text
                    size="2"
                    style={{
                      color: "rgba(255, 255, 255, 0.7)",
                      maxWidth: "300px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selectedSwing ? (
                      <Flex align="center" gap="2">
                        <Box
                          style={{
                            width: "8px",
                            height: "8px",
                            backgroundColor: PROTOCOL_EVENT_COLORS["swing-detection-v3"],
                            borderRadius: "2px",
                          }}
                        />
                        <span>{selectedSwing.label}</span>
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>
                          ({selectedSwing.startTime.toFixed(1)}s - {selectedSwing.endTime.toFixed(1)}s)
                        </span>
                      </Flex>
                    ) : viewMode === "swings" ? (
                      "Detected Swings"
                    ) : (
                      loadedUrl
                    )}
                  </Text>
                </Flex>

                <Flex align="center" gap="2">
                  {viewMode === "player" && !selectedSwing && (
                    <Text
                      size="1"
                      style={{ color: "rgba(255, 255, 255, 0.5)", marginRight: "8px" }}
                    >
                      {viewerState.currentFrame} / {viewerState.totalFrames} •{" "}
                      {viewerState.currentTime.toFixed(2)}s
                    </Text>
                  )}
                  {selectedSwing && (
                    <Tooltip content="Back to full video">
                      <Button
                        size="1"
                        variant="soft"
                        onClick={() => setSelectedSwing(null)}
                        style={{ marginRight: "8px" }}
                      >
                        <ArrowLeftIcon width={14} height={14} />
                        Back to Full
                      </Button>
                    </Tooltip>
                  )}
                  {/* View Swings / View Player toggle */}
                  {protocolEvents.filter(e => e.protocolId === "swing-detection-v3").length > 0 && (
                    <Tooltip content={viewMode === "player" ? "View detected swings" : "View full video"}>
                      <IconButton
                        size="2"
                        variant={viewMode === "swings" ? "solid" : "ghost"}
                        onClick={() => {
                          setViewMode(viewMode === "player" ? "swings" : "player");
                          setSelectedSwing(null);
                        }}
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
            )}

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
                videoUrl={loadedUrl}
                config={config}
                poseEnabled={selectedSwing ? false : poseEnabled}
                callbacks={viewerCallbacks}
                lite={lite}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
            </Box>

            {/* Swings Gallery - only visible when in swings mode, hidden in lite mode */}
            {viewMode === "swings" && !lite && (
              /* Swings Gallery View */
              <Box
                style={{
                  flex: 1,
                  overflow: "auto",
                  padding: "24px",
                  backgroundColor: "#0a0a0a",
                }}
              >
                {/* Gallery Header */}
                {protocolEvents.filter((e) => e.protocolId === "swing-detection-v3").length > 0 && (
                  <Flex align="center" justify="between" style={{ marginBottom: "20px" }}>
                    <Flex align="center" gap="3">
                      <Text size="4" weight="bold" style={{ color: "white" }}>
                        Detected Swings
                      </Text>
                      <Box
                        style={{
                          backgroundColor: PROTOCOL_EVENT_COLORS["swing-detection-v3"],
                          color: "black",
                          padding: "2px 10px",
                          borderRadius: "12px",
                          fontWeight: 600,
                          fontSize: "14px",
                        }}
                      >
                        {protocolEvents.filter((e) => e.protocolId === "swing-detection-v3").length}
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
                        <Card
                          key={event.id}
                          style={{
                            width: "280px",
                            cursor: "pointer",
                            transition: "transform 0.2s, box-shadow 0.2s",
                            backgroundColor: "rgba(30, 30, 30, 0.9)",
                            border: `2px solid ${event.color}40`,
                          }}
                          onClick={() => {
                            setSelectedSwing({
                              startTime: event.startTime,
                              endTime: event.endTime,
                              label: event.label,
                            });
                            setViewMode("player");
                            // The useEffect will handle seeking when view switches and video is ready
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.02)";
                            e.currentTarget.style.boxShadow = `0 8px 24px ${event.color}40`;
                            e.currentTarget.style.borderColor = event.color;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.borderColor = `${event.color}40`;
                          }}
                        >
                          {/* Swing preview with thumbnail */}
                          <Box
                            style={{
                              height: "160px",
                              backgroundColor: event.color + "20",
                              borderRadius: "6px 6px 0 0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                            {/* Thumbnail image */}
                            {swingThumbnails.get(event.id) ? (
                              <Image
                                src={swingThumbnails.get(event.id) || ""}
                                alt={`Swing ${index + 1}`}
                                fill
                                sizes="300px"
                                style={{
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <>
                                <Box
                                  style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: `linear-gradient(135deg, ${event.color}30 0%, transparent 50%)`,
                                  }}
                                />
                                <Flex direction="column" align="center" gap="1">
                                  <Text
                                    size="6"
                                    weight="bold"
                                    style={{ color: event.color }}
                                  >
                                    {swingType === "forehand" ? "FH" : swingType === "backhand" ? "BH" : "?"}
                                  </Text>
                                  <Text size="1" style={{ color: "rgba(255,255,255,0.5)" }}>
                                    {event.startTime.toFixed(2)}s - {event.endTime.toFixed(2)}s
                                  </Text>
                                </Flex>
                              </>
                            )}
                            {/* Swing type badge overlay */}
                            {swingThumbnails.get(event.id) && (
                              <Box
                                style={{
                                  position: "absolute",
                                  top: "8px",
                                  right: "8px",
                                  backgroundColor: event.color,
                                  color: "black",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontWeight: 700,
                                  fontSize: "14px",
                                }}
                              >
                                {swingType === "forehand" ? "FH" : swingType === "backhand" ? "BH" : "?"}
                              </Box>
                            )}
                            {/* Swing number badge */}
                            <Box
                              style={{
                                position: "absolute",
                                top: "8px",
                                left: "8px",
                                backgroundColor: event.color,
                                color: "black",
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
                              <Flex align="center" gap="2">
                                <Text size="2" weight="medium" style={{ color: "white" }}>
                                  {event.label.split(" ").slice(0, 2).join(" ")}
                                </Text>
                                {confidence && (
                                  <Text size="1" style={{ color: "rgba(255,255,255,0.5)" }}>
                                    {(confidence * 100).toFixed(0)}%
                                  </Text>
                                )}
                              </Flex>
                              
                              {/* 3-dot menu for clip actions */}
                              <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                  <IconButton
                                    size="1"
                                    variant="ghost"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ color: "rgba(255,255,255,0.6)" }}
                                  >
                                    {extractingEventId === event.id ? (
                                      <Spinner size="1" />
                                    ) : (
                                      <DotsVerticalIcon width={14} height={14} />
                                    )}
                                  </IconButton>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content
                                  size="1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <DropdownMenu.Item
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadClip(event);
                                    }}
                                    disabled={isExtracting}
                                  >
                                    <DownloadIcon width={14} height={14} />
                                    {isFFmpegLoading && extractingEventId === event.id
                                      ? "Loading FFmpeg..."
                                      : extractingEventId === event.id
                                      ? `Extracting ${extractProgress}%`
                                      : "Download Clip"}
                                  </DropdownMenu.Item>
                                </DropdownMenu.Content>
                              </DropdownMenu.Root>
                            </Flex>
                            <Flex gap="3">
                              {velocityKmh && (
                                <Flex direction="column">
                                  <Text size="1" style={{ color: "rgba(255,255,255,0.4)" }}>
                                    Speed
                                  </Text>
                                  <Text size="2" weight="medium" style={{ color: event.color }}>
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
                        </Card>
                      );
                    })}
                </Flex>

                {protocolEvents.filter((e) => e.protocolId === "swing-detection-v3").length === 0 && (
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
                        Enable Swing Detection V3 and preprocess the video
                      </Text>
                    </Flex>
                  </Flex>
                )}
              </Box>
            )}

            {/* Timeline Scrubber - only show in player mode, hidden in lite mode */}
            {viewMode === "player" && !lite && (
            <Box
              style={{
                padding: "8px 16px 12px",
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Time display */}
              <Flex justify="between" style={{ marginBottom: "6px" }}>
                <Text size="1" style={{ color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace" }}>
                  {viewerState.currentTime.toFixed(2)}s
                </Text>
                <Text size="1" style={{ color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace" }}>
                  Frame {viewerState.currentFrame} / {viewerState.totalFrames}
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
                    const color = event.color || PROTOCOL_EVENT_COLORS[event.protocolId] || "#FF6B6B";
                    
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
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scaleY(1.2)";
                            e.currentTarget.style.boxShadow = `0 0 12px ${color}`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scaleY(1)";
                            e.currentTarget.style.boxShadow = `0 0 8px ${color}80`;
                          }}
                        >
                          {isRange && widthPercent > 3 && (
                            <Text size="1" style={{ color: "black", fontSize: "9px", fontWeight: 600 }}>
                              {event.label.split(" ")[0]}
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
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
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
                onTouchStart={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const handleSeek = (clientX: number) => {
                    const x = clientX - rect.left;
                    const percent = Math.max(0, Math.min(1, x / rect.width));
                    const time = percent * viewerState.duration;
                    viewerRef.current?.seekTo(time);
                  };
                  
                  if (e.touches[0]) {
                    handleSeek(e.touches[0].clientX);
                  }
                  
                  const handleTouchMove = (moveEvent: TouchEvent) => {
                    if (moveEvent.touches[0]) {
                      handleSeek(moveEvent.touches[0].clientX);
                    }
                  };
                  
                  const handleTouchEnd = () => {
                    document.removeEventListener("touchmove", handleTouchMove);
                    document.removeEventListener("touchend", handleTouchEnd);
                  };
                  
                  document.addEventListener("touchmove", handleTouchMove);
                  document.addEventListener("touchend", handleTouchEnd);
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

              {/* Protocol Events Legend */}
              {protocolEvents.length > 0 && (
                <Flex gap="3" style={{ marginTop: "8px" }}>
                  {Array.from(new Set(protocolEvents.map(e => e.protocolId))).map(protocolId => {
                    const protocol = AVAILABLE_PROTOCOLS.find(p => p.id === protocolId);
                    const color = PROTOCOL_EVENT_COLORS[protocolId] || "#888";
                    const count = protocolEvents.filter(e => e.protocolId === protocolId).length;
                    return (
                      <Flex key={protocolId} align="center" gap="1">
                        <Box
                          style={{
                            width: "8px",
                            height: "8px",
                            backgroundColor: color,
                            borderRadius: "2px",
                          }}
                        />
                        <Text size="1" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                          {protocol?.name || protocolId} ({count})
                        </Text>
                      </Flex>
                    );
                  })}
                </Flex>
              )}
            </Box>
            )}
          </Box>

          {/* Configuration Panel - hidden in lite mode */}
          {showPanel && !lite && (
            <Box
              style={{
                width: "400px",
                height: "100%",
                borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
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
      )}
    </Box>
  );
}

