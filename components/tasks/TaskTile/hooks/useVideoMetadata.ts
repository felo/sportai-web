"use client";

import { useState, useCallback } from "react";
import type { VideoMetadata } from "../types";
import { FORMAT_CODEC_MAP } from "../constants";

interface UseVideoMetadataOptions {
  videoUrl: string;
  videoLength: number | null;
}

interface UseVideoMetadataReturn {
  metadata: VideoMetadata | null;
  isLoading: boolean;
  fetchMetadata: () => Promise<void>;
}

/**
 * Hook to fetch video metadata from browser APIs
 * Extracts dimensions, file size, format, codec, framerate, and bitrate
 */
export function useVideoMetadata({
  videoUrl,
  videoLength,
}: UseVideoMetadataOptions): UseVideoMetadataReturn {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMetadata = useCallback(async () => {
    if (metadata) return; // Already fetched

    setIsLoading(true);

    const result: VideoMetadata = {
      width: null,
      height: null,
      duration: videoLength ?? null,
      fileSize: null,
      format: null,
      codec: null,
      bitrate: null,
      framerate: null,
    };

    // Extract format from URL
    const urlPath = videoUrl.split("?")[0];
    const extension = urlPath.split(".").pop()?.toLowerCase();
    if (extension) {
      result.format = extension.toUpperCase();
      result.codec = FORMAT_CODEC_MAP[result.format] || null;
    }

    // Get file size via HEAD request
    try {
      const response = await fetch(videoUrl, { method: "HEAD" });
      if (response.ok) {
        const contentLength = response.headers.get("content-length");
        if (contentLength) {
          result.fileSize = parseInt(contentLength, 10);
        }
        const contentType = response.headers.get("content-type");
        if (contentType && !result.format) {
          const formatMatch = contentType.match(/video\/(\w+)/);
          if (formatMatch) {
            result.format = formatMatch[1].toUpperCase();
            result.codec = FORMAT_CODEC_MAP[result.format] || null;
          }
        }
      }
    } catch {
      // CORS or network error - silently ignore
    }

    // Get video dimensions and framerate using HTML5 video element
    try {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.preload = "metadata";
      video.muted = true;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          result.width = video.videoWidth;
          result.height = video.videoHeight;
          if (!result.duration && video.duration && isFinite(video.duration)) {
            result.duration = video.duration;
          }
          // Calculate bitrate if we have file size and duration
          if (result.fileSize && result.duration) {
            result.bitrate = Math.round(
              (result.fileSize * 8) / result.duration / 1000
            ); // kbps
          }
          resolve();
        };
        video.onerror = () => resolve();
        video.src = videoUrl;
        setTimeout(() => resolve(), 5000); // Timeout after 5 seconds
      });

      // Detect framerate using requestVideoFrameCallback
      if (
        "requestVideoFrameCallback" in video &&
        result.duration &&
        result.duration > 0.5
      ) {
        try {
          video.currentTime = 0;
          await video.play();

          let frameCount = 0;
          let startTime: number | null = null;
          let lastFrameTime = 0;

          await new Promise<void>((resolve) => {
            const countFrames = (
              _now: number,
              frameMetadata: { presentedFrames?: number; mediaTime: number }
            ) => {
              if (startTime === null) {
                startTime = frameMetadata.mediaTime;
              }
              frameCount++;
              lastFrameTime = frameMetadata.mediaTime;

              const elapsed = lastFrameTime - startTime;
              if (elapsed >= 0.5 || frameCount >= 30) {
                if (elapsed > 0) {
                  result.framerate = Math.round(frameCount / elapsed);
                }
                resolve();
              } else {
                (
                  video as HTMLVideoElement & {
                    requestVideoFrameCallback: (
                      callback: (
                        now: number,
                        metadata: {
                          presentedFrames?: number;
                          mediaTime: number;
                        }
                      ) => void
                    ) => number;
                  }
                ).requestVideoFrameCallback(countFrames);
              }
            };

            (
              video as HTMLVideoElement & {
                requestVideoFrameCallback: (
                  callback: (
                    now: number,
                    metadata: { presentedFrames?: number; mediaTime: number }
                  ) => void
                ) => number;
              }
            ).requestVideoFrameCallback(countFrames);

            setTimeout(() => resolve(), 2000);
          });

          video.pause();
        } catch {
          // Framerate detection failed
        }
      }

      video.src = "";
    } catch {
      // CORS or video error - silently ignore
    }

    setMetadata(result);
    setIsLoading(false);
  }, [videoUrl, videoLength, metadata]);

  return { metadata, isLoading, fetchMetadata };
}
