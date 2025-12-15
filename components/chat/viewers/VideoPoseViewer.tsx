"use client";

import { lazy, Suspense } from "react";
import { Box } from "@radix-ui/themes";

// Type-only imports - these are erased at compile time and don't trigger module resolution
import type { SupportedModel, PoseDetectionResult } from "@/hooks/usePoseDetection";

// Re-export PoseDetectionResult for consumers (type-only export)
export type { PoseDetectionResult } from "@/hooks/usePoseDetection";

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
  theatreMode?: boolean;
  hideTheatreToggle?: boolean;
  // Controlled pose enabled state - when provided, component operates in controlled mode
  poseEnabled?: boolean;
  onPoseEnabledChange?: (enabled: boolean) => void;
  // Callback when video metadata is loaded - provides actual video dimensions
  onVideoMetadataLoaded?: (width: number, height: number) => void;
  // Callback when pose detection results change
  onPoseChange?: (poses: PoseDetectionResult[]) => void;
  // Compact mode - hides button text, used when video is floating/docked
  compactMode?: boolean;
  // S3 storage for pose data caching
  videoS3Key?: string;
  poseDataS3Key?: string;
  onPoseDataSaved?: (s3Key: string) => void;
  // Skip preprocessing - used when video is floating (just playback, no analysis)
  skipPreprocessing?: boolean;
  // Allow preprocessing - when false, only real-time pose detection is available
  // Used for technique LITE eligibility control (side camera + < 20s video)
  allowPreprocessing?: boolean;
}

// Minimal loading placeholder - matches video dimensions exactly
function VideoPoseViewerLoading({ width, height }: { width?: number; height?: number }) {
  return (
    <Box 
      style={{ 
        width: width ? `${width}px` : "100%",
        height: height ? `${height}px` : undefined,
        aspectRatio: (width && height) ? undefined : "16 / 9",
        backgroundColor: "var(--gray-2)",
        borderRadius: "var(--radius-3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div 
        style={{
          width: "32px",
          height: "32px",
          border: "3px solid rgba(122, 219, 143, 0.2)",
          borderTopColor: "#7ADB8F",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
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
