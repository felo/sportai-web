"use client";

import { Box, Flex, Text } from "@radix-ui/themes";
import { formatCost } from "@/lib/token-utils";

// Shared style constants
const mutedStyle = { color: "var(--gray-10)" } as const;
const greenStyle = { color: "var(--green-11)" } as const;
const blueStyle = { color: "var(--blue-11)" } as const;
const amberStyle = { color: "var(--amber-11)" } as const;

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

interface ContextUsage {
  messagesInContext: number;
  tokensUsed: number;
  maxTokens: number;
  complexity: "simple" | "complex";
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
  contextUsage?: ContextUsage;
  cacheUsed?: boolean;
  cacheName?: string;
  modelUsed?: string;
  modelReason?: string;
  hasVideo?: boolean;
}

// Helper to format model reason for display
function formatModelReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    video_analysis: "Video analysis",
    complex_query: "Complex query detected",
    text_query: "Text-only query",
    simple_followup: "Simple follow-up",
    fallback: "Fallback",
  };
  return reasonMap[reason] || reason;
}

// Helper to get a short model display name
function getModelDisplayName(model: string): { name: string; isFlash: boolean } {
  if (model.includes("flash")) {
    return { name: "Flash ⚡", isFlash: true };
  }
  if (model.includes("pro")) {
    return { name: "Pro", isFlash: false };
  }
  return { name: model, isFlash: false };
}

// Helper to format token usage string
function formatTokenUsage(tokens: TokenUsage, pricing: Pricing | null): string {
  const parts: string[] = [];
  if (tokens.input > 0) parts.push(`${tokens.input.toLocaleString()} input`);
  if (tokens.output > 0) parts.push(`${tokens.output.toLocaleString()} output`);
  const tokensStr = parts.join(" + ");
  return pricing ? `${tokensStr} (${formatCost(pricing.totalCost)})` : tokensStr;
}

// --- Sub-components ---

function TokenUsageDisplay({ 
  messageTokens, 
  cumulativeTokens, 
  messagePricing, 
  cumulativePricing 
}: { 
  messageTokens: TokenUsage; 
  cumulativeTokens: TokenUsage; 
  messagePricing: Pricing | null; 
  cumulativePricing: Pricing | null;
}) {
  return (
    <>
      <Text size="1">
        <strong>Token usage (this message):</strong>{" "}
        {formatTokenUsage(messageTokens, messagePricing)}
      </Text>
      <Text size="1">
        <strong>Token usage (total in chat):</strong>{" "}
        {formatTokenUsage(cumulativeTokens, cumulativePricing)}
      </Text>
    </>
  );
}

function TimingDisplay({ 
  responseDuration, 
  timeToFirstToken 
}: { 
  responseDuration: number; 
  timeToFirstToken?: number;
}) {
  return (
    <>
      <Text size="1">
        <strong>Response time (total):</strong> {responseDuration.toLocaleString()}ms ({(responseDuration / 1000).toFixed(2)}s)
      </Text>
      {timeToFirstToken !== undefined && (
        <Text size="1">
          <strong>Time to first token:</strong> {timeToFirstToken.toLocaleString()}ms ({(timeToFirstToken / 1000).toFixed(2)}s)
          {responseDuration > 0 && (
            <span style={mutedStyle}>
              {" "}• Streaming: {(responseDuration - timeToFirstToken).toLocaleString()}ms
            </span>
          )}
        </Text>
      )}
    </>
  );
}

function ModelDisplay({ 
  modelUsed, 
  modelReason 
}: { 
  modelUsed: string; 
  modelReason?: string;
}) {
  const { name, isFlash } = getModelDisplayName(modelUsed);
  
  return (
    <Text size="1">
      <strong>Model:</strong>{" "}
      <span style={isFlash ? amberStyle : blueStyle}>
        {name}
      </span>
      {modelReason && (
        <span style={mutedStyle}> • {formatModelReason(modelReason)}</span>
      )}
    </Text>
  );
}

function SettingsDisplay({ modelSettings }: { modelSettings: ModelSettings }) {
  return (
    <>
      <Text size="1">
        <strong>Settings:</strong> Thinking={modelSettings.thinkingMode}
        {modelSettings.thinkingBudget && ` (budget: ${modelSettings.thinkingBudget} tokens)`}, Resolution={modelSettings.mediaResolution}
      </Text>
      {modelSettings.domainExpertise && (
        <Text size="1">
          <strong>Domain knowledge:</strong> {
            modelSettings.domainExpertise === "all-sports" 
              ? "All Sports (General coaching knowledge)" 
              : `${modelSettings.domainExpertise.charAt(0).toUpperCase() + modelSettings.domainExpertise.slice(1)} (Specialized: courts, swings, terminology)`
          }
        </Text>
      )}
    </>
  );
}

function ContextDisplay({ contextUsage }: { contextUsage: ContextUsage }) {
  return (
    <Text size="1">
      <strong>Context:</strong> {contextUsage.messagesInContext} messages, {contextUsage.tokensUsed.toLocaleString()}/{contextUsage.maxTokens.toLocaleString()} tokens ({Math.round((contextUsage.tokensUsed / contextUsage.maxTokens) * 100)}%)
      {contextUsage.complexity === "simple" && (
        <span style={greenStyle}> • Simple query mode</span>
      )}
    </Text>
  );
}

function CacheDisplay({ 
  cacheUsed, 
  cacheName 
}: { 
  cacheUsed: boolean; 
  cacheName?: string;
}) {
  return (
    <Text size="1">
      <strong>LLM Cache:</strong>{" "}
      {cacheUsed ? (
        <span style={greenStyle}>
          ✓ Cached content used
          {cacheName && <span style={mutedStyle}> ({cacheName.split('/').pop()})</span>}
        </span>
      ) : (
        <span style={mutedStyle}>Not cached (video &lt; 22MB or first request)</span>
      )}
    </Text>
  );
}

function MediaDisplay({ hasVideo }: { hasVideo: boolean }) {
  return (
    <Text size="1">
      <strong>Media:</strong>{" "}
      {hasVideo ? (
        <span style={blueStyle}>Video/image provided</span>
      ) : (
        <span style={mutedStyle}>Text-only query</span>
      )}
    </Text>
  );
}

function TTSDisplay({ 
  ttsUsage, 
  totalTTSUsage 
}: { 
  ttsUsage: TTSUsage; 
  totalTTSUsage: { characters: number; cost: number; requests: number };
}) {
  return (
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
  );
}

/**
 * Developer mode information display showing token usage, costs, and performance metrics
 * 
 * TODO: Consider wrapping with React.memo if re-renders become frequent
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
  contextUsage,
  cacheUsed,
  cacheName,
  modelUsed,
  modelReason,
  hasVideo,
}: DeveloperInfoProps) {
  if (!show) return null;

  // Check if we have any data to show
  const hasTokenData = messageTokens.input > 0 || messageTokens.output > 0;
  const hasTimingData = responseDuration !== undefined && responseDuration > 0;
  const hasModelData = !!modelUsed;
  const hasModelSettings = !!modelSettings && (modelSettings.thinkingMode || modelSettings.mediaResolution);
  const hasContextUsage = !!contextUsage && contextUsage.messagesInContext > 0;
  const hasCacheInfo = cacheUsed !== undefined;
  const hasTTSData = ttsUsage.requestCount > 0;
  const hasVideoInfo = hasVideo !== undefined;
  
  const hasAnyData = hasTokenData || hasTimingData || hasModelData || hasModelSettings || hasContextUsage || hasCacheInfo || hasTTSData || hasVideoInfo;
  
  // Debug: Log what data is available (only in development)
  if (process.env.NODE_ENV === 'development' && !hasAnyData) {
    console.debug('[DeveloperInfo] No telemetry data. Raw values:', {
      messageTokens,
      responseDuration,
      modelUsed,
      modelSettings,
      contextUsage,
      cacheUsed,
      ttsUsage,
    });
  }

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
          {!hasAnyData && (
            <Text size="1" style={{ ...mutedStyle, fontStyle: "italic" }}>
              No telemetry data available for this message. This typically means the message was created before telemetry tracking was enabled, or the response is still streaming. New responses will capture: token usage, response time, model info, and cache status.
            </Text>
          )}
          
          {hasTokenData && (
            <TokenUsageDisplay 
              messageTokens={messageTokens}
              cumulativeTokens={cumulativeTokens}
              messagePricing={messagePricing}
              cumulativePricing={cumulativePricing}
            />
          )}
          
          {hasTimingData && responseDuration !== undefined && (
            <TimingDisplay 
              responseDuration={responseDuration}
              timeToFirstToken={timeToFirstToken}
            />
          )}
          
          {hasModelData && modelUsed && (
            <ModelDisplay modelUsed={modelUsed} modelReason={modelReason} />
          )}
          
          {hasModelSettings && modelSettings && (
            <SettingsDisplay modelSettings={modelSettings} />
          )}
          
          {hasContextUsage && contextUsage && (
            <ContextDisplay contextUsage={contextUsage} />
          )}
          
          {hasCacheInfo && cacheUsed !== undefined && (
            <CacheDisplay cacheUsed={cacheUsed} cacheName={cacheName} />
          )}
          
          {hasVideoInfo && hasVideo !== undefined && (
            <MediaDisplay hasVideo={hasVideo} />
          )}
          
          {hasTTSData && (
            <TTSDisplay ttsUsage={ttsUsage} totalTTSUsage={totalTTSUsage} />
          )}
        </Flex>
      </Flex>
    </Box>
  );
}
