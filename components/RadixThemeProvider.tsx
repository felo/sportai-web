"use client";

import { Theme } from "@radix-ui/themes";
import { useEffect, useState } from "react";

type Appearance = "light" | "dark";
type AccentColor = "blue" | "green" | "red" | "orange" | "purple" | "cyan" | "teal" | "jade" | "violet" | "iris" | "indigo" | "plum" | "pink" | "crimson" | "ruby" | "tomato" | "amber" | "yellow" | "lime" | "mint" | "grass" | "sky" | "bronze" | "gold" | "brown";
type GrayColor = "gray" | "mauve" | "slate" | "sage" | "olive" | "sand";

export function RadixThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>("dark");
  const [accentColor, setAccentColor] = useState<AccentColor>("mint");
  const [grayColor, setGrayColor] = useState<GrayColor>("gray");

  useEffect(() => {
    // Force dark theme - always use dark mode
    // Clear any light theme preference from localStorage
    const stored = localStorage.getItem("radix-theme");
    if (stored) {
      try {
        const theme = JSON.parse(stored);
        // Update stored theme to ensure appearance is always dark
        const updatedTheme = {
          ...theme,
          appearance: "dark",
          accentColor: theme.accentColor || "mint",
          grayColor: theme.grayColor || "gray",
        };
        localStorage.setItem("radix-theme", JSON.stringify(updatedTheme));
        setAppearance("dark");
        setAccentColor(updatedTheme.accentColor);
        setGrayColor(updatedTheme.grayColor);
      } catch (e) {
        // Invalid stored theme, use defaults and save
        const defaultTheme = { appearance: "dark", accentColor: "mint", grayColor: "gray" };
        localStorage.setItem("radix-theme", JSON.stringify(defaultTheme));
        setAppearance("dark");
        setAccentColor("mint");
        setGrayColor("gray");
      }
    } else {
      // No stored theme, save dark theme as default
      const defaultTheme = { appearance: "dark", accentColor: "mint", grayColor: "gray" };
      localStorage.setItem("radix-theme", JSON.stringify(defaultTheme));
      setAppearance("dark");
      setAccentColor("mint");
      setGrayColor("gray");
    }

    // Listen for theme changes (but still force dark appearance)
    const handleThemeChange = () => {
      const stored = localStorage.getItem("radix-theme");
      if (stored) {
        try {
          const theme = JSON.parse(stored);
          // Always force dark appearance, but allow accent/gray color changes
          const updatedTheme = {
            ...theme,
            appearance: "dark",
            accentColor: theme.accentColor || "mint",
            grayColor: theme.grayColor || "gray",
          };
          localStorage.setItem("radix-theme", JSON.stringify(updatedTheme));
          setAppearance("dark");
          setAccentColor(updatedTheme.accentColor);
          setGrayColor(updatedTheme.grayColor);
        } catch (e) {
          // Invalid stored theme, use defaults
          const defaultTheme = { appearance: "dark", accentColor: "mint", grayColor: "gray" };
          localStorage.setItem("radix-theme", JSON.stringify(defaultTheme));
          setAppearance("dark");
          setAccentColor("mint");
          setGrayColor("gray");
        }
      } else {
        const defaultTheme = { appearance: "dark", accentColor: "mint", grayColor: "gray" };
        localStorage.setItem("radix-theme", JSON.stringify(defaultTheme));
        setAppearance("dark");
        setAccentColor("mint");
        setGrayColor("gray");
      }
    };

    window.addEventListener("theme-change", handleThemeChange);
    return () => window.removeEventListener("theme-change", handleThemeChange);
  }, []);

  return (
    <Theme appearance={appearance} accentColor={accentColor} grayColor={grayColor} radius="medium">
      {children}
    </Theme>
  );
}

