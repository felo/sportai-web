"use client";

import { Box, Card, Flex, Text, Badge, Tooltip } from "@radix-ui/themes";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import type { SharkFeature } from "@/types/shark";
import { MINT_COLOR } from "../../input/VideoEligibilityIndicator";

/**
 * Map joint indices to human-readable names (H36M format)
 */
const JOINT_NAMES: Record<number, string> = {
  0: "Root",
  1: "Right Hip",
  2: "Right Knee",
  3: "Right Ankle",
  4: "Left Hip",
  5: "Left Knee",
  6: "Left Ankle",
  7: "Spine",
  8: "Neck",
  9: "Head",
  10: "Head Top",
  11: "Left Shoulder",
  12: "Left Elbow",
  13: "Left Wrist",
  14: "Right Shoulder",
  15: "Right Elbow",
  16: "Right Wrist",
};

/**
 * Format joint indices to readable string
 */
function formatJoints(joints?: number[]): string | null {
  if (!joints || joints.length === 0) return null;
  return joints
    .map((j) => `${JOINT_NAMES[j] || `Joint ${j}`} (${j})`)
    .join(", ");
}

/**
 * Get level badge color
 */
function getLevelColor(level: SharkFeature["level"]): "orange" | "yellow" | "blue" | "green" {
  switch (level) {
    case "beginner":
      return "orange";
    case "intermediate":
      return "yellow";
    case "advanced":
      return "blue";
    case "professional":
      return "green";
    default:
      return "yellow";
  }
}

interface TechniqueFeatureCardProps {
  feature: SharkFeature;
}

/**
 * Display a single technique feature from Shark analysis
 * Shows feature name, level, score, observation, suggestion, and joints
 */
export function TechniqueFeatureCard({ feature }: TechniqueFeatureCardProps) {
  const displayName =
    feature.feature_human_readable_name ||
    feature.human_name ||
    feature.feature_name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const jointsDisplay = formatJoints(feature.highlight_joints);

  return (
    <Card
      style={{
        border: `2px solid ${MINT_COLOR}`,
        backgroundColor: "var(--color-panel-solid)",
        width: "100%",
        marginTop: "var(--space-3)",
        marginBottom: "var(--space-3)",
        marginRight: "var(--space-3)",
      }}
    >
      <Flex direction="column" gap="3" p="4">
        {/* Header: Icon, Name, Level Badge */}
        <Flex gap="2" align="center" wrap="wrap">
          <CheckCircledIcon
            width={20}
            height={20}
            style={{ color: MINT_COLOR, flexShrink: 0 }}
          />
          <Text size="3" weight="bold" style={{ color: "var(--gray-12)" }}>
            {displayName}
          </Text>
          <Badge color={getLevelColor(feature.level)} variant="soft" size="1">
            {feature.level}
          </Badge>
        </Flex>

        {/* Observation */}
        {feature.observation && (
          <Box>
            <Text size="1" color="gray" style={{ marginBottom: 4, display: "block" }}>
              Observation
            </Text>
            <Box
              style={{
                backgroundColor: "var(--gray-a3)",
                borderRadius: "var(--radius-2)",
                padding: "var(--space-3)",
              }}
            >
              <Text size="2" style={{ color: MINT_COLOR }}>
                {feature.observation}
              </Text>
            </Box>
          </Box>
        )}

        {/* Suggestion */}
        {feature.suggestion && (
          <Box>
            <Text size="1" color="gray" style={{ marginBottom: 4, display: "block" }}>
              Suggestion
            </Text>
            <Text size="2" style={{ color: "var(--gray-11)" }}>
              {feature.suggestion}
            </Text>
          </Box>
        )}

        {/* Joints (for future biomechanics) */}
        {jointsDisplay && (
          <Box style={{ marginTop: "var(--space-1)" }}>
            <Tooltip content="Relevant body joints for this technique feature">
              <Badge color="purple" variant="outline" size="1" style={{ cursor: "help" }}>
                Joints: {jointsDisplay}
              </Badge>
            </Tooltip>
          </Box>
        )}
      </Flex>
    </Card>
  );
}
