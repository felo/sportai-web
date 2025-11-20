"use client";

import React from "react";
import Image from "next/image";
import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { URLs } from "@/lib/config";
import { STARTER_PROMPTS, type StarterPromptConfig } from "@/utils/prompts";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";

interface StarterPromptsProps {
  onPromptSelect: (
    prompt: string, 
    videoUrl: string,
    settings?: {
      thinkingMode?: ThinkingMode;
      mediaResolution?: MediaResolution;
      domainExpertise?: DomainExpertise;
    }
  ) => void;
}

export function StarterPrompts({ onPromptSelect }: StarterPromptsProps) {
  const [loadingVideoForCard, setLoadingVideoForCard] = React.useState<string | null>(null);

  const handleCardClick = async (config: StarterPromptConfig) => {
    try {
      setLoadingVideoForCard(config.id);
      
      // Extract settings from config
      const settings = {
        thinkingMode: config.thinkingMode,
        mediaResolution: config.mediaResolution,
        domainExpertise: config.domainExpertise,
      };
      
      await onPromptSelect(config.prompt, config.videoUrl, settings);
    } catch (error) {
      console.error('Error loading demo video:', error);
    } finally {
      setLoadingVideoForCard(null);
    }
  };
  return (
    <Flex
      direction="column"
      align="center"
      justify="start"
      gap="8"
      style={{
        height: "100%",
        padding: "3rem 1rem 2rem",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      {/* Logo and Subtitle */}
      <Flex direction="column" align="center" gap="4" style={{ width: "100%" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "min(600px, 80vw)",
            height: "auto",
          }}
        >
          <Image
            src={URLs.logo}
            alt="SportAI"
            width={600}
            height={190}
            style={{
              width: "100%",
              height: "auto",
              objectFit: "contain",
              objectPosition: "center top",
            }}
            priority
          />
        </div>
        <Text
          size="5"
          align="center"
          color="gray"
          style={{
            margin: 0,
          }}
        >
          AI-powered technique & tactical analysis
        </Text>
      </Flex>

      {/* Starter Prompt Cards */}
      <Flex
        gap="4"
        wrap="wrap"
        justify="center"
        style={{
          width: "100%",
          maxWidth: "900px",
        }}
      >
        {STARTER_PROMPTS.map((starterPrompt) => (
          <Card
            key={starterPrompt.id}
            style={{
              flex: "1 1 260px",
              maxWidth: "280px",
              transition: "all 0.2s ease",
              border: "1px solid var(--gray-6)",
            }}
            className="starter-prompt-card"
          >
            <Flex direction="column" gap="3" p="4" style={{ height: "100%", minHeight: "180px" }}>
              <Flex direction="column" gap="2" style={{ flex: 1 }}>
                <Heading size="5" weight="medium">
                  {starterPrompt.title}
                </Heading>
                <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                  {starterPrompt.description}
                </Text>
              </Flex>
              <Button
                size="2"
                variant="soft"
                onClick={() => handleCardClick(starterPrompt)}
                loading={loadingVideoForCard === starterPrompt.id}
                disabled={loadingVideoForCard !== null}
                style={{ width: "100%", cursor: "pointer" }}
              >
                Start
              </Button>
            </Flex>
          </Card>
        ))}
      </Flex>

      {/* Instructions */}
      <Text size="3" color="gray" style={{ textAlign: "center", maxWidth: "600px" }}>
        Drag and drop a video or click the upload button below
      </Text>

      <style jsx>{`
        :global(.starter-prompt-card) {
          transition: all 0.2s ease;
        }
        
        :global(.starter-prompt-card:hover) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
          border-color: var(--accent-9) !important;
        }
      `}</style>
    </Flex>
  );
}

