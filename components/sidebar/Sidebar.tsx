"use client";

import { useCallback } from "react";
import { Box, Flex, Button, Text } from "@radix-ui/themes";
import { Cross2Icon, ViewVerticalIcon, Pencil2Icon } from "@radix-ui/react-icons";
import { useSidebar } from "@/components/SidebarContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { UserMenu } from "@/components/auth/UserMenu";
import { BadgeWithTooltip, IconButton } from "@/components/ui";
import { useSidebarChats, useSidebarSettings, useSidebarDialogs } from "@/hooks/sidebar";
import { updateExistingChat } from "@/utils/storage-unified";
import { resetAllOnboardingTooltips } from "@/utils/storage/settings/onboarding-tooltips";
import { getDisplayVersion, getFullVersion, getBuildInfo } from "@/lib/version";
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
              {/* Version Badge */}
              <BadgeWithTooltip
                text={getDisplayVersion()}
                tooltip={`${getFullVersion()} • ${getBuildInfo()}`}
                variant="soft"
                color="gray"
                radius="full"
                size="1"
                style={{
                  fontFamily: "var(--font-mono, 'Courier New', monospace)",
                  fontSize: "11px",
                  fontWeight: "500",
                  letterSpacing: "0.02em",
                  padding: "3px 10px",
                  alignSelf: "flex-start",
                }}
              />
              <UserMenu
                appearance={settingsState.appearance}
                theatreMode={settingsState.theatreMode}
                developerMode={settingsState.developerMode}
                highlightingPrefs={settingsState.highlightingPrefs}
                ttsSettings={settingsState.ttsSettings}
                insightLevel={settingsState.insightLevel}
                messageCount={messageCount}
                isMobile={isMobile}
                onThemeSelect={settingsState.handleThemeSelect}
                onTheatreModeToggle={settingsState.handleTheatreModeToggle}
                onDeveloperModeToggle={settingsState.handleDeveloperModeToggle}
                onHighlightingToggle={settingsState.handleHighlightingToggle}
                onTTSSettingChange={settingsState.handleTTSSettingChange}
                onInsightLevelChange={settingsState.handleInsightLevelChange}
                onClearChat={onClearChat}
                onOpenStorageDebug={() => {
                  dialogsState.setDropdownOpen(false);
                  dialogsState.setStorageDebugOpen(true);
                }}
                onOpenContextDebug={() => {
                  dialogsState.setDropdownOpen(false);
                  dialogsState.setContextDebugOpen(true);
                }}
                onOpenRedisDebug={() => {
                  dialogsState.setDropdownOpen(false);
                  dialogsState.setRedisDebugOpen(true);
                }}
                onResetOnboardingTips={() => {
                  resetAllOnboardingTooltips();
                  dialogsState.setDropdownOpen(false);
                  // Force page reload to see the tooltips again
                  window.location.reload();
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
          contextDebugOpen={dialogsState.contextDebugOpen}
          setContextDebugOpen={dialogsState.setContextDebugOpen}
          redisDebugOpen={dialogsState.redisDebugOpen}
          setRedisDebugOpen={dialogsState.setRedisDebugOpen}
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
        top: "57px",
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
      {/* Toggle Button - Row 1 */}
      {isCollapsed ? (
        <Flex
          direction="column"
          align="center"
          gap="3"
          style={{
            padding: "var(--space-4)",
            paddingTop: "var(--space-6)",
            flexShrink: 0,
          }}
        >
          <IconButton
            icon={<ViewVerticalIcon style={{ color: "var(--gray-12)" }} />}
            onClick={toggleSidebar}
            tooltip="Open sidebar"
            tooltipDelay={1000}
            ariaLabel="Open sidebar"
            iconWidth={17}
            iconHeight={17}
          />

          <IconButton
            icon={<Pencil2Icon style={{ color: "var(--gray-12)" }} />}
            onClick={chatsState.handleCreateChat}
            tooltip="New chat"
            tooltipDelay={1000}
            ariaLabel="New chat"
            iconWidth={19}
            iconHeight={19}
          />
        </Flex>
      ) : (
        <Flex
          direction="column"
          gap="3"
          style={{
            padding: "var(--space-4)",
            paddingTop: "var(--space-6)",
            flexShrink: 0,
          }}
        >
          <Button
            variant="ghost"
            size="2"
            onClick={toggleSidebar}
            style={{
              justifyContent: "flex-start",
              padding: "var(--space-2) var(--space-3)",
            }}
          >
            <ViewVerticalIcon width="17" height="17" />
            <Text size="2" ml="2">
              Close sidebar
            </Text>
          </Button>
          <Button
            variant="ghost"
            size="2"
            onClick={chatsState.handleCreateChat}
            style={{
              justifyContent: "flex-start",
              padding: "var(--space-2) var(--space-3)",
            }}
          >
            <Pencil2Icon width="19" height="19" />
            <Text size="2" ml="2">
              New chat
            </Text>
          </Button>
        </Flex>
      )}

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
              onSwitchChat={chatsState.handleSwitchChat}
              onEditChat={handleEditChat}
              onDeleteChat={chatsState.handleDeleteChat}
            />
          ))}
      </Box>

      {/* Footer - Row 3: Version Badge */}
      {!isCollapsed && (
        <Box
          style={{
            padding: "var(--space-4)",
            borderTop: "1px solid var(--gray-6)",
            flexShrink: 0,
          }}
        >
          <BadgeWithTooltip
            text={getDisplayVersion()}
            tooltip={`${getFullVersion()} • ${getBuildInfo()}`}
            variant="soft"
            color="gray"
            radius="full"
            size="1"
            style={{
              fontFamily: "var(--font-mono, 'Courier New', monospace)",
              fontSize: "11px",
              fontWeight: "500",
              letterSpacing: "0.02em",
              padding: "3px 10px",
            }}
          />
        </Box>
      )}

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
        contextDebugOpen={dialogsState.contextDebugOpen}
        setContextDebugOpen={dialogsState.setContextDebugOpen}
        redisDebugOpen={dialogsState.redisDebugOpen}
        setRedisDebugOpen={dialogsState.setRedisDebugOpen}
        developerMode={settingsState.developerMode}
        messageCount={messageCount}
        onClearChat={onClearChat}
        onEditChatSave={handleEditChatSave}
      />
    </Box>
  );
}
