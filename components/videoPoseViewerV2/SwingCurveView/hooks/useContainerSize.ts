/**
 * useContainerSize Hook
 * 
 * Observes container size for responsive chart rendering.
 */

import { useState, useEffect, RefObject } from "react";

interface ContainerSize {
  width: number;
  height: number;
}

const DEFAULT_SIZE: ContainerSize = { width: 600, height: 300 };

/**
 * Hook to observe and track container dimensions using ResizeObserver
 * @param containerRef - Reference to the container element
 * @param controlsHeight - Height to subtract for controls (default: 120)
 * @param minChartHeight - Minimum chart height (default: 280)
 */
export function useContainerSize(
  containerRef: RefObject<HTMLDivElement | null>,
  controlsHeight: number = 120,
  minChartHeight: number = 280
): ContainerSize {
  const [containerSize, setContainerSize] = useState<ContainerSize>(DEFAULT_SIZE);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: Math.max(minChartHeight, entry.contentRect.height - controlsHeight),
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [containerRef, controlsHeight, minChartHeight]);

  return containerSize;
}
