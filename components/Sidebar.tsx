"use client";

import { useState, useEffect } from "react";
import { Box, Flex, Button, Text, Separator, DropdownMenu, AlertDialog, Dialog, TextField } from "@radix-ui/themes";
import { Cross2Icon, HamburgerMenuIcon, GearIcon, TrashIcon, SunIcon, PlusIcon, ChevronDownIcon, ChevronRightIcon, Pencil1Icon } from "@radix-ui/react-icons";
import { useSidebar } from "./SidebarContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getDeveloperMode, setDeveloperMode as saveDeveloperMode, loadChatsFromStorage, getCurrentChatId, setCurrentChatId as saveCurrentChatId, createChat, deleteChat, updateChat } from "@/utils/storage";
import type { Chat } from "@/types/chat";

type Appearance = "light" | "dark";

interface SidebarProps {
  children?: React.ReactNode;
  onClearChat?: () => void;
  messageCount?: number;
}

export function Sidebar({ children, onClearChat, messageCount = 0 }: SidebarProps) {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [alertOpen, setAlertOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>("dark");
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const [developerMode, setDeveloperMode] = useState(false);
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
      const updatedChats = loadChatsFromStorage();
      const updatedCurrentChatId = getCurrentChatId();
      setChats(updatedChats);
      setCurrentChatId(updatedCurrentChatId);
    };
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("chat-storage-change", handleChatStorageChange);
    
    return () => {
      window.removeEventListener("theme-change", handleThemeChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("chat-storage-change", handleChatStorageChange);
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
  };

  // Don't render sidebar on mobile
  if (isMobile) {
    return null;
  }

  return (
    <Box
      style={{
        position: "fixed",
        left: 0,
        top: 0, // Full height from top
        bottom: 0,
        width: isCollapsed ? "64px" : "280px",
        backgroundColor: "var(--gray-2)",
        borderRight: "1px solid var(--gray-6)",
        transition: "width 0.2s ease-in-out",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        padding: "var(--space-4)",
        paddingTop: "calc(var(--space-4) + 57px)", // Account for header height on desktop
      }}
    >
      {/* Toggle Button - Aligned with header */}
      <Box
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "57px", // Match header height
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-end",
          padding: isCollapsed ? "0" : "0 var(--space-4)",
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

      {/* Sidebar Content */}
      {!isCollapsed && (
        <Box style={{ flex: 1, overflowY: "auto" }}>
          {children || (
            <Flex direction="column" gap="3">
              <Button
                variant="ghost"
                size="2"
                onClick={() => {
                  const newChat = createChat();
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
                  <Flex direction="column" gap="1" style={{ paddingLeft: "calc(16px + var(--space-1) + var(--space-2))", paddingTop: "var(--space-2)", paddingBottom: "var(--space-2)" }}>
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
                            onClick={() => {
                              saveCurrentChatId(chat.id);
                              // State will be updated via event handler
                            }}
                            style={{
                              justifyContent: "flex-start",
                              padding: "var(--space-2) var(--space-3)",
                              width: "100%",
                            }}
                          >
                            <Text size="2" color={currentChatId === chat.id ? undefined : "gray"} style={{ flex: 1, textAlign: "left" }}>
                              {chat.title}
                            </Text>
                          </Button>
                          {hoveredChatId === chat.id && (
                            <Flex
                              gap="4"
                              style={{
                                position: "absolute",
                                right: "var(--space-2)",
                                top: "50%",
                                transform: "translateY(-45%)",
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteChat(chat.id);
                                  const updatedChats = loadChatsFromStorage();
                                  setChats(updatedChats);
                                  if (currentChatId === chat.id) {
                                    const newCurrentChatId = updatedChats.length > 0 ? updatedChats[0].id : undefined;
                                    setCurrentChatId(newCurrentChatId);
                                    saveCurrentChatId(newCurrentChatId);
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
                  >
                    <Text size="2">SportAI Platform</Text>
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
                  >
                    <Text size="2">API Documentation</Text>
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
                  >
                    <Text size="2">Contact Us</Text>
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
                  >
                    <Text size="2">About Us</Text>
                  </a>
                </Button>
              </Flex>
            </Flex>
          )}
        </Box>
      )}

      {/* Settings Button - Bottom Left */}
      <Box
        style={{
          position: "absolute",
          bottom: "var(--space-4)",
          left: "var(--space-4)",
          right: "var(--space-4)",
        }}
      >
        <DropdownMenu.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenu.Trigger>
            <Button
              variant="ghost"
              size="2"
              style={{
                width: "100%",
                justifyContent: isCollapsed ? "center" : "flex-start",
                padding: isCollapsed ? "var(--space-2)" : "var(--space-2) var(--space-3)",
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
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>
                <SunIcon width="16" height="16" />
                <Text ml="2">Themes</Text>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item 
                  disabled
                  onSelect={(e) => e.preventDefault()}
                >
                  <Text>Light</Text>
                  <Text ml="auto" size="1" color="gray">Coming soon</Text>
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

