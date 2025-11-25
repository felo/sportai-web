"use client";

import { Theme } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { initTheatreModeResizeListener } from "@/utils/storage";

type Appearance = "light" | "dark";
type AccentColor = "blue" | "green" | "red" | "orange" | "purple" | "cyan" | "teal" | "jade" | "violet" | "iris" | "indigo" | "plum" | "pink" | "crimson" | "ruby" | "tomato" | "amber" | "yellow" | "lime" | "mint" | "grass" | "sky" | "bronze" | "gold" | "brown";
type GrayColor = "gray" | "mauve" | "slate" | "sage" | "olive" | "sand";

export function RadixThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>("dark");
  const [accentColor, setAccentColor] = useState<AccentColor>("mint");
  const [grayColor, setGrayColor] = useState<GrayColor>("gray");

  useEffect(() => {
    // Initialize theatre mode resize listener (handles height breakpoint)
    initTheatreModeResizeListener();
    
    // Load theme from localStorage, defaulting to dark if not set
    const stored = localStorage.getItem("radix-theme");
    if (stored) {
      try {
        const theme = JSON.parse(stored);
        setAppearance(theme.appearance || "dark");
        setAccentColor(theme.accentColor || "mint");
        setGrayColor(theme.grayColor || "gray");
        // Set HTML attribute for CSS selectors
        document.documentElement.setAttribute("data-theme", theme.appearance || "dark");
      } catch (e) {
        // Invalid stored theme, use defaults
        const defaultTheme = { appearance: "dark", accentColor: "mint", grayColor: "gray" };
        localStorage.setItem("radix-theme", JSON.stringify(defaultTheme));
        setAppearance("dark");
        setAccentColor("mint");
        setGrayColor("gray");
        document.documentElement.setAttribute("data-theme", "dark");
      }
    } else {
      // No stored theme, save dark theme as default
      const defaultTheme = { appearance: "dark", accentColor: "mint", grayColor: "gray" };
      localStorage.setItem("radix-theme", JSON.stringify(defaultTheme));
      setAppearance("dark");
      setAccentColor("mint");
      setGrayColor("gray");
      document.documentElement.setAttribute("data-theme", "dark");
    }

    // Listen for theme changes
    const handleThemeChange = () => {
      const stored = localStorage.getItem("radix-theme");
      if (stored) {
        try {
          const theme = JSON.parse(stored);
          setAppearance(theme.appearance || "dark");
          setAccentColor(theme.accentColor || "mint");
          setGrayColor(theme.grayColor || "gray");
          // Update HTML attribute
          document.documentElement.setAttribute("data-theme", theme.appearance || "dark");
        } catch (e) {
          // Invalid stored theme, use defaults
          const defaultTheme = { appearance: "dark", accentColor: "mint", grayColor: "gray" };
          localStorage.setItem("radix-theme", JSON.stringify(defaultTheme));
          setAppearance("dark");
          setAccentColor("mint");
          setGrayColor("gray");
          document.documentElement.setAttribute("data-theme", "dark");
        }
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

