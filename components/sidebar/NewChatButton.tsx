"use client";

import { Button, Text } from "@radix-ui/themes";
import { Pencil2Icon } from "@radix-ui/react-icons";
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
      <Pencil2Icon width="19" height="19" />
      <Text size="2" ml="2">
        New chat
      </Text>
    </Button>
  );
}
