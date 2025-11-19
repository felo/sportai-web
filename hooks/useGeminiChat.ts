import { useState, useRef, useCallback, useEffect } from "react";
import type { Message, ProgressStage } from "@/types/chat";
import {
  loadMessagesFromStorage,
  saveMessagesToStorage,
  clearMessagesFromStorage,
} from "@/utils/storage";

export function useGeminiChat() {
  // Start with empty array to avoid hydration mismatch
  // Load from localStorage only on client after hydration
  const [messages, setMessages] = useState<Message[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressStage, setProgressStage] = useState<ProgressStage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage after hydration (client-side only)
  useEffect(() => {
    if (!isHydrated) {
      const storedMessages = loadMessagesFromStorage();
      setMessages(storedMessages);
      setIsHydrated(true);
    }
  }, [isHydrated]);

  // Save messages to localStorage whenever they change (but only after hydration)
  useEffect(() => {
    if (isHydrated) {
      if (messages.length > 0) {
        saveMessagesToStorage(messages);
      } else {
        // Clear storage if messages array is empty
        clearMessagesFromStorage();
      }
    }
  }, [messages, isHydrated]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    clearMessagesFromStorage();
  }, []);

  return {
    messages,
    loading,
    progressStage,
    uploadProgress,
    messagesEndRef,
    isHydrated,
    setLoading,
    setProgressStage,
    setUploadProgress,
    scrollToBottom,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
  };
}

