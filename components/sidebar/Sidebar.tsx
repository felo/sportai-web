"use client";

import { useCallback } from "react";
import { Box, Flex, Button, Text } from "@radix-ui/themes";
import { Cross2Icon, HamburgerMenuIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { useSidebar } from "@/components/SidebarContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { UserMenu } from "@/components/auth/UserMenu";
import { useSidebarChats, useSidebarSettings, useSidebarDialogs } from "@/hooks/sidebar";
import { updateExistingChat } from "@/utils/storage-unified";
import { SidebarContent } from "./SidebarContent";
import { SidebarDialogs } from "./SidebarDialogs";
import type { SidebarProps } from "./types";
import type { Chat } from "@/types/chat";

export function Sidebar({ children, onClearChat, messageCount = 0, onChatSwitchAttempt }: SidebarProps) {
  const { isCollapsed, isInitialLoad, toggleSidebar, closeSidebar } = useSidebar();
  const isMobile = useIsMobile();

  // Business logic hooks
  const chatsState = useSidebarChats({
    onChatSwitchAttempt,
    onClearChat,
    closeSidebar: isMobile ? closeSidebar : undefined,
  });

  const settingsState = useSidebarSettings();
  const dialogsState = useSidebarDialogs();

  // Handle edit chat - opens dialog
  const handleEditChat = useCallback((chat: Chat) => {
    dialogsState.setEditingChat(chat);
    dialogsState.setEditTitle(chat.title);
    dialogsState.setEditDialogOpen(true);
  }, [dialogsState]);

  // Handle save edit chat
  const handleEditChatSave = useCallback(async (chatId: string, newTitle: string) => {
    await updateExistingChat(chatId, { title: newTitle }, false);
    await chatsState.refreshChats();
  }, [chatsState]);

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
              zIndex: 10000, // Above floating video (9999)
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
            zIndex: 10001, // Above floating video (9999)
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
            <SidebarContent
              chats={chatsState.chats}
              currentChatId={chatsState.currentChatId}
              hoveredChatId={chatsState.hoveredChatId}
              isMobile={true}
              isLoading={chatsState.isLoading}
              onHoverChat={chatsState.setHoveredChatId}
              onCreateChat={chatsState.handleCreateChat}
              onSwitchChat={chatsState.handleSwitchChat}
              onEditChat={handleEditChat}
              onDeleteChat={chatsState.handleDeleteChat}
              onLinkClick={closeSidebar}
              onNavigationAttempt={onChatSwitchAttempt}
            />
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
                appearance={settingsState.appearance}
                theatreMode={settingsState.theatreMode}
                developerMode={settingsState.developerMode}
                highlightingPrefs={settingsState.highlightingPrefs}
                ttsSettings={settingsState.ttsSettings}
                messageCount={messageCount}
                isMobile={isMobile}
                onThemeSelect={settingsState.handleThemeSelect}
                onTheatreModeToggle={settingsState.handleTheatreModeToggle}
                onDeveloperModeToggle={settingsState.handleDeveloperModeToggle}
                onHighlightingToggle={settingsState.handleHighlightingToggle}
                onTTSSettingChange={settingsState.handleTTSSettingChange}
                onClearChat={onClearChat}
                onOpenStorageDebug={() => {
                  dialogsState.setDropdownOpen(false);
                  dialogsState.setStorageDebugOpen(true);
                }}
                onSetAlertOpen={dialogsState.setAlertOpen}
              />
            </Flex>
          </Box>
        </Box>

        {/* Dialogs */}
        <SidebarDialogs
          alertOpen={dialogsState.alertOpen}
          setAlertOpen={dialogsState.setAlertOpen}
          editDialogOpen={dialogsState.editDialogOpen}
          setEditDialogOpen={dialogsState.setEditDialogOpen}
          editingChat={dialogsState.editingChat}
          setEditingChat={dialogsState.setEditingChat}
          editTitle={dialogsState.editTitle}
          setEditTitle={dialogsState.setEditTitle}
          storageDebugOpen={dialogsState.storageDebugOpen}
          setStorageDebugOpen={dialogsState.setStorageDebugOpen}
          developerMode={settingsState.developerMode}
          messageCount={messageCount}
          onClearChat={onClearChat}
          onEditChatSave={handleEditChatSave}
          closeSidebar={closeSidebar}
        />
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
        transition: isInitialLoad ? "none" : "width 0.2s ease-in-out",
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
          justifyContent: isCollapsed ? "center" : "space-between",
          padding: isCollapsed ? "0" : "0 var(--space-4)",
          height: "57px",
          flexShrink: 0,
        }}
      >
        {/* Logo - fades in when sidebar expands */}
        <Box
          style={{
            opacity: isCollapsed ? 0 : 1,
            transition: "opacity 0.2s ease-in-out",
            display: "flex",
            alignItems: "center",
            pointerEvents: isCollapsed ? "none" : "auto",
          }}
        >
          {!isCollapsed && (
            <Image
              src="https://res.cloudinary.com/djtxhrly7/image/upload/v1765579947/SportAI_Open_Horizontal_light_ajy8ld.svg"
              alt="SportAI"
              width={120*1.5}
              height={38*1.5}
              priority
              style={{ objectFit: "contain", height: "auto", display: "block" }}
            />
          )}
        </Box>

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
        {!isCollapsed &&
          (children || (
            <SidebarContent
              chats={chatsState.chats}
              currentChatId={chatsState.currentChatId}
              hoveredChatId={chatsState.hoveredChatId}
              isMobile={false}
              isLoading={chatsState.isLoading}
              onHoverChat={chatsState.setHoveredChatId}
              onCreateChat={chatsState.handleCreateChat}
              onSwitchChat={chatsState.handleSwitchChat}
              onEditChat={handleEditChat}
              onDeleteChat={chatsState.handleDeleteChat}
              onNavigationAttempt={onChatSwitchAttempt}
            />
          ))}
      </Box>

      {/* User Menu & Settings - Row 3: Fixed at bottom */}
      <Box
        style={{
          padding: isCollapsed ? "var(--space-3)" : "var(--space-4)",
          borderTop: isCollapsed ? "none" : "1px solid var(--gray-6)",
          display: "flex",
          flexDirection: "column",
          alignItems: isCollapsed ? "center" : "stretch",
          gap: "var(--space-3)",
          justifyContent: isCollapsed ? "center" : "flex-start",
          flexShrink: 0,
        }}
      >
        <UserMenu
          appearance={settingsState.appearance}
          theatreMode={settingsState.theatreMode}
          developerMode={settingsState.developerMode}
          highlightingPrefs={settingsState.highlightingPrefs}
          ttsSettings={settingsState.ttsSettings}
          messageCount={messageCount}
          isMobile={isMobile}
          collapsed={isCollapsed}
          onThemeSelect={settingsState.handleThemeSelect}
          onTheatreModeToggle={settingsState.handleTheatreModeToggle}
          onDeveloperModeToggle={settingsState.handleDeveloperModeToggle}
          onHighlightingToggle={settingsState.handleHighlightingToggle}
          onTTSSettingChange={settingsState.handleTTSSettingChange}
          onClearChat={onClearChat}
          onOpenStorageDebug={() => {
            dialogsState.setDropdownOpen(false);
            dialogsState.setStorageDebugOpen(true);
          }}
          onSetAlertOpen={dialogsState.setAlertOpen}
        />
      </Box>

      {/* Dialogs */}
      <SidebarDialogs
        alertOpen={dialogsState.alertOpen}
        setAlertOpen={dialogsState.setAlertOpen}
        editDialogOpen={dialogsState.editDialogOpen}
        setEditDialogOpen={dialogsState.setEditDialogOpen}
        editingChat={dialogsState.editingChat}
        setEditingChat={dialogsState.setEditingChat}
        editTitle={dialogsState.editTitle}
        setEditTitle={dialogsState.setEditTitle}
        storageDebugOpen={dialogsState.storageDebugOpen}
        setStorageDebugOpen={dialogsState.setStorageDebugOpen}
        developerMode={settingsState.developerMode}
        messageCount={messageCount}
        onClearChat={onClearChat}
        onEditChatSave={handleEditChatSave}
      />
    </Box>
  );
}

