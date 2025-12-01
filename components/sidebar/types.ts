import type { Chat } from "@/types/chat";
import type { HighlightingPreferences, TTSSettings } from "@/utils/storage";

export type Appearance = "light" | "dark" | "green";

export interface SidebarProps {
  children?: React.ReactNode;
  onClearChat?: () => void;
  messageCount?: number;
  onChatSwitchAttempt?: () => Promise<boolean> | boolean;
}

// Chat management state and handlers
export interface SidebarChatsState {
  chats: Chat[];
  currentChatId: string | undefined;
  hoveredChatId: string | null;
  setHoveredChatId: (id: string | null) => void;
  isLoading: boolean;
  handleCreateChat: () => Promise<void>;
  handleDeleteChat: (chatId: string) => Promise<void>;
  handleSwitchChat: (chatId: string) => Promise<void>;
  handleClearLastChat: (chatId: string) => Promise<void>;
  refreshChats: () => Promise<void>;
}

// Settings state and handlers
export interface SidebarSettingsState {
  appearance: Appearance;
  developerMode: boolean;
  theatreMode: boolean;
  highlightingPrefs: HighlightingPreferences;
  ttsSettings: TTSSettings;
  handleThemeSelect: (theme: Appearance) => void;
  handleDeveloperModeToggle: (enabled: boolean) => void;
  handleTheatreModeToggle: (enabled: boolean) => void;
  handleHighlightingToggle: (key: keyof HighlightingPreferences, checked: boolean) => void;
  handleTTSSettingChange: <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => void;
}

// Dialog state and handlers
export interface SidebarDialogsState {
  alertOpen: boolean;
  setAlertOpen: (open: boolean) => void;
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  editingChat: Chat | null;
  setEditingChat: (chat: Chat | null) => void;
  editTitle: string;
  setEditTitle: (title: string) => void;
  storageDebugOpen: boolean;
  setStorageDebugOpen: (open: boolean) => void;
}

// Chat list item props
export interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  isHovered: boolean;
  isMobile: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// Chat list props
export interface ChatListProps {
  chats: Chat[];
  currentChatId?: string;
  hoveredChatId: string | null;
  isMobile: boolean;
  chatsExpanded: boolean;
  isLoading?: boolean;
  onToggleExpanded: () => void;
  onHoverChat: (chatId: string | null) => void;
  onChatClick: (chatId: string) => void;
  onChatEdit: (chat: Chat) => void;
  onChatDelete: (chatId: string) => void;
}

// New chat button props
export interface NewChatButtonProps {
  onClick: () => void;
}

// Library button props
export interface LibraryButtonProps {
  onClick?: () => void;
  isActive?: boolean;
  onNavigationAttempt?: () => Promise<boolean> | boolean;
}

// Navigation props
export interface SidebarNavigationProps {
  onLinkClick?: () => void;
}

// Dialogs props
export interface SidebarDialogsProps {
  alertOpen: boolean;
  setAlertOpen: (open: boolean) => void;
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  editingChat: Chat | null;
  setEditingChat: (chat: Chat | null) => void;
  editTitle: string;
  setEditTitle: (title: string) => void;
  storageDebugOpen: boolean;
  setStorageDebugOpen: (open: boolean) => void;
  developerMode: boolean;
  messageCount: number;
  onClearChat?: () => void;
  onEditChatSave: (chatId: string, newTitle: string) => Promise<void>;
  closeSidebar?: () => void;
}






