"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button, Text, DropdownMenu, Flex, Box, Separator } from "@radix-ui/themes";
import { ExitIcon, PersonIcon, SunIcon, TrashIcon, GearIcon } from "@radix-ui/react-icons";
import { createLogger } from "@/lib/logger";
import { useAuth } from "./AuthProvider";
import { AuthModal } from "./AuthModal";
import type { HighlightingPreferences, TTSSettings, InsightLevel } from "@/utils/storage";
import type { Appearance } from "@/components/sidebar/types";

const authLogger = createLogger("Auth");

interface UserMenuProps {
  appearance?: Appearance;
  theatreMode?: boolean;
  developerMode?: boolean;
  highlightingPrefs?: HighlightingPreferences;
  ttsSettings?: TTSSettings;
  insightLevel?: InsightLevel;
  messageCount?: number;
  isMobile?: boolean;
  collapsed?: boolean;
  onThemeSelect?: (theme: Appearance) => void;
  onTheatreModeToggle?: (enabled: boolean) => void;
  onDeveloperModeToggle?: (enabled: boolean) => void;
  onHighlightingToggle?: (key: keyof HighlightingPreferences, checked: boolean) => void;
  onTTSSettingChange?: <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => void;
  onInsightLevelChange?: (level: InsightLevel) => void;
  onClearChat?: () => void;
  onOpenStorageDebug?: () => void;
  onOpenContextDebug?: () => void;
  onResetOnboardingTips?: () => void;
  onSetAlertOpen?: (open: boolean) => void;
}

export function UserMenu({
  appearance = "green",
  theatreMode = true,
  developerMode = false,
  highlightingPrefs = { terminology: true, technique: true, timestamps: true, swings: true },
  ttsSettings = { enabled: false, quality: "studio", gender: "male", language: "en-GB", speakingRate: 0.75, pitch: 0.0 },
  insightLevel = "beginner",
  messageCount = 0,
  isMobile = false,
  collapsed = false,
  onThemeSelect,
  onTheatreModeToggle,
  onDeveloperModeToggle,
  onHighlightingToggle,
  onTTSSettingChange,
  onInsightLevelChange,
  onClearChat,
  onOpenStorageDebug,
  onOpenContextDebug,
  onResetOnboardingTips,
  onSetAlertOpen,
}: UserMenuProps = {}) {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      authLogger.error("Error signing out:", error);
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
          variant="ghost"
          size="2"
          onClick={() => setAuthModalOpen(true)}
          style={{
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "var(--space-2)" : "var(--space-2) var(--space-3)",
            minWidth: collapsed ? "40px" : undefined,
            width: collapsed ? "40px" : undefined,
            height: collapsed ? "40px" : undefined,
          }}
          title={collapsed ? "Sign In" : undefined}
        >
          <PersonIcon width="20" height="20" />
          {!collapsed && (
            <Text size="2" ml="2">
              Sign In
            </Text>
          )}
        </Button>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </>
    );
  }

  // Get display name and avatar
  const email = user.email || "Unknown";
  const displayName = profile?.full_name || email.split("@")[0];
  const avatarUrl = profile?.avatar_url;
  
  // Generate initials from name or email
  const initials = (profile?.full_name || email.split("@")[0])
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
          width={32}
          height={32}
          className="w-8 h-8 rounded-full object-cover"
          onError={() => setImageError(true)}
          unoptimized // S3 images might not be in Next.js allowed domains
        />
      );
    }
    
    return (
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
        style={{ 
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
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "var(--space-2)" : "var(--space-2) var(--space-3)",
            gap: "var(--space-1)",
            minWidth: collapsed ? "40px" : undefined,
            width: collapsed ? "40px" : undefined,
            height: collapsed ? "40px" : undefined,
          }}
          title={collapsed ? displayName : undefined}
        >
          <Avatar />
          {!collapsed && (
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "flex-start",
              minWidth: 0,
              gap: "0",
              paddingLeft: "var(--space-2)",
            }}>
              {profile?.full_name && (
                <Text size="2" weight="medium" style={{ 
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {profile.full_name}
                </Text>
              )}
              <Text size="1" color="gray" style={{ 
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {email}
              </Text>
            </div>
          )}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start">
          {/* Settings Section */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
              <GearIcon width="16" height="16" />
              <Text ml="2">Settings</Text>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>
                  <SunIcon width="16" height="16" />
                  <Text ml="2">Themes</Text>
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  <DropdownMenu.Item onSelect={() => onThemeSelect?.("light")}>
                    <Text>Light</Text>
                    {appearance === "light" && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => onThemeSelect?.("dark")}>
                    <Text>Dark</Text>
                    {appearance === "dark" && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => onThemeSelect?.("green")}>
                    <Text>Green</Text>
                    {appearance === "green" && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>

              <DropdownMenu.Separator />

              {/* Theatre mode - hidden on mobile */}
              {!isMobile && (
                <>
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      <Text>Theatre mode</Text>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent>
                      <DropdownMenu.Item onSelect={() => onTheatreModeToggle?.(true)}>
                        <Text>On</Text>
                        {theatreMode && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => onTheatreModeToggle?.(false)}>
                        <Text>Off</Text>
                        {!theatreMode && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>

                  <DropdownMenu.Separator />
                </>
              )}

              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>
                  <Text>Developer mode</Text>
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  <DropdownMenu.Item onSelect={() => onDeveloperModeToggle?.(true)}>
                    <Text>On</Text>
                    {developerMode && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => onDeveloperModeToggle?.(false)}>
                    <Text>Off</Text>
                    {!developerMode && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  {developerMode && (
                    <>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Sub>
                        <DropdownMenu.SubTrigger>
                          <Text>Debug</Text>
                        </DropdownMenu.SubTrigger>
                        <DropdownMenu.SubContent>
                          <DropdownMenu.Item onSelect={() => onOpenContextDebug?.()}>
                            <Text>Context</Text>
                          </DropdownMenu.Item>
                          <DropdownMenu.Item onSelect={() => onOpenStorageDebug?.()}>
                            <Text>Storage</Text>
                          </DropdownMenu.Item>
                          <DropdownMenu.Item onSelect={() => onResetOnboardingTips?.()}>
                            <Text>Reset Onboarding Tips</Text>
                          </DropdownMenu.Item>
                        </DropdownMenu.SubContent>
                      </DropdownMenu.Sub>
                    </>
                  )}
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>

              <DropdownMenu.Separator />

              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>
                  <Text>Highlighting</Text>
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  <DropdownMenu.Item onSelect={() => onHighlightingToggle?.("terminology", !highlightingPrefs.terminology)}>
                    <Text>Terminology</Text>
                    {highlightingPrefs.terminology && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => onHighlightingToggle?.("technique", !highlightingPrefs.technique)}>
                    <Text>Technique terms</Text>
                    {highlightingPrefs.technique && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => onHighlightingToggle?.("timestamps", !highlightingPrefs.timestamps)}>
                    <Text>Timestamps</Text>
                    {highlightingPrefs.timestamps && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => onHighlightingToggle?.("swings", !highlightingPrefs.swings)}>
                    <Text>Swings</Text>
                    {highlightingPrefs.swings && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>

              <DropdownMenu.Separator />

              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>
                  <Text>Text-to-Speech</Text>
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  {/* TTS On/Off */}
                  <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("enabled", true)}>
                    <Text>On</Text>
                    {ttsSettings.enabled && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("enabled", false)}>
                    <Text>Off</Text>
                    {!ttsSettings.enabled && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator />

                  {/* Voice Quality */}
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      <Text>Voice quality</Text>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("quality", "standard")}>
                        <Text>Standard</Text>
                        {ttsSettings.quality === "standard" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("quality", "wavenet")}>
                        <Text>WaveNet</Text>
                        {ttsSettings.quality === "wavenet" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("quality", "neural2")}>
                        <Text>Neural2 (High)</Text>
                        {ttsSettings.quality === "neural2" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("quality", "studio")}>
                        <Text>Studio (Premium)*</Text>
                        {ttsSettings.quality === "studio" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>

                  {/* Voice Gender */}
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      <Text>Voice gender</Text>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("gender", "male")}>
                        <Text>Male</Text>
                        {ttsSettings.gender === "male" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("gender", "female")}>
                        <Text>Female</Text>
                        {ttsSettings.gender === "female" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("gender", "neutral")}>
                        <Text>Neutral</Text>
                        {ttsSettings.gender === "neutral" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>

                  {/* Language/Accent */}
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      <Text>Language/Accent</Text>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("language", "en-US")}>
                        <Text>English (US)</Text>
                        {ttsSettings.language === "en-US" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("language", "en-GB")}>
                        <Text>English (UK)</Text>
                        {ttsSettings.language === "en-GB" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("language", "en-AU")}>
                        <Text>English (AU)</Text>
                        {ttsSettings.language === "en-AU" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("language", "en-IN")}>
                        <Text>English (India)</Text>
                        {ttsSettings.language === "en-IN" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("language", "fr-FR")}>
                        <Text>Français (France)</Text>
                        {ttsSettings.language === "fr-FR" && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>

                  {/* Speaking Rate */}
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      <Text>Speaking rate</Text>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("speakingRate", 0.75)}>
                        <Text>Slower (0.75x)</Text>
                        {ttsSettings.speakingRate === 0.75 && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("speakingRate", 1.0)}>
                        <Text>Normal (1.0x)</Text>
                        {ttsSettings.speakingRate === 1.0 && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("speakingRate", 1.25)}>
                        <Text>Faster (1.25x)</Text>
                        {ttsSettings.speakingRate === 1.25 && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("speakingRate", 1.5)}>
                        <Text>Fast (1.5x)</Text>
                        {ttsSettings.speakingRate === 1.5 && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>

                  {/* Pitch */}
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      <Text>Pitch</Text>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("pitch", -5.0)}>
                        <Text>Lower (-5)</Text>
                        {ttsSettings.pitch === -5.0 && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("pitch", 0.0)}>
                        <Text>Normal (0)</Text>
                        {ttsSettings.pitch === 0.0 && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => onTTSSettingChange?.("pitch", 5.0)}>
                        <Text>Higher (+5)</Text>
                        {ttsSettings.pitch === 5.0 && (
                          <Text ml="auto" size="1" color="gray">✓</Text>
                        )}
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
                  <DropdownMenu.Item onSelect={() => onInsightLevelChange?.("beginner")}>
                    <Text>Beginner</Text>
                    {insightLevel === "beginner" && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => onInsightLevelChange?.("developing")}>
                    <Text>Developing</Text>
                    {insightLevel === "developing" && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => onInsightLevelChange?.("advanced")}>
                    <Text>Advanced</Text>
                    {insightLevel === "advanced" && (
                      <Text ml="auto" size="1" color="gray">✓</Text>
                    )}
                  </DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>

              {/* Clear chat history - Developer Mode Only */}
              {developerMode && (
                <>
                  <DropdownMenu.Separator />

                  <DropdownMenu.Item 
                    color="red"
                    disabled={messageCount === 0 || !onClearChat}
                    onSelect={(e) => {
                      if (messageCount > 0 && onClearChat) {
                        e.preventDefault();
                        onSetAlertOpen?.(true);
                      }
                    }}
                  >
                    <TrashIcon width="16" height="16" />
                    <Text ml="2">Clear chat history</Text>
                  </DropdownMenu.Item>
                </>
              )}
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator />

          {/* Profile Menu Item */}
          <DropdownMenu.Item onSelect={() => router.push("/profile")}>
            <PersonIcon width="16" height="16" />
            <Text ml="2">Profile</Text>
          </DropdownMenu.Item>

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
