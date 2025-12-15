"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Box, Flex, Text, Card, TextArea, IconButton } from "@radix-ui/themes";
import { PaperPlaneIcon, PersonIcon, ResetIcon } from "@radix-ui/react-icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { StatisticsResult } from "../../types";
import type { PlayerRankings } from "../../hooks/usePlayerRankings";

// =============================================================================
// TYPES
// =============================================================================

interface CoachingTabProps {
  result: StatisticsResult | null;
  rankings: PlayerRankings;
  playerDisplayNames: Record<number, string>;
  sport?: "tennis" | "padel" | "pickleball" | "all";
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface CoachingPrompt {
  emoji: string;
  label: string;
  prompt: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const COACHING_PROMPTS: CoachingPrompt[] = [
  {
    emoji: "🎯",
    label: "Improve my game",
    prompt: "Based on this match data, what are the top 3 things I should focus on to improve my game?",
  },
  {
    emoji: "💪",
    label: "My strengths",
    prompt: "What are my biggest strengths based on this match? How can I leverage them better?",
  },
  {
    emoji: "🔧",
    label: "Weaknesses to fix",
    prompt: "What weaknesses did you notice in my play? Give me specific drills to work on them.",
  },
  {
    emoji: "🏆",
    label: "Winning strategy",
    prompt: "What tactical adjustments would help me win more points against this opponent?",
  },
  {
    emoji: "📊",
    label: "Shot analysis",
    prompt: "Analyze my shot selection. Am I making good choices? When should I be more aggressive or defensive?",
  },
  {
    emoji: "🏃",
    label: "Movement tips",
    prompt: "How is my court coverage and positioning? What movement patterns should I improve?",
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build a comprehensive context summary for the AI coach
 */
function buildCoachingContext(
  result: StatisticsResult | null,
  rankings: PlayerRankings,
  playerDisplayNames: Record<number, string>,
  sport: string
): string {
  if (!result) return "";

  const { validPlayers } = rankings;
  const rallies = result.rallies || [];
  const bounces = result.ball_bounces || [];
  
  let context = `## Match Analysis Data (${sport.charAt(0).toUpperCase() + sport.slice(1)})\n\n`;
  
  // Match overview
  context += `### Match Overview\n`;
  context += `- Total rallies: ${rallies.length}\n`;
  context += `- Players tracked: ${validPlayers.length}\n`;
  context += `- Ball bounces detected: ${bounces.length}\n\n`;
  
  // Player stats
  context += `### Player Statistics\n`;
  validPlayers.forEach((player, idx) => {
    const name = playerDisplayNames[player.player_id] || `Player ${idx + 1}`;
    const swings = player.swings || [];
    const speeds = swings.map(s => s.ball_speed).filter(s => s > 0);
    const avgSpeed = speeds.length > 0 ? (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1) : "N/A";
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds).toFixed(1) : "N/A";
    
    context += `\n**${name}:**\n`;
    context += `- Total shots: ${swings.length}\n`;
    context += `- Average ball speed: ${avgSpeed} km/h\n`;
    context += `- Max ball speed: ${maxSpeed} km/h\n`;
    context += `- Distance covered: ${player.covered_distance?.toFixed(1) || "N/A"} m\n`;
    context += `- Fastest sprint: ${player.fastest_sprint?.toFixed(1) || "N/A"} km/h\n`;
    
    // Shot distribution
    const swingTypes = player.swing_type_distribution || {};
    if (Object.keys(swingTypes).length > 0) {
      context += `- Shot types: ${Object.entries(swingTypes).map(([type, count]) => `${type}: ${count}`).join(", ")}\n`;
    }
  });
  
  // Rally analysis
  if (rallies.length > 0) {
    context += `\n### Rally Analysis\n`;
    const rallyDurations = rallies.map(([start, end]) => end - start);
    const avgRallyDuration = (rallyDurations.reduce((a, b) => a + b, 0) / rallyDurations.length).toFixed(1);
    const maxRallyDuration = Math.max(...rallyDurations).toFixed(1);
    context += `- Average rally duration: ${avgRallyDuration}s\n`;
    context += `- Longest rally: ${maxRallyDuration}s\n`;
  }
  
  // Rankings summary
  context += `\n### Performance Rankings\n`;
  if (Object.keys(rankings.ballSpeedRankings).length > 0) {
    context += `**Ball Speed Rankings:**\n`;
    Object.entries(rankings.ballSpeedRankings).forEach(([playerId, rank]) => {
      const name = playerDisplayNames[parseInt(playerId)] || `Player ${playerId}`;
      context += `- ${name}: #${rank}\n`;
    });
  }
  
  return context;
}

// =============================================================================
// REUSABLE SUB-COMPONENTS
// =============================================================================

/** AI Coach Icon with badge */
function CoachIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
        fill="currentColor"
      />
      <circle cx="17" cy="6" r="4" fill="#7ADB8F"/>
      <path d="M15.5 6L16.5 7L18.5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/** Animated streaming indicator */
function StreamingDots() {
  return (
    <Flex gap="1" align="center" style={{ height: 24 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "var(--mint-9)",
            animation: `coachPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes coachPulse {
          0%, 60%, 100% { opacity: 0.4; transform: scale(1); }
          30% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </Flex>
  );
}

/** Prompt card for quick questions */
function PromptCard({ 
  emoji, 
  label, 
  onClick, 
  disabled 
}: { 
  emoji: string; 
  label: string; 
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Card
      onClick={disabled ? undefined : onClick}
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        padding: "12px 16px",
        border: "1px solid var(--gray-5)",
        transition: "all 0.2s ease",
        minWidth: 140,
        opacity: disabled ? 0.5 : 1,
      }}
      className="coaching-prompt-card"
    >
      <Flex align="center" gap="2">
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
        <Text size="2" weight="medium">{label}</Text>
      </Flex>
    </Card>
  );
}

/** Chat message bubble */
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  
  return (
    <Flex
      gap="3"
      style={{ flexDirection: isUser ? "row-reverse" : "row" }}
    >
      {/* Avatar */}
      <Box
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isUser
            ? "var(--gray-4)"
            : "linear-gradient(135deg, #7ADB8F 0%, #10B981 100%)",
        }}
      >
        {isUser ? (
          <PersonIcon width={18} height={18} style={{ color: "var(--gray-11)" }} />
        ) : (
          <CoachIcon size={18} />
        )}
      </Box>

      {/* Message content */}
      <Box
        style={{
          maxWidth: "80%",
          padding: "12px 16px",
          borderRadius: 16,
          backgroundColor: isUser ? "var(--mint-3)" : "var(--gray-2)",
          border: `1px solid ${isUser ? "var(--mint-6)" : "var(--gray-5)"}`,
        }}
      >
        {message.content ? (
          <Box className="prose dark:prose-invert" style={{ fontSize: 14, lineHeight: 1.6 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </Box>
        ) : message.isStreaming ? (
          <StreamingDots />
        ) : null}
      </Box>
    </Flex>
  );
}

/** Welcome state with prompt cards */
function WelcomeState({ 
  onPromptClick, 
  isLoading 
}: { 
  onPromptClick: (prompt: string) => void;
  isLoading: boolean;
}) {
  return (
    <Flex 
      direction="column" 
      gap="4" 
      align="center" 
      justify="center" 
      style={{ height: "100%", padding: "20px" }}
    >
      <Text size="3" color="gray" align="center" style={{ marginBottom: 8 }}>
        👋 Hi! I&apos;m your AI coach. Ask me about your match or pick a topic:
      </Text>
      <Flex gap="3" wrap="wrap" justify="center" style={{ maxWidth: 600 }}>
        {COACHING_PROMPTS.map((item, idx) => (
          <PromptCard
            key={idx}
            emoji={item.emoji}
            label={item.label}
            onClick={() => onPromptClick(item.prompt)}
            disabled={isLoading}
          />
        ))}
      </Flex>
      <style>{`
        .coaching-prompt-card:hover:not([style*="opacity: 0.5"]) {
          border-color: var(--mint-9) !important;
          background-color: var(--mint-2);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(122, 219, 143, 0.2);
        }
      `}</style>
    </Flex>
  );
}

/** Empty state when no data */
function EmptyState() {
  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      <Flex
        align="center"
        justify="center"
        direction="column"
        gap="3"
        style={{ padding: "60px 20px" }}
      >
        <Box
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            backgroundColor: "var(--gray-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CoachIcon size={40} />
        </Box>
        <Text size="3" color="gray">Load analysis results to unlock coaching</Text>
        <Text size="2" color="gray">
          Your AI coach needs match data to provide personalized advice
        </Text>
      </Flex>
    </Box>
  );
}

/** Chat input area */
function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const canSubmit = value.trim() && !isLoading;

  return (
    <Box
      style={{
        borderTop: "1px solid var(--gray-5)",
        padding: "var(--space-3)",
        backgroundColor: "var(--gray-1)",
      }}
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <Flex gap="2" align="end">
          <Box style={{ flex: 1 }}>
            <TextArea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your coach a question..."
              disabled={isLoading}
              style={{
                minHeight: 44,
                maxHeight: 120,
                resize: "none",
              }}
            />
          </Box>
          <IconButton
            type="submit"
            size="3"
            disabled={!canSubmit}
            style={{
              background: canSubmit
                ? "linear-gradient(135deg, #7ADB8F 0%, #10B981 100%)"
                : undefined,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            <PaperPlaneIcon width={18} height={18} />
          </IconButton>
        </Flex>
      </form>
      <Text size="1" color="gray" style={{ marginTop: 8, textAlign: "center" }}>
        Press Enter to send • Shift + Enter for new line
      </Text>
    </Box>
  );
}

// =============================================================================
// CUSTOM HOOK FOR CHAT LOGIC
// =============================================================================

function useCoachingChat(coachingContext: string, sport: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();

    // Add user message
    setMessages(prev => [...prev, {
      id: userMsgId,
      role: "user",
      content: userMessage.trim(),
    }]);
    
    setIsLoading(true);

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      isStreaming: true,
    }]);

    // Build conversation history for context
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    // Create system prompt for coaching
    const systemPrompt = `You are an expert ${sport} coach providing personalized advice based on match data.
Be encouraging, specific, and actionable. Use the player's actual statistics to give concrete feedback.
Keep responses focused and practical - around 150-300 words unless more detail is needed.
Use bullet points and clear structure for readability.

${coachingContext}`;

    const fullPrompt = `${systemPrompt}\n\n---\n\nPlayer's question: ${userMessage}`;

    try {
      abortControllerRef.current = new AbortController();

      const formData = new FormData();
      formData.append("prompt", fullPrompt);
      formData.append("thinkingMode", "fast");
      formData.append("domainExpertise", sport === "padel" ? "padel" : sport === "tennis" ? "tennis" : "pickleball");
      
      if (history.length > 0) {
        formData.append("history", JSON.stringify(history));
      }
      formData.append("queryComplexity", "simple");

      const response = await fetch("/api/llm", {
        method: "POST",
        headers: { "x-stream": "true" },
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to get coaching advice");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          let chunk = decoder.decode(value, { stream: true });
          
          // Remove metadata from chunk if present
          if (chunk.includes("__STREAM_META__")) {
            chunk = chunk.slice(0, chunk.indexOf("__STREAM_META__"));
          }

          accumulatedText += chunk;
          
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, content: accumulatedText, isStreaming: true }
              : m
          ));
        }
      }

      // Mark streaming complete
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? { ...m, isStreaming: false }
          : m
      ));
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
      } else {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: "Sorry, I couldn't process your question. Please try again.", isStreaming: false }
            : m
        ));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, isLoading, coachingContext, sport]);

  const resetChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, resetChat };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CoachingTab({
  result,
  rankings,
  playerDisplayNames,
  sport = "padel",
}: CoachingTabProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build context for the AI coach
  const coachingContext = useMemo(
    () => buildCoachingContext(result, rankings, playerDisplayNames, sport),
    [result, rankings, playerDisplayNames, sport]
  );

  // Chat logic
  const { messages, isLoading, sendMessage, resetChat } = useCoachingChat(coachingContext, sport);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle sending messages
  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue("");
    }
  }, [inputValue, sendMessage]);

  // Handle prompt card click
  const handlePromptClick = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);

  // No data state
  if (!result || rankings.validPlayers.length === 0) {
    return <EmptyState />;
  }

  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      <Flex direction="column" style={{ height: "calc(100vh - 280px)", minHeight: 500 }}>
        {/* Chat Header */}
        <Flex align="center" justify="between" mb="4">
          <Flex align="center" gap="3">
            <Box
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #7ADB8F 0%, #10B981 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(122, 219, 143, 0.4)",
              }}
            >
              <CoachIcon size={24} />
            </Box>
            <Box>
              <Text size="4" weight="bold">AI Coach</Text>
              <Text size="2" color="gray">Ask me anything about your match</Text>
            </Box>
          </Flex>
          {messages.length > 0 && (
            <IconButton
              variant="ghost"
              color="gray"
              onClick={resetChat}
              title="Start new conversation"
            >
              <ResetIcon width={18} height={18} />
            </IconButton>
          )}
        </Flex>

        {/* Messages Area */}
        <Card
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid var(--gray-5)",
          }}
        >
          <Box
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "var(--space-4)",
            }}
          >
            {messages.length === 0 ? (
              <WelcomeState onPromptClick={handlePromptClick} isLoading={isLoading} />
            ) : (
              <Flex direction="column" gap="4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </Flex>
            )}
          </Box>

          {/* Input Area */}
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSend}
            isLoading={isLoading}
          />
        </Card>
      </Flex>
    </Box>
  );
}



