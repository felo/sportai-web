import { useState, useEffect, useRef, useCallback } from "react";

export interface AnimatedProgressOptions {
  /** Duration in ms (default: 2000) */
  duration?: number;
  /** Delay before starting in ms (default: 150) */
  delay?: number;
  /** Whether animation should start */
  isVisible: boolean;
  /** Optional: percentage of target (0-1) to scale duration proportionally */
  percentage?: number;
  /** Base duration when using percentage-based scaling (default: 4000) */
  baseDuration?: number;
  /** Minimum duration when using percentage-based scaling (default: 500) */
  minDuration?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

export interface AnimatedProgressResult {
  /** Current animation progress (0-1) */
  progress: number;
  /** Whether animation has completed */
  isComplete: boolean;
  /** Reset the animation */
  reset: () => void;
}

/**
 * Hook for animated progress with easing.
 * Provides a smooth animation from 0 to 1 with configurable duration and easing.
 */
export function useAnimatedProgress({
  duration: fixedDuration,
  delay = 150,
  isVisible,
  percentage,
  baseDuration = 4000,
  minDuration = 500,
  onComplete,
}: AnimatedProgressOptions): AnimatedProgressResult {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const hasStartedRef = useRef(false);
  const animationRef = useRef<number | null>(null);

  // Calculate duration based on percentage if provided, otherwise use fixed duration
  const duration = fixedDuration ?? (
    percentage !== undefined
      ? Math.max(minDuration, baseDuration * percentage)
      : 2000
  );

  const reset = useCallback(() => {
    hasStartedRef.current = false;
    setProgress(0);
    setIsComplete(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isVisible && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const rawProgress = Math.min(elapsed / duration, 1);
        
        // Gentle ease-out that starts early (mostly linear with soft landing)
        const eased = rawProgress < 0.7
          ? rawProgress * 1.1 // Slightly faster in first 70%
          : 0.77 + (1 - Math.pow(1 - (rawProgress - 0.7) / 0.3, 2)) * 0.23; // Ease out last 30%
        
        setProgress(Math.min(eased, 1));

        if (rawProgress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsComplete(true);
          onComplete?.();
        }
      };

      const timer = setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
      }, delay);

      return () => {
        clearTimeout(timer);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isVisible, duration, delay, onComplete]);

  return { progress, isComplete, reset };
}

/**
 * Hook for animated number counting.
 * Convenience wrapper around useAnimatedProgress for displaying animated numbers.
 */
export function useAnimatedNumber(
  targetValue: number,
  options: Omit<AnimatedProgressOptions, "percentage">
): number {
  const { progress } = useAnimatedProgress(options);
  return Math.round(targetValue * progress);
}




