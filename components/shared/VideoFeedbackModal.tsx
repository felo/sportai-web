"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  Flex,
  Text,
  Button,
  Box,
  IconButton,
  Badge,
} from "@radix-ui/themes";
import { Cross2Icon, UploadIcon, VideoIcon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";
import { validateVideoFile } from "@/utils/video-utils";

export interface VideoFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user submits - provides the video file to send to chat */
  onSubmit: (videoFile: File) => void;
}

/**
 * VideoFeedbackModal - A modal for capturing or uploading a video for AI feedback.
 *
 * Features:
 * - Simple video capture/upload
 * - Sends video to chat with default prompt
 */
export function VideoFeedbackModal({
  open,
  onOpenChange,
  onSubmit,
}: VideoFeedbackModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setSelectedFile(null);
        setError(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

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

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!selectedFile) return;
    onSubmit(selectedFile);
    onOpenChange(false);
  }, [selectedFile, onSubmit, onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>Get video feedback</Dialog.Title>

        <Flex direction="column" gap="4" mt="4">
          {/* Description */}
          <Text size="2" color="gray">
            Capture or upload a short snippet of someone doing an athletic activity.
          </Text>

          {/* Recording Tips */}
          <ul style={{ margin: 0, paddingLeft: "var(--space-5)", listStyleType: "disc" }}>
            <Text asChild size="2" color="gray">
              <li style={{ marginBottom: "var(--space-1)" }}>Ensure the recording has a clear view of the athlete</li>
            </Text>
            <Text asChild size="2" color="gray">
              <li>For technique, shorter snippets will make it easier for the AI to give valuable feedback</li>
            </Text>
          </ul>

          {/* Video Input Section */}
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              onChange={handleFileSelect}
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
                >
                  <Cross2Icon />
                </IconButton>
              </Flex>
            ) : (
              <Button
                className={buttonStyles.actionButton}
                onClick={() => fileInputRef.current?.click()}
                size="2"
              >
                <VideoIcon width={16} height={16} />
                Capture or upload video
              </Button>
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
              className={buttonStyles.actionButton}
              onClick={handleSubmit}
              disabled={!selectedFile}
              size="3"
            >
              Analyse
            </Button>
          </Flex>
        </Flex>

        {/* Close Button */}
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
      </Dialog.Content>
    </Dialog.Root>
  );
}
