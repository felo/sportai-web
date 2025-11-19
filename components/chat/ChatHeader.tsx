"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";

interface ChatHeaderProps {
  onClear: () => void;
  messageCount: number;
}

export function ChatHeader({ onClear, messageCount }: ChatHeaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-20 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between shadow-sm">
      <h1 className="text-xl font-semibold">SportAI Web</h1>
      {messageCount > 0 && (
        <AlertDialog.Root>
          <Tooltip.Provider>
            <Tooltip.Root>
              <AlertDialog.Trigger asChild>
                <Tooltip.Trigger asChild>
                  <button
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Clear</span>
                  </button>
                </Tooltip.Trigger>
              </AlertDialog.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md px-2 py-1 z-50 shadow-lg"
                  sideOffset={5}
                >
                  Clear conversation
                  <Tooltip.Arrow className="fill-gray-900 dark:fill-gray-700" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>

          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-overlayShow" />
            <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 z-50 max-w-md w-full mx-4 data-[state=open]:animate-contentShow">
              <AlertDialog.Title className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                Clear conversation?
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                This will permanently delete all messages in this conversation. This action cannot be undone.
              </AlertDialog.Description>
              <div className="flex justify-end gap-3">
                <AlertDialog.Cancel asChild>
                  <button className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                    Cancel
                  </button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <button
                    onClick={onClear}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Clear
                  </button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      )}
    </div>
  );
}

