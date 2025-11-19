"use client";

import { Theme } from "@radix-ui/themes";
import { useEffect, useState } from "react";

type Appearance = "light" | "dark";
type AccentColor = "blue" | "green" | "red" | "orange" | "purple" | "cyan" | "teal" | "jade" | "violet" | "iris" | "indigo" | "plum" | "pink" | "crimson" | "ruby" | "tomato" | "amber" | "yellow" | "lime" | "mint" | "grass" | "sky" | "bronze" | "gold" | "brown";
type GrayColor = "gray" | "mauve" | "slate" | "sage" | "olive" | "sand";

export function RadixThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>("light");
  const [accentColor, setAccentColor] = useState<AccentColor>("blue");
  const [grayColor, setGrayColor] = useState<GrayColor>("gray");

  useEffect(() => {
    // Load theme from localStorage
    const stored = localStorage.getItem("radix-theme");
    if (stored) {
      try {
        const theme = JSON.parse(stored);
        setAppearance(theme.appearance || "light");
        setAccentColor(theme.accentColor || "blue");
        setGrayColor(theme.grayColor || "gray");
      } catch (e) {
        // Invalid stored theme, use defaults
      }
    } else {
      // Check system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setAppearance(prefersDark ? "dark" : "light");
    }

    // Listen for theme changes
    const handleThemeChange = () => {
      const stored = localStorage.getItem("radix-theme");
      if (stored) {
        try {
          const theme = JSON.parse(stored);
          setAppearance(theme.appearance || "light");
          setAccentColor(theme.accentColor || "blue");
          setGrayColor(theme.grayColor || "gray");
        } catch (e) {
          // Invalid stored theme
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

