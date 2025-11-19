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
    <Toast.Provider swipeDirection="right" duration={5000}>
      <Toast.Root
        open={open}
        onOpenChange={handleOpenChange}
        style={{
          backgroundColor: "var(--red-3)",
          border: "1px solid var(--red-6)",
          borderRadius: "var(--radius-3)",
          padding: "var(--space-4)",
          boxShadow: "var(--shadow-4)",
        }}
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
              style={{ flexShrink: 0 }}
            >
              <Cross2Icon width="16" height="16" />
            </IconButton>
          </Toast.Close>
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
          maxWidth: "384px",
          padding: "var(--space-4)",
        }}
      />
    </Toast.Provider>
  );
}

