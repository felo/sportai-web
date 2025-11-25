"use client";

import * as Toast from "@radix-ui/react-toast";
import { Box, Flex, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";

interface FeedbackToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackToast({ open, onOpenChange }: FeedbackToastProps) {
  return (
    <Toast.Provider swipeDirection="right" duration={2000}>
      <Toast.Root
        open={open}
        onOpenChange={onOpenChange}
        style={{
          backgroundColor: "var(--gray-3)",
          border: "1px solid var(--gray-6)",
          borderRadius: "var(--radius-3)",
          padding: "var(--space-3)",
          boxShadow: "var(--shadow-3)",
        }}
      >
        <Flex align="center" gap="2">
          <Box style={{ flex: 1 }}>
            <Toast.Description asChild>
              <Text size="2" color="gray">
                Thank you for your feedback
              </Text>
            </Toast.Description>
          </Box>
        </Flex>
      </Toast.Root>
      <Toast.Viewport
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
          width: "100%",
          maxWidth: "320px",
          padding: "var(--space-4)",
        }}
      />
    </Toast.Provider>
  );
}





