"use client";

import { useState } from "react";
import { Flex, Separator } from "@radix-ui/themes";
import { NewChatButton } from "./NewChatButton";
import { ChatList } from "./ChatList";
import { SidebarNavigation } from "./SidebarNavigation";
import type { Chat } from "@/types/chat";

interface SidebarContentProps {
  chats: Chat[];
  currentChatId?: string;
  hoveredChatId: string | null;
  isMobile: boolean;
  onHoverChat: (chatId: string | null) => void;
  onCreateChat: () => void;
  onSwitchChat: (chatId: string) => void;
  onEditChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  onLinkClick?: () => void;
}

export function SidebarContent({
  chats,
  currentChatId,
  hoveredChatId,
  isMobile,
  onHoverChat,
  onCreateChat,
  onSwitchChat,
  onEditChat,
  onDeleteChat,
  onLinkClick,
}: SidebarContentProps) {
  const [chatsExpanded, setChatsExpanded] = useState(true);

  return (
    <Flex direction="column" gap="3">
      <NewChatButton onClick={onCreateChat} />

      <ChatList
        chats={chats}
        currentChatId={currentChatId}
        hoveredChatId={hoveredChatId}
        isMobile={isMobile}
        chatsExpanded={chatsExpanded}
        onToggleExpanded={() => setChatsExpanded(!chatsExpanded)}
        onHoverChat={onHoverChat}
        onChatClick={onSwitchChat}
        onChatEdit={onEditChat}
        onChatDelete={onDeleteChat}
      />

      <Separator size="4" />

      <SidebarNavigation onLinkClick={onLinkClick} />
    </Flex>
  );
}




