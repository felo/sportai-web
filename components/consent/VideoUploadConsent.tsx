"use client";

import { useState, useCallback, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Box, Flex, Text, Button, Heading } from "@radix-ui/themes";
import { Cross2Icon, CheckIcon, VideoIcon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";

const UPLOAD_CONSENT_KEY = "sportai-upload-consent";
const CONSENT_VERSION = "1";

interface UploadConsentRecord {
  accepted: boolean;
  version: string;
  timestamp: string;
}

interface VideoUploadConsentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  onDecline?: () => void;
}

/**
 * Modal that appears before video upload to get user consent.
 * This establishes legal rights to process uploaded video content.
 */
export function VideoUploadConsentModal({
  open,
  onOpenChange,
  onAccept,
  onDecline,
}: VideoUploadConsentProps) {
  const [termsChecked, setTermsChecked] = useState(false);
  const [rightsChecked, setRightsChecked] = useState(false);

  const canAccept = termsChecked && rightsChecked;

  const handleAccept = () => {
    if (!canAccept) return;
    
    // Store consent
    try {
      const record: UploadConsentRecord = {
        accepted: true,
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(UPLOAD_CONSENT_KEY, JSON.stringify(record));
    } catch {
      // Continue even if storage fails
    }
    
    onAccept();
    onOpenChange(false);
  };

  const handleDecline = () => {
    onDecline?.();
    onOpenChange(false);
  };

  // Reset checkboxes when modal opens
  useEffect(() => {
    if (open) {
      setTermsChecked(false);
      setRightsChecked(false);
    }
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 9998,
            animation: "overlayShow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90vw",
            maxWidth: "500px",
            maxHeight: "85vh",
            padding: "24px",
            backgroundColor: "var(--gray-1)",
            borderRadius: "12px",
            border: "1px solid var(--gray-6)",
            boxShadow: "0 10px 50px rgba(0, 0, 0, 0.4)",
            zIndex: 9999,
            overflow: "auto",
            animation: "contentShow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <Flex direction="column" gap="4">
            {/* Header */}
            <Flex justify="between" align="start">
              <Flex align="center" gap="2">
                <Box
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "var(--mint-a3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <VideoIcon width={20} height={20} style={{ color: "var(--mint-11)" }} />
                </Box>
                <Heading size="5" weight="medium">
                  Video Upload Terms
                </Heading>
              </Flex>
              
              <Dialog.Close asChild>
                <Button variant="ghost" size="1" style={{ padding: "4px" }}>
                  <Cross2Icon width={16} height={16} />
                </Button>
              </Dialog.Close>
            </Flex>

            {/* Content */}
            <Text as="p" size="2" color="gray">
              Before uploading your video for analysis, please review and accept the following terms:
            </Text>

            <Box
              style={{
                padding: "16px",
                background: "var(--gray-2)",
                borderRadius: "8px",
                border: "1px solid var(--gray-4)",
              }}
            >
              <Flex direction="column" gap="3">
                {/* Terms checkbox */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    cursor: "pointer",
                  }}
                >
                  <Box
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "4px",
                      border: `2px solid ${termsChecked ? "var(--mint-9)" : "var(--gray-7)"}`,
                      background: termsChecked ? "var(--mint-9)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "2px",
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => setTermsChecked(!termsChecked)}
                  >
                    {termsChecked && (
                      <CheckIcon
                        width={14}
                        height={14}
                        style={{ color: "var(--gray-1)" }}
                      />
                    )}
                  </Box>
                  <input
                    type="checkbox"
                    checked={termsChecked}
                    onChange={(e) => setTermsChecked(e.target.checked)}
                    style={{ display: "none" }}
                  />
                  <Text size="2">
                    I agree to the{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--mint-11)",
                        textDecoration: "underline",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--mint-11)",
                        textDecoration: "underline",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Privacy Policy
                    </a>
                    , including the processing of my video data for AI analysis.
                  </Text>
                </label>

                {/* Rights checkbox */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    cursor: "pointer",
                  }}
                >
                  <Box
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "4px",
                      border: `2px solid ${rightsChecked ? "var(--mint-9)" : "var(--gray-7)"}`,
                      background: rightsChecked ? "var(--mint-9)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "2px",
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => setRightsChecked(!rightsChecked)}
                  >
                    {rightsChecked && (
                      <CheckIcon
                        width={14}
                        height={14}
                        style={{ color: "var(--gray-1)" }}
                      />
                    )}
                  </Box>
                  <input
                    type="checkbox"
                    checked={rightsChecked}
                    onChange={(e) => setRightsChecked(e.target.checked)}
                    style={{ display: "none" }}
                  />
                  <Text size="2">
                    I confirm that I have the right to upload this video and that it does not contain unauthorized recordings of third parties. I grant SportAI permission to process, analyze, and store this content.
                  </Text>
                </label>
              </Flex>
            </Box>

            {/* Data usage info */}
            <Box
              style={{
                padding: "12px",
                background: "var(--mint-a2)",
                borderRadius: "6px",
                border: "1px solid var(--mint-a4)",
              }}
            >
              <Text size="1" style={{ color: "var(--mint-11)" }}>
                <strong>How we use your video:</strong> Your video is processed by our AI to provide technique analysis and coaching insights. Videos are stored securely and can be deleted at any time from your library. We do not share your videos with third parties.
              </Text>
            </Box>

            {/* Actions */}
            <Flex gap="2" justify="end" style={{ marginTop: "8px" }}>
              <Button 
                size="2" 
                onClick={handleDecline}
                className={buttonStyles.actionButtonSquareSecondary}
              >
                Cancel
              </Button>
              <Button
                size="2"
                disabled={!canAccept}
                onClick={handleAccept}
                className={canAccept ? buttonStyles.actionButtonSquare : undefined}
                style={!canAccept ? {
                  opacity: 0.5,
                  cursor: "not-allowed",
                  backgroundColor: "var(--gray-4)",
                  color: "var(--gray-9)",
                  borderRadius: "var(--radius-3)",
                } : undefined}
              >
                Accept & Upload
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Hook to manage video upload consent state.
 * Returns functions to check/request consent before allowing uploads.
 */
export function useVideoUploadConsent() {
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  /**
   * Check if user has previously consented to upload terms.
   * Returns true if consent exists and is valid.
   */
  const hasUploadConsent = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem(UPLOAD_CONSENT_KEY);
      if (!stored) return false;
      
      const record: UploadConsentRecord = JSON.parse(stored);
      return record.accepted && record.version === CONSENT_VERSION;
    } catch {
      return false;
    }
  }, []);

  /**
   * Request consent before proceeding with upload.
   * If already consented, calls the callback immediately.
   * Otherwise, shows the consent modal.
   * 
   * @param onConsent - Callback to execute after consent is given
   */
  const requestConsent = useCallback((onConsent: () => void) => {
    if (hasUploadConsent()) {
      onConsent();
    } else {
      setPendingCallback(() => onConsent);
      setShowConsentModal(true);
    }
  }, [hasUploadConsent]);

  const handleAccept = useCallback(() => {
    pendingCallback?.();
    setPendingCallback(null);
  }, [pendingCallback]);

  const handleDecline = useCallback(() => {
    setPendingCallback(null);
  }, []);

  /**
   * Clear stored consent (for testing or user request).
   */
  const clearConsent = useCallback(() => {
    try {
      localStorage.removeItem(UPLOAD_CONSENT_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return {
    showConsentModal,
    setShowConsentModal,
    hasUploadConsent,
    requestConsent,
    handleAccept,
    handleDecline,
    clearConsent,
  };
}

