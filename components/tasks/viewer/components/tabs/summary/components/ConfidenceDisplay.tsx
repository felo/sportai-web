"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Flex, Text, Card, Heading, Grid } from "@radix-ui/themes";
import { ProgressRing } from "../../../shared";
import type { ProgressRingGradient } from "../../../shared";
import type { Confidences } from "../types";

const CONFIDENCE_GRADIENT: ProgressRingGradient = {
  stops: [
    { offset: "0%", color: "#10B981" },
    { offset: "33%", color: "#84CC16" },
    { offset: "66%", color: "#F59E0B" },
    { offset: "100%", color: "#EF4444" },
  ],
};

const AI_IMPROVEMENT_MESSAGES = [
  "SportAI gets smarter with every match – like a coach who never sleeps ☕",
  "Still in training! SportAI watches more matches than your most dedicated fan 📺",
  "These scores improve with every rally. SportAI never skips training day 💪",
  "SportAI is doing its homework on every match – rain or shine, no rest days 🤖",
  "Like a rookie turning pro, SportAI learns something new from every game 🎾",
  "Work in progress – SportAI is grinding harder than a baseline warrior 🏃",
];

interface ConfidenceDisplayProps {
  confidences: Confidences;
}

/**
 * Display AI detection confidence scores with progress rings.
 */
export function ConfidenceDisplay({ confidences }: ConfidenceDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <Card ref={containerRef} style={{ border: "1px solid var(--gray-5)" }}>
      <Flex direction="column" gap="3" p="4">
        <Heading size="3" weight="medium">AI Detection Confidence</Heading>
        <Grid columns="2" gap="2" style={{ justifyItems: "center" }}>
          <ProgressRing
            value={Math.round(confidences.pose * 100)}
            maxValue={100}
            isVisible={isVisible}
            playerId={1}
            gradient={CONFIDENCE_GRADIENT}
            icon="🧍"
            unit="Pose"
            size={100}
            strokeWidth={8}
            hideMedalDisplay
          />
          <ProgressRing
            value={Math.round(confidences.swing * 100)}
            maxValue={100}
            isVisible={isVisible}
            playerId={2}
            gradient={CONFIDENCE_GRADIENT}
            icon="🏓"
            unit="Swing"
            size={100}
            strokeWidth={8}
            hideMedalDisplay
          />
          <ProgressRing
            value={Math.round(confidences.ball * 100)}
            maxValue={100}
            isVisible={isVisible}
            playerId={3}
            gradient={CONFIDENCE_GRADIENT}
            icon="🎾"
            unit="Ball"
            size={100}
            strokeWidth={8}
            hideMedalDisplay
          />
          <ProgressRing
            value={Math.round(confidences.final * 100)}
            maxValue={100}
            isVisible={isVisible}
            playerId={4}
            gradient={CONFIDENCE_GRADIENT}
            icon="🤖"
            unit="Overall"
            size={100}
            strokeWidth={8}
            hideMedalDisplay
          />
        </Grid>
        <AIImprovementMessage />
      </Flex>
    </Card>
  );
}

function AIImprovementMessage() {
  const [isVisible, setIsVisible] = useState(false);
  
  const message = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * AI_IMPROVEMENT_MESSAGES.length);
    return AI_IMPROVEMENT_MESSAGES[randomIndex];
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Text 
      size="1" 
      color="gray" 
      style={{ 
        textAlign: "center", 
        fontStyle: "italic", 
        marginTop: 8,
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.6s ease-in-out",
      }}
    >
      {message}
    </Text>
  );
}

