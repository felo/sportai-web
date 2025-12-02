"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const SIDEBAR_STORAGE_KEY = "sportai-sidebar-collapsed";

interface SidebarContextType {
  isCollapsed: boolean;
  isInitialLoad: boolean;
  isHydrated: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Start with collapsed to avoid hydration mismatch, then load from storage
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  // Track if this is the initial load (to skip animation)
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load saved state from localStorage after hydration
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
    setIsHydrated(true);
    
    // After a brief delay, mark initial load as complete to enable animations
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  // Save state to localStorage when it changes (after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
    }
  }, [isCollapsed, isHydrated]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const closeSidebar = () => {
    setIsCollapsed(true);
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, isInitialLoad, isHydrated, toggleSidebar, closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

