"use client";

import { useState, useEffect, useCallback } from "react";
import { Box, Flex, Button, Text, Separator, DropdownMenu, AlertDialog, Dialog, TextField } from "@radix-ui/themes";
import { Cross2Icon, HamburgerMenuIcon, GearIcon, TrashIcon, SunIcon, PlusIcon, ChevronDownIcon, ChevronRightIcon, Pencil1Icon, GlobeIcon, FileTextIcon, EnvelopeClosedIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { useSidebar } from "./SidebarContext";
import buttonStyles from "@/styles/buttons.module.css";
import { useIsMobile } from "@/hooks/useIsMobile";
import { NavigationLink, EmptyState } from "@/components/ui";
import { UserMenu } from "@/components/auth/UserMenu";
import { SupabaseDebug } from "@/components/auth/SupabaseDebug";
import { getDeveloperMode, setDeveloperMode as saveDeveloperMode, getTheatreMode, setTheatreMode as saveTheatreMode, getHighlightingPreferences, updateHighlightingPreference, getTTSSettings, updateTTSSetting, type HighlightingPreferences, type TTSSettings } from "@/utils/storage";
import { getCurrentChatId, setCurrentChatId as saveCurrentChatId, createNewChat, deleteExistingChat, updateExistingChat, loadChats } from "@/utils/storage-unified";
import type { Chat } from "@/types/chat";

type Appearance = "light" | "dark";

interface SidebarProps {
  children?: React.ReactNode;
  onClearChat?: () => void;
  messageCount?: number;
  onChatSwitchAttempt?: () => Promise<boolean> | boolean;
}

export function Sidebar({ children, onClearChat, messageCount = 0, onChatSwitchAttempt }: SidebarProps) {
  const { isCollapsed, toggleSidebar, closeSidebar } = useSidebar();
  const [alertOpen, setAlertOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>("dark");
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const [developerMode, setDeveloperMode] = useState(false);
  const [theatreMode, setTheatreMode] = useState(true);
  const [highlightingPrefs, setHighlightingPrefs] = useState<HighlightingPreferences>({
    terminology: true,
    technique: true,
    timestamps: true,
    swings: true,
  });
  const [ttsSettings, setTTSSettings] = useState<TTSSettings>({
    enabled: false,
    quality: "studio",
    gender: "male",
    language: "en-GB",
    speakingRate: 0.75,
    pitch: 0.0,
  });
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(undefined);
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChat, setEditingChat] = useState<Chat | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [storageDebugOpen, setStorageDebugOpen] = useState(false);
  const isMobile = useIsMobile();

  // Helper to load chats from the appropriate source
  const refreshChats = useCallback(async () => {
    const loadedChats = await loadChats();
    setChats(loadedChats);
  }, []);

  useEffect(() => {
    // Load current appearance from localStorage
    const stored = localStorage.getItem("radix-theme");
    if (stored) {
      try {
        const theme = JSON.parse(stored);
        setAppearance(theme.appearance || "dark");
      } catch (e) {
        // Invalid stored theme
      }
    }

    // Load developer mode from localStorage
    setDeveloperMode(getDeveloperMode());
    
    // Load theatre mode from localStorage
    setTheatreMode(getTheatreMode());

    // Load highlighting preferences from localStorage
    setHighlightingPrefs(getHighlightingPreferences());

    // Load chats (from Supabase if authenticated, localStorage otherwise)
    refreshChats();
    setCurrentChatId(getCurrentChatId());

    // Listen for theme changes
    const handleThemeChange = () => {
      const stored = localStorage.getItem("radix-theme");
      if (stored) {
        try {
          const theme = JSON.parse(stored);
          setAppearance(theme.appearance || "dark");
        } catch (e) {
          // Invalid stored theme
        }
      }
    };

    window.addEventListener("theme-change", handleThemeChange);
    
    // Listen for chat storage changes (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sportai-chats" || e.key === "sportai-current-chat-id" || !e.key) {
        refreshChats();
        setCurrentChatId(getCurrentChatId());
      }
    };
    
    // Listen for chat storage changes (from same tab - custom event)
    const handleChatStorageChange = () => {
      // Use requestAnimationFrame to ensure React processes the state update
      // This ensures the UI updates even if the event fires synchronously
      requestAnimationFrame(() => {
        refreshChats();
        setCurrentChatId(getCurrentChatId());
      });
    };

    // Listen for highlighting preferences changes
    const handleHighlightingPreferencesChange = () => {
      setHighlightingPrefs(getHighlightingPreferences());
    };
    
    // Load TTS settings
    setTTSSettings(getTTSSettings());
    
    // Listen for TTS settings changes
    const handleTTSSettingsChange = () => {
      setTTSSettings(getTTSSettings());
    };
    
    // Listen for auth state changes (sign in/out)
    const handleAuthStateChange = () => {
      console.log("[Sidebar] Auth state changed, refreshing chats...");
      refreshChats();
    };
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("chat-storage-change", handleChatStorageChange);
    window.addEventListener("highlighting-preferences-change", handleHighlightingPreferencesChange);
    window.addEventListener("tts-settings-change", handleTTSSettingsChange);
    window.addEventListener("auth-state-change", handleAuthStateChange);
    
    return () => {
      window.removeEventListener("theme-change", handleThemeChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("chat-storage-change", handleChatStorageChange);
      window.removeEventListener("highlighting-preferences-change", handleHighlightingPreferencesChange);
      window.removeEventListener("tts-settings-change", handleTTSSettingsChange);
      window.removeEventListener("auth-state-change", handleAuthStateChange);
    };
  }, [refreshChats]);

  const handleThemeSelect = (newAppearance: Appearance) => {
    const stored = localStorage.getItem("radix-theme");
    let theme = { appearance: newAppearance, accentColor: "mint", grayColor: "gray" };
    
    if (stored) {
      try {
        theme = { ...JSON.parse(stored), appearance: newAppearance };
      } catch (e) {
        // Invalid stored theme, use defaults
      }
    }
    
    localStorage.setItem("radix-theme", JSON.stringify(theme));
    setAppearance(newAppearance);
    window.dispatchEvent(new Event("theme-change"));
  };

  const handleDeveloperModeToggle = (checked: boolean) => {
    setDeveloperMode(checked);
    saveDeveloperMode(checked);
    // Dispatch custom event for components listening to developer mode changes
    window.dispatchEvent(new CustomEvent("developer-mode-change"));
  };

  const handleTheatreModeToggle = (checked: boolean) => {
    setTheatreMode(checked);
    saveTheatreMode(checked);
    // Dispatch custom event for components listening to theatre mode changes
    window.dispatchEvent(new CustomEvent("theatre-mode-change"));
  };

  const handleHighlightingToggle = (key: keyof HighlightingPreferences, checked: boolean) => {
    updateHighlightingPreference(key, checked);
    // State will be updated via event handler
  };

  const handleTTSSettingChange = <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => {
    updateTTSSetting(key, value);
    // State will be updated via event handler
  };

  // Mobile: Full screen overlay when open
  if (isMobile) {
    return (
      <>
        {/* Backdrop overlay */}
        {!isCollapsed && (
          <Box
            onClick={closeSidebar}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 30,
              transition: "opacity 0.2s ease-in-out",
            }}
          />
        )}
        
        {/* Sidebar */}
        <Box
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            width: "100%",
            backgroundColor: "var(--gray-2)",
            transform: isCollapsed ? "translateX(-100%)" : "translateX(0)",
            transition: "transform 0.3s ease-in-out",
            zIndex: 40,
            display: "flex",
            flexDirection: "column",
            paddingTop: "calc(var(--space-4) + env(safe-area-inset-top))",
            paddingBottom: "calc(var(--space-4) + env(safe-area-inset-bottom))",
          }}
        >
          {/* Close button */}
          <Box
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "flex-end",
              paddingRight: "var(--space-4)",
              marginBottom: "var(--space-4)",
            }}
          >
            <Button
              variant="ghost"
              size="2"
              onClick={closeSidebar}
              style={{
                minWidth: "32px",
                width: "32px",
                height: "32px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Cross2Icon width="20" height="20" />
            </Button>
          </Box>

          {/* Scrollable content area */}
          <Box
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "0 var(--space-4)",
            }}
          >
            <Flex 
              direction="column" 
              gap="3"
            >
            {/* New Chat Button */}
            <Button
              variant="ghost"
              size="2"
              onClick={async () => {
                // Check if chat is thinking before creating new chat
                if (onChatSwitchAttempt) {
                  const result = await Promise.resolve(onChatSwitchAttempt());
                  if (!result) {
                    return; // User cancelled
                  }
                }
                const newChat = await createNewChat();
                saveCurrentChatId(newChat.id);
                closeSidebar(); // Close sidebar after creating new chat
                // State will be updated via event handler
              }}
              style={{
                justifyContent: "flex-start",
                padding: "var(--space-2) var(--space-3)",
              }}
            >
              <PlusIcon width="16" height="16" />
              <Text size="2" ml="2">
                New chat
              </Text>
            </Button>

            {/* Chats Section */}
            <Flex direction="column" gap="2">
              <Button
                variant="ghost"
                size="2"
                onClick={() => setChatsExpanded(!chatsExpanded)}
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
                  Chats
                </Text>
              </Button>
              {chatsExpanded && (
                <Flex direction="column" gap="1" style={{ paddingTop: "var(--space-2)", paddingBottom: "var(--space-2)" }}>
                  {chats.length === 0 ? (
                    <EmptyState message="No chats yet" />
                  ) : (
                    chats.map((chat) => (
                      <Flex
                        key={chat.id}
                        align="center"
                        gap="2"
                        style={{
                          position: "relative",
                        }}
                      >
                        <Button
                          variant={currentChatId === chat.id ? "soft" : "ghost"}
                          size="2"
                          onClick={async () => {
                            // Don't warn if clicking on the same chat
                            if (currentChatId !== chat.id) {
                              // Check if chat is thinking before switching
                              if (onChatSwitchAttempt) {
                                const result = await Promise.resolve(onChatSwitchAttempt());
                                if (!result) {
                                  return; // User cancelled
                                }
                              }
                            }
                            saveCurrentChatId(chat.id);
                            closeSidebar(); // Close sidebar after selecting chat
                            // State will be updated via event handler
                          }}
                          style={{
                            justifyContent: "flex-start",
                            padding: "var(--space-2) var(--space-3)",
                            paddingRight: "var(--space-8)",
                            flex: 1,
                            height: "auto",
                            minHeight: "32px",
                            whiteSpace: "normal",
                            wordWrap: "break-word",
                          }}
                        >
                          <Text 
                            size="2" 
                            color={currentChatId === chat.id ? undefined : "gray"} 
                            style={{ 
                              textAlign: "left",
                              wordBreak: "break-word",
                              overflowWrap: "break-word",
                              whiteSpace: "normal",
                              lineHeight: "1.4",
                            }}
                          >
                            {chat.title}
                          </Text>
                        </Button>
                        {/* Always show edit/delete on mobile - right aligned */}
                        <Flex
                          gap="3"
                          style={{
                            position: "absolute",
                            right: "var(--space-2)",
                            alignItems: "center",
                          }}
                        >
                          <Button
                            variant="ghost"
                            size="1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChat(chat);
                              setEditTitle(chat.title);
                              setEditDialogOpen(true);
                            }}
                            style={{
                              padding: "var(--space-1)",
                              minWidth: "auto",
                              width: "24px",
                              height: "24px",
                            }}
                          >
                            <Pencil1Icon width="14" height="14"/>
                          </Button>
                          <Button
                            variant="ghost"
                            size="1"
                            color="red"
                            onClick={async (e) => {
                              e.stopPropagation();
                              // If deleting the current chat while it's thinking, warn the user
                              if (currentChatId === chat.id && onChatSwitchAttempt) {
                                const result = await Promise.resolve(onChatSwitchAttempt());
                                if (!result) {
                                  return; // User cancelled
                                }
                              }
                              
                              // Check if this is the last chat - if so, clear it instead of deleting
                              if (chats.length === 1) {
                                // Last chat - clear messages instead of deleting
                                console.log("[Sidebar] Last chat - clearing messages instead of deleting");
                                await updateExistingChat(chat.id, { messages: [] }, false);
                                // Refresh chat list
                                await refreshChats();
                                // Also clear the chat in the UI state
                                if (currentChatId === chat.id && onClearChat) {
                                  onClearChat();
                                }
                              } else {
                                // Not the last chat - delete normally
                                await deleteExistingChat(chat.id);
                                await refreshChats();
                                if (currentChatId === chat.id) {
                                  // Switch to the first available chat
                                  const newCurrentChatId = chats.find(c => c.id !== chat.id)?.id;
                                  setCurrentChatId(newCurrentChatId);
                                  saveCurrentChatId(newCurrentChatId);
                                }
                              }
                            }}
                            style={{
                              padding: "var(--space-1)",
                              minWidth: "auto",
                              width: "24px",
                              height: "24px",
                            }}
                          >
                            <TrashIcon width="14" height="14"/>
                          </Button>
                        </Flex>
                      </Flex>
                    ))
                  )}
                </Flex>
              )}
            </Flex>
            
            <Separator size="4" />
            
            {/* Navigation Links */}
            <Flex direction="column" gap="2">
              <NavigationLink
                href="https://sportai.com/platform"
                label="SportAI Platform"
                icon={<GlobeIcon />}
                onClick={closeSidebar}
                external
              />
              <NavigationLink
                href="https://sportai.mintlify.app/api-reference/introduction"
                label="API Documentation"
                icon={<FileTextIcon />}
                onClick={closeSidebar}
                external
              />
              <NavigationLink
                href="https://sportai.com/contact"
                label="Contact Us"
                icon={<EnvelopeClosedIcon />}
                onClick={closeSidebar}
                external
              />
              <NavigationLink
                href="https://sportai.com/about-us"
                label="About Us"
                icon={<InfoCircledIcon />}
                onClick={closeSidebar}
                external
              />
            </Flex>
            </Flex>
          </Box>

          {/* User Menu & Settings - Docked to bottom */}
          <Box
            style={{
              borderTop: "1px solid var(--gray-6)",
              padding: "var(--space-4)",
            }}
          >
            <Flex direction="column" gap="3">
              <UserMenu 
                appearance={appearance}
                theatreMode={theatreMode}
                developerMode={developerMode}
                highlightingPrefs={highlightingPrefs}
                ttsSettings={ttsSettings}
                messageCount={messageCount}
                isMobile={isMobile}
                onThemeSelect={handleThemeSelect}
                onTheatreModeToggle={handleTheatreModeToggle}
                onDeveloperModeToggle={handleDeveloperModeToggle}
                onHighlightingToggle={handleHighlightingToggle}
                onTTSSettingChange={handleTTSSettingChange}
                onClearChat={onClearChat}
                onOpenStorageDebug={() => {
                  setDropdownOpen(false);
                  setStorageDebugOpen(true);
                }}
                onSetAlertOpen={setAlertOpen}
              />
            </Flex>
          </Box>
        </Box>

        {/* Alert Dialog for clearing chat */}
        {messageCount > 0 && onClearChat && (
          <AlertDialog.Root open={alertOpen} onOpenChange={setAlertOpen}>
            <AlertDialog.Content maxWidth="450px">
              <AlertDialog.Title>Clear chat history?</AlertDialog.Title>
              <AlertDialog.Description size="2">
                This will permanently delete all messages in this conversation. This action cannot be undone.
              </AlertDialog.Description>
              <Flex gap="3" mt="4" justify="end">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button 
                    variant="solid" 
                    color="red"
                    onClick={() => {
                      onClearChat();
                      setAlertOpen(false);
                      setDropdownOpen(false);
                      closeSidebar();
                    }}
                  >
                    Clear
                  </Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        )}

        {/* Edit Chat Dialog */}
        <Dialog.Root open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <Dialog.Content maxWidth="450px">
            <Dialog.Title>Edit chat name</Dialog.Title>
            <Dialog.Description size="2" mb="4">
              Change the name of this chat.
            </Dialog.Description>
            
            <Flex direction="column" gap="3" mt="4">
              <TextField.Root
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Chat name"
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && editTitle.trim() && editingChat) {
                    e.preventDefault();
                    await updateExistingChat(editingChat.id, { title: editTitle.trim() }, false);
                    await refreshChats();
                    setEditDialogOpen(false);
                    setEditingChat(null);
                    setEditTitle("");
                  }
                }}
              />
              
              <Flex gap="3" justify="end" mt="2">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  className={buttonStyles.actionButton}
                  onClick={async () => {
                    if (editTitle.trim() && editingChat) {
                      await updateExistingChat(editingChat.id, { title: editTitle.trim() }, false);
                      await refreshChats();
                      setEditDialogOpen(false);
                      setEditingChat(null);
                      setEditTitle("");
                    }
                  }}
                  disabled={!editTitle.trim()}
                >
                  Save
                </Button>
              </Flex>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>

        {/* Storage Debug Dialog */}
        {developerMode && (
          <Dialog.Root open={storageDebugOpen} onOpenChange={setStorageDebugOpen}>
            <Dialog.Content maxWidth="600px">
              <Dialog.Title>Storage Debug</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                View and debug local storage and Supabase data.
              </Dialog.Description>
              <Box style={{ maxHeight: "500px", overflowY: "auto" }}>
                <SupabaseDebug />
              </Box>
              <Flex gap="3" justify="end" mt="4">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Close
                  </Button>
                </Dialog.Close>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        )}
      </>
    );
  }

  // Desktop layout
  return (
    <Box
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: isCollapsed ? "64px" : "280px",
        backgroundColor: "var(--gray-2)",
        borderRight: "1px solid var(--gray-6)",
        transition: "width 0.2s ease-in-out",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Toggle Button - Row 1: Aligned with header */}
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-end",
          padding: isCollapsed ? "0" : "0 var(--space-4)",
          height: "57px",
          flexShrink: 0,
        }}
      >
        <Button
          variant="ghost"
          size="2"
          onClick={toggleSidebar}
          style={{
            minWidth: "32px",
            width: "32px",
            height: "32px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isCollapsed ? (
            <HamburgerMenuIcon width="20" height="20" />
          ) : (
            <Cross2Icon width="20" height="20" />
          )}
        </Button>
      </Box>

      {/* Sidebar Content - Row 2: Scrollable */}
      <Box 
        style={{ 
          flex: 1,
          overflowY: isCollapsed ? "hidden" : "auto",
          padding: isCollapsed ? "0" : "var(--space-4)",
          paddingTop: isCollapsed ? "0" : "var(--space-4)",
          paddingBottom: isCollapsed ? "0" : "var(--space-3)",
        }}
      >
        {!isCollapsed && (children || (
          <Flex direction="column" gap="3">
              <Button
                variant="ghost"
                size="2"
                onClick={async () => {
                  // Check if chat is thinking before creating new chat
                  if (onChatSwitchAttempt) {
                    const result = await Promise.resolve(onChatSwitchAttempt());
                    if (!result) {
                      return; // User cancelled
                    }
                  }
                  const newChat = await createNewChat();
                  saveCurrentChatId(newChat.id);
                  // State will be updated via event handler
                }}
                style={{
                  justifyContent: "flex-start",
                  padding: "var(--space-2) var(--space-3)",
                }}
              >
                <PlusIcon width="16" height="16" />
                <Text size="2" ml="2">
                  New chat
                </Text>
              </Button>

              {/* Chats Section */}
              <Flex direction="column" gap="2">
                <Button
                  variant="ghost"
                  size="2"
                  onClick={() => setChatsExpanded(!chatsExpanded)}
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
                    Chats
                  </Text>
                </Button>
                {chatsExpanded && (
                  <Flex direction="column" gap="1" style={{ paddingTop: "var(--space-2)", paddingBottom: "var(--space-2)" }}>
                    {chats.length === 0 ? (
                      <EmptyState message="No chats yet" />
                    ) : (
                      chats.map((chat) => (
                        <Flex
                          key={chat.id}
                          position="relative"
                          onMouseEnter={() => setHoveredChatId(chat.id)}
                          onMouseLeave={() => setHoveredChatId(null)}
                        >
                          <Button
                            variant={currentChatId === chat.id ? "soft" : "ghost"}
                            size="2"
                            onClick={async () => {
                              // Don't switch if already on this chat
                              if (currentChatId === chat.id) {
                                return;
                              }
                              
                              // Check if current chat is thinking before switching
                              if (onChatSwitchAttempt) {
                                const result = await Promise.resolve(onChatSwitchAttempt());
                                if (!result) {
                                  return; // User cancelled
                                }
                              }
                              
                              // If switching from a chat with no messages, delete it
                              if (currentChatId) {
                                const allChats = await loadChats();
                                const currentChat = allChats.find(c => c.id === currentChatId);
                                if (currentChat && currentChat.messages.length === 0) {
                                  // Check if this is not the last chat
                                  if (allChats.length > 1) {
                                    await deleteExistingChat(currentChatId);
                                    await refreshChats();
                                  } else {
                                    // If it's the last chat, just clear it instead
                                    if (onClearChat) {
                                      onClearChat();
                                    }
                                  }
                                } else if (currentChat && currentChat.messages.length > 0) {
                                  // Only check onChatSwitchAttempt if there are messages
                                  if (onChatSwitchAttempt) {
                                    const result = await Promise.resolve(onChatSwitchAttempt());
                                    if (!result) {
                                      return; // User cancelled
                                    }
                                  }
                                }
                              }
                              saveCurrentChatId(chat.id);
                              // State will be updated via event handler
                            }}
                            style={{
                              justifyContent: "flex-start",
                              padding: "var(--space-2) var(--space-3)",
                              width: "100%",
                              height: "auto",
                              minHeight: "32px",
                              whiteSpace: "normal",
                              wordWrap: "break-word",
                            }}
                          >
                            <Text 
                              size="2" 
                              color={currentChatId === chat.id ? undefined : "gray"} 
                              style={{ 
                                flex: 1, 
                                textAlign: "left",
                                wordBreak: "break-word",
                                overflowWrap: "break-word",
                                whiteSpace: "normal",
                                lineHeight: "1.4",
                              }}
                            >
                              {chat.title}
                            </Text>
                          </Button>
                          {hoveredChatId === chat.id && (
                            <Flex
                              gap="3"
                              style={{
                                position: "absolute",
                                right: "var(--space-2)",
                                alignItems: "center",
                              }}
                            >
                              <Button
                                variant="ghost"
                                size="1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingChat(chat);
                                  setEditTitle(chat.title);
                                  setEditDialogOpen(true);
                                }}
                                style={{
                                  padding: "var(--space-1)",
                                  minWidth: "auto",
                                  width: "24px",
                                  height: "24px",
                                }}
                              >
                                <Pencil1Icon width="14" height="14"/>
                              </Button>
                              <Button
                                variant="ghost"
                                size="1"
                                color="red"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  // If deleting the current chat while it's thinking, warn the user
                                  if (currentChatId === chat.id && onChatSwitchAttempt) {
                                    const result = await Promise.resolve(onChatSwitchAttempt());
                                    if (!result) {
                                      return; // User cancelled
                                    }
                                  }
                                  
                                  // Check if this is the last chat - if so, clear it instead of deleting
                                  if (chats.length === 1) {
                                    // Last chat - clear messages instead of deleting
                                    console.log("[Sidebar] Last chat - clearing messages instead of deleting");
                                    await updateExistingChat(chat.id, { messages: [] }, false);
                                    // Refresh chat list
                                    await refreshChats();
                                    // Also clear the chat in the UI state
                                    if (currentChatId === chat.id && onClearChat) {
                                      onClearChat();
                                    }
                                  } else {
                                    // Not the last chat - delete normally
                                    await deleteExistingChat(chat.id);
                                    await refreshChats();
                                    if (currentChatId === chat.id) {
                                      // Switch to the first available chat
                                      const newCurrentChatId = chats.find(c => c.id !== chat.id)?.id;
                                      setCurrentChatId(newCurrentChatId);
                                      saveCurrentChatId(newCurrentChatId);
                                    }
                                  }
                                }}
                                style={{
                                  padding: "var(--space-1)",
                                  minWidth: "auto",
                                  width: "24px",
                                  height: "24px",
                                }}
                              >
                                <TrashIcon width="14" height="14"/>
                              </Button>
                            </Flex>
                          )}
                        </Flex>
                      ))
                    )}
                    </Flex>
                  )}
                </Flex>
            
            <Separator size="4" />
            
            {/* Navigation Links */}
            <Flex direction="column" gap="2">
              <NavigationLink
                href="https://sportai.com/platform"
                label="SportAI Platform"
                icon={<GlobeIcon />}
                onClick={closeSidebar}
                external
              />
              <NavigationLink
                href="https://sportai.mintlify.app/api-reference/introduction"
                label="API Documentation"
                icon={<FileTextIcon />}
                onClick={closeSidebar}
                external
              />
              <NavigationLink
                href="https://sportai.com/contact"
                label="Contact Us"
                icon={<EnvelopeClosedIcon />}
                onClick={closeSidebar}
                external
              />
              <NavigationLink
                href="https://sportai.com/about-us"
                label="About Us"
                icon={<InfoCircledIcon />}
                onClick={closeSidebar}
                external
              />
            </Flex>
          </Flex>
        ))}
      </Box>

      {/* User Menu & Settings - Row 3: Fixed at bottom */}
      <Box
        style={{
          padding: isCollapsed ? "var(--space-5)" : "var(--space-4)",
          borderTop: isCollapsed ? "none" : "1px solid var(--gray-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          justifyContent: isCollapsed ? "center" : "flex-start",
          flexShrink: 0,
        }}
      >
        {!isCollapsed && <UserMenu 
          appearance={appearance}
          theatreMode={theatreMode}
          developerMode={developerMode}
          highlightingPrefs={highlightingPrefs}
          ttsSettings={ttsSettings}
          messageCount={messageCount}
          isMobile={isMobile}
          onThemeSelect={handleThemeSelect}
          onTheatreModeToggle={handleTheatreModeToggle}
          onDeveloperModeToggle={handleDeveloperModeToggle}
          onHighlightingToggle={handleHighlightingToggle}
          onTTSSettingChange={handleTTSSettingChange}
          onClearChat={onClearChat}
          onOpenStorageDebug={() => {
            setDropdownOpen(false);
            setStorageDebugOpen(true);
          }}
          onSetAlertOpen={setAlertOpen}
        />}
      </Box>

      {/* Alert Dialog for clearing chat */}
      {messageCount > 0 && onClearChat && (
        <AlertDialog.Root open={alertOpen} onOpenChange={setAlertOpen}>
          <AlertDialog.Content maxWidth="450px">
            <AlertDialog.Title>Clear chat history?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This will permanently delete all messages in this conversation. This action cannot be undone.
            </AlertDialog.Description>
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button 
                  variant="solid" 
                  color="red"
                  onClick={() => {
                    onClearChat();
                    setAlertOpen(false);
                  }}
                >
                  Clear
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      )}

      {/* Storage Debug Dialog */}
      {developerMode && (
        <Dialog.Root open={storageDebugOpen} onOpenChange={setStorageDebugOpen}>
          <Dialog.Content maxWidth="600px">
            <Dialog.Title>Storage Debug</Dialog.Title>
            <Dialog.Description size="2" mb="4">
              View and debug local storage and Supabase data.
            </Dialog.Description>
            <Box style={{ maxHeight: "500px", overflowY: "auto" }}>
              <SupabaseDebug />
            </Box>
            <Flex gap="3" justify="end" mt="4">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Close
                </Button>
              </Dialog.Close>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      )}

      {/* Edit Chat Dialog - Outside grid flow as it's a modal */}
      <Dialog.Root open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <Dialog.Content maxWidth="450px">
          <Dialog.Title>Edit chat name</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Change the name of this chat.
          </Dialog.Description>
          
          <Flex direction="column" gap="3" mt="4">
            <TextField.Root
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Chat name"
              onKeyDown={async (e) => {
                if (e.key === "Enter" && editTitle.trim() && editingChat) {
                  e.preventDefault();
                  await updateExistingChat(editingChat.id, { title: editTitle.trim() }, false);
                  await refreshChats();
                  setEditDialogOpen(false);
                  setEditingChat(null);
                  setEditTitle("");
                }
              }}
            />
            
            <Flex gap="3" justify="end" mt="2">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                className={buttonStyles.actionButton}
                onClick={async () => {
                  if (editTitle.trim() && editingChat) {
                    await updateExistingChat(editingChat.id, { title: editTitle.trim() }, false);
                    await refreshChats();
                    setEditDialogOpen(false);
                    setEditingChat(null);
                    setEditTitle("");
                  }
                }}
                disabled={!editTitle.trim()}
              >
                Save
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Storage Debug Dialog (controlled) */}
      <SupabaseDebug open={storageDebugOpen} onOpenChange={setStorageDebugOpen} />
    </Box>
  );
}
