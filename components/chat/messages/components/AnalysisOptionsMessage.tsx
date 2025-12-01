"use client";

import { Box, Flex, Text, Button, Badge } from "@radix-ui/themes";
import { RocketIcon, LightningBoltIcon, ClockIcon } from "@radix-ui/react-icons";
import type { VideoPreAnalysis } from "@/types/chat";
import { estimateProAnalysisTime } from "@/utils/video-utils";

interface AnalysisOptionsMessageProps {
  preAnalysis: VideoPreAnalysis;
  onSelectProPlusQuick: () => void;
  onSelectQuickOnly: () => void;
  isLoading?: boolean;
  selectedOption?: "pro_plus_quick" | "quick_only" | null;
}

/**
 * Interactive message component for choosing analysis type
 * Shows when a video is PRO-eligible
 */
export function AnalysisOptionsMessage({
  preAnalysis,
  onSelectProPlusQuick,
  onSelectQuickOnly,
  isLoading = false,
  selectedOption = null,
}: AnalysisOptionsMessageProps) {
  const sportEmoji = preAnalysis.sport === "padel" ? "🏸" : 
                     preAnalysis.sport === "tennis" ? "🎾" : 
                     preAnalysis.sport === "pickleball" ? "🏓" : "🎬";
  
  const sportName = preAnalysis.sport.charAt(0).toUpperCase() + preAnalysis.sport.slice(1);
  
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

  return (
    <Box
      style={{
        padding: "var(--space-4)",
        backgroundColor: "var(--gray-2)",
        borderRadius: "var(--radius-3)",
        border: "1px solid var(--gray-4)",
      }}
    >
      {/* Detection summary */}
      <Flex align="center" gap="2" mb="3" wrap="wrap">
        <Text size="3" weight="medium">
          {sportEmoji} {sportName} detected
        </Text>
        <Badge color="green" variant="soft" size="1">
          ✓ Analyzed
        </Badge>
        {videoDurationText && (
          <Badge color="gray" variant="soft" size="1">
            <ClockIcon width={10} height={10} />
            {videoDurationText}
          </Badge>
        )}
      </Flex>

      {preAnalysis.isProEligible ? (
        <>
          {/* PRO eligible message */}
          <Box
            mb="4"
            style={{
              padding: "var(--space-3)",
              backgroundColor: "var(--amber-3)",
              borderRadius: "var(--radius-2)",
              border: "1px solid var(--amber-6)",
            }}
          >
            <Flex align="center" gap="2" mb="2">
              <Badge color="amber" variant="solid" size="2" style={{ fontWeight: 600 }}>
                🎯 PRO
              </Badge>
              <Text size="2" weight="medium" color="amber">
                Your video qualifies for PRO Analysis!
              </Text>
            </Flex>
            <Text size="2" color="gray">
              PRO includes ball tracking, player heatmaps, rally statistics, and shot-by-shot breakdown.
              Processing takes {estimatedTime}.
            </Text>
          </Box>

          {/* Action buttons */}
          <Text size="2" color="gray" mb="3">
            How would you like to proceed?
          </Text>
          
          <Flex gap="3" wrap="wrap">
            <Button
              size="3"
              variant={selectedOption === "pro_plus_quick" ? "solid" : "soft"}
              color="amber"
              onClick={onSelectProPlusQuick}
              disabled={isLoading || selectedOption !== null}
              style={{ flex: 1, minWidth: "200px" }}
            >
              <RocketIcon />
              PRO + Quick Chat
              {selectedOption !== "pro_plus_quick" && (
                <Badge color="amber" variant="outline" size="1" ml="2">
                  Recommended
                </Badge>
              )}
            </Button>
            
            <Button
              size="3"
              variant={selectedOption === "quick_only" ? "solid" : "outline"}
              color="gray"
              onClick={onSelectQuickOnly}
              disabled={isLoading || selectedOption !== null}
              style={{ flex: 1, minWidth: "160px" }}
            >
              <LightningBoltIcon />
              Quick Chat Only
            </Button>
          </Flex>

          {selectedOption && (
            <Text size="2" color="gray" mt="3">
              {selectedOption === "pro_plus_quick" 
                ? "Starting PRO analysis... You'll receive detailed statistics when ready." 
                : "Starting quick analysis..."}
            </Text>
          )}
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

          <Text size="2" color="gray" mb="3">
            I can still provide quick technique and tactical feedback!
          </Text>
          
          <Button
            size="3"
            variant={selectedOption === "quick_only" ? "solid" : "soft"}
            color="green"
            onClick={onSelectQuickOnly}
            disabled={isLoading || selectedOption !== null}
          >
            <LightningBoltIcon />
            Start Quick Analysis
          </Button>
        </>
      )}
    </Box>
  );
}

