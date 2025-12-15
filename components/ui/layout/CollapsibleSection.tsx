"use client";

import { useState, ReactNode } from "react";
import styles from "@/styles/markdown.module.css";

interface CollapsibleSectionProps {
  /** The title shown in the summary */
  title: ReactNode;
  /** Content to show when expanded */
  children: React.ReactNode;
  /** Whether the section is open by default */
  defaultOpen?: boolean;
}

/**
 * CollapsibleSection - Reusable collapsible details/summary component
 * 
 * Uses the same styling as markdown collapsible sections in chat.
 * 
 * @example
 * ```tsx
 * <CollapsibleSection title="Complete Tactical Analysis" defaultOpen>
 *   <MarkdownWithSwings>{analysis}</MarkdownWithSwings>
 * </CollapsibleSection>
 * ```
 */
export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      className={styles.collapsibleSection}
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className={styles.collapsibleSummary}>
        {title}
      </summary>
      <div style={{ padding: "1rem" }}>
        {children}
      </div>
    </details>
  );
}


