"use client";

import { useState, useEffect } from "react";
import { Box } from "@radix-ui/themes";

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  velocityX: number;
  velocityY: number;
}

interface ConfettiProps {
  /** When true, triggers confetti explosion */
  trigger: boolean;
  /** Number of particles (default: 24) */
  particleCount?: number;
  /** Colors to use for particles */
  colors?: string[];
  /** Animation duration in ms (default: 1200) */
  duration?: number;
}

const DEFAULT_COLORS = [
  "#F59E0B", // Amber
  "#FCD34D", // Yellow
  "#FBBF24", // Gold
  "#EF4444", // Red
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
];

/**
 * Confetti explosion effect component.
 * Triggers a burst of colorful particles when the trigger prop becomes true.
 */
export function Confetti({
  trigger,
  particleCount = 24,
  colors = DEFAULT_COLORS,
  duration = 1200,
}: ConfettiProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: 50 + (Math.random() - 0.5) * 20,
        y: 50 + (Math.random() - 0.5) * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        velocityX: (Math.random() - 0.5) * 100,
        velocityY: -30 - Math.random() * 50,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => setParticles([]), duration + 300);
      return () => clearTimeout(timer);
    }
  }, [trigger, particleCount, colors, duration]);

  if (particles.length === 0) return null;

  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 20,
      }}
    >
      {particles.map((p) => (
        <Box
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: 8 * p.scale,
            height: 8 * p.scale,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${duration}ms ease-out forwards`,
            ["--vx" as string]: `${p.velocityX}px`,
            ["--vy" as string]: `${p.velocityY}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--vx), calc(var(--vy) + 80px)) rotate(720deg) scale(0.5);
          }
        }
      `}</style>
    </Box>
  );
}





