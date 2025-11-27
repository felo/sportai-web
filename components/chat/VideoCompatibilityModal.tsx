"use client";

import React, { useState, useEffect } from "react";
import { getDeveloperMode } from "@/utils/storage";
import { Dialog, Flex, Text, Button, Box, Progress, Callout } from "@radix-ui/themes";
import { Cross2Icon, ExclamationTriangleIcon, CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import type { VideoCompatibilityResult } from "@/utils/video-utils";
import { transcodeToH264, estimateTranscodeTime, canEncodeH264, type TranscodeProgress } from "@/utils/video-transcoder";
import styles from "@/styles/buttons.module.css";

interface VideoCompatibilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  compatibilityResult: VideoCompatibilityResult | null;
  onConvertComplete: (convertedFile: File) => void;
  onCancel: () => void;
}

export function VideoCompatibilityModal({
  open,
  onOpenChange,
  file,
  compatibilityResult,
  onConvertComplete,
  onCancel,
}: VideoCompatibilityModalProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<TranscodeProgress | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [canEncode, setCanEncode] = useState<boolean | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [developerMode, setDeveloperMode] = useState(false);

  // Load developer mode on mount and listen for changes
  useEffect(() => {
    setDeveloperMode(getDeveloperMode());
    
    const handleDeveloperModeChange = () => {
      setDeveloperMode(getDeveloperMode());
    };
    
    window.addEventListener("storage", handleDeveloperModeChange);
    window.addEventListener("developer-mode-change", handleDeveloperModeChange);
    
    return () => {
      window.removeEventListener("storage", handleDeveloperModeChange);
      window.removeEventListener("developer-mode-change", handleDeveloperModeChange);
    };
  }, []);

  // Check encoding capability on mount
  useEffect(() => {
    if (open) {
      canEncodeH264().then(setCanEncode);
    }
  }, [open]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setIsConverting(false);
      setConversionProgress(null);
      setConversionError(null);
    }
  }, [open]);

  if (!file || !compatibilityResult) return null;

  const handleConvert = async () => {
    if (!file) return;

    setIsConverting(true);
    setConversionError(null);
    
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const result = await transcodeToH264(
        file,
        (progress) => setConversionProgress(progress),
        controller.signal
      );

      if (result.success && result.file) {
        onConvertComplete(result.file);
        onOpenChange(false);
      } else {
        setConversionError(result.error || "Conversion failed");
        setIsConverting(false);
      }
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : "Unknown error");
      setIsConverting(false);
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
    }
    setIsConverting(false);
    onCancel();
    onOpenChange(false);
  };

  const estimatedTime = compatibilityResult.duration 
    ? estimateTranscodeTime(compatibilityResult.duration)
    : "a few minutes";

  const hasErrors = compatibilityResult.issues.some(i => i.severity === 'error');
  const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.includes('Firefox');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content 
        style={{ maxWidth: 480 }}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const target = e.currentTarget as HTMLElement;
          if (target && typeof target.focus === 'function') {
            target.focus({ preventScroll: true });
          }
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isConverting) {
            e.preventDefault();
            return;
          }
          e.preventDefault();
          handleCancel();
        }}
        onEscapeKeyDown={(e) => {
          if (isConverting) {
            e.preventDefault();
            return;
          }
          e.preventDefault();
          handleCancel();
        }}
      >
        <Flex direction="column" gap="4">
          {/* Header */}
          <Flex justify="between" align="start">
            <Flex direction="column" gap="1">
              <Dialog.Title style={{ margin: 0 }}>
                {isConverting ? "Preparing video for analysis..." : "Video Compatibility Issue"}
              </Dialog.Title>
              {!isConverting && (
                <Text size="2" color="gray">
                  {file.name}
                </Text>
              )}
            </Flex>
            {!isConverting && (
              <Dialog.Close>
                <Button 
                  variant="ghost" 
                  color="gray" 
                  size="1" 
                  style={{ cursor: "pointer" }}
                  onClick={handleCancel}
                >
                  <Cross2Icon />
                </Button>
              </Dialog.Close>
            )}
          </Flex>

          {/* Content */}
          {isConverting ? (
            <Flex direction="column" gap="4">
              <Box>
                <Progress 
                  value={conversionProgress?.percent || 0} 
                  size="3"
                  style={{ height: 8 }}
                />
              </Box>
              <Text size="2" color="gray" align="center">
                {conversionProgress?.message || "Initializing..."}
              </Text>
              {developerMode && conversionProgress?.currentFrame && conversionProgress?.totalFrames && (
                <Text size="1" color="gray" align="center">
                  Frame {conversionProgress.currentFrame} of {conversionProgress.totalFrames}
                </Text>
              )}
              <Flex justify="center" pt="2">
                <Button 
                  className={styles.actionButtonSquareSecondary}
                  style={{ cursor: "pointer" }}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </Flex>
            </Flex>
          ) : (
            <Flex direction="column" gap="3">
              {/* Detected Issues */}
              <Box
                style={{
                  padding: "12px 16px",
                  backgroundColor: "var(--red-2)",
                  borderRadius: "8px",
                  border: "1px solid var(--red-6)",
                }}
              >
                <Flex direction="column" gap="2">
                  <Flex align="center" gap="2">
                    <ExclamationTriangleIcon color="var(--red-9)" />
                    <Text size="2" weight="bold" style={{ color: "var(--red-11)" }}>
                      Detected Issues
                    </Text>
                  </Flex>
                  {compatibilityResult.issues.map((issue, index) => (
                    <Flex key={index} align="start" gap="2" pl="5">
                      {issue.severity === 'error' ? (
                        <CrossCircledIcon color="var(--red-9)" style={{ flexShrink: 0, marginTop: 2 }} />
                      ) : (
                        <ExclamationTriangleIcon color="var(--amber-9)" style={{ flexShrink: 0, marginTop: 2 }} />
                      )}
                      <Text size="2" style={{ color: issue.severity === 'error' ? "var(--red-11)" : "var(--amber-11)" }}>
                        {issue.description}
                      </Text>
                    </Flex>
                  ))}
                </Flex>
              </Box>

              {/* Video Info */}
              {(compatibilityResult.width || compatibilityResult.duration) && (
                <Flex gap="4" wrap="wrap">
                  {compatibilityResult.width && compatibilityResult.height && (
                    <Text size="1" color="gray">
                      Resolution: {compatibilityResult.width}×{compatibilityResult.height}
                    </Text>
                  )}
                  {compatibilityResult.duration && (
                    <Text size="1" color="gray">
                      Duration: {compatibilityResult.duration.toFixed(1)}s
                    </Text>
                  )}
                  <Text size="1" color="gray">
                    Size: {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </Text>
                </Flex>
              )}

              {/* Conversion Option */}
              {canEncode && compatibilityResult.canTranscode ? (
                <Box
                  style={{
                    padding: "12px 16px",
                    backgroundColor: "var(--green-2)",
                    borderRadius: "8px",
                    border: "1px solid var(--green-6)",
                  }}
                >
                  <Flex direction="column" gap="2">
                    <Flex align="center" gap="2">
                      <CheckCircledIcon color="var(--green-9)" />
                      <Text size="2" weight="bold" style={{ color: "var(--green-11)" }}>
                        Automatic Conversion Available
                      </Text>
                    </Flex>
                    <Text size="2" style={{ color: "var(--green-11)" }}>
                      We can convert this video to a compatible format (H.264) directly in your browser.
                      Estimated time: {estimatedTime}.
                    </Text>
                  </Flex>
                </Box>
              ) : (
                <Callout.Root color="amber">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    {isFirefox ? (
                      <>
                        Firefox does not support video conversion. Please use <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Safari</strong> to convert this video, or upload a compatible video (H.264/MP4).
                      </>
                    ) : (
                      <>
                        Your browser doesn&apos;t support video conversion. Please upload a compatible video (H.264/MP4) or try using Chrome/Edge/Safari.
                      </>
                    )}
                  </Callout.Text>
                </Callout.Root>
              )}

              {/* Error display */}
              {conversionError && (
                <Callout.Root color="red">
                  <Callout.Icon>
                    <CrossCircledIcon />
                  </Callout.Icon>
                  <Callout.Text>{conversionError}</Callout.Text>
                </Callout.Root>
              )}

              {/* Tips */}
              <Box
                style={{
                  padding: "12px 16px",
                  backgroundColor: "var(--gray-2)",
                  borderRadius: "8px",
                  border: "1px solid var(--gray-4)",
                }}
              >
                <Text size="1" color="gray" weight="bold" style={{ display: "block", marginBottom: 8 }}>
                  Tip: Prevent this in the future
                </Text>
                <Text size="1" color="gray">
                  On your iPhone, go to <strong>Settings → Camera → Formats</strong> and select <strong>&quot;Most Compatible&quot;</strong> to record in H.264 format.
                </Text>
              </Box>

              {/* Actions */}
              <Flex justify="end" gap="3" pt="2">
                <Button 
                  className={styles.actionButtonSquareSecondary}
                  style={{ cursor: "pointer" }}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                {canEncode && compatibilityResult.canTranscode && (
                  <Button 
                    className={styles.actionButtonSquare}
                    style={{ cursor: "pointer" }}
                    onClick={handleConvert}
                  >
                    Convert Video
                  </Button>
                )}
              </Flex>
            </Flex>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}


