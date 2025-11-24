"use client";

import { Box, Button, Flex, Text } from "@radix-ui/themes";
import buttonStyles from "@/styles/buttons.module.css";

interface ProUpsellBannerProps {
  show: boolean;
}

/**
 * PRO membership upsell banner displayed after assistant messages
 */
export function ProUpsellBanner({ show }: ProUpsellBannerProps) {
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
            Want more accuracy and deeper insights?
          </Text>
          <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
            Upgrade to SportAI PRO for enhanced analysis, more detailed data, and advanced features tailored to your needs.
          </Text>
        </Flex>
        <Button
          size="2"
          variant="soft"
          className={buttonStyles.actionButton}
          onClick={() => {
            window.open("https://sportai.com/contact", "_blank", "noopener,noreferrer");
          }}
          style={{ width: "fit-content", cursor: "pointer", marginTop: "var(--space-2)" }}
        >
          Contact us for PRO
        </Button>
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

