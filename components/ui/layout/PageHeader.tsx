"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Box, Flex, Text, DropdownMenu, Button } from "@radix-ui/themes";
import { HamburgerMenuIcon, PersonIcon, ExitIcon, GearIcon, SunIcon } from "@radix-ui/react-icons";
import { UserMenuNavLinks } from "@/components/auth/UserMenuNavLinks";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/components/SidebarContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import { IconButton, LogoNewChatButton, ToggleButton } from "@/components/ui";
import {
  getDeveloperMode,
  setDeveloperMode as saveDeveloperMode,
  getTheatreMode,
  setTheatreMode as saveTheatreMode,
  getHighlightingPreferences,
  updateHighlightingPreference,
  getTTSSettings,
  updateTTSSetting,
  getInsightLevel,
  setInsightLevel as saveInsightLevel,
  type HighlightingPreferences,
  type TTSSettings,
  type InsightLevel,
} from "@/utils/storage";
import { isDeveloperModeAvailable } from "@/utils/storage/settings/developer-mode";
import type { ReactNode } from "react";

type Appearance = "light" | "dark" | "green";

type NavigationMode = "chat" | "studio";

/**
 * NavbarProfile - Compact profile display for the navbar
 * Shows avatar + name + "BETA ACCESS" badge, right-aligned
 * Includes full settings menu
 */
function NavbarProfile() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Settings state
  const [appearance, setAppearance] = useState<Appearance>("green");
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
  const [insightLevel, setInsightLevel] = useState<InsightLevel>("developing");

  // Load settings on mount
  useEffect(() => {
    // Load appearance
    const stored = localStorage.getItem("radix-theme");
    if (stored) {
      try {
        const theme = JSON.parse(stored);
        setAppearance(theme.appearance || "dark");
      } catch {
        // Invalid stored theme
      }
    }
    setDeveloperMode(getDeveloperMode());
    setTheatreMode(getTheatreMode());
    setHighlightingPrefs(getHighlightingPreferences());
    setTTSSettings(getTTSSettings());
    setInsightLevel(getInsightLevel());

    // Event listeners for settings changes
    const handleThemeChange = () => {
      const stored = localStorage.getItem("radix-theme");
      if (stored) {
        try {
          const theme = JSON.parse(stored);
          setAppearance(theme.appearance || "dark");
        } catch {
          // Invalid
        }
      }
    };
    const handleHighlightingChange = () => setHighlightingPrefs(getHighlightingPreferences());
    const handleTTSChange = () => setTTSSettings(getTTSSettings());
    const handleInsightChange = () => setInsightLevel(getInsightLevel());

    window.addEventListener("theme-change", handleThemeChange);
    window.addEventListener("highlighting-preferences-change", handleHighlightingChange);
    window.addEventListener("tts-settings-change", handleTTSChange);
    window.addEventListener("insight-level-change", handleInsightChange);

    return () => {
      window.removeEventListener("theme-change", handleThemeChange);
      window.removeEventListener("highlighting-preferences-change", handleHighlightingChange);
      window.removeEventListener("tts-settings-change", handleTTSChange);
      window.removeEventListener("insight-level-change", handleInsightChange);
    };
  }, []);

  // Settings handlers
  const handleThemeSelect = useCallback((newAppearance: Appearance) => {
    const stored = localStorage.getItem("radix-theme");
    let theme = { appearance: newAppearance, accentColor: "mint", grayColor: "gray" };
    if (stored) {
      try {
        theme = { ...JSON.parse(stored), appearance: newAppearance };
      } catch {
        // Invalid
      }
    }
    localStorage.setItem("radix-theme", JSON.stringify(theme));
    setAppearance(newAppearance);
    window.dispatchEvent(new Event("theme-change"));
  }, []);

  const handleDeveloperModeToggle = useCallback((checked: boolean) => {
    setDeveloperMode(checked);
    saveDeveloperMode(checked);
    window.dispatchEvent(new CustomEvent("developer-mode-change"));
  }, []);

  const handleTheatreModeToggle = useCallback((checked: boolean) => {
    setTheatreMode(checked);
    saveTheatreMode(checked);
    window.dispatchEvent(new CustomEvent("theatre-mode-change"));
  }, []);

  const handleHighlightingToggle = useCallback((key: keyof HighlightingPreferences, checked: boolean) => {
    updateHighlightingPreference(key, checked);
  }, []);

  const handleTTSSettingChange = useCallback(<K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => {
    updateTTSSetting(key, value);
  }, []);

  const handleInsightLevelChange = useCallback((level: InsightLevel) => {
    saveInsightLevel(level);
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>
    );
  }

  // Show sign-in button if not authenticated
  if (!user) {
    return (
      <>
        <Button
          variant="soft"
          size="2"
          onClick={() => setAuthModalOpen(true)}
        >
          <PersonIcon width="16" height="16" />
          <Text size="2">Sign In</Text>
        </Button>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </>
    );
  }

  // Get display name and avatar
  const displayName = profile?.full_name || "User";
  const avatarUrl = profile?.avatar_url;

  // Generate initials from name (fallback to "U" for User)
  const initials = (profile?.full_name || "U")
    .split(/[\s.]+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Avatar component - shows image or fallback initials
  const Avatar = () => {
    if (avatarUrl && !imageError) {
      return (
        <Image
          src={avatarUrl}
          alt={displayName}
          width={36}
          height={36}
          className="rounded-full object-cover"
          style={{ width: "36px", height: "36px" }}
          onError={() => setImageError(true)}
          unoptimized
        />
      );
    }

    return (
      <div
        className="rounded-full flex items-center justify-center text-sm font-semibold"
        style={{
          width: "36px",
          height: "36px",
          backgroundColor: "#7ADB8F",
          color: "#1C1C1C"
        }}
      >
        {initials}
      </div>
    );
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button
          variant="ghost"
          size="2"
          style={{
            padding: "var(--space-2)",
            gap: "var(--space-2)",
            height: "auto",
          }}
        >
          {/* Text on the left, right-aligned */}
          <Flex direction="column" align="end" gap="0">
            <Text size="2" weight="medium" style={{ lineHeight: 1.2 }}>
              {displayName}
            </Text>
            <Text
              size="1"
              weight="medium"
              style={{
                color: "#7ADB8F",
                lineHeight: 1.2,
              }}
            >
              BETA ACCESS
            </Text>
          </Flex>
          {/* Avatar on the right */}
          <Avatar />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        {/* Settings Section */}
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger>
            <GearIcon width="16" height="16" />
            <Text ml="2">Settings</Text>
          </DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent>
            {/* Themes */}
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>
                <SunIcon width="16" height="16" />
                <Text ml="2">Themes</Text>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item onSelect={() => handleThemeSelect("light")}>
                  <Text>Light</Text>
                  {appearance === "light" && <Text ml="auto" size="1" color="gray">✓</Text>}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleThemeSelect("dark")}>
                  <Text>Dark</Text>
                  {appearance === "dark" && <Text ml="auto" size="1" color="gray">✓</Text>}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleThemeSelect("green")}>
                  <Text>Green</Text>
                  {appearance === "green" && <Text ml="auto" size="1" color="gray">✓</Text>}
                </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>

            <DropdownMenu.Separator />

            {/* Theatre mode */}
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>
                <Text>Theatre mode</Text>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item onSelect={() => handleTheatreModeToggle(true)}>
                  <Text>On</Text>
                  {theatreMode && <Text ml="auto" size="1" color="gray">✓</Text>}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleTheatreModeToggle(false)}>
                  <Text>Off</Text>
                  {!theatreMode && <Text ml="auto" size="1" color="gray">✓</Text>}
                </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>

            <DropdownMenu.Separator />

            {/* Developer mode - only when available */}
            {isDeveloperModeAvailable() && (
              <>
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger>
                    <Text>Developer mode</Text>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent>
                    <DropdownMenu.Item onSelect={() => handleDeveloperModeToggle(true)}>
                      <Text>On</Text>
                      {developerMode && <Text ml="auto" size="1" color="gray">✓</Text>}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleDeveloperModeToggle(false)}>
                      <Text>Off</Text>
                      {!developerMode && <Text ml="auto" size="1" color="gray">✓</Text>}
                    </DropdownMenu.Item>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
                <DropdownMenu.Separator />
              </>
            )}

            {/* Highlighting */}
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>
                <Text>Highlighting</Text>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item onSelect={() => handleHighlightingToggle("terminology", !highlightingPrefs.terminology)}>
                  <Text>Terminology</Text>
                  {highlightingPrefs.terminology && <Text ml="auto" size="1" color="gray">✓</Text>}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleHighlightingToggle("technique", !highlightingPrefs.technique)}>
                  <Text>Technique terms</Text>
                  {highlightingPrefs.technique && <Text ml="auto" size="1" color="gray">✓</Text>}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleHighlightingToggle("timestamps", !highlightingPrefs.timestamps)}>
                  <Text>Timestamps</Text>
                  {highlightingPrefs.timestamps && <Text ml="auto" size="1" color="gray">✓</Text>}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleHighlightingToggle("swings", !highlightingPrefs.swings)}>
                  <Text>Swings</Text>
                  {highlightingPrefs.swings && <Text ml="auto" size="1" color="gray">✓</Text>}
                </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>

            <DropdownMenu.Separator />

            {/* Text-to-Speech */}
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>
                <Text>Text-to-Speech</Text>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item onSelect={() => handleTTSSettingChange("enabled", true)}>
                  <Text>On</Text>
                  {ttsSettings.enabled && <Text ml="auto" size="1" color="gray">✓</Text>}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleTTSSettingChange("enabled", false)}>
                  <Text>Off</Text>
                  {!ttsSettings.enabled && <Text ml="auto" size="1" color="gray">✓</Text>}
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger>
                    <Text>Voice quality</Text>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent>
                    <DropdownMenu.Item onSelect={() => handleTTSSettingChange("quality", "standard")}>
                      <Text>Standard</Text>
                      {ttsSettings.quality === "standard" && <Text ml="auto" size="1" color="gray">✓</Text>}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleTTSSettingChange("quality", "wavenet")}>
                      <Text>WaveNet</Text>
                      {ttsSettings.quality === "wavenet" && <Text ml="auto" size="1" color="gray">✓</Text>}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleTTSSettingChange("quality", "neural2")}>
                      <Text>Neural2 (High)</Text>
                      {ttsSettings.quality === "neural2" && <Text ml="auto" size="1" color="gray">✓</Text>}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleTTSSettingChange("quality", "studio")}>
                      <Text>Studio (Premium)*</Text>
                      {ttsSettings.quality === "studio" && <Text ml="auto" size="1" color="gray">✓</Text>}
                    </DropdownMenu.Item>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger>
                    <Text>Voice gender</Text>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent>
                    <DropdownMenu.Item onSelect={() => handleTTSSettingChange("gender", "male")}>
                      <Text>Male</Text>
                      {ttsSettings.gender === "male" && <Text ml="auto" size="1" color="gray">✓</Text>}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleTTSSettingChange("gender", "female")}>
                      <Text>Female</Text>
                      {ttsSettings.gender === "female" && <Text ml="auto" size="1" color="gray">✓</Text>}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleTTSSettingChange("gender", "neutral")}>
                      <Text>Neutral</Text>
                      {ttsSettings.gender === "neutral" && <Text ml="auto" size="1" color="gray">✓</Text>}
                    </DropdownMenu.Item>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger>
                    <Text>Speaking rate</Text>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent>
                    <DropdownMenu.Item onSelect={() => handleTTSSettingChange("speakingRate", 0.75)}>
                      <Text>Slower (0.75x)</Text>
                      {ttsSettings.speakingRate === 0.75 && <Text ml="auto" size="1" color="gray">✓</Text>}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleTTSSettingChange("speakingRate", 1.0)}>
                      <Text>Normal (1.0x)</Text>
                      {ttsSettings.speakingRate === 1.0 && <Text ml="auto" size="1" color="gray">✓</Text>}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleTTSSettingChange("speakingRate", 1.25)}>
                      <Text>Faster (1.25x)</Text>
                      {ttsSettings.speakingRate === 1.25 && <Text ml="auto" size="1" color="gray">✓</Text>}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => handleTTSSettingChange("speakingRate", 1.5)}>
                      <Text>Fast (1.5x)</Text>
                      {ttsSettings.speakingRate === 1.5 && <Text ml="auto" size="1" color="gray">✓</Text>}
                    </DropdownMenu.Item>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>

            <DropdownMenu.Separator />

            {/* AI Insight Level */}
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>
                <Text>AI Insight Level</Text>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item onSelect={() => handleInsightLevelChange("beginner")}>
                  <Text>Beginner</Text>
                  {insightLevel === "beginner" && <Text ml="auto" size="1" color="gray">✓</Text>}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleInsightLevelChange("developing")}>
                  <Text>Developing</Text>
                  {insightLevel === "developing" && <Text ml="auto" size="1" color="gray">✓</Text>}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => handleInsightLevelChange("advanced")}>
                  <Text>Advanced</Text>
                  {insightLevel === "advanced" && <Text ml="auto" size="1" color="gray">✓</Text>}
                </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>

        <DropdownMenu.Separator />

        {/* Profile */}
        <DropdownMenu.Item onSelect={() => router.push("/profile")}>
          <PersonIcon width="16" height="16" />
          <Text ml="2">Profile</Text>
        </DropdownMenu.Item>

        <DropdownMenu.Separator />

        {/* Navigation Links */}
        <UserMenuNavLinks />

        <DropdownMenu.Separator />

        {/* Sign Out */}
        <DropdownMenu.Item
          color="red"
          onSelect={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <>
              <div className="w-4 h-4 border-2 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin" />
              <Text ml="2">Signing out...</Text>
            </>
          ) : (
            <>
              <ExitIcon width="16" height="16" />
              <Text ml="2">Sign Out</Text>
            </>
          )}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

export interface PageHeaderProps {
  /** Page title to display (only shown on desktop when sidebar is expanded) */
  title?: string;
  /** Actions to display on the right side of the header */
  actions?: ReactNode;
  /** Callback when new chat button is clicked (for chat pages) */
  onNewChat?: () => void;
  /** Message count for new chat button (chat pages) */
  messageCount?: number;
}

export function PageHeader({
  title,
  actions,
  onNewChat,
}: PageHeaderProps) {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();

  // Calculate offset to center mode toggle relative to content area (accounting for sidebar)
  const sidebarWidth = isCollapsed ? 64 : 280;
  const centerOffset = sidebarWidth / 2;

  // Determine active mode based on current route
  const activeMode: NavigationMode = pathname?.startsWith("/library") ? "studio" : "chat";

  // Track last chat location to restore when coming back from Studio (persist in sessionStorage)
  const LAST_CHAT_PATH_KEY = "sportai-last-chat-path";

  // Update last chat path when in chat mode
  useEffect(() => {
    if (activeMode === "chat" && pathname) {
      sessionStorage.setItem(LAST_CHAT_PATH_KEY, pathname);
    }
  }, [activeMode, pathname]);

  const handleModeChange = (mode: NavigationMode) => {
    if (mode === "studio") {
      router.push("/library");
    } else {
      // Navigate back to the last chat location (/ or /chat with context)
      const lastChatPath = sessionStorage.getItem(LAST_CHAT_PATH_KEY) || "/";
      router.push(lastChatPath);
    }
  };

  // Mobile layout: Hamburger menu (left), centered Chat/Studio toggle buttons
  if (isMobile) {
    return (
      <Box
        className="fixed top-0 left-0 right-0 z-20"
        style={{
          borderBottom: "1px solid var(--gray-6)",
          backgroundColor: "var(--color-background)",
          backdropFilter: "blur(8px)",
          paddingTop: "calc(var(--space-1) + env(safe-area-inset-top))",
          paddingBottom: "var(--space-1)",
          paddingLeft: "var(--space-4)",
          paddingRight: "var(--space-4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          position: "relative",
        }}
      >
        {/* Hamburger Menu - Positioned on left */}
        <Box
          style={{
            position: "absolute",
            left: "var(--space-4)",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <IconButton
            icon={<HamburgerMenuIcon />}
            onClick={toggleSidebar}
            ariaLabel="Toggle sidebar"
          />
        </Box>

        {/* Center: Chat/Studio Mode Toggle Buttons */}
        <Flex align="center" gap="2">
          <ToggleButton
            label="Chat"
            isActive={activeMode === "chat"}
            onClick={() => handleModeChange("chat")}
          />
          <ToggleButton
            label="Studio"
            isActive={activeMode === "studio"}
            onClick={() => handleModeChange("studio")}
          />
        </Flex>

        {/* Actions on the right */}
        {actions && (
          <Box
            style={{
              position: "absolute",
              right: "var(--space-4)",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            {actions}
          </Box>
        )}
      </Box>
    );
  }

  // Desktop layout
  return (
    <Box
      className="fixed top-0 left-0 right-0 z-20"
      style={{
        borderBottom: "1px solid var(--gray-6)",
        backgroundColor: "var(--color-background)",
        backdropFilter: "blur(8px)",
        height: "57px",
        paddingLeft: "var(--space-4)",
        paddingRight: "var(--space-4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* Left side: Logo and Page Title */}
      <Flex align="center" gap="3" style={{ minWidth: "180px" }}>
        {/* Logo with Morph to New Chat Button */}
        <LogoNewChatButton onNewChat={onNewChat} />

        {/* Page title - Always visible when provided */}
        {title && (
          <Text size="5" weight="bold">
            {title}
          </Text>
        )}
      </Flex>

      {/* Center: Mode Toggle Buttons - offset to center relative to content area */}
      <Flex
        align="center"
        gap="2"
        style={{
          position: "absolute",
          left: `calc(50% + ${centerOffset}px)`,
          transform: "translateX(-50%)",
        }}
      >
        <ToggleButton
          label="Chat"
          isActive={activeMode === "chat"}
          onClick={() => handleModeChange("chat")}
        />
        <ToggleButton
          label="Studio"
          isActive={activeMode === "studio"}
          onClick={() => handleModeChange("studio")}
        />
      </Flex>

      {/* Right side: Actions and/or Profile */}
      <Flex align="center" gap="3" style={{ minWidth: "180px", justifyContent: "flex-end" }}>
        {actions}
        <NavbarProfile />
      </Flex>
    </Box>
  );
}
