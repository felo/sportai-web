"use client";

import { Button, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

export interface NavigationLinkProps {
  /** Link URL */
  href: string;
  /** Link text */
  label: string;
  /** Icon element */
  icon: ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Open in new tab */
  external?: boolean;
  /** Button variant */
  variant?: "ghost" | "soft" | "solid" | "outline" | "surface";
  /** Button size */
  size?: "1" | "2" | "3";
  /** Icon size */
  iconSize?: number;
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * NavigationLink - A consistent navigation link button
 * 
 * Features:
 * - Icon + text layout
 * - Button styling
 * - External link support
 * - Consistent spacing
 * 
 * @example
 * ```tsx
 * <NavigationLink
 *   href="https://sportai.com/platform"
 *   label="SportAI Platform"
 *   icon={<GlobeIcon />}
 *   external
 * />
 * ```
 */
export function NavigationLink({
  href,
  label,
  icon,
  onClick,
  external = false,
  variant = "ghost",
  size = "2",
  iconSize = 16,
  className,
  style,
}: NavigationLinkProps) {
  // Clone icon with size
  const iconWithSize = typeof icon === "object" && icon !== null && "type" in icon
    ? { ...icon, props: { ...icon.props, width: iconSize, height: iconSize } }
    : icon;

  return (
    <Button
      variant={variant}
      size={size}
      asChild
      className={className}
      style={{
        justifyContent: "flex-start",
        padding: "var(--space-2) var(--space-3)",
        ...style,
      }}
    >
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={onClick}
      >
        {iconWithSize}
        <Text size={size} ml="2">
          {label}
        </Text>
      </a>
    </Button>
  );
}

