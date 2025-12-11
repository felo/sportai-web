"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, IconButton, Tooltip, Text, Button, Badge, ContextMenu, DropdownMenu } from "@radix-ui/themes";
import { 
  ArrowLeftIcon, 
  GearIcon, 
  DoubleArrowRightIcon,
  GridIcon,
  VideoIcon,
  PlusIcon,
  ResetIcon,
  TrashIcon,
  ChatBubbleIcon,
  AngleIcon,
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
  ANGLE_PRESETS,
} from "@/components/videoPoseViewerV2";
import { getSportColor } from "@/components/tasks/viewer/utils";
import { LoadingState } from "@/components/tasks/viewer/components/LoadingState";
import { ServerDataDebugPanel } from "./ServerDataDebugPanel";
import { CustomEventDialog, type CustomEvent, VideoCommentDialog, type VideoComment } from "./components";
import { 
  loadPoseData, 
  savePoseData, 
  convertToPreprocessedPoses, 
  convertToProtocolAdjustments,
  convertToSwingBoundaryAdjustments,
  type StoredCustomEvent,
  type StoredVideoComment,
} from "@/lib/poseDataService";
import { extractS3KeyFromUrl } from "@/lib/s3";

interface TechniqueViewerProps {
  videoUrl: string;
  onBack?: () => void;
  /** Sport name (e.g., "Tennis", "Padel") */
  sport?: string;
  /** Task ID for server data persistence */
  taskId?: string;
  /** Developer mode - shows additional debug info */
  developerMode?: boolean;
}

export function TechniqueViewer({ videoUrl, onBack, sport, taskId, developerMode = false }: TechniqueViewerProps) {
  // Viewer configuration (externally controlled)
  const [config, setConfig] = useState<ViewerConfig>(DEFAULT_VIEWER_CONFIG);

  // Pose enabled state - start disabled if we have videoS3Key (to check server first)
  // Note: videoS3Key is derived from videoUrl via useMemo, but we need this check early
  const hasVideoS3Key = !!extractS3KeyFromUrl(videoUrl);
  const [poseEnabled, setPoseEnabled] = useState(!hasVideoS3Key);

  // Panel visibility
  const [showPanel, setShowPanel] = useState(false);

  // View mode: "player" shows video player, "swings" shows swing gallery
  const [viewMode, setViewMode] = useState<"player" | "swings">("player");

  // Server data loading state
  const [serverDataLoaded, setServerDataLoaded] = useState(false);
  const [serverDataChecked, setServerDataChecked] = useState(false); // Prevents retry loop
  const [isLoadingServerData, setIsLoadingServerData] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false); // Track if we've auto-saved
  
  // Overall pose detection confidence (average across all frames)
  const [overallConfidence, setOverallConfidence] = useState<number | null>(null);
  
  // Confidence threshold for data analysis chart (user preference, persisted per task)
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.3);

  // Protocol events (detected by enabled protocols after preprocessing)
  const [protocolEvents, setProtocolEvents] = useState<ProtocolEvent[]>([]);

  // Custom events (user-created markers on the timeline)
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [customEventDialogOpen, setCustomEventDialogOpen] = useState(false);
  const [pendingCustomEventTime, setPendingCustomEventTime] = useState<{ time: number; frame: number } | null>(null);

  // Drag state for timeline markers
  const [draggedMarker, setDraggedMarker] = useState<{
    type: "custom" | "protocol";
    id: string;
    originalTime: number;
  } | null>(null);
  const [dragPreviewTime, setDragPreviewTime] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Protocol event position adjustments (for AI-detected events that user has moved)
  const [protocolAdjustments, setProtocolAdjustments] = useState<Map<string, { time: number; frame: number }>>(new Map());
  
  // Swing boundary adjustments (for adjusting start/end of detected swings)
  const [swingBoundaryAdjustments, setSwingBoundaryAdjustments] = useState<Map<string, {
    startTime?: number;
    startFrame?: number;
    endTime?: number;
    endFrame?: number;
  }>>(new Map());
  
  // Swing edge dragging state
  const [swingEdgeDrag, setSwingEdgeDrag] = useState<{
    eventId: string;
    edge: "start" | "end";
    originalTime: number;
  } | null>(null);
  const [swingEdgePreviewTime, setSwingEdgePreviewTime] = useState<number | null>(null);
  
  // Dirty flags for tracking what needs to be saved (prevents race conditions between different save types)
  const [dirtyFlags, setDirtyFlags] = useState({
    videoComments: false,
    swingBoundaries: false,
    protocolAdjustments: false,
    customEvents: false,
    userPreferences: false,
  });

  // Context menu state for right-click actions
  const [contextMenuPosition, setContextMenuPosition] = useState<{ time: number; frame: number } | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<{
    type: "custom" | "protocol" | "empty";
    id?: string;
    eventType?: string;
  } | null>(null);

  // Extract video S3 key from URL for pose data persistence
  // This allows pose data to be shared between Chat and TechniqueViewer
  const videoS3Key = useMemo(() => extractS3KeyFromUrl(videoUrl), [videoUrl]);

  // Video comments (position-based markers on the video)
  const [videoComments, setVideoComments] = useState<VideoComment[]>([]);
  const [videoCommentDialogOpen, setVideoCommentDialogOpen] = useState(false);
  const [pendingVideoComment, setPendingVideoComment] = useState<{
    x: number;
    y: number;
    time: number;
    frame: number;
  } | null>(null);
  const [selectedVideoComment, setSelectedVideoComment] = useState<string | null>(null);
  const videoOverlayRef = useRef<HTMLDivElement>(null);
  const commentContainerRef = useRef<HTMLDivElement>(null);
  
  // Comment dragging state
  const [draggedComment, setDraggedComment] = useState<{
    id: string;
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
  } | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Annotation mode - when enabled, clicks on video add comments (like Figma's comment mode)
  const [annotationMode, setAnnotationMode] = useState(false);

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
    detectedVideoFPS: null,
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
      // Only update detectedVideoFPS when actually detected from video, not when loaded from metadata
      detectedVideoFPS: method !== 'metadata' ? fps : prev.detectedVideoFPS,
      fpsDetectionMethod: method,
      totalFrames: Math.floor(prev.duration * fps),
    }));
  }, []);

  const handlePreprocessComplete = useCallback(async (frameCount: number, fps: number) => {
    console.log(`[TechniqueViewer] handlePreprocessComplete called: ${frameCount} frames, ${fps} fps`);
    
    setViewerState((prev) => ({
      ...prev,
      usingPreprocessedPoses: true,
      preprocessedFrameCount: frameCount,
      isPreprocessing: false,
    }));

    // Calculate overall confidence from preprocessed poses
    if (viewerRef.current) {
      const poses = viewerRef.current.getPreprocessedPoses();
      if (poses.size > 0) {
        let totalScore = 0;
        let scoreCount = 0;
        
        poses.forEach((framePoses) => {
          framePoses.forEach((pose) => {
            if (pose.score !== undefined && pose.score > 0) {
              totalScore += pose.score;
              scoreCount++;
            }
          });
        });
        
        if (scoreCount > 0) {
          const avgConfidence = totalScore / scoreCount;
          setOverallConfidence(avgConfidence);
          console.log(`[TechniqueViewer] Average pose confidence: ${(avgConfidence * 100).toFixed(1)}%`);
        }
      }
    }

    // Auto-save to server after preprocessing completes
    // Only save if: we have a videoS3Key, data wasn't loaded from server, and we haven't already saved
    console.log(`[TechniqueViewer] Auto-save check: videoS3Key=${videoS3Key}, serverDataLoaded=${serverDataLoaded}, autoSaved=${autoSaved}, hasRef=${!!viewerRef.current}`);
    
    if (videoS3Key && !serverDataLoaded && !autoSaved && viewerRef.current) {
      const poses = viewerRef.current.getPreprocessedPoses();
      console.log(`[TechniqueViewer] Got ${poses.size} poses from viewer`);
      if (poses.size > 0) {
        console.log(`[TechniqueViewer] Auto-saving ${poses.size} frames to server...`);
        try {
          const result = await savePoseData(videoS3Key, poses, fps, config.model.model);
          if (result.success) {
            setAutoSaved(true);
            console.log(`[TechniqueViewer] Auto-saved successfully`);
          } else {
            console.error(`[TechniqueViewer] Auto-save failed:`, result.error);
          }
        } catch (error) {
          console.error(`[TechniqueViewer] Auto-save error:`, error);
        }
      }
    } else {
      console.log(`[TechniqueViewer] Skipping auto-save (conditions not met)`);
    }
  }, [videoS3Key, serverDataLoaded, autoSaved, config.model.model]);

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

  const handleActiveTabChange = useCallback((activeTab: "swings" | "data-analysis") => {
    setViewerState((prev) => ({ ...prev, activeTab }));
  }, []);

  // Handle confidence threshold change (for data analysis chart)
  const handleConfidenceThresholdChange = useCallback((threshold: number) => {
    setConfidenceThreshold(threshold);
    setDirtyFlags(prev => ({ ...prev, userPreferences: true }));
  }, []);

  // Handle custom event creation
  const handleCreateCustomEvent = useCallback(async (eventData: Omit<CustomEvent, "id" | "createdAt">) => {
    const newEvent: CustomEvent = {
      ...eventData,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    
    const updatedEvents = [...customEvents, newEvent];
    setCustomEvents(updatedEvents);
    setPendingCustomEventTime(null);
    setDirtyFlags(prev => ({ ...prev, customEvents: true })); // Mark for unified save
  }, [customEvents]);

  // Create a video comment
  const handleCreateVideoComment = useCallback(async (commentData: Omit<VideoComment, "id" | "createdAt">) => {
    const newComment: VideoComment = {
      ...commentData,
      id: `vc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    
    const updatedComments = [...videoComments, newComment];
    setVideoComments(updatedComments);
    setPendingVideoComment(null);
    setDirtyFlags(prev => ({ ...prev, videoComments: true })); // Mark for unified save
  }, [videoComments]);

  // Delete a video comment
  const handleDeleteVideoComment = useCallback((commentId: string) => {
    const updatedComments = videoComments.filter((c) => c.id !== commentId);
    setVideoComments(updatedComments);
    setSelectedVideoComment(null);
    setDirtyFlags(prev => ({ ...prev, videoComments: true })); // Mark for unified save
  }, [videoComments]);

  // Handle comment drag start
  const handleCommentDragStart = useCallback((e: React.MouseEvent, commentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const comment = videoComments.find((c) => c.id === commentId);
    if (!comment) return;
    
    setDraggedComment({
      id: commentId,
      startX: e.clientX,
      startY: e.clientY,
      originalX: comment.x,
      originalY: comment.y,
    });
    setDragPreviewPosition({ x: comment.x, y: comment.y });
    setSelectedVideoComment(commentId);
  }, [videoComments]);

  // Handle comment drag move
  const handleCommentDragMove = useCallback((e: MouseEvent) => {
    if (!draggedComment || !commentContainerRef.current) return;
    
    const rect = commentContainerRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - draggedComment.startX) / rect.width;
    const deltaY = (e.clientY - draggedComment.startY) / rect.height;
    
    const newX = Math.max(0, Math.min(1, draggedComment.originalX + deltaX));
    const newY = Math.max(0, Math.min(1, draggedComment.originalY + deltaY));
    
    setDragPreviewPosition({ x: newX, y: newY });
  }, [draggedComment]);

  // Handle comment drag end
  const handleCommentDragEnd = useCallback(async () => {
    if (!draggedComment || !dragPreviewPosition) {
      setDraggedComment(null);
      setDragPreviewPosition(null);
      return;
    }
    
    // Update the comment position
    const updatedComments = videoComments.map((c) => 
      c.id === draggedComment.id 
        ? { ...c, x: dragPreviewPosition.x, y: dragPreviewPosition.y }
        : c
    );
    setVideoComments(updatedComments);
    setDirtyFlags(prev => ({ ...prev, videoComments: true })); // Mark for unified save
    
    setDraggedComment(null);
    setDragPreviewPosition(null);
  }, [draggedComment, dragPreviewPosition, videoComments]);

  // Effect to handle document-level mouse events for comment dragging
  useEffect(() => {
    if (!draggedComment) return;
    
    const handleMouseMove = (e: MouseEvent) => handleCommentDragMove(e);
    const handleMouseUp = () => handleCommentDragEnd();
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggedComment, handleCommentDragMove, handleCommentDragEnd]);

  // Handle video overlay click for adding comments
  const handleVideoOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don't trigger if clicking on an existing comment marker
    if ((e.target as HTMLElement).closest("[data-video-comment]")) {
      return;
    }
    
    // Check if video is ready
    if (!viewerState.isVideoReady || viewerState.duration <= 0) {
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setPendingVideoComment({
      x,
      y,
      time: viewerState.currentTime,
      frame: viewerState.currentFrame,
    });
    setVideoCommentDialogOpen(true);
  }, [viewerState.isVideoReady, viewerState.duration, viewerState.currentTime, viewerState.currentFrame]);

  // Handle timeline click for custom event creation
  const handleTimelineAreaClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don't create new event if we just finished dragging
    if (draggedMarker) {
      return;
    }
    
    // Only trigger if clicking on empty space (not on existing events)
    if ((e.target as HTMLElement).closest("[data-event-marker]")) {
      return;
    }
    
    // Check if video is ready with valid duration
    if (viewerState.duration <= 0) {
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const time = percent * viewerState.duration;
    const frame = Math.floor(time * viewerState.videoFPS);
    
    setPendingCustomEventTime({ time, frame });
    setCustomEventDialogOpen(true);
  }, [viewerState.duration, viewerState.videoFPS, draggedMarker]);

  // Handle marker drag start
  const handleMarkerDragStart = useCallback((
    e: React.MouseEvent,
    type: "custom" | "protocol",
    id: string,
    originalTime: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedMarker({ type, id, originalTime });
    setDragPreviewTime(originalTime);
  }, []);

  // Handle marker drag move
  const handleMarkerDragMove = useCallback((e: MouseEvent) => {
    if (!draggedMarker || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percent * viewerState.duration;
    
    setDragPreviewTime(newTime);
    
    // Seek video to preview position
    viewerRef.current?.seekTo(newTime);
  }, [draggedMarker, viewerState.duration]);

  // Handle marker drag end
  const handleMarkerDragEnd = useCallback((e: MouseEvent) => {
    if (!draggedMarker || !timelineRef.current) {
      setDraggedMarker(null);
      setDragPreviewTime(null);
      return;
    }
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percent * viewerState.duration;
    const newFrame = Math.floor(newTime * viewerState.videoFPS);
    
    if (draggedMarker.type === "custom") {
      // Update custom event position
      setCustomEvents((prev) => 
        prev.map((event) =>
          event.id === draggedMarker.id
            ? { ...event, time: newTime, frame: newFrame }
            : event
        )
      );
      setDirtyFlags(prev => ({ ...prev, customEvents: true })); // Mark for unified save
    } else {
      // Update protocol event adjustment
      setProtocolAdjustments((prev) => {
        const next = new Map(prev);
        next.set(draggedMarker.id, { time: newTime, frame: newFrame });
        return next;
      });
      setDirtyFlags(prev => ({ ...prev, protocolAdjustments: true })); // Mark for unified save
    }
    
    setDraggedMarker(null);
    setDragPreviewTime(null);
  }, [draggedMarker, viewerState.duration, viewerState.videoFPS]);

  // Set up global mouse listeners for dragging
  useEffect(() => {
    if (draggedMarker) {
      document.addEventListener("mousemove", handleMarkerDragMove);
      document.addEventListener("mouseup", handleMarkerDragEnd);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      
      return () => {
        document.removeEventListener("mousemove", handleMarkerDragMove);
        document.removeEventListener("mouseup", handleMarkerDragEnd);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [draggedMarker, handleMarkerDragMove, handleMarkerDragEnd]);

  // Handle swing edge drag start
  const handleSwingEdgeDragStart = useCallback((
    e: React.MouseEvent,
    eventId: string,
    edge: "start" | "end",
    originalTime: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSwingEdgeDrag({ eventId, edge, originalTime });
    setSwingEdgePreviewTime(originalTime);
  }, []);

  // Handle swing edge drag move
  const handleSwingEdgeDragMove = useCallback((e: MouseEvent) => {
    if (!swingEdgeDrag || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percent * viewerState.duration;
    
    setSwingEdgePreviewTime(newTime);
    
    // Seek video to preview position
    viewerRef.current?.seekTo(newTime);
  }, [swingEdgeDrag, viewerState.duration]);

  // Handle swing edge drag end
  const handleSwingEdgeDragEnd = useCallback(() => {
    if (!swingEdgeDrag || swingEdgePreviewTime === null) {
      setSwingEdgeDrag(null);
      setSwingEdgePreviewTime(null);
      return;
    }
    
    // Find the event to get its current boundaries
    const event = protocolEvents.find((e) => e.id === swingEdgeDrag.eventId);
    if (!event) {
      setSwingEdgeDrag(null);
      setSwingEdgePreviewTime(null);
      return;
    }
    
    // Get existing adjustment or create new one
    const existing = swingBoundaryAdjustments.get(event.id) || {};
    const effectiveStart = existing.startTime ?? event.startTime;
    const effectiveEnd = existing.endTime ?? event.endTime;
    
    // Calculate new boundary
    let newAdjustment = { ...existing };
    if (swingEdgeDrag.edge === "start") {
      // Ensure start doesn't go past end
      const maxStartTime = effectiveEnd - 0.05;
      newAdjustment.startTime = Math.min(swingEdgePreviewTime, maxStartTime);
      newAdjustment.startFrame = Math.floor(newAdjustment.startTime * viewerState.videoFPS);
    } else {
      // Ensure end doesn't go before start
      const minEndTime = effectiveStart + 0.05;
      newAdjustment.endTime = Math.max(swingEdgePreviewTime, minEndTime);
      newAdjustment.endFrame = Math.floor(newAdjustment.endTime * viewerState.videoFPS);
    }
    
    setSwingBoundaryAdjustments((prev) => {
      const next = new Map(prev);
      next.set(event.id, newAdjustment);
      return next;
    });
    setDirtyFlags(prev => ({ ...prev, swingBoundaries: true })); // Mark as modified by user
    
    setSwingEdgeDrag(null);
    setSwingEdgePreviewTime(null);
  }, [swingEdgeDrag, swingEdgePreviewTime, protocolEvents, swingBoundaryAdjustments, viewerState.videoFPS]);

  // Set up global mouse listeners for swing edge dragging
  useEffect(() => {
    if (swingEdgeDrag) {
      document.addEventListener("mousemove", handleSwingEdgeDragMove);
      document.addEventListener("mouseup", handleSwingEdgeDragEnd);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
      
      return () => {
        document.removeEventListener("mousemove", handleSwingEdgeDragMove);
        document.removeEventListener("mouseup", handleSwingEdgeDragEnd);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [swingEdgeDrag, handleSwingEdgeDragMove, handleSwingEdgeDragEnd]);

  // Unified debounced save for all dirty data (prevents race conditions between different save types)
  useEffect(() => {
    const hasDirtyData = dirtyFlags.videoComments || dirtyFlags.swingBoundaries || 
                         dirtyFlags.protocolAdjustments || dirtyFlags.customEvents ||
                         dirtyFlags.userPreferences;
    
    // Don't save until server data has been checked - prevents overwriting with empty state on mount
    if (!videoS3Key || !hasDirtyData || !serverDataChecked) {
      if (hasDirtyData && !serverDataChecked) {
        console.log(`[TechniqueViewer] Skipping save - server data not yet checked`);
      }
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      try {
        // Load current server data once
        const { loadPoseData } = await import("@/lib/poseDataService");
        const existing = await loadPoseData(videoS3Key);
        
        // Build updated data with all current state
        // Start with existing data if available, otherwise create minimal structure
        const baseData = existing.success && existing.data 
          ? existing.data 
          : {
              version: "1.0.0",
              createdAt: new Date().toISOString(),
              videoFPS: viewerState.videoFPS || 30,
              totalFrames: viewerState.totalFrames || 0,
              modelUsed: config.model.model || "none",
              poses: {},
            };
        
        const updatedData = {
          videoS3Key,
          ...baseData,
          // Always include current state for all fields that might be dirty
          ...(dirtyFlags.videoComments && { 
            videoComments: videoComments.map(c => ({
              id: c.id,
              title: c.title,
              description: c.description,
              color: c.color,
              x: c.x,
              y: c.y,
              time: c.time,
              frame: c.frame,
              createdAt: c.createdAt,
            }))
          }),
          ...(dirtyFlags.swingBoundaries && {
            swingBoundaryAdjustments: Array.from(swingBoundaryAdjustments.entries()).map(([eventId, adj]) => ({
              eventId,
              startTime: adj.startTime,
              startFrame: adj.startFrame,
              endTime: adj.endTime,
              endFrame: adj.endFrame,
              adjustedAt: Date.now(),
            }))
          }),
          ...(dirtyFlags.protocolAdjustments && {
            protocolAdjustments: Array.from(protocolAdjustments.entries()).map(([eventId, adj]) => ({
              eventId,
              protocolId: "unknown",
              time: adj.time,
              frame: adj.frame,
              adjustedAt: Date.now(),
            }))
          }),
          ...(dirtyFlags.customEvents && {
            customEvents: customEvents.map(e => ({
              id: e.id,
              name: e.name,
              color: e.color,
              time: e.time,
              frame: e.frame,
              createdAt: e.createdAt,
            }))
          }),
          ...(dirtyFlags.userPreferences && {
            userPreferences: {
              confidenceThreshold,
            }
          }),
        };
        
        // Save all at once using new API
        const response = await fetch("/api/pose-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedData),
        });
        
        if (response.ok) {
          console.log(`[TechniqueViewer] Unified save completed`);
          setDirtyFlags({ videoComments: false, swingBoundaries: false, protocolAdjustments: false, customEvents: false, userPreferences: false });
        } else {
          console.error(`[TechniqueViewer] Unified save failed:`, await response.text());
        }
      } catch (error) {
        console.error(`[TechniqueViewer] Unified save error:`, error);
      }
    }, 500); // Debounce 500ms
    
    return () => clearTimeout(timeoutId);
  }, [videoS3Key, dirtyFlags, videoComments, swingBoundaryAdjustments, protocolAdjustments, customEvents, confidenceThreshold, serverDataChecked, viewerState.videoFPS, viewerState.totalFrames, config.model.model]);

  // Helper to get effective swing boundaries (with adjustments)
  const getEffectiveSwingBoundaries = useCallback((event: ProtocolEvent) => {
    const adjustment = swingBoundaryAdjustments.get(event.id);
    return {
      startTime: adjustment?.startTime ?? event.startTime,
      startFrame: adjustment?.startFrame ?? event.startFrame,
      endTime: adjustment?.endTime ?? event.endTime,
      endFrame: adjustment?.endFrame ?? event.endFrame,
      isAdjusted: !!adjustment,
    };
  }, [swingBoundaryAdjustments]);

  // Helper to get effective time for a protocol event (with adjustment)
  const getProtocolEventTime = useCallback((event: ProtocolEvent) => {
    const adjustment = protocolAdjustments.get(event.id);
    return adjustment ? adjustment.time : event.startTime;
  }, [protocolAdjustments]);

  // Context menu handlers
  const handleContextMenuAddMarker = useCallback(() => {
    if (contextMenuPosition) {
      setPendingCustomEventTime(contextMenuPosition);
      setCustomEventDialogOpen(true);
    }
    setContextMenuPosition(null);
    setContextMenuTarget(null);
  }, [contextMenuPosition]);

  const handleContextMenuResetPosition = useCallback(() => {
    if (contextMenuTarget?.type === "protocol" && contextMenuTarget.id) {
      setProtocolAdjustments((prev) => {
        const next = new Map(prev);
        next.delete(contextMenuTarget.id!);
        return next;
      });
      setDirtyFlags(prev => ({ ...prev, protocolAdjustments: true })); // Mark for unified save
    }
    setContextMenuPosition(null);
    setContextMenuTarget(null);
  }, [contextMenuTarget]);

  const handleContextMenuDeleteMarker = useCallback(() => {
    if (contextMenuTarget?.type === "custom" && contextMenuTarget.id) {
      const updatedEvents = customEvents.filter((e) => e.id !== contextMenuTarget.id);
      setCustomEvents(updatedEvents);
      setDirtyFlags(prev => ({ ...prev, customEvents: true })); // Mark for unified save
    }
    setContextMenuPosition(null);
    setContextMenuTarget(null);
  }, [contextMenuTarget, customEvents]);

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
      onActiveTabChange: handleActiveTabChange,
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
      handleActiveTabChange,
    ]
  );

  // Get swing events count
  const swingCount = useMemo(() => {
    return protocolEvents.filter(e => e.protocolId === "swing-detection-v3").length;
  }, [protocolEvents]);

  // Angle preset helpers
  const isAngleActive = useCallback((angle: [number, number, number]) => {
    return config.angles.measuredAngles.some(
      (a) => a[0] === angle[0] && a[1] === angle[1] && a[2] === angle[2]
    );
  }, [config.angles.measuredAngles]);

  const toggleAngle = useCallback((angle: [number, number, number]) => {
    const existing = config.angles.measuredAngles.findIndex(
      (a) => a[0] === angle[0] && a[1] === angle[1] && a[2] === angle[2]
    );
    
    if (existing !== -1) {
      // Remove angle
      setConfig(prev => ({
        ...prev,
        angles: {
          ...prev.angles,
          measuredAngles: prev.angles.measuredAngles.filter((_, i) => i !== existing),
        },
      }));
    } else {
      // Add angle
      setConfig(prev => ({
        ...prev,
        angles: {
          ...prev.angles,
          measuredAngles: [...prev.angles.measuredAngles, angle],
        },
      }));
    }
  }, [config.angles.measuredAngles]);

  // Check if any angles are active
  const hasActiveAngles = config.angles.measuredAngles.length > 0;

  // Auto-load pose data from server if available (runs once)
  useEffect(() => {
    async function loadFromServer() {
      // Only try once - don't retry on failure
      if (!videoS3Key || serverDataChecked || isLoadingServerData) return;
      if (!viewerState.isVideoReady) return; // Wait for video to be ready
      if (!viewerRef.current) return;
      
      setIsLoadingServerData(true);
      
      try {
        const result = await loadPoseData(videoS3Key);
        
        if (result.success && result.data) {
          // Convert stored data to Map format
          const posesMap = convertToPreprocessedPoses(result.data);
          
          // Load into viewer
          viewerRef.current.setPreprocessedPoses(posesMap, result.data.videoFPS);
          setServerDataLoaded(true);
          
          // Calculate overall confidence from loaded poses
          if (posesMap.size > 0) {
            let totalScore = 0;
            let scoreCount = 0;
            
            posesMap.forEach((framePoses) => {
              framePoses.forEach((pose) => {
                if (pose.score !== undefined && pose.score > 0) {
                  totalScore += pose.score;
                  scoreCount++;
                }
              });
            });
            
            if (scoreCount > 0) {
              const avgConfidence = totalScore / scoreCount;
              setOverallConfidence(avgConfidence);
              console.log(`[TechniqueViewer] Loaded confidence from server: ${(avgConfidence * 100).toFixed(1)}%`);
            }
          }
          
          // Load custom events if present
          if (result.data.customEvents && result.data.customEvents.length > 0) {
            setCustomEvents(result.data.customEvents);
            console.log(`[TechniqueViewer] Loaded ${result.data.customEvents.length} custom events from server`);
          }
          
          // Load protocol adjustments if present
          if (result.data.protocolAdjustments && result.data.protocolAdjustments.length > 0) {
            const adjustmentsMap = convertToProtocolAdjustments(result.data);
            setProtocolAdjustments(adjustmentsMap);
            console.log(`[TechniqueViewer] Loaded ${result.data.protocolAdjustments.length} protocol adjustments from server`);
          }
          
          // Load video comments if present
          if (result.data.videoComments && result.data.videoComments.length > 0) {
            setVideoComments(result.data.videoComments);
            console.log(`[TechniqueViewer] Loaded ${result.data.videoComments.length} video comments from server`);
          }
          
          // Load swing boundary adjustments if present
          if (result.data.swingBoundaryAdjustments && result.data.swingBoundaryAdjustments.length > 0) {
            const boundaryMap = convertToSwingBoundaryAdjustments(result.data);
            setSwingBoundaryAdjustments(boundaryMap);
            console.log(`[TechniqueViewer] Loaded ${result.data.swingBoundaryAdjustments.length} swing boundary adjustments from server`);
          }
          
          // Load user preferences if present
          if (result.data.userPreferences) {
            if (result.data.userPreferences.confidenceThreshold !== undefined) {
              setConfidenceThreshold(result.data.userPreferences.confidenceThreshold);
              console.log(`[TechniqueViewer] Loaded confidence threshold from server: ${(result.data.userPreferences.confidenceThreshold * 100).toFixed(0)}%`);
            }
          }
          
          console.log(`[TechniqueViewer] Loaded ${posesMap.size} frames from server`);
        } else {
          console.log(`[TechniqueViewer] No server data found, will need preprocessing`);
        }
      } catch (error) {
        console.error(`[TechniqueViewer] Failed to load server data:`, error);
      } finally {
        setIsLoadingServerData(false);
        setServerDataChecked(true); // Mark as checked - don't retry
        // Enable pose detection after server check (will trigger preprocessing if no data was loaded)
        console.log(`[TechniqueViewer] Server check complete, enabling pose detection`);
        setPoseEnabled(true);
      }
    }
    
    loadFromServer();
  }, [videoS3Key, viewerState.isVideoReady, serverDataChecked, isLoadingServerData]);

  // Show loading overlay until viewer is ready to use
  // - If server data exists: show until poses are loaded and ready
  // - If no server data: show until preprocessing starts
  const showServerLoadingOverlay = videoS3Key && (
    !serverDataChecked || // Still checking server
    (serverDataLoaded && !viewerState.usingPreprocessedPoses) // Data loaded but viewer not ready yet
  );

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
              height: "57px",
              padding: "0 16px",
              backgroundColor: "var(--gray-1)",
              borderBottom: "1px solid var(--gray-6)",
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
              {swingCount > 0 && (
                <Badge color="blue" size="2">
                  {swingCount} Swing{swingCount !== 1 ? "s" : ""}
                </Badge>
              )}
              {overallConfidence !== null && (
                <Tooltip 
                  content={
                    <Text size="1" style={{ display: "block", maxWidth: "240px" }}>
                      How reliably the AI tracks body movement.
                      <br /><br />
                      • 70%+ Excellent — highly accurate tracking
                      <br />
                      • 50-70% Good — reliable for most analysis
                      <br />
                      • Below 50% — consider re-recording with better visibility
                    </Text>
                  }
                >
                  <Badge 
                    color={overallConfidence >= 0.7 ? "green" : overallConfidence >= 0.5 ? "yellow" : "orange"} 
                    size="2"
                    style={{ cursor: "help" }}
                  >
                    {(overallConfidence * 100).toFixed(0)}% Confidence
                  </Badge>
                </Tooltip>
              )}

            </Flex>

            <Flex align="center" gap="4">
              {/* Annotation Mode Toggle - like Figma's comment mode */}
              {viewMode === "player" && (
                <Tooltip content={annotationMode ? "Exit annotation mode" : "Add annotations"}>
                  <IconButton
                    size="2"
                    variant={annotationMode ? "solid" : "ghost"}
                    onClick={() => setAnnotationMode(!annotationMode)}
                    style={{ 
                      color: annotationMode ? "var(--gray-1)" : "white",
                      backgroundColor: annotationMode ? "var(--accent-9)" : undefined,
                    }}
                  >
                    <ChatBubbleIcon width={18} height={18} />
                  </IconButton>
                </Tooltip>
              )}

              {/* Angles Dropdown Menu - toggle angle measurements on overlay */}
              {viewMode === "player" && (
                <DropdownMenu.Root>
                  <Tooltip content="Angle measurements">
                    <DropdownMenu.Trigger>
                      <IconButton
                        size="2"
                        variant={config.angles.showAngles && hasActiveAngles ? "solid" : "ghost"}
                        style={{ 
                          color: config.angles.showAngles && hasActiveAngles ? "var(--gray-1)" : "white",
                          backgroundColor: config.angles.showAngles && hasActiveAngles ? "var(--accent-9)" : undefined,
                        }}
                      >
                        <AngleIcon width={18} height={18} />
                      </IconButton>
                    </DropdownMenu.Trigger>
                  </Tooltip>
                  <DropdownMenu.Content size="1" style={{ minWidth: "200px" }}>
                    {/* Master toggle */}
                    <DropdownMenu.CheckboxItem
                      checked={config.angles.showAngles}
                      onCheckedChange={(checked) => setConfig(prev => ({
                        ...prev,
                        angles: { ...prev.angles, showAngles: checked }
                      }))}
                      onSelect={(e) => e.preventDefault()}
                    >
                      Show Angles
                    </DropdownMenu.CheckboxItem>
                    <DropdownMenu.CheckboxItem
                      checked={config.angles.useComplementaryAngles}
                      onCheckedChange={(checked) => setConfig(prev => ({
                        ...prev,
                        angles: { ...prev.angles, useComplementaryAngles: checked }
                      }))}
                      onSelect={(e) => e.preventDefault()}
                    >
                      Use Outer Angles (180°−)
                    </DropdownMenu.CheckboxItem>
                    
                    <DropdownMenu.Separator />
                    
                    {/* Arms section */}
                    <DropdownMenu.Label>Arms</DropdownMenu.Label>
                    <DropdownMenu.CheckboxItem
                      checked={isAngleActive(ANGLE_PRESETS.leftElbow)}
                      onCheckedChange={() => toggleAngle(ANGLE_PRESETS.leftElbow)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      Left Elbow
                    </DropdownMenu.CheckboxItem>
                    <DropdownMenu.CheckboxItem
                      checked={isAngleActive(ANGLE_PRESETS.rightElbow)}
                      onCheckedChange={() => toggleAngle(ANGLE_PRESETS.rightElbow)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      Right Elbow
                    </DropdownMenu.CheckboxItem>
                    <DropdownMenu.CheckboxItem
                      checked={isAngleActive(ANGLE_PRESETS.leftShoulder)}
                      onCheckedChange={() => toggleAngle(ANGLE_PRESETS.leftShoulder)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      Left Shoulder
                    </DropdownMenu.CheckboxItem>
                    <DropdownMenu.CheckboxItem
                      checked={isAngleActive(ANGLE_PRESETS.rightShoulder)}
                      onCheckedChange={() => toggleAngle(ANGLE_PRESETS.rightShoulder)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      Right Shoulder
                    </DropdownMenu.CheckboxItem>
                    
                    <DropdownMenu.Separator />
                    
                    {/* Legs section */}
                    <DropdownMenu.Label>Legs</DropdownMenu.Label>
                    <DropdownMenu.CheckboxItem
                      checked={isAngleActive(ANGLE_PRESETS.leftKnee)}
                      onCheckedChange={() => toggleAngle(ANGLE_PRESETS.leftKnee)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      Left Knee
                    </DropdownMenu.CheckboxItem>
                    <DropdownMenu.CheckboxItem
                      checked={isAngleActive(ANGLE_PRESETS.rightKnee)}
                      onCheckedChange={() => toggleAngle(ANGLE_PRESETS.rightKnee)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      Right Knee
                    </DropdownMenu.CheckboxItem>
                    <DropdownMenu.CheckboxItem
                      checked={isAngleActive(ANGLE_PRESETS.leftHip)}
                      onCheckedChange={() => toggleAngle(ANGLE_PRESETS.leftHip)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      Left Hip
                    </DropdownMenu.CheckboxItem>
                    <DropdownMenu.CheckboxItem
                      checked={isAngleActive(ANGLE_PRESETS.rightHip)}
                      onCheckedChange={() => toggleAngle(ANGLE_PRESETS.rightHip)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      Right Hip
                    </DropdownMenu.CheckboxItem>
                    
                    <DropdownMenu.Separator />
                    
                    {/* Torso section */}
                    <DropdownMenu.Label>Torso</DropdownMenu.Label>
                    <DropdownMenu.CheckboxItem
                      checked={isAngleActive(ANGLE_PRESETS.torsoTilt)}
                      onCheckedChange={() => toggleAngle(ANGLE_PRESETS.torsoTilt)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      Torso Tilt
                    </DropdownMenu.CheckboxItem>
                    
                    <DropdownMenu.Separator />
                    
                    {/* Count indicator */}
                    <Box style={{ padding: "4px 12px" }}>
                      <Text size="1" color="gray">
                        {config.angles.measuredAngles.length} angle{config.angles.measuredAngles.length !== 1 ? "s" : ""} selected
                      </Text>
                    </Box>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              )}

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
              developerMode={developerMode}
              callbacks={viewerCallbacks}
              confidenceThreshold={confidenceThreshold}
              onConfidenceThresholdChange={handleConfidenceThresholdChange}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
            
            {/* Video Comment Markers - always visible when in player mode */}
            {viewMode === "player" && viewerState.activeTab === "swings" && (
              <Box
                ref={commentContainerRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: "none", // Don't block video interactions
                  zIndex: 10,
                }}
              >
              {/* Render video comment markers for current time (with tolerance) */}
              {videoComments
                .filter((comment) => Math.abs(comment.time - viewerState.currentTime) < 0.5) // Show comments within 0.5s of current time
                .map((comment) => {
                  // Use preview position if this comment is being dragged
                  const isDragging = draggedComment?.id === comment.id;
                  const displayX = isDragging && dragPreviewPosition ? dragPreviewPosition.x : comment.x;
                  const displayY = isDragging && dragPreviewPosition ? dragPreviewPosition.y : comment.y;
                  const tooltipContent = comment.description 
                    ? `${comment.title}: ${comment.description} (${comment.time.toFixed(2)}s • Frame ${comment.frame})`
                    : `${comment.title} (${comment.time.toFixed(2)}s • Frame ${comment.frame})`;
                  
                  return (
                    <Tooltip
                      key={comment.id}
                      content={tooltipContent}
                    >
                      <Box
                        data-video-comment
                        onClick={(e) => {
                          if (isDragging) return; // Don't toggle selection when dragging
                          e.stopPropagation();
                          // Seek to the comment's frame and select it
                          viewerRef.current?.seekTo(comment.time);
                          setSelectedVideoComment(selectedVideoComment === comment.id ? null : comment.id);
                        }}
                        onMouseDown={(e) => handleCommentDragStart(e, comment.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm(`Delete comment "${comment.title}"?`)) {
                            handleDeleteVideoComment(comment.id);
                          }
                        }}
                        style={{
                          position: "absolute",
                          left: `${displayX * 100}%`,
                          top: `${displayY * 100}%`,
                          transform: "translate(-50%, -50%)",
                          width: selectedVideoComment === comment.id ? "28px" : "22px",
                          height: selectedVideoComment === comment.id ? "28px" : "22px",
                          borderRadius: "50%",
                          backgroundColor: comment.color,
                          boxShadow: isDragging
                            ? `0 0 0 4px white, 0 4px 20px rgba(0, 0, 0, 0.4)`
                            : selectedVideoComment === comment.id 
                              ? `0 0 0 3px white, 0 0 16px ${comment.color}` 
                              : `0 2px 8px rgba(0, 0, 0, 0.3)`,
                          border: "2px solid white",
                          cursor: isDragging ? "grabbing" : "grab",
                          pointerEvents: "auto", // Allow clicks on markers
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: isDragging ? "none" : "all 0.15s ease",
                          zIndex: isDragging ? 100 : selectedVideoComment === comment.id ? 20 : 15,
                        }}
                      >
                        <span style={{ fontSize: "10px", userSelect: "none", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>💬</span>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            )}

            {/* Annotation Mode Overlay - only active when annotation mode is enabled */}
            {viewMode === "player" && viewerState.activeTab === "swings" && annotationMode && (
              <Box
                ref={videoOverlayRef}
                onClick={handleVideoOverlayClick}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  cursor: "crosshair",
                  zIndex: 11,
                }}
              >
                {/* Grid overlay - same style as loading state */}
                <Box
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `
                      linear-gradient(rgba(122, 219, 143, 0.15) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(122, 219, 143, 0.15) 1px, transparent 1px)
                    `,
                    backgroundSize: "40px 40px",
                    opacity: 0.8,
                    pointerEvents: "none",
                  }}
                />
                
                {/* Hint text for annotation mode */}
                {viewerState.isVideoReady && (
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      padding: "4px 8px",
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      borderRadius: "4px",
                      pointerEvents: "none",
                    }}
                  >
                    <Text size="1" style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "10px" }}>
                      Click to add comment
                    </Text>
                  </Flex>
                )}
              </Box>
            )}
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
                              Swing
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
                                <Text size="2" weight="medium" style={{ color: velocityKmh >= 20 ? "var(--blue-9)" : "rgba(255,255,255,0.3)" }}>
                                  {velocityKmh >= 20 ? `${velocityKmh.toFixed(0)} km/h` : "N/A"}
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
                borderTop: "1px solid var(--gray-6)",
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

              {/* Event Markers - above timeline (click to add custom markers, drag to reposition) */}
              <ContextMenu.Root
                onOpenChange={(open) => {
                  if (!open) {
                    setContextMenuTarget(null);
                    setContextMenuPosition(null);
                  }
                }}
              >
                <ContextMenu.Trigger>
                  <Box
                    ref={timelineRef}
                    onClick={handleTimelineAreaClick}
                    onContextMenu={(e) => {
                      // Calculate position for the "Add marker here" action
                      if (timelineRef.current && viewerState.duration > 0) {
                        const rect = timelineRef.current.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percent = Math.max(0, Math.min(1, x / rect.width));
                        const time = percent * viewerState.duration;
                        const frame = Math.floor(time * viewerState.videoFPS);
                        setContextMenuPosition({ time, frame });
                        
                        // Check if clicking on a marker
                        const target = e.target as HTMLElement;
                        const marker = target.closest("[data-event-marker]");
                        if (marker) {
                          const markerId = marker.getAttribute("data-marker-id");
                          const markerType = marker.getAttribute("data-marker-type") as "custom" | "protocol";
                          if (markerId && markerType) {
                            setContextMenuTarget({ type: markerType, id: markerId });
                          }
                        } else {
                          setContextMenuTarget({ type: "empty" });
                        }
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (!draggedMarker) {
                        e.currentTarget.style.backgroundColor = "rgba(122, 219, 143, 0.1)";
                        e.currentTarget.style.borderColor = "rgba(122, 219, 143, 0.7)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!draggedMarker) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
                      }
                    }}
                    style={{
                      position: "relative",
                      height: "24px",
                      marginBottom: "4px",
                      cursor: draggedMarker ? "grabbing" : "crosshair",
                      backgroundColor: draggedMarker ? "rgba(122, 219, 143, 0.15)" : "transparent",
                      borderRadius: "4px",
                      border: draggedMarker ? "1px solid rgba(122, 219, 143, 0.7)" : "1px dashed rgba(255, 255, 255, 0.5)",
                      transition: "all 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                  {/* Swing events (blue ranges) with draggable edges */}
                  {protocolEvents
                    .filter((e) => e.protocolId === "swing-detection-v3")
                    .map((event) => {
                      const { startTime, endTime, isAdjusted } = getEffectiveSwingBoundaries(event);
                      const isDraggingThis = swingEdgeDrag?.eventId === event.id;
                      
                      // Use preview time if dragging this event's edge
                      let displayStartTime = startTime;
                      let displayEndTime = endTime;
                      if (isDraggingThis && swingEdgePreviewTime !== null) {
                        if (swingEdgeDrag.edge === "start") {
                          displayStartTime = Math.min(swingEdgePreviewTime, endTime - 0.05);
                        } else {
                          displayEndTime = Math.max(swingEdgePreviewTime, startTime + 0.05);
                        }
                      }
                      
                      const startPercent = viewerState.duration > 0 
                        ? (displayStartTime / viewerState.duration) * 100 
                        : 0;
                      const endPercent = viewerState.duration > 0 
                        ? (displayEndTime / viewerState.duration) * 100 
                        : 0;
                      const widthPercent = Math.max(1, endPercent - startPercent);
                      const isRange = event.endFrame !== event.startFrame;
                      const color = "var(--blue-9)";
                      
                      return (
                        <Box
                          key={event.id}
                          data-event-marker
                          style={{
                            position: "absolute",
                            left: `${startPercent}%`,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: isRange ? `${widthPercent}%` : "6px",
                            height: "18px",
                          }}
                        >
                          {/* Main swing bar */}
                          <Tooltip content={`${event.label} (${displayStartTime.toFixed(2)}s - ${displayEndTime.toFixed(2)}s)${isAdjusted ? " [adjusted]" : ""}`}>
                            <Box
                              onClick={(e) => {
                                e.stopPropagation();
                                viewerRef.current?.seekTo(displayStartTime);
                              }}
                              style={{
                                position: "absolute",
                                inset: 0,
                                backgroundColor: color,
                                borderRadius: "4px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: isDraggingThis 
                                  ? `0 0 12px ${color}` 
                                  : `0 0 8px ${color}80`,
                                transition: isDraggingThis ? "none" : "box-shadow 0.15s",
                                border: isAdjusted ? "2px solid white" : "none",
                              }}
                            >
                              {isRange && widthPercent > 3 && (
                                <Text size="1" style={{ color: "black", fontSize: "9px", fontWeight: 600 }}>
                                  {event.label.split(" ")[0] === "?" ? "Swing" : event.label.split(" ")[0]}
                                </Text>
                              )}
                            </Box>
                          </Tooltip>
                          
                          {/* Left drag handle (start edge) */}
                          {isRange && (
                            <Box
                              onMouseDown={(e) => handleSwingEdgeDragStart(e, event.id, "start", displayStartTime)}
                              style={{
                                position: "absolute",
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: "8px",
                                cursor: "ew-resize",
                                backgroundColor: isDraggingThis && swingEdgeDrag?.edge === "start" 
                                  ? "rgba(255, 255, 255, 0.9)" 
                                  : "rgba(255, 255, 255, 0.4)",
                                borderRadius: "4px 0 0 4px",
                                transition: "background-color 0.15s",
                                zIndex: 10,
                              }}
                            />
                          )}
                          
                          {/* Right drag handle (end edge) */}
                          {isRange && (
                            <Box
                              onMouseDown={(e) => handleSwingEdgeDragStart(e, event.id, "end", displayEndTime)}
                              style={{
                                position: "absolute",
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: "8px",
                                cursor: "ew-resize",
                                backgroundColor: isDraggingThis && swingEdgeDrag?.edge === "end" 
                                  ? "rgba(255, 255, 255, 0.9)" 
                                  : "rgba(255, 255, 255, 0.4)",
                                borderRadius: "0 4px 4px 0",
                                transition: "background-color 0.15s",
                                zIndex: 10,
                              }}
                            />
                          )}
                        </Box>
                      );
                    })}
                  
                  {/* Loading position events (rocket icons) - for non-serve swings */}
                  {protocolEvents
                    .filter((e) => e.protocolId === "loading-position")
                    .map((event) => {
                      const isDragging = draggedMarker?.id === event.id;
                      const effectiveTime = isDragging && dragPreviewTime !== null 
                        ? dragPreviewTime 
                        : getProtocolEventTime(event);
                      const positionPercent = viewerState.duration > 0 
                        ? (effectiveTime / viewerState.duration) * 100 
                        : 0;
                      const metadata = event.metadata as Record<string, unknown>;
                      const orientation = metadata?.loadingPeakOrientation as number;
                      const isAdjusted = protocolAdjustments.has(event.id);
                      
                      return (
                        <Tooltip 
                          key={event.id} 
                          content={`Loading Position: ${orientation?.toFixed(0)}° (${effectiveTime.toFixed(2)}s)${isAdjusted ? " [adjusted]" : ""} - drag to move`}
                        >
                          <Box
                            data-event-marker
                            data-marker-id={event.id}
                            data-marker-type="protocol"
                            onMouseDown={(e) => handleMarkerDragStart(e, "protocol", event.id, event.startTime)}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!draggedMarker) viewerRef.current?.seekTo(effectiveTime);
                            }}
                            style={{
                              position: "absolute",
                              left: `${positionPercent}%`,
                              top: "50%",
                              transform: "translate(-50%, -50%)",
                              width: "20px",
                              height: "20px",
                              backgroundColor: "#F59E0B",
                              borderRadius: "50%",
                              cursor: isDragging ? "grabbing" : "grab",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: isDragging ? "0 0 16px rgba(245, 158, 11, 0.9)" : "0 0 8px rgba(245, 158, 11, 0.6)",
                              transition: isDragging ? "none" : "transform 0.15s, box-shadow 0.15s",
                              border: isAdjusted ? "2px solid rgba(255, 255, 255, 0.8)" : "2px solid rgba(255, 255, 255, 0.3)",
                              zIndex: isDragging ? 100 : 10,
                              opacity: isDragging ? 0.9 : 1,
                            }}
                          >
                            <span style={{ fontSize: "11px" }}>🚀</span>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  
                  {/* Serve preparation events (rocket icons) - conditional on serve detection */}
                  {protocolEvents
                    .filter((e) => e.protocolId === "serve-preparation")
                    .map((event) => {
                      const isDragging = draggedMarker?.id === event.id;
                      const effectiveTime = isDragging && dragPreviewTime !== null 
                        ? dragPreviewTime 
                        : getProtocolEventTime(event);
                      const positionPercent = viewerState.duration > 0 
                        ? (effectiveTime / viewerState.duration) * 100 
                        : 0;
                      const metadata = event.metadata as Record<string, unknown>;
                      const armHeight = metadata?.armHeight as number;
                      const isAdjusted = protocolAdjustments.has(event.id);
                      
                      return (
                        <Tooltip 
                          key={event.id} 
                          content={`Preparation: ${armHeight?.toFixed(1)}x above shoulder (${effectiveTime.toFixed(2)}s)${isAdjusted ? " [adjusted]" : ""} - drag to move`}
                        >
                          <Box
                            data-event-marker
                            data-marker-id={event.id}
                            data-marker-type="protocol"
                            onMouseDown={(e) => handleMarkerDragStart(e, "protocol", event.id, event.startTime)}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!draggedMarker) viewerRef.current?.seekTo(effectiveTime);
                            }}
                            style={{
                              position: "absolute",
                              left: `${positionPercent}%`,
                              top: "50%",
                              transform: "translate(-50%, -50%)",
                              width: "20px",
                              height: "20px",
                              backgroundColor: "#F59E0B",
                              borderRadius: "50%",
                              cursor: isDragging ? "grabbing" : "grab",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: isDragging ? "0 0 16px rgba(245, 158, 11, 0.9)" : "0 0 8px rgba(245, 158, 11, 0.6)",
                              transition: isDragging ? "none" : "transform 0.15s, box-shadow 0.15s",
                              border: isAdjusted ? "2px solid rgba(255, 255, 255, 0.8)" : "2px solid rgba(255, 255, 255, 0.3)",
                              zIndex: isDragging ? 100 : 10,
                              opacity: isDragging ? 0.9 : 1,
                            }}
                          >
                            <span style={{ fontSize: "11px" }}>🚀</span>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  
                  {/* Tennis contact point events (target icons) - conditional on serve detection */}
                  {protocolEvents
                    .filter((e) => e.protocolId === "tennis-contact-point")
                    .map((event) => {
                      const isDragging = draggedMarker?.id === event.id;
                      const effectiveTime = isDragging && dragPreviewTime !== null 
                        ? dragPreviewTime 
                        : getProtocolEventTime(event);
                      const positionPercent = viewerState.duration > 0 
                        ? (effectiveTime / viewerState.duration) * 100 
                        : 0;
                      const metadata = event.metadata as Record<string, unknown>;
                      const contactHeight = metadata?.contactPointHeight as number;
                      const isAdjusted = protocolAdjustments.has(event.id);
                      
                      return (
                        <Tooltip 
                          key={event.id} 
                          content={`Contact Point: ${contactHeight?.toFixed(1)}x above shoulder (${effectiveTime.toFixed(2)}s)${isAdjusted ? " [adjusted]" : ""} - drag to move`}
                        >
                          <Box
                            data-event-marker
                            data-marker-id={event.id}
                            data-marker-type="protocol"
                            onMouseDown={(e) => handleMarkerDragStart(e, "protocol", event.id, event.startTime)}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!draggedMarker) viewerRef.current?.seekTo(effectiveTime);
                            }}
                            style={{
                              position: "absolute",
                              left: `${positionPercent}%`,
                              top: "50%",
                              transform: "translate(-50%, -50%)",
                              width: "20px",
                              height: "20px",
                              backgroundColor: "#FFE66D",
                              borderRadius: "50%",
                              cursor: isDragging ? "grabbing" : "grab",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: isDragging ? "0 0 16px rgba(255, 230, 109, 0.9)" : "0 0 8px rgba(255, 230, 109, 0.6)",
                              transition: isDragging ? "none" : "transform 0.15s, box-shadow 0.15s",
                              border: isAdjusted ? "2px solid rgba(255, 255, 255, 0.8)" : "2px solid rgba(255, 255, 255, 0.3)",
                              zIndex: isDragging ? 100 : 10,
                              opacity: isDragging ? 0.9 : 1,
                            }}
                          >
                            <span style={{ fontSize: "11px" }}>🎯</span>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  
                  {/* Serve follow-through events - conditional on serve detection */}
                  {protocolEvents
                    .filter((e) => e.protocolId === "serve-follow-through")
                    .map((event) => {
                      const isDragging = draggedMarker?.id === event.id;
                      const effectiveTime = isDragging && dragPreviewTime !== null 
                        ? dragPreviewTime 
                        : getProtocolEventTime(event);
                      const positionPercent = viewerState.duration > 0 
                        ? (effectiveTime / viewerState.duration) * 100 
                        : 0;
                      const isAdjusted = protocolAdjustments.has(event.id);
                      
                      return (
                        <Tooltip 
                          key={event.id} 
                          content={`Follow Through (${effectiveTime.toFixed(2)}s)${isAdjusted ? " [adjusted]" : ""} - drag to move`}
                        >
                          <Box
                            data-event-marker
                            data-marker-id={event.id}
                            data-marker-type="protocol"
                            onMouseDown={(e) => handleMarkerDragStart(e, "protocol", event.id, event.startTime)}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!draggedMarker) viewerRef.current?.seekTo(effectiveTime);
                            }}
                            style={{
                              position: "absolute",
                              left: `${positionPercent}%`,
                              top: "50%",
                              transform: "translate(-50%, -50%)",
                              width: "20px",
                              height: "20px",
                              backgroundColor: "#95E1D3",
                              borderRadius: "50%",
                              cursor: isDragging ? "grabbing" : "grab",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: isDragging ? "0 0 16px rgba(149, 225, 211, 0.9)" : "0 0 8px rgba(149, 225, 211, 0.6)",
                              transition: isDragging ? "none" : "transform 0.15s, box-shadow 0.15s",
                              border: isAdjusted ? "2px solid rgba(255, 255, 255, 0.8)" : "2px solid rgba(255, 255, 255, 0.3)",
                              zIndex: isDragging ? 100 : 10,
                              opacity: isDragging ? 0.9 : 1,
                            }}
                          >
                            <span style={{ fontSize: "11px" }}>✅</span>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  
                  {/* Custom events (user-created markers) */}
                  {customEvents.map((event) => {
                    const effectiveTime = draggedMarker?.id === event.id && dragPreviewTime !== null 
                      ? dragPreviewTime 
                      : event.time;
                    const positionPercent = viewerState.duration > 0 
                      ? (effectiveTime / viewerState.duration) * 100 
                      : 0;
                    const isDragging = draggedMarker?.id === event.id;
                    
                    return (
                      <Tooltip 
                        key={event.id} 
                        content={`${event.name} (${effectiveTime.toFixed(2)}s) - drag to move, right-click to delete`}
                      >
                        <Box
                          data-event-marker
                          data-marker-id={event.id}
                          data-marker-type="custom"
                          onMouseDown={(e) => handleMarkerDragStart(e, "custom", event.id, event.time)}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!draggedMarker) viewerRef.current?.seekTo(event.time);
                          }}
                          style={{
                            position: "absolute",
                            left: `${positionPercent}%`,
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "20px",
                            height: "20px",
                            backgroundColor: event.color,
                            borderRadius: "50%",
                            cursor: isDragging ? "grabbing" : "grab",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: isDragging ? `0 0 16px ${event.color}` : `0 0 8px ${event.color}99`,
                            transition: isDragging ? "none" : "transform 0.15s, box-shadow 0.15s",
                            border: "2px solid rgba(255, 255, 255, 0.4)",
                            zIndex: isDragging ? 100 : 15,
                            opacity: isDragging ? 0.9 : 1,
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                  
                  {/* Video comment indicators (small dots on timeline) */}
                  {videoComments.map((comment) => {
                    const positionPercent = viewerState.duration > 0 
                      ? (comment.time / viewerState.duration) * 100 
                      : 0;
                    
                    return (
                      <Tooltip 
                        key={comment.id} 
                        content={`📍 ${comment.title} (${comment.time.toFixed(2)}s • Frame ${comment.frame}) - click to jump`}
                      >
                        <Box
                          onClick={(e) => {
                            e.stopPropagation();
                            viewerRef.current?.seekTo(comment.time);
                          }}
                          style={{
                            position: "absolute",
                            left: `${positionPercent}%`,
                            bottom: "2px",
                            transform: "translateX(-50%)",
                            width: "8px",
                            height: "8px",
                            backgroundColor: comment.color,
                            borderRadius: "50%",
                            cursor: "pointer",
                            boxShadow: `0 0 4px ${comment.color}99`,
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            zIndex: 5,
                            opacity: 0.8,
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                  
                  {/* Hint text - show when no custom events */}
                  {customEvents.length === 0 && (
                    <Flex
                      align="center"
                      justify="center"
                      gap="1"
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                      }}
                    >
                      <Text size="1" style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "10px" }}>
                        + Click or right-click to add marker
                      </Text>
                    </Flex>
                  )}
                  </Box>
                </ContextMenu.Trigger>
                <ContextMenu.Content size="1">
                  <ContextMenu.Item onClick={handleContextMenuAddMarker}>
                    <Flex align="center" gap="2">
                      <PlusIcon />
                      <Text>Add marker here</Text>
                    </Flex>
                  </ContextMenu.Item>
                  {contextMenuTarget?.type === "protocol" && protocolAdjustments.has(contextMenuTarget.id!) && (
                    <ContextMenu.Item onClick={handleContextMenuResetPosition}>
                      <Flex align="center" gap="2">
                        <ResetIcon />
                        <Text>Reset to original position</Text>
                      </Flex>
                    </ContextMenu.Item>
                  )}
                  {contextMenuTarget?.type === "custom" && (
                    <>
                      <ContextMenu.Separator />
                      <ContextMenu.Item color="red" onClick={handleContextMenuDeleteMarker}>
                        <Flex align="center" gap="2">
                          <TrashIcon />
                          <Text>Delete marker</Text>
                        </Flex>
                      </ContextMenu.Item>
                    </>
                  )}
                </ContextMenu.Content>
              </ContextMenu.Root>
              
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
              borderLeft: "1px solid var(--gray-6)",
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
            
            {/* Server Data Debug Panel */}
            <Box style={{ padding: "16px" }}>
              <ServerDataDebugPanel
                videoS3Key={videoS3Key}
                taskId={taskId || null}
                preprocessedPoses={viewerRef.current?.getPreprocessedPoses() || null}
                videoFPS={viewerState.videoFPS}
                modelUsed={config.model.model}
                wasAutoLoaded={serverDataLoaded}
              />
            </Box>
          </Box>
        )}
      </Flex>

      {/* Loading overlay while checking server for pose data */}
      {showServerLoadingOverlay && (
        <LoadingState message="Loading pose data" />
      )}

      {/* Custom Event Dialog */}
      <CustomEventDialog
        open={customEventDialogOpen}
        onOpenChange={setCustomEventDialogOpen}
        eventTime={pendingCustomEventTime?.time ?? 0}
        eventFrame={pendingCustomEventTime?.frame ?? 0}
        onCreateEvent={handleCreateCustomEvent}
      />

      {/* Video Comment Dialog */}
      <VideoCommentDialog
        open={videoCommentDialogOpen}
        onOpenChange={setVideoCommentDialogOpen}
        x={pendingVideoComment?.x ?? 0}
        y={pendingVideoComment?.y ?? 0}
        time={pendingVideoComment?.time ?? 0}
        frame={pendingVideoComment?.frame ?? 0}
        onCreateComment={handleCreateVideoComment}
      />
    </Box>
  );
}
