"use client";

/**
 * Hook for managing chat settings (thinking mode, media resolution, domain expertise)
 */

import { useState, useEffect, useCallback } from "react";
import { chatLogger } from "@/lib/logger";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";
import { updateChatSettings } from "@/utils/storage";
import { getCurrentChatId, loadChat, createNewChat, setCurrentChatId } from "@/utils/storage-unified";
import type { ChatSettings } from "../types";

interface UseChatSettingsOptions {
  isHydrated: boolean;
}

interface UseChatSettingsReturn extends ChatSettings {
  setThinkingMode: (mode: ThinkingMode) => void;
  setMediaResolution: (resolution: MediaResolution) => void;
  setDomainExpertise: (expertise: DomainExpertise) => void;
  handleThinkingModeChange: (mode: ThinkingMode) => void;
  handleMediaResolutionChange: (resolution: MediaResolution) => void;
  handleDomainExpertiseChange: (expertise: DomainExpertise) => void;
  ensureChatExists: () => Promise<string | undefined>;
  authKey: number;
  setAuthKey: React.Dispatch<React.SetStateAction<number>>;
}

const DEFAULT_SETTINGS: ChatSettings = {
  thinkingMode: "fast",
  mediaResolution: "medium",
  domainExpertise: "all-sports",
};

export function useChatSettings({ isHydrated }: UseChatSettingsOptions): UseChatSettingsReturn {
  const [authKey, setAuthKey] = useState(0);
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>(DEFAULT_SETTINGS.thinkingMode);
  const [mediaResolution, setMediaResolution] = useState<MediaResolution>(DEFAULT_SETTINGS.mediaResolution);
  const [domainExpertise, setDomainExpertise] = useState<DomainExpertise>(DEFAULT_SETTINGS.domainExpertise);

  // Load settings from current chat after hydration
  useEffect(() => {
    if (isHydrated) {
      (async () => {
        const currentChatId = getCurrentChatId();
        if (currentChatId) {
          const chatData = await loadChat(currentChatId);
          if (chatData) {
            setThinkingMode(chatData.thinkingMode ?? DEFAULT_SETTINGS.thinkingMode);
            setMediaResolution(chatData.mediaResolution ?? DEFAULT_SETTINGS.mediaResolution);
            setDomainExpertise(chatData.domainExpertise ?? DEFAULT_SETTINGS.domainExpertise);
            return;
          }
        }
        // No chat found, use defaults
        setThinkingMode(DEFAULT_SETTINGS.thinkingMode);
        setMediaResolution(DEFAULT_SETTINGS.mediaResolution);
        setDomainExpertise(DEFAULT_SETTINGS.domainExpertise);
      })();
    }
  }, [isHydrated]);

  // Function to ensure a chat exists - now only called when needed (e.g., before submission)
  // No longer auto-creates chat on mount
  const ensureChatExists = useCallback(async () => {
    if (!isHydrated) return;
    
    const currentChatId = getCurrentChatId();
    if (!currentChatId) {
      chatLogger.info("No chat exists, creating new chat");
      const newChat = await createNewChat([], undefined);
      setCurrentChatId(newChat.id);
      chatLogger.info("Created new chat:", newChat.id);
      setThinkingMode(newChat.thinkingMode ?? DEFAULT_SETTINGS.thinkingMode);
      setMediaResolution(newChat.mediaResolution ?? DEFAULT_SETTINGS.mediaResolution);
      setDomainExpertise(newChat.domainExpertise ?? DEFAULT_SETTINGS.domainExpertise);
      return newChat.id;
    }
    return currentChatId;
  }, [isHydrated]);

  // Note: Removed auto-call to ensureChatExists - chat is created lazily on first message

  // Restore settings when switching chats
  useEffect(() => {
    if (!isHydrated) return;

    const handleChatChange = async () => {
      const currentChatId = getCurrentChatId();
      if (currentChatId) {
        const chatData = await loadChat(currentChatId);
        if (chatData) {
          chatLogger.debug("Chat changed, restoring settings:", {
            chatId: currentChatId,
            thinkingMode: chatData.thinkingMode,
            mediaResolution: chatData.mediaResolution,
            domainExpertise: chatData.domainExpertise,
          });
          setThinkingMode(chatData.thinkingMode ?? DEFAULT_SETTINGS.thinkingMode);
          setMediaResolution(chatData.mediaResolution ?? DEFAULT_SETTINGS.mediaResolution);
          setDomainExpertise(chatData.domainExpertise ?? DEFAULT_SETTINGS.domainExpertise);
        } else {
          chatLogger.info("Chat not found, resetting to defaults");
          setThinkingMode(DEFAULT_SETTINGS.thinkingMode);
          setMediaResolution(DEFAULT_SETTINGS.mediaResolution);
          setDomainExpertise(DEFAULT_SETTINGS.domainExpertise);
        }
      } else {
        // No current chat (new chat state) - reset to defaults
        chatLogger.debug("No current chat, using defaults");
        setThinkingMode(DEFAULT_SETTINGS.thinkingMode);
        setMediaResolution(DEFAULT_SETTINGS.mediaResolution);
        setDomainExpertise(DEFAULT_SETTINGS.domainExpertise);
      }
    };

    const handleAuthChange = () => {
      chatLogger.info("Auth state changed, forcing re-render");
      setAuthKey(prev => prev + 1);
    };

    window.addEventListener("chat-storage-change", handleChatChange);
    window.addEventListener("auth-state-change", handleAuthChange);
    
    return () => {
      window.removeEventListener("chat-storage-change", handleChatChange);
      window.removeEventListener("auth-state-change", handleAuthChange);
    };
  }, [isHydrated]);

  // Wrapper functions to update both state and current chat settings
  const handleThinkingModeChange = useCallback((mode: ThinkingMode) => {
    setThinkingMode(mode);
    const currentChatId = getCurrentChatId();
    if (currentChatId) {
      updateChatSettings(currentChatId, { thinkingMode: mode });
    }
  }, []);

  const handleMediaResolutionChange = useCallback((resolution: MediaResolution) => {
    setMediaResolution(resolution);
    const currentChatId = getCurrentChatId();
    if (currentChatId) {
      updateChatSettings(currentChatId, { mediaResolution: resolution });
    }
  }, []);

  const handleDomainExpertiseChange = useCallback((expertise: DomainExpertise) => {
    setDomainExpertise(expertise);
    const currentChatId = getCurrentChatId();
    if (currentChatId) {
      updateChatSettings(currentChatId, { domainExpertise: expertise });
    }
  }, []);

  return {
    thinkingMode,
    mediaResolution,
    domainExpertise,
    setThinkingMode,
    setMediaResolution,
    setDomainExpertise,
    handleThinkingModeChange,
    handleMediaResolutionChange,
    handleDomainExpertiseChange,
    ensureChatExists,
    authKey,
    setAuthKey,
  };
}
