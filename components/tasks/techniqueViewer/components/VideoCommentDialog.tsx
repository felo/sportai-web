"use client";

/**
 * VideoCommentDialog
 *
 * A dialog for creating video comments tied to a specific pixel position and timestamp.
 * Users can specify a title, description, and color for their comment marker.
 */

import { useState, useEffect } from "react";
import { Dialog, Flex, Text, TextField, Button, Box, TextArea } from "@radix-ui/themes";
import buttonStyles from "@/styles/buttons.module.css";

// Predefined color palette for comments
const COMMENT_COLORS = [
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Lime", value: "#84CC16" },
  { name: "Green", value: "#22C55E" },
  { name: "Emerald", value: "#10B981" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Sky", value: "#0EA5E9" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Purple", value: "#A855F7" },
  { name: "Fuchsia", value: "#D946EF" },
  { name: "Pink", value: "#EC4899" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Slate", value: "#64748B" },
];

export interface VideoComment {
  /** Unique ID for the comment */
  id: string;
  /** Short title for the comment */
  title: string;
  /** Full description (supports multi-line) */
  description: string;
  /** Color for the comment marker */
  color: string;
  /** X position as percentage (0-1) of video width */
  x: number;
  /** Y position as percentage (0-1) of video height */
  y: number;
  /** Time in seconds where the comment was placed */
  time: number;
  /** Frame number where the comment was placed */
  frame: number;
  /** Timestamp when the comment was created */
  createdAt: number;
}

interface VideoCommentDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** X position (percentage 0-1) where the comment will be placed */
  x: number;
  /** Y position (percentage 0-1) where the comment will be placed */
  y: number;
  /** Time position where the comment will be created (seconds) */
  time: number;
  /** Frame number where the comment will be created */
  frame: number;
  /** Callback when comment is created */
  onCreateComment: (comment: Omit<VideoComment, "id" | "createdAt">) => void;
}

export function VideoCommentDialog({
  open,
  onOpenChange,
  x,
  y,
  time,
  frame,
  onCreateComment,
}: VideoCommentDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COMMENT_COLORS[10].value); // Default to blue

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setSelectedColor(COMMENT_COLORS[10].value);
    }
  }, [open]);

  const handleCreate = () => {
    if (!title.trim()) return;

    onCreateComment({
      title: title.trim(),
      description: description.trim(),
      color: selectedColor,
      x,
      y,
      time,
      frame,
    });

    onOpenChange(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && title.trim()) {
      // Focus the description field instead of submitting
      const descEl = document.getElementById("comment-description");
      if (descEl) descEl.focus();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>Add Video Comment</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Add a comment at {time.toFixed(2)}s (frame {frame})
        </Dialog.Description>

        <Flex direction="column" gap="4">
          {/* Title input */}
          <Box>
            <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
              Title
            </Text>
            <TextField.Root
              placeholder="e.g., Arm position, Follow through..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              autoFocus
            />
          </Box>

          {/* Description textarea */}
          <Box>
            <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
              Description <Text color="gray" size="1">(optional)</Text>
            </Text>
            <TextArea
              id="comment-description"
              placeholder="Add detailed notes about this moment...&#10;&#10;Press Enter to add new lines."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                minHeight: "120px",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </Box>

          {/* Color selection */}
          <Box>
            <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
              Marker Color
            </Text>
            <Flex wrap="wrap" gap="2">
              {COMMENT_COLORS.map((color) => (
                <Box
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    backgroundColor: color.value,
                    cursor: "pointer",
                    border:
                      selectedColor === color.value
                        ? "3px solid white"
                        : "2px solid transparent",
                    boxShadow:
                      selectedColor === color.value
                        ? `0 0 0 2px ${color.value}, 0 2px 8px ${color.value}66`
                        : "none",
                    transition: "all 0.15s ease",
                    transform: selectedColor === color.value ? "scale(1.1)" : "scale(1)",
                  }}
                  title={color.name}
                />
              ))}
            </Flex>
          </Box>

          {/* Preview */}
          <Box
            style={{
              padding: "12px",
              backgroundColor: "var(--gray-3)",
              borderRadius: "8px",
              borderLeft: `4px solid ${selectedColor}`,
            }}
          >
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <Box
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    backgroundColor: selectedColor,
                    boxShadow: `0 0 8px ${selectedColor}66`,
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "white",
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                >
                  💬
                </Box>
                <Text size="2" weight="medium" style={{ color: "var(--gray-12)" }}>
                  {title || "Comment title"}
                </Text>
              </Flex>
              {description && (
                <Text
                  size="1"
                  style={{
                    color: "var(--gray-11)",
                    whiteSpace: "pre-wrap",
                    marginLeft: "30px",
                  }}
                >
                  {description.length > 100 ? description.slice(0, 100) + "..." : description}
                </Text>
              )}
            </Flex>
          </Box>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button className={buttonStyles.actionButtonSquareSecondary}>Cancel</Button>
          </Dialog.Close>
          <Button
            className={buttonStyles.actionButtonSquare}
            onClick={handleCreate}
            disabled={!title.trim()}
          >
            Add Comment
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default VideoCommentDialog;
