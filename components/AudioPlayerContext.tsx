"use client";

import { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { audioLogger } from "@/lib/logger";

interface AudioPlayerState {
  currentMessageId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
}

interface AudioPlayerContextValue extends AudioPlayerState {
  playAudio: (messageId: string, audioUrl: string) => Promise<void>;
  stopAudio: () => void;
  isCurrentlyPlaying: (messageId: string) => boolean;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AudioPlayerState>({
    currentMessageId: null,
    isPlaying: false,
    isLoading: false,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    // Revoke object URL if it was created
    if (currentUrlRef.current && currentUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(currentUrlRef.current);
    }
    currentUrlRef.current = null;
    
    setState({
      currentMessageId: null,
      isPlaying: false,
      isLoading: false,
    });
    
    audioLogger.debug('[AudioPlayer] Audio stopped');
  }, []);

  const playAudio = useCallback(async (messageId: string, audioUrl: string) => {
    audioLogger.debug('[AudioPlayer] Playing audio for message:', messageId);
    
    // Stop any currently playing audio
    if (audioRef.current) {
      stopAudio();
    }
    
    // Set loading state
    setState({
      currentMessageId: messageId,
      isPlaying: false,
      isLoading: true,
    });
    
    try {
      // Create new audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      currentUrlRef.current = audioUrl;
      
      // Handle audio events
      audio.addEventListener('loadeddata', () => {
        audioLogger.debug('[AudioPlayer] Audio loaded successfully');
        setState({
          currentMessageId: messageId,
          isPlaying: true,
          isLoading: false,
        });
      });
      
      audio.addEventListener('ended', () => {
        audioLogger.debug('[AudioPlayer] Audio playback ended');
        stopAudio();
      });
      
      audio.addEventListener('error', (e) => {
        audioLogger.error('[AudioPlayer] Audio playback error:', e);
        stopAudio();
      });
      
      // Start playback
      await audio.play();
      audioLogger.debug('[AudioPlayer] Audio playback started');
    } catch (error) {
      audioLogger.error('[AudioPlayer] Failed to play audio:', error);
      stopAudio();
      throw error;
    }
  }, [stopAudio]);

  const isCurrentlyPlaying = useCallback((messageId: string) => {
    return state.currentMessageId === messageId && (state.isPlaying || state.isLoading);
  }, [state.currentMessageId, state.isPlaying, state.isLoading]);

  const value: AudioPlayerContextValue = {
    ...state,
    playAudio,
    stopAudio,
    isCurrentlyPlaying,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}












