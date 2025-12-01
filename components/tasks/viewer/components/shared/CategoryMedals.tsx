"use client";

import { useState, useEffect } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { ChampionConfetti } from "./ChampionConfetti";

// Timing constants for medal reveal sequence
export const MEDAL_START_DELAY = 600;
export const SMALL_MEDAL_STAGGER = 1200;
export const BIG_MEDAL_DELAY = 3500;

// Medal type for earned medals
export interface EarnedMedal {
  rank: number;
  label: string;
}

// Medal colors configuration
const MEDAL_COLORS: Record<number, { bg: string; text: string; gradient: string }> = {
  1: { bg: "#F59E0B", text: "#92400E", gradient: "#FCD34D" },
  2: { bg: "#94A3B8", text: "#475569", gradient: "#CBD5E1" },
  3: { bg: "#CD7F32", text: "#7C2D12", gradient: "#D4A574" },
};

// Small medal for individual categories
export function SmallMedal({ 
  rank, 
  label, 
  revealDelay = 0 
}: { 
  rank: number; 
  label: string; 
  revealDelay?: number;
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsRevealed(true), revealDelay);
    return () => clearTimeout(timer);
  }, [revealDelay]);
  
  const color = MEDAL_COLORS[rank];
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
          background: `linear-gradient(135deg, ${color.gradient}, ${color.bg})`,
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

// Drum roll animation before big medal appears
function DrumRollAnimation({ isPlaying }: { isPlaying: boolean }) {
  if (!isPlaying) return null;
  
  return (
    <Box
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        animation: "fadeIn 0.3s ease-out",
        zIndex: 10,
      }}
    >
      <Text style={{ fontSize: 32, animation: "drumBounce 0.12s ease-in-out infinite", display: "block" }}>🥁</Text>
      <style>{`
        @keyframes drumBounce {
          0%, 100% { transform: scale(1) rotate(-3deg); }
          50% { transform: scale(1.1) rotate(3deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </Box>
  );
}

// Overall big medal with animated reveal
export function OverallMedal({ 
  rank, 
  revealDelay = 0,
  showConfetti = true,
  confettiDelay = 0,
}: { 
  rank: number; 
  revealDelay?: number;
  showConfetti?: boolean;
  confettiDelay?: number;
}) {
  const [showDrumRoll, setShowDrumRoll] = useState(revealDelay > 500);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showNumber, setShowNumber] = useState(false);
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  
  useEffect(() => {
    // Hide drum roll just before medal reveals
    const drumRollTimer = setTimeout(() => {
      setShowDrumRoll(false);
    }, Math.max(0, revealDelay - 300));
    
    const revealTimer = setTimeout(() => {
      setIsRevealed(true);
      setTimeout(() => {
        setShowNumber(true);
      }, 400);
    }, revealDelay);
    
    return () => {
      clearTimeout(drumRollTimer);
      clearTimeout(revealTimer);
    };
  }, [revealDelay, rank]);

  // Separate effect for confetti with custom delay
  useEffect(() => {
    if (rank === 1 && showConfetti) {
      const confettiTimer = setTimeout(() => {
        setTriggerConfetti(true);
      }, confettiDelay > 0 ? confettiDelay : revealDelay + 600);
      return () => clearTimeout(confettiTimer);
    }
  }, [rank, showConfetti, confettiDelay, revealDelay]);
  
  const config: Record<number, { color: string; gradient: [string, string]; label: string; ribbonColor: string }> = {
    1: { color: "#F59E0B", gradient: ["#FCD34D", "#F59E0B"], label: "Champion", ribbonColor: "#EF4444" },
    2: { color: "#94A3B8", gradient: ["#CBD5E1", "#94A3B8"], label: "Runner-up", ribbonColor: "#3B82F6" },
    3: { color: "#CD7F32", gradient: ["#D4A574", "#CD7F32"], label: "3rd Place", ribbonColor: "#10B981" },
  };
  
  const medal = config[rank];
  
  // Fallback for ranks > 3
  if (!medal) {
    const funnyOptions = [
      { emoji: "🦆", label: "Quack Star" },
      { emoji: "🧸", label: "Cuddle Champ" },
      { emoji: "🦄", label: "Unicorn Mode" },
      { emoji: "🐢", label: "Slow & Steady" },
      { emoji: "🌵", label: "Prickly Player" },
      { emoji: "🍀", label: "Lucky Charm" },
      { emoji: "🎈", label: "High Spirits" },
      { emoji: "🦊", label: "Sly Move" },
      { emoji: "🐙", label: "Multi-tasker" },
      { emoji: "🌟", label: "Rising Star" },
    ];
    const optionIndex = (rank - 4) % funnyOptions.length;
    const { emoji, label } = funnyOptions[optionIndex];
    
    return (
      <Box style={{ position: "relative", minHeight: 100, minWidth: 80 }}>
        {showDrumRoll && <DrumRollAnimation isPlaying={showDrumRoll} />}
        <Flex 
          direction="column" 
          align="center" 
          gap="0"
          style={{
            opacity: isRevealed ? 1 : 0,
            transform: isRevealed ? "scale(1) translateY(0)" : "scale(0.3) translateY(20px)",
            transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
            paddingTop: 12,
          }}
        >
        <Box style={{ width: 56, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Box
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #E5E7EB, #9CA3AF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
              border: "3px solid #D1D5DB",
            }}
          >
            <Text style={{ fontSize: 16 }}>{emoji}</Text>
          </Box>
        </Box>
        <Text 
          size="2" 
          weight="medium" 
          color="gray" 
          style={{
            width: 80,
            fontSize: label.length > 12 ? 11 : label.length > 10 ? 12 : 14,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            textAlign: "center",
            marginTop: -4,
          }}
        >
          {label}
        </Text>
        </Flex>
      </Box>
    );
  }
  
  return (
    <Box style={{ position: "relative", minHeight: 100, minWidth: 80 }}>
      {showDrumRoll && <DrumRollAnimation isPlaying={showDrumRoll} />}
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
      {rank === 1 && showConfetti && <ChampionConfetti trigger={triggerConfetti} />}
      
      <Box style={{ animation: isRevealed && rank === 1 ? "medal-glow 3s ease-in-out infinite" : undefined }}>
        <svg width="56" height="64" viewBox="0 0 56 64" fill="none">
          <g style={{
            transform: isRevealed ? "translateY(0)" : "translateY(-20px)",
            opacity: isRevealed ? 1 : 0,
            transition: "all 0.4s ease-out 0.1s",
          }}>
            <path d="M16 28L28 44L40 28V8H16V28Z" fill={medal.ribbonColor} />
            <path d="M22 8V36L28 44L34 36V8" fill={rank === 1 ? "#DC2626" : rank === 2 ? "#2563EB" : "#059669"} />
          </g>
          <g style={{
            transform: isRevealed ? "scale(1)" : "scale(0)",
            transformOrigin: "28px 44px",
            transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s",
          }}>
            <circle cx="28" cy="44" r="18" fill={`url(#overall-medal-${rank})`} />
            <circle cx="28" cy="44" r="14" fill={medal.gradient[0]} opacity="0.3" />
          </g>
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
          width: 80,
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        {medal.label}
      </Text>
      
      {rank === 1 && (
        <style>{`
          @keyframes medal-glow {
            0%, 100% { 
              filter: drop-shadow(0 0 12px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 25px rgba(245, 158, 11, 0.6)) drop-shadow(0 0 40px rgba(255, 165, 0, 0.4));
              transform: scale(1);
            }
            50% { 
              filter: drop-shadow(0 0 20px rgba(255, 215, 0, 1)) drop-shadow(0 0 45px rgba(245, 158, 11, 0.9)) drop-shadow(0 0 70px rgba(255, 165, 0, 0.7)) drop-shadow(0 0 100px rgba(255, 200, 50, 0.4));
              transform: scale(1.08);
            }
          }
        `}</style>
      )}
      </Flex>
    </Box>
  );
}

// Consolation prize for those without medals
export function ConsolationPrize({ index }: { index: number }) {
  const [isRevealed, setIsRevealed] = useState(false);
  
  const treats = [
    { emoji: "🍫", label: "Chocolate" },
    { emoji: "🍬", label: "Candy" },
    { emoji: "🍭", label: "Lollipop" },
    { emoji: "🧁", label: "Cupcake" },
    { emoji: "🍩", label: "Donut" },
    { emoji: "🍪", label: "Cookie" },
  ];
  
  const { emoji, label } = treats[(index - 1) % treats.length];
  
  useEffect(() => {
    const timer = setTimeout(() => setIsRevealed(true), MEDAL_START_DELAY);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <Flex 
      direction="column" 
      align="center" 
      gap="1"
      style={{
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed ? "scale(1) translateY(0)" : "scale(0.8) translateY(5px)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <Text size="1" color="gray" style={{ textAlign: "center" }}>Consolation prize</Text>
      <Flex direction="column" align="center" gap="0" style={{ marginTop: 4 }}>
        <Text style={{ fontSize: 24, lineHeight: 1 }}>{emoji}</Text>
        <Text size="1" color="gray" style={{ fontSize: 9, marginTop: 2 }}>{label}</Text>
      </Flex>
    </Flex>
  );
}

// Medal summary display with earned medals and overall rank
export interface MedalSummaryProps {
  earnedMedals: EarnedMedal[];
  overallRank: number;
  displayIndex: number;
  showConfetti?: boolean;
}

export function MedalSummary({ 
  earnedMedals, 
  overallRank, 
  displayIndex,
  showConfetti = true,
}: MedalSummaryProps) {
  // Sort medals by rank (gold first)
  const sortedMedals = [...earnedMedals].sort((a, b) => a.rank - b.rank);
  const bigMedalDelay = MEDAL_START_DELAY + (sortedMedals.length * SMALL_MEDAL_STAGGER) + BIG_MEDAL_DELAY;

  return (
    <Flex justify="center" align="center" gap="4" py="2" style={{ minHeight: 80 }}>
      {/* Individual category medals */}
      <Flex direction="column" gap="2" style={{ minWidth: 140 }}>
        {sortedMedals.length > 0 ? (
          <>
            <Text size="1" color="gray" style={{ textAlign: "center" }}>Medals earned</Text>
            <Flex gap="3" justify="center">
              {sortedMedals.map((m, i) => (
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
          <ConsolationPrize index={displayIndex} />
        )}
      </Flex>
      
      {/* Overall medal */}
      <OverallMedal rank={overallRank} revealDelay={bigMedalDelay} showConfetti={showConfetti} />
    </Flex>
  );
}

// Team medal display showing what each medal was earned for
// Uses circular badge design with rank number inside and label below
// Reserves two rows (6 slots) for consistent layout
export interface TeamMedalDisplayProps {
  earnedMedals: EarnedMedal[];
}

const MEDALS_PER_ROW = 4;
const TOTAL_ROWS = 2;

export function TeamMedalDisplay({ earnedMedals }: TeamMedalDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), MEDAL_START_DELAY);
    return () => clearTimeout(timer);
  }, []);

  // Sort medals by rank (gold first)
  const sortedMedals = [...earnedMedals].sort((a, b) => a.rank - b.rank);
  
  // Create rows of medals (4 per row, 2 rows reserved)
  const row1 = sortedMedals.slice(0, MEDALS_PER_ROW);
  const row2 = sortedMedals.slice(MEDALS_PER_ROW, MEDALS_PER_ROW * TOTAL_ROWS);

  return (
    <Flex
      direction="column"
      gap="4"
      align="center"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "scale(1)" : "scale(0.9)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        minHeight: 130, // Reserve space for two rows
      }}
    >
      {/* Row 1 */}
      <Flex gap="5" justify="center" style={{ minHeight: 56 }}>
        {row1.length > 0 ? (
          row1.map((medal, idx) => (
            <CircularMedalBadge key={idx} medal={medal} delay={idx * 250} />
          ))
        ) : (
          <Text size="1" color="gray" style={{ alignSelf: "center" }}>No medals yet</Text>
        )}
      </Flex>
      
      {/* Row 2 - always reserve space, show medals if any */}
      <Flex gap="5" justify="center" style={{ minHeight: 56 }}>
        {row2.map((medal, idx) => (
          <CircularMedalBadge key={idx} medal={medal} delay={(MEDALS_PER_ROW + idx) * 250} />
        ))}
      </Flex>
    </Flex>
  );
}

// Badge colors by rank
const BADGE_COLORS: Record<number, { bg: string; gradient: string; text: string; border: string }> = {
  1: { bg: "#F59E0B", gradient: "#FBBF24", text: "#78350F", border: "#FCD34D" }, // Gold
  2: { bg: "#94A3B8", gradient: "#CBD5E1", text: "#334155", border: "#E2E8F0" }, // Silver
  3: { bg: "#CD7F32", gradient: "#D4A574", text: "#5C3317", border: "#E5B896" }, // Bronze
};

// Circular badge with rank number inside and label below
function CircularMedalBadge({ medal, delay }: { medal: EarnedMedal; delay: number }) {
  const [isRevealed, setIsRevealed] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsRevealed(true), MEDAL_START_DELAY + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Get badge color based on rank (default to gold for unknown ranks)
  const badgeColor = BADGE_COLORS[medal.rank] || BADGE_COLORS[1];

  return (
    <Flex
      direction="column"
      align="center"
      gap="1"
      style={{
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed ? "scale(1) translateY(0)" : "scale(0.5) translateY(10px)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        minWidth: 56,
      }}
    >
      {/* Circular badge */}
      <Box
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: `linear-gradient(145deg, ${badgeColor.gradient}, ${badgeColor.bg})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isRevealed 
            ? `0 3px 10px ${badgeColor.bg}60, inset 0 1px 2px ${badgeColor.border}` 
            : `0 2px 4px ${badgeColor.bg}40`,
          border: `2px solid ${badgeColor.border}`,
          transition: "box-shadow 0.3s ease-out",
        }}
      >
        <Text 
          style={{ 
            fontSize: 18, 
            color: badgeColor.text, 
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {medal.rank}
        </Text>
      </Box>
      
      {/* Label below */}
      <Text 
        size="1" 
        style={{ 
          color: "var(--gray-11)",
          fontSize: 12,
          fontWeight: 500,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {medal.label}
      </Text>
    </Flex>
  );
}

// Legacy medal count props (kept for backwards compatibility)
export interface MedalCountProps {
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
}

// Simple medal count (for cases where you just have counts, not labels)
export function MedalCount({ goldCount, silverCount, bronzeCount }: MedalCountProps) {
  const medals: EarnedMedal[] = [];
  for (let i = 0; i < goldCount; i++) medals.push({ rank: 1, label: "Gold" });
  for (let i = 0; i < silverCount; i++) medals.push({ rank: 2, label: "Silver" });
  for (let i = 0; i < bronzeCount; i++) medals.push({ rank: 3, label: "Bronze" });
  return <TeamMedalDisplay earnedMedals={medals} />;
}

// Helper to collect medals from rankings
export function collectEarnedMedals(rankings: {
  distanceRank?: number;
  sprintRank?: number;
  ballSpeedRank?: number;
  swingsRank?: number;
}): EarnedMedal[] {
  const medals: EarnedMedal[] = [];
  if (rankings.distanceRank && rankings.distanceRank <= 3) {
    medals.push({ rank: rankings.distanceRank, label: "Distance" });
  }
  if (rankings.sprintRank && rankings.sprintRank <= 3) {
    medals.push({ rank: rankings.sprintRank, label: "Sprint" });
  }
  if (rankings.ballSpeedRank && rankings.ballSpeedRank <= 3) {
    medals.push({ rank: rankings.ballSpeedRank, label: "Power" });
  }
  if (rankings.swingsRank && rankings.swingsRank <= 3) {
    medals.push({ rank: rankings.swingsRank, label: "Activity" });
  }
  return medals;
}

// Helper to count medals by type
export function countMedals(earnedMedals: EarnedMedal[]): MedalCountProps {
  return {
    goldCount: earnedMedals.filter(m => m.rank === 1).length,
    silverCount: earnedMedals.filter(m => m.rank === 2).length,
    bronzeCount: earnedMedals.filter(m => m.rank === 3).length,
  };
}

