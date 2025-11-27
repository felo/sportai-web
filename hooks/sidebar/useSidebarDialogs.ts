"use client";

import { useState } from "react";
import type { Chat } from "@/types/chat";
import type { SidebarDialogsState } from "@/components/sidebar/types";

export function useSidebarDialogs(): SidebarDialogsState {
  const [alertOpen, setAlertOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChat, setEditingChat] = useState<Chat | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [storageDebugOpen, setStorageDebugOpen] = useState(false);

  return {
    alertOpen,
    setAlertOpen,
    dropdownOpen,
    setDropdownOpen,
    editDialogOpen,
    setEditDialogOpen,
    editingChat,
    setEditingChat,
    editTitle,
    setEditTitle,
    storageDebugOpen,
    setStorageDebugOpen,
  };
}



