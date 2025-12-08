/**
 * useFFmpegClip
 * 
 * Hook for extracting video clips using FFmpeg.wasm.
 * FFmpeg is lazy-loaded only when needed (first clip extraction).
 * 
 * Usage:
 * const { extractClip, isLoading, isExtracting, progress, error } = useFFmpegClip();
 * const blob = await extractClip(videoUrl, startTime, endTime);
 */

import { useState, useCallback, useRef } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

interface UseFFmpegClipReturn {
  /** Extract a clip from a video URL */
  extractClip: (
    videoUrl: string,
    startTime: number,
    endTime: number,
    options?: ClipOptions
  ) => Promise<Blob | null>;
  /** Whether FFmpeg is loading (first time only) */
  isLoading: boolean;
  /** Whether clip extraction is in progress */
  isExtracting: boolean;
  /** Current progress (0-100) */
  progress: number;
  /** Error message if any */
  error: string | null;
  /** Whether FFmpeg is loaded and ready */
  isReady: boolean;
}

interface ClipOptions {
  /** Output format (default: mp4) */
  format?: "mp4" | "webm";
  /** Video codec (default: libx264 for mp4, libvpx for webm) */
  videoCodec?: string;
  /** Quality preset (default: "fast") */
  preset?: "ultrafast" | "fast" | "medium" | "slow";
  /** Constant Rate Factor - quality (default: 23, lower = better quality) */
  crf?: number;
}

// Singleton FFmpeg instance (shared across all hook instances)
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<void> | null = null;

export function useFFmpegClip(): UseFFmpegClipReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(ffmpegInstance?.loaded ?? false);
  
  const abortRef = useRef(false);

  /**
   * Load FFmpeg.wasm (lazy, singleton)
   * Uses the single-threaded UMD version which works without special headers
   */
  const loadFFmpeg = useCallback(async (): Promise<FFmpeg> => {
    // Already loaded
    if (ffmpegInstance?.loaded) {
      return ffmpegInstance;
    }

    // Loading in progress
    if (ffmpegLoadPromise) {
      await ffmpegLoadPromise;
      return ffmpegInstance!;
    }

    // Start loading
    setIsLoading(true);
    setError(null);

    ffmpegLoadPromise = (async () => {
      try {
        console.log("[FFmpegClip] Loading FFmpeg.wasm...");
        
        ffmpegInstance = new FFmpeg();
        
        // Set up progress handler
        ffmpegInstance.on("progress", ({ progress: p }) => {
          setProgress(Math.round(p * 100));
        });

        // Set up log handler for debugging
        ffmpegInstance.on("log", ({ message }) => {
          console.log("[FFmpeg]", message);
        });

        // Load FFmpeg core using UMD version (works without SharedArrayBuffer)
        // This is the single-threaded version that works in all browsers without special headers
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
        
        await ffmpegInstance.load({
          coreURL: `${baseURL}/ffmpeg-core.js`,
          wasmURL: `${baseURL}/ffmpeg-core.wasm`,
        });

        console.log("[FFmpegClip] FFmpeg.wasm loaded successfully");
        setIsReady(true);
      } catch (err) {
        console.error("[FFmpegClip] Failed to load FFmpeg:", err);
        ffmpegInstance = null;
        ffmpegLoadPromise = null;
        throw err;
      } finally {
        setIsLoading(false);
      }
    })();

    await ffmpegLoadPromise;
    return ffmpegInstance!;
  }, []);

  /**
   * Extract a clip from a video
   */
  const extractClip = useCallback(
    async (
      videoUrl: string,
      startTime: number,
      endTime: number,
      options: ClipOptions = {}
    ): Promise<Blob | null> => {
      const {
        format = "mp4",
        preset = "fast",
        crf = 23,
      } = options;

      setError(null);
      setProgress(0);
      abortRef.current = false;

      try {
        // Load FFmpeg if not already loaded
        const ffmpeg = await loadFFmpeg();

        setIsExtracting(true);
        console.log(`[FFmpegClip] Extracting clip: ${startTime}s - ${endTime}s`);

        // Determine input filename from URL or use default
        const urlPath = new URL(videoUrl).pathname;
        const inputExt = urlPath.split(".").pop() || "mp4";
        const inputName = `input.${inputExt}`;
        const outputName = `output.${format}`;

        // Fetch the video file
        console.log("[FFmpegClip] Fetching video...");
        const videoData = await fetchFile(videoUrl);
        
        if (abortRef.current) {
          console.log("[FFmpegClip] Extraction aborted");
          return null;
        }

        // Write input file
        await ffmpeg.writeFile(inputName, videoData);

        // Calculate duration
        const duration = endTime - startTime;

        // Build FFmpeg command
        // -ss before -i for fast seeking (input seeking)
        // Then re-encode for frame-accurate output
        const args = [
          "-ss", String(startTime),
          "-i", inputName,
          "-t", String(duration),
          "-c:v", format === "mp4" ? "libx264" : "libvpx",
          "-preset", preset,
          "-crf", String(crf),
          "-c:a", format === "mp4" ? "aac" : "libvorbis",
          "-movflags", "+faststart",
          "-y",
          outputName,
        ];

        console.log("[FFmpegClip] Running FFmpeg:", args.join(" "));

        // Run FFmpeg
        await ffmpeg.exec(args);

        if (abortRef.current) {
          console.log("[FFmpegClip] Extraction aborted after exec");
          return null;
        }

        // Read output file
        const outputData = await ffmpeg.readFile(outputName);
        
        // Clean up files
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);

        // Create blob
        const mimeType = format === "mp4" ? "video/mp4" : "video/webm";
        const blob = new Blob([outputData], { type: mimeType });

        console.log(`[FFmpegClip] Clip extracted: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
        setProgress(100);

        return blob;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to extract clip";
        console.error("[FFmpegClip] Error:", err);
        setError(message);
        return null;
      } finally {
        setIsExtracting(false);
      }
    },
    [loadFFmpeg]
  );

  return {
    extractClip,
    isLoading,
    isExtracting,
    progress,
    error,
    isReady,
  };
}

/**
 * Helper to trigger download of a blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

