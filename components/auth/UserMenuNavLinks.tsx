"use client";

import { useRouter } from "next/navigation";
import { Text, DropdownMenu } from "@radix-ui/themes";
import { GlobeIcon, FileTextIcon, EnvelopeClosedIcon, InfoCircledIcon, RocketIcon } from "@radix-ui/react-icons";

/**
 * Shared navigation links for user menu dropdowns.
 * Used in both sidebar UserMenu and top-right NavbarProfile.
 */
export function UserMenuNavLinks() {
  const router = useRouter();

  return (
    <>
      <DropdownMenu.Item onSelect={() => window.open("https://sportai.com/platform", "_blank")}>
        <GlobeIcon width="16" height="16" />
        <Text ml="2">SportAI Platform</Text>
      </DropdownMenu.Item>
      <DropdownMenu.Item onSelect={() => window.open("https://sportai.mintlify.app/api-reference/introduction", "_blank")}>
        <FileTextIcon width="16" height="16" />
        <Text ml="2">API Documentation</Text>
      </DropdownMenu.Item>
      <DropdownMenu.Item onSelect={() => router.push("/pricing")}>
        <RocketIcon width="16" height="16" />
        <Text ml="2">Plans and Pricing</Text>
      </DropdownMenu.Item>
      <DropdownMenu.Item onSelect={() => window.open("https://sportai.com/contact", "_blank")}>
        <EnvelopeClosedIcon width="16" height="16" />
        <Text ml="2">Contact Us</Text>
      </DropdownMenu.Item>
      <DropdownMenu.Item onSelect={() => window.open("https://sportai.com/about-us", "_blank")}>
        <InfoCircledIcon width="16" height="16" />
        <Text ml="2">About Us</Text>
      </DropdownMenu.Item>
    </>
  );
}
