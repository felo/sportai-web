"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Flex, Button, Text, Box } from "@radix-ui/themes";
import { ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { ChatListItem } from "./ChatListItem";
import type { Chat } from "@/types/chat";

// Threshold for aggressive collapsing (only show active group + most recent)
const AGGRESSIVE_COLLAPSE_THRESHOLD = 15;

interface ChatGroup {
  label: string;
  chats: Chat[];
}

interface ChatListGroupedProps {
  chats: Chat[];
  currentChatId?: string;
  hoveredChatId: string | null;
  isMobile: boolean;
  onHoverChat: (chatId: string | null) => void;
  onChatClick: (chatId: string) => void;
  onChatEdit: (chat: Chat) => void;
  onChatDelete: (chatId: string) => void;
}

function groupChatsByTime(chats: Chat[]): ChatGroup[] {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneWeekMs = 7 * oneDayMs;
  const oneMonthMs = 30 * oneDayMs;

  // Calculate start of today (midnight)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayStart = startOfToday.getTime();

  const groups: { [key: string]: Chat[] } = {
    today: [],
    week: [],
    month: [],
    older: [],
  };

  chats.forEach((chat) => {
    const chatTime = chat.updatedAt || chat.createdAt;
    
    if (chatTime >= todayStart) {
      groups.today.push(chat);
    } else if (chatTime >= now - oneWeekMs) {
      groups.week.push(chat);
    } else if (chatTime >= now - oneMonthMs) {
      groups.month.push(chat);
    } else {
      groups.older.push(chat);
    }
  });

  const result: ChatGroup[] = [];
  
  if (groups.today.length > 0) {
    result.push({ label: "Today", chats: groups.today });
  }
  if (groups.week.length > 0) {
    result.push({ label: "Previous 7 Days", chats: groups.week });
  }
  if (groups.month.length > 0) {
    result.push({ label: "Previous 30 Days", chats: groups.month });
  }
  if (groups.older.length > 0) {
    result.push({ label: "Older", chats: groups.older });
  }

  return result;
}

function ChatGroupSection({
  group,
  isExpanded,
  onToggle,
  currentChatId,
  hoveredChatId,
  isMobile,
  onHoverChat,
  onChatClick,
  onChatEdit,
  onChatDelete,
}: {
  group: ChatGroup;
  isExpanded: boolean;
  onToggle: () => void;
  currentChatId?: string;
  hoveredChatId: string | null;
  isMobile: boolean;
  onHoverChat: (chatId: string | null) => void;
  onChatClick: (chatId: string) => void;
  onChatEdit: (chat: Chat) => void;
  onChatDelete: (chatId: string) => void;
}) {
  return (
    <Flex direction="column" gap="1">
      <Button
        variant="ghost"
        size="1"
        onClick={onToggle}
        style={{
          justifyContent: "flex-start",
          padding: "4px 14px",
          height: "24px",
          opacity: 0.7,
        }}
      >
        {isExpanded ? (
          <ChevronDownIcon width="12" height="12" />
        ) : (
          <ChevronRightIcon width="12" height="12" />
        )}
        <Text size="1" ml="1" weight="medium" color="gray">
          {group.label}
        </Text>
        <Text size="1" ml="1" color="gray" style={{ opacity: 0.6 }}>
          ({group.chats.length})
        </Text>
      </Button>
      {isExpanded && (
        <Box pl="2">
          <Flex direction="column" gap="1">
            {group.chats.map((chat) => (
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
            ))}
          </Flex>
        </Box>
      )}
    </Flex>
  );
}

export function ChatListGrouped({
  chats,
  currentChatId,
  hoveredChatId,
  isMobile,
  onHoverChat,
  onChatClick,
  onChatEdit,
  onChatDelete,
}: ChatListGroupedProps) {
  const groups = useMemo(() => groupChatsByTime(chats), [chats]);

  // Find which group contains the active chat
  const activeGroupLabel = useMemo(() => {
    if (!currentChatId) return null;
    for (const group of groups) {
      if (group.chats.some((chat) => chat.id === currentChatId)) {
        return group.label;
      }
    }
    return null;
  }, [groups, currentChatId]);

  // Calculate smart initial expansion based on progressive disclosure
  const getInitialExpandedGroups = useCallback((): Set<string> => {
    const expanded = new Set<string>();

    // Always expand the group with the active chat
    if (activeGroupLabel) {
      expanded.add(activeGroupLabel);
    }

    // Progressive disclosure: expand "Today", or first non-empty group if Today is empty
    if (groups.length > 0) {
      const todayGroup = groups.find((g) => g.label === "Today");

      if (todayGroup && todayGroup.chats.length > 0) {
        expanded.add("Today");
      } else {
        // No today chats, expand the first available group
        expanded.add(groups[0].label);
      }

      // If lots of chats (15+), only show active group + most recent
      // Otherwise, also expand "Previous 7 Days" for better context
      if (chats.length < AGGRESSIVE_COLLAPSE_THRESHOLD) {
        const weekGroup = groups.find((g) => g.label === "Previous 7 Days");
        if (weekGroup) {
          expanded.add("Previous 7 Days");
        }
      }
    }

    return expanded;
  }, [groups, activeGroupLabel, chats.length]);

  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() =>
    getInitialExpandedGroups()
  );

  // Track previous active group to detect actual chat switches
  const prevActiveGroupRef = useRef<string | null>(activeGroupLabel);

  // Auto-expand only when user switches to a chat in a different group
  useEffect(() => {
    const prevGroup = prevActiveGroupRef.current;
    
    // Only auto-expand if the active group actually changed (user switched chats)
    if (activeGroupLabel && activeGroupLabel !== prevGroup) {
      setExpandedGroups((prev) => new Set([...prev, activeGroupLabel]));
    }
    
    prevActiveGroupRef.current = activeGroupLabel;
  }, [activeGroupLabel]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  return (
    <Flex direction="column" gap="2">
      {groups.map((group) => (
        <ChatGroupSection
          key={group.label}
          group={group}
          isExpanded={expandedGroups.has(group.label)}
          onToggle={() => toggleGroup(group.label)}
          currentChatId={currentChatId}
          hoveredChatId={hoveredChatId}
          isMobile={isMobile}
          onHoverChat={onHoverChat}
          onChatClick={onChatClick}
          onChatEdit={onChatEdit}
          onChatDelete={onChatDelete}
        />
      ))}
    </Flex>
  );
}

