"use client";

import { useState, useEffect } from "react";
import { Text } from "@radix-ui/themes";

export type LoadingPhase = "auth" | "task" | "result" | "done";

interface LoadingStateProps {
  /** Current loading phase message */
  message?: string;
  /** Current loading phase */
  phase?: LoadingPhase;
}

const PHASE_MESSAGES: Record<LoadingPhase, string> = {
  auth: "Authenticating",
  task: "Loading video details",
  result: "Loading analysis data",
  done: "Preparing view",
};

/**
 * Full-screen loading state with animated tennis ball
 */
export function LoadingState({ 
  message,
  phase = "task",
}: LoadingStateProps) {
  const [dotCount, setDotCount] = useState(0);

  // Animate the dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const displayMessage = message || PHASE_MESSAGES[phase] || "Loading";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "var(--gray-1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "32px",
        zIndex: 1000,
      }}
    >
      {/* Subtle grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(122, 219, 143, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(122, 219, 143, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          opacity: 0.6,
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)",
        }}
      />

      {/* Central Loading Animation */}
      <div
        style={{
          position: "relative",
          width: "120px",
          height: "120px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Tennis Ball */}
        <div
          style={{
            position: "absolute",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "linear-gradient(160deg, #d4e34a 0%, #c5d43e 30%, #a8bc32 60%, #8fa328 100%)",
            boxShadow: "inset -3px -3px 6px rgba(0, 0, 0, 0.2), inset 3px 3px 6px rgba(255, 255, 255, 0.25), 0 8px 32px rgba(122, 219, 143, 0.4)",
            animation: "taskLoaderBallBounce 1.1s linear infinite",
            zIndex: 2,
            overflow: "hidden",
          }}
        >
          {/* Fuzzy texture overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "radial-gradient(circle at 50% 50%, transparent 30%, rgba(255,255,255,0.08) 100%)",
              zIndex: 1,
            }}
          />
          {/* Ball shine */}
          <div
            style={{
              position: "absolute",
              inset: "3px",
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.4), transparent 45%)",
              zIndex: 4,
            }}
          />
          {/* Tennis ball seam - top curve (S-shape) */}
          <div
            style={{
              position: "absolute",
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              border: "none",
              borderTop: "2.5px solid rgba(255, 255, 255, 0.9)",
              top: "-8px",
              left: "50%",
              transform: "translateX(-50%) rotate(-30deg)",
              zIndex: 2,
            }}
          />
          {/* Tennis ball seam - bottom curve (S-shape) */}
          <div
            style={{
              position: "absolute",
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              border: "none",
              borderBottom: "2.5px solid rgba(255, 255, 255, 0.9)",
              bottom: "-8px",
              left: "50%",
              transform: "translateX(-50%) rotate(-30deg)",
              zIndex: 2,
            }}
          />
        </div>

        {/* Ball Shadow */}
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            width: "40px",
            height: "8px",
            background: "radial-gradient(ellipse, rgba(0, 0, 0, 0.3) 0%, transparent 70%)",
            borderRadius: "50%",
            animation: "taskLoaderShadowPulse 1.1s linear infinite",
          }}
        />
      </div>

      {/* Loading Text */}
      <Text
        size="4"
        weight="medium"
        style={{
          color: "var(--gray-11)",
          letterSpacing: "0.02em",
          zIndex: 1,
        }}
      >
        {displayMessage}{".".repeat(dotCount)}
      </Text>
    </div>
  );
}
