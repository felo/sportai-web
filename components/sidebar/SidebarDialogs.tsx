"use client";

import { Box, Flex, Button, Dialog, TextField, AlertDialog } from "@radix-ui/themes";
import { SupabaseDebug } from "@/components/auth/SupabaseDebug";
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
  developerMode,
  messageCount,
  onClearChat,
  onEditChatSave,
  closeSidebar,
}: SidebarDialogsProps) {
  const handleSaveEdit = async () => {
    if (editTitle.trim() && editingChat) {
      await onEditChatSave(editingChat.id, editTitle.trim());
      setEditDialogOpen(false);
      setEditingChat(null);
      setEditTitle("");
    }
  };

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
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button
                  variant="solid"
                  color="red"
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
              onKeyDown={async (e) => {
                if (e.key === "Enter" && editTitle.trim() && editingChat) {
                  e.preventDefault();
                  await handleSaveEdit();
                }
              }}
            />

            <Flex gap="3" justify="end" mt="2">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                className={buttonStyles.actionButton}
                onClick={handleSaveEdit}
                disabled={!editTitle.trim()}
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
                <Button variant="soft" color="gray">
                  Close
                </Button>
              </Dialog.Close>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      )}

      {/* Controlled Storage Debug Dialog (from SupabaseDebug component) */}
      <SupabaseDebug open={storageDebugOpen} onOpenChange={setStorageDebugOpen} />
    </>
  );
}

