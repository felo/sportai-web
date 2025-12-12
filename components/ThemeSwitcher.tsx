"use client";

import { useState, useEffect } from "react";
import { Select, Box, Flex, Text } from "@radix-ui/themes";

type Appearance = "light" | "dark" | "green" | "sportai";
type AccentColor = "blue" | "green" | "red" | "orange" | "purple" | "cyan" | "teal" | "jade" | "violet" | "iris" | "indigo" | "plum" | "pink" | "crimson" | "ruby" | "tomato" | "amber" | "yellow" | "lime" | "mint" | "grass" | "sky" | "bronze" | "gold" | "brown";
type GrayColor = "gray" | "mauve" | "slate" | "sage" | "olive" | "sand";

export function ThemeSwitcher() {
  const [appearance, setAppearance] = useState<Appearance>("light");
  const [accentColor, setAccentColor] = useState<AccentColor>("blue");
  const [grayColor, setGrayColor] = useState<GrayColor>("gray");

  useEffect(() => {
    // Load from localStorage
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
  }, []);

  const saveTheme = (theme: { appearance: Appearance; accentColor: AccentColor; grayColor: GrayColor }) => {
    localStorage.setItem("radix-theme", JSON.stringify(theme));
    // Trigger theme update in RadixThemeProvider
    window.dispatchEvent(new Event("theme-change"));
  };

  return (
    <Flex direction="column" gap="2" p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-3)" }}>
      <Text size="2" weight="bold">Theme Settings</Text>
      <Box>
        <Text size="1" color="gray" mb="1">Appearance</Text>
        <Select.Root value={appearance} onValueChange={(value) => {
          setAppearance(value as Appearance);
          saveTheme({ appearance: value as Appearance, accentColor, grayColor });
        }}>
          <Select.Trigger />
          <Select.Content>
            <Select.Item value="light">Light</Select.Item>
            <Select.Item value="dark">Dark</Select.Item>
            <Select.Item value="green">Green</Select.Item>
            <Select.Item value="sportai">SportAI Default</Select.Item>
          </Select.Content>
        </Select.Root>
      </Box>
      <Box>
        <Text size="1" color="gray" mb="1">Accent Color</Text>
        <Select.Root value={accentColor} onValueChange={(value) => {
          setAccentColor(value as AccentColor);
          saveTheme({ appearance, accentColor: value as AccentColor, grayColor });
        }}>
          <Select.Trigger />
          <Select.Content>
            <Select.Item value="blue">Blue</Select.Item>
            <Select.Item value="green">Green</Select.Item>
            <Select.Item value="red">Red</Select.Item>
            <Select.Item value="purple">Purple</Select.Item>
            <Select.Item value="cyan">Cyan</Select.Item>
            <Select.Item value="teal">Teal</Select.Item>
            <Select.Item value="jade">Jade</Select.Item>
            <Select.Item value="violet">Violet</Select.Item>
          </Select.Content>
        </Select.Root>
      </Box>
      <Box>
        <Text size="1" color="gray" mb="1">Gray Scale</Text>
        <Select.Root value={grayColor} onValueChange={(value) => {
          setGrayColor(value as GrayColor);
          saveTheme({ appearance, accentColor, grayColor: value as GrayColor });
        }}>
          <Select.Trigger />
          <Select.Content>
            <Select.Item value="gray">Gray</Select.Item>
            <Select.Item value="mauve">Mauve</Select.Item>
            <Select.Item value="slate">Slate</Select.Item>
            <Select.Item value="sage">Sage</Select.Item>
            <Select.Item value="olive">Olive</Select.Item>
            <Select.Item value="sand">Sand</Select.Item>
          </Select.Content>
        </Select.Root>
      </Box>
    </Flex>
  );
}

