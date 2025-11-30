"use client";

import { useState, useEffect } from "react";
import { Box, Flex, Heading, Text, Card, Separator } from "@radix-ui/themes";
import { Player } from "../types";
import { PlayerCharts } from "./PlayerCharts";
import { ChampionConfetti } from "./shared/ChampionConfetti";

interface PlayerCardProps {
  player: Player;
  displayIndex: number;
  displayName: string;
  portrait?: string;
  maxDistance?: number;
  distanceRank?: number;
  maxBallSpeed?: number;
  ballSpeedRank?: number;
  maxSprintSpeed?: number;
  sprintRank?: number;
  swingsRank?: number;
  maxSwings?: number;
  overallRank?: number;
}

// Timing constants for medal reveal sequence
const MEDAL_START_DELAY = 500;   // Base delay before all medals start (all players start together)
const SMALL_MEDAL_STAGGER = 350;  // Time between each small medal reveal
const BIG_MEDAL_DELAY = 500;      // Time after last small medal before big medal

// Medal component for individual category medals with animated reveal
function SmallMedal({ rank, label, revealDelay = 0 }: { rank: number; label: string; revealDelay?: number }) {
  const [isRevealed, setIsRevealed] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsRevealed(true), revealDelay);
    return () => clearTimeout(timer);
  }, [revealDelay]);
  
  const colors: Record<number, { bg: string; text: string }> = {
    1: { bg: "#F59E0B", text: "#92400E" },
    2: { bg: "#94A3B8", text: "#475569" },
    3: { bg: "#CD7F32", text: "#7C2D12" },
  };
  
  const color = colors[rank];
  if (!color) return null;
  
  return (
    <Flex 
      direction="column" 
      align="center" 
      gap="1"
      style={{
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed ? "scale(1) translateY(0)" : "scale(0) translateY(10px)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <Box
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${rank === 1 ? '#FCD34D' : rank === 2 ? '#CBD5E1' : '#D4A574'}, ${color.bg})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isRevealed ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 4px rgba(0,0,0,0.2)",
          transition: "box-shadow 0.3s ease-out",
        }}
      >
        <Text size="1" weight="bold" style={{ color: color.text, fontSize: 10 }}>
          {rank}
        </Text>
      </Box>
      <Text size="1" color="gray" style={{ fontSize: 9 }}>
        {label}
      </Text>
    </Flex>
  );
}

// Big overall medal component with animated reveal
function OverallMedal({ rank, revealDelay = 0 }: { rank: number; revealDelay?: number }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showNumber, setShowNumber] = useState(false);
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  
  useEffect(() => {
    // Start reveal after delay
    const revealTimer = setTimeout(() => {
      setIsRevealed(true);
      // Show number shortly after medal appears
      setTimeout(() => {
        setShowNumber(true);
        // Trigger confetti for champion after number reveal
        if (rank === 1) {
          setTimeout(() => setTriggerConfetti(true), 200);
        }
      }, 400);
    }, revealDelay);
    
    return () => clearTimeout(revealTimer);
  }, [revealDelay, rank]);
  
  const config: Record<number, { color: string; gradient: [string, string]; label: string; ribbonColor: string }> = {
    1: { color: "#F59E0B", gradient: ["#FCD34D", "#F59E0B"], label: "Champion", ribbonColor: "#EF4444" },
    2: { color: "#94A3B8", gradient: ["#CBD5E1", "#94A3B8"], label: "Runner-up", ribbonColor: "#3B82F6" },
    3: { color: "#CD7F32", gradient: ["#D4A574", "#CD7F32"], label: "3rd Place", ribbonColor: "#10B981" },
  };
  
  const medal = config[rank];
  
  // "Honorable Mention" for ranks > 3
  if (!medal) {
    return (
      <Flex 
        direction="column" 
        align="center" 
        gap="1"
        style={{
          opacity: isRevealed ? 1 : 0,
          transform: isRevealed ? "scale(1) translateY(0)" : "scale(0.3) translateY(20px)",
          transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <Box
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #E5E7EB, #9CA3AF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
            border: "3px solid #D1D5DB",
          }}
        >
          <Text size="4" style={{ fontSize: 20 }}>⭐</Text>
        </Box>
        <Text size="2" weight="medium" color="gray" align="center">
          Rising Star
        </Text>
      </Flex>
    );
  }
  
  return (
    <Flex 
      direction="column" 
      align="center" 
      gap="1"
      style={{
        position: "relative",
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed ? "scale(1) translateY(0)" : "scale(0.3) translateY(20px)",
        transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {/* Champion confetti */}
      {rank === 1 && <ChampionConfetti trigger={triggerConfetti} />}
      
      <Box
        style={{
          animation: isRevealed && rank === 1 ? "medal-glow 1.5s ease-in-out infinite" : undefined,
        }}
      >
        <svg width="56" height="64" viewBox="0 0 56 64" fill="none">
          {/* Ribbon with drop animation */}
          <g style={{
            transform: isRevealed ? "translateY(0)" : "translateY(-20px)",
            opacity: isRevealed ? 1 : 0,
            transition: "all 0.4s ease-out 0.1s",
          }}>
            <path d="M16 28L28 44L40 28V8H16V28Z" fill={medal.ribbonColor} />
            <path d="M22 8V36L28 44L34 36V8" fill={rank === 1 ? "#DC2626" : rank === 2 ? "#2563EB" : "#059669"} />
          </g>
          {/* Medal circle with bounce */}
          <g style={{
            transform: isRevealed ? "scale(1)" : "scale(0)",
            transformOrigin: "28px 44px",
            transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s",
          }}>
            <circle cx="28" cy="44" r="18" fill={`url(#overall-medal-${rank})`} />
            <circle cx="28" cy="44" r="14" fill={medal.gradient[0]} opacity="0.3" />
          </g>
          {/* Number with delayed reveal */}
          <text 
            x="28" 
            y="50" 
            textAnchor="middle" 
            fontSize="16" 
            fontWeight="bold" 
            fill={rank === 1 ? "#92400E" : rank === 2 ? "#475569" : "#7C2D12"}
            style={{
              opacity: showNumber ? 1 : 0,
              transform: showNumber ? "scale(1)" : "scale(0)",
              transformOrigin: "28px 44px",
              transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {rank}
          </text>
          <defs>
            <linearGradient id={`overall-medal-${rank}`} x1="10" y1="26" x2="46" y2="62" gradientUnits="userSpaceOnUse">
              <stop stopColor={medal.gradient[0]} />
              <stop offset="1" stopColor={medal.gradient[1]} />
            </linearGradient>
          </defs>
        </svg>
      </Box>
      <Text 
        size="2" 
        weight="bold" 
        style={{ 
          color: medal.color,
          opacity: showNumber ? 1 : 0,
          transform: showNumber ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.4s ease-out 0.1s",
        }}
      >
        {medal.label}
      </Text>
      
      {/* Inline keyframes for champion glow - PROMINENT */}
      {rank === 1 && (
        <style>{`
          @keyframes medal-glow {
            0%, 100% { 
              filter: 
                drop-shadow(0 0 12px rgba(255, 215, 0, 0.8))
                drop-shadow(0 0 25px rgba(245, 158, 11, 0.6))
                drop-shadow(0 0 40px rgba(255, 165, 0, 0.4));
              transform: scale(1);
            }
            50% { 
              filter: 
                drop-shadow(0 0 20px rgba(255, 215, 0, 1))
                drop-shadow(0 0 45px rgba(245, 158, 11, 0.9))
                drop-shadow(0 0 70px rgba(255, 165, 0, 0.7))
                drop-shadow(0 0 100px rgba(255, 200, 50, 0.4));
              transform: scale(1.08);
            }
          }
        `}</style>
      )}
    </Flex>
  );
}

export function PlayerCard({ player, displayIndex, displayName, portrait, maxDistance, distanceRank, maxBallSpeed, ballSpeedRank, maxSprintSpeed, sprintRank, swingsRank, maxSwings, overallRank = 4 }: PlayerCardProps) {
  const hasChartData = 
    Object.keys(player.swing_type_distribution).length > 0 || 
    (player.swings && player.swings.length > 0);

  // Collect earned medals and sort by rank (gold first)
  const earnedMedals: { rank: number; label: string }[] = [];
  if (distanceRank && distanceRank <= 3) earnedMedals.push({ rank: distanceRank, label: "Distance" });
  if (sprintRank && sprintRank <= 3) earnedMedals.push({ rank: sprintRank, label: "Sprint" });
  if (ballSpeedRank && ballSpeedRank <= 3) earnedMedals.push({ rank: ballSpeedRank, label: "Power" });
  if (swingsRank && swingsRank <= 3) earnedMedals.push({ rank: swingsRank, label: "Activity" });
  earnedMedals.sort((a, b) => a.rank - b.rank); // Gold (1) to Bronze (3)
  
  // All players start together - winner finishes last due to more medals
  const bigMedalDelay = MEDAL_START_DELAY + (earnedMedals.length * SMALL_MEDAL_STAGGER) + BIG_MEDAL_DELAY;

  return (
    <Card style={{ border: "1px solid var(--gray-6)" }}>
      <Flex direction="column" gap="3" p="4">
        {/* Player header with photo and name centered */}
        <Flex direction="column" align="center" gap="2">
          <Box
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              overflow: "hidden",
              border: "3px solid var(--mint-9)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: portrait ? "transparent" : "var(--mint-9)",
            }}
          >
            {portrait ? (
              <img
                src={portrait}
                alt={displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Text size="5" weight="bold" style={{ color: "white" }}>
                P{displayIndex}
              </Text>
            )}
          </Box>
          <Heading size="5" weight="medium" style={{ textAlign: "center" }}>
            {displayName}
          </Heading>
        </Flex>

        {/* Medal summary row - fixed height for consistent card sizes */}
        <Flex justify="center" align="center" gap="4" py="2" style={{ minHeight: 80 }}>
          {/* Individual category medals - reveal first, one by one */}
          <Flex direction="column" gap="2" style={{ minWidth: 140 }}>
            {earnedMedals.length > 0 ? (
              <>
                <Text size="1" color="gray" style={{ textAlign: "center" }}>Medals earned</Text>
                <Flex gap="3" justify="center">
                  {earnedMedals.map((m, i) => (
                    <SmallMedal 
                      key={i} 
                      rank={m.rank} 
                      label={m.label} 
                      revealDelay={MEDAL_START_DELAY + (i * SMALL_MEDAL_STAGGER)}
                    />
                  ))}
                </Flex>
              </>
            ) : (
              <Text size="1" color="gray" style={{ textAlign: "center", opacity: 0.5 }}>No medals yet</Text>
            )}
          </Flex>
          
          {/* Overall big medal - reveals after all small medals */}
          <OverallMedal rank={overallRank} revealDelay={bigMedalDelay} />
        </Flex>

        {/* Charts Section */}
        {hasChartData && (
          <>
            <Separator size="4" />
            <PlayerCharts player={player} displayName={displayName} maxDistance={maxDistance} distanceRank={distanceRank} maxBallSpeed={maxBallSpeed} ballSpeedRank={ballSpeedRank} maxSprintSpeed={maxSprintSpeed} sprintRank={sprintRank} swingsRank={swingsRank} maxSwings={maxSwings} />
          </>
        )}
      </Flex>
    </Card>
  );
}

