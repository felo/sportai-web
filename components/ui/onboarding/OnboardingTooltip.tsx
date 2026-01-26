"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Text, Flex } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import {
  hasSeenOnboardingTooltip,
  markOnboardingTooltipSeen,
  type OnboardingTooltipId,
} from "@/utils/storage/settings/onboarding-tooltips";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface OnboardingTooltipProps {
  /** Unique identifier for tracking if this tooltip has been shown */
  tooltipId: OnboardingTooltipId;
  /** The target element to point to */
  targetRef: React.RefObject<HTMLElement>;
  /** The message to display */
  message: string;
  /** Position relative to the target */
  position?: TooltipPosition;
  /** Offset from the target in pixels */
  offset?: number;
  /** Whether the tooltip should be visible (controlled externally) */
  show?: boolean;
  /** Callback when the tooltip is dismissed */
  onDismiss?: () => void;
  /** Auto-dismiss after this many milliseconds (0 = no auto-dismiss) */
  autoDismissMs?: number;
  /** Whether to force show even if previously seen (for demos) */
  forceShow?: boolean;
}

/**
 * OnboardingTooltip - A reusable tooltip for first-time user experience
 *
 * Features:
 * - Automatically tracks if the tooltip has been shown via localStorage
 * - Positions itself relative to a target element with a pointer
 * - Matches the app's design system (green accents, rounded corners)
 * - Dismissable with X button or auto-dismiss
 *
 * @example
 * ```tsx
 * const buttonRef = useRef<HTMLButtonElement>(null);
 *
 * <OnboardingTooltip
 *   tooltipId="floating-video-button"
 *   targetRef={buttonRef}
 *   message="Enable this to view your video while reading."
 *   position="left"
 * />
 * ```
 */
export function OnboardingTooltip({
  tooltipId,
  targetRef,
  message,
  position = "left",
  offset = 16,
  show = true,
  onDismiss,
  autoDismissMs = 0,
  forceShow = false,
}: OnboardingTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check if we should show the tooltip
  useEffect(() => {
    setMounted(true);

    if (!forceShow && hasSeenOnboardingTooltip(tooltipId)) {
      return;
    }

    if (show && targetRef.current) {
      // Small delay to ensure target element is fully positioned
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [tooltipId, show, forceShow, targetRef]);

  // Calculate position based on target element
  const updatePosition = useCallback(() => {
    if (!targetRef.current || !tooltipRef.current) return;

    const targetRect = targetRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let x = 0;
    let y = 0;

    switch (position) {
      case "top":
        x = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        y = targetRect.top - tooltipRect.height - offset;
        break;
      case "bottom":
        x = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        y = targetRect.bottom + offset;
        break;
      case "left":
        x = targetRect.left - tooltipRect.width - offset;
        y = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        break;
      case "right":
        x = targetRect.right + offset;
        y = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        break;
    }

    // Keep tooltip in viewport
    const padding = 12;
    x = Math.max(padding, Math.min(x, window.innerWidth - tooltipRect.width - padding));
    y = Math.max(padding, Math.min(y, window.innerHeight - tooltipRect.height - padding));

    setCoords({ x, y });
  }, [targetRef, position, offset]);

  // Update position on mount and when visibility changes
  useEffect(() => {
    if (isVisible) {
      // Initial position update
      const timer = setTimeout(updatePosition, 50);

      // Update on scroll/resize
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [isVisible, updatePosition]);

  // Auto-dismiss functionality
  useEffect(() => {
    if (isVisible && autoDismissMs > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoDismissMs]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    markOnboardingTooltipSeen(tooltipId);
    onDismiss?.();
  }, [tooltipId, onDismiss]);

  // Calculate pointer position based on tooltip position
  const getPointerStyles = (): React.CSSProperties => {
    const pointerSize = 10;
    const baseStyles: React.CSSProperties = {
      position: "absolute",
      width: 0,
      height: 0,
      borderStyle: "solid",
    };

    switch (position) {
      case "top":
        return {
          ...baseStyles,
          bottom: -pointerSize,
          left: "50%",
          transform: "translateX(-50%)",
          borderWidth: `${pointerSize}px ${pointerSize}px 0 ${pointerSize}px`,
          borderColor: "#1C1C1C transparent transparent transparent",
        };
      case "bottom":
        return {
          ...baseStyles,
          top: -pointerSize,
          left: "50%",
          transform: "translateX(-50%)",
          borderWidth: `0 ${pointerSize}px ${pointerSize}px ${pointerSize}px`,
          borderColor: "transparent transparent #1C1C1C transparent",
        };
      case "left":
        return {
          ...baseStyles,
          right: -pointerSize,
          top: "50%",
          transform: "translateY(-50%)",
          borderWidth: `${pointerSize}px 0 ${pointerSize}px ${pointerSize}px`,
          borderColor: "transparent transparent transparent #1C1C1C",
        };
      case "right":
        return {
          ...baseStyles,
          left: -pointerSize,
          top: "50%",
          transform: "translateY(-50%)",
          borderWidth: `${pointerSize}px ${pointerSize}px ${pointerSize}px 0`,
          borderColor: "transparent #1C1C1C transparent transparent",
        };
    }
  };

  if (!mounted || !isVisible) return null;

  const tooltip = (
    <div
      ref={tooltipRef}
      style={{
        position: "fixed",
        left: coords.x,
        top: coords.y,
        zIndex: 10000,
        animation: "onboardingTooltipIn 0.3s ease-out",
      }}
      role="tooltip"
      aria-live="polite"
    >
      {/* Main bubble */}
      <div
        style={{
          backgroundColor: "#1C1C1C",
          borderRadius: "12px",
          padding: "12px 16px",
          maxWidth: "260px",
          boxShadow: `
            0 4px 20px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(122, 219, 143, 0.3),
            0 0 20px rgba(122, 219, 143, 0.15)
          `,
          border: "1px solid rgba(122, 219, 143, 0.4)",
        }}
      >
        <Flex align="start" gap="3">
          <Text
            size="2"
            style={{
              color: "#FFFFFF",
              lineHeight: 1.5,
              flex: 1,
            }}
          >
            {message}
          </Text>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss tooltip"
            style={{
              background: "transparent",
              border: "none",
              padding: "2px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--gray-9)",
              borderRadius: "4px",
              transition: "all 0.15s ease",
              flexShrink: 0,
              marginTop: "-2px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#7ADB8F";
              e.currentTarget.style.backgroundColor = "rgba(122, 219, 143, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--gray-9)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Cross2Icon width={14} height={14} />
          </button>
        </Flex>

        {/* Accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "12px",
            right: "12px",
            height: "2px",
            background: "linear-gradient(90deg, transparent, #7ADB8F, transparent)",
            borderRadius: "0 0 10px 10px",
          }}
        />
      </div>

      {/* Pointer arrow */}
      <div style={getPointerStyles()} />
    </div>
  );

  return createPortal(tooltip, document.body);
}

export default OnboardingTooltip;
