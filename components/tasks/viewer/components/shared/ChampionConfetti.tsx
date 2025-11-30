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
  shape: "circle" | "square" | "star";
  delay: number;
  duration: number;
}

interface ChampionConfettiProps {
  /** When true, triggers the confetti burst */
  trigger: boolean;
}

// Elegant gold-focused palette with accent colors
const CONFETTI_COLORS = [
  "#F59E0B", // Gold
  "#FCD34D", // Bright Gold
  "#FBBF24", // Amber
  "#FDE68A", // Light Gold
  "#FFFFFF", // White sparkle
  "#FFD700", // Pure Gold
];

/**
 * Elegant confetti burst for the champion.
 * Refined particle count with premium feel.
 */
export function ChampionConfetti({ trigger }: ChampionConfettiProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (trigger) {
      const allParticles: ConfettiParticle[] = [];
      
      // Single elegant burst - 40 particles total
      for (let i = 0; i < 40; i++) {
        allParticles.push(createParticle(i));
      }
      
      setParticles(allParticles);

      // Clear after animation
      const timer = setTimeout(() => setParticles([]), 2000);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <Box
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 0,
        height: 0,
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 100,
      }}
    >
      {particles.map((p) => (
        <Box
          key={p.id}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: p.shape === "star" ? 8 * p.scale : 6 * p.scale,
            height: p.shape === "star" ? 8 * p.scale : 6 * p.scale,
            backgroundColor: p.shape === "star" ? "transparent" : p.color,
            borderRadius: p.shape === "circle" ? "50%" : "1px",
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fly ${p.duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}ms forwards`,
            opacity: 0,
            ["--vx" as string]: `${p.velocityX}px`,
            ["--vy" as string]: `${p.velocityY}px`,
            ["--spin" as string]: `${360 + Math.random() * 540}deg`,
            ...(p.shape === "star" && {
              background: `radial-gradient(circle, ${p.color} 0%, ${p.color}80 30%, transparent 70%)`,
              boxShadow: `0 0 6px ${p.color}, 0 0 12px ${p.color}`,
            }),
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fly {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(0.5);
          }
          10% {
            opacity: 1;
            transform: translate(calc(var(--vx) * 0.15), calc(var(--vy) * 0.15)) rotate(45deg) scale(1.2);
          }
          30% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(var(--vx), calc(var(--vy) + 120px)) rotate(var(--spin)) scale(0.3);
          }
        }
      `}</style>
    </Box>
  );
}

function createParticle(id: number): ConfettiParticle {
  // Weighted shape selection: more circles/squares, fewer sparkle stars
  const rand = Math.random();
  let shape: ConfettiParticle["shape"] = "circle";
  if (rand > 0.8) shape = "star";       // 20% stars (glowy accents)
  else if (rand > 0.4) shape = "square"; // 40% squares
  
  // Elegant upward burst with spread
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8; // -90° ± 72°
  const speed = 60 + Math.random() * 100;
  const velocityX = Math.cos(angle) * speed;
  const velocityY = Math.sin(angle) * speed;
  
  // Stagger particles with slight delays for a flowing effect
  const delay = Math.random() * 150;
  
  // Varied durations for organic feel (faster burst)
  const duration = 400 + Math.random() * 600;
  
  return {
    id,
    x: 0,
    y: 0,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 360,
    scale: 0.7 + Math.random() * 0.8,
    velocityX,
    velocityY,
    shape,
    delay,
    duration,
  };
}

