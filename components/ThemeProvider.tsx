"use client";

import { useEffect } from "react";
import { applyTheme, getInitialTheme, type ThemeName } from "@/lib/themes";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeName;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  useEffect(() => {
    const theme = defaultTheme || getInitialTheme();
    applyTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [defaultTheme]);

  return <>{children}</>;
}

