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
    </Toast.Provider>
  );
}
