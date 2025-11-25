"use client";

import React from "react";
import Image from "next/image";
import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { STARTER_PROMPTS, type StarterPromptConfig } from "@/utils/prompts";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";
import { useIsMobile } from "@/hooks/useIsMobile";
import buttonStyles from "@/styles/buttons.module.css";

interface StarterPromptsProps {
  onPromptSelect: (
    prompt: string, 
    videoUrl: string,
    settings?: {
      thinkingMode?: ThinkingMode;
      mediaResolution?: MediaResolution;
      domainExpertise?: DomainExpertise;
      playbackSpeed?: number;
      poseSettings?: StarterPromptConfig["poseSettings"];
    }
  ) => void;
}

export function StarterPrompts({ onPromptSelect }: StarterPromptsProps) {
  const [loadingVideoForCard, setLoadingVideoForCard] = React.useState<string | null>(null);
  const [isTablet, setIsTablet] = React.useState(false);
  const isMobile = useIsMobile();

  // Detect tablet breakpoint (< 1024px)
  React.useEffect(() => {
    const checkTablet = () => {
      setIsTablet(window.innerWidth < 1024);
    };
    checkTablet();
    window.addEventListener("resize", checkTablet);
    return () => window.removeEventListener("resize", checkTablet);
  }, []);

  const handleCardClick = async (config: StarterPromptConfig) => {
    try {
      setLoadingVideoForCard(config.id);
      
      // Extract settings from config
      const settings = {
        thinkingMode: config.thinkingMode,
        mediaResolution: config.mediaResolution,
        domainExpertise: config.domainExpertise,
        playbackSpeed: config.playbackSpeed,
        poseSettings: config.poseSettings,
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
      gap={isMobile ? "4" : "8"}
      className="starter-prompts-container"
      style={{
        height: "100%",
        padding: isMobile ? "calc(57px + 1rem) 1rem 1rem" : "3rem 1rem 2rem",
        maxWidth: isMobile ? "100%" : "900px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Logo and Subtitle */}
      <Flex direction="column" align="center" gap={isMobile ? "2" : "4"} className="logo-section" style={{ width: "100%", marginTop: isMobile ? "0.75rem" : "0" }}>
        {/* Hide logo on mobile */}
        {!isMobile && (
          <div
            className="logo-wrapper"
            style={{
              position: "relative",
              maxWidth: "256px",
              height: "auto",
            }}
          >
            <Image
              src="https://res.cloudinary.com/djtxhrly7/image/upload/v1763680386/sai-logo-green_nuuyat.svg"
              alt="SportAI"
              width={196}
              height={280}
              style={{
                height: "auto",
                objectFit: "contain",
                objectPosition: "center top",
              }}
              priority
            />
          </div>
        )}
        <Text
          size={isMobile ? "4" : "5"}
          align="center"
          color="gray"
          className="short-md:hidden"
          style={{
            margin: 0,
          }}
        >
          AI-powered technique & tactical analysis
        </Text>
      </Flex>

      {/* Starter Prompt Cards */}
      <Flex
        gap={isMobile ? "3" : "4"}
        wrap="wrap"
        justify="center"
        style={{
          width: "100%",
          maxWidth: "900px",
        }}
      >
        {STARTER_PROMPTS.filter((starterPrompt) => {
          // Hide quick-tips card on mobile and tablet
          if (isTablet && starterPrompt.id === "quick-tips") {
            return false;
          }
          return true;
        }).map((starterPrompt) => (
          <Card
            key={starterPrompt.id}
            style={{
              flex: isMobile ? "1 1 100%" : "1 1 260px",
              maxWidth: isMobile ? "100%" : "280px",
              transition: "all 0.2s ease",
              border: "1px solid var(--gray-6)",
            }}
            className="starter-prompt-card"
          >
            <Flex 
              direction="column" 
              gap={isMobile ? "2" : "3"} 
              p={isMobile ? "3" : "4"} 
              style={{ height: "100%", minHeight: isMobile ? "auto" : "180px" }}
            >
              <Flex direction="column" gap={isMobile ? "1" : "2"} style={{ flex: 1 }} align={isMobile ? "center" : "start"}>
                <Heading size={isMobile ? "4" : "5"} weight="medium" align={isMobile ? "center" : "left"}>
                  {starterPrompt.title}
                </Heading>
                <Text size="2" color="gray" style={{ lineHeight: "1.5", textAlign: isMobile ? "center" : "left" }}>
                  {starterPrompt.description}
                </Text>
              </Flex>
              <Button
                size="2"
                variant="soft"
                className={buttonStyles.actionButton}
                onClick={() => handleCardClick(starterPrompt)}
                loading={loadingVideoForCard === starterPrompt.id}
                disabled={loadingVideoForCard !== null}
                style={{ 
                  width: "100%", 
                  maxWidth: isMobile ? "200px" : "none",
                  cursor: "pointer",
                  margin: isMobile ? "0 auto" : "0"
                }}
              >
                Start
              </Button>
            </Flex>
          </Card>
        ))}
      </Flex>

      {/* Instructions */}
      <Text size={isMobile ? "2" : "3"} color="gray" style={{ textAlign: "center", maxWidth: "600px" }}>
        Drag and drop a video or click the plus button below
      </Text>

      <style jsx>{`
        :global(.starter-prompt-card) {
          transition: all 0.2s ease;
        }
        
        @media (min-width: 768px) {
          :global(.starter-prompt-card:hover) {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
            border-color: var(--accent-9) !important;
          }
        }

        /* Reduce spacing on short screens */
        @media (max-height: 768px) {
          :global(.starter-prompts-container) {
            padding-top: 1rem !important;
            padding-bottom: 1rem !important;
            gap: 1rem !important;
          }
          :global(.logo-section) {
            gap: 0.5rem !important;
          }
          :global(.logo-wrapper) {
            max-width: 180px !important;
          }
          :global(.logo-wrapper img) {
            max-height: 100px !important;
          }
        }

        @media (max-height: 640px) {
          :global(.starter-prompts-container) {
            padding-top: 0.5rem !important;
            gap: 0.75rem !important;
          }
          :global(.logo-wrapper) {
            max-width: 140px !important;
          }
          :global(.logo-wrapper img) {
            max-height: 70px !important;
          }
        }
      `}</style>
    </Flex>
  );
}

