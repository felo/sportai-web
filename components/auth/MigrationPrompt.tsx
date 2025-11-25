"use client";

import { useState, useEffect } from "react";
import { AlertDialog, Flex, Text, Button, Box, Progress, Callout, IconButton } from "@radix-ui/themes";
import { Cross2Icon, ExclamationTriangleIcon, CheckCircledIcon, UploadIcon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";
import { useAuth } from "./AuthProvider";
import {
  hasLocalChatsToMigrate,
  syncLocalToSupabase,
  isMigrationCompleted,
  setMigrationCompleted,
  isMigrationPromptDismissed,
  setMigrationPromptDismissed,
  type MigrationStatus,
} from "@/utils/migration";

export function MigrationPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    status: "idle",
    progress: 0,
    totalChats: 0,
    migratedChats: 0,
  });

  useEffect(() => {
    // Check if we should show the migration prompt
    if (
      user &&
      hasLocalChatsToMigrate() &&
      !isMigrationCompleted() &&
      !isMigrationPromptDismissed()
    ) {
      setOpen(true);
    }
  }, [user]);

  const handleMigrate = async () => {
    if (!user) return;

    const status = await syncLocalToSupabase(user.id, (status) => {
      setMigrationStatus(status);
    });

    if (status.status === "success") {
      setMigrationCompleted(true);
      setTimeout(() => {
        setOpen(false);
        // Refresh the page to load Supabase chats
        window.location.reload();
      }, 2000);
    }
  };

  const handleSkip = () => {
    setMigrationPromptDismissed(true);
    setOpen(false);
  };

  const isMigrating = migrationStatus.status === "migrating";
  const isSuccess = migrationStatus.status === "success";
  const isError = migrationStatus.status === "error";

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>
          {isSuccess ? "Migration Complete! 🎉" : "Sync Your Chats to Cloud"}
        </AlertDialog.Title>
        
        <AlertDialog.Description size="2" mb="4">
          {isSuccess ? (
            <>
              Your chats have been successfully synced to the cloud. You can now access them
              from any device!
            </>
          ) : (
            <>
              We found chats saved on this device. Would you like to sync them to your account
              so you can access them from anywhere?
            </>
          )}
        </AlertDialog.Description>

        {isMigrating && (
          <Box mb="4">
            <Flex justify="between" mb="2">
              <Text size="2" color="gray">
                Migrating {migrationStatus.migratedChats} of {migrationStatus.totalChats} chats
              </Text>
              <Text size="2" color="gray">
                {migrationStatus.progress}%
              </Text>
            </Flex>
            <Progress value={migrationStatus.progress} size="2" />
          </Box>
        )}

        {isError && (
          <Callout.Root color="red" mb="4">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              {migrationStatus.error || "Migration failed. Please try again."}
            </Callout.Text>
          </Callout.Root>
        )}

        {isSuccess && (
          <Callout.Root color="green" mb="4">
            <Callout.Icon>
              <CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              All your chats are now safely stored in the cloud!
            </Callout.Text>
          </Callout.Root>
        )}

        <Flex gap="3" justify="end">
          {!isSuccess && !isMigrating && (
            <>
              <AlertDialog.Cancel>
                <Button className={buttonStyles.actionButtonSquareSecondary} onClick={handleSkip}>
                  Skip for Now
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button className={buttonStyles.actionButtonSquare} onClick={handleMigrate}>
                  <UploadIcon />
                  Sync to Cloud
                </Button>
              </AlertDialog.Action>
            </>
          )}

          {isSuccess && (
            <Button
              className={buttonStyles.actionButtonSquare}
              onClick={() => {
                setOpen(false);
                window.location.reload();
              }}
            >
              Continue
            </Button>
          )}
        </Flex>

        {!isMigrating && (
          <IconButton
            variant="ghost"
            color="gray"
            size="1"
            style={{
              position: "absolute",
              top: "var(--space-3)",
              right: "var(--space-3)",
            }}
            aria-label="Close"
            onClick={handleSkip}
          >
            <Cross2Icon />
          </IconButton>
        )}
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
