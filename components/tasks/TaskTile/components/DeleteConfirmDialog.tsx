"use client";

import { AlertDialog, Flex, Button } from "@radix-ui/themes";
import buttonStyles from "@/styles/buttons.module.css";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

/**
 * Confirmation dialog for deleting a video task
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Content maxWidth="400px" onClick={(e) => e.stopPropagation()}>
        <AlertDialog.Title>Delete Video</AlertDialog.Title>
        <AlertDialog.Description size="2">
          Are you sure you want to delete this video analysis? This action cannot
          be undone.
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button className={buttonStyles.actionButtonSquareSecondary}>
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button
              className={buttonStyles.actionButtonSquareRed}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
