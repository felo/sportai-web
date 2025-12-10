"use client";

import { useRouter, usePathname } from "next/navigation";
import { Flex, Button, Text } from "@radix-ui/themes";
import { GlobeIcon, FileTextIcon, EnvelopeClosedIcon, InfoCircledIcon, RocketIcon } from "@radix-ui/react-icons";
import { NavigationLink } from "@/components/ui";
import type { SidebarNavigationProps } from "./types";

/**
 * Internal navigation link that respects navigation guards
 * Uses programmatic navigation to allow showing custom dialogs
 */
function InternalNavigationLink({
  href,
  label,
  icon,
  onClick,
  onNavigationAttempt,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  onNavigationAttempt?: () => Promise<boolean> | boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = pathname === href;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    // Don't navigate if already on this page
    if (isActive) {
      onClick?.();
      return;
    }

    // Check if navigation is allowed (e.g., if chat is thinking)
    if (onNavigationAttempt) {
      const allowed = await Promise.resolve(onNavigationAttempt());
      if (!allowed) {
        return; // User cancelled navigation
      }
    }

    // Close sidebar on mobile
    onClick?.();

    // Navigate
    router.push(href);
  };

  return (
    <Button
      variant={isActive ? "soft" : "ghost"}
      size="2"
      onClick={handleClick}
      style={{
        justifyContent: "flex-start",
        padding: "var(--space-2) var(--space-3)",
        backgroundColor: isActive ? "var(--accent-a4)" : undefined,
        cursor: "pointer",
      }}
    >
      {icon}
      <Text size="2" ml="2">
        {label}
      </Text>
    </Button>
  );
}

export function SidebarNavigation({ onLinkClick, onNavigationAttempt }: SidebarNavigationProps) {
  return (
    <Flex direction="column" gap="2">
      <NavigationLink
        href="https://sportai.com/platform"
        label="SportAI Platform"
        icon={<GlobeIcon />}
        onClick={onLinkClick}
        external
      />
      <NavigationLink
        href="https://sportai.mintlify.app/api-reference/introduction"
        label="API Documentation"
        icon={<FileTextIcon />}
        onClick={onLinkClick}
        external
      />
      <InternalNavigationLink
        href="/pricing"
        label="Plans and Pricing"
        icon={<RocketIcon width={16} height={16} />}
        onClick={onLinkClick}
        onNavigationAttempt={onNavigationAttempt}
      />
      <NavigationLink
        href="https://sportai.com/contact"
        label="Contact Us"
        icon={<EnvelopeClosedIcon />}
        onClick={onLinkClick}
        external
      />
      <NavigationLink
        href="https://sportai.com/about-us"
        label="About Us"
        icon={<InfoCircledIcon />}
        onClick={onLinkClick}
        external
      />
    </Flex>
  );
}






