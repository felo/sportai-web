"use client";

import { useState, useEffect } from "react";
import { Box, Flex, Button, Text, Separator, DropdownMenu, AlertDialog, Dialog, TextField } from "@radix-ui/themes";
import { Cross2Icon, HamburgerMenuIcon, GearIcon, TrashIcon, SunIcon, PlusIcon, ChevronDownIcon, ChevronRightIcon, Pencil1Icon, GlobeIcon, FileTextIcon, EnvelopeClosedIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { useSidebar } from "./SidebarContext";
import buttonStyles from "@/styles/buttons.module.css";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getDeveloperMode, setDeveloperMode as saveDeveloperMode, getTheatreMode, setTheatreMode as saveTheatreMode, loadChatsFromStorage, getCurrentChatId, setCurrentChatId as saveCurrentChatId, createChat, deleteChat, updateChat, getHighlightingPreferences, updateHighlightingPreference, getTTSSettings, updateTTSSetting, type HighlightingPreferences, type TTSSettings } from "@/utils/storage";
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
  const isMobile = useIsMobile();

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

    // Load chats from localStorage
    setChats(loadChatsFromStorage());
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
        setChats(loadChatsFromStorage());
        setCurrentChatId(getCurrentChatId());
      }
    };
    
    // Listen for chat storage changes (from same tab - custom event)
    const handleChatStorageChange = () => {
      // Use requestAnimationFrame to ensure React processes the state update
      // This ensures the UI updates even if the event fires synchronously
      requestAnimationFrame(() => {
        const updatedChats = loadChatsFromStorage();
        const updatedCurrentChatId = getCurrentChatId();
        setChats(updatedChats);
        setCurrentChatId(updatedCurrentChatId);
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
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("chat-storage-change", handleChatStorageChange);
    window.addEventListener("highlighting-preferences-change", handleHighlightingPreferencesChange);
    window.addEventListener("tts-settings-change", handleTTSSettingsChange);
    
    return () => {
      window.removeEventListener("theme-change", handleThemeChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("chat-storage-change", handleChatStorageChange);
      window.removeEventListener("highlighting-preferences-change", handleHighlightingPreferencesChange);
      window.removeEventListener("tts-settings-change", handleTTSSettingsChange);
    };
  }, []);

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
                const newChat = createChat();
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
                    <Text size="2" color="gray" style={{ padding: "var(--space-2) var(--space-3)" }}>
                      No chats yet
                    </Text>
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
                              const allChats = loadChatsFromStorage();
                              if (allChats.length === 1) {
                                // Last chat - clear messages instead of deleting
                                console.log("[Sidebar] Last chat - clearing messages instead of deleting");
                                updateChat(chat.id, { messages: [] }, false);
                                // Refresh chat list
                                const updatedChats = loadChatsFromStorage();
                                setChats(updatedChats);
                                // Also clear the chat in the UI state
                                if (currentChatId === chat.id && onClearChat) {
                                  onClearChat();
                                }
                              } else {
                                // Not the last chat - delete normally
                                deleteChat(chat.id);
                                const updatedChats = loadChatsFromStorage();
                                setChats(updatedChats);
                                if (currentChatId === chat.id) {
                                  const newCurrentChatId = updatedChats.length > 0 ? updatedChats[0].id : undefined;
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
              <Button
                variant="ghost"
                size="2"
                asChild
                style={{
                  justifyContent: "flex-start",
                  padding: "var(--space-2) var(--space-3)",
                }}
              >
                <a
                  href="https://sportai.com/platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => closeSidebar()}
                >
                  <GlobeIcon width="16" height="16" />
                  <Text size="2" ml="2">SportAI Platform</Text>
                </a>
              </Button>
              <Button
                variant="ghost"
                size="2"
                asChild
                style={{
                  justifyContent: "flex-start",
                  padding: "var(--space-2) var(--space-3)",
                }}
              >
                <a
                  href="https://sportai.mintlify.app/api-reference/introduction"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => closeSidebar()}
                >
                  <FileTextIcon width="16" height="16" />
                  <Text size="2" ml="2">API Documentation</Text>
                </a>
              </Button>
              <Button
                variant="ghost"
                size="2"
                asChild
                style={{
                  justifyContent: "flex-start",
                  padding: "var(--space-2) var(--space-3)",
                }}
              >
                <a
                  href="https://sportai.com/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => closeSidebar()}
                >
                  <EnvelopeClosedIcon width="16" height="16" />
                  <Text size="2" ml="2">Contact Us</Text>
                </a>
              </Button>
              <Button
                variant="ghost"
                size="2"
                asChild
                style={{
                  justifyContent: "flex-start",
                  padding: "var(--space-2) var(--space-3)",
                }}
              >
                <a
                  href="https://sportai.com/about-us"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => closeSidebar()}
                >
                  <InfoCircledIcon width="16" height="16" />
                  <Text size="2" ml="2">About Us</Text>
                </a>
              </Button>
            </Flex>
            </Flex>
          </Box>

          {/* Settings - Docked to bottom */}
          <Box
            style={{
              borderTop: "1px solid var(--gray-6)",
              padding: "var(--space-4)",
            }}
          >
            <DropdownMenu.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenu.Trigger>
                <Button
                  variant="ghost"
                  size="2"
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    padding: "var(--space-2) var(--space-3)",
                  }}
                >
                  <GearIcon width="20" height="20" />
                  <Text size="2" ml="2">
                    Settings
                  </Text>
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="start">
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger>
                    <SunIcon width="16" height="16" />
                    <Text ml="2">Themes</Text>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent>
                    <DropdownMenu.Item onSelect={() => handleThemeSelect("light")}>
                      <Text>Light</Text>
                      {appearance === "light" && (
                        <Text ml="auto" size="1" color="gray">✓</Text>
                      )}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleThemeSelect("dark")}>
                      <Text>Dark</Text>
                      {appearance === "dark" && (
                        <Text ml="auto" size="1" color="gray">✓</Text>
                      )}
                    </DropdownMenu.Item>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>

                <DropdownMenu.Separator />

                {/* Theatre mode setting - hidden on mobile as it's always on */}
                {!isMobile && (
                  <>
                    <DropdownMenu.Sub>
                      <DropdownMenu.SubTrigger>
                        <Text>Theatre mode</Text>
                      </DropdownMenu.SubTrigger>
                      <DropdownMenu.SubContent>
                        <DropdownMenu.Item onSelect={() => handleTheatreModeToggle(true)}>
                          <Text>On</Text>
                          {theatreMode && (
                            <Text ml="auto" size="1" color="gray">✓</Text>
                          )}
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onSelect={() => handleTheatreModeToggle(false)}>
                          <Text>Off</Text>
                          {!theatreMode && (
                            <Text ml="auto" size="1" color="gray">✓</Text>
                          )}
                        </DropdownMenu.Item>
                      </DropdownMenu.SubContent>
                    </DropdownMenu.Sub>

                    <DropdownMenu.Separator />
                  </>
                )}

                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger>
                    <Text>Developer mode</Text>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent>
                    <DropdownMenu.Item onSelect={() => handleDeveloperModeToggle(true)}>
                      <Text>On</Text>
                      {developerMode && (
                        <Text ml="auto" size="1" color="gray">✓</Text>
                      )}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleDeveloperModeToggle(false)}>
                      <Text>Off</Text>
                      {!developerMode && (
                        <Text ml="auto" size="1" color="gray">✓</Text>
                      )}
                    </DropdownMenu.Item>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>

                <DropdownMenu.Separator />

                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger>
                    <Text>Highlighting</Text>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent>
                    <DropdownMenu.Item onSelect={() => handleHighlightingToggle("terminology", !highlightingPrefs.terminology)}>
                      <Text>Terminology</Text>
                      {highlightingPrefs.terminology && (
                        <Text ml="auto" size="1" color="gray">✓</Text>
                      )}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleHighlightingToggle("technique", !highlightingPrefs.technique)}>
                      <Text>Technique terms</Text>
                      {highlightingPrefs.technique && (
                        <Text ml="auto" size="1" color="gray">✓</Text>
                      )}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleHighlightingToggle("timestamps", !highlightingPrefs.timestamps)}>
                      <Text>Timestamps</Text>
                      {highlightingPrefs.timestamps && (
                        <Text ml="auto" size="1" color="gray">✓</Text>
                      )}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleHighlightingToggle("swings", !highlightingPrefs.swings)}>
                      <Text>Swings</Text>
                      {highlightingPrefs.swings && (
                        <Text ml="auto" size="1" color="gray">✓</Text>
                      )}
                    </DropdownMenu.Item>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>

                <DropdownMenu.Separator />

                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger>
                    <Text>Text-to-Speech</Text>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent>
                    <DropdownMenu.Item onSelect={() => handleTTSSettingChange("enabled", true)}>
                      <Text>On</Text>
                      {ttsSettings.enabled && (
                        <Text ml="auto" size="1" color="gray">✓</Text>
                      )}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleTTSSettingChange("enabled", false)}>
                      <Text>Off</Text>
                      {!ttsSettings.enabled && (
                        <Text ml="auto" size="1" color="gray">✓</Text>
                      )}
                    </DropdownMenu.Item>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>

                <DropdownMenu.Separator />

                <DropdownMenu.Item 
                  color="red"
                  disabled={messageCount === 0 || !onClearChat}
                  onSelect={(e) => {
                    if (messageCount > 0 && onClearChat) {
                      e.preventDefault();
                      setAlertOpen(true);
                    }
                  }}
                >
                  <TrashIcon width="16" height="16" />
                  <Text ml="2">Clear chat history</Text>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editTitle.trim() && editingChat) {
                    e.preventDefault();
                    updateChat(editingChat.id, { title: editTitle.trim() }, false);
                    setChats(loadChatsFromStorage());
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
                  onClick={() => {
                    if (editTitle.trim() && editingChat) {
                      console.log("[Sidebar] Updating chat title:", editingChat.id, "from:", editingChat.title, "to:", editTitle.trim());
                      updateChat(editingChat.id, { title: editTitle.trim() }, false);
                      // Small delay to ensure storage write completes before reloading
                      setTimeout(() => {
                        const updatedChats = loadChatsFromStorage();
                        const updatedChat = updatedChats.find(c => c.id === editingChat.id);
                        console.log("[Sidebar] After update - chat title:", updatedChat?.title);
                        setChats(updatedChats);
                      }, 10);
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
                  const newChat = createChat();
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
                      <Text size="2" color="gray" style={{ padding: "var(--space-2) var(--space-3)" }}>
                        No chats yet
                      </Text>
                    ) : (
                      chats.map((chat) => (
                        <Box
                          key={chat.id}
                          onMouseEnter={() => setHoveredChatId(chat.id)}
                          onMouseLeave={() => setHoveredChatId(null)}
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
                                top: "var(--space-2)",
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
                                  setHoveredChatId(null);
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
                                  const allChats = loadChatsFromStorage();
                                  if (allChats.length === 1) {
                                    // Last chat - clear messages instead of deleting
                                    console.log("[Sidebar] Last chat - clearing messages instead of deleting");
                                    updateChat(chat.id, { messages: [] }, false);
                                    // Refresh chat list
                                    const updatedChats = loadChatsFromStorage();
                                    setChats(updatedChats);
                                    // Also clear the chat in the UI state
                                    if (currentChatId === chat.id && onClearChat) {
                                      onClearChat();
                                    }
                                  } else {
                                    // Not the last chat - delete normally
                                    deleteChat(chat.id);
                                    const updatedChats = loadChatsFromStorage();
                                    setChats(updatedChats);
                                    if (currentChatId === chat.id) {
                                      const newCurrentChatId = updatedChats.length > 0 ? updatedChats[0].id : undefined;
                                      setCurrentChatId(newCurrentChatId);
                                      saveCurrentChatId(newCurrentChatId);
                                    }
                                  }
                                  setHoveredChatId(null);
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
                        </Box>
                      ))
                    )}
                  </Flex>
                )}
              </Flex>
              
              <Separator size="4" />
              <Flex direction="column" gap="2">
                <Button
                  variant="ghost"
                  size="2"
                  asChild
                  style={{
                    justifyContent: "flex-start",
                    padding: "var(--space-2) var(--space-3)",
                  }}
                >
                  <a
                    href="https://sportai.com/platform"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => closeSidebar()}
                  >
                    <GlobeIcon width="16" height="16" />
                    <Text size="2" ml="2">SportAI Platform</Text>
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="2"
                  asChild
                  style={{
                    justifyContent: "flex-start",
                    padding: "var(--space-2) var(--space-3)",
                  }}
                >
                  <a
                    href="https://sportai.mintlify.app/api-reference/introduction"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => closeSidebar()}
                  >
                    <FileTextIcon width="16" height="16" />
                    <Text size="2" ml="2">API Documentation</Text>
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="2"
                  asChild
                  style={{
                    justifyContent: "flex-start",
                    padding: "var(--space-2) var(--space-3)",
                  }}
                >
                  <a
                    href="https://sportai.com/contact"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => closeSidebar()}
                  >
                    <EnvelopeClosedIcon width="16" height="16" />
                    <Text size="2" ml="2">Contact Us</Text>
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="2"
                  asChild
                  style={{
                    justifyContent: "flex-start",
                    padding: "var(--space-2) var(--space-3)",
                  }}
                >
                  <a
                    href="https://sportai.com/about-us"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => closeSidebar()}
                  >
                    <InfoCircledIcon width="16" height="16" />
                    <Text size="2" ml="2">About Us</Text>
                  </a>
                </Button>
              </Flex>
            </Flex>
          ))}
        </Box>

      {/* Settings Button - Row 3: Fixed at bottom */}
      <Box
        style={{
          paddingLeft: isCollapsed ? "var(--space-5)" : "var(--space-4)",
          paddingRight: isCollapsed ? "var(--space-5)" : "var(--space-4)",
          paddingBottom: isCollapsed ? "var(--space-5)" : "var(--space-4)",
          paddingTop: "var(--space-3)",
          borderTop: isCollapsed ? "none" : "1px solid var(--gray-6)",
          display: "flex",
          justifyContent: isCollapsed ? "center" : "flex-start",
          flexShrink: 0,
        }}
      >
        <DropdownMenu.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenu.Trigger>
            <Button
              variant="ghost"
              size="2"
              style={{
                width: isCollapsed ? "32px" : "100%",
                justifyContent: isCollapsed ? "center" : "flex-start",
                padding: isCollapsed ? "0" : "var(--space-2) var(--space-3)",
                minWidth: isCollapsed ? "32px" : "auto",
                height: "32px",
              }}
            >
              <GearIcon width="20" height="20" />
              {!isCollapsed && (
                <Text size="2" ml="2">
                  Settings
                </Text>
              )}
            </Button>
          </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start" side={isCollapsed ? "right" : "top"}>
              {/* APPEARANCE & DISPLAY */}
              <DropdownMenu.Label>
                <Text size="1" weight="medium" style={{ color: "var(--gray-11)" }}>
                  Appearance & Display
                </Text>
              </DropdownMenu.Label>
              
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>
                  <SunIcon width="16" height="16" />
                  <Text ml="2">Theme</Text>
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  <DropdownMenu.Item onSelect={() => handleThemeSelect("light")}>
                    <Text>Light</Text>
                    {appearance === "light" && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => handleThemeSelect("dark")}>
                    <Text>Dark</Text>
                    {appearance === "dark" && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>
              
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>
                  <Text>Theatre mode</Text>
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  <DropdownMenu.Item onSelect={() => handleTheatreModeToggle(true)}>
                    <Text>On</Text>
                    {theatreMode && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => handleTheatreModeToggle(false)}>
                    <Text>Off</Text>
                    {!theatreMode && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>

              <DropdownMenu.Separator />

              {/* CONTENT DISPLAY */}
              <DropdownMenu.Label>
                <Text size="1" weight="medium" style={{ color: "var(--gray-11)" }}>
                  Content Display
                </Text>
              </DropdownMenu.Label>

              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>
                  <Text>Highlighting</Text>
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  <DropdownMenu.Item onSelect={() => handleHighlightingToggle("terminology", !highlightingPrefs.terminology)}>
                    <Text>Terminology</Text>
                    {highlightingPrefs.terminology && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => handleHighlightingToggle("technique", !highlightingPrefs.technique)}>
                    <Text>Technique terms</Text>
                    {highlightingPrefs.technique && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => handleHighlightingToggle("timestamps", !highlightingPrefs.timestamps)}>
                    <Text>Timestamps</Text>
                    {highlightingPrefs.timestamps && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => handleHighlightingToggle("swings", !highlightingPrefs.swings)}>
                    <Text>Swings</Text>
                    {highlightingPrefs.swings && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>

              <DropdownMenu.Separator />

              {/* AUDIO */}
              <DropdownMenu.Label>
                <Text size="1" weight="medium" style={{ color: "var(--gray-11)" }}>
                  Audio
                </Text>
              </DropdownMenu.Label>

              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>
                  <Text>Text-to-Speech</Text>
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  {/* TTS Enable/Disable */}
                  <DropdownMenu.Item onSelect={() => handleTTSSettingChange("enabled", !ttsSettings.enabled)}>
                    <Text>{ttsSettings.enabled ? "Enabled" : "Disabled"}</Text>
                    {ttsSettings.enabled && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  
                  <DropdownMenu.Separator />
                  
                  {/* Voice Quality */}
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      <Text>Voice quality</Text>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("quality", "standard")}>
                        <Text>Standard</Text>
                        {ttsSettings.quality === "standard" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("quality", "wavenet")}>
                        <Text>WaveNet</Text>
                        {ttsSettings.quality === "wavenet" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("quality", "neural2")}>
                        <Text>Neural2 (High)</Text>
                        {ttsSettings.quality === "neural2" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("quality", "studio")}>
                        <Text>Studio (Premium)*</Text>
                        {ttsSettings.quality === "studio" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item disabled>
                        <Text size="1" style={{ color: "var(--gray-10)", fontStyle: "italic" }}>
                          *Limited availability
                        </Text>
                      </DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>

                  {/* Voice Gender */}
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      <Text>Voice gender</Text>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("gender", "male")}>
                        <Text>Male</Text>
                        {ttsSettings.gender === "male" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("gender", "female")}>
                        <Text>Female</Text>
                        {ttsSettings.gender === "female" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("gender", "neutral")}>
                        <Text>Neutral</Text>
                        {ttsSettings.gender === "neutral" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>

                  {/* Language/Accent */}
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      <Text>Language/Accent</Text>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("language", "en-US")}>
                        <Text>English (US)</Text>
                        {ttsSettings.language === "en-US" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("language", "en-GB")}>
                        <Text>English (UK)</Text>
                        {ttsSettings.language === "en-GB" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("language", "en-AU")}>
                        <Text>English (AU)</Text>
                        {ttsSettings.language === "en-AU" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("language", "en-IN")}>
                        <Text>English (India)</Text>
                        {ttsSettings.language === "en-IN" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>

                  {/* Speaking Rate */}
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      <Text>Speaking rate</Text>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("speakingRate", 0.75)}>
                        <Text>Slower (0.75x)</Text>
                        {ttsSettings.speakingRate === 0.75 && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("speakingRate", 1.0)}>
                        <Text>Normal (1.0x)</Text>
                        {ttsSettings.speakingRate === 1.0 && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("speakingRate", 1.25)}>
                        <Text>Faster (1.25x)</Text>
                        {ttsSettings.speakingRate === 1.25 && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("speakingRate", 1.5)}>
                        <Text>Fast (1.5x)</Text>
                        {ttsSettings.speakingRate === 1.5 && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>

                  {/* Pitch */}
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      <Text>Pitch</Text>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("pitch", -5.0)}>
                        <Text>Lower (-5)</Text>
                        {ttsSettings.pitch === -5.0 && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("pitch", 0.0)}>
                        <Text>Normal (0)</Text>
                        {ttsSettings.pitch === 0.0 && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => handleTTSSettingChange("pitch", 5.0)}>
                        <Text>Higher (+5)</Text>
                        {ttsSettings.pitch === 5.0 && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>

              <DropdownMenu.Separator />

              {/* ADVANCED */}
              <DropdownMenu.Label>
                <Text size="1" weight="medium" style={{ color: "var(--gray-11)" }}>
                  Advanced
                </Text>
              </DropdownMenu.Label>

              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>
                  <Text>Developer mode</Text>
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  <DropdownMenu.Item onSelect={() => handleDeveloperModeToggle(true)}>
                    <Text>On</Text>
                    {developerMode && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => handleDeveloperModeToggle(false)}>
                    <Text>Off</Text>
                    {!developerMode && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>

              <DropdownMenu.Separator />

              {/* ACTIONS */}
              <DropdownMenu.Label>
                <Text size="1" weight="medium" style={{ color: "var(--gray-11)" }}>
                  Actions
                </Text>
              </DropdownMenu.Label>

              <DropdownMenu.Item 
                color="red"
                disabled={messageCount === 0 || !onClearChat}
                onSelect={(e) => {
                  if (messageCount > 0 && onClearChat) {
                    e.preventDefault();
                    setAlertOpen(true);
                  }
                }}
              >
                <TrashIcon width="16" height="16" />
                <Text ml="2">Clear chat history</Text>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

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
        </Box>

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
              onKeyDown={(e) => {
                if (e.key === "Enter" && editTitle.trim() && editingChat) {
                  e.preventDefault();
                  updateChat(editingChat.id, { title: editTitle.trim() }, false);
                  setChats(loadChatsFromStorage());
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
                onClick={() => {
                  if (editTitle.trim() && editingChat) {
                    console.log("[Sidebar] Updating chat title:", editingChat.id, "from:", editingChat.title, "to:", editTitle.trim());
                    updateChat(editingChat.id, { title: editTitle.trim() }, false);
                    // Small delay to ensure storage write completes before reloading
                    setTimeout(() => {
                      const updatedChats = loadChatsFromStorage();
                      const updatedChat = updatedChats.find(c => c.id === editingChat.id);
                      console.log("[Sidebar] After update - chat title:", updatedChat?.title);
                      setChats(updatedChats);
                    }, 10);
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
    </Box>
  );
}

