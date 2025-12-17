"use client";

import { useState, useRef, useCallback } from "react";
import { logger } from "@/lib/logger";
import type { Task } from "../types";
import { validateVideoFile, extractFirstFrameWithDuration, uploadThumbnailToS3 } from "@/utils/video-utils";
import { uploadToS3 } from "@/lib/s3";

interface UseVideoUploadOptions {
  /** JWT access token for authenticated API calls */
  accessToken: string | null;
  onTaskCreated: (task: Task) => void;
  onError: (error: string) => void;
}

interface UseVideoUploadReturn {
  // State
  uploadingVideo: boolean;
  uploadProgress: number;
  selectedFile: File | null;
  fileInputRef: React.RefObject<HTMLInputElement>;

  // Actions
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearSelectedFile: () => void;
  handleFileUploadSubmit: (taskType: string, sport: string) => Promise<void>;
}

/**
 * Hook for handling video file uploads.
 */
export function useVideoUpload({
  accessToken,
  onTaskCreated,
  onError,
}: UseVideoUploadOptions): UseVideoUploadReturn {
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        onError(validation.error || "Invalid video file");
        return;
      }
      setSelectedFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  }, [onError]);

  // Clear selected file
  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Submit file upload
  const handleFileUploadSubmit = useCallback(
    async (taskType: string, sport: string) => {
      if (!accessToken || !selectedFile) return;

      setUploadingVideo(true);
      setUploadProgress(0);

      try {
        // Step 1: Get presigned URL for S3 upload
        const urlResponse = await fetch("/api/s3/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: selectedFile.name,
            contentType: selectedFile.type,
          }),
        });

        if (!urlResponse.ok) {
          const errorData = await urlResponse.json();
          throw new Error(errorData.error || "Failed to get upload URL");
        }

        const { url: presignedUrl, downloadUrl, publicUrl } = await urlResponse.json();
        const videoUrl = downloadUrl || publicUrl;

        // Step 2: Upload file to S3
        await uploadToS3(presignedUrl, selectedFile, (progress) => {
          setUploadProgress(progress);
        });

        // Step 3: Extract thumbnail and duration from the file
        let thumbnailUrl: string | null = null;
        let thumbnailS3Key: string | null = null;
        let videoLength: number | null = null;

        try {
          logger.debug("[useVideoUpload] Extracting thumbnail from uploaded file...");
          const { frameBlob, durationSeconds } = await extractFirstFrameWithDuration(
            selectedFile,
            640,
            0.7
          );
          videoLength = durationSeconds;

          if (frameBlob) {
            const uploadResult = await uploadThumbnailToS3(frameBlob);
            if (uploadResult) {
              thumbnailUrl = uploadResult.thumbnailUrl;
              thumbnailS3Key = uploadResult.thumbnailS3Key;
            }
          }
        } catch (thumbErr) {
          logger.warn("[useVideoUpload] Thumbnail extraction failed:", thumbErr);
        }

        // Step 4: Create task with the uploaded video URL
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            taskType,
            sport,
            videoUrl,
            thumbnailUrl,
            thumbnailS3Key,
            videoLength,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create task");
        }

        const { task } = await response.json();
        onTaskCreated(task);
        clearSelectedFile();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to upload video");
      } finally {
        setUploadingVideo(false);
        setUploadProgress(0);
      }
    },
    [accessToken, selectedFile, onTaskCreated, onError, clearSelectedFile]
  );

  return {
    uploadingVideo,
    uploadProgress,
    selectedFile,
    fileInputRef,
    handleFileSelect,
    clearSelectedFile,
    handleFileUploadSubmit,
  };
}


