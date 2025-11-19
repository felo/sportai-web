"use client";

import { AlertDialog, Button, Flex, Heading, Text, Box } from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { URLs } from "@/lib/config";

interface ChatHeaderProps {
  onClear: () => void;
  messageCount: number;
}

export function ChatHeader({ onClear, messageCount }: ChatHeaderProps) {
  return (
    <Box
      className="fixed top-0 left-0 right-0 z-20"
      style={{
        borderBottom: "1px solid var(--gray-6)",
        backgroundColor: "var(--color-background)",
        backdropFilter: "blur(8px)",
        padding: "var(--space-3) var(--space-4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      }}
    >
      <Image
        src={URLs.logo}
        alt="SportAI Web"
        width={120}
        height={40}
        style={{ objectFit: "contain", height: "auto" }}
      />
      {messageCount > 0 && (
        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button variant="ghost" color="gray" size="2">
              <TrashIcon width="16" height="16" />
              Clear
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="450px">
            <AlertDialog.Title>Clear conversation?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This will permanently delete all messages in this conversation. This action cannot be undone.
            </AlertDialog.Description>
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button variant="solid" color="red" onClick={onClear}>
                  Clear
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      )}
    </Box>
  );
}

