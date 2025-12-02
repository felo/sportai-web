"use client";

import * as Toast from "@radix-ui/react-toast";
import { Box, Flex, Text } from "@radix-ui/themes";
import { CheckCircledIcon } from "@radix-ui/react-icons";

interface FeedbackToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackToast({ open, onOpenChange }: FeedbackToastProps) {
  return (
    <Toast.Provider swipeDirection="down" duration={3000}>
      <Toast.Root
        open={open}
        onOpenChange={onOpenChange}
        className="feedback-toast-root"
      >
        <Flex align="center" gap="2">
          <CheckCircledIcon 
            width="16" 
            height="16" 
            style={{ color: "var(--green-9)", flexShrink: 0 }} 
          />
          <Box style={{ flex: 1 }}>
            <Toast.Description asChild>
              <Text size="2" color="gray">
                Thank you for your feedback!
              </Text>
            </Toast.Description>
          </Box>
        </Flex>
      </Toast.Root>
      <Toast.Viewport className="feedback-toast-viewport" />
    </Toast.Provider>
  );
}
