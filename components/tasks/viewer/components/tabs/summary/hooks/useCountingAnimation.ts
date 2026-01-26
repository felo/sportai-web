import { useState, useEffect, useRef, useContext } from "react";
import { CountingContext } from "../CountingContext";

interface UseCountingAnimationOptions {
  duration?: number;
  easing?: "easeOut" | "bounce";
}

/**
 * Shared hook for animated counting/progress effects.
 * Waits for CountingContext to signal start, then animates from 0 to 1.
 */
export function useCountingAnimation(options: UseCountingAnimationOptions = {}) {
  const { duration = 1500, easing = "easeOut" } = options;
  const [progress, setProgress] = useState(0);
  const hasStartedRef = useRef(false);
  const startCounting = useContext(CountingContext);

  useEffect(() => {
    if (startCounting && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const rawProgress = Math.min(elapsed / duration, 1);

        // Apply easing
        let eased: number;
        if (easing === "bounce") {
          eased = rawProgress < 0.5
            ? 4 * rawProgress * rawProgress * rawProgress
            : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;
        } else {
          // easeOut cubic
          eased = 1 - Math.pow(1 - rawProgress, 3);
        }

        setProgress(eased);

        if (rawProgress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [startCounting, duration, easing]);

  return progress;
}
