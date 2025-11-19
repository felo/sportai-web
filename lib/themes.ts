/**
 * Theme configuration system
 * 
 * To add a new theme:
 * 1. Add a new theme object below
 * 2. Update the theme selector in your app
 * 3. Apply the theme by setting CSS variables
 */

export type ThemeName = "light" | "dark" | "sport" | "ocean" | "forest";

export interface Theme {
  name: ThemeName;
  colors: {
    // Background colors
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    
    // Primary colors (main brand color)
    primary: string;
    primaryForeground: string;
    primaryHover: string;
    
    // Secondary colors
    secondary: string;
    secondaryForeground: string;
    
    // Accent colors (for highlights, CTAs)
    accent: string;
    accentForeground: string;
    
    // Muted colors (for subtle backgrounds)
    muted: string;
    mutedForeground: string;
    
    // Border and divider colors
    border: string;
    input: string;
    
    // Status colors
    success: string;
    successForeground: string;
    error: string;
    errorForeground: string;
    warning: string;
    warningForeground: string;
    
    // Interactive states
    hover: string;
    hoverForeground: string;
    
    // Overlay (for modals, dropdowns)
    overlay: string;
    
    // Tooltip
    tooltip: string;
    tooltipForeground: string;
  };
}

export const themes: Record<ThemeName, Theme> = {
  light: {
    name: "light",
    colors: {
      background: "0 0% 100%",
      foreground: "222.2 84% 4.9%",
      card: "0 0% 100%",
      cardForeground: "222.2 84% 4.9%",
      primary: "221.2 83.2% 53.3%", // blue-600
      primaryForeground: "0 0% 100%",
      primaryHover: "221.2 83.2% 48.3%", // blue-700
      secondary: "210 40% 96.1%",
      secondaryForeground: "222.2 47.4% 11.2%",
      accent: "34 89% 63%", // green-500
      accentForeground: "0 0% 100%",
      muted: "210 40% 96.1%",
      mutedForeground: "215.4 16.3% 46.9%",
      border: "214.3 31.8% 91.4%",
      input: "214.3 31.8% 91.4%",
      success: "142 76% 36%", // green-600
      successForeground: "0 0% 100%",
      error: "0 84.2% 60.2%", // red-600
      errorForeground: "0 0% 100%",
      warning: "38 92% 50%",
      warningForeground: "0 0% 100%",
      hover: "210 40% 96.1%",
      hoverForeground: "222.2 47.4% 11.2%",
      overlay: "0 0% 0% / 0.5",
      tooltip: "222.2 84% 4.9%",
      tooltipForeground: "0 0% 100%",
    },
  },
  dark: {
    name: "dark",
    colors: {
      background: "222.2 84% 4.9%",
      foreground: "210 40% 98%",
      card: "222.2 84% 4.9%",
      cardForeground: "210 40% 98%",
      primary: "217.2 91.2% 59.8%", // blue-500
      primaryForeground: "222.2 84% 4.9%",
      primaryHover: "221.2 83.2% 53.3%", // blue-600
      secondary: "217.2 32.6% 17.5%",
      secondaryForeground: "210 40% 98%",
      accent: "34 89% 63%",
      accentForeground: "0 0% 100%",
      muted: "217.2 32.6% 17.5%",
      mutedForeground: "215 20.2% 65.1%",
      border: "217.2 32.6% 17.5%",
      input: "217.2 32.6% 17.5%",
      success: "142 71% 45%",
      successForeground: "0 0% 100%",
      error: "0 62.8% 30.6%",
      errorForeground: "0 0% 100%",
      warning: "38 92% 50%",
      warningForeground: "0 0% 100%",
      hover: "217.2 32.6% 17.5%",
      hoverForeground: "210 40% 98%",
      overlay: "0 0% 0% / 0.5",
      tooltip: "217.2 32.6% 17.5%",
      tooltipForeground: "210 40% 98%",
    },
  },
  sport: {
    name: "sport",
    colors: {
      background: "0 0% 98%",
      foreground: "240 10% 3.9%",
      card: "0 0% 100%",
      cardForeground: "240 10% 3.9%",
      primary: "0 84.2% 60.2%", // red-600 (sporty red)
      primaryForeground: "0 0% 100%",
      primaryHover: "0 72.4% 50.6%", // red-700
      secondary: "0 0% 96.1%",
      secondaryForeground: "240 5.9% 10%",
      accent: "142 76% 36%", // green-600
      accentForeground: "0 0% 100%",
      muted: "0 0% 96.1%",
      mutedForeground: "240 3.8% 46.1%",
      border: "240 5.9% 90%",
      input: "240 5.9% 90%",
      success: "142 76% 36%",
      successForeground: "0 0% 100%",
      error: "0 84.2% 60.2%",
      errorForeground: "0 0% 100%",
      warning: "38 92% 50%",
      warningForeground: "0 0% 100%",
      hover: "0 0% 96.1%",
      hoverForeground: "240 5.9% 10%",
      overlay: "0 0% 0% / 0.5",
      tooltip: "240 10% 3.9%",
      tooltipForeground: "0 0% 100%",
    },
  },
  ocean: {
    name: "ocean",
    colors: {
      background: "200 100% 97%",
      foreground: "222 47% 11%",
      card: "0 0% 100%",
      cardForeground: "222 47% 11%",
      primary: "199 89% 48%", // cyan-600
      primaryForeground: "0 0% 100%",
      primaryHover: "199 89% 43%", // cyan-700
      secondary: "200 50% 95%",
      secondaryForeground: "222 47% 11%",
      accent: "142 76% 36%",
      accentForeground: "0 0% 100%",
      muted: "200 50% 95%",
      mutedForeground: "215 16% 47%",
      border: "200 30% 90%",
      input: "200 30% 90%",
      success: "142 76% 36%",
      successForeground: "0 0% 100%",
      error: "0 84.2% 60.2%",
      errorForeground: "0 0% 100%",
      warning: "38 92% 50%",
      warningForeground: "0 0% 100%",
      hover: "200 50% 95%",
      hoverForeground: "222 47% 11%",
      overlay: "200 100% 20% / 0.5",
      tooltip: "222 47% 11%",
      tooltipForeground: "0 0% 100%",
    },
  },
  forest: {
    name: "forest",
    colors: {
      background: "142 20% 97%",
      foreground: "142 70% 10%",
      card: "0 0% 100%",
      cardForeground: "142 70% 10%",
      primary: "142 76% 36%", // green-600
      primaryForeground: "0 0% 100%",
      primaryHover: "142 71% 45%", // green-700
      secondary: "142 30% 95%",
      secondaryForeground: "142 70% 10%",
      accent: "34 89% 63%",
      accentForeground: "0 0% 100%",
      muted: "142 30% 95%",
      mutedForeground: "142 20% 40%",
      border: "142 20% 90%",
      input: "142 20% 90%",
      success: "142 76% 36%",
      successForeground: "0 0% 100%",
      error: "0 84.2% 60.2%",
      errorForeground: "0 0% 100%",
      warning: "38 92% 50%",
      warningForeground: "0 0% 100%",
      hover: "142 30% 95%",
      hoverForeground: "142 70% 10%",
      overlay: "142 100% 10% / 0.5",
      tooltip: "142 70% 10%",
      tooltipForeground: "0 0% 100%",
    },
  },
};

/**
 * Apply a theme by setting CSS variables
 */
export function applyTheme(themeName: ThemeName) {
  const theme = themes[themeName];
  const root = document.documentElement;
  
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
  
  // Store theme preference
  if (typeof window !== "undefined") {
    localStorage.setItem("theme", themeName);
  }
}

/**
 * Get the current theme from localStorage or system preference
 */
export function getInitialTheme(): ThemeName {
  if (typeof window === "undefined") return "light";
  
  const stored = localStorage.getItem("theme") as ThemeName | null;
  if (stored && themes[stored]) return stored;
  
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

