"use client";

/**
 * CustomEventDialog
 *
 * A dialog for creating or editing custom timeline events.
 * Users can specify a name and color for their custom event marker.
 */

import { useState, useEffect } from "react";
import { Dialog, Flex, Text, TextField, Button, Box } from "@radix-ui/themes";
import buttonStyles from "@/styles/buttons.module.css";

// Predefined color palette for custom events
export const EVENT_COLORS = [
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

export interface CustomEvent {
  /** Unique ID for the event */
  id: string;
  /** User-defined name for the event */
  name: string;
  /** Color for the event marker */
  color: string;
  /** Time in seconds where the event was placed */
  time: number;
  /** Frame number where the event was placed */
  frame: number;
  /** Timestamp when the event was created */
  createdAt: number;
}

/** Data for editing an existing event/moment */
export interface EditingMoment {
  id: string;
  type: "custom" | "comment" | "protocol";
  label: string;
  color: string;
  time: number;
  frame: number;
}

interface CustomEventDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Time position where the event will be created (seconds) - used in create mode */
  eventTime: number;
  /** Frame number where the event will be created - used in create mode */
  eventFrame: number;
  /** Callback when event is created (create mode) */
  onCreateEvent: (event: Omit<CustomEvent, "id" | "createdAt">) => void;
  /** Optional: Event being edited (switches to edit mode when provided) */
  editingMoment?: EditingMoment | null;
  /** Callback when event is updated (edit mode) */
  onUpdateEvent?: (id: string, updates: { name: string; color: string }) => void;
}

export function CustomEventDialog({
  open,
  onOpenChange,
  eventTime,
  eventFrame,
  onCreateEvent,
  editingMoment,
  onUpdateEvent,
}: CustomEventDialogProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(EVENT_COLORS[10].value); // Default to blue

  const isEditMode = !!editingMoment;

  // Reset/populate form when dialog opens
  useEffect(() => {
    if (open) {
      if (editingMoment) {
        // Edit mode: populate with existing values
        setName(editingMoment.label);
        setSelectedColor(editingMoment.color);
      } else {
        // Create mode: reset to defaults
        setName("");
        setSelectedColor(EVENT_COLORS[10].value);
      }
    }
  }, [open, editingMoment]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    if (isEditMode && editingMoment && onUpdateEvent) {
      // Edit mode
      onUpdateEvent(editingMoment.id, {
        name: name.trim(),
        color: selectedColor,
      });
    } else {
      // Create mode
      onCreateEvent({
        name: name.trim(),
        color: selectedColor,
        time: eventTime,
        frame: eventFrame,
      });
    }

    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim()) {
      handleSubmit();
    }
  };

  // Get display time/frame (from editing moment in edit mode, or props in create mode)
  const displayTime = isEditMode && editingMoment ? editingMoment.time : eventTime;
  const displayFrame = isEditMode && editingMoment ? editingMoment.frame : eventFrame;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="400px">
        <Dialog.Title>{isEditMode ? "Edit Marker" : "Add Custom Marker"}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          {isEditMode 
            ? `Editing marker at ${displayTime.toFixed(2)}s (frame ${displayFrame})`
            : `Create a marker at ${displayTime.toFixed(2)}s (frame ${displayFrame})`
          }
        </Dialog.Description>

        <Flex direction="column" gap="4">
          {/* Name input */}
          <Box>
            <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
              Name
            </Text>
            <TextField.Root
              placeholder="e.g., Good footwork, Check balance..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </Box>

          {/* Color selection */}
          <Box>
            <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
              Color
            </Text>
            <Flex wrap="wrap" gap="2">
              {EVENT_COLORS.map((color) => (
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
                }}
              />
              <Text size="2" weight="medium" style={{ color: "var(--gray-12)" }}>
                {name || "Event name"}
              </Text>
            </Flex>
          </Box>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button className={buttonStyles.actionButtonSquareSecondary}>Cancel</Button>
          </Dialog.Close>
          <Button
            className={buttonStyles.actionButtonSquare}
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {isEditMode ? "Save Changes" : "Create Marker"}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default CustomEventDialog;
