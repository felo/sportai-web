"use client";

import { lazy, Suspense } from "react";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import { Box } from "@radix-ui/themes";

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

// Minimal loading placeholder - just a frame with spinner
function Pose3DViewerLoading({ width, height }: { width?: number; height?: number }) {
  const hasDimensions = width !== undefined && height !== undefined;
  
  return (
    <Box 
      style={{ 
        width: hasDimensions ? `${width}px` : "100%",
        height: hasDimensions ? `${height}px` : undefined,
        aspectRatio: hasDimensions ? undefined : "1 / 1",
        maxWidth: hasDimensions ? undefined : "400px",
        backgroundColor: "transparent",
        borderRadius: "var(--radius-3)",
        border: "1px solid var(--gray-5)",
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
