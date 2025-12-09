"use client";

/**
 * Navigation warning dialog - shown when user tries to leave during active response
 */

import { AlertDialog, Button, Flex } from "@radix-ui/themes";

interface NavigationDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function NavigationDialog({ open, onConfirm, onCancel }: NavigationDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>Leave this page?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          A response is being generated. Are you sure you want to leave?
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray" onClick={onCancel}>
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button variant="solid" color="red" onClick={onConfirm}>
              Leave
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}


