"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  Flex,
  Text,
  Button,
  Box,
  IconButton,
  Select,
  Badge,
} from "@radix-ui/themes";
import { Cross2Icon, UploadIcon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";
import {
  validateVideoFile,
  extractFirstFrameWithDuration,
  uploadThumbnailToS3,
} from "@/utils/video-utils";
import { uploadToS3 } from "@/lib/s3";
import { logger } from "@/lib/logger";

// Sport options
const SPORTS = [
  { value: "padel", label: "Padel" },
  { value: "tennis", label: "Tennis" },
  { value: "pickleball", label: "Pickleball" },
  { value: "all", label: "Other" },
] as const;

// Analysis type options with descriptions (Match first/left)
const ANALYSIS_TYPES = [
  {
    value: "statistics",
    label: "Match",
    description: "Analyse a complete match with a full-court view",
  },
  {
    value: "technique",
    label: "Technique",
    description: "Analyse one swing in a few seconds",
  },
] as const;

type AnalysisType = "technique" | "statistics";

export interface VideoUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** JWT access token for authenticated API calls */
  accessToken: string | null;
  /** Called when a task is successfully created - task object from API response */
  onTaskCreated: (task: any) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
  /** Optional initial sport selection */
  defaultSport?: string;
  /** Optional initial analysis type */
  defaultTaskType?: AnalysisType;
}

// Default values
const DEFAULT_SPORT = "padel";
const DEFAULT_TASK_TYPE: AnalysisType = "statistics";

/**
 * VideoUploadModal - A reusable modal for video upload and analysis submission.
 *
 * Features:
 * - Sport selection dropdown
 * - Analysis type toggle (Match vs Technique) with descriptions
 * - File upload with progress tracking
 * - Validation before submission
 */
export function VideoUploadModal({
  open,
  onOpenChange,
  accessToken,
  onTaskCreated,
  onError,
  defaultSport = DEFAULT_SPORT,
  defaultTaskType = DEFAULT_TASK_TYPE,
}: VideoUploadModalProps) {
  // Form state
  const [sport, setSport] = useState(defaultSport);
  const [taskType, setTaskType] = useState<AnalysisType>(defaultTaskType);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<"uploading" | "processing" | "creating">("uploading");
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync task type when modal opens or defaultTaskType changes while open
  useEffect(() => {
    if (open) {
      setTaskType(defaultTaskType);
    }
  }, [open, defaultTaskType]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      // Delay reset to allow close animation
      const timer = setTimeout(() => {
        setSport(defaultSport);
        setTaskType(defaultTaskType);
        setSelectedFile(null);
        setUploading(false);
        setUploadProgress(0);
        setUploadStage("uploading");
        setError(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open, defaultSport, defaultTaskType]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateVideoFile(file, { skipSizeLimit: true });
      if (!validation.valid) {
        setError(validation.error || "Please select a valid video file");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  }, []);

  // Clear selected file
  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Check if form is valid
  const isFormValid = sport && taskType && selectedFile;

  // Create task via API
  const createTask = useCallback(async (
    videoUrlToUse: string,
    thumbnailUrl: string | null,
    thumbnailS3Key: string | null,
    videoLength: number | null
  ) => {
    if (!accessToken) throw new Error("Not authenticated");

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        taskType,
        sport,
        videoUrl: videoUrlToUse,
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
    return task;
  }, [accessToken, taskType, sport]);

  // Handle file upload
  const handleFileUpload = useCallback(async () => {
    if (!accessToken || !selectedFile) {
      setError("Please sign in and select a file");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStage("uploading");
    setError(null);

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
      const uploadedVideoUrl = downloadUrl || publicUrl;

      // Step 2: Upload file to S3 with progress tracking
      await uploadToS3(presignedUrl, selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      // Step 3: Extract thumbnail and duration
      setUploadStage("processing");
      let thumbnailUrl: string | null = null;
      let thumbnailS3Key: string | null = null;
      let videoLength: number | null = null;

      try {
        logger.debug("[VideoUploadModal] Extracting thumbnail...");
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
        logger.warn("[VideoUploadModal] Thumbnail extraction failed:", thumbErr);
      }

      // Step 4: Create task
      setUploadStage("creating");
      const task = await createTask(uploadedVideoUrl, thumbnailUrl, thumbnailS3Key, videoLength);

      onTaskCreated(task);
      onOpenChange(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to upload video";
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStage("uploading");
    }
  }, [accessToken, selectedFile, createTask, onTaskCreated, onOpenChange, onError]);

  // Handle submit
  const handleSubmit = async () => {
    if (!isFormValid || uploading) return;
    await handleFileUpload();
  };

  // Get upload stage label
  const getUploadStageLabel = () => {
    switch (uploadStage) {
      case "uploading":
        return `Uploading... ${Math.round(uploadProgress)}%`;
      case "processing":
        return "Processing video...";
      case "creating":
        return "Creating analysis task...";
      default:
        return "Uploading...";
    }
  };

  // Estimate time remaining based on progress and file size
  const getTimeRemaining = () => {
    if (!selectedFile || uploadProgress === 0 || uploadProgress >= 100) return null;

    // Rough estimate: assume 2 MB/s upload speed
    const fileSizeMB = selectedFile.size / (1024 * 1024);
    const remainingMB = fileSizeMB * (1 - uploadProgress / 100);
    const estimatedSeconds = Math.ceil(remainingMB / 2);

    if (estimatedSeconds < 60) {
      return `~${estimatedSeconds}s remaining`;
    }
    const minutes = Math.ceil(estimatedSeconds / 60);
    return `~${minutes}m remaining`;
  };

  return (
    <Dialog.Root open={open} onOpenChange={uploading ? undefined : onOpenChange}>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>Upload Video for Analysis</Dialog.Title>

        <Flex direction="column" gap="4" mt="4">
          {/* Sport Selection */}
          <Box>
            <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
              Sport
            </Text>
            <Select.Root value={sport} onValueChange={setSport} disabled={uploading}>
              <Select.Trigger style={{ width: "100%" }} />
              <Select.Content>
                {SPORTS.map((s) => (
                  <Select.Item key={s.value} value={s.value}>
                    {s.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Box>

          {/* Analysis Type Toggle Cards */}
          <Box>
            <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
              Analysis Type
            </Text>
            <Flex gap="3">
              {ANALYSIS_TYPES.map((type) => (
                <Box
                  key={type.value}
                  onClick={() => !uploading && setTaskType(type.value as AnalysisType)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "var(--radius-3)",
                    border: `2px solid ${taskType === type.value ? "var(--accent-9)" : "var(--gray-6)"}`,
                    backgroundColor: taskType === type.value ? "var(--accent-2)" : "transparent",
                    cursor: uploading ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                    opacity: uploading ? 0.5 : 1,
                  }}
                >
                  <Text size="2" weight="bold" style={{ display: "block", marginBottom: "4px" }}>
                    {type.label}
                  </Text>
                  <Text size="1" color="gray">
                    {type.description}
                  </Text>
                </Box>
              ))}
            </Flex>
          </Box>

          {/* Video Input Section */}
          <Box>
            <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
              Video
            </Text>

            {/* File Upload */}
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                disabled={uploading}
                style={{ display: "none" }}
              />
              {selectedFile ? (
                <Flex gap="2" align="center">
                  <Badge size="2" variant="soft" color="blue" style={{ maxWidth: "300px" }}>
                    <Text style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedFile.name}
                    </Text>
                  </Badge>
                  <IconButton
                    variant="ghost"
                    size="1"
                    onClick={clearSelectedFile}
                    disabled={uploading}
                  >
                    <Cross2Icon />
                  </IconButton>
                </Flex>
              ) : (
                <Button
                  className={buttonStyles.actionButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  size="2"
                >
                  <UploadIcon width={16} height={16} />
                  Capture or Upload
                </Button>
              )}
            </Box>

            {/* Upload Progress Bar */}
            {uploading && (
              <Box mt="3">
                <Box
                  style={{
                    height: "8px",
                    backgroundColor: "var(--gray-4)",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    style={{
                      height: "100%",
                      width: uploadStage === "uploading" ? `${uploadProgress}%` : "100%",
                      backgroundColor: "var(--accent-9)",
                      transition: "width 0.3s ease-out",
                      background: uploadStage !== "uploading"
                        ? "linear-gradient(90deg, var(--accent-8), var(--accent-9), var(--accent-8))"
                        : "var(--accent-9)",
                      backgroundSize: uploadStage !== "uploading" ? "200% 100%" : "100% 100%",
                      animation: uploadStage !== "uploading" ? "shimmer 1.5s ease-in-out infinite" : "none",
                    }}
                  />
                </Box>
                <Flex justify="between" mt="1">
                  <Text size="1" color="gray">
                    {getUploadStageLabel()}
                  </Text>
                  {uploadStage === "uploading" && getTimeRemaining() && (
                    <Text size="1" color="gray">
                      {getTimeRemaining()}
                    </Text>
                  )}
                </Flex>
              </Box>
            )}
          </Box>

          {/* Error Display */}
          {error && (
            <Text size="2" color="red">
              {error}
            </Text>
          )}

          {/* Submit Button */}
          <Flex justify="end" mt="2">
            <Button
              className={uploading ? buttonStyles.actionButtonLoading : buttonStyles.actionButton}
              onClick={handleSubmit}
              disabled={!isFormValid || uploading}
              size="3"
            >
              {uploading ? (
                <>
                  {uploadStage === "uploading" ? "Uploading" : "Processing"}
                  <span className={buttonStyles.loadingDots}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </>
              ) : (
                "Analyse"
              )}
            </Button>
          </Flex>
        </Flex>

        {/* Close Button */}
        {!uploading && (
          <Dialog.Close>
            <IconButton
              variant="ghost"
              color="gray"
              size="1"
              style={{
                position: "absolute",
                top: "var(--space-3)",
                right: "var(--space-3)",
              }}
              aria-label="Close"
            >
              <Cross2Icon />
            </IconButton>
          </Dialog.Close>
        )}

        {/* Shimmer animation for indeterminate progress */}
        <style jsx global>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </Dialog.Content>
    </Dialog.Root>
  );
}
