"use client";

import { Box, Flex, Button, Dialog, TextField, AlertDialog, Text } from "@radix-ui/themes";
import { SupabaseDebug } from "@/components/auth/SupabaseDebug";
import { ContextDebugDialog, RedisDebugDialog } from "@/components/debug";
import buttonStyles from "@/styles/buttons.module.css";
import type { SidebarDialogsProps } from "./types";

export function SidebarDialogs({
  alertOpen,
  setAlertOpen,
  editDialogOpen,
  setEditDialogOpen,
  editingChat,
  setEditingChat,
  editTitle,
  setEditTitle,
  storageDebugOpen,
  setStorageDebugOpen,
  contextDebugOpen,
  setContextDebugOpen,
  redisDebugOpen,
  setRedisDebugOpen,
  developerMode,
  messageCount,
  onClearChat,
  onEditChatSave,
  closeSidebar,
}: SidebarDialogsProps) {
  const handleSaveEdit = async () => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle && trimmedTitle.length >= 3 && trimmedTitle.length <= 50 && editingChat) {
      await onEditChatSave(editingChat.id, trimmedTitle);
      setEditDialogOpen(false);
      setEditingChat(null);
      setEditTitle("");
    }
  };

  const trimmedTitle = editTitle.trim();
  const isValid = trimmedTitle.length >= 3 && trimmedTitle.length <= 50;

  return (
    <>
      {/* Alert Dialog for clearing chat */}
      {messageCount > 0 && onClearChat && (
        <AlertDialog.Root open={alertOpen} onOpenChange={setAlertOpen}>
          <AlertDialog.Content maxWidth="450px">
            <AlertDialog.Title>Clear chat history?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This will permanently delete all messages in this conversation. This action cannot be
              undone.
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
                    onClearChat();
                    setAlertOpen(false);
                    closeSidebar?.();
                  }}
                >
                  Clear
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      )}

      {/* Edit Chat Dialog */}
      <Dialog.Root open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <Dialog.Content maxWidth="450px">
          <Dialog.Title>Edit chat name</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Change the name of this chat.
          </Dialog.Description>

          <Flex direction="column" gap="3" mt="4">
            <TextField.Root
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Chat name"
              maxLength={50}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && isValid && editingChat) {
                  e.preventDefault();
                  await handleSaveEdit();
                }
              }}
            />
            <Text 
              size="1" 
              color={
                trimmedTitle.length > 50 
                  ? "red" 
                  : trimmedTitle.length > 0 && trimmedTitle.length < 3 
                  ? "red" 
                  : "gray"
              }
            >
              {editTitle.length}/50 characters
              {trimmedTitle.length > 0 && trimmedTitle.length < 3 && " (minimum 3 characters)"}
            </Text>

            <Flex gap="3" justify="end" mt="2">
              <Dialog.Close>
                <Button className={buttonStyles.actionButtonSquareSecondary}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                className={buttonStyles.actionButtonSquare}
                onClick={handleSaveEdit}
                disabled={!isValid}
              >
                Save
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Storage Debug Dialog */}
      {developerMode && (
        <Dialog.Root open={storageDebugOpen} onOpenChange={setStorageDebugOpen}>
          <Dialog.Content maxWidth="600px">
            <Dialog.Title>Storage Debug</Dialog.Title>
            <Dialog.Description size="2" mb="4">
              View and debug local storage and Supabase data.
            </Dialog.Description>
            <Box style={{ maxHeight: "500px", overflowY: "auto" }}>
              <SupabaseDebug />
            </Box>
            <Flex gap="3" justify="end" mt="4">
              <Dialog.Close>
                <Button className={buttonStyles.actionButtonSquareSecondary}>
                  Close
                </Button>
              </Dialog.Close>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      )}

      {/* Controlled Storage Debug Dialog (from SupabaseDebug component) */}
      <SupabaseDebug open={storageDebugOpen} onOpenChange={setStorageDebugOpen} />

      {/* Context Debug Dialog */}
      {developerMode && (
        <ContextDebugDialog open={contextDebugOpen} onOpenChange={setContextDebugOpen} />
      )}

      {/* Redis Debug Dialog */}
      {developerMode && (
        <RedisDebugDialog open={redisDebugOpen} onOpenChange={setRedisDebugOpen} />
      )}
    </>
  );
}

