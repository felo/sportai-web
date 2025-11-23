"use client";

import React from "react";
import { Dialog, Flex, Text, Button, Heading } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import type { SwingExplanation } from "@/database";

interface SwingExplanationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swing: SwingExplanation | null;
}

export function SwingExplanationModal({ open, onOpenChange, swing }: SwingExplanationModalProps) {
  if (!swing) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content 
        style={{ maxWidth: 500 }}
        onOpenAutoFocus={(e) => {
          // Prevent default focus behavior that might cause scrolling
          e.preventDefault();
          // Manually focus the content without scrolling
          const target = e.currentTarget as HTMLElement;
          if (target && typeof target.focus === 'function') {
            target.focus({ preventScroll: true });
          }
        }}
      >
        <Flex direction="column" gap="4">
          <Flex justify="between" align="start">
            <Flex direction="column" gap="1">
              <Dialog.Title>
                <Heading size="5" style={{ margin: 0 }}>
                  {swing.name}
                </Heading>
              </Dialog.Title>
              <Text size="2" color="gray" style={{ fontStyle: "italic" }}>
                {swing.sport}
              </Text>
            </Flex>
            <Dialog.Close>
              <Button variant="ghost" color="gray" size="1" style={{ cursor: "pointer" }}>
                <Cross2Icon />
              </Button>
            </Dialog.Close>
          </Flex>

          <Flex direction="column" gap="3">
            <Text size="2" style={{ lineHeight: 1.6 }}>
              {swing.description}
            </Text>

            {swing.keyPoints.length > 0 && (
              <Flex direction="column" gap="2">
                <Text size="2" weight="bold" style={{ color: "var(--mint-9)" }}>
                  Key Points:
                </Text>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", listStyle: "disc" }}>
                  {swing.keyPoints.map((point, index) => (
                    <li key={index} style={{ marginBottom: "0.5rem" }}>
                      <Text size="2">{point}</Text>
                    </li>
                  ))}
                </ul>
              </Flex>
            )}
          </Flex>

          <Flex justify="end" pt="2">
            <Dialog.Close>
              <Button style={{ cursor: "pointer" }}>
                Got it
              </Button>
            </Dialog.Close>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

