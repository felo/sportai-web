"use client";

import { useState, useEffect, useRef, RefObject } from "react";

interface AudioAnalysisData {
  // Array of volume levels (0-1) sampled at regular intervals
  volumeData: number[];
  // Time range covered by the data
  startTime: number;
  endTime: number;
  // Sample rate (samples per second)
  sampleRate: number;
}

export function useAudioAnalysis(
  videoRef: RefObject<HTMLVideoElement | null>,
  startTime: number,
  endTime: number,
  enabled: boolean = true
): AudioAnalysisData | null {
  const [audioData, setAudioData] = useState<AudioAnalysisData | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const isAnalyzingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    const video = videoRef.current;
    
    // Create audio context and analyser
    const setupAudio = () => {
      if (audioContextRef.current) return; // Already set up
      
      try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;
        
        // Connect video to analyser
        const source = audioContext.createMediaElementSource(video);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      } catch (error) {
        console.warn("Failed to set up audio analysis:", error);
      }
    };

    // Analyze audio for the given time range
    const analyzeRange = async () => {
      if (isAnalyzingRef.current) return;
      if (!analyserRef.current || !dataArrayRef.current) return;
      
      isAnalyzingRef.current = true;
      
      const duration = endTime - startTime;
      const sampleRate = 30; // 30 samples per second
      const numSamples = Math.ceil(duration * sampleRate);
      const volumeData: number[] = new Array(numSamples).fill(0);
      
      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      
      // Save current time
      const originalTime = video.currentTime;
      const wasPlaying = !video.paused;
      if (wasPlaying) video.pause();
      
      // Sample volume at each point
      for (let i = 0; i < numSamples; i++) {
        const time = startTime + (i / sampleRate);
        video.currentTime = time;
        
        // Wait for seek
        await new Promise<void>(resolve => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            resolve();
          };
          video.addEventListener("seeked", onSeeked);
        });
        
        // Small delay for audio to update
        await new Promise(resolve => setTimeout(resolve, 20));
        
        // Get volume level
        analyser.getByteTimeDomainData(dataArray);
        
        // Calculate RMS volume
        let sum = 0;
        for (let j = 0; j < dataArray.length; j++) {
          const normalized = (dataArray[j] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        volumeData[i] = Math.min(1, rms * 3); // Scale and clamp
      }
      
      // Restore video state
      video.currentTime = originalTime;
      if (wasPlaying) video.play();
      
      setAudioData({
        volumeData,
        startTime,
        endTime,
        sampleRate,
      });
      
      isAnalyzingRef.current = false;
    };

    // Set up on first play
    const onPlay = () => {
      setupAudio();
    };
    
    video.addEventListener("play", onPlay);
    
    // If already has audio context, we can analyze
    if (audioContextRef.current) {
      // Don't auto-analyze, too slow - just set up for real-time
    }

    return () => {
      video.removeEventListener("play", onPlay);
    };
  }, [videoRef, startTime, endTime, enabled]);

  return audioData;
}

// Simpler hook: just get current volume level in real-time
export function useRealtimeVolume(
  videoRef: RefObject<HTMLVideoElement | null>
): number {
  const [volume, setVolume] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isSetUp = false;

    const setupAudio = () => {
      if (isSetUp || audioContextRef.current) return;
      
      try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        
        const source = audioContext.createMediaElementSource(video);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;
        isSetUp = true;
        
        // Start monitoring
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const updateVolume = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteTimeDomainData(dataArray);
          
          // Calculate RMS
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const normalized = (dataArray[i] - 128) / 128;
            sum += normalized * normalized;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          setVolume(Math.min(1, rms * 3));
          
          animationRef.current = requestAnimationFrame(updateVolume);
        };
        
        updateVolume();
      } catch (error) {
        console.warn("Failed to set up audio:", error);
      }
    };

    const onPlay = () => setupAudio();
    video.addEventListener("play", onPlay);
    
    // If already playing, set up now
    if (!video.paused) {
      setupAudio();
    }

    return () => {
      video.removeEventListener("play", onPlay);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [videoRef]);

  return volume;
}

