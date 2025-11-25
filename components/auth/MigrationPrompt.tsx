"use client";

import { useState, useEffect } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
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
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
        <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <AlertDialog.Title className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
            {isSuccess ? "Migration Complete! 🎉" : "Sync Your Chats to Cloud"}
          </AlertDialog.Title>

          <AlertDialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {isSuccess ? (
              <span>
                Your chats have been successfully synced to the cloud. You can now access them
                from any device!
              </span>
            ) : (
              <span>
                We found chats saved on this device. Would you like to sync them to your account
                so you can access them from anywhere?
              </span>
            )}
          </AlertDialog.Description>

          {isMigrating && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">
                  Migrating {migrationStatus.migratedChats} of {migrationStatus.totalChats} chats
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {migrationStatus.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 ease-in-out"
                  style={{ width: `${migrationStatus.progress}%` }}
                />
              </div>
            </div>
          )}

          {isError && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                {migrationStatus.error || "Migration failed. Please try again."}
              </p>
            </div>
          )}

          {!isSuccess && !isMigrating && (
            <div className="flex gap-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  disabled={isMigrating}
                >
                  Skip for Now
                </button>
              </AlertDialog.Cancel>

              <AlertDialog.Action asChild>
                <button
                  onClick={handleMigrate}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isMigrating}
                >
                  {isMigrating ? "Migrating..." : "Sync to Cloud"}
                </button>
              </AlertDialog.Action>
            </div>
          )}

          {isSuccess && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setOpen(false);
                  window.location.reload();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          )}
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

