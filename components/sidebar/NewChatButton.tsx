"use client";

import { Button, Text } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { track } from "@/lib/analytics";
import type { NewChatButtonProps } from "./types";

export function NewChatButton({ onClick }: NewChatButtonProps) {
  const handleClick = () => {
    track('chat_started', { messageType: 'user' });
    onClick();
  };

  return (
    <Button
      variant="ghost"
      size="2"
      onClick={handleClick}
      style={{
        justifyContent: "flex-start",
        padding: "var(--space-2) var(--space-3)",
      }}
    >
      <PlusIcon width="16" height="16" />
      <Text size="2" ml="2">
        New chat
      </Text>
    </Button>
  );
}













