"use client";

import { Box, Flex, Text, Button, Badge, Grid, Card, Heading } from "@radix-ui/themes";
import {
  RocketIcon,
  LightningBoltIcon,
  ClockIcon,
  BarChartIcon,
  PersonIcon,
  TargetIcon,
  VideoIcon,
  StarIcon,
  ChatBubbleIcon,
  EyeOpenIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { MINT_COLOR } from "../../input/VideoEligibilityIndicator";
import buttonStyles from "@/styles/buttons.module.css";

// ============================================================================
// Feature Definitions
// ============================================================================

interface FeatureInfo {
  icon: React.ReactNode;
  text: string;
}

const FREE_FEATURES: FeatureInfo[] = [
  {
    icon: <ChatBubbleIcon width={14} height={14} />,
    text: "Textual analysis and coaching feedback",
  },
  {
    icon: <EyeOpenIcon width={14} height={14} />,
    text: "Study body angles, trophy position, contact points and more",
  },
  {
    icon: <MagnifyingGlassIcon width={14} height={14} />,
    text: "Dive deeper into any frame in your video and ask for further AI analysis",
  },
];

const PRO_FEATURES: FeatureInfo[] = [
  {
    icon: <VideoIcon width={14} height={14} />,
    text: "Advanced video player with rally detection & ball tracking",
  },
  {
    icon: <PersonIcon width={14} height={14} />,
    text: "Player performance & heatmap analysis",
  },
  {
    icon: <BarChartIcon width={14} height={14} />,
    text: "Comprehensive match statistics",
  },
  {
    icon: <TargetIcon width={14} height={14} />,
    text: "Shot placement & tactical breakdown",
  },
  {
    icon: <StarIcon width={14} height={14} />,
    text: "Auto-extracted highlights & key moments",
  },
  {
    icon: <RocketIcon width={14} height={14} />,
    text: "Powered by our most advanced AI models",
  },
];

// ============================================================================
// Simple Feature List Item
// ============================================================================

interface SimpleFeatureProps {
  icon: React.ReactNode;
  text: string;
  color?: string;
}

function SimpleFeature({ icon, text, color = "var(--gray-11)" }: SimpleFeatureProps) {
  return (
    <Flex gap="2" align="start">
      <Box
        style={{
          color,
          marginTop: "2px",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Text size="2" style={{ color: "var(--gray-12)" }}>
        {text}
      </Text>
    </Flex>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface TacticalOptionsCardProps {
  estimatedTime: string;
  isLoading?: boolean;
  selectedOption?: "pro_plus_quick" | "quick_only" | null;
  showCards?: boolean;
  showButtons?: boolean;
  onSelectProPlusQuick: () => void;
  onSelectQuickOnly: () => void;
}

/**
 * Card component for selecting Free vs PRO tactical analysis
 * Used in tactical video analysis flow (elevated back court view)
 */
export function TacticalOptionsCard({
  estimatedTime,
  isLoading = false,
  selectedOption = null,
  showCards = true,
  showButtons = true,
  onSelectProPlusQuick,
  onSelectQuickOnly,
}: TacticalOptionsCardProps) {
  return (
    <>
      {/* Estimated time note */}
      <p
        className="text-base leading-relaxed mb-4"
        style={{
          color: "var(--gray-12)",
          opacity: showCards ? 1 : 0,
          transition: "opacity 0.4s ease-out",
        }}
      >
        <ClockIcon width={14} height={14} style={{ color: "var(--gray-10)", display: "inline", verticalAlign: "middle", marginRight: "8px" }} />
        PRO takes <strong style={{ color: MINT_COLOR }}>{estimatedTime}</strong> — chat or analyze more videos while you wait.
      </p>

      {/* Side by side feature boxes */}
      <Grid
        columns={{ initial: "1", sm: "2" }}
        gap="3"
        mb="4"
        style={{
          opacity: showCards ? 1 : 0,
          transform: showCards ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.5s ease-out",
        }}
      >
        {/* FREE card */}
        <Card
          style={{
            border: "1px solid var(--gray-6)",
            transition: "all 0.2s ease",
          }}
          className="analysis-option-card"
        >
          <Flex direction="column" gap="3" p="4">
            <Flex direction="column" gap="2">
              <Heading size="4" weight="medium">
                Free
              </Heading>
              <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                Instant AI coaching feedback
              </Text>
            </Flex>
            <Flex direction="column" gap="2">
              {FREE_FEATURES.map((feature, index) => (
                <SimpleFeature
                  key={index}
                  icon={feature.icon}
                  text={feature.text}
                  color="var(--gray-10)"
                />
              ))}
            </Flex>
          </Flex>
        </Card>

        {/* PRO card */}
        <Card
          style={{
            border: `1px solid ${MINT_COLOR}`,
            transition: "all 0.2s ease",
          }}
          className="analysis-option-card analysis-option-card-pro"
        >
          <Flex direction="column" gap="3" p="4">
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <Heading size="4" weight="medium">
                  PRO
                </Heading>
                <Badge
                  color="green"
                  variant="solid"
                  size="1"
                  style={{
                    fontWeight: 600,
                    backgroundColor: MINT_COLOR,
                    color: "#1C1C1C",
                  }}
                >
                  RECOMMENDED
                </Badge>
              </Flex>
              <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                Includes everything in Free, plus:
              </Text>
            </Flex>
            <Flex direction="column" gap="2">
              {PRO_FEATURES.map((feature, index) => (
                <SimpleFeature
                  key={index}
                  icon={feature.icon}
                  text={feature.text}
                  color={MINT_COLOR}
                />
              ))}
            </Flex>
          </Flex>
        </Card>
      </Grid>

      {/* Card hover styles */}
      <style jsx>{`
        :global(.analysis-option-card) {
          transition: all 0.2s ease;
        }
        :global(.analysis-option-card:hover) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }
        :global(.analysis-option-card-pro:hover) {
          border-color: ${MINT_COLOR} !important;
          box-shadow: 0 8px 16px rgba(116, 188, 156, 0.2);
        }
      `}</style>

      {/* Action section - fades out after selection */}
      {!selectedOption && (
        <Box
          style={{
            opacity: showButtons ? 1 : 0,
            transform: showButtons ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.5s ease-out",
          }}
        >
          <p className="text-base leading-relaxed mb-3" style={{ color: "var(--gray-12)" }}>
            How would you like to proceed?
          </p>

          <Flex gap="3" wrap="wrap">
            {/* Free button */}
            <Button
              size="3"
              className={buttonStyles.actionButtonSquareSecondary}
              onClick={onSelectQuickOnly}
              disabled={isLoading}
              style={{ flex: "1", minWidth: "120px" }}
            >
              <LightningBoltIcon width={18} height={18} />
              Free
            </Button>

            {/* PRO Analysis button */}
            <Button
              size="3"
              className={`${buttonStyles.actionButtonSquare} ${buttonStyles.actionButtonPulse}`}
              onClick={onSelectProPlusQuick}
              disabled={isLoading}
              style={{ flex: "1", minWidth: "180px" }}
            >
              <RocketIcon width={18} height={18} />
              PRO
            </Button>
          </Flex>
        </Box>
      )}
    </>
  );
}
