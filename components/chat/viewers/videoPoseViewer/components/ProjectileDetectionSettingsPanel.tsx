"use client";

import { Flex, Text, Switch, Spinner } from "@radix-ui/themes";

interface ProjectileDetectionSettingsPanelProps {
  // Detection state
  isProjectileDetectionEnabled: boolean;
  setIsProjectileDetectionEnabled: (value: boolean) => void;
  isProjectileDetectionLoading: boolean;
  projectileDetectionError: string | null;

  // Current detection state
  currentProjectile: any | null;
  isPlaying: boolean;

  // Threshold settings
  projectileConfidenceThreshold: number;
  setProjectileConfidenceThreshold: (value: number) => void;

  // Display options
  showProjectileTrajectory: boolean;
  setShowProjectileTrajectory: (value: boolean) => void;
  showProjectilePrediction: boolean;
  setShowProjectilePrediction: (value: boolean) => void;
}

/**
 * ProjectileDetectionSettingsPanel - Settings panel for ball/projectile tracking
 * 
 * Extracted from VideoPoseViewerCore to improve maintainability.
 * Contains all projectile detection settings including:
 * - Detection confidence threshold
 * - Trajectory and prediction display options
 * - Detection status feedback
 */
export function ProjectileDetectionSettingsPanel({
  isProjectileDetectionEnabled,
  setIsProjectileDetectionEnabled,
  isProjectileDetectionLoading,
  projectileDetectionError,
  currentProjectile,
  isPlaying,
  projectileConfidenceThreshold,
  setProjectileConfidenceThreshold,
  showProjectileTrajectory,
  setShowProjectileTrajectory,
  showProjectilePrediction,
  setShowProjectilePrediction,
}: ProjectileDetectionSettingsPanelProps) {
  return (
    <Flex direction="column" gap="2" pt="3" style={{ borderTop: "1px solid var(--gray-a5)" }}>
      <Flex align="center" justify="between">
        <Flex direction="column" gap="1">
          <Text size="2" weight="bold">
            Ball Tracking (Smart Detection)
          </Text>
          <Text size="1" color="gray">
            Track ball trajectory using YOLO + tracking
          </Text>
        </Flex>
        <Switch
          checked={isProjectileDetectionEnabled}
          onCheckedChange={setIsProjectileDetectionEnabled}
          disabled={isProjectileDetectionLoading}
        />
      </Flex>

      {isProjectileDetectionEnabled && (
        <Flex direction="column" gap="3">
          {/* Info about detection method */}
          <Flex direction="column" gap="1" p="2" style={{ backgroundColor: "var(--blue-a2)", borderRadius: "6px" }}>
            <Text size="2" weight="medium">YOLOv8 + Smart Tracking</Text>
            <Text size="1" color="gray">
              Uses object detection + temporal tracking for accurate ball trajectories
            </Text>
            {currentProjectile && (
              <Text size="1" weight="bold" style={{ color: "var(--green-11)" }}>
                ✓ Ball detected! ({(currentProjectile.confidence * 100).toFixed(0)}% confidence)
              </Text>
            )}
            {!currentProjectile && isPlaying && (
              <Text size="1" color="amber">
                Searching for ball... (Check console for detections)
              </Text>
            )}
          </Flex>

          {/* Ball Detection Confidence */}
          <Flex direction="column" gap="1">
            <Flex align="center" justify="between">
              <Text size="2" weight="medium">Ball Confidence</Text>
              <Text size="2" color="gray">{(projectileConfidenceThreshold * 100).toFixed(0)}%</Text>
            </Flex>
            <input
              type="range"
              min="0.1"
              max="0.7"
              step="0.05"
              value={projectileConfidenceThreshold}
              onChange={(e) => setProjectileConfidenceThreshold(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
            <Text size="1" color="gray">
              Lower threshold for small/fast balls
            </Text>
          </Flex>

          {/* Display Options */}
          <Flex direction="column" gap="2">
            <Flex align="center" justify="between">
              <Text size="2">Show Trajectory</Text>
              <Switch
                checked={showProjectileTrajectory}
                onCheckedChange={setShowProjectileTrajectory}
              />
            </Flex>
            <Flex align="center" justify="between">
              <Text size="2">Show Prediction</Text>
              <Switch
                checked={showProjectilePrediction}
                onCheckedChange={setShowProjectilePrediction}
              />
            </Flex>
          </Flex>

          {isProjectileDetectionLoading && (
            <Flex align="center" gap="2">
              <Spinner />
              <Text size="2" color="gray">Initializing ball tracking...</Text>
            </Flex>
          )}

          {projectileDetectionError && (
            <Text size="2" color="red">
              Error: {projectileDetectionError}
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  );
}

