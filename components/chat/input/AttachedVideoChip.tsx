"use client";

import { Flex, Text } from "@radix-ui/themes";
import { Link2Icon, Cross2Icon } from "@radix-ui/react-icons";
import * as HoverCard from "@radix-ui/react-hover-card";

// ============================================================================
// Constants
// ============================================================================

const CHIP_STYLES = {
  backgroundColor: "rgba(122, 219, 143, 0.15)",
  borderRadius: "9999px",
  border: "1px solid #7ADB8F",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 0 8px rgba(122, 219, 143, 0.15)",
} as const;

const MINT_COLOR = "#7ADB8F";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract a display-friendly name from a video URL
 * Shows the filename if available, otherwise shows "Video link"
 */
function getDisplayName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop();
    
    if (filename && filename.length > 0) {
      // Decode URI components and remove extension for cleaner display
      const decoded = decodeURIComponent(filename);
      // Truncate long filenames
      if (decoded.length > 30) {
        return decoded.slice(0, 27) + "...";
      }
      return decoded;
    }
    
    // Fallback to hostname
    return urlObj.hostname || "Video link";
  } catch {
    return "Video link";
  }
}

/**
 * Truncate URL for hover card display
 */
function getTruncatedUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength - 3) + "...";
}

// ============================================================================
// Component
// ============================================================================

interface AttachedVideoChipProps {
  /** The video URL that was detected */
  videoUrl: string;
  /** Callback when the chip's remove button is clicked */
  onRemove?: () => void;
}

/**
 * A compact chip showing "Attached video" with the full URL visible on hover.
 * Uses Radix HoverCard for smooth hover interactions.
 */
export function AttachedVideoChip({ videoUrl, onRemove }: AttachedVideoChipProps) {
  const displayName = getDisplayName(videoUrl);
  
  return (
    <HoverCard.Root openDelay={200} closeDelay={100}>
      <HoverCard.Trigger asChild>
        <Flex
          align="center"
          gap="2"
          py="1"
          px="3"
          style={{
            ...CHIP_STYLES,
            cursor: "default",
            display: "inline-flex",
            maxWidth: "fit-content",
          }}
        >
          <Link2Icon width="14" height="14" style={{ color: MINT_COLOR, flexShrink: 0 }} />
          
          <Text size="2" weight="medium" style={{ color: MINT_COLOR }}>
            {displayName}
          </Text>
          
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              style={{
                background: "none",
                border: "none",
                padding: "2px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                marginLeft: "2px",
                color: MINT_COLOR,
                opacity: 0.7,
                transition: "opacity 0.2s, background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.backgroundColor = "rgba(122, 219, 143, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.7";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              aria-label="Remove video link"
            >
              <Cross2Icon width="12" height="12" />
            </button>
          )}
        </Flex>
      </HoverCard.Trigger>
      
      <HoverCard.Portal>
        <HoverCard.Content
          sideOffset={8}
          align="start"
          style={{
            backgroundColor: "var(--gray-2)",
            border: "1px solid var(--gray-6)",
            borderRadius: "var(--radius-2)",
            padding: "var(--space-3)",
            maxWidth: "400px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 9999,
          }}
        >
          <Flex direction="column" gap="1">
            <Text size="1" weight="medium" style={{ color: "var(--gray-11)" }}>
              Video URL
            </Text>
            <Text 
              size="1" 
              style={{ 
                color: "var(--gray-10)",
                wordBreak: "break-all",
                fontFamily: "monospace",
                fontSize: "11px",
                lineHeight: 1.4,
              }}
            >
              {getTruncatedUrl(videoUrl, 100)}
            </Text>
          </Flex>
          <HoverCard.Arrow style={{ fill: "var(--gray-2)" }} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

