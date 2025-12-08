"use client";

/**
 * PoseConfigurationPanel
 * 
 * A comprehensive, standalone configuration panel for the VideoPoseViewerV2.
 * Provides controls for all aspects of pose detection and visualization.
 * Designed to be placed externally from the viewer component.
 */

import React, { useCallback } from "react";
import {
  Box,
  Flex,
  Text,
  Select,
  Switch,
  Slider,
  Button,
  Card,
  Separator,
  Badge,
  Tabs,
} from "@radix-ui/themes";
import {
  PlayIcon,
  PauseIcon,
  TrackPreviousIcon,
  TrackNextIcon,
  ReloadIcon,
  GearIcon,
  EyeOpenIcon,
  MixerHorizontalIcon,
  TimerIcon,
  TargetIcon,
  ActivityLogIcon,
  RocketIcon,
} from "@radix-ui/react-icons";

import type {
  ViewerConfig,
  ViewerState,
  ViewerActions,
  ConfidencePreset,
  ResolutionPreset,
  PostProcessingConfig,
  SmoothingMethod,
  ProtocolId,
  ProtocolsConfig,
  SwingDetectionV3Config,
} from "./types";
import {
  CONFIDENCE_PRESETS,
  RESOLUTION_PRESETS,
  ANGLE_PRESETS,
  PLAYBACK_SPEEDS,
  MOVENET_JOINT_NAMES,
  BLAZEPOSE_JOINT_NAMES,
  getJointName,
  getJointCount,
  AVAILABLE_PROTOCOLS,
} from "./types";
import type { SupportedModel, MoveNetModelType, BlazePoseModelType } from "@/hooks/usePoseDetection";

// ============================================================================
// Props
// ============================================================================

interface PoseConfigurationPanelProps {
  /** Current configuration */
  config: ViewerConfig;
  /** Update configuration */
  onConfigChange: (config: ViewerConfig) => void;
  /** Viewer state (read-only) */
  state: ViewerState;
  /** Viewer actions */
  actions: ViewerActions | null;
  /** Pose detection enabled */
  poseEnabled: boolean;
  /** Toggle pose detection */
  onPoseEnabledChange: (enabled: boolean) => void;
}

// ============================================================================
// Subcomponents
// ============================================================================

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <Box style={{ marginBottom: "16px" }}>
      <Flex align="center" gap="2" style={{ marginBottom: "12px" }}>
        {icon}
        <Text size="2" weight="bold" style={{ color: "var(--gray-12)" }}>
          {title}
        </Text>
      </Flex>
      <Box style={{ paddingLeft: "4px" }}>{children}</Box>
    </Box>
  );
}

interface ControlRowProps {
  label: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}

function ControlRow({ label, description, children }: ControlRowProps) {
  return (
    <Flex
      justify="between"
      align="center"
      style={{
        marginBottom: "12px",
        padding: "8px 0",
        borderBottom: "1px solid var(--gray-4)",
      }}
    >
      <Flex direction="column" gap="1" style={{ flex: 1 }}>
        <Text size="2" weight="medium">
          {label}
        </Text>
        {description && (
          <Text size="1" color="gray">
            {description}
          </Text>
        )}
      </Flex>
      <Box style={{ marginLeft: "16px" }}>{children}</Box>
    </Flex>
  );
}

// ============================================================================
// Component
// ============================================================================

export function PoseConfigurationPanel({
  config,
  onConfigChange,
  state,
  actions,
  poseEnabled,
  onPoseEnabledChange,
}: PoseConfigurationPanelProps) {
  // ========================================================================
  // Update Helpers
  // ========================================================================

  const updateModel = useCallback(
    (updates: Partial<ViewerConfig["model"]>) => {
      onConfigChange({
        ...config,
        model: { ...config.model, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updatePostProcessing = useCallback(
    (updates: Partial<PostProcessingConfig>) => {
      onConfigChange({
        ...config,
        postProcessing: { ...config.postProcessing, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updateConfidence = useCallback(
    (updates: Partial<ViewerConfig["confidence"]>) => {
      onConfigChange({
        ...config,
        confidence: { ...config.confidence, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updateResolution = useCallback(
    (updates: Partial<ViewerConfig["resolution"]>) => {
      onConfigChange({
        ...config,
        resolution: { ...config.resolution, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updateSkeleton = useCallback(
    (updates: Partial<ViewerConfig["skeleton"]>) => {
      onConfigChange({
        ...config,
        skeleton: { ...config.skeleton, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updateAngles = useCallback(
    (updates: Partial<ViewerConfig["angles"]>) => {
      onConfigChange({
        ...config,
        angles: { ...config.angles, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updateBodyOrientation = useCallback(
    (updates: Partial<ViewerConfig["bodyOrientation"]>) => {
      onConfigChange({
        ...config,
        bodyOrientation: { ...config.bodyOrientation, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updateTrajectories = useCallback(
    (updates: Partial<ViewerConfig["trajectories"]>) => {
      onConfigChange({
        ...config,
        trajectories: { ...config.trajectories, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updateVelocity = useCallback(
    (updates: Partial<ViewerConfig["velocity"]>) => {
      onConfigChange({
        ...config,
        velocity: { ...config.velocity, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updateStabilization = useCallback(
    (updates: Partial<ViewerConfig["stabilization"]>) => {
      onConfigChange({
        ...config,
        stabilization: { ...config.stabilization, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updateStabilityFilter = useCallback(
    (updates: Partial<ViewerConfig["stabilityFilter"]>) => {
      onConfigChange({
        ...config,
        stabilityFilter: { ...config.stabilityFilter, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updatePreprocessing = useCallback(
    (updates: Partial<ViewerConfig["preprocessing"]>) => {
      onConfigChange({
        ...config,
        preprocessing: { ...config.preprocessing, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updatePlayback = useCallback(
    (updates: Partial<ViewerConfig["playback"]>) => {
      onConfigChange({
        ...config,
        playback: { ...config.playback, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updateDebug = useCallback(
    (updates: Partial<ViewerConfig["debug"]>) => {
      onConfigChange({
        ...config,
        debug: { ...config.debug, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updateProtocols = useCallback(
    (updates: Partial<ProtocolsConfig>) => {
      onConfigChange({
        ...config,
        protocols: { ...config.protocols, ...updates },
      });
    },
    [config, onConfigChange]
  );

  const updateSwingDetectionV3 = useCallback(
    (updates: Partial<SwingDetectionV3Config>) => {
      onConfigChange({
        ...config,
        swingDetectionV3: { ...config.swingDetectionV3, ...updates },
      });
    },
    [config, onConfigChange]
  );

  // ========================================================================
  // Angle Helpers
  // ========================================================================

  const toggleAngle = useCallback(
    (angle: [number, number, number]) => {
      const existing = config.angles.measuredAngles.findIndex(
        ([a, b, c]) =>
          (a === angle[0] && b === angle[1] && c === angle[2]) ||
          (a === angle[2] && b === angle[1] && c === angle[0])
      );
      if (existing !== -1) {
        updateAngles({
          measuredAngles: config.angles.measuredAngles.filter((_, i) => i !== existing),
        });
      } else {
        updateAngles({
          measuredAngles: [...config.angles.measuredAngles, angle],
        });
      }
    },
    [config.angles.measuredAngles, updateAngles]
  );

  const isAngleActive = useCallback(
    (angle: [number, number, number]) => {
      return config.angles.measuredAngles.some(
        ([a, b, c]) =>
          (a === angle[0] && b === angle[1] && c === angle[2]) ||
          (a === angle[2] && b === angle[1] && c === angle[0])
      );
    },
    [config.angles.measuredAngles]
  );

  // ========================================================================
  // Joint Helpers
  // ========================================================================

  const toggleJoint = useCallback(
    (jointIndex: number) => {
      const isSelected = config.trajectories.selectedJoints.includes(jointIndex);
      if (isSelected) {
        updateTrajectories({
          selectedJoints: config.trajectories.selectedJoints.filter((j) => j !== jointIndex),
        });
      } else {
        updateTrajectories({
          selectedJoints: [...config.trajectories.selectedJoints, jointIndex],
        });
      }
    },
    [config.trajectories.selectedJoints, updateTrajectories]
  );

  // ========================================================================
  // Protocol Helpers
  // ========================================================================

  const toggleProtocol = useCallback(
    (protocolId: ProtocolId) => {
      const isEnabled = config.protocols.enabledProtocols.includes(protocolId);
      if (isEnabled) {
        updateProtocols({
          enabledProtocols: config.protocols.enabledProtocols.filter((p) => p !== protocolId),
        });
      } else {
        updateProtocols({
          enabledProtocols: [...config.protocols.enabledProtocols, protocolId],
        });
      }
    },
    [config.protocols.enabledProtocols, updateProtocols]
  );

  const isProtocolEnabled = useCallback(
    (protocolId: ProtocolId) => config.protocols.enabledProtocols.includes(protocolId),
    [config.protocols.enabledProtocols]
  );

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <Card
      style={{
        width: "100%",
        maxWidth: "400px",
        maxHeight: "100%",
        overflow: "auto",
        backgroundColor: "var(--gray-1)",
      }}
    >
      {/* Header */}
      <Flex
        align="center"
        justify="between"
        style={{
          padding: "16px",
          borderBottom: "1px solid var(--gray-4)",
          position: "sticky",
          top: 0,
          backgroundColor: "var(--gray-1)",
          zIndex: 10,
        }}
      >
        <Flex align="center" gap="2">
          <GearIcon width={20} height={20} />
          <Text size="4" weight="bold">
            Pose Settings
          </Text>
        </Flex>
        <Switch
          checked={poseEnabled}
          onCheckedChange={onPoseEnabledChange}
          size="2"
        />
      </Flex>

      {/* Tabs */}
      <Tabs.Root defaultValue="playback">
        <Tabs.List>
          <Tabs.Trigger value="playback">
            <Flex align="center" gap="1">
              <PlayIcon width={14} height={14} />
              <Text size="1">Playback</Text>
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="model">
            <Flex align="center" gap="1">
              <RocketIcon width={14} height={14} />
              <Text size="1">Model</Text>
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="display">
            <Flex align="center" gap="1">
              <EyeOpenIcon width={14} height={14} />
              <Text size="1">Display</Text>
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="protocols">
            <Flex align="center" gap="1">
              <ActivityLogIcon width={14} height={14} />
              <Text size="1">Protocols</Text>
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="advanced">
            <Flex align="center" gap="1">
              <MixerHorizontalIcon width={14} height={14} />
              <Text size="1">Advanced</Text>
            </Flex>
          </Tabs.Trigger>
        </Tabs.List>

        {/* Playback Tab */}
        <Tabs.Content value="playback">
          <Box style={{ paddingTop: "16px" }}>
            {/* Playback Controls */}
            <Section title="Playback Controls" icon={<PlayIcon />}>
              <Flex gap="2" style={{ marginBottom: "16px" }}>
                <Button
                  size="2"
                  variant="soft"
                  onClick={() => actions?.stepBackward()}
                  disabled={!state.isVideoReady}
                >
                  <TrackPreviousIcon />
                </Button>
                <Button
                  size="2"
                  variant="solid"
                  onClick={() => actions?.togglePlay()}
                  disabled={!state.isVideoReady}
                  style={{ flex: 1 }}
                >
                  {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
                  <Text>{state.isPlaying ? "Pause" : "Play"}</Text>
                </Button>
                <Button
                  size="2"
                  variant="soft"
                  onClick={() => actions?.stepForward()}
                  disabled={!state.isVideoReady}
                >
                  <TrackNextIcon />
                </Button>
              </Flex>

              <ControlRow label="Speed">
                <Select.Root
                  value={config.playback.speed.toString()}
                  onValueChange={(v) => updatePlayback({ speed: parseFloat(v) })}
                >
                  <Select.Trigger style={{ minWidth: "100px" }} />
                  <Select.Content>
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <Select.Item key={speed} value={speed.toString()}>
                        {speed}×
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </ControlRow>

              <ControlRow label="Loop">
                <Switch
                  checked={config.playback.loop}
                  onCheckedChange={(v) => updatePlayback({ loop: v })}
                />
              </ControlRow>

              <ControlRow label="Muted">
                <Switch
                  checked={config.playback.muted}
                  onCheckedChange={(v) => updatePlayback({ muted: v })}
                />
              </ControlRow>
            </Section>

            <Separator style={{ marginBottom: "16px" }} />

            {/* Video Info */}
            <Section title="Video Info" icon={<ActivityLogIcon />}>
              <Flex direction="column" gap="2">
                <Flex justify="between">
                  <Text size="1" color="gray">Frame</Text>
                  <Text size="1" weight="medium">
                    {state.currentFrame} / {state.totalFrames}
                  </Text>
                </Flex>
                <Flex justify="between">
                  <Text size="1" color="gray">Time</Text>
                  <Text size="1" weight="medium">
                    {state.currentTime.toFixed(2)}s / {state.duration.toFixed(2)}s
                  </Text>
                </Flex>
                <Flex justify="between">
                  <Text size="1" color="gray">FPS</Text>
                  <Text size="1" weight="medium">
                    {state.videoFPS} ({state.fpsDetectionMethod})
                  </Text>
                </Flex>
                <Flex justify="between">
                  <Text size="1" color="gray">Size</Text>
                  <Text size="1" weight="medium">
                    {state.videoDimensions.width}×{state.videoDimensions.height}
                  </Text>
                </Flex>
                <Flex justify="between">
                  <Text size="1" color="gray">Poses Detected</Text>
                  <Text size="1" weight="medium">{state.currentPoses.length}</Text>
                </Flex>
                {state.usingPreprocessedPoses && (
                  <Flex justify="between">
                    <Text size="1" color="gray">Preprocessed</Text>
                    <Badge color="green" size="1">
                      {state.preprocessedFrameCount} frames
                    </Badge>
                  </Flex>
                )}
              </Flex>
            </Section>
          </Box>
        </Tabs.Content>

        {/* Model Tab */}
        <Tabs.Content value="model">
          <Box style={{ paddingTop: "16px" }}>
            {/* Model Selection */}
            <Section title="Pose Model" icon={<RocketIcon />}>
              <ControlRow label="Model" description="Select the pose detection model">
                <Select.Root
                  value={config.model.model}
                  onValueChange={(v) => updateModel({ model: v as SupportedModel })}
                >
                  <Select.Trigger style={{ minWidth: "120px" }} />
                  <Select.Content>
                    <Select.Item value="MoveNet">MoveNet</Select.Item>
                    <Select.Item value="BlazePose">BlazePose</Select.Item>
                  </Select.Content>
                </Select.Root>
              </ControlRow>

              {config.model.model === "MoveNet" && (
                <>
                  <ControlRow label="Variant" description="Speed vs accuracy tradeoff">
                    <Select.Root
                      value={config.model.moveNetType}
                      onValueChange={(v) => updateModel({ moveNetType: v as MoveNetModelType })}
                    >
                      <Select.Trigger style={{ minWidth: "160px" }} />
                      <Select.Content>
                        <Select.Item value="SinglePose.Lightning">Lightning (Fast)</Select.Item>
                        <Select.Item value="SinglePose.Thunder">Thunder (Accurate)</Select.Item>
                        <Select.Item value="MultiPose.Lightning">MultiPose</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </ControlRow>

                  {config.model.moveNetType === "MultiPose.Lightning" && (
                    <ControlRow label="Max Poses" description="Maximum people to detect">
                      <Flex align="center" gap="2">
                        <Slider
                          value={[config.model.maxPoses]}
                          onValueChange={([v]) => updateModel({ maxPoses: v })}
                          min={1}
                          max={6}
                          step={1}
                          style={{ width: "80px" }}
                        />
                        <Text size="1" weight="medium" style={{ minWidth: "20px" }}>
                          {config.model.maxPoses}
                        </Text>
                      </Flex>
                    </ControlRow>
                  )}
                </>
              )}

              {config.model.model === "BlazePose" && (
                <ControlRow label="Variant" description="Model complexity">
                  <Select.Root
                    value={config.model.blazePoseType}
                    onValueChange={(v) => updateModel({ blazePoseType: v as BlazePoseModelType })}
                  >
                    <Select.Trigger style={{ minWidth: "120px" }} />
                    <Select.Content>
                      <Select.Item value="lite">Lite (Fast)</Select.Item>
                      <Select.Item value="full">Full</Select.Item>
                      <Select.Item value="heavy">Heavy (Best)</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </ControlRow>
              )}

              <ControlRow label="Built-in Smoothing" description="TensorFlow model's temporal smoothing">
                <Switch
                  checked={config.model.enableSmoothing}
                  onCheckedChange={(v) => updateModel({ enableSmoothing: v })}
                />
              </ControlRow>
            </Section>

            <Separator style={{ marginBottom: "16px" }} />

            {/* Post Processing Section */}
            <Section title="Post Processing" icon={<MixerHorizontalIcon />}>
              <ControlRow label="Smoothing" description="Apply additional smoothing to poses">
                <Switch
                  checked={config.postProcessing.smoothingEnabled}
                  onCheckedChange={(v) => updatePostProcessing({ smoothingEnabled: v })}
                />
              </ControlRow>

              {config.postProcessing.smoothingEnabled && (
                <>
                  <ControlRow label="Method" description="Smoothing algorithm">
                    <Select.Root
                      value={config.postProcessing.smoothingMethod}
                      onValueChange={(v) => updatePostProcessing({ smoothingMethod: v as SmoothingMethod })}
                    >
                      <Select.Trigger style={{ minWidth: "130px" }} />
                      <Select.Content>
                        <Select.Item value="temporal">Temporal Avg</Select.Item>
                        <Select.Item value="exponential">Exponential</Select.Item>
                        <Select.Item value="kalman">Kalman Filter</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </ControlRow>

                  <ControlRow label="Window Size" description={`Frames to consider: ${config.postProcessing.windowSize}`}>
                    <Slider
                      value={[config.postProcessing.windowSize]}
                      onValueChange={([v]) => updatePostProcessing({ windowSize: v })}
                      min={1}
                      max={10}
                      step={1}
                      style={{ width: "100px" }}
                    />
                  </ControlRow>

                  <ControlRow label="Strength" description={`${(config.postProcessing.smoothingStrength * 100).toFixed(0)}%`}>
                    <Slider
                      value={[config.postProcessing.smoothingStrength]}
                      onValueChange={([v]) => updatePostProcessing({ smoothingStrength: v })}
                      min={0}
                      max={1}
                      step={0.05}
                      style={{ width: "100px" }}
                    />
                  </ControlRow>

                  <ControlRow label="Min Confidence" description={`${(config.postProcessing.minConfidenceForSmoothing * 100).toFixed(0)}%`}>
                    <Slider
                      value={[config.postProcessing.minConfidenceForSmoothing]}
                      onValueChange={([v]) => updatePostProcessing({ minConfidenceForSmoothing: v })}
                      min={0}
                      max={1}
                      step={0.05}
                      style={{ width: "100px" }}
                    />
                  </ControlRow>
                </>
              )}

              <Separator style={{ margin: "12px 0" }} />

              <ControlRow label="Interpolation" description="Generate intermediate frames">
                <Switch
                  checked={config.postProcessing.interpolationEnabled}
                  onCheckedChange={(v) => updatePostProcessing({ interpolationEnabled: v })}
                />
              </ControlRow>

              {config.postProcessing.interpolationEnabled && (
                <ControlRow label="Points" description={`${config.postProcessing.interpolationPoints} point${config.postProcessing.interpolationPoints > 1 ? 's' : ''} between frames`}>
                  <Slider
                    value={[config.postProcessing.interpolationPoints]}
                    onValueChange={([v]) => updatePostProcessing({ interpolationPoints: v })}
                    min={1}
                    max={10}
                    step={1}
                    style={{ width: "100px" }}
                  />
                </ControlRow>
              )}

              <Separator style={{ margin: "12px 0" }} />

              <ControlRow label="Velocity Smoothing" description="Reduce jitter on fast movements">
                <Switch
                  checked={config.postProcessing.velocitySmoothing}
                  onCheckedChange={(v) => updatePostProcessing({ velocitySmoothing: v })}
                />
              </ControlRow>

              {config.postProcessing.velocitySmoothing && (
                <ControlRow label="Velocity Threshold" description={`${config.postProcessing.velocityThreshold} px/frame`}>
                  <Slider
                    value={[config.postProcessing.velocityThreshold]}
                    onValueChange={([v]) => updatePostProcessing({ velocityThreshold: v })}
                    min={10}
                    max={200}
                    step={10}
                    style={{ width: "100px" }}
                  />
                </ControlRow>
              )}
            </Section>

            <Separator style={{ marginBottom: "16px" }} />

            {/* Confidence Settings */}
            <Section title="Confidence Thresholds" icon={<TargetIcon />}>
              <ControlRow label="Preset">
                <Select.Root
                  value={config.confidence.preset}
                  onValueChange={(v) => {
                    const preset = v as ConfidencePreset;
                    if (preset === "custom") {
                      updateConfidence({ preset });
                    } else {
                      updateConfidence({
                        preset,
                        ...CONFIDENCE_PRESETS[preset],
                      });
                    }
                  }}
                >
                  <Select.Trigger style={{ minWidth: "120px" }} />
                  <Select.Content>
                    <Select.Item value="low">Low (0.10)</Select.Item>
                    <Select.Item value="standard">Standard (0.25)</Select.Item>
                    <Select.Item value="high">High (0.50)</Select.Item>
                    <Select.Item value="very-high">Very High (0.70)</Select.Item>
                    <Select.Item value="custom">Custom</Select.Item>
                  </Select.Content>
                </Select.Root>
              </ControlRow>

              {config.confidence.preset === "custom" && (
                <>
                  <ControlRow label="Min Pose Score">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.confidence.minPoseScore]}
                        onValueChange={([v]) => updateConfidence({ minPoseScore: v })}
                        min={0}
                        max={1}
                        step={0.05}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" weight="medium" style={{ minWidth: "36px" }}>
                        {config.confidence.minPoseScore.toFixed(2)}
                      </Text>
                    </Flex>
                  </ControlRow>

                  <ControlRow label="Min Part Score">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.confidence.minPartScore]}
                        onValueChange={([v]) => updateConfidence({ minPartScore: v })}
                        min={0}
                        max={1}
                        step={0.05}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" weight="medium" style={{ minWidth: "36px" }}>
                        {config.confidence.minPartScore.toFixed(2)}
                      </Text>
                    </Flex>
                  </ControlRow>
                </>
              )}
            </Section>

            <Separator style={{ marginBottom: "16px" }} />

            {/* Resolution Settings */}
            <Section title="Input Resolution" icon={<MixerHorizontalIcon />}>
              <ControlRow label="Preset" description="Higher = more accurate, slower">
                <Select.Root
                  value={config.resolution.preset}
                  onValueChange={(v) => {
                    const preset = v as ResolutionPreset;
                    if (preset === "custom") {
                      updateResolution({ preset });
                    } else {
                      updateResolution({
                        preset,
                        ...RESOLUTION_PRESETS[preset],
                      });
                    }
                  }}
                >
                  <Select.Trigger style={{ minWidth: "140px" }} />
                  <Select.Content>
                    <Select.Item value="fastest">Fastest (128px)</Select.Item>
                    <Select.Item value="fast">Fast (192px)</Select.Item>
                    <Select.Item value="balanced">Balanced (256px)</Select.Item>
                    <Select.Item value="accurate">Accurate (384px)</Select.Item>
                    <Select.Item value="high">High (512px)</Select.Item>
                    <Select.Item value="maximum">Maximum (640px)</Select.Item>
                    <Select.Item value="ultra">Ultra (1024px)</Select.Item>
                    <Select.Item value="custom">Custom</Select.Item>
                  </Select.Content>
                </Select.Root>
              </ControlRow>

              {config.resolution.preset === "custom" && (
                <>
                  <ControlRow label="Width">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.resolution.width]}
                        onValueChange={([v]) => updateResolution({ width: v })}
                        min={64}
                        max={640}
                        step={32}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" weight="medium" style={{ minWidth: "36px" }}>
                        {config.resolution.width}px
                      </Text>
                    </Flex>
                  </ControlRow>

                  <ControlRow label="Height">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.resolution.height]}
                        onValueChange={([v]) => updateResolution({ height: v })}
                        min={64}
                        max={640}
                        step={32}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" weight="medium" style={{ minWidth: "36px" }}>
                        {config.resolution.height}px
                      </Text>
                    </Flex>
                  </ControlRow>
                </>
              )}
            </Section>

            <Separator style={{ marginBottom: "16px" }} />

            {/* Preprocessing */}
            <Section title="Preprocessing" icon={<TimerIcon />}>
              <ControlRow label="Auto Preprocess" description="Process all frames on load">
                <Switch
                  checked={config.preprocessing.allowAutoPreprocess}
                  onCheckedChange={(v) => updatePreprocessing({ allowAutoPreprocess: v })}
                />
              </ControlRow>

              <ControlRow label="Show Progress" description="Show preprocessing overlay">
                <Switch
                  checked={config.preprocessing.showProgress}
                  onCheckedChange={(v) => updatePreprocessing({ showProgress: v })}
                />
              </ControlRow>

              <ControlRow label="Frame Skip" description="Skip frames for speed">
                <Select.Root
                  value={config.preprocessing.frameSkip.toString()}
                  onValueChange={(v) => updatePreprocessing({ frameSkip: parseInt(v) })}
                >
                  <Select.Trigger style={{ minWidth: "100px" }} />
                  <Select.Content>
                    <Select.Item value="1">Every frame</Select.Item>
                    <Select.Item value="2">Every 2nd</Select.Item>
                    <Select.Item value="3">Every 3rd</Select.Item>
                    <Select.Item value="5">Every 5th</Select.Item>
                  </Select.Content>
                </Select.Root>
              </ControlRow>

              {state.isPreprocessing ? (
                <Flex direction="column" gap="2" style={{ marginTop: "12px" }}>
                  <Flex justify="between" align="center">
                    <Text size="1" color="gray">Progress</Text>
                    <Text size="1" weight="medium">{state.preprocessProgress.toFixed(0)}%</Text>
                  </Flex>
                  <Box
                    style={{
                      width: "100%",
                      height: "6px",
                      backgroundColor: "var(--gray-4)",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      style={{
                        width: `${state.preprocessProgress}%`,
                        height: "100%",
                        backgroundColor: "var(--accent-9)",
                        transition: "width 0.1s",
                      }}
                    />
                  </Box>
                  <Button size="1" variant="soft" color="red" onClick={() => actions?.cancelPreprocessing()}>
                    Cancel
                  </Button>
                </Flex>
              ) : (
                <Flex gap="2" style={{ marginTop: "12px" }}>
                  <Button
                    size="2"
                    variant="soft"
                    onClick={() => actions?.startPreprocessing()}
                    disabled={!state.isVideoReady || state.isPreprocessing}
                    style={{ flex: 1 }}
                  >
                    <ReloadIcon />
                    Preprocess
                  </Button>
                  {state.usingPreprocessedPoses && (
                    <Button size="2" variant="soft" color="red" onClick={() => actions?.clearPreprocessing()}>
                      Clear
                    </Button>
                  )}
                </Flex>
              )}
            </Section>
          </Box>
        </Tabs.Content>

        {/* Display Tab */}
        <Tabs.Content value="display">
          <Box style={{ paddingTop: "16px" }}>
            {/* Skeleton Display */}
            <Section title="Skeleton Overlay" icon={<EyeOpenIcon />}>
              <ControlRow label="Show Skeleton">
                <Switch
                  checked={config.skeleton.showSkeleton}
                  onCheckedChange={(v) => updateSkeleton({ showSkeleton: v })}
                />
              </ControlRow>

              <ControlRow label="Show Keypoints">
                <Switch
                  checked={config.skeleton.showKeypoints}
                  onCheckedChange={(v) => updateSkeleton({ showKeypoints: v })}
                />
              </ControlRow>

              <ControlRow label="Show Connections">
                <Switch
                  checked={config.skeleton.showConnections}
                  onCheckedChange={(v) => updateSkeleton({ showConnections: v })}
                />
              </ControlRow>

              <ControlRow label="Show Face">
                <Switch
                  checked={config.skeleton.showFaceLandmarks}
                  onCheckedChange={(v) => updateSkeleton({ showFaceLandmarks: v })}
                />
              </ControlRow>

              <ControlRow label="Show Tracking ID">
                <Switch
                  checked={config.skeleton.showTrackingId}
                  onCheckedChange={(v) => updateSkeleton({ showTrackingId: v })}
                />
              </ControlRow>

              <ControlRow label="Show Bounding Box">
                <Switch
                  checked={config.skeleton.showBoundingBox}
                  onCheckedChange={(v) => updateSkeleton({ showBoundingBox: v })}
                />
              </ControlRow>

              <ControlRow label="Show Confidence">
                <Switch
                  checked={config.skeleton.showConfidenceScores}
                  onCheckedChange={(v) => updateSkeleton({ showConfidenceScores: v })}
                />
              </ControlRow>

              <ControlRow label="Keypoint Size">
                <Flex align="center" gap="2">
                  <Slider
                    value={[config.skeleton.keypointRadius]}
                    onValueChange={([v]) => updateSkeleton({ keypointRadius: v })}
                    min={1}
                    max={12}
                    step={1}
                    style={{ width: "80px" }}
                  />
                  <Text size="1" weight="medium" style={{ minWidth: "20px" }}>
                    {config.skeleton.keypointRadius}
                  </Text>
                </Flex>
              </ControlRow>

              <ControlRow label="Line Width">
                <Flex align="center" gap="2">
                  <Slider
                    value={[config.skeleton.connectionWidth]}
                    onValueChange={([v]) => updateSkeleton({ connectionWidth: v })}
                    min={1}
                    max={8}
                    step={1}
                    style={{ width: "80px" }}
                  />
                  <Text size="1" weight="medium" style={{ minWidth: "20px" }}>
                    {config.skeleton.connectionWidth}
                  </Text>
                </Flex>
              </ControlRow>

              <ControlRow label="Opacity">
                <Flex align="center" gap="2">
                  <Slider
                    value={[config.skeleton.opacity]}
                    onValueChange={([v]) => updateSkeleton({ opacity: v })}
                    min={0}
                    max={1}
                    step={0.1}
                    style={{ width: "80px" }}
                  />
                  <Text size="1" weight="medium" style={{ minWidth: "36px" }}>
                    {(config.skeleton.opacity * 100).toFixed(0)}%
                  </Text>
                </Flex>
              </ControlRow>
            </Section>

            <Separator style={{ marginBottom: "16px" }} />

            {/* Angle Measurements */}
            <Section title="Angle Measurements" icon={<TargetIcon />}>
              <ControlRow label="Show Angles">
                <Switch
                  checked={config.angles.showAngles}
                  onCheckedChange={(v) => updateAngles({ showAngles: v })}
                />
              </ControlRow>

              <ControlRow label="Show Arc">
                <Switch
                  checked={config.angles.showAngleArc}
                  onCheckedChange={(v) => updateAngles({ showAngleArc: v })}
                />
              </ControlRow>

              <ControlRow label="Font Size">
                <Flex align="center" gap="2">
                  <Slider
                    value={[config.angles.fontSize]}
                    onValueChange={([v]) => updateAngles({ fontSize: v })}
                    min={10}
                    max={36}
                    step={2}
                    style={{ width: "80px" }}
                  />
                  <Text size="1" weight="medium" style={{ minWidth: "24px" }}>
                    {config.angles.fontSize}
                  </Text>
                </Flex>
              </ControlRow>

              <Text size="1" weight="medium" style={{ marginBottom: "8px", marginTop: "12px" }}>
                Angle Presets
              </Text>
              <Flex wrap="wrap" gap="2">
                {Object.entries(ANGLE_PRESETS).map(([name, angle]) => (
                  <Button
                    key={name}
                    size="1"
                    variant={isAngleActive(angle) ? "solid" : "soft"}
                    onClick={() => toggleAngle(angle)}
                  >
                    {name.replace(/([A-Z])/g, " $1").trim()}
                  </Button>
                ))}
              </Flex>

              <Text size="1" color="gray" style={{ marginTop: "12px" }}>
                Active: {config.angles.measuredAngles.length} angles
              </Text>
            </Section>

            <Separator style={{ marginBottom: "16px" }} />

            {/* Body Orientation */}
            <Section title="Body Orientation" icon={<TargetIcon />}>
              <ControlRow label="Show Orientation" description="Display body facing direction">
                <Switch
                  checked={config.bodyOrientation.showOrientation}
                  onCheckedChange={(v) => updateBodyOrientation({ showOrientation: v })}
                />
              </ControlRow>

              {config.bodyOrientation.showOrientation && (
                <>
                  <ControlRow label="Show Ellipse" description="Ground circle below feet">
                    <Switch
                      checked={config.bodyOrientation.showEllipse}
                      onCheckedChange={(v) => updateBodyOrientation({ showEllipse: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Show Direction" description="Arrow indicating facing direction">
                    <Switch
                      checked={config.bodyOrientation.showDirectionLine}
                      onCheckedChange={(v) => updateBodyOrientation({ showDirectionLine: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Show Angle" description="Orientation angle in degrees">
                    <Switch
                      checked={config.bodyOrientation.showAngleValue}
                      onCheckedChange={(v) => updateBodyOrientation({ showAngleValue: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Ellipse Size" description={`${config.bodyOrientation.ellipseSize}px`}>
                    <Slider
                      value={[config.bodyOrientation.ellipseSize]}
                      onValueChange={([v]) => updateBodyOrientation({ ellipseSize: v })}
                      min={200}
                      max={400}
                      step={10}
                      style={{ width: "100px" }}
                    />
                  </ControlRow>

                  <ControlRow label="Line Length" description={`${(config.bodyOrientation.lineLength * 100).toFixed(0)}%`}>
                    <Slider
                      value={[config.bodyOrientation.lineLength]}
                      onValueChange={([v]) => updateBodyOrientation({ lineLength: v })}
                      min={0.5}
                      max={2}
                      step={0.1}
                      style={{ width: "100px" }}
                    />
                  </ControlRow>

                  <ControlRow label="Min Confidence" description={`${(config.bodyOrientation.minConfidence * 100).toFixed(0)}%`}>
                    <Slider
                      value={[config.bodyOrientation.minConfidence]}
                      onValueChange={([v]) => updateBodyOrientation({ minConfidence: v })}
                      min={0.1}
                      max={0.9}
                      step={0.05}
                      style={{ width: "100px" }}
                    />
                  </ControlRow>
                </>
              )}
            </Section>

            <Separator style={{ marginBottom: "16px" }} />

            {/* Trajectories */}
            <Section title="Joint Trajectories" icon={<ActivityLogIcon />}>
              <ControlRow label="Show Trajectories">
                <Switch
                  checked={config.trajectories.showTrajectories}
                  onCheckedChange={(v) => updateTrajectories({ showTrajectories: v })}
                />
              </ControlRow>

              <ControlRow label="Smooth Lines">
                <Switch
                  checked={config.trajectories.smoothTrajectories}
                  onCheckedChange={(v) => updateTrajectories({ smoothTrajectories: v })}
                />
              </ControlRow>

              <ControlRow label="Enable Fade">
                <Switch
                  checked={config.trajectories.enableFade}
                  onCheckedChange={(v) => updateTrajectories({ enableFade: v })}
                />
              </ControlRow>

              <ControlRow label="History Length">
                <Flex align="center" gap="2">
                  <Slider
                    value={[config.trajectories.maxTrajectoryPoints]}
                    onValueChange={([v]) => updateTrajectories({ maxTrajectoryPoints: v })}
                    min={10}
                    max={300}
                    step={10}
                    style={{ width: "80px" }}
                  />
                  <Text size="1" weight="medium" style={{ minWidth: "36px" }}>
                    {config.trajectories.maxTrajectoryPoints}
                  </Text>
                </Flex>
              </ControlRow>

              <Text size="1" weight="medium" style={{ marginBottom: "8px", marginTop: "12px" }}>
                Tracked Joints
              </Text>
              <Flex wrap="wrap" gap="1">
                {Array.from({ length: getJointCount(config.model.model) }, (_, i) => (
                  <Button
                    key={i}
                    size="1"
                    variant={config.trajectories.selectedJoints.includes(i) ? "solid" : "soft"}
                    onClick={() => toggleJoint(i)}
                    style={{ padding: "2px 6px", fontSize: "10px" }}
                  >
                    {i}
                  </Button>
                ))}
              </Flex>
              <Text size="1" color="gray" style={{ marginTop: "8px" }}>
                Selected: {config.trajectories.selectedJoints
                  .map((j) => getJointName(j, config.model.model))
                  .join(", ") || "None"}
              </Text>
            </Section>
          </Box>
        </Tabs.Content>

        {/* Protocols Tab */}
        <Tabs.Content value="protocols">
          <Box style={{ paddingTop: "16px" }}>
            {/* Protocols Info */}
            <Section title="Post-Processing Protocols" icon={<ActivityLogIcon />}>
              <Text size="1" color="gray" style={{ marginBottom: "16px", display: "block" }}>
                Protocols run automatically after preprocessing completes.
              </Text>

              <ControlRow label="Show Results Overlay" description="Display protocol results on video">
                <Switch
                  checked={config.protocols.showResultsOverlay}
                  onCheckedChange={(v) => updateProtocols({ showResultsOverlay: v })}
                />
              </ControlRow>

              <ControlRow label="Log Execution" description="Log protocol execution to console">
                <Switch
                  checked={config.protocols.logExecution}
                  onCheckedChange={(v) => updateProtocols({ logExecution: v })}
                />
              </ControlRow>
            </Section>

            <Separator style={{ marginBottom: "16px" }} />

            {/* Swing Protocols */}
            <Section title="Swing Detection" icon={<TargetIcon />}>
              {AVAILABLE_PROTOCOLS.filter((p) => p.category === "swing").map((protocol) => (
                <ControlRow
                  key={protocol.id}
                  label={
                    <Flex align="center" gap="2">
                      <Text>{protocol.name}</Text>
                      {protocol.experimental && (
                        <Badge size="1" color="orange">Beta</Badge>
                      )}
                    </Flex>
                  }
                  description={protocol.description}
                >
                  <Switch
                    checked={isProtocolEnabled(protocol.id)}
                    onCheckedChange={() => toggleProtocol(protocol.id)}
                  />
                </ControlRow>
              ))}
            </Section>

            {/* V3 Configuration (only visible when V3 is enabled) */}
            {isProtocolEnabled("swing-detection-v3") && (
              <>
                <Separator style={{ marginBottom: "16px" }} />
                
                <Section title="Swing Detection V3 Settings" icon={<GearIcon />}>
                  <Text size="1" color="gray" style={{ marginBottom: "16px", display: "block" }}>
                    Configure the orientation-enhanced swing detection algorithm.
                  </Text>

                  <ControlRow label="Require Body Rotation" description="Reject peaks without body rotation">
                    <Switch
                      checked={config.swingDetectionV3.requireRotation}
                      onCheckedChange={(v) => updateSwingDetectionV3({ requireRotation: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Classify Swing Type" description="Detect forehand vs backhand">
                    <Switch
                      checked={config.swingDetectionV3.classifySwingType}
                      onCheckedChange={(v) => updateSwingDetectionV3({ classifySwingType: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Handedness" description="Player's dominant hand">
                    <Select.Root
                      value={config.swingDetectionV3.handedness}
                      onValueChange={(v) => updateSwingDetectionV3({ handedness: v as "right" | "left" })}
                    >
                      <Select.Trigger />
                      <Select.Content>
                        <Select.Item value="right">Right-handed</Select.Item>
                        <Select.Item value="left">Left-handed</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </ControlRow>

                  <ControlRow label="Wrist Mode" description="Which wrist(s) to use for velocity">
                    <Select.Root
                      value={config.swingDetectionV3.wristMode}
                      onValueChange={(v) => updateSwingDetectionV3({ wristMode: v as "both" | "max" | "dominant" })}
                    >
                      <Select.Trigger />
                      <Select.Content>
                        <Select.Item value="both">Both (accumulated)</Select.Item>
                        <Select.Item value="max">Max (higher velocity)</Select.Item>
                        <Select.Item value="dominant">Dominant hand only</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </ControlRow>

                  <Separator style={{ marginTop: "12px", marginBottom: "12px" }} />

                  <ControlRow label="Min Velocity Threshold" description="Minimum wrist speed (px/frame)">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.swingDetectionV3.minVelocityThreshold]}
                        onValueChange={([v]) => updateSwingDetectionV3({ minVelocityThreshold: v })}
                        min={1}
                        max={20}
                        step={0.5}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" style={{ minWidth: "40px" }}>
                        {config.swingDetectionV3.minVelocityThreshold.toFixed(1)}
                      </Text>
                    </Flex>
                  </ControlRow>

                  <ControlRow label="Min Speed (km/h)" description="Minimum swing speed to count">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.swingDetectionV3.minVelocityKmh]}
                        onValueChange={([v]) => updateSwingDetectionV3({ minVelocityKmh: v })}
                        min={0}
                        max={50}
                        step={1}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" style={{ minWidth: "40px" }}>
                        {config.swingDetectionV3.minVelocityKmh} km/h
                      </Text>
                    </Flex>
                  </ControlRow>

                  <ControlRow label="Min Rotation Velocity" description="Minimum rotation (deg/frame)">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.swingDetectionV3.minRotationVelocity]}
                        onValueChange={([v]) => updateSwingDetectionV3({ minRotationVelocity: v })}
                        min={0.5}
                        max={10}
                        step={0.5}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" style={{ minWidth: "40px" }}>
                        {config.swingDetectionV3.minRotationVelocity.toFixed(1)}°
                      </Text>
                    </Flex>
                  </ControlRow>

                  <ControlRow label="Rotation Weight" description="Influence of rotation on swing score">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.swingDetectionV3.rotationWeight]}
                        onValueChange={([v]) => updateSwingDetectionV3({ rotationWeight: v })}
                        min={0}
                        max={1}
                        step={0.05}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" style={{ minWidth: "40px" }}>
                        {(config.swingDetectionV3.rotationWeight * 100).toFixed(0)}%
                      </Text>
                    </Flex>
                  </ControlRow>

                  <Separator style={{ marginTop: "12px", marginBottom: "12px" }} />

                  <ControlRow label="Min Time Between Swings" description="Minimum seconds between swings">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.swingDetectionV3.minTimeBetweenSwings]}
                        onValueChange={([v]) => updateSwingDetectionV3({ minTimeBetweenSwings: v })}
                        min={0.2}
                        max={2}
                        step={0.1}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" style={{ minWidth: "40px" }}>
                        {config.swingDetectionV3.minTimeBetweenSwings.toFixed(1)}s
                      </Text>
                    </Flex>
                  </ControlRow>

                  <ControlRow label="Smoothing Window" description="Moving average window size">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.swingDetectionV3.smoothingWindow]}
                        onValueChange={([v]) => updateSwingDetectionV3({ smoothingWindow: v })}
                        min={1}
                        max={10}
                        step={1}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" style={{ minWidth: "40px" }}>
                        {config.swingDetectionV3.smoothingWindow}
                      </Text>
                    </Flex>
                  </ControlRow>

                  <Separator style={{ marginTop: "12px", marginBottom: "12px" }} />

                  <ControlRow label="Show Swing Overlay" description="Highlight detected swings on video">
                    <Switch
                      checked={config.swingDetectionV3.showSwingOverlay}
                      onCheckedChange={(v) => updateSwingDetectionV3({ showSwingOverlay: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Show Phase Colors" description="Color-code swing phases">
                    <Switch
                      checked={config.swingDetectionV3.showPhaseColors}
                      onCheckedChange={(v) => updateSwingDetectionV3({ showPhaseColors: v })}
                    />
                  </ControlRow>

                  <Separator style={{ marginTop: "12px", marginBottom: "12px" }} />

                  <Text size="1" weight="medium" style={{ marginBottom: "8px", display: "block" }}>
                    Clip Boundaries (for analysis export)
                  </Text>

                  <ControlRow label="Lead Time" description="Seconds before swing end">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.swingDetectionV3.clipLeadTime]}
                        onValueChange={([v]) => updateSwingDetectionV3({ clipLeadTime: v })}
                        min={0.5}
                        max={5}
                        step={0.1}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" style={{ minWidth: "40px" }}>
                        {config.swingDetectionV3.clipLeadTime.toFixed(1)}s
                      </Text>
                    </Flex>
                  </ControlRow>

                  <ControlRow label="Trail Time" description="Seconds after swing end">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.swingDetectionV3.clipTrailTime]}
                        onValueChange={([v]) => updateSwingDetectionV3({ clipTrailTime: v })}
                        min={0.5}
                        max={3}
                        step={0.1}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" style={{ minWidth: "40px" }}>
                        {config.swingDetectionV3.clipTrailTime.toFixed(1)}s
                      </Text>
                    </Flex>
                  </ControlRow>

                  <Box
                    style={{
                      marginTop: "8px",
                      padding: "8px",
                      backgroundColor: "var(--gray-3)",
                      borderRadius: "4px",
                    }}
                  >
                    <Text size="1" color="gray">
                      Total clip duration: {(config.swingDetectionV3.clipLeadTime + config.swingDetectionV3.clipTrailTime).toFixed(1)}s
                    </Text>
                  </Box>
                </Section>
              </>
            )}

            <Separator style={{ marginBottom: "16px" }} />

            {/* Technique Protocols */}
            <Section title="Technique Analysis" icon={<TargetIcon />}>
              {AVAILABLE_PROTOCOLS.filter((p) => p.category === "technique").map((protocol) => (
                <ControlRow
                  key={protocol.id}
                  label={
                    <Flex align="center" gap="2">
                      <Text>{protocol.name}</Text>
                      {protocol.experimental && (
                        <Badge size="1" color="orange">Beta</Badge>
                      )}
                    </Flex>
                  }
                  description={protocol.description}
                >
                  <Switch
                    checked={isProtocolEnabled(protocol.id)}
                    onCheckedChange={() => toggleProtocol(protocol.id)}
                  />
                </ControlRow>
              ))}
            </Section>

            <Separator style={{ marginBottom: "16px" }} />

            {/* Metrics Protocols */}
            <Section title="Metrics" icon={<TimerIcon />}>
              {AVAILABLE_PROTOCOLS.filter((p) => p.category === "metrics").map((protocol) => (
                <ControlRow
                  key={protocol.id}
                  label={
                    <Flex align="center" gap="2">
                      <Text>{protocol.name}</Text>
                      {protocol.experimental && (
                        <Badge size="1" color="orange">Beta</Badge>
                      )}
                    </Flex>
                  }
                  description={protocol.description}
                >
                  <Switch
                    checked={isProtocolEnabled(protocol.id)}
                    onCheckedChange={() => toggleProtocol(protocol.id)}
                  />
                </ControlRow>
              ))}
            </Section>

            {/* Summary */}
            <Box
              style={{
                marginTop: "16px",
                padding: "12px",
                backgroundColor: "var(--gray-3)",
                borderRadius: "6px",
              }}
            >
              <Flex justify="between" align="center">
                <Text size="1" color="gray">Enabled Protocols</Text>
                <Badge color="green" size="1">
                  {config.protocols.enabledProtocols.length} / {AVAILABLE_PROTOCOLS.length}
                </Badge>
              </Flex>
              {config.protocols.enabledProtocols.length > 0 && (
                <Text size="1" style={{ marginTop: "8px", display: "block" }}>
                  {config.protocols.enabledProtocols
                    .map((id) => AVAILABLE_PROTOCOLS.find((p) => p.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              )}
              
              {/* Rerun Protocols Button */}
              {state.usingPreprocessedPoses && (
                <Button
                  size="2"
                  variant="soft"
                  onClick={() => actions?.rerunProtocols()}
                  disabled={!actions}
                  style={{ marginTop: "12px", width: "100%" }}
                >
                  <ReloadIcon width={14} height={14} />
                  Rerun Protocols
                </Button>
              )}
            </Box>

            {/* Handedness Detection Result */}
            {state.handednessResult && (
              <Box
                style={{
                  marginTop: "12px",
                  padding: "12px",
                  backgroundColor: "var(--cyan-3)",
                  borderRadius: "6px",
                  border: "1px solid var(--cyan-6)",
                }}
              >
                <Flex justify="between" align="center">
                  <Flex align="center" gap="2">
                    <Text size="2" weight="medium" style={{ color: "var(--cyan-11)" }}>
                      🖐️ Detected Handedness
                    </Text>
                  </Flex>
                  <Badge 
                    color={state.handednessResult.confidence > 0.7 ? "green" : state.handednessResult.confidence > 0.5 ? "yellow" : "orange"} 
                    size="1"
                  >
                    {(state.handednessResult.confidence * 100).toFixed(0)}% confident
                  </Badge>
                </Flex>
                <Flex align="center" gap="2" style={{ marginTop: "8px" }}>
                  <Text size="3" weight="bold" style={{ textTransform: "capitalize" }}>
                    {state.handednessResult.dominantHand}-handed
                  </Text>
                  <Text size="1" color="gray">
                    (based on wrist velocity analysis)
                  </Text>
                </Flex>
              </Box>
            )}
          </Box>
        </Tabs.Content>

        {/* Advanced Tab */}
        <Tabs.Content value="advanced">
          <Box style={{ paddingTop: "16px" }}>
            {/* Joint Stabilization */}
            <Section title="Joint Stabilization" icon={<MixerHorizontalIcon />}>
              <Text size="1" color="gray" style={{ marginBottom: "12px" }}>
                Reduces jitter by locking stationary joints
              </Text>

              <ControlRow label="Enable">
                <Switch
                  checked={config.stabilization.enabled}
                  onCheckedChange={(v) => updateStabilization({ enabled: v })}
                />
              </ControlRow>

              {config.stabilization.enabled && (
                <>
                  <ControlRow label="Strength">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.stabilization.strength]}
                        onValueChange={([v]) => updateStabilization({ strength: v })}
                        min={0}
                        max={1}
                        step={0.1}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" weight="medium" style={{ minWidth: "36px" }}>
                        {(config.stabilization.strength * 100).toFixed(0)}%
                      </Text>
                    </Flex>
                  </ControlRow>

                  <ControlRow label="Velocity Threshold">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.stabilization.velocityThreshold]}
                        onValueChange={([v]) => updateStabilization({ velocityThreshold: v })}
                        min={1}
                        max={20}
                        step={1}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" weight="medium" style={{ minWidth: "24px" }}>
                        {config.stabilization.velocityThreshold}
                      </Text>
                    </Flex>
                  </ControlRow>
                </>
              )}
            </Section>

            <Separator style={{ marginBottom: "16px" }} />

            {/* Pose Stability Filter */}
            <Section title="Pose Stability Filter" icon={<TargetIcon />}>
              <Text size="1" color="gray" style={{ marginBottom: "12px" }}>
                Detects and recovers from corrupted "banana" frames
              </Text>

              <ControlRow label="Enable">
                <Switch
                  checked={config.stabilityFilter.enabled}
                  onCheckedChange={(v) => updateStabilityFilter({ enabled: v })}
                />
              </ControlRow>

              {config.stabilityFilter.enabled && (
                <>
                  <ControlRow label="Mirror Only Mode" description="Simple mirroring, skip state machine">
                    <Switch
                      checked={config.stabilityFilter.mirrorOnlyMode}
                      onCheckedChange={(v) => updateStabilityFilter({ mirrorOnlyMode: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Mirror Recovery">
                    <Switch
                      checked={config.stabilityFilter.enableMirrorRecovery}
                      onCheckedChange={(v) => updateStabilityFilter({ enableMirrorRecovery: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Max Angle Change">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.stabilityFilter.maxAngleChange]}
                        onValueChange={([v]) => updateStabilityFilter({ maxAngleChange: v })}
                        min={10}
                        max={60}
                        step={5}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" weight="medium" style={{ minWidth: "30px" }}>
                        {config.stabilityFilter.maxAngleChange}°
                      </Text>
                    </Flex>
                  </ControlRow>

                  {!config.stabilityFilter.mirrorOnlyMode && (
                    <>
                      <ControlRow label="Max Segment Change">
                        <Flex align="center" gap="2">
                          <Slider
                            value={[config.stabilityFilter.maxSegmentChange]}
                            onValueChange={([v]) => updateStabilityFilter({ maxSegmentChange: v })}
                            min={1.1}
                            max={1.5}
                            step={0.05}
                            style={{ width: "80px" }}
                          />
                          <Text size="1" weight="medium" style={{ minWidth: "36px" }}>
                            {((config.stabilityFilter.maxSegmentChange - 1) * 100).toFixed(0)}%
                          </Text>
                        </Flex>
                      </ControlRow>

                      <ControlRow label="Similarity Threshold">
                        <Flex align="center" gap="2">
                          <Slider
                            value={[config.stabilityFilter.similarityThreshold]}
                            onValueChange={([v]) => updateStabilityFilter({ similarityThreshold: v })}
                            min={0.5}
                            max={0.99}
                            step={0.01}
                            style={{ width: "80px" }}
                          />
                          <Text size="1" weight="medium" style={{ minWidth: "36px" }}>
                            {(config.stabilityFilter.similarityThreshold * 100).toFixed(0)}%
                          </Text>
                        </Flex>
                      </ControlRow>

                      <ControlRow label="Motion Simulation">
                        <Switch
                          checked={config.stabilityFilter.enableSimulation}
                          onCheckedChange={(v) => updateStabilityFilter({ enableSimulation: v })}
                        />
                      </ControlRow>

                      <ControlRow label="Recovery Frames">
                        <Flex align="center" gap="2">
                          <Slider
                            value={[config.stabilityFilter.recoveryFrameCount]}
                            onValueChange={([v]) => updateStabilityFilter({ recoveryFrameCount: v })}
                            min={1}
                            max={10}
                            step={1}
                            style={{ width: "80px" }}
                          />
                          <Text size="1" weight="medium" style={{ minWidth: "20px" }}>
                            {config.stabilityFilter.recoveryFrameCount}
                          </Text>
                        </Flex>
                      </ControlRow>
                    </>
                  )}
                </>
              )}
            </Section>

            <Separator style={{ marginBottom: "16px" }} />

            {/* Velocity Display */}
            <Section title="Velocity Tracking" icon={<TimerIcon />}>
              <ControlRow label="Show Velocity">
                <Switch
                  checked={config.velocity.showVelocity}
                  onCheckedChange={(v) => updateVelocity({ showVelocity: v })}
                />
              </ControlRow>

              {config.velocity.showVelocity && (
                <>
                  <ControlRow label="Tracked Wrist">
                    <Select.Root
                      value={config.velocity.trackedWrist}
                      onValueChange={(v) => updateVelocity({ trackedWrist: v as "left" | "right" | "both" })}
                    >
                      <Select.Trigger style={{ minWidth: "100px" }} />
                      <Select.Content>
                        <Select.Item value="left">Left</Select.Item>
                        <Select.Item value="right">Right</Select.Item>
                        <Select.Item value="both">Both</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </ControlRow>

                  <ControlRow label="Show km/h">
                    <Switch
                      checked={config.velocity.showKmh}
                      onCheckedChange={(v) => updateVelocity({ showKmh: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Show mph">
                    <Switch
                      checked={config.velocity.showMph}
                      onCheckedChange={(v) => updateVelocity({ showMph: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Show px/frame">
                    <Switch
                      checked={config.velocity.showPixelsPerFrame}
                      onCheckedChange={(v) => updateVelocity({ showPixelsPerFrame: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Player Height (m)">
                    <Flex align="center" gap="2">
                      <Slider
                        value={[config.velocity.playerHeightMeters]}
                        onValueChange={([v]) => updateVelocity({ playerHeightMeters: v })}
                        min={1.4}
                        max={2.2}
                        step={0.05}
                        style={{ width: "80px" }}
                      />
                      <Text size="1" weight="medium" style={{ minWidth: "36px" }}>
                        {config.velocity.playerHeightMeters.toFixed(2)}m
                      </Text>
                    </Flex>
                  </ControlRow>
                </>
              )}
            </Section>

            <Separator style={{ marginBottom: "16px" }} />

            {/* Debug Options */}
            <Section title="Debug Options" icon={<ActivityLogIcon />}>
              <ControlRow label="Show Debug Overlay">
                <Switch
                  checked={config.debug.showDebugOverlay}
                  onCheckedChange={(v) => updateDebug({ showDebugOverlay: v })}
                />
              </ControlRow>

              {config.debug.showDebugOverlay && (
                <>
                  <ControlRow label="Show FPS">
                    <Switch
                      checked={config.debug.showFPS}
                      onCheckedChange={(v) => updateDebug({ showFPS: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Show Detection Timing">
                    <Switch
                      checked={config.debug.showDetectionTiming}
                      onCheckedChange={(v) => updateDebug({ showDetectionTiming: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Show Memory Usage">
                    <Switch
                      checked={config.debug.showMemoryUsage}
                      onCheckedChange={(v) => updateDebug({ showMemoryUsage: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Show Preprocessing Stats">
                    <Switch
                      checked={config.debug.showPreprocessingStats}
                      onCheckedChange={(v) => updateDebug({ showPreprocessingStats: v })}
                    />
                  </ControlRow>

                  <ControlRow label="Show Video Metadata">
                    <Switch
                      checked={config.debug.showVideoMetadata}
                      onCheckedChange={(v) => updateDebug({ showVideoMetadata: v })}
                    />
                  </ControlRow>
                </>
              )}

              <ControlRow label="Log Detections">
                <Switch
                  checked={config.debug.logDetections}
                  onCheckedChange={(v) => updateDebug({ logDetections: v })}
                />
              </ControlRow>
            </Section>
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Card>
  );
}

export default PoseConfigurationPanel;

