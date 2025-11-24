"use client";

import { Flex, Button, Tooltip } from "@radix-ui/themes";
import { PlayIcon, PauseIcon, ResetIcon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";

interface PlaybackControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  isPreprocessing: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  disabled?: boolean;
}

/**
 * Playback control buttons for video player.
 * Includes play/pause and reset functionality.
 */
export function PlaybackControls({
  isPlaying,
  isLoading,
  isPreprocessing,
  onPlayPause,
  onReset,
  disabled = false,
}: PlaybackControlsProps) {
  const isDisabled = disabled || isLoading || isPreprocessing;

  return (
    <Flex gap="2" align="center">
      <Tooltip content={isPlaying ? "Pause" : "Play"}>
        <Button
          onClick={onPlayPause}
          disabled={isDisabled}
          className={buttonStyles.actionButtonSquare}
          size="2"
        >
          {isPlaying ? <PauseIcon width="16" height="16" /> : <PlayIcon width="16" height="16" />}
        </Button>
      </Tooltip>

      <Tooltip content="Reset to start">
        <Button
          onClick={onReset}
          disabled={isDisabled}
          className={buttonStyles.actionButtonSquare}
          size="2"
        >
          <ResetIcon width="16" height="16" />
        </Button>
      </Tooltip>
    </Flex>
  );
}




