import { useState, useCallback } from "react";
import {
  validateVideoFile,
  createVideoPreview,
  revokeVideoPreview,
} from "@/utils/video-utils";

export function useVideoUpload() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processVideoFile = useCallback((file: File) => {
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid video file");
      return;
    }

    // Clean up previous preview if exists
    if (videoPreview) {
      revokeVideoPreview(videoPreview);
    }

    setVideoFile(file);
    setError(null);
    const previewUrl = createVideoPreview(file);
    setVideoPreview(previewUrl);
  }, [videoPreview]);

  const clearVideo = useCallback(() => {
    if (videoPreview) {
      revokeVideoPreview(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
  }, [videoPreview]);

  const handleVideoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processVideoFile(file);
      }
    },
    [processVideoFile]
  );

  return {
    videoFile,
    videoPreview,
    error,
    setError,
    processVideoFile,
    clearVideo,
    handleVideoChange,
  };
}

