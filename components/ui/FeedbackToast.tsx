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
        className="toast-root"
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
      <Toast.Viewport className="toast-viewport" />
      <style jsx global>{`
        .toast-root {
          background-color: var(--gray-1);
          border: 1px solid var(--gray-6);
          border-radius: var(--radius-3);
          padding: var(--space-3) var(--space-4);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          animation: slideIn 0.2s ease-out;
        }

        .toast-root[data-state="closed"] {
          animation: slideOut 0.2s ease-in;
        }

        .toast-viewport {
          position: fixed;
          top: 70px; /* Below navbar */
          right: var(--space-4);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          width: auto;
          max-width: 320px;
          padding: 0;
          margin: 0;
          list-style: none;
          outline: none;
        }

        /* Mobile: centered at top */
        @media (max-width: 640px) {
          .toast-viewport {
            top: 70px;
            right: 50%;
            transform: translateX(50%);
            max-width: calc(100vw - 32px);
          }

          .toast-root {
            animation: slideInMobile 0.2s ease-out;
          }

          .toast-root[data-state="closed"] {
            animation: slideOutMobile 0.2s ease-in;
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }

        @keyframes slideInMobile {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideOutMobile {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-100%);
          }
        }
      `}</style>
    </Toast.Provider>
  );
}
