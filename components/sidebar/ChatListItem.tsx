"use client";

import { Flex, Button, Text } from "@radix-ui/themes";
import { Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import type { ChatListItemProps } from "./types";

export function ChatListItem({
  chat,
  isActive,
  isHovered,
  isMobile,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onEdit,
  onDelete,
}: ChatListItemProps) {
  // Show edit/delete buttons on mobile always, on desktop only when hovered
  const showEditButtons = isMobile || isHovered;

  return (
    <Flex
      align="center"
      gap="1"
      position="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        width: "100%",
      }}
    >
      <Button
        variant={isActive ? "soft" : "ghost"}
        size="1"
        onClick={onClick}
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          padding: "6px 10px",
          paddingRight: showEditButtons ? "52px" : "10px",
          flex: 1,
          width: "100%",
          height: "32px",
          overflow: "hidden",
        }}
      >
        <Text
          size="2"
          color={isActive ? undefined : "gray"}
          weight={isActive ? "medium" : "regular"}
          style={{
            textAlign: "left",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: "1.4",
            display: "block",
            width: "100%",
          }}
        >
          {chat.title}
        </Text>
      </Button>
      {showEditButtons && (
        <Flex
          gap="1"
          style={{
            position: "absolute",
            right: "6px",
            top: "50%",
            transform: "translateY(-50%)",
            alignItems: "center",
          }}
        >
          <Button
            variant="ghost"
            size="1"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            style={{
              padding: "2px",
              minWidth: "auto",
              width: "20px",
              height: "20px",
            }}
          >
            <Pencil1Icon width="12" height="12" />
          </Button>
          <Button
            variant="ghost"
            size="1"
            color="red"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              padding: "2px",
              minWidth: "auto",
              width: "20px",
              height: "20px",
            }}
          >
            <TrashIcon width="12" height="12" />
          </Button>
        </Flex>
      )}
    </Flex>
  );
}

