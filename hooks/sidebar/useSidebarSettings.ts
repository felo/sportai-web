"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDeveloperMode,
  setDeveloperMode as saveDeveloperMode,
  getTheatreMode,
  setTheatreMode as saveTheatreMode,
  getHighlightingPreferences,
  updateHighlightingPreference,
  getTTSSettings,
  updateTTSSetting,
  type HighlightingPreferences,
  type TTSSettings,
} from "@/utils/storage";
import type { Appearance, SidebarSettingsState } from "@/components/sidebar/types";

export function useSidebarSettings(): SidebarSettingsState {
  const [appearance, setAppearance] = useState<Appearance>("dark");
  const [developerMode, setDeveloperMode] = useState(false);
  const [theatreMode, setTheatreMode] = useState(true);
  const [highlightingPrefs, setHighlightingPrefs] = useState<HighlightingPreferences>({
    terminology: true,
    technique: true,
    timestamps: true,
    swings: true,
  });
  const [ttsSettings, setTTSSettings] = useState<TTSSettings>({
    enabled: false,
    quality: "studio",
    gender: "male",
    language: "en-GB",
    speakingRate: 0.75,
    pitch: 0.0,
  });

  // Initial load and event listeners
  useEffect(() => {
    // Load current appearance from localStorage
    const stored = localStorage.getItem("radix-theme");
    if (stored) {
      try {
        const theme = JSON.parse(stored);
        setAppearance(theme.appearance || "dark");
      } catch (e) {
        // Invalid stored theme
      }
    }

    // Load developer mode from localStorage
    setDeveloperMode(getDeveloperMode());

    // Load theatre mode from localStorage
    setTheatreMode(getTheatreMode());

    // Load highlighting preferences from localStorage
    setHighlightingPrefs(getHighlightingPreferences());

    // Load TTS settings
    setTTSSettings(getTTSSettings());

    // Listen for theme changes
    const handleThemeChange = () => {
      const stored = localStorage.getItem("radix-theme");
      if (stored) {
        try {
          const theme = JSON.parse(stored);
          setAppearance(theme.appearance || "dark");
        } catch (e) {
          // Invalid stored theme
        }
      }
    };

    // Listen for highlighting preferences changes
    const handleHighlightingPreferencesChange = () => {
      setHighlightingPrefs(getHighlightingPreferences());
    };

    // Listen for TTS settings changes
    const handleTTSSettingsChange = () => {
      setTTSSettings(getTTSSettings());
    };

    window.addEventListener("theme-change", handleThemeChange);
    window.addEventListener("highlighting-preferences-change", handleHighlightingPreferencesChange);
    window.addEventListener("tts-settings-change", handleTTSSettingsChange);

    return () => {
      window.removeEventListener("theme-change", handleThemeChange);
      window.removeEventListener("highlighting-preferences-change", handleHighlightingPreferencesChange);
      window.removeEventListener("tts-settings-change", handleTTSSettingsChange);
    };
  }, []);

  const handleThemeSelect = useCallback((newAppearance: Appearance) => {
    const stored = localStorage.getItem("radix-theme");
    let theme = { appearance: newAppearance, accentColor: "mint", grayColor: "gray" };

    if (stored) {
      try {
        theme = { ...JSON.parse(stored), appearance: newAppearance };
      } catch (e) {
        // Invalid stored theme, use defaults
      }
    }

    localStorage.setItem("radix-theme", JSON.stringify(theme));
    setAppearance(newAppearance);
    window.dispatchEvent(new Event("theme-change"));
  }, []);

  const handleDeveloperModeToggle = useCallback((checked: boolean) => {
    setDeveloperMode(checked);
    saveDeveloperMode(checked);
    // Dispatch custom event for components listening to developer mode changes
    window.dispatchEvent(new CustomEvent("developer-mode-change"));
  }, []);

  const handleTheatreModeToggle = useCallback((checked: boolean) => {
    setTheatreMode(checked);
    saveTheatreMode(checked);
    // Dispatch custom event for components listening to theatre mode changes
    window.dispatchEvent(new CustomEvent("theatre-mode-change"));
  }, []);

  const handleHighlightingToggle = useCallback(
    (key: keyof HighlightingPreferences, checked: boolean) => {
      updateHighlightingPreference(key, checked);
      // State will be updated via event handler
    },
    []
  );

  const handleTTSSettingChange = useCallback(
    <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => {
      updateTTSSetting(key, value);
      // State will be updated via event handler
    },
    []
  );

  return {
    appearance,
    developerMode,
    theatreMode,
    highlightingPrefs,
    ttsSettings,
    handleThemeSelect,
    handleDeveloperModeToggle,
    handleTheatreModeToggle,
    handleHighlightingToggle,
    handleTTSSettingChange,
  };
}





