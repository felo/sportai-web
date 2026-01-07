import { useState, useEffect, useRef } from "react";

export interface UseInViewOptions {
  /** Intersection threshold (0-1, default: 0.3) */
  threshold?: number;
  /** Whether to disconnect after first intersection (default: true) */
  once?: boolean;
}

export interface UseInViewResult {
  /** Ref to attach to the target element */
  ref: React.RefObject<HTMLDivElement>;
  /** Whether the element is/was in view */
  isInView: boolean;
}

/**
 * Hook to detect when an element enters the viewport.
 * Uses IntersectionObserver for efficient visibility detection.
 */
export function useInView({
  threshold = 0.3,
  once = true,
}: UseInViewOptions = {}): UseInViewResult {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, once]);

  return { ref, isInView };
}
















