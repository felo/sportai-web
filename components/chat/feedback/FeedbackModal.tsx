"use client";

import { useState } from "react";
import { Dialog, Flex, Text, Button, Box, TextArea, Checkbox } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import styles from "@/styles/buttons.module.css";

// Preset reasons for positive feedback
const POSITIVE_REASONS = [
  { id: "accurate", label: "Accurate information" },
  { id: "helpful", label: "Helpful explanation" },
  { id: "detailed", label: "Good level of detail" },
  { id: "clear", label: "Clear and easy to understand" },
  { id: "actionable", label: "Actionable advice" },
];

// Preset reasons for negative feedback
const NEGATIVE_REASONS = [
  { id: "inaccurate", label: "Inaccurate or wrong information" },
  { id: "unclear", label: "Unclear or confusing" },
  { id: "incomplete", label: "Missing important information" },
  { id: "irrelevant", label: "Not relevant to my question" },
  { id: "too_long", label: "Too long or verbose" },
  { id: "too_short", label: "Too short or not enough detail" },
];

export interface FeedbackData {
  feedbackType: "up" | "down";
  reasons: string[];
  comment: string;
}

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedbackType: "up" | "down";
  onSubmit: (data: FeedbackData) => Promise<void>;
}

export function FeedbackModal({
  open,
  onOpenChange,
  feedbackType,
  onSubmit,
}: FeedbackModalProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = feedbackType === "up" ? POSITIVE_REASONS : NEGATIVE_REASONS;
  const isPositive = feedbackType === "up";

  const handleReasonToggle = (reasonId: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reasonId)
        ? prev.filter((id) => id !== reasonId)
        : [...prev, reasonId]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        feedbackType,
        reasons: selectedReasons,
        comment: comment.trim(),
      });
      // Reset form
      setSelectedReasons([]);
      setComment("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReasons([]);
    setComment("");
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        style={{ maxWidth: 440 }}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isSubmitting) {
            e.preventDefault();
            return;
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) {
            e.preventDefault();
            return;
          }
        }}
      >
        <Flex direction="column" gap="4">
          {/* Header */}
          <Flex justify="between" align="start">
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <Box
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: isPositive ? "var(--green-3)" : "var(--red-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isPositive ? (
                    <ThumbsUp size={16} style={{ color: "var(--green-11)" }} />
                  ) : (
                    <ThumbsDown size={16} style={{ color: "var(--red-11)" }} />
                  )}
                </Box>
                <Dialog.Title style={{ margin: 0 }}>
                  {isPositive ? "What did you like?" : "What went wrong?"}
                </Dialog.Title>
              </Flex>
              <Text size="2" color="gray">
                {isPositive
                  ? "Help us understand what made this response helpful."
                  : "Help us improve by sharing what wasn't right."}
              </Text>
            </Flex>
            <Dialog.Close>
              <Button
                variant="ghost"
                color="gray"
                size="1"
                style={{ cursor: "pointer" }}
                onClick={handleClose}
              >
                <Cross2Icon />
              </Button>
            </Dialog.Close>
          </Flex>

          {/* Preset Reasons */}
          <Box
            style={{
              padding: "12px 16px",
              backgroundColor: "var(--gray-2)",
              borderRadius: "8px",
              border: "1px solid var(--gray-4)",
            }}
          >
            <Flex direction="column" gap="3">
              <Text size="2" weight="medium">
                Select all that apply
              </Text>
              <Flex direction="column" gap="2">
                {reasons.map((reason) => (
                  <label
                    key={reason.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      padding: "4px 0",
                    }}
                  >
                    <Checkbox
                      checked={selectedReasons.includes(reason.id)}
                      onCheckedChange={() => handleReasonToggle(reason.id)}
                      style={{ cursor: "pointer" }}
                    />
                    <Text size="2">{reason.label}</Text>
                  </label>
                ))}
              </Flex>
            </Flex>
          </Box>

          {/* Comment Field */}
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">
              Additional comments (optional)
            </Text>
            <TextArea
              placeholder={
                isPositive
                  ? "Share any other thoughts about what was helpful..."
                  : "Please share more details about what could be improved..."
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ minHeight: 80 }}
            />
          </Flex>

          {/* Actions */}
          <Flex justify="end" gap="3" pt="2">
            <Button
              className={styles.actionButtonSquareSecondary}
              style={{ cursor: "pointer" }}
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className={styles.actionButtonSquare}
              style={{ cursor: "pointer" }}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

