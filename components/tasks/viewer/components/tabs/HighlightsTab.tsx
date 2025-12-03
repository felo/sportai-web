"use client";

import { RefObject, useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { StarIcon, PlayIcon } from "@radix-ui/react-icons";
import type { StatisticsResult, SwingWithPlayer, BallBounce } from "../../types";
import { formatDuration } from "../../utils";
import { Confetti } from "../shared";
import { useHighlightThumbnails } from "../../hooks/useHighlightThumbnails";
import { BallTrackerOverlay } from "../BallTrackerOverlay";

// Clip duration settings (seconds before/after the key moment)
const CLIP_BEFORE = 2;
const CLIP_AFTER = 3;

interface HighlightsTabProps {
  result: StatisticsResult | null;
  videoRef?: RefObject<HTMLVideoElement | null>; // Kept for backwards compat, but unused
  videoUrl: string | undefined;
  portraits: Record<number, string>;
  playerDisplayNames: Record<number, string>;
  // Legacy prop for backwards compatibility
  highlights?: Array<{ type: string; start: { timestamp: number }; end: { timestamp: number }; duration: number; swing_count: number }>;
}

// Achievement types
type AchievementType = "fastest_shot" | "fastest_sprint" | "longest_rally";

interface Achievement {
  type: AchievementType;
  title: string;
  emoji: string;
  value: string;
  unit: string;
  subtitle: string;
  timestamp: number;
  playerIds: number[];
  gradient: readonly [string, string, string];
  accentColor: string;
  glowColor: string;
  // Optional custom clip boundaries (for full rally playback)
  clipStart?: number;
  clipEnd?: number;
}

// Achievement color configs - rich, vibrant gradients
const ACHIEVEMENT_STYLES: Record<
  AchievementType,
  {
    gradient: readonly [string, string, string];
    accentColor: string;
    glowColor: string;
    emoji: string;
  }
> = {
  fastest_shot: {
    gradient: ["#FF6B35", "#F7931E", "#FFD93D"] as const,
    accentColor: "#FF6B35",
    glowColor: "rgba(255, 107, 53, 0.5)",
    emoji: "💥",
  },
  fastest_sprint: {
    gradient: ["#00D4AA", "#00B894", "#55EFC4"] as const,
    accentColor: "#00D4AA",
    glowColor: "rgba(0, 212, 170, 0.5)",
    emoji: "⚡",
  },
  longest_rally: {
    gradient: ["#667EEA", "#764BA2", "#A855F7"] as const,
    accentColor: "#667EEA",
    glowColor: "rgba(102, 126, 234, 0.5)",
    emoji: "🎾",
  },
};

// Type for ball positions
interface BallPosition {
  timestamp: number;
  X: number;
  Y: number;
}

export function HighlightsTab({
  result,
  videoUrl,
  portraits,
  playerDisplayNames,
}: HighlightsTabProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [expandedType, setExpandedType] = useState<AchievementType | null>(null);

  // Compute all swings from result (same as useAllSwings hook)
  const allSwings = useMemo<SwingWithPlayer[]>(() => {
    if (!result?.players) return [];
    return result.players.flatMap(player =>
      player.swings
        .filter(swing => swing.is_in_rally !== false)
        .map(swing => ({
          ...swing,
          player_id: player.player_id,
        }))
    );
  }, [result]);

  // Extract ball data from result
  const ballPositions = useMemo<BallPosition[]>(() => result?.ball_positions || [], [result]);
  const ballBounces = useMemo<BallBounce[]>(() => result?.ball_bounces || [], [result]);

  // Compute achievements from result data
  const achievements = useMemo(() => {
    if (!result) return [];

    const achievements: Achievement[] = [];
    const players = result.players || [];
    const rallies = result.rallies || [];

    // 🎯 FASTEST SHOT
    let fastestShot = { speed: 0, playerId: -1, timestamp: 0 };
    players.forEach((player) => {
      player.swings?.forEach((swing) => {
        if (swing.ball_speed > fastestShot.speed) {
          fastestShot = {
            speed: swing.ball_speed,
            playerId: player.player_id,
            timestamp: swing.ball_hit?.timestamp ?? swing.start.timestamp,
          };
        }
      });
    });

    if (fastestShot.speed > 0) {
      const style = ACHIEVEMENT_STYLES.fastest_shot;
      achievements.push({
        type: "fastest_shot",
        title: "Fastest Shot",
        emoji: style.emoji,
        value: `${Math.round(fastestShot.speed)}`,
        unit: "km/h",
        subtitle:
          playerDisplayNames[fastestShot.playerId] ||
          `Player ${fastestShot.playerId}`,
        timestamp: fastestShot.timestamp,
        playerIds: [fastestShot.playerId],
        gradient: style.gradient,
        accentColor: style.accentColor,
        glowColor: style.glowColor,
      });
    }

    // 🏃 FASTEST SPRINT
    let fastestSprint = { speed: 0, playerId: -1, timestamp: 0 };
    players.forEach((player) => {
      if (player.fastest_sprint > fastestSprint.speed) {
        fastestSprint = {
          speed: player.fastest_sprint,
          playerId: player.player_id,
          timestamp: player.fastest_sprint_timestamp,
        };
      }
    });

    if (fastestSprint.speed > 0) {
      const style = ACHIEVEMENT_STYLES.fastest_sprint;
      achievements.push({
        type: "fastest_sprint",
        title: "Fastest Sprint",
        emoji: style.emoji,
        value: `${fastestSprint.speed.toFixed(1)}`,
        unit: "km/h",
        subtitle:
          playerDisplayNames[fastestSprint.playerId] ||
          `Player ${fastestSprint.playerId}`,
        timestamp: fastestSprint.timestamp,
        playerIds: [fastestSprint.playerId],
        gradient: style.gradient,
        accentColor: style.accentColor,
        glowColor: style.glowColor,
      });
    }

    // 🎾 LONGEST RALLY
    let longestRally = { duration: 0, start: 0, end: 0 };
    rallies.forEach(([start, end]) => {
      const duration = end - start;
      if (duration > longestRally.duration) {
        longestRally = { duration, start, end };
      }
    });

    if (longestRally.duration > 0) {
      // Count shots and find players in longest rally
      const involvedPlayerIds = new Set<number>();
      let shotsInRally = 0;

      players.forEach((p) => {
        p.swings?.forEach((s) => {
          const hitTime = s.ball_hit?.timestamp ?? s.start.timestamp;
          if (hitTime >= longestRally.start && hitTime <= longestRally.end) {
            involvedPlayerIds.add(p.player_id);
            shotsInRally++;
          }
        });
      });

      const style = ACHIEVEMENT_STYLES.longest_rally;
      achievements.push({
        type: "longest_rally",
        title: "Longest Rally",
        emoji: style.emoji,
        value: formatDuration(longestRally.duration),
        unit: "",
        subtitle: `${shotsInRally} shots`,
        timestamp: longestRally.start,
        playerIds: Array.from(involvedPlayerIds).slice(0, 4),
        gradient: style.gradient,
        accentColor: style.accentColor,
        glowColor: style.glowColor,
        // Play the full rally
        clipStart: longestRally.start,
        clipEnd: longestRally.end,
      });
    }

    return achievements;
  }, [result, playerDisplayNames]);

  // Extract timestamps for thumbnail generation
  const timestamps = useMemo(
    () => achievements.map((a) => a.timestamp),
    [achievements]
  );

  // Extract video thumbnails (memory-efficient, single hidden video)
  const { thumbnails } = useHighlightThumbnails(videoUrl, timestamps);

  // Trigger celebration confetti after cards animate in
  useEffect(() => {
    if (achievements.length > 0) {
      const timer = setTimeout(() => setShowConfetti(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [achievements.length]);

  if (!result || achievements.length === 0) {
    return (
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        <Flex
          align="center"
          justify="center"
          direction="column"
          gap="3"
          style={{ padding: "60px 20px" }}
        >
          <StarIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
          <Text size="3" color="gray">
            No highlights detected
          </Text>
          <Text size="2" color="gray">
            Key moments from the match will appear here
          </Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box style={{ position: "relative" }}>
      {/* Background celebration confetti */}
      <Box style={{ position: "fixed", top: 0, left: "50%", zIndex: 100, pointerEvents: "none" }}>
        <Confetti trigger={showConfetti} />
      </Box>

      <Flex direction="column" gap="6">
        {/* Achievement Cards Grid */}
        <Flex gap="5" wrap="wrap" justify="center">
          {achievements.map((achievement, index) => (
            <AchievementCard
              key={achievement.type}
              achievement={achievement}
              portraits={portraits}
              playerDisplayNames={playerDisplayNames}
              thumbnail={thumbnails[achievement.timestamp]}
              videoUrl={videoUrl}
              delay={index * 200}
              isExpanded={expandedType === achievement.type}
              onToggle={() => setExpandedType(expandedType === achievement.type ? null : achievement.type)}
              ballPositions={ballPositions}
              ballBounces={ballBounces}
              allSwings={allSwings}
            />
          ))}
        </Flex>
      </Flex>

      {/* Global keyframe animations */}
      <style>{`
        @keyframes highlightSlideUp {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes highlightPulse {
          0%, 100% {
            box-shadow: 0 8px 32px var(--glow-color, rgba(0,0,0,0.2));
          }
          50% {
            box-shadow: 0 12px 48px var(--glow-color, rgba(0,0,0,0.3));
          }
        }
        
        @keyframes highlightShine {
          0% {
            transform: translateX(-100%) rotate(25deg);
          }
          100% {
            transform: translateX(200%) rotate(25deg);
          }
        }
        
        @keyframes valueCountUp {
          from {
            transform: scale(0.5);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </Box>
  );
}

// Individual Achievement Card - Premium Design with Expandable Video
function AchievementCard({
  achievement,
  portraits,
  playerDisplayNames,
  thumbnail,
  videoUrl,
  delay,
  isExpanded,
  onToggle,
  ballPositions,
  ballBounces,
  allSwings,
}: {
  achievement: Achievement;
  portraits: Record<number, string>;
  playerDisplayNames: Record<number, string>;
  thumbnail?: string;
  videoUrl?: string;
  delay: number;
  isExpanded: boolean;
  onToggle: () => void;
  ballPositions: BallPosition[];
  ballBounces: BallBounce[];
  allSwings: SwingWithPlayer[];
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMultiPlayer = achievement.playerIds.length > 1;

  // Clip boundaries - use custom if provided, otherwise default to CLIP_BEFORE/AFTER
  const clipStart = achievement.clipStart ?? Math.max(0, achievement.timestamp - CLIP_BEFORE);
  const clipEnd = achievement.clipEnd ?? achievement.timestamp + CLIP_AFTER;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Handle video looping within clip boundaries
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isExpanded) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= clipEnd) {
        video.currentTime = clipStart;
      }
    };

    const handleLoadedMetadata = () => {
      video.currentTime = clipStart;
      video.play().catch(() => {});
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    // If already loaded, start playing
    if (video.readyState >= 1) {
      video.currentTime = clipStart;
      video.play().catch(() => {});
    }

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [isExpanded, clipStart, clipEnd]);

  // Pause video when collapsed
  useEffect(() => {
    if (!isExpanded && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isExpanded]);

  const handleCardClick = useCallback(() => {
    onToggle();
  }, [onToggle]);

  return (
    <Box
      onClick={handleCardClick}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: isExpanded ? 480 : 320,
        borderRadius: 20,
        overflow: "hidden",
        cursor: isExpanded ? "default" : "pointer",
        position: "relative",
        background: "var(--gray-1)",
        border: `1px solid ${isExpanded ? achievement.accentColor : "var(--gray-5)"}`,
        opacity: isVisible ? 1 : 0,
        animationName: isVisible ? "highlightSlideUp" : "none",
        animationDuration: "0.6s",
        animationTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        animationFillMode: "forwards",
        animationDelay: `${delay}ms`,
        transform: isExpanded 
          ? "translateY(0) scale(1)" 
          : isHovered 
            ? "translateY(-8px) scale(1.02)" 
            : "translateY(0) scale(1)",
        boxShadow: isExpanded
          ? `0 24px 80px ${achievement.glowColor}, 0 12px 40px rgba(0,0,0,0.2)`
          : isHovered
            ? `0 20px 60px ${achievement.glowColor}, 0 8px 24px rgba(0,0,0,0.15)`
            : "0 4px 20px rgba(0,0,0,0.1)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        zIndex: isExpanded ? 10 : 1,
        ["--glow-color" as string]: achievement.glowColor,
      }}
    >
      {/* Video / Thumbnail Section */}
      <Box
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          overflow: "hidden",
          background: "#000",
        }}
      >
        {/* Expanded: Show looping video */}
        {isExpanded && videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {/* Ball Tracker Overlay - only for longest_rally */}
            {achievement.type === "longest_rally" && 
             (ballPositions.length > 0 || ballBounces.length > 0 || allSwings.length > 0) && (
              <div style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}>
                <BallTrackerOverlay
                  ballPositions={ballPositions}
                  ballBounces={ballBounces}
                  swings={allSwings}
                  videoRef={videoRef}
                  usePerspective={true}
                  showIndicator={true}
                  showTrail={true}
                  useSmoothing={true}
                  showBounceRipples={true}
                  showVelocity={true}
                  showPlayerBoxes={false}
                  showPose={false}
                  playerDisplayNames={playerDisplayNames}
                  isFullscreen={false}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {/* Collapsed: Show thumbnail */}
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={achievement.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: isHovered ? "scale(1.05)" : "scale(1)",
                  transition: "transform 0.4s ease",
                }}
              />
            ) : (
              <Box
                style={{
                  width: "100%",
                  height: "100%",
                  background: `linear-gradient(135deg, ${achievement.gradient[0]} 0%, ${achievement.gradient[1]} 50%, ${achievement.gradient[2]} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 64, opacity: 0.8 }}>{achievement.emoji}</Text>
              </Box>
            )}

            {/* Gradient overlay */}
            <Box
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)`,
                pointerEvents: "none",
              }}
            />

            {/* Shine effect on hover */}
            {isHovered && (
              <Box
                style={{
                  position: "absolute",
                  inset: 0,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                <Box
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "50%",
                    height: "200%",
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                    animation: "highlightShine 0.8s ease-out",
                  }}
                />
              </Box>
            )}

            {/* Play button overlay */}
            <Flex
              align="center"
              justify="center"
              style={{
                position: "absolute",
                inset: 0,
                opacity: isHovered ? 1 : 0,
                transition: "opacity 0.2s ease",
              }}
            >
              <Box
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.95)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  transform: isHovered ? "scale(1)" : "scale(0.8)",
                  transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <PlayIcon
                  width={32}
                  height={32}
                  style={{ color: achievement.accentColor, marginLeft: 4 }}
                />
              </Box>
            </Flex>

            {/* Category Tag */}
            <Box
              style={{
                position: "absolute",
                bottom: 12,
                left: 12,
                padding: "6px 12px",
                borderRadius: 8,
                background: `linear-gradient(135deg, ${achievement.gradient[0]}, ${achievement.gradient[1]})`,
                boxShadow: `0 4px 12px ${achievement.glowColor}`,
              }}
            >
              <Flex align="center" gap="1">
                <Text style={{ fontSize: 14 }}>{achievement.emoji}</Text>
                <Text size="1" weight="bold" style={{ color: "white", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {achievement.title}
                </Text>
              </Flex>
            </Box>
          </>
        )}
      </Box>

      {/* Content Section */}
      <Box style={{ padding: isExpanded ? "24px" : "20px" }}>
        <Flex align="center" justify="between" gap="3">
          {/* Player Portraits */}
          <Flex align="center" gap="3">
            <Flex style={{ position: "relative" }}>
              {achievement.playerIds.map((playerId, idx) => (
                <Box
                  key={playerId}
                  style={{
                    width: isExpanded ? 60 : isMultiPlayer ? 52 : 56,
                    height: isExpanded ? 60 : isMultiPlayer ? 52 : 56,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: `3px solid ${achievement.accentColor}`,
                    backgroundColor: "var(--gray-4)",
                    marginLeft: idx > 0 ? -16 : 0,
                    zIndex: achievement.playerIds.length - idx,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 4px 12px ${achievement.glowColor}`,
                    transition: "all 0.3s ease",
                    transform: isHovered && !isExpanded ? `translateX(${idx * 4}px)` : "translateX(0)",
                  }}
                >
                  {portraits[playerId] ? (
                    <img
                      src={portraits[playerId]}
                      alt={playerDisplayNames[playerId] || `Player ${playerId}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "top",
                      }}
                    />
                  ) : (
                    <Text
                      size="4"
                      weight="bold"
                      style={{ color: achievement.accentColor }}
                    >
                      {(playerDisplayNames[playerId] || `P${playerId}`).charAt(0)}
                    </Text>
                  )}
                </Box>
              ))}
            </Flex>
            
            {/* Player name(s) */}
            <Flex direction="column" gap="1">
              <Text size="2" color="gray" style={{ maxWidth: isExpanded ? 200 : 100 }}>
                {achievement.subtitle}
              </Text>
              {isExpanded && (
                <Text size="1" style={{ color: achievement.accentColor, opacity: 0.8 }}>
                  {achievement.title}
                </Text>
              )}
            </Flex>
          </Flex>

          {/* Big Value Display */}
          <Flex direction="column" align="end" gap="0">
            <Flex align="baseline" gap="1">
              <Text
                style={{
                  fontSize: isExpanded ? 40 : 32,
                  fontWeight: 800,
                  color: achievement.accentColor,
                  fontFamily: "var(--font-mono, monospace)",
                  lineHeight: 1,
                  animationName: isVisible ? "valueCountUp" : "none",
                  animationDuration: "0.6s",
                  animationTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                  animationFillMode: "forwards",
                  animationDelay: `${delay + 400}ms`,
                  transition: "font-size 0.3s ease",
                }}
              >
                {achievement.value}
              </Text>
              {achievement.unit && (
                <Text size={isExpanded ? "3" : "2"} weight="medium" color="gray">
                  {achievement.unit}
                </Text>
              )}
            </Flex>
          </Flex>
        </Flex>
      </Box>

      {/* Bottom accent line */}
      <Box
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: isExpanded ? 4 : 3,
          background: `linear-gradient(90deg, ${achievement.gradient[0]}, ${achievement.gradient[1]}, ${achievement.gradient[2]})`,
          transform: isExpanded || isHovered ? "scaleX(1)" : "scaleX(0.3)",
          transformOrigin: "left",
          transition: "transform 0.3s ease, height 0.3s ease",
        }}
      />
    </Box>
  );
}
