"use client";

import { useEffect, useRef, useState, RefObject, useCallback } from "react";
import { Box } from "@radix-ui/themes";
import { audioLogger } from "@/lib/logger";

interface AudioWaveformProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  startTime: number;
  endTime: number;
  height?: number;
  color?: string;
}

interface VolumePoint {
  time: number;
  volume: number;
}

// Global audio context and source tracking to avoid creating multiple sources
const audioContextMap = new WeakMap<HTMLVideoElement, {
  context: AudioContext;
  analyser: AnalyserNode;
}>();

export function AudioWaveform({
  videoRef,
  startTime,
  endTime,
  height = 44,
  color = "rgba(236, 72, 153, 0.7)",
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [volumeHistory, setVolumeHistory] = useState<VolumePoint[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastSampleTimeRef = useRef<number>(-1);
  const [isSetup, setIsSetup] = useState(false);

  const duration = endTime - startTime;

  // Setup audio analysis (only once per video element)
  const setupAudio = useCallback(() => {
    const video = videoRef.current;
    if (!video || isSetup) return;

    try {
      // Check if we already have an audio context for this video
      let audioData = audioContextMap.get(video);
      
      if (!audioData) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContextClass();
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048; // Higher resolution
        analyser.smoothingTimeConstant = 0.1; // Less smoothing for sharper peaks
        
        const source = context.createMediaElementSource(video);
        source.connect(analyser);
        analyser.connect(context.destination); // This ensures audio still plays
        
        audioData = { context, analyser };
        audioContextMap.set(video, audioData);
      }
      
      analyserRef.current = audioData.analyser;
      
      // Resume context if suspended (Chrome autoplay policy)
      if (audioData.context.state === "suspended") {
        audioData.context.resume();
      }
      
      setIsSetup(true);
    } catch (error) {
      audioLogger.error("Audio waveform setup error:", error);
    }
  }, [videoRef, isSetup]);

  // Setup on play or click
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleInteraction = () => {
      setupAudio();
    };

    video.addEventListener("play", handleInteraction);
    video.addEventListener("click", handleInteraction);
    
    // If already has audio data, use it
    const existingData = audioContextMap.get(video);
    if (existingData) {
      analyserRef.current = existingData.analyser;
      setIsSetup(true);
    }

    return () => {
      video.removeEventListener("play", handleInteraction);
      video.removeEventListener("click", handleInteraction);
    };
  }, [videoRef, setupAudio]);

  // Sample volume during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationId: number;
    const dataArray = new Float32Array(analyserRef.current?.fftSize || 2048);

    const sampleVolume = () => {
      animationId = requestAnimationFrame(sampleVolume);
      
      if (!video || video.paused || !analyserRef.current) {
        return;
      }

      const currentTime = video.currentTime;
      
      // Only sample if we're in the rally time range
      if (currentTime >= startTime && currentTime <= endTime) {
        // Sample at ~60fps
        if (currentTime - lastSampleTimeRef.current > 0.016) {
          lastSampleTimeRef.current = currentTime;

          // Get time domain data (waveform)
          analyserRef.current.getFloatTimeDomainData(dataArray);
          
          // Calculate RMS (Root Mean Square) for volume level
          let sum = 0;
          let peak = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const sample = dataArray[i];
            sum += sample * sample;
            peak = Math.max(peak, Math.abs(sample));
          }
          const rms = Math.sqrt(sum / dataArray.length);
          
          // Use combination of RMS and peak for better visualization
          // Scale up for visibility (typical values are 0-0.3)
          const volume = Math.min(1, (rms * 3 + peak) / 2);

          setVolumeHistory(prev => {
            // Avoid duplicates
            if (prev.length > 0 && Math.abs(prev[prev.length - 1].time - currentTime) < 0.01) {
              return prev;
            }
            return [...prev, { time: currentTime, volume }].sort((a, b) => a.time - b.time);
          });
        }
      }
    };

    sampleVolume();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [videoRef, startTime, endTime, isSetup]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const canvasHeight = height;
    
    canvas.width = width * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, canvasHeight);

    // Draw baseline
    ctx.strokeStyle = "rgba(236, 72, 153, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight - 2);
    ctx.lineTo(width, canvasHeight - 2);
    ctx.stroke();

    if (volumeHistory.length < 2) {
      // Show "waiting for audio" message
      ctx.fillStyle = "rgba(236, 72, 153, 0.5)";
      ctx.font = "11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("▶ Play video to capture audio waveform", width / 2, canvasHeight / 2 + 4);
      return;
    }

    // Draw filled waveform
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight);

    for (const point of volumeHistory) {
      const x = ((point.time - startTime) / duration) * width;
      const barHeight = point.volume * (canvasHeight - 4);
      const y = canvasHeight - barHeight - 2;
      ctx.lineTo(x, y);
    }

    // Close the path
    const lastPoint = volumeHistory[volumeHistory.length - 1];
    const lastX = ((lastPoint.time - startTime) / duration) * width;
    ctx.lineTo(lastX, canvasHeight);
    ctx.closePath();

    // Fill with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.7, "rgba(236, 72, 153, 0.3)");
    gradient.addColorStop(1, "rgba(236, 72, 153, 0.05)");
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw peak line on top
    ctx.beginPath();
    let started = false;
    for (const point of volumeHistory) {
      const x = ((point.time - startTime) / duration) * width;
      const barHeight = point.volume * (canvasHeight - 4);
      const y = canvasHeight - barHeight - 2;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = "rgba(236, 72, 153, 1)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Mark likely bounce points (sudden spikes)
    for (let i = 1; i < volumeHistory.length - 1; i++) {
      const prev = volumeHistory[i - 1];
      const curr = volumeHistory[i];
      const next = volumeHistory[i + 1];
      
      // Detect sharp spike (current is higher than neighbors by significant amount)
      const isPeak = curr.volume > prev.volume + 0.15 && curr.volume > next.volume + 0.1;
      const isLoud = curr.volume > 0.3;
      
      if (isPeak && isLoud) {
        const x = ((curr.time - startTime) / duration) * width;
        const y = canvasHeight - (curr.volume * (canvasHeight - 4)) - 2;
        
        // Draw a small circle at the peak
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#EC4899";
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

  }, [volumeHistory, startTime, duration, height, color]);

  // Clear history when rally changes
  useEffect(() => {
    setVolumeHistory([]);
    lastSampleTimeRef.current = -1;
  }, [startTime, endTime]);

  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 1,
        borderRadius: "var(--radius-3)",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </Box>
  );
}
