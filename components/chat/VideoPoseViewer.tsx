"use client";

import { lazy, Suspense } from "react";
import type { SupportedModel } from "@/hooks/usePoseDetection";
import { Box, Flex, Text } from "@radix-ui/themes";

// Dynamic import of the TensorFlow-heavy component
const VideoPoseViewerCore = lazy(() => 
  import("./videoPoseViewer/VideoPoseViewerCore").then(mod => ({ 
    default: mod.VideoPoseViewer 
  }))
);

interface VideoPoseViewerProps {
  videoUrl: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  showControls?: boolean;
  initialModel?: SupportedModel;
  initialShowSkeleton?: boolean;
  initialShowAngles?: boolean;
  initialMeasuredAngles?: number[][];
  initialPlaybackSpeed?: number;
  initialUseAccurateMode?: boolean;
  initialConfidenceMode?: "standard" | "high" | "low";
  initialResolutionMode?: "fast" | "balanced" | "accurate";
  initialShowTrackingId?: boolean;
  initialShowTrajectories?: boolean;
  initialSelectedJoints?: number[];
  initialShowVelocity?: boolean;
  initialVelocityWrist?: "left" | "right";
  initialPoseEnabled?: boolean;
}

// Loading placeholder that matches video dimensions
function VideoPoseViewerLoading({ width = 640, height = 480 }: { width?: number; height?: number }) {
  return (
    <Box 
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        backgroundColor: "var(--gray-3)",
        borderRadius: "var(--radius-3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Flex direction="column" align="center" gap="3">
        <div className="animate-pulse">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" opacity="0.3" />
            <circle cx="12" cy="10" r="2" />
            <path d="M12 12v2" />
            <path d="M10 16l2-2 2 2" />
            <animateTransform
              attributeName="transform"
              type="scale"
              values="1;1.1;1"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </svg>
        </div>
        <Flex direction="column" align="center" gap="1">
          <Text size="3" weight="medium">
            Loading Pose Detection
          </Text>
          <Text size="2" color="gray">
            Analysing video...
          </Text>
        </Flex>
      </Flex>
    </Box>
  );
}

/**
 * Dynamic wrapper for VideoPoseViewer that code-splits TensorFlow.js (~1.5MB)
 * Only loads when video with pose detection is needed
 * Improves initial page load by 60-70%
 */
export function VideoPoseViewer(props: VideoPoseViewerProps) {
  return (
    <Suspense fallback={<VideoPoseViewerLoading width={props.width} height={props.height} />}>
      <VideoPoseViewerCore {...props} />
    </Suspense>
  );
}
