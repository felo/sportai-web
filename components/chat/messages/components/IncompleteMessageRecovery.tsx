"use client";

import { Button, Flex, Text } from "@radix-ui/themes";
import { RefreshCw } from "lucide-react";
import buttonStyles from "@/styles/buttons.module.css";

interface IncompleteMessageRecoveryProps {
  hasPartialContent: boolean;
  onRetry: () => void;
  isRetrying?: boolean;
}

/**
 * Recovery UI for messages that were interrupted or failed to complete.
 * Styled like a regular assistant chat message with a retry button.
 */
export function IncompleteMessageRecovery({
  hasPartialContent,
  onRetry,
  isRetrying = false,
}: IncompleteMessageRecoveryProps) {
  return (
    <div style={{ marginTop: hasPartialContent ? "1rem" : "0" }}>
      <Text 
        as="p" 
        size="3" 
        style={{ 
          color: "var(--gray-12)",
          marginBottom: "0.75rem",
          lineHeight: 1.6,
        }}
      >
        {hasPartialContent
          ? "Oops! It looks like my response was interrupted."
          : "Hmm, something went wrong and I couldn't complete my response."}
      </Text>
      
      <Flex align="center" gap="2">
        <Button
          size="2"
          onClick={onRetry}
          disabled={isRetrying}
          className={buttonStyles.actionButtonSquare}
          aria-label="Retry generating response"
        >
          <Flex gap="2" align="center">
            <RefreshCw 
              size={14}
              style={{ 
                animation: isRetrying ? "incomplete-spin 1s linear infinite" : "none",
              }} 
            />
            <Text size="2" weight="medium">
              {isRetrying ? "Retrying…" : "Try again"}
            </Text>
          </Flex>
        </Button>
      </Flex>
      
      <style jsx global>{`
        @keyframes incomplete-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

