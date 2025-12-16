"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Box, Flex } from "@radix-ui/themes";
import {
  VideoPoseViewerV2,
  PoseConfigurationPanel,
  DEFAULT_VIEWER_CONFIG,
  type ViewerConfig,
  type ViewerState,
  type ViewerActions,
  type PoseDetectionResult,
  type ProtocolEvent,
} from "@/components/videoPoseViewerV2";
import { LoadingState } from "@/components/tasks/viewer/components/LoadingState";
import { ServerDataDebugPanel } from "./ServerDataDebugPanel";
import {
  CustomEventDialog,
  VideoCommentDialog,
  TopBar,
  TimelineScrubber,
  SwingsGalleryView,
  VideoCommentMarkers,
  AnnotationModeOverlay,
  type Moment,
} from "./components";
import { extractS3KeyFromUrl } from "@/lib/s3";
import { isSampleTask, getSampleTask } from "../sampleTasks";

// Types and constants
import type { TechniqueViewerProps, ViewMode, ContextMenuTarget, ContextMenuPosition, DirtyFlags } from "./types";
import { DEFAULT_DIRTY_FLAGS, INITIAL_VIEWER_STATE } from "./constants";
import { getEnabledProtocolsForSport, type SwingBoundaryAdjustment, type ProtocolAdjustment } from "./utils";

// Custom hooks
import {
  useAngleConfig,
  useMarkerDrag,
  useSwingEdgeDrag,
  useVideoComments,
  useCustomEvents,
  useServerData,
  useMomentAnalysis,
  useViewerCallbacks,
} from "./hooks";

export function TechniqueViewer({
  videoUrl,
  onBack,
  backLabel = "Back",
  sport,
  taskId,
  developerMode = false,
}: TechniqueViewerProps) {
  // ============================================================================
  // Core State
  // ============================================================================
  
  // Create sport-specific config by merging with defaults
  const initialConfig = useMemo<ViewerConfig>(() => ({
    ...DEFAULT_VIEWER_CONFIG,
    protocols: {
      ...DEFAULT_VIEWER_CONFIG.protocols,
      enabledProtocols: getEnabledProtocolsForSport(sport),
    },
  }), [sport]);
  
  const [config, setConfig] = useState<ViewerConfig>(initialConfig);
  const hasVideoS3Key = !!extractS3KeyFromUrl(videoUrl);
  const [poseEnabled, setPoseEnabled] = useState(!hasVideoS3Key);
  const [showPanel, setShowPanel] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("player");
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.3);
  const [protocolEvents, setProtocolEvents] = useState<ProtocolEvent[]>([]);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [viewerState, setViewerState] = useState<ViewerState>(INITIAL_VIEWER_STATE);
  const [dirtyFlags, setDirtyFlags] = useState<DirtyFlags>(DEFAULT_DIRTY_FLAGS);
  
  // Context menu state
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<ContextMenuTarget | null>(null);

  // Refs
  const viewerRef = useRef<ViewerActions>(null);

  // Derived values
  const videoS3Key = useMemo(() => extractS3KeyFromUrl(videoUrl), [videoUrl]);
  
  // Get pose data URL for sample tasks (stored in public bucket)
  const poseDataUrl = useMemo(() => {
    if (taskId && isSampleTask(taskId)) {
      const sampleTask = getSampleTask(taskId);
      return sampleTask?.poseDataUrl;
    }
    return undefined;
  }, [taskId]);
  
  const swingCount = useMemo(
    () => protocolEvents.filter((e) => e.protocolId === "swing-detection-v3").length,
    [protocolEvents]
  );

  // ============================================================================
  // Custom Hooks
  // ============================================================================

  // Angle configuration
  const angleConfig = useAngleConfig(config, setConfig);

  // Protocol adjustments state (needed for multiple hooks)
  const [protocolAdjustments, setProtocolAdjustments] = useState<Map<string, ProtocolAdjustment>>(new Map());
  const [swingBoundaryAdjustments, setSwingBoundaryAdjustments] = useState<Map<string, SwingBoundaryAdjustment>>(new Map());

  // Custom events management
  const customEventsHook = useCustomEvents({ setDirtyFlags });

  // Video comments management
  const videoCommentsHook = useVideoComments({
    viewerRef,
    setDirtyFlags,
  });

  // Marker drag management
  const markerDragHook = useMarkerDrag({
    duration: viewerState.duration,
    videoFPS: viewerState.videoFPS,
    viewerRef,
    customEvents: customEventsHook.customEvents,
    setCustomEvents: customEventsHook.setCustomEvents,
    protocolAdjustments,
    setProtocolAdjustments,
    setDirtyFlags,
  });

  // Swing edge drag management
  const swingEdgeDragHook = useSwingEdgeDrag({
    duration: viewerState.duration,
    videoFPS: viewerState.videoFPS,
    viewerRef,
    protocolEvents,
    swingBoundaryAdjustments,
    setSwingBoundaryAdjustments,
    setDirtyFlags,
    timelineRef: markerDragHook.timelineRef,
  });

  // Server data management
  const serverDataHook = useServerData({
    videoS3Key,
    poseDataUrl,
    viewerRef,
    viewerState: {
      isVideoReady: viewerState.isVideoReady,
      videoFPS: viewerState.videoFPS,
      totalFrames: viewerState.totalFrames,
    },
    config,
    dirtyFlags,
    setDirtyFlags,
    setCustomEvents: customEventsHook.setCustomEvents,
    setVideoComments: videoCommentsHook.setVideoComments,
    setProtocolAdjustments,
    setSwingBoundaryAdjustments,
    setConfidenceThreshold,
    setPoseEnabled,
    customEvents: customEventsHook.customEvents,
    videoComments: videoCommentsHook.videoComments,
    protocolAdjustments,
    swingBoundaryAdjustments,
    confidenceThreshold,
  });

  // Moment analysis with AI
  const momentAnalysisHook = useMomentAnalysis({
    viewerRef,
    config,
    setConfig,
    sport,
  });

  // Viewer callbacks hook
  const { viewerCallbacks, handleConfidenceThresholdChange } = useViewerCallbacks({
    viewerRef,
    setViewerState,
    setProtocolEvents,
    setConfidenceThreshold,
    setDirtyFlags,
    serverDataHook,
  });

  // Handle updating an event (for both custom events and video comments)
  const handleUpdateEvent = useCallback(
    (id: string, updates: { name: string; color: string }) => {
      const customEvent = customEventsHook.customEvents.find((e) => e.id === id);
      if (customEvent) {
        customEventsHook.handleUpdateCustomEvent(id, updates);
        return;
      }
      const videoComment = videoCommentsHook.videoComments.find((c) => c.id === id);
      if (videoComment) {
        videoCommentsHook.handleUpdateVideoComment(id, { title: updates.name, color: updates.color });
        customEventsHook.setEditingMoment(null);
      }
    },
    [customEventsHook, videoCommentsHook]
  );

  // ============================================================================
  // Render
  // ============================================================================

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
          <TopBar
            onBack={onBack}
            backLabel={backLabel}
            sport={sport}
            handednessResult={viewerState.handednessResult}
            swingCount={swingCount}
            overallConfidence={serverDataHook.overallConfidence}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            annotationMode={annotationMode}
            onAnnotationModeChange={setAnnotationMode}
            showAngles={angleConfig.showAngles}
            hasActiveAngles={angleConfig.hasActiveAngles}
            useComplementaryAngles={angleConfig.useComplementaryAngles}
            anglePrecision={angleConfig.anglePrecision}
            measuredAngles={angleConfig.measuredAngles}
            isAngleActive={angleConfig.isAngleActive}
            toggleAngle={angleConfig.toggleAngle}
            onShowAnglesChange={angleConfig.setShowAngles}
            onUseComplementaryAnglesChange={angleConfig.setUseComplementaryAngles}
            onAnglePrecisionChange={angleConfig.setAnglePrecision}
            showPanel={showPanel}
            onShowPanelChange={setShowPanel}
            developerMode={developerMode}
          />

          {/* Video Viewer */}
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
              momentsConfig={{
                customEvents: customEventsHook.customEvents,
                videoComments: videoCommentsHook.videoComments,
                protocolAdjustments,
                swingBoundaryAdjustments,
                reports: momentAnalysisHook.reports,
                onViewMoment: (time) => viewerRef.current?.seekTo(time),
                onAnalyseMoment: (moment) =>
                  momentAnalysisHook.handleAnalyseMoment(moment as Moment),
                onDeleteReport: momentAnalysisHook.handleDeleteReport,
                onDeleteMoment: (moment) => {
                  const m = moment as { id: string; type: string };
                  if (m.type === "custom") {
                    customEventsHook.handleDeleteCustomEvent(m.id);
                  } else if (m.type === "comment") {
                    videoCommentsHook.handleDeleteVideoComment(m.id);
                  }
                },
                onResetAdjustment: (moment) => {
                  const m = moment as { id: string };
                  setProtocolAdjustments((prev) => {
                    const next = new Map(prev);
                    next.delete(m.id);
                    return next;
                  });
                  setDirtyFlags((prev) => ({ ...prev, protocolAdjustments: true }));
                },
                onEditMomentName: (moment) => {
                  const m = moment as {
                    id: string;
                    type: string;
                    label: string;
                    color: string;
                    time: number;
                    frame: number;
                  };
                  if (m.type === "custom" || m.type === "comment") {
                    customEventsHook.startEditingMoment({
                      id: m.id,
                      type: m.type as "custom" | "comment",
                      label: m.label,
                      color: m.color,
                      time: m.time,
                      frame: m.frame,
                    });
                  }
                },
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />

            {/* Video Comment Markers */}
            {viewMode === "player" && viewerState.activeTab === "swings" && (
              <VideoCommentMarkers
                videoComments={videoCommentsHook.videoComments}
                currentTime={viewerState.currentTime}
                selectedVideoComment={videoCommentsHook.selectedVideoComment}
                draggedComment={videoCommentsHook.draggedComment}
                dragPreviewPosition={videoCommentsHook.dragPreviewPosition}
                commentContainerRef={videoCommentsHook.commentContainerRef}
                viewerRef={viewerRef}
                onCommentClick={videoCommentsHook.handleCommentClick}
                onCommentDragStart={videoCommentsHook.handleCommentDragStart}
                onDeleteVideoComment={videoCommentsHook.handleDeleteVideoComment}
              />
            )}

            {/* Annotation Mode Overlay */}
            {viewMode === "player" &&
              viewerState.activeTab === "swings" &&
              annotationMode && (
                <AnnotationModeOverlay
                  isVideoReady={viewerState.isVideoReady}
                  onClick={(e) =>
                    videoCommentsHook.handleVideoOverlayClick(
                      e,
                      viewerState.currentTime,
                      viewerState.currentFrame,
                      viewerState.isVideoReady,
                      viewerState.duration
                    )
                  }
                />
              )}
          </Box>

          {/* Swings Gallery View */}
          {viewMode === "swings" && (
            <SwingsGalleryView
              protocolEvents={protocolEvents}
              swingCount={swingCount}
              viewerRef={viewerRef}
              onViewModeChange={setViewMode}
            />
          )}

          {/* Timeline Scrubber */}
          {viewMode === "player" && (
            <TimelineScrubber
              currentTime={viewerState.currentTime}
              currentFrame={viewerState.currentFrame}
              duration={viewerState.duration}
              totalFrames={viewerState.totalFrames}
              videoFPS={viewerState.videoFPS}
              protocolEvents={protocolEvents}
              customEvents={customEventsHook.customEvents}
              videoComments={videoCommentsHook.videoComments}
              protocolAdjustments={protocolAdjustments}
              swingBoundaryAdjustments={swingBoundaryAdjustments}
              draggedMarker={markerDragHook.draggedMarker}
              dragPreviewTime={markerDragHook.dragPreviewTime}
              swingEdgeDrag={swingEdgeDragHook.swingEdgeDrag}
              swingEdgePreviewTime={swingEdgeDragHook.swingEdgePreviewTime}
              timelineRef={markerDragHook.timelineRef}
              contextMenuTarget={contextMenuTarget}
              setContextMenuTarget={setContextMenuTarget}
              contextMenuPosition={contextMenuPosition}
              setContextMenuPosition={setContextMenuPosition}
              viewerRef={viewerRef}
              onMarkerDragStart={markerDragHook.handleMarkerDragStart}
              onSwingEdgeDragStart={swingEdgeDragHook.handleSwingEdgeDragStart}
              onTimelineAreaClick={customEventsHook.handleTimelineAreaClick}
              setCustomEvents={customEventsHook.setCustomEvents}
              setProtocolAdjustments={setProtocolAdjustments}
              setDirtyFlags={setDirtyFlags}
              setPendingCustomEventTime={customEventsHook.setPendingCustomEventTime}
              setCustomEventDialogOpen={customEventsHook.setCustomEventDialogOpen}
            />
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
            <Box style={{ padding: "16px" }}>
              <ServerDataDebugPanel
                videoS3Key={videoS3Key}
                taskId={taskId || null}
                preprocessedPoses={viewerRef.current?.getPreprocessedPoses() || null}
                videoFPS={viewerState.videoFPS}
                modelUsed={config.model.model}
                wasAutoLoaded={serverDataHook.serverDataLoaded}
              />
            </Box>
          </Box>
        )}
      </Flex>

      {/* Loading Overlay */}
      {serverDataHook.showServerLoadingOverlay && (
        <LoadingState message="Loading pose data" />
      )}

      {/* Custom Event Dialog */}
      <CustomEventDialog
        open={customEventsHook.customEventDialogOpen}
        onOpenChange={(open) => {
          customEventsHook.setCustomEventDialogOpen(open);
          if (!open) customEventsHook.setEditingMoment(null);
        }}
        eventTime={customEventsHook.pendingCustomEventTime?.time ?? 0}
        eventFrame={customEventsHook.pendingCustomEventTime?.frame ?? 0}
        onCreateEvent={customEventsHook.handleCreateCustomEvent}
        editingMoment={customEventsHook.editingMoment}
        onUpdateEvent={handleUpdateEvent}
      />

      {/* Video Comment Dialog */}
      <VideoCommentDialog
        open={videoCommentsHook.videoCommentDialogOpen}
        onOpenChange={videoCommentsHook.setVideoCommentDialogOpen}
        x={videoCommentsHook.pendingVideoComment?.x ?? 0}
        y={videoCommentsHook.pendingVideoComment?.y ?? 0}
        time={videoCommentsHook.pendingVideoComment?.time ?? 0}
        frame={videoCommentsHook.pendingVideoComment?.frame ?? 0}
        onCreateComment={videoCommentsHook.handleCreateVideoComment}
      />
    </Box>
  );
}
