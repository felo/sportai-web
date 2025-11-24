"use client";

import { useState } from "react";
import { Flex, IconButton } from "@radix-ui/themes";
import { ThumbsUp, ThumbsDown, Volume2, Loader2 } from "lucide-react";
import { useAudioPlayer } from "@/components/AudioPlayerContext";
import { getTTSSettings } from "@/utils/storage";

interface FeedbackButtonsProps {
  messageId: string;
  messageContent?: string;
  onFeedback?: (messageId: string, feedback: "up" | "down") => void;
}

export function FeedbackButtons({ messageId, messageContent, onFeedback }: FeedbackButtonsProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<"up" | "down" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const { playAudio, isCurrentlyPlaying } = useAudioPlayer();

  const handleFeedback = (feedback: "up" | "down") => {
    setSelectedFeedback(feedback);
    
    if (feedback === "up") {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }
    
    onFeedback?.(messageId, feedback);
  };

  const handlePlayAudio = async () => {
    if (!messageContent || isLoadingAudio) return;
    
    setIsLoadingAudio(true);
    
    try {
      // Get TTS settings from storage
      const ttsSettings = getTTSSettings();
      
      // Request audio from API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: messageContent,
          messageId,
          settings: ttsSettings,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate audio');
      }
      
      const data = await response.json();
      
      // Play the audio
      await playAudio(messageId, data.audioUrl);
    } catch (error) {
      console.error('[FeedbackButtons] Failed to play audio:', error);
      // TODO: Show error toast
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const isPlaying = isCurrentlyPlaying(messageId);

  return (
    <Flex gap="3" align="center">
      <IconButton
        size="1"
        variant="ghost"
        color="gray"
        onClick={() => handleFeedback("up")}
        disabled={selectedFeedback !== null}
        style={{
          cursor: selectedFeedback !== null ? "default" : "pointer",
          opacity: selectedFeedback === "down" ? 0.3 : 1,
          color: selectedFeedback === "up" ? "var(--mint-11)" : undefined,
          transition: "opacity 0.2s ease, color 0.2s ease",
        }}
        className={isAnimating ? "feedback-bounce" : ""}
        aria-label="Thumbs up"
      >
        <ThumbsUp 
          size={15} 
          fill={selectedFeedback === "up" ? "currentColor" : "none"}
          strokeWidth={1.5}
        />
      </IconButton>

      <IconButton
        size="1"
        variant="ghost"
        color="gray"
        onClick={() => handleFeedback("down")}
        disabled={selectedFeedback !== null}
        style={{
          cursor: selectedFeedback !== null ? "default" : "pointer",
          opacity: selectedFeedback === "up" ? 0.3 : 1,
          color: selectedFeedback === "down" ? "var(--mint-11)" : undefined,
          transition: "opacity 0.2s ease, color 0.2s ease",
        }}
        aria-label="Thumbs down"
      >
        <ThumbsDown 
          size={15} 
          strokeWidth={1.5}
        />
      </IconButton>

      {messageContent && (
        <IconButton
          size="1"
          variant="ghost"
          color="gray"
          onClick={handlePlayAudio}
          disabled={isLoadingAudio || !messageContent}
          style={{
            cursor: isLoadingAudio || !messageContent ? "default" : "pointer",
            color: isPlaying ? "var(--mint-11)" : undefined,
            transition: "opacity 0.2s ease, color 0.2s ease",
          }}
          aria-label="Read message aloud"
        >
          {isLoadingAudio ? (
            <Loader2 
              size={15} 
              strokeWidth={1.5}
              className="audio-loading-spin"
            />
          ) : (
            <Volume2 
              size={15} 
              strokeWidth={1.5}
            />
          )}
        </IconButton>
      )}

      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.2);
          }
          50% {
            transform: scale(0.9);
          }
          75% {
            transform: scale(1.1);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        :global(.feedback-bounce) {
          animation: bounce 0.6s ease;
        }

        :global(.audio-loading-spin) {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </Flex>
  );
}

