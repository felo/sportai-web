"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Box, Flex, Text, Tooltip } from "@radix-ui/themes";
import { PersonIcon, ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { usePlayerProfiles } from "@/hooks/usePlayerProfiles";
import type { ProfilesTabProps } from "./types";
import { PROFILE_COLORS } from "./constants";
import { buildProfileData } from "./utils";
import {
  PlayerProfileCard,
  ComparisonRadar,
  LoadingSkeleton,
} from "./components";

export function ProfilesTab({
  result,
  rankings,
  portraits = {},
  playerDisplayNames = {},
  sport = "padel",
}: ProfilesTabProps) {
  const { profiles, isGenerating, error, generate } = usePlayerProfiles({ sport });
  const hasGeneratedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Build profile data from result
  const profileData = useMemo(() => {
    if (!result) return [];
    return buildProfileData(result, rankings, playerDisplayNames);
  }, [result, rankings, playerDisplayNames]);

  // Auto-generate profiles when data is available
  useEffect(() => {
    if (
      profileData.length > 0 &&
      !hasGeneratedRef.current &&
      !isGenerating &&
      profiles.length === 0
    ) {
      hasGeneratedRef.current = true;
      generate(profileData);
    }
  }, [profileData, isGenerating, profiles.length, generate]);

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    updateScrollState();
    container.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, profiles.length]);

  const scrollToStart = () => {
    scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  const scrollToEnd = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      left: scrollRef.current.scrollWidth,
      behavior: "smooth",
    });
  };

  // No data state
  if (!result || rankings.validPlayers.length === 0) {
    return (
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        <Flex
          align="center"
          justify="center"
          direction="column"
          gap="3"
          style={{ padding: "60px 20px" }}
        >
          <PersonIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
          <Text size="3" color="gray">
            No player data available yet
          </Text>
          <Text size="2" color="gray">
            Player profiles will appear here once the analysis is complete
          </Text>
        </Flex>
      </Box>
    );
  }

  // Loading state
  if (isGenerating) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        <Flex
          align="center"
          justify="center"
          direction="column"
          gap="3"
          style={{ padding: "60px 20px" }}
        >
          <Box
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--red-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 24 }}>⚠️</Text>
          </Box>
          <Text size="3" color="red">
            {error}
          </Text>
          <Text size="2" color="gray">
            Try refreshing the page or check back later
          </Text>
        </Flex>
      </Box>
    );
  }

  // Results - Cards on top, comparison below
  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      {/* Individual player cards - horizontal scroll - ON TOP */}
      <Box style={{ position: "relative", marginBottom: "var(--space-4)" }}>
        {/* Left scroll indicator */}
        {canScrollLeft && (
          <ScrollButton direction="left" onClick={scrollToStart} />
        )}

        {/* Right scroll indicator */}
        {canScrollRight && (
          <ScrollButton direction="right" onClick={scrollToEnd} />
        )}

        {/* Scrollable cards container */}
        <Box
          ref={scrollRef}
          style={{
            overflowX: "auto",
            overflowY: "visible",
            paddingBottom: 16,
            cursor: "grab",
            scrollBehavior: "smooth",
          }}
          onMouseDown={(e) => {
            const container = e.currentTarget;
            container.style.cursor = "grabbing";
            const startX = e.pageX - container.offsetLeft;
            const scrollLeft = container.scrollLeft;

            const onMouseMove = (e: MouseEvent) => {
              e.preventDefault();
              const x = e.pageX - container.offsetLeft;
              const walk = (x - startX) * 1.5;
              container.scrollLeft = scrollLeft - walk;
            };

            const onMouseUp = () => {
              container.style.cursor = "grab";
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          }}
        >
          <Flex gap="4" align="stretch" style={{ width: "max-content" }}>
            {profiles.map((profile, idx) => (
              <PlayerProfileCard
                key={profile.playerId}
                profile={profile}
                portrait={portraits[profile.playerId]}
                color={PROFILE_COLORS[idx % PROFILE_COLORS.length]}
                delay={200 + idx * 150}
              />
            ))}
          </Flex>
        </Box>
      </Box>

      {/* Combined radar comparison (only if multiple players) - BELOW CARDS */}
      {profiles.length > 1 && (
        <ComparisonRadar profiles={profiles} portraits={portraits} />
      )}

      {/* Animations for scroll indicators */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
      `}</style>
    </Box>
  );
}

// Scroll button sub-component
function ScrollButton({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) {
  const isLeft = direction === "left";

  return (
    <Box
      style={{
        position: "absolute",
        [isLeft ? "left" : "right"]: 0,
        top: 0,
        bottom: 16,
        width: 48,
        background: `linear-gradient(to ${isLeft ? "right" : "left"}, var(--gray-1) 0%, transparent 100%)`,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: isLeft ? "flex-start" : "flex-end",
        [isLeft ? "paddingLeft" : "paddingRight"]: 8,
        paddingTop: 100,
        zIndex: 10,
      }}
    >
      <Tooltip content={`Scroll to ${isLeft ? "start" : "end"}`}>
        <button
          onClick={onClick}
          aria-label={`Scroll to ${isLeft ? "start" : "end"}`}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "9999px",
            backgroundColor: "#7ADB8F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.3s ease-out",
            border: "2px solid white",
            boxShadow:
              "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = "#95E5A6";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 0 20px rgba(122, 219, 143, 0.6), 0 0 40px rgba(122, 219, 143, 0.4), 0 4px 16px rgba(122, 219, 143, 0.5)";
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = "#7ADB8F";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)";
          }}
        >
          {isLeft ? (
            <ChevronLeftIcon width={18} height={18} color="#1C1C1C" />
          ) : (
            <ChevronRightIcon width={18} height={18} color="#1C1C1C" />
          )}
        </button>
      </Tooltip>
    </Box>
  );
}



