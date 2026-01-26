"use client";

import { forwardRef, useRef, useEffect, useState } from "react";
import { Box, IconButton, Tooltip } from "@radix-ui/themes";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
} from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "@/styles/vidstack.css";

interface TechniquePlayerProps {
  videoUrl: string;
}

export const TechniquePlayer = forwardRef<HTMLVideoElement, TechniquePlayerProps>(
  ({ videoUrl }, ref) => {
    const playerRef = useRef<MediaPlayerInstance>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);

    const FRAME_DURATION = 1 / 30; // 30fps

    const skipFrameBackward = () => {
      const player = playerRef.current;
      if (player) {
        player.currentTime = Math.max(0, player.currentTime - FRAME_DURATION);
      }
    };

    const skipFrameForward = () => {
      const player = playerRef.current;
      if (player) {
        const duration = player.duration || Infinity;
        player.currentTime = Math.min(duration, player.currentTime + FRAME_DURATION);
      }
    };

    // Sync video ref with parent
    useEffect(() => {
      const player = playerRef.current;
      if (!player) return;

      const syncVideoRef = () => {
        const provider = player.provider;
        if (provider && "video" in provider) {
          const videoEl = (provider as { video: HTMLVideoElement }).video;
          if (typeof ref === "function") {
            ref(videoEl);
          } else if (ref) {
            ref.current = videoEl;
          }
        }
      };

      syncVideoRef();
      player.addEventListener("provider-change", syncVideoRef);

      return () => {
        player.removeEventListener("provider-change", syncVideoRef);
      };
    }, [ref]);

    // Track video ready state
    useEffect(() => {
      const player = playerRef.current;
      if (!player) return;

      const handleCanPlay = () => setIsVideoReady(true);

      if (player.state.canPlay) {
        setIsVideoReady(true);
      }

      player.addEventListener("can-play", handleCanPlay);
      return () => player.removeEventListener("can-play", handleCanPlay);
    }, []);

    const showButtons = isHovered;

    return (
      <Box
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          backgroundColor: "var(--gray-3)",
          borderRadius: "var(--radius-3)",
          overflow: "hidden",
        }}
      >
        <MediaPlayer
          ref={playerRef}
          src={videoUrl}
          viewType="video"
          crossOrigin="anonymous"
          playsInline
          keyShortcuts={{
            togglePaused: "k Space",
            toggleMuted: "m",
            toggleFullscreen: "f",
            togglePictureInPicture: "i",
            seekBackward: "ArrowLeft j",
            seekForward: "ArrowRight l",
            volumeUp: "ArrowUp",
            volumeDown: "ArrowDown",
          }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "var(--radius-3)",
          }}
        >
          <MediaProvider />

          {/* No overlays - clean slate for future technique overlays */}

          <DefaultVideoLayout icons={defaultLayoutIcons} />
        </MediaPlayer>

        {/* Frame stepping controls */}
        {isVideoReady && (
          <Box
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              zIndex: 100,
              opacity: showButtons ? 1 : 0,
              transition: "opacity 0.2s ease-in-out",
              pointerEvents: showButtons ? "auto" : "none",
              display: "flex",
              gap: "6px",
            }}
          >
            <Tooltip content="Previous frame">
              <IconButton
                size="1"
                variant="solid"
                style={{
                  backgroundColor: "#7ADB8F",
                  color: "#1C1C1C",
                  border: "2px solid white",
                  borderRadius: "var(--radius-3)",
                  width: 28,
                  height: 28,
                }}
                onClick={skipFrameBackward}
              >
                <ChevronLeftIcon width={14} height={14} />
              </IconButton>
            </Tooltip>

            <Tooltip content="Next frame">
              <IconButton
                size="1"
                variant="solid"
                style={{
                  backgroundColor: "#7ADB8F",
                  color: "#1C1C1C",
                  border: "2px solid white",
                  borderRadius: "var(--radius-3)",
                  width: 28,
                  height: 28,
                }}
                onClick={skipFrameForward}
              >
                <ChevronRightIcon width={14} height={14} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    );
  }
);

TechniquePlayer.displayName = "TechniquePlayer";
