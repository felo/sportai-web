"use client";

import { useState, useCallback } from "react";
import { Box, Button, Text } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import Image from "next/image";

export interface LogoNewChatButtonProps {
  onNewChat?: () => void;
  /** Logo width in pixels */
  width?: number;
  /** Logo height in pixels */
  height?: number;
  /** Whether to trigger new chat directly on tap (for mobile) instead of hover morph */
  directTapAction?: boolean;
}

const LOGO_URL = "https://res.cloudinary.com/djtxhrly7/image/upload/v1763680466/sai-logo-green-horizontal_grc5v1.svg";

// CSS keyframes for bounce animation
const bounceKeyframes = `
  @keyframes logoBounce {
    0%, 100% { transform: translateY(0) scale(1); }
    15% { transform: translateY(-8px) scale(1.05); }
    30% { transform: translateY(0) scale(0.95); }
    45% { transform: translateY(-4px) scale(1.02); }
    60% { transform: translateY(0) scale(0.98); }
    75% { transform: translateY(-2px) scale(1.01); }
    90% { transform: translateY(0) scale(1); }
  }
  
  @keyframes bubblePop {
    0% { opacity: 0; transform: scale(0.5) translateY(10px); }
    50% { opacity: 1; transform: scale(1.1) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  
  @keyframes bubbleFade {
    0% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.8); }
  }
`;

/**
 * A logo component that morphs into a "New chat" button on hover (desktop).
 * On mobile with directTapAction, tapping the logo directly triggers new chat.
 */
export function LogoNewChatButton({
  onNewChat,
  width = 120,
  height = 38,
  directTapAction = false,
}: LogoNewChatButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPoked, setIsPoked] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleFading, setBubbleFading] = useState(false);

  const handleClick = () => {
    if (directTapAction) {
      onNewChat?.();
    }
  };

  const handleNewChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNewChat?.();
  };

  const handleLogoPoke = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Don't trigger if in directTapAction mode (mobile) or if already animating
    if (directTapAction || isPoked) return;
    
    // Start bounce animation
    setIsPoked(true);
    setShowBubble(true);
    setBubbleFading(false);
    
    // Reset bounce after animation completes
    setTimeout(() => {
      setIsPoked(false);
    }, 600);
    
    // Start fading the bubble
    setTimeout(() => {
      setBubbleFading(true);
    }, 1500);
    
    // Hide bubble completely
    setTimeout(() => {
      setShowBubble(false);
      setBubbleFading(false);
    }, 1800);
  }, [directTapAction, isPoked]);

  return (
    <>
      {/* Inject keyframes */}
      <style>{bounceKeyframes}</style>
      
      <Box
        onMouseEnter={directTapAction ? undefined : () => setIsHovered(true)}
        onMouseLeave={directTapAction ? undefined : () => setIsHovered(false)}
        onClick={directTapAction ? handleClick : undefined}
        style={{
          position: "relative",
          width: `${width}px`,
          height: `${height}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: directTapAction ? "pointer" : "default",
        }}
      >
        {/* Logo */}
        <Box
          onClick={handleLogoPoke}
          style={{
            opacity: isHovered ? 0 : 1,
            transition: "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "absolute",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: isHovered ? "none" : "auto",
            cursor: "pointer",
            animation: isPoked ? "logoBounce 0.6s cubic-bezier(0.36, 0, 0.66, -0.56)" : "none",
          }}
        >
          <Image
            src={LOGO_URL}
            alt="SportAI"
            width={width}
            height={height}
            style={{ objectFit: "contain", height: "auto", display: "block" }}
          />
        </Box>
        
        {/* "Stop poking me!" bubble */}
        {showBubble && (
          <Box
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "var(--color-background)",
              border: "2px solid #22c55e",
              borderRadius: "12px",
              padding: "6px 12px",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 12px rgba(34, 197, 94, 0.25)",
              zIndex: 100,
              animation: bubbleFading 
                ? "bubbleFade 0.3s ease-out forwards" 
                : "bubblePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            }}
          >
            {/* Speech bubble pointer */}
            <Box
              style={{
                position: "absolute",
                top: "-8px",
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderBottom: "8px solid #22c55e",
              }}
            />
            <Box
              style={{
                position: "absolute",
                top: "-5px",
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderBottom: "6px solid var(--color-background)",
              }}
            />
            <Text 
              size="1" 
              style={{ 
                color: "#22c55e",
                fontWeight: 600,
                fontSize: "12px",
                letterSpacing: "0.02em",
              }}
            >
              Stop poking me!
            </Text>
          </Box>
        )}

        {/* New Chat Button - only shown on hover for desktop */}
        {!directTapAction && (
          <Button
            variant="ghost"
            size="2"
            onClick={handleNewChatClick}
            style={{
              opacity: isHovered ? 1 : 0,
              transition: "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              position: "absolute",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "var(--space-2) var(--space-3)",
              whiteSpace: "nowrap",
              pointerEvents: isHovered ? "auto" : "none",
              gap: "6px",
            }}
          >
            <PlusIcon width="16" height="16" />
            <Text size="2" style={{ fontSize: "14px", lineHeight: "1" }}>
              New chat
            </Text>
          </Button>
        )}
      </Box>
    </>
  );
}

