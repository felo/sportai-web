import { useState, useRef, useCallback, useEffect } from "react";
import type { Message, ProgressStage } from "@/types/chat";
import {
  loadMessagesFromStorage,
  saveMessagesToStorage,
  clearMessagesFromStorage,
  refreshVideoUrls,
} from "@/utils/storage";
import {
  getCurrentChatId,
  setCurrentChatId,
  createNewChat,
  updateExistingChat,
  loadChat,
} from "@/utils/storage-unified";

/**
 * Detects and marks incomplete assistant messages.
 * A message is considered incomplete if:
 * - It's an assistant message AND
 * - It has isStreaming=true (was interrupted during generation) OR
 * - It has no content and no isStreaming flag (failed before any content was generated)
 */
function markIncompleteMessages(messages: Message[]): Message[] {
  return messages.map((msg, index) => {
    if (msg.role === "assistant") {
      // Already marked as incomplete - keep it
      if (msg.isIncomplete) {
        return msg;
      }
      
      // Message was streaming when interrupted (isStreaming=true but we're loading from storage)
      if (msg.isStreaming) {
        console.log("[useAIChat] Detected interrupted streaming message:", msg.id);
        return { ...msg, isStreaming: false, isIncomplete: true };
      }
      
      // Message is the last one, has no content, and no streaming flag
      // This means it failed before any response was generated
      if (index === messages.length - 1 && !msg.content.trim() && msg.isStreaming === undefined) {
        console.log("[useAIChat] Detected empty assistant message at end:", msg.id);
        return { ...msg, isIncomplete: true };
      }
    }
    return msg;
  });
}

export function useAIChat() {
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
      // Async IIFE to handle await inside useEffect
      (async () => {
        // Try to load from current chat first, fallback to old storage
        const currentChatId = getCurrentChatId();
        activeChatIdRef.current = currentChatId;
        let messagesToLoad: Message[] = [];
        
        if (currentChatId) {
          const chat = await loadChat(currentChatId);
          if (chat) {
            // Mark any messages that were interrupted as incomplete
            messagesToLoad = markIncompleteMessages(chat.messages);
          }
        }
        
        // If we have a current chat but it's empty, start fresh (don't load legacy storage)
        // Only fall back to legacy storage if there's no current chat at all
        if (messagesToLoad.length === 0) {
          if (currentChatId) {
            // New/empty chat - start with empty messages
            console.log("[useAIChat] Empty chat, starting fresh");
            setMessages([]);
            setIsHydrated(true);
          } else {
            // No current chat - try old storage for backward compatibility
            loadMessagesFromStorage().then((storedMessages) => {
              setMessages(storedMessages);
              setIsHydrated(true);
              
              // Refresh video URLs in the background
              refreshVideoUrls(storedMessages).then((refreshed) => {
                setMessages(refreshed);
                // Save refreshed URLs back to storage
                saveMessagesToStorage(refreshed);
              }).catch((error) => {
                console.error("Failed to refresh video URLs:", error);
              });
            });
          }
        } else {
          setMessages(messagesToLoad);
          setIsHydrated(true);
          
            // Refresh video URLs in the background
            refreshVideoUrls(messagesToLoad).then((refreshed) => {
              setMessages(refreshed);
              // Update chat with refreshed URLs (silent to prevent event loop)
              if (currentChatId) {
                updateExistingChat(currentChatId, { messages: refreshed }, true);
              }
            }).catch((error) => {
              console.error("Failed to refresh video URLs:", error);
            });
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  // Use refs to avoid stale closures in event handler
  const messagesRef = useRef<Message[]>([]);
  const loadingRef = useRef(false);
  
  // Keep refs in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // Listen for chat changes and load messages from the selected chat
  useEffect(() => {
    if (!isHydrated) return;

    const handleChatChange = async () => {
      const currentChatId = getCurrentChatId();
      const isSwitchingToDifferentChat = activeChatIdRef.current !== currentChatId;
      
      // Use refs to get current values (not stale closure values)
      const currentMessages = messagesRef.current;
      const isLoading = loadingRef.current;
      
      console.log("[useAIChat] ===== CHAT CHANGE HANDLER =====", {
        currentChatId,
        activeChatId: activeChatIdRef.current,
        isSwitchingToDifferentChat,
        currentMessages: currentMessages.length,
        loading: isLoading,
      });
      
      // If this is the same chat we're already on, don't reload
      if (!isSwitchingToDifferentChat && currentChatId) {
        console.log("[useAIChat] Same chat, skipping reload", {
          chatId: currentChatId,
          messageCount: currentMessages.length,
        });
        return;
      }
      
      // If we're switching to a different chat and currently loading, 
      // only keep messages if we're switching to an empty chat during submission
      // Otherwise, we should switch chats normally
      if (isLoading && isSwitchingToDifferentChat) {
        const chat = currentChatId ? await loadChat(currentChatId) : null;
        // Only keep messages if the new chat is empty AND we're actively submitting
        // This prevents losing messages mid-submission
        if (chat && chat.messages.length === 0 && currentMessages.length > 0) {
          console.log("[useAIChat] ⚠️ Switching to empty chat during submission - KEEPING STATE MESSAGES", {
            chatId: currentChatId,
            chatMessages: chat.messages.length,
            stateMessages: currentMessages.length,
          });
          // Update activeChatIdRef but don't clear messages yet
          activeChatIdRef.current = currentChatId;
          return;
        }
        // If switching to a chat with messages, proceed normally
      }
      
      // Don't interfere if we're already loading AND not switching chats
      if (isLoading && !isSwitchingToDifferentChat) {
        console.log("[useAIChat] Ignoring chat change during active loading (same chat)", {
          currentChatId,
          activeChatId: activeChatIdRef.current,
        });
        return;
      }
      
      isSwitchingChatRef.current = true;
      
      // Update the active chat ID reference immediately
      activeChatIdRef.current = currentChatId;
      
      // Reset loading state when switching chats
      setLoading(false);
      setProgressStage("idle");
      setUploadProgress(0);
      
      if (currentChatId) {
        const chat = await loadChat(currentChatId);
        if (chat) {
          console.log("[useAIChat] Loading messages from chat:", {
            chatId: currentChatId,
            messageCount: chat.messages.length,
            currentMessages: currentMessages.length,
          });
          
          // If chat is empty, clear messages immediately (before async operations)
          if (chat.messages.length === 0) {
            console.log("[useAIChat] Chat is empty, clearing messages immediately");
            setMessages([]);
            clearMessagesFromStorage();
          } else {
            // Mark any messages that were interrupted as incomplete
            const markedMessages = markIncompleteMessages(chat.messages);
            // Load messages from the selected chat
            const refreshed = await refreshVideoUrls(markedMessages);
            setMessages(refreshed);
            console.log("[useAIChat] Messages loaded:", refreshed.length);
            // Update chat with refreshed URLs and incomplete flags (silent to prevent event loop)
            updateExistingChat(currentChatId, { messages: refreshed }, true);
          }
        } else {
          // Chat not found, clear messages
          console.log("[useAIChat] Chat not found, clearing messages");
          setMessages([]);
          clearMessagesFromStorage();
        }
      } else {
        // No current chat, try old storage for backward compatibility
        console.log("[useAIChat] No current chat, loading from old storage");
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
    console.log("[useAIChat] ===== MESSAGES CHANGED EFFECT =====", {
      isHydrated,
      isSwitchingChat: isSwitchingChatRef.current,
      messagesCount: messages.length,
      activeChatId: activeChatIdRef.current,
      currentChatId: getCurrentChatId(),
    });
    
    if (isHydrated && !isSwitchingChatRef.current) {
      const currentChatId = getCurrentChatId();
      
      // Only save if we're still on the same chat
      if (activeChatIdRef.current !== currentChatId) {
        console.warn(`[useAIChat] Ignoring message save - chat changed from ${activeChatIdRef.current} to ${currentChatId}`);
        return;
      }
      
      if (messages.length > 0) {
        console.log("[useAIChat] Saving messages:", {
          count: messages.length,
          chatId: currentChatId,
          messageIds: messages.map(m => m.id),
        });
        saveMessagesToStorage(messages);
        
        // Update current chat with messages
        if (currentChatId) {
          console.log("[useAIChat] Updating chat with messages:", currentChatId);
          updateExistingChat(currentChatId, { messages }, true);
          console.log("[useAIChat] Chat updated successfully");
        } else {
          console.warn("[useAIChat] No current chat ID, cannot update chat");
        }
      } else {
        // Clear storage if messages array is empty
        console.log("[useAIChat] Messages array is empty, clearing storage");
        clearMessagesFromStorage();
        
        // Also update current chat to have empty messages (if we're on a chat)
        if (currentChatId) {
          console.log("[useAIChat] Updating chat to have empty messages:", currentChatId);
          updateExistingChat(currentChatId, { messages: [] }, true);
        }
      }
    } else {
      console.log("[useAIChat] Skipping save:", {
        isHydrated,
        isSwitchingChat: isSwitchingChatRef.current,
      });
    }
  }, [messages, isHydrated]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Scroll a specific message to the top of the viewport
  // This is used when AI starts responding - puts user message at top with response below
  const scrollMessageToTop = useCallback((messageId: string) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      // Get the scroll container (parent that scrolls)
      const scrollContainer = messageElement.closest('[data-scroll-container="true"]') as HTMLElement;
      if (scrollContainer) {
        // Find the previous message to calculate how far to scroll
        const allMessages = scrollContainer.querySelectorAll('[data-message-id]');
        const messageArray = Array.from(allMessages);
        const currentIndex = messageArray.findIndex(el => el.getAttribute('data-message-id') === messageId);
        
        let scrollTarget: number;
        
        if (currentIndex > 0) {
          // There's a previous message - scroll so it's completely hidden
          const previousMessage = messageArray[currentIndex - 1] as HTMLElement;
          // Scroll to position just after the previous message ends (hiding it completely)
          scrollTarget = previousMessage.offsetTop + previousMessage.offsetHeight + 24; // 24px gap between messages
        } else {
          // First message - just scroll to show it at top with small padding
          const messageEl = messageElement as HTMLElement;
          scrollTarget = messageEl.offsetTop - 16;
        }
        
        scrollContainer.scrollTo({ top: Math.max(0, scrollTarget), behavior: "smooth" });
      } else {
        // Fallback to scrollIntoView if no scroll container found
        messageElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, []);

  const addMessage = useCallback((message: Message) => {
    console.log("[useAIChat] ===== ADD MESSAGE =====", {
      id: message.id,
      role: message.role,
      hasContent: !!message.content,
      hasVideo: !!(message.videoFile || message.videoPreview || message.videoUrl),
      currentMessagesCount: messages.length,
    });
    setMessages((prev) => {
      const newMessages = [...prev, message];
      console.log("[useAIChat] State updated:", {
        previousCount: prev.length,
        newCount: newMessages.length,
        messageIds: newMessages.map(m => m.id),
      });
      return newMessages;
    });
  }, [messages.length]);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    console.log("[useAIChat] ===== UPDATE MESSAGE =====", {
      id,
      updates,
      activeChatId: activeChatIdRef.current,
      currentChatId: getCurrentChatId(),
    });
    
    // Check if chat has changed - if so, don't update messages
    const currentChatId = getCurrentChatId();
    if (activeChatIdRef.current !== currentChatId) {
      console.warn(`[useAIChat] Ignoring message update - chat changed from ${activeChatIdRef.current} to ${currentChatId}`);
      return;
    }
    
    setMessages((prev) => {
      const messageExists = prev.find(m => m.id === id);
      console.log("[useAIChat] Updating message in state:", {
        messageExists: !!messageExists,
        previousCount: prev.length,
        updatingId: id,
      });
      
      const updated = prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg));
      console.log("[useAIChat] Updated messages:", {
        newCount: updated.length,
        updatedMessage: updated.find(m => m.id === id),
      });
      
      return updated;
    });
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
    scrollMessageToTop,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
  };
}

