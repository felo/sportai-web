import type { Chat, Message } from "@/types/chat";
import type { SerializableChat, SerializableMessage } from "../types";

/**
 * Convert Chat to SerializableChat (removes File objects and blob URLs)
 */
export function serializeChat(chat: Chat): SerializableChat {
  return {
    ...chat,
    messages: chat.messages.map((msg) => {
      const { videoFile, videoPreview, ...rest } = msg;
      return rest;
    }),
  };
}

/**
 * Convert SerializableChat back to Chat
 */
export function deserializeChat(serialized: SerializableChat): Chat {
  return {
    ...serialized,
    messages: serialized.messages.map((msg) => ({
      ...msg,
      videoFile: null,
      videoPreview: null,
    })),
  };
}

/**
 * Convert Message to SerializableMessage
 */
export function serializeMessage(message: Message): SerializableMessage {
  const { videoFile, videoPreview, ...rest } = message;
  return rest;
}

/**
 * Convert SerializableMessage back to Message
 */
export function deserializeMessage(serialized: SerializableMessage): Message {
  return {
    ...serialized,
    videoFile: null,
    videoPreview: null,
  };
}








