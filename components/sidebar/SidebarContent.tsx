"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Flex, Separator } from "@radix-ui/themes";
import { NewChatButton } from "./NewChatButton";
import { LibraryButton } from "./LibraryButton";
import { ChatList } from "./ChatList";
import { SidebarNavigation } from "./SidebarNavigation";
import type { Chat } from "@/types/chat";

interface SidebarContentProps {
  chats: Chat[];
  currentChatId?: string;
  hoveredChatId: string | null;
  isMobile: boolean;
  isLoading?: boolean;
  onHoverChat: (chatId: string | null) => void;
  onCreateChat: () => void;
  onSwitchChat: (chatId: string) => void;
  onEditChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  onLinkClick?: () => void;
  onNavigationAttempt?: () => Promise<boolean> | boolean;
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
  onLinkClick,
  onNavigationAttempt,
}: SidebarContentProps) {
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const pathname = usePathname();
  
  // Check if we're on the Library page
  const isOnLibraryPage = pathname === "/library" || pathname?.startsWith("/library/");
  // Only show chat as selected when on the chat page
  const isOnChatPage = pathname === "/";

  return (
    <Flex direction="column" gap="3">
      <NewChatButton onClick={onCreateChat} />
      <LibraryButton onClick={onLinkClick} isActive={isOnLibraryPage} onNavigationAttempt={onNavigationAttempt} />

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

      <Separator size="4" />

      <SidebarNavigation onLinkClick={onLinkClick} />
    </Flex>
  );
}






