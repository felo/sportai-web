"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Flex } from "@radix-ui/themes";
import { NewChatButton } from "./NewChatButton";
import { ChatList } from "./ChatList";
import type { Chat } from "@/types/chat";

const CHATS_EXPANDED_KEY = "sportai-sidebar-chats-expanded";

interface SidebarContentProps {
  chats: Chat[];
  currentChatId?: string;
  hoveredChatId: string | null;
  isMobile: boolean;
  isLoading?: boolean;
  onHoverChat: (chatId: string | null) => void;
  onCreateChat?: () => void;
  onSwitchChat: (chatId: string) => void;
  onEditChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
}

export function SidebarContent({
  chats,
  currentChatId,
  hoveredChatId,
  isMobile,
  isLoading,
  onHoverChat,
  onCreateChat,
  onSwitchChat,
  onEditChat,
  onDeleteChat,
}: SidebarContentProps) {
  // Load from localStorage, default to true if not set
  const [chatsExpanded, setChatsExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(CHATS_EXPANDED_KEY);
    return saved === null ? true : saved === "true";
  });
  const pathname = usePathname();

  // Persist to localStorage when chatsExpanded changes
  useEffect(() => {
    localStorage.setItem(CHATS_EXPANDED_KEY, String(chatsExpanded));
  }, [chatsExpanded]);

  // Only show chat as selected when on the chat page
  const isOnChatPage = pathname === "/chat";

  return (
    <Flex direction="column" gap="3">
      {/* Only show NewChatButton on mobile (desktop has it in the header section) */}
      {isMobile && onCreateChat && <NewChatButton onClick={onCreateChat} />}

      <ChatList
        chats={chats}
        currentChatId={isOnChatPage ? currentChatId : undefined}
        hoveredChatId={hoveredChatId}
        isMobile={isMobile}
        chatsExpanded={chatsExpanded}
        isLoading={isLoading}
        onToggleExpanded={() => setChatsExpanded(!chatsExpanded)}
        onHoverChat={onHoverChat}
        onChatClick={onSwitchChat}
        onChatEdit={onEditChat}
        onChatDelete={onDeleteChat}
      />
    </Flex>
  );
}
