"use client";

import { Box, Flex, Text } from "@radix-ui/themes";
import { formatCost } from "@/lib/token-utils";

interface TokenUsage {
  input: number;
  output: number;
}

interface TTSUsage {
  totalCharacters: number;
  totalCost: number;
  requestCount: number;
  voiceQuality: string;
}

interface ModelSettings {
  thinkingMode?: string;
  mediaResolution?: string;
  domainExpertise?: string;
  thinkingBudget?: number;
}

interface Pricing {
  totalCost: number;
}

interface DeveloperInfoProps {
  show: boolean;
  messageTokens: TokenUsage;
  cumulativeTokens: TokenUsage;
  messagePricing: Pricing | null;
  cumulativePricing: Pricing | null;
  ttsUsage: TTSUsage;
  totalTTSUsage: {
    characters: number;
    cost: number;
    requests: number;
  };
  responseDuration?: number;
  timeToFirstToken?: number;
  modelSettings?: ModelSettings;
}

/**
 * Developer mode information display showing token usage, costs, and performance metrics
 */
export function DeveloperInfo({
  show,
  messageTokens,
  cumulativeTokens,
  messagePricing,
  cumulativePricing,
  ttsUsage,
  totalTTSUsage,
  responseDuration,
  timeToFirstToken,
  modelSettings,
}: DeveloperInfoProps) {
  if (!show) return null;

  return (
    <Box
      mt="3"
      pt="3"
      style={{
        fontSize: "var(--font-size-1)",
        color: "var(--gray-11)",
      }}
    >
      {/* Decorative separator matching markdown conventions */}
      <div className="markdown-divider" role="separator" aria-label="Developer section divider">
        <div className="markdown-divider-line" />
        <span className="markdown-divider-dots" aria-hidden="true">
          •••
        </span>
        <div className="markdown-divider-line" />
      </div>
      
      <Flex direction="column" gap="2">
        <Text size="1" weight="medium" color="gray">
          Developer Mode
        </Text>
        <Flex direction="column" gap="1" pl="2">
          {(messageTokens.input > 0 || messageTokens.output > 0) && (
            <>
              <Text size="1">
                <strong>Token usage (this message):</strong>{" "}
                {messageTokens.input > 0 && `${messageTokens.input.toLocaleString()} input`}
                {messageTokens.input > 0 && messageTokens.output > 0 && " + "}
                {messageTokens.output > 0 && `${messageTokens.output.toLocaleString()} output`}
                {messageTokens.input === 0 && messageTokens.output === 0 && "N/A"}
                {messagePricing && ` (${formatCost(messagePricing.totalCost)})`}
              </Text>
              <Text size="1">
                <strong>Token usage (total in chat):</strong>{" "}
                {cumulativeTokens.input > 0 && `${cumulativeTokens.input.toLocaleString()} input`}
                {cumulativeTokens.input > 0 && cumulativeTokens.output > 0 && " + "}
                {cumulativeTokens.output > 0 && `${cumulativeTokens.output.toLocaleString()} output`}
                {cumulativePricing && ` (${formatCost(cumulativePricing.totalCost)})`}
              </Text>
            </>
          )}
          {responseDuration !== undefined && (
            <>
              <Text size="1">
                <strong>Response time (total):</strong> {responseDuration.toLocaleString()}ms ({(responseDuration / 1000).toFixed(2)}s)
              </Text>
              {timeToFirstToken !== undefined && (
                <Text size="1" pl="2">
                  <strong>Time to first token:</strong> {timeToFirstToken.toLocaleString()}ms ({(timeToFirstToken / 1000).toFixed(2)}s)
                  {responseDuration > 0 && (
                    <span style={{ color: "var(--gray-10)" }}>
                      {" "}• Streaming: {(responseDuration - timeToFirstToken).toLocaleString()}ms
                    </span>
                  )}
                </Text>
              )}
            </>
          )}
          {modelSettings && (
            <>
              <Text size="1">
                <strong>Settings:</strong> Thinking={modelSettings.thinkingMode}
                {modelSettings.thinkingBudget && ` (budget: ${modelSettings.thinkingBudget} tokens)`}, Resolution={modelSettings.mediaResolution}
              </Text>
              {modelSettings.domainExpertise && (
                <Text size="1" pl="2">
                  <strong>Domain knowledge:</strong> {
                    modelSettings.domainExpertise === "all-sports" 
                      ? "All Sports (General coaching knowledge)" 
                      : `${modelSettings.domainExpertise.charAt(0).toUpperCase() + modelSettings.domainExpertise.slice(1)} (Specialized: courts, swings, terminology)`
                  }
                </Text>
              )}
            </>
          )}
          {ttsUsage.requestCount > 0 && (
            <>
              <Text size="1">
                <strong>TTS usage (this message):</strong>{" "}
                {ttsUsage.totalCharacters.toLocaleString()} characters, {ttsUsage.requestCount} request{ttsUsage.requestCount !== 1 ? 's' : ''} ({formatCost(ttsUsage.totalCost)})
              </Text>
              <Text size="1">
                <strong>TTS usage (total in chat):</strong>{" "}
                {totalTTSUsage.characters.toLocaleString()} characters, {totalTTSUsage.requests} request{totalTTSUsage.requests !== 1 ? 's' : ''} ({formatCost(totalTTSUsage.cost)})
              </Text>
            </>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}

