"use client";

import { useState, useEffect } from "react";

/**
 * Hook for typewriter text animation effect
 * @param text - The full text to animate
 * @param speed - Milliseconds per character (default: 30)
 * @param enabled - Whether to animate or show full text immediately
 * @returns The current display text
 */
export function useTypewriter(text: string, speed: number = 30, enabled: boolean): string {
  const [displayText, setDisplayText] = useState(enabled ? "" : text);
  const [currentIndex, setCurrentIndex] = useState(enabled ? 0 : text.length);

  useEffect(() => {
    // Not enabled - show full text immediately
    if (!enabled) {
      setDisplayText(text);
      setCurrentIndex(text.length);
      return;
    }

    // Continue typing
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed, enabled]);

  return displayText;
}
