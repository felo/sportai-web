"use client";

import { Flex, Text, Badge } from "@radix-ui/themes";
import { VideoIcon } from "@radix-ui/react-icons";
import type { VideoPreAnalysis } from "@/types/chat";

// ============================================================================
// Constants
// ============================================================================

/** Mint glow styling used across the app for selected/active states */
export const MINT_GLOW_STYLES = {
  backgroundColor: "rgba(122, 219, 143, 0.15)",
  borderRadius: "var(--radius-2)",
  border: "1px solid #7ADB8F",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
} as const;

export const MINT_COLOR = "#7ADB8F";
export const MINT_COLOR_FADED = "rgba(122, 219, 143, 0.7)";
export const MINT_TEXT_DARK = "#1C1C1C";

// ============================================================================
// Helper Functions
// ============================================================================

/** Get emoji for a detected sport */
export function getSportEmoji(sport: string): string {
  switch (sport) {
    case "padel": return "🏸";
    case "tennis": return "🎾";
    case "pickleball": return "🏓";
    default: return "🎥";
  }
}

/** Get human-readable label for camera angle */
export function getCameraAngleLabel(cameraAngle: string): string {
  switch (cameraAngle) {
    case "elevated_back_court": return "Back mounted camera";
    case "side": return "Court level view";
    case "ground_behind": return "Court level view";
    case "diagonal": return "Diagonal view";
    case "overhead": return "Overhead view";
    default: return cameraAngle;
  }
}

/** Check if camera angle should be displayed (not "other" or unknown) */
export function shouldShowCameraAngle(cameraAngle?: string): boolean {
  return !!cameraAngle && cameraAngle !== "other";
}

/** Capitalize first letter of a string */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// Component
// ============================================================================

interface VideoEligibilityIndicatorProps {
  /** Video pre-analysis data (sport, camera angle, eligibility) */
  preAnalysis: VideoPreAnalysis | null;
  /** Fallback text when no sport is detected */
  fallbackText: string;
}

/**
 * Displays video eligibility status with sport detection, camera angle, and PRO badges.
 * Uses mint glow styling consistent with selected chat states.
 */
export function VideoEligibilityIndicator({ 
  preAnalysis, 
  fallbackText 
}: VideoEligibilityIndicatorProps) {
  if (!preAnalysis) return null;

  const { 
    isAnalyzing, 
    sport, 
    cameraAngle, 
    isProEligible, 
    isTechniqueLiteEligible 
  } = preAnalysis;

  const hasSport = sport && sport !== "other";
  const showCameraAngle = (isProEligible || isTechniqueLiteEligible) && shouldShowCameraAngle(cameraAngle);

  return (
    <Flex 
      align="center" 
      gap="2" 
      py="2" 
      px="3"
      style={MINT_GLOW_STYLES}
    >
      <VideoIcon width="16" height="16" style={{ color: MINT_COLOR }} />
      
      {/* Sport detection text */}
      <Text size="2" style={{ flex: 1, color: MINT_COLOR }}>
        {isAnalyzing ? (
          "Autodetecting sport..."
        ) : hasSport ? (
          <>
            {getSportEmoji(sport)} {capitalize(sport)} detected
          </>
        ) : (
          fallbackText
        )}
      </Text>

      {/* Camera angle label */}
      {showCameraAngle && (
        <Text size="1" style={{ color: MINT_COLOR_FADED }}>
          {getCameraAngleLabel(cameraAngle!)}
        </Text>
      )}

      {/* PRO Tactical Analysis badge (elevated back court padel) */}
      {isProEligible && (
        <Badge 
          color="green" 
          variant="solid" 
          size="1" 
          style={{ 
            fontWeight: 600, 
            backgroundColor: MINT_COLOR, 
            color: MINT_TEXT_DARK 
          }}
        >
          PRO Tactical Analysis ✓
        </Badge>
      )}

      {/* PRO Technique Analysis badge (ground-level camera, short video) */}
      {isTechniqueLiteEligible && !isProEligible && (
        <Badge 
          color="green" 
          variant="solid" 
          size="1" 
          style={{ 
            fontWeight: 600, 
            backgroundColor: MINT_COLOR, 
            color: MINT_TEXT_DARK 
          }}
        >
          PRO Technique Analysis ✓
        </Badge>
      )}
    </Flex>
  );
}




