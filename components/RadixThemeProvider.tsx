"use client";

import { Theme } from "@radix-ui/themes";
import { useEffect, useState, useLayoutEffect } from "react";
import { initTheatreModeResizeListener } from "@/utils/storage";

// Custom appearance type that includes our custom themes
type CustomAppearance = "light" | "dark" | "green";
// Radix only supports light/dark, so we map custom themes to dark
type RadixAppearance = "light" | "dark";
type AccentColor = "blue" | "green" | "red" | "orange" | "purple" | "cyan" | "teal" | "jade" | "violet" | "iris" | "indigo" | "plum" | "pink" | "crimson" | "ruby" | "tomato" | "amber" | "yellow" | "lime" | "mint" | "grass" | "sky" | "bronze" | "gold" | "brown";
type GrayColor = "gray" | "mauve" | "slate" | "sage" | "olive" | "sand";

// Helper to get Radix appearance from custom appearance
const getRadixAppearance = (appearance: CustomAppearance): RadixAppearance => {
  // Green and SportAI themes use dark as base
  return appearance === "light" ? "light" : "dark";
};

// Use useLayoutEffect on client, useEffect on server to avoid SSR warnings
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function RadixThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [appearance, setAppearance] = useState<CustomAppearance>("green");
  const [accentColor, setAccentColor] = useState<AccentColor>("mint");
  const [grayColor, setGrayColor] = useState<GrayColor>("gray");

  // Use layout effect to load theme before paint
  useIsomorphicLayoutEffect(() => {
    // Load theme from localStorage, defaulting to green if not set
    const stored = localStorage.getItem("radix-theme");
    if (stored) {
      try {
        const theme = JSON.parse(stored);
        setAppearance(theme.appearance || "green");
        setAccentColor(theme.accentColor || "mint");
        setGrayColor(theme.grayColor || "gray");
        // Set HTML attribute for CSS selectors
        document.documentElement.setAttribute("data-theme", theme.appearance || "green");
      } catch (e) {
        // Invalid stored theme, use defaults
        const defaultTheme = { appearance: "green", accentColor: "mint", grayColor: "gray" };
        localStorage.setItem("radix-theme", JSON.stringify(defaultTheme));
        setAppearance("green");
        setAccentColor("mint");
        setGrayColor("gray");
        document.documentElement.setAttribute("data-theme", "green");
      }
    } else {
      // No stored theme, save green theme as default
      const defaultTheme = { appearance: "green", accentColor: "mint", grayColor: "gray" };
      localStorage.setItem("radix-theme", JSON.stringify(defaultTheme));
      setAppearance("green");
      setAccentColor("mint");
      setGrayColor("gray");
      document.documentElement.setAttribute("data-theme", "green");
    }
    
    // Mark as mounted after theme is loaded
    setMounted(true);
  }, []);

  useEffect(() => {
    // Initialize theatre mode resize listener (handles height breakpoint)
    initTheatreModeResizeListener();

    // Listen for theme changes
    const handleThemeChange = () => {
      const stored = localStorage.getItem("radix-theme");
      if (stored) {
        try {
          const theme = JSON.parse(stored);
          setAppearance(theme.appearance || "green");
          setAccentColor(theme.accentColor || "mint");
          setGrayColor(theme.grayColor || "gray");
          // Update HTML attribute
          document.documentElement.setAttribute("data-theme", theme.appearance || "green");
        } catch (e) {
          // Invalid stored theme, use defaults
          const defaultTheme = { appearance: "green", accentColor: "mint", grayColor: "gray" };
          localStorage.setItem("radix-theme", JSON.stringify(defaultTheme));
          setAppearance("green");
          setAccentColor("mint");
          setGrayColor("gray");
          document.documentElement.setAttribute("data-theme", "green");
        }
      }
    };

    window.addEventListener("theme-change", handleThemeChange);
    return () => window.removeEventListener("theme-change", handleThemeChange);
  }, []);

  // Prevent flash by hiding content until theme is loaded
  // Using visibility instead of display to maintain layout
  return (
    <Theme 
      appearance={getRadixAppearance(appearance)} 
      accentColor={accentColor} 
      grayColor={grayColor} 
      radius="medium"
      style={{ 
        visibility: mounted ? 'visible' : 'hidden',
        // Set background to match theme to prevent white flash
        backgroundColor: 'var(--gray-1)',
      }}
    >
      {children}
    </Theme>
  );
}

