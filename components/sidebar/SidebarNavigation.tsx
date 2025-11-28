"use client";

import { Flex } from "@radix-ui/themes";
import { GlobeIcon, FileTextIcon, EnvelopeClosedIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { NavigationLink } from "@/components/ui";
import type { SidebarNavigationProps } from "./types";

export function SidebarNavigation({ onLinkClick }: SidebarNavigationProps) {
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




