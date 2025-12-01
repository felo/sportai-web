"use client";

import { useState, useEffect, useMemo } from "react";
import { Box, Flex, Text, Button, Badge } from "@radix-ui/themes";
import { 
  RocketIcon, 
  LightningBoltIcon, 
  ClockIcon,
  BarChartIcon,
  PersonIcon,
  TargetIcon,
  VideoIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import type { VideoPreAnalysis } from "@/types/chat";
import { estimateProAnalysisTime } from "@/utils/video-utils";
import { 
  getCameraAngleLabel, 
  MINT_GLOW_STYLES,
  MINT_COLOR,
} from "../../input/VideoEligibilityIndicator";
import buttonStyles from "@/styles/buttons.module.css";

// ============================================================================
// PRO Feature Definitions
// ============================================================================

interface ProFeature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const PRO_FEATURES: ProFeature[] = [
  {
    icon: <VideoIcon width={16} height={16} />,
    title: "Advanced Video Player",
    description: "Visual overlays with rally detection, ball tracking, and swing & bounce visualization",
  },
  {
    icon: <PersonIcon width={16} height={16} />,
    title: "Player Performance",
    description: "In-depth analysis broken down by individual players and team dynamics",
  },
  {
    icon: <StarIcon width={16} height={16} />,
    title: "Player Heatmaps & Highlights",
    description: "Court coverage visualization and automatically extracted key moments",
  },
  {
    icon: <BarChartIcon width={16} height={16} />,
    title: "Match Statistics",
    description: "Comprehensive metrics covering every aspect of the match",
  },
  {
    icon: <TargetIcon width={16} height={16} />,
    title: "Tactical Breakdown",
    description: "Shot placement analysis and positioning patterns across game phases",
  },
  {
    icon: <RocketIcon width={16} height={16} />,
    title: "Maximum Precision",
    description: "Powered by our most advanced AI models for unmatched accuracy",
  },
];

// ============================================================================
// Typewriter Hook
// ============================================================================

function useTypewriter(text: string, speed: number = 30, enabled: boolean = true): string {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setDisplayText(text);
      return;
    }

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed, enabled]);

  useEffect(() => {
    // Reset when text changes
    setDisplayText("");
    setCurrentIndex(0);
  }, [text]);

  return displayText;
}

// ============================================================================
// Animated Feature Item
// ============================================================================

interface FeatureItemProps {
  feature: ProFeature;
  delay: number;
  isVisible: boolean;
}

function FeatureItem({ feature, delay, isVisible }: FeatureItemProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, delay]);

  return (
    <Flex 
      gap="3" 
      align="start"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.4s ease-out",
      }}
    >
      <Box
        style={{
          color: MINT_COLOR,
          marginTop: "2px",
          flexShrink: 0,
        }}
      >
        {feature.icon}
      </Box>
      <Box>
        <Text size="2" weight="medium" style={{ color: MINT_COLOR }}>
          {feature.title}
        </Text>
        <Text size="1" color="gray" style={{ display: "block", marginTop: "2px" }}>
          {feature.description}
        </Text>
      </Box>
    </Flex>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface AnalysisOptionsMessageProps {
  preAnalysis: VideoPreAnalysis;
  onSelectProPlusQuick: () => void;
  onSelectQuickOnly: () => void;
  isLoading?: boolean;
  selectedOption?: "pro_plus_quick" | "quick_only" | null;
}

/**
 * Interactive message component for choosing analysis type
 * Shows when a video is PRO-eligible with beautiful animations
 */
export function AnalysisOptionsMessage({
  preAnalysis,
  onSelectProPlusQuick,
  onSelectQuickOnly,
  isLoading = false,
  selectedOption = null,
}: AnalysisOptionsMessageProps) {
  const [showFeatures, setShowFeatures] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  const sportName = preAnalysis.sport 
    ? preAnalysis.sport.charAt(0).toUpperCase() + preAnalysis.sport.slice(1)
    : "Video";
  
  // Get camera angle label
  const cameraAngle = preAnalysis.cameraAngle;
  const cameraLabel = cameraAngle && cameraAngle !== "other" 
    ? getCameraAngleLabel(cameraAngle) 
    : null;
  
  // Get estimated processing time based on video duration
  const estimatedTime = estimateProAnalysisTime(preAnalysis.durationSeconds ?? null);
  
  // Format video duration for display
  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds || seconds <= 0) return "";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };
  
  const videoDurationText = formatDuration(preAnalysis.durationSeconds);

  // Headline text for typewriter effect
  const headlineText = useMemo(() => {
    if (preAnalysis.isProEligible) {
      return "Your video qualifies for PRO Tactical Analysis!";
    }
    if (preAnalysis.isTechniqueLiteEligible) {
      return "Your video qualifies for PRO Technique Analysis!";
    }
    return "Ready to analyze your video!";
  }, [preAnalysis.isProEligible, preAnalysis.isTechniqueLiteEligible]);

  const typedHeadline = useTypewriter(headlineText, 25, true);

  // Trigger animations after headline finishes
  useEffect(() => {
    const headlineDelay = headlineText.length * 25 + 300;
    const featuresTimer = setTimeout(() => setShowFeatures(true), headlineDelay);
    const buttonsTimer = setTimeout(() => setShowButtons(true), headlineDelay + PRO_FEATURES.length * 150 + 400);
    
    return () => {
      clearTimeout(featuresTimer);
      clearTimeout(buttonsTimer);
    };
  }, [headlineText]);

  const isEligible = preAnalysis.isProEligible || preAnalysis.isTechniqueLiteEligible;
  const badgeLabel = preAnalysis.isProEligible ? "PRO Tactical" : "PRO Technique";

  return (
    <Box>
      {/* Detection summary header */}
      <Flex align="center" gap="2" mb="3" wrap="wrap">
        <Text size="3" weight="medium">
          {sportName} detected
        </Text>
        {videoDurationText && (
          <Badge color="gray" variant="soft" size="1">
            <ClockIcon width={10} height={10} />
            {videoDurationText}
          </Badge>
        )}
        {cameraLabel && (
          <Badge color="gray" variant="soft" size="1">
            {cameraLabel}
          </Badge>
        )}
      </Flex>

      {isEligible ? (
        <>
          {/* PRO eligible message box */}
          <Box
            mb="4"
            style={{
              padding: "var(--space-4)",
              ...MINT_GLOW_STYLES,
            }}
          >
            {/* Badge and animated headline */}
            <Flex align="center" gap="2" mb="3">
              <Badge 
                color="green" 
                variant="solid" 
                size="2" 
                style={{ 
                  fontWeight: 600, 
                  backgroundColor: MINT_COLOR, 
                  color: "#1C1C1C" 
                }}
              >
                🎯 {badgeLabel}
              </Badge>
              <Text size="2" weight="medium" style={{ color: MINT_COLOR }}>
                {typedHeadline}
                <span 
                  style={{ 
                    opacity: typedHeadline.length < headlineText.length ? 1 : 0,
                    animation: "blink 0.7s infinite",
                  }}
                >
                  |
                </span>
              </Text>
            </Flex>

            {/* Estimated time */}
            <Flex align="center" gap="2" mb="4">
              <ClockIcon width={14} height={14} style={{ color: "var(--gray-10)" }} />
              <Text size="2" color="gray">
                Estimated PRO analysis time: approx. <strong style={{ color: MINT_COLOR }}>{estimatedTime}</strong>
              </Text>
            </Flex>

            {/* Feature list */}
            <Box style={{ marginLeft: "var(--space-1)" }}>
              <Text size="2" weight="medium" mb="3" style={{ display: "block", color: "var(--gray-11)" }}>
                PRO includes:
              </Text>
              <Flex direction="column" gap="3">
                {PRO_FEATURES.map((feature, index) => (
                  <FeatureItem
                    key={feature.title}
                    feature={feature}
                    delay={index * 150}
                    isVisible={showFeatures}
                  />
                ))}
              </Flex>
            </Box>
          </Box>

          {/* Action section - fades out after selection */}
          {!selectedOption && (
            <Box
              style={{
                opacity: showButtons ? 1 : 0,
                transform: showButtons ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.5s ease-out",
              }}
            >
              <Text size="2" color="gray" mb="3" style={{ display: "block" }}>
                How would you like to proceed?
              </Text>
              
              <Flex gap="3" direction="column">
                {/* Quick Chat Only button */}
                <Button
                  size="3"
                  className={buttonStyles.actionButtonSquareSecondary}
                  onClick={onSelectQuickOnly}
                  disabled={isLoading}
                >
                  <LightningBoltIcon width={18} height={18} />
                  Instant Chat
                </Button>

                {/* PRO + Quick Chat button */}
                <Button
                  size="3"
                  className={buttonStyles.actionButtonSquare}
                  onClick={onSelectProPlusQuick}
                  disabled={isLoading}
                >
                  <RocketIcon width={18} height={18} />
                  PRO + Instant Chat
                  <Badge 
                    color="gray" 
                    variant="outline" 
                    size="1" 
                    ml="2"
                    style={{ 
                      backgroundColor: "rgba(255,255,255,0.9)", 
                      color: "#1C1C1C",
                      border: "1px solid rgba(0,0,0,0.2)",
                    }}
                  >
                    Recommended
                  </Badge>
                </Button>
              </Flex>
            </Box>
          )}

          {/* Status message after selection */}
          {selectedOption && (
            <Text size="2" color="gray" style={{ display: "block" }}>
              {selectedOption === "pro_plus_quick" 
                ? "🚀 Starting PRO analysis... You'll receive detailed statistics when ready." 
                : "⚡ Starting instant analysis..."}
            </Text>
          )}

          {/* Cursor blink animation */}
          <style jsx>{`
            @keyframes blink {
              0%, 50% { opacity: 1; }
              51%, 100% { opacity: 0; }
            }
          `}</style>
        </>
      ) : (
        <>
          {/* Not eligible message */}
          <Box
            mb="4"
            style={{
              padding: "var(--space-3)",
              backgroundColor: "var(--gray-3)",
              borderRadius: "var(--radius-2)",
            }}
          >
            {preAnalysis.proEligibilityReason && (
              <Text size="2" color="gray">
                💡 {preAnalysis.proEligibilityReason}
              </Text>
            )}
          </Box>

          <Text size="2" color="gray" mb="3" style={{ display: "block" }}>
            I can still provide quick technique and tactical feedback!
          </Text>
          
          <Button
            size="3"
            className={selectedOption === "quick_only" ? buttonStyles.actionButtonSquare : buttonStyles.actionButtonSquare}
            onClick={onSelectQuickOnly}
            disabled={isLoading || selectedOption !== null}
          >
            <LightningBoltIcon width={18} height={18} />
            Start Quick Analysis
          </Button>
        </>
      )}
    </Box>
  );
}
