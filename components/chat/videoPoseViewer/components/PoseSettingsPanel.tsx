"use client";

import { Box, Flex, Button, Text, Switch, Select, Grid } from "@radix-ui/themes";
import buttonStyles from "@/styles/buttons.module.css";
import selectStyles from "@/styles/selects.module.css";
import type { SupportedModel } from "@/hooks/usePoseDetection";

interface PoseSettingsPanelProps {
  // Loading states
  isLoading: boolean;
  isDetecting: boolean;
  isPreprocessing: boolean;

  // Display toggles
  showSkeleton: boolean;
  setShowSkeleton: (value: boolean) => void;
  showTrajectories: boolean;
  setShowTrajectories: (value: boolean) => void;
  smoothTrajectories: boolean;
  setSmoothTrajectories: (value: boolean) => void;
  showAngles: boolean;
  setShowAngles: (value: boolean) => void;
  enableAngleClicking: boolean;
  setEnableAngleClicking: (value: boolean) => void;
  showVelocity: boolean;
  setShowVelocity: (value: boolean) => void;
  velocityWrist: "left" | "right";
  setVelocityWrist: (value: "left" | "right") => void;
  showTrackingId: boolean;
  setShowTrackingId: (value: boolean) => void;
  showFaceLandmarks: boolean;
  setShowFaceLandmarks: (value: boolean) => void;
  enableSmoothing: boolean;
  setEnableSmoothing: (value: boolean) => void;
  useAccurateMode: boolean;
  setUseAccurateMode: (value: boolean) => void;

  // Angle measurement
  measuredAngles: Array<[number, number, number]>;
  setMeasuredAngles: (value: Array<[number, number, number]>) => void;
  selectedAngleJoints: number[];
  setSelectedAngleJoints: (value: number[]) => void;
  toggleAnglePreset: (angle: [number, number, number]) => void;

  // Joint selection for trajectories
  selectedJoints: number[];
  setSelectedJoints: (value: number[]) => void;
  clearTrajectories: () => void;

  // Max poses
  maxPoses: number;
  setMaxPoses: (value: number) => void;

  // Pose detection settings
  isPoseEnabled: boolean;
  setIsPoseEnabled: (value: boolean) => void;
  confidenceMode: "standard" | "high" | "low";
  setConfidenceMode: (value: "standard" | "high" | "low") => void;
  resolutionMode: "fast" | "balanced" | "accurate";
  setResolutionMode: (value: "fast" | "balanced" | "accurate") => void;
  selectedModel: SupportedModel;
  setSelectedModel: (value: SupportedModel) => void;
  blazePoseModelType: "lite" | "full" | "heavy";
  setBlazePoseModelType: (value: "lite" | "full" | "heavy") => void;
  setCurrentPoses: (value: any[]) => void;
}

/**
 * PoseSettingsPanel - Settings panel for pose detection configuration
 * 
 * Extracted from VideoPoseViewerCore to improve maintainability.
 * Contains all pose-related UI controls including:
 * - Visualization toggles (skeleton, trajectories, angles, velocity)
 * - Angle preset buttons
 * - Joint selection for trajectories
 * - Max poses slider
 * - Pose detection settings (confidence, resolution, model selection)
 */
export function PoseSettingsPanel({
  isLoading,
  isDetecting,
  isPreprocessing,
  showSkeleton,
  setShowSkeleton,
  showTrajectories,
  setShowTrajectories,
  smoothTrajectories,
  setSmoothTrajectories,
  showAngles,
  setShowAngles,
  enableAngleClicking,
  setEnableAngleClicking,
  showVelocity,
  setShowVelocity,
  velocityWrist,
  setVelocityWrist,
  showTrackingId,
  setShowTrackingId,
  showFaceLandmarks,
  setShowFaceLandmarks,
  enableSmoothing,
  setEnableSmoothing,
  useAccurateMode,
  setUseAccurateMode,
  measuredAngles,
  setMeasuredAngles,
  selectedAngleJoints,
  setSelectedAngleJoints,
  toggleAnglePreset,
  selectedJoints,
  setSelectedJoints,
  clearTrajectories,
  maxPoses,
  setMaxPoses,
  isPoseEnabled,
  setIsPoseEnabled,
  confidenceMode,
  setConfidenceMode,
  resolutionMode,
  setResolutionMode,
  selectedModel,
  setSelectedModel,
  blazePoseModelType,
  setBlazePoseModelType,
  setCurrentPoses,
}: PoseSettingsPanelProps) {
  return (
    <>
      {/* Visualization Toggles Grid */}
      <Grid columns="2" gap="4">
        {/* Column 1: Main Feature Toggles */}
        <Flex direction="column" gap="3">
          {/* Skeleton Toggle */}
          <Flex gap="2" align="center">
            <Switch
              checked={showSkeleton}
              onCheckedChange={setShowSkeleton}
              disabled={isLoading}
            />
            <Text size="2" color="gray">
              Show skeleton
              {isDetecting && showSkeleton && (
                <Text as="span" color="mint" ml="2">
                  • Detecting
                </Text>
              )}
            </Text>
          </Flex>

          {/* Joint Trajectory Tracking Toggle */}
          <Flex direction="column" gap="2">
            <Flex gap="2" align="center">
              <Switch
                checked={showTrajectories}
                onCheckedChange={(checked) => {
                  setShowTrajectories(checked);
                  if (!checked) {
                    clearTrajectories(); // Clear trajectories when disabled
                  }
                }}
                disabled={isLoading}
              />
              <Text size="2" color="gray">
                Joint trajectories
              </Text>
            </Flex>
            {/* Trajectory Smoothing (nested) */}
            {showTrajectories && (
              <Flex gap="2" align="center" pl="4">
                <Switch
                  checked={smoothTrajectories}
                  onCheckedChange={setSmoothTrajectories}
                  disabled={isLoading || !showTrajectories}
                  size="1"
                />
                <Text size="1" color="gray">
                  Smooth paths
                </Text>
              </Flex>
            )}
          </Flex>

          {/* Angle Display Toggle */}
          <Flex direction="column" gap="2">
            <Flex gap="2" align="center">
              <Switch
                checked={showAngles}
                onCheckedChange={(checked) => {
                  setShowAngles(checked);
                  if (!checked) {
                    setEnableAngleClicking(false); // Disable clicking when hiding angles
                  }
                }}
                disabled={isLoading}
              />
              <Text size="2" color="gray">
                Show angles
              </Text>
            </Flex>
            {/* Angle Clicking (nested) */}
            {showAngles && (
              <Flex gap="2" align="center" pl="4">
                <Switch
                  checked={enableAngleClicking}
                  onCheckedChange={(checked) => {
                    setEnableAngleClicking(checked);
                    if (!checked) {
                      setSelectedAngleJoints([]); // Clear selection when disabling clicking
                    }
                  }}
                  disabled={isLoading}
                  size="1"
                />
                <Text size="1" color="gray">
                  Enable clicking
                </Text>
              </Flex>
            )}
          </Flex>

          {/* Velocity Toggle */}
          <Flex direction="column" gap="2">
            <Flex gap="2" align="center">
              <Switch
                checked={showVelocity}
                onCheckedChange={setShowVelocity}
                disabled={isLoading}
              />
              <Text size="2" color="gray">
                Wrist Velocity
              </Text>
            </Flex>
            {/* Wrist Selection (nested) */}
            {showVelocity && (
              <Flex gap="2" align="center" pl="4">
                <Flex gap="1">
                  <Button 
                    size="1" 
                    className={buttonStyles.actionButtonSquare}
                    onClick={() => setVelocityWrist('left')}
                    style={{ 
                      height: "20px", 
                      padding: "0 8px",
                      opacity: velocityWrist === 'left' ? 1 : 0.5
                    }}
                  >
                    Left
                  </Button>
                  <Button 
                    size="1" 
                    className={buttonStyles.actionButtonSquare}
                    onClick={() => setVelocityWrist('right')}
                    style={{ 
                      height: "20px", 
                      padding: "0 8px",
                      opacity: velocityWrist === 'right' ? 1 : 0.5
                    }}
                  >
                    Right
                  </Button>
                </Flex>
              </Flex>
            )}
          </Flex>
        </Flex>

        {/* Column 2: Standalone Settings */}
        <Flex direction="column" gap="3">
          {/* Tracking ID Toggle */}
          <Flex gap="2" align="center">
            <Switch
              checked={showTrackingId}
              onCheckedChange={setShowTrackingId}
              disabled={isLoading}
            />
            <Text size="2" color="gray">
              Show Tracking IDs
            </Text>
          </Flex>

          {/* Face Landmarks Toggle */}
          <Flex gap="2" align="center">
            <Switch
              checked={showFaceLandmarks}
              onCheckedChange={setShowFaceLandmarks}
              disabled={isLoading || !showSkeleton}
            />
            <Text size="2" color="gray">
              Face landmarks
            </Text>
          </Flex>

          {/* Temporal Smoothing Toggle */}
          <Flex gap="2" align="center">
            <Switch
              checked={enableSmoothing}
              onCheckedChange={setEnableSmoothing}
              disabled={isLoading || isDetecting}
            />
            <Text size="2" color="gray">
              Temporal smoothing
            </Text>
          </Flex>

          {/* Accurate Mode Toggle */}
          <Flex gap="2" align="center">
            <Switch
              checked={useAccurateMode}
              onCheckedChange={setUseAccurateMode}
              disabled={isLoading || isDetecting || maxPoses > 1}
            />
            <Flex direction="column" gap="0">
              <Text size="2" color="gray">
                High accuracy
              </Text>
              <Text size="1" color="gray" style={{ opacity: 0.7 }}>
                {maxPoses === 1 ? (useAccurateMode ? "Thunder" : "Lightning") : "MultiPose"}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Grid>

      {/* Angle Controls (shown when angles enabled) */}
      {showAngles && (
        <Flex direction="column" gap="2">
          <Flex gap="2" wrap="wrap">
            <Button 
              size="1" 
              className={buttonStyles.actionButtonSquare}
              onClick={() => {
                setMeasuredAngles([]);
                setSelectedAngleJoints([]);
              }}
            >
              Clear All
            </Button>
          </Flex>
          
          <Flex direction="column" gap="1">
            <Text size="1" color="gray" weight="medium">Arms</Text>
            <Flex gap="1" wrap="wrap">
              <Button 
                size="1" 
                className={buttonStyles.actionButtonSquare}
                onClick={() => toggleAnglePreset([5, 7, 9])} // Left arm: shoulder-elbow-wrist
              >
                L Arm
              </Button>
              <Button 
                size="1" 
                className={buttonStyles.actionButtonSquare}
                onClick={() => toggleAnglePreset([6, 8, 10])} // Right arm: shoulder-elbow-wrist
              >
                R Arm
              </Button>
              <Button 
                size="1" 
                className={buttonStyles.actionButtonSquare}
                onClick={() => toggleAnglePreset([9, 7, 5])} // Left arm reverse: wrist-elbow-shoulder
              >
                L Arm (rev)
              </Button>
              <Button 
                size="1" 
                className={buttonStyles.actionButtonSquare}
                onClick={() => toggleAnglePreset([10, 8, 6])} // Right arm reverse: wrist-elbow-shoulder
              >
                R Arm (rev)
              </Button>
            </Flex>
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="1" color="gray" weight="medium">Legs</Text>
            <Flex gap="1" wrap="wrap">
              <Button 
                size="1" 
                className={buttonStyles.actionButtonSquare}
                onClick={() => toggleAnglePreset([11, 13, 15])} // Left leg: hip-knee-ankle
              >
                L Leg
              </Button>
              <Button 
                size="1" 
                className={buttonStyles.actionButtonSquare}
                onClick={() => toggleAnglePreset([12, 14, 16])} // Right leg: hip-knee-ankle
              >
                R Leg
              </Button>
              <Button 
                size="1" 
                className={buttonStyles.actionButtonSquare}
                onClick={() => toggleAnglePreset([15, 13, 11])} // Left leg reverse: ankle-knee-hip
              >
                L Leg (rev)
              </Button>
              <Button 
                size="1" 
                className={buttonStyles.actionButtonSquare}
                onClick={() => toggleAnglePreset([16, 14, 12])} // Right leg reverse: ankle-knee-hip
              >
                R Leg (rev)
              </Button>
            </Flex>
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="1" color="gray" weight="medium">Shoulder & Torso</Text>
            <Flex gap="1" wrap="wrap">
              <Button 
                size="1" 
                className={buttonStyles.actionButtonSquare}
                onClick={() => toggleAnglePreset([7, 5, 11])} // Left shoulder elevation: elbow-shoulder-hip
              >
                L Shoulder
              </Button>
              <Button 
                size="1" 
                className={buttonStyles.actionButtonSquare}
                onClick={() => toggleAnglePreset([8, 6, 12])} // Right shoulder elevation: elbow-shoulder-hip
              >
                R Shoulder
              </Button>
              <Button 
                size="1" 
                className={buttonStyles.actionButtonSquare}
                onClick={() => toggleAnglePreset([5, 11, 13])} // Left hip angle: shoulder-hip-knee
              >
                L Hip
              </Button>
              <Button 
                size="1" 
                className={buttonStyles.actionButtonSquare}
                onClick={() => toggleAnglePreset([6, 12, 14])} // Right hip angle: shoulder-hip-knee
              >
                R Hip
              </Button>
              <Button 
                size="1" 
                className={buttonStyles.actionButtonSquare}
                onClick={() => toggleAnglePreset([5, 11, 12])} // Torso rotation: left shoulder-left hip-right hip
              >
                Torso
              </Button>
            </Flex>
          </Flex>
        </Flex>
      )}

      {/* Joint Selection (shown when trajectories enabled) */}
      {showTrajectories && (
        <Flex direction="column" gap="1">
          <Flex justify="between" align="center">
            <Text size="2" color="gray" weight="medium">
              Track joints ({selectedJoints.length} selected)
            </Text>
          </Flex>
          
          {/* Quick Presets */}
          <Flex gap="1" wrap="wrap">
            <Button
              size="1"
              className={buttonStyles.actionButtonSquare}
              onClick={() => setSelectedJoints([9, 10])}
            >
              Wrists
            </Button>
            <Button
              size="1"
              className={buttonStyles.actionButtonSquare}
              onClick={() => setSelectedJoints([7, 8, 9, 10])}
            >
              Arms
            </Button>
            <Button
              size="1"
              className={buttonStyles.actionButtonSquare}
              onClick={() => setSelectedJoints([11, 12, 13, 14, 15, 16])}
            >
              Legs
            </Button>
            <Button
              size="1"
              className={buttonStyles.actionButtonSquare}
              onClick={() => setSelectedJoints([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])}
            >
              All
            </Button>
            <Button
              size="1"
              className={buttonStyles.actionButtonSquare}
              onClick={() => {
                clearTrajectories();
                setSelectedJoints([]);
              }}
            >
              Clear
            </Button>
          </Flex>

          {/* Individual Joint Checkboxes - Compact Grid */}
          <Flex 
            direction="column" 
            gap="1" 
            style={{ 
              maxHeight: "150px", 
              overflowY: "auto",
              border: "1px solid var(--gray-6)",
              borderRadius: "var(--radius-2)",
              padding: "6px"
            }}
          >
            <Flex wrap="wrap" gap="1">
              {[
                { id: 0, name: "Nose", color: "#FF6B6B" },
                { id: 1, name: "L Eye", color: "#4ECDC4" },
                { id: 2, name: "R Eye", color: "#45B7D1" },
                { id: 3, name: "L Ear", color: "#FFA07A" },
                { id: 4, name: "R Ear", color: "#98D8C8" },
                { id: 5, name: "L Shoulder", color: "#F7DC6F" },
                { id: 6, name: "R Shoulder", color: "#BB8FCE" },
                { id: 7, name: "L Elbow", color: "#85C1E2" },
                { id: 8, name: "R Elbow", color: "#F8B88B" },
                { id: 9, name: "L Wrist", color: "#B8E994" },
                { id: 10, name: "R Wrist", color: "#FDA7DF" },
                { id: 11, name: "L Hip", color: "#82CCDD" },
                { id: 12, name: "R Hip", color: "#F6A6D1" },
                { id: 13, name: "L Knee", color: "#A29BFE" },
                { id: 14, name: "R Knee", color: "#FD79A8" },
                { id: 15, name: "L Ankle", color: "#FDCB6E" },
                { id: 16, name: "R Ankle", color: "#6C5CE7" },
              ].map((joint) => (
                <Flex 
                  key={joint.id} 
                  align="center" 
                  gap="1" 
                  style={{ 
                    padding: "2px 6px",
                    borderRadius: "var(--radius-2)",
                    backgroundColor: selectedJoints.includes(joint.id) ? "var(--gray-3)" : "transparent",
                    cursor: "pointer",
                    minWidth: "80px"
                  }}
                  onClick={() => {
                    if (selectedJoints.includes(joint.id)) {
                      setSelectedJoints(selectedJoints.filter(j => j !== joint.id));
                      // Trajectory will be automatically removed via the hook when selectedJoints updates
                    } else {
                      setSelectedJoints([...selectedJoints, joint.id]);
                    }
                  }}
                >
                  <Box
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: joint.color,
                      opacity: selectedJoints.includes(joint.id) ? 1 : 0.3,
                    }}
                  />
                  <Text size="1" style={{ opacity: selectedJoints.includes(joint.id) ? 1 : 0.6 }}>
                    {joint.name}
                  </Text>
                </Flex>
              ))}
            </Flex>
          </Flex>
        </Flex>
      )}

      {/* Max Players Slider */}
      <Flex direction="column" gap="1">
        <Flex justify="between" align="center">
          <Text size="2" color="gray" weight="medium">
            Detect players
          </Text>
          <Text size="2" color="mint" weight="bold">
            {maxPoses} {maxPoses === 1 ? "player" : "players"}
          </Text>
        </Flex>
        <input
          type="range"
          min="1"
          max="6"
          value={maxPoses}
          onChange={(e) => setMaxPoses(parseInt(e.target.value))}
          disabled={isLoading || isDetecting}
          style={{
            width: "100%",
            cursor: isLoading || isDetecting ? "not-allowed" : "pointer",
          }}
        />
        <Text size="1" color="gray" style={{ opacity: 0.7 }}>
          {maxPoses === 1 
            ? "Single player mode (Lightning/Thunder)" 
            : `Multi-player mode (up to ${maxPoses} players)`}
        </Text>
        {maxPoses > 1 && (
          <Text size="1" color="amber">
            Note: MultiPose.Lightning is always used when detecting 2+ players
          </Text>
        )}
      </Flex>

      {/* Pose Detection Section Header with Toggle */}
      <Flex direction="column" gap="2" pt="3" style={{ borderTop: "1px solid var(--gray-a5)" }}>
        <Flex align="center" justify="between">
          <Flex direction="column" gap="1">
            <Text size="2" weight="bold">
              Pose Detection
            </Text>
            <Text size="1" color="gray">
              Track body movement and skeleton
            </Text>
          </Flex>
          <Switch
            checked={isPoseEnabled}
            onCheckedChange={setIsPoseEnabled}
            disabled={isLoading}
          />
        </Flex>

        {isPoseEnabled && (
          <Flex direction="column" gap="3">
            {/* Confidence Threshold Selector */}
            <Flex direction="column" gap="1">
              <Text size="2" color="gray" weight="medium">
                Detection sensitivity
              </Text>
              <Select.Root
                value={confidenceMode}
                onValueChange={(value: "standard" | "high" | "low") => setConfidenceMode(value)}
                disabled={isLoading || isDetecting}
              >
                <Select.Trigger 
                  className={selectStyles.selectTriggerStyled}
                  style={{ width: "100%", height: "70px", padding: "12px" }}
                  placeholder="Select sensitivity..."
                >
                  <Flex direction="column" gap="1" align="start">
                    <Text weight="medium" size="2">
                      {confidenceMode === "high" && "High Quality"}
                      {confidenceMode === "standard" && "Standard"}
                      {confidenceMode === "low" && "Challenging Conditions"}
                    </Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5", textAlign: "left" }}>
                      {confidenceMode === "high" && "Indoor, good lighting. Only confident keypoints."}
                      {confidenceMode === "standard" && "Balanced. Good for most videos."}
                      {confidenceMode === "low" && "Outdoor, motion blur, or distant subjects."}
                    </Text>
                  </Flex>
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="high" style={{ minHeight: "70px", padding: "12px" }}>
                    <Flex direction="column" gap="1">
                      <Text weight="medium" size="2">High Quality</Text>
                      <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                        Indoor, good lighting. Only confident keypoints.
                      </Text>
                    </Flex>
                  </Select.Item>
                  <Select.Item value="standard" style={{ minHeight: "70px", padding: "12px" }}>
                    <Flex direction="column" gap="1">
                      <Text weight="medium" size="2">Standard</Text>
                      <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                        Balanced. Good for most videos.
                      </Text>
                    </Flex>
                  </Select.Item>
                  <Select.Item value="low" style={{ minHeight: "70px", padding: "12px" }}>
                    <Flex direction="column" gap="1">
                      <Text weight="medium" size="2">Challenging Conditions</Text>
                      <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                        Outdoor, motion blur, or distant subjects.
                      </Text>
                    </Flex>
                  </Select.Item>
                </Select.Content>
              </Select.Root>
              <Text size="1" color="gray" style={{ opacity: 0.7 }}>
                {confidenceMode === "high" && "Thresholds: 0.5 / 0.5 - Cleanest results"}
                {confidenceMode === "standard" && "Thresholds: 0.25 / 0.3 - Default balance"}
                {confidenceMode === "low" && "Thresholds: 0.15 / 0.2 - Maximum detection"}
              </Text>
            </Flex>

            {/* Input Resolution Selector */}
            <Flex direction="column" gap="1">
              <Text size="2" color="gray" weight="medium">
                Processing resolution
              </Text>
              <Select.Root
                value={resolutionMode}
                onValueChange={(value: "fast" | "balanced" | "accurate") => setResolutionMode(value)}
                disabled={isLoading || isDetecting}
              >
                <Select.Trigger 
                  className={selectStyles.selectTriggerStyled}
                  style={{ width: "100%", height: "70px", padding: "12px" }}
                  placeholder="Select resolution..."
                >
                  <Flex direction="column" gap="1" align="start">
                    <Text weight="medium" size="2">
                      {resolutionMode === "fast" && "Fast (160×160)"}
                      {resolutionMode === "balanced" && "Balanced (256×256)"}
                      {resolutionMode === "accurate" && "Accurate (384×384)"}
                    </Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5", textAlign: "left" }}>
                      {resolutionMode === "fast" && "~2x faster. Good for real-time on slower devices."}
                      {resolutionMode === "balanced" && "Default. Good balance of speed and accuracy."}
                      {resolutionMode === "accurate" && "Best for small/distant subjects. Slower processing."}
                    </Text>
                  </Flex>
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="fast" style={{ minHeight: "70px", padding: "12px" }}>
                    <Flex direction="column" gap="1">
                      <Text weight="medium" size="2">Fast (160×160)</Text>
                      <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                        ~2x faster. Good for real-time on slower devices.
                      </Text>
                    </Flex>
                  </Select.Item>
                  <Select.Item value="balanced" style={{ minHeight: "70px", padding: "12px" }}>
                    <Flex direction="column" gap="1">
                      <Text weight="medium" size="2">Balanced (256×256)</Text>
                      <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                        Default. Good balance of speed and accuracy.
                      </Text>
                    </Flex>
                  </Select.Item>
                  <Select.Item value="accurate" style={{ minHeight: "70px", padding: "12px" }}>
                    <Flex direction="column" gap="1">
                      <Text weight="medium" size="2">Accurate (384×384)</Text>
                      <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                        Best for small/distant subjects. Slower processing.
                      </Text>
                    </Flex>
                  </Select.Item>
                </Select.Content>
              </Select.Root>
              <Text size="1" color="gray" style={{ opacity: 0.7 }}>
                {resolutionMode === "fast" && "Lower res = faster processing, less detail"}
                {resolutionMode === "balanced" && "Standard resolution for most use cases"}
                {resolutionMode === "accurate" && "Higher res = better for small subjects"}
              </Text>
            </Flex>

            {/* Model Selection */}
            <Flex direction="column" gap="1">
              <Text size="2" color="gray" weight="medium">
                Pose Detection Model
              </Text>
              <Select.Root
                value={selectedModel}
                onValueChange={(value) => {
                  setSelectedModel(value as SupportedModel);
                  // Reset poses when switching models
                  setCurrentPoses([]);
                  clearTrajectories();
                  setMeasuredAngles([]);
                }}
                disabled={isLoading || isPreprocessing}
              >
                <Select.Trigger className={selectStyles.selectTriggerStyled} style={{ width: "100%", height: "70px", padding: "12px" }}>
                  <Flex direction="column" gap="1" align="start">
                    <Text weight="medium" size="2">
                      {selectedModel === "MoveNet" ? "MoveNet (2D)" : "BlazePose (3D)"}
                    </Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                      {selectedModel === "MoveNet" 
                        ? "Fast, 17 keypoints, 2D only"
                        : "Accurate, 33 keypoints, 3D depth"}
                    </Text>
                  </Flex>
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="MoveNet" style={{ minHeight: "70px", padding: "12px" }}>
                    <Flex direction="column" gap="1">
                      <Text weight="medium" size="2">MoveNet (2D)</Text>
                      <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>Fast, 17 keypoints, 2D only</Text>
                    </Flex>
                  </Select.Item>
                  <Select.Item value="BlazePose" style={{ minHeight: "70px", padding: "12px" }}>
                    <Flex direction="column" gap="1">
                      <Text weight="medium" size="2">BlazePose (3D)</Text>
                      <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>Accurate, 33 keypoints, 3D depth</Text>
                    </Flex>
                  </Select.Item>
                </Select.Content>
              </Select.Root>
              
              {/* BlazePose Model Type Selector */}
              {selectedModel === "BlazePose" && (
                <Select.Root
                  value={blazePoseModelType}
                  onValueChange={(value) => {
                    setBlazePoseModelType(value as "lite" | "full" | "heavy");
                    setCurrentPoses([]);
                  }}
                  disabled={isLoading || isPreprocessing}
                >
                  <Select.Trigger className={selectStyles.selectTriggerStyled} style={{ width: "100%", height: "70px", padding: "12px" }}>
                    <Flex direction="column" gap="1" align="start">
                      <Text weight="medium" size="2">
                        {blazePoseModelType.charAt(0).toUpperCase() + blazePoseModelType.slice(1)}
                      </Text>
                      <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                        {blazePoseModelType === "lite" && "Fastest, lower accuracy"}
                        {blazePoseModelType === "full" && "Balanced speed and accuracy"}
                        {blazePoseModelType === "heavy" && "Slowest, highest accuracy"}
                      </Text>
                    </Flex>
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="lite" style={{ minHeight: "70px", padding: "12px" }}>
                      <Flex direction="column" gap="1">
                        <Text weight="medium" size="2">Lite</Text>
                        <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>Fastest, lower accuracy</Text>
                      </Flex>
                    </Select.Item>
                    <Select.Item value="full" style={{ minHeight: "70px", padding: "12px" }}>
                      <Flex direction="column" gap="1">
                        <Text weight="medium" size="2">Full</Text>
                        <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>Balanced speed and accuracy</Text>
                      </Flex>
                    </Select.Item>
                    <Select.Item value="heavy" style={{ minHeight: "70px", padding: "12px" }}>
                      <Flex direction="column" gap="1">
                        <Text weight="medium" size="2">Heavy</Text>
                        <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>Slowest, highest accuracy</Text>
                      </Flex>
                    </Select.Item>
                  </Select.Content>
                </Select.Root>
              )}
            </Flex>
          </Flex>
        )}
      </Flex>
    </>
  );
}

