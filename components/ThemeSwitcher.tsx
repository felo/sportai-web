"use client";

import { useState, useEffect } from "react";
import * as Select from "@radix-ui/react-select";
import { applyTheme, getInitialTheme, themes, type ThemeName } from "@/lib/themes";

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(getInitialTheme());

  useEffect(() => {
    applyTheme(currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, [currentTheme]);

  const handleThemeChange = (theme: ThemeName) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
  };

  return (
    <Select.Root value={currentTheme} onValueChange={handleThemeChange}>
      <Select.Trigger className="px-3 py-1.5 text-sm border border-border rounded-md bg-card text-foreground hover:bg-hover transition-colors">
        <Select.Value>
          <span className="capitalize">{currentTheme}</span>
        </Select.Value>
        <Select.Icon className="ml-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="bg-card border border-border rounded-md shadow-lg p-1 z-50 min-w-[120px]">
          <Select.Viewport>
            {Object.keys(themes).map((themeName) => (
              <Select.Item
                key={themeName}
                value={themeName}
                className="px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-hover hover:text-hoverForeground focus:bg-hover focus:text-hoverForeground outline-none capitalize"
              >
                <Select.ItemText>{themeName}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

