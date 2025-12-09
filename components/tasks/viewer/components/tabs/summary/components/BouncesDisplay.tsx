"use client";

import { useState, useEffect } from "react";
import { Box, Flex, Text, Separator, Grid } from "@radix-ui/themes";
import { useCountingAnimation } from "../hooks";
import type { BounceCounts } from "../types";

interface BouncesDisplayProps {
  total: number;
  bounceCounts: BounceCounts;
}

/**
 * Animated display for ball bounce statistics.
 */
export function BouncesDisplay({ total, bounceCounts }: BouncesDisplayProps) {
  const animationProgress = useCountingAnimation({ duration: 1500, easing: "bounce" });
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    if (animationProgress >= 1) {
      setShowParticles(true);
    }
  }, [animationProgress]);

  const displayTotal = Math.round(total * animationProgress);

  return (
    <Flex direction="column" align="center" gap="4" style={{ paddingTop: 8 }}>
      {/* Big bouncing number */}
      <Box style={{ position: "relative" }}>
        <Text
          style={{
            fontSize: 72,
            fontWeight: 800,
            background: "linear-gradient(135deg, var(--mint-9) 0%, var(--cyan-9) 50%, var(--purple-9) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "var(--font-mono, monospace)",
            lineHeight: 1,
            filter: showParticles ? "drop-shadow(0 0 40px var(--mint-a5))" : "none",
            transform: showParticles ? "scale(1)" : `scale(${0.8 + animationProgress * 0.2})`,
            transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {displayTotal}
        </Text>
        {/* Particle effects */}
        {showParticles && (
          <>
            <BounceParticle delay={0} x={-30} y={-20} />
            <BounceParticle delay={100} x={30} y={-25} />
            <BounceParticle delay={200} x={-25} y={15} />
            <BounceParticle delay={300} x={35} y={10} />
          </>
        )}
      </Box>
      
      <Text size="2" color="gray" weight="medium" style={{ textTransform: "uppercase", letterSpacing: 1 }}>
        Total Bounces Detected
      </Text>

      {/* Bounce breakdown */}
      <Separator size="4" style={{ opacity: 0.3 }} />
      
      <Grid columns="2" gap="3" width="100%">
        <BounceTypeStat
          label="Floor Bounces"
          value={Math.round(bounceCounts.floor * animationProgress)}
          icon="🎾"
          color="mint"
        />
        <BounceTypeStat
          label="Glass Bounces"
          value={Math.round(bounceCounts.wall * animationProgress)}
          icon="🪟"
          color="orange"
        />
        <BounceTypeStat
          label="Shot Contacts"
          value={Math.round(bounceCounts.swing * animationProgress)}
          icon="🏓"
          color="purple"
        />
        <BounceTypeStat
          label="Other"
          value={Math.round(bounceCounts.other * animationProgress)}
          icon="✨"
          color="cyan"
        />
      </Grid>
    </Flex>
  );
}

function BounceTypeStat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: "mint" | "orange" | "purple" | "cyan";
}) {
  return (
    <Flex 
      align="center" 
      gap="2" 
      style={{ 
        padding: "var(--space-2) var(--space-3)", 
        background: "var(--gray-a3)", 
        borderRadius: "var(--radius-2)" 
      }}
    >
      <Text style={{ fontSize: 16 }}>{icon}</Text>
      <Flex direction="column" gap="0">
        <Text size="1" color="gray">{label}</Text>
        <Text size="3" weight="bold" style={{ color: `var(--${color}-11)`, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </Text>
      </Flex>
    </Flex>
  );
}

function BounceParticle({ delay, x, y }: { delay: number; x: number; y: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  return (
    <Box
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "linear-gradient(135deg, var(--mint-9), var(--cyan-9))",
        animation: "bounceParticle 0.8s ease-out forwards",
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
        opacity: 0,
      }}
    />
  );
}


