"use client";

import { Flex, Button, Text, Spinner } from "@radix-ui/themes";
import { ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { EmptyState } from "@/components/ui";
import { ChatListItem } from "./ChatListItem";
import { ChatListGrouped } from "./ChatListGrouped";
import type { ChatListProps } from "./types";

// Threshold for showing grouped view
const GROUPING_THRESHOLD = 8;

export function ChatList({
  chats,
  currentChatId,
  hoveredChatId,
  isMobile,
  chatsExpanded,
  isLoading,
  onToggleExpanded,
  onHoverChat,
  onChatClick,
  onChatEdit,
  onChatDelete,
}: ChatListProps) {
  const shouldGroup = chats.length >= GROUPING_THRESHOLD;

  return (
    <Flex direction="column" gap="2">
      <Button
        variant="ghost"
        size="2"
        onClick={onToggleExpanded}
        style={{
          justifyContent: "flex-start",
          padding: "var(--space-2) var(--space-3)",
        }}
      >
        {chatsExpanded ? (
          <ChevronDownIcon width="16" height="16" />
        ) : (
          <ChevronRightIcon width="16" height="16" />
        )}
        <Text size="2" ml="2" weight="medium">
          Your chats
        </Text>
      </Button>
      {chatsExpanded && (
        <Flex
          direction="column"
          gap="1"
          style={{ paddingTop: "var(--space-2)", paddingBottom: "var(--space-2)" }}
        >
          {isLoading ? (
            <Flex align="center" justify="center" py="4">
              <Spinner size="2" />
            </Flex>
          ) : chats.length === 0 ? (
            <EmptyState message="No chats yet" />
          ) : shouldGroup ? (
            <ChatListGrouped
              chats={chats}
              currentChatId={currentChatId}
              hoveredChatId={hoveredChatId}
              isMobile={isMobile}
              onHoverChat={onHoverChat}
              onChatClick={onChatClick}
              onChatEdit={onChatEdit}
              onChatDelete={onChatDelete}
            />
          ) : (
            chats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isActive={currentChatId === chat.id}
                isHovered={hoveredChatId === chat.id}
                isMobile={isMobile}
                onMouseEnter={() => onHoverChat(chat.id)}
                onMouseLeave={() => onHoverChat(null)}
                onClick={() => onChatClick(chat.id)}
                onEdit={() => onChatEdit(chat)}
                onDelete={() => onChatDelete(chat.id)}
              />
            ))
          )}
        </Flex>
      )}
    </Flex>
  );
}
