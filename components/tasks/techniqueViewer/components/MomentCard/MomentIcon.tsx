"use client";

import {
  RocketIcon,
  TargetIcon,
  CheckCircledIcon,
  ChatBubbleIcon,
  BookmarkIcon,
  DragHandleDots2Icon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import type { Moment } from "./types";

/**
 * Returns the appropriate icon for a moment based on its type and protocol.
 */
export function getMomentIcon(moment: Moment): React.ReactNode {
  // Protocol-specific icons
  if (moment.protocolId) {
    switch (moment.protocolId) {
      case "loading-position":
      case "serve-preparation":
        return <RocketIcon width={14} height={14} />;
      case "tennis-contact-point":
        return <TargetIcon width={14} height={14} />;
      case "serve-follow-through":
        return <CheckCircledIcon width={14} height={14} />;
      case "swing-detection-v3":
      case "swing-detection-v2":
      case "swing-detection-v1":
        return <DragHandleDots2Icon width={14} height={14} />;
      default:
        return <BookmarkIcon width={14} height={14} />;
    }
  }

  // Type-based icons
  switch (moment.type) {
    case "comment":
      return <ChatBubbleIcon width={14} height={14} />;
    case "custom":
      return <Pencil1Icon width={14} height={14} />;
    default:
      return <BookmarkIcon width={14} height={14} />;
  }
}
