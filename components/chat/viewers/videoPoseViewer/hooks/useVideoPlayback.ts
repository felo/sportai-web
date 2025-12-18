import { useState, useCallback, useRef, RefObject } from "react";
import { videoLogger } from "@/lib/logger";
import { track } from "@/lib/analytics";

interface UseVideoPlaybackProps {
  videoRef: RefObject<HTMLVideoElement>;
  initialPlaybackSpeed?: number;
}

/**
 * useVideoPlayback - Manages video playback state and controls
 * 
 * Handles:
 * - Play/pause state
 * - Playback speed
 * - Play/pause/reset handlers
 * - Playback tracking
 */
export function useVideoPlayback({
  videoRef,
  initialPlaybackSpeed = 1.0,
}: UseVideoPlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(initialPlaybackSpeed);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const hasTrackedPlay = useRef(false);

  /**
   * Handle play/pause toggle
   */
  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        setHasStartedPlaying(true);
        
        // Track first play only (not every resume)
        if (!hasTrackedPlay.current) {
          hasTrackedPlay.current = true;
          track('video_play_started', {
            durationSeconds: Math.round(video.duration || 0),
          });
        }
      }).catch(err => videoLogger.error("Video play error:", err));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [videoRef]);

  /**
   * Reset video to beginning
   */
  const handleReset = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.pause();
    setIsPlaying(false);
  }, [videoRef]);

  /**
   * Set playback speed
   */
  const setSpeed = useCallback((speed: number) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = speed;
    }
    setPlaybackSpeed(speed);
  }, [videoRef]);

  return {
    // State
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed: setSpeed,
    hasStartedPlaying,
    setHasStartedPlaying,

    // Handlers
    handlePlayPause,
    handleReset,
  };
}

