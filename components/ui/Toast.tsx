"use client";

import * as Toast from "@radix-ui/react-toast";
import { Box, Flex, Text, IconButton } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";

interface ToastProps {
  error: string | null;
  onOpenChange?: (open: boolean) => void;
}

export function ErrorToast({ error, onOpenChange }: ToastProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (error) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [error]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    onOpenChange?.(isOpen);
  };

  if (!error) return null;

  return (
    <Toast.Provider swipeDirection="down" duration={6000}>
      <Toast.Root
        open={open}
        onOpenChange={handleOpenChange}
        className="error-toast-root"
      >
        <Flex align="start" gap="3">
          <Box style={{ flex: 1 }}>
            <Toast.Title asChild>
              <Text size="2" weight="medium" color="red" mb="1">
                Error
              </Text>
            </Toast.Title>
            <Toast.Description asChild>
              <Text size="2" color="red">
                {error}
              </Text>
            </Toast.Description>
          </Box>
          <Toast.Close asChild>
            <IconButton
              size="1"
              color="red"
              variant="ghost"
              style={{ flexShrink: 0, cursor: "pointer" }}
            >
              <Cross2Icon width="16" height="16" />
            </IconButton>
          </Toast.Close>
        </Flex>
      </Toast.Root>
      <Toast.Viewport className="error-toast-viewport" />
      <style jsx global>{`
        .error-toast-root {
          background-color: var(--red-2);
          border: 1px solid var(--red-6);
          border-radius: var(--radius-3);
          padding: var(--space-4);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          animation: errorSlideIn 0.2s ease-out;
        }

        .error-toast-root[data-state="closed"] {
          animation: errorSlideOut 0.2s ease-in;
        }

        .error-toast-viewport {
          position: fixed;
          top: 70px; /* Below navbar */
          right: var(--space-4);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          width: auto;
          max-width: 440px;
          padding: 0;
          margin: 0;
          list-style: none;
          outline: none;
        }

        /* Mobile: centered at top */
        @media (max-width: 640px) {
          .error-toast-viewport {
            top: 70px;
            right: 50%;
            transform: translateX(50%);
            max-width: calc(100vw - 32px);
          }

          .error-toast-root {
            animation: errorSlideInMobile 0.2s ease-out;
          }

          .error-toast-root[data-state="closed"] {
            animation: errorSlideOutMobile 0.2s ease-in;
          }
        }

        @keyframes errorSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes errorSlideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }

        @keyframes errorSlideInMobile {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes errorSlideOutMobile {
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
