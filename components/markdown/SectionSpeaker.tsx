"use client";

import { useState } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { useAudioPlayer } from "@/components/AudioPlayerContext";
import { getTTSSettings } from "@/utils/storage";

interface SectionSpeakerProps {
  sectionText: string;
  sectionId: string;
  messageId: string;
}

export function SectionSpeaker({ sectionText, sectionId, messageId }: SectionSpeakerProps) {
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const { playAudio, isCurrentlyPlaying } = useAudioPlayer();
  
  const uniqueId = `${messageId}-section-${sectionId}`;
  const isPlaying = isCurrentlyPlaying(uniqueId);

  const handlePlayAudio = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoadingAudio) return;
    
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
          text: sectionText,
          messageId: uniqueId,
          settings: ttsSettings,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate audio');
      }
      
      const data = await response.json();
      
      // Play the audio
      await playAudio(uniqueId, data.audioUrl);
    } catch (error) {
      console.error('[SectionSpeaker] Failed to play audio:', error);
      // TODO: Show error toast
    } finally {
      setIsLoadingAudio(false);
    }
  };

  return (
    <button
      onClick={handlePlayAudio}
      disabled={isLoadingAudio}
      aria-label="Read this section aloud"
      style={{
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        border: "1px solid var(--gray-6)",
        backgroundColor: isPlaying ? "var(--mint-3)" : "var(--gray-2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: isLoadingAudio ? "default" : "pointer",
        transition: "all 0.2s ease",
        opacity: isLoadingAudio ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isLoadingAudio) {
          e.currentTarget.style.backgroundColor = isPlaying ? "var(--mint-4)" : "var(--gray-3)";
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.borderColor = isPlaying ? "var(--mint-7)" : "var(--gray-7)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isPlaying ? "var(--mint-3)" : "var(--gray-2)";
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.borderColor = "var(--gray-6)";
      }}
    >
      {isLoadingAudio ? (
        <Loader2 
          size={16} 
          strokeWidth={2}
          style={{
            animation: "spin 1s linear infinite",
          }}
          color="var(--gray-11)"
        />
      ) : (
        <Volume2 
          size={16} 
          strokeWidth={2}
          color={isPlaying ? "var(--mint-11)" : "var(--gray-11)"}
        />
      )}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  );
}

