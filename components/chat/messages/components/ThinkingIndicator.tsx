"use client";

import { Flex, Text } from "@radix-ui/themes";

interface ThinkingIndicatorProps {
  message: string;
}

/**
 * Animated thinking indicator with rotating dots
 */
export function ThinkingIndicator({ message }: ThinkingIndicatorProps) {
  return (
    <>
      <Flex gap="2" align="center">
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          marginRight: "4px",
        }}>
          <span className="thinking-dot" style={{ animationDelay: "0s" }}></span>
          <span className="thinking-dot" style={{ animationDelay: "0.2s" }}></span>
          <span className="thinking-dot" style={{ animationDelay: "0.4s" }}></span>
        </div>
        <Text color="gray">{message}</Text>
      </Flex>

      <style jsx>{`
        .thinking-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--accent-9);
          animation: thinkingPulse 1.4s ease-in-out infinite;
          display: block;
        }

        @keyframes thinkingPulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1) translateY(0);
          }
          30% {
            opacity: 1;
            transform: scale(1.2) translateY(-6px);
          }
          60% {
            opacity: 0.4;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </>
  );
}

