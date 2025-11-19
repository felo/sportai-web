"use client";

import * as Toast from "@radix-ui/react-toast";
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
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 shadow-lg data-[state=open]:animate-slideIn data-[state=closed]:animate-hide"
        open={open}
        onOpenChange={handleOpenChange}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <Toast.Title className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
              Error
            </Toast.Title>
            <Toast.Description className="text-sm text-red-700 dark:text-red-300">
              {error}
            </Toast.Description>
          </div>
          <Toast.Close className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 flex-shrink-0">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Toast.Close>
        </div>
      </Toast.Root>
      <Toast.Viewport className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 w-full max-w-sm p-4" />
    </Toast.Provider>
  );
}

