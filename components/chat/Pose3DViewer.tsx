"use client";

import { lazy, Suspense } from "react";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import { Box, Flex, Text } from "@radix-ui/themes";

// Dynamic import of the Three.js-heavy component
const Pose3DViewerCore = lazy(() => 
  import("./Pose3DViewerCore").then(mod => ({ 
    default: mod.Pose3DViewer 
  }))
);

interface Pose3DViewerProps {
  pose: PoseDetectionResult | null;
  width: number;
  height: number;
  showFace?: boolean;
}

// Loading placeholder that matches the viewer dimensions
function Pose3DViewerLoading({ width, height }: { width: number; height: number }) {
  return (
    <Box 
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        backgroundColor: "#1a1a1a",
        borderRadius: "var(--radius-3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Flex direction="column" align="center" gap="2">
        <div className="animate-pulse">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" opacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 12 12"
                to="360 12 12"
                dur="1s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
        </div>
        <Text size="2" color="gray" style={{ color: "#888" }}>
          Loading 3D viewer...
        </Text>
      </Flex>
    </Box>
  );
}

/**
 * Dynamic wrapper for Pose3DViewer that code-splits Three.js (~600KB)
 * Only loads when actually needed, improving initial page load
 */
export function Pose3DViewer(props: Pose3DViewerProps) {
  return (
    <Suspense fallback={<Pose3DViewerLoading width={props.width} height={props.height} />}>
      <Pose3DViewerCore {...props} />
    </Suspense>
  );
}
