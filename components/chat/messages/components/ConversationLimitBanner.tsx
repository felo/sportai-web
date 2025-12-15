"use client";

import { Box, Button, Flex, Text } from "@radix-ui/themes";
import { FREE_TIER_MESSAGE_LIMIT } from "@/lib/limitations";
import buttonStyles from "@/styles/buttons.module.css";

interface ConversationLimitBannerProps {
  show: boolean;
  onStartNewChat?: () => void;
}

/**
 * Conversation limit banner displayed when user hits the message limit
 * Reuses ProUpsellBanner styling patterns
 */
export function ConversationLimitBanner({ show, onStartNewChat }: ConversationLimitBannerProps) {
  if (!show) return null;

  return (
    <Box
      mt="4"
      style={{
        opacity: 0,
        animation: "fadeInUpsell 0.5s ease-in forwards",
      }}
    >
      {/* Custom separator reusing markdown divider design */}
      <div className="markdown-divider" role="separator" aria-label="Section divider">
        <div className="markdown-divider-line" />
        <span className="markdown-divider-dots" aria-hidden="true">
          •••
        </span>
        <div className="markdown-divider-line" />
      </div>
      
      <Flex direction="column" gap="3" mt="4">
        <Flex direction="column" gap="2">
          <Text size="3" weight="medium">
            You&apos;ve hit the conversation limit of this BETA
          </Text>
          <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
            This chat has reached a limit of {FREE_TIER_MESSAGE_LIMIT} messages. Start a new chat to continue.
          </Text>
        </Flex>
        <Flex gap="2" wrap="wrap">
          <Button
            size="2"
            variant="soft"
            className={`${buttonStyles.actionButton} ${buttonStyles.actionButtonPulse}`}
            onClick={() => {
              window.open("/pricing", "_blank", "noopener,noreferrer");
            }}
            style={{ width: "fit-content", cursor: "pointer" }}
          >
            Upgrade to PRO
          </Button>
          {onStartNewChat && (
            <Button
              size="2"
              variant="soft"
              className={buttonStyles.actionButton}
              onClick={onStartNewChat}
              style={{ width: "fit-content", cursor: "pointer" }}
            >
              Start New Chat
            </Button>
          )}
        </Flex>
      </Flex>

      <style jsx>{`
        @keyframes fadeInUpsell {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Box>
  );
}

