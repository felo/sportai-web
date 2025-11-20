import { useState, useRef, useCallback, useEffect } from "react";
import type { Message, ProgressStage } from "@/types/chat";
import {
  loadMessagesFromStorage,
  saveMessagesToStorage,
  clearMessagesFromStorage,
  refreshVideoUrls,
  getCurrentChatId,
  setCurrentChatId,
  createChat,
  updateChat,
  getChatById,
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
  const isSwitchingChatRef = useRef(false);
  const activeChatIdRef = useRef<string | undefined>(undefined);

  // Load messages from localStorage after hydration (client-side only)
  useEffect(() => {
    if (!isHydrated) {
      // Try to load from current chat first, fallback to old storage
      const currentChatId = getCurrentChatId();
      activeChatIdRef.current = currentChatId;
      let messagesToLoad: Message[] = [];
      
      if (currentChatId) {
        const chat = getChatById(currentChatId);
        if (chat) {
          messagesToLoad = chat.messages;
        }
      }
      
      // If no chat messages found, try old storage for backward compatibility
      if (messagesToLoad.length === 0) {
        loadMessagesFromStorage().then((storedMessages) => {
          setMessages(storedMessages);
          setIsHydrated(true);
          
          // Refresh video URLs in the background
          refreshVideoUrls(storedMessages).then((refreshed) => {
            setMessages(refreshed);
            // Save refreshed URLs back to storage
            saveMessagesToStorage(refreshed);
            // Also update chat if it exists (silent during initial hydration)
            if (currentChatId) {
              updateChat(currentChatId, { messages: refreshed }, true);
            }
          }).catch((error) => {
            console.error("Failed to refresh video URLs:", error);
          });
        });
      } else {
        setMessages(messagesToLoad);
        setIsHydrated(true);
        
          // Refresh video URLs in the background
          refreshVideoUrls(messagesToLoad).then((refreshed) => {
            setMessages(refreshed);
            // Update chat with refreshed URLs (silent to prevent event loop)
            if (currentChatId) {
              updateChat(currentChatId, { messages: refreshed }, true);
            }
          }).catch((error) => {
            console.error("Failed to refresh video URLs:", error);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  // Listen for chat changes and load messages from the selected chat
  useEffect(() => {
    if (!isHydrated) return;

    const handleChatChange = async () => {
      isSwitchingChatRef.current = true;
      const currentChatId = getCurrentChatId();
      
      // Update the active chat ID reference
      activeChatIdRef.current = currentChatId;
      
      // Reset loading state when switching chats
      setLoading(false);
      setProgressStage("idle");
      setUploadProgress(0);
      
      if (currentChatId) {
        const chat = getChatById(currentChatId);
        if (chat) {
          // Load messages from the selected chat
          const refreshed = await refreshVideoUrls(chat.messages);
          setMessages(refreshed);
          // Update chat with refreshed URLs (silent to prevent event loop)
          updateChat(currentChatId, { messages: refreshed }, true);
        } else {
          // Chat not found, clear messages
          setMessages([]);
          clearMessagesFromStorage();
        }
      } else {
        // No current chat, try old storage for backward compatibility
        const storedMessages = await loadMessagesFromStorage();
        if (storedMessages.length > 0) {
          const refreshed = await refreshVideoUrls(storedMessages);
          setMessages(refreshed);
          saveMessagesToStorage(refreshed);
        } else {
          setMessages([]);
          clearMessagesFromStorage();
        }
      }
      // Reset flag after a short delay to allow messages to update
      setTimeout(() => {
        isSwitchingChatRef.current = false;
      }, 100);
    };

    window.addEventListener("chat-storage-change", handleChatChange);
    return () => {
      window.removeEventListener("chat-storage-change", handleChatChange);
    };
  }, [isHydrated]);

  // Save messages to localStorage and update chat whenever they change (but only after hydration)
  useEffect(() => {
    if (isHydrated && !isSwitchingChatRef.current) {
      const currentChatId = getCurrentChatId();
      
      // Only save if we're still on the same chat
      if (activeChatIdRef.current !== currentChatId) {
        console.warn(`[useGeminiChat] Ignoring message save - chat changed from ${activeChatIdRef.current} to ${currentChatId}`);
        return;
      }
      
      if (messages.length > 0) {
        saveMessagesToStorage(messages);
        
        // Update current chat with messages
        if (currentChatId) {
          updateChat(currentChatId, { messages });
        }
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
    // Check if chat has changed - if so, don't update messages
    const currentChatId = getCurrentChatId();
    if (activeChatIdRef.current !== currentChatId) {
      console.warn(`[useGeminiChat] Ignoring message update - chat changed from ${activeChatIdRef.current} to ${currentChatId}`);
      return;
    }
    
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

