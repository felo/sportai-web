"use client";

/**
 * Debug dialog for viewing current chat context
 * Only visible in developer mode
 */

import { useEffect, useState, useCallback } from "react";
import { Box, Flex, Button, Dialog, Text, Badge, ScrollArea, Tabs } from "@radix-ui/themes";
import { CopyIcon, CheckIcon, ReloadIcon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";
import { getCurrentChatId, loadChat } from "@/utils/storage-unified";
import { getOptimizedContext, formatMessagesForGemini } from "@/utils/context-utils";
import { estimateTextTokens } from "@/lib/token-utils";
import type { Message } from "@/types/chat";

interface ContextDebugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ContextInfo {
  chatId: string | undefined;
  messageCount: number;
  messages: Message[];
  formattedContext: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
  complexity: "simple" | "complex";
  tokensUsed: number;
  maxTokens: number;
  trimmedMessageCount: number;
}

export function ContextDebugDialog({ open, onOpenChange }: ContextDebugDialogProps) {
  const [contextInfo, setContextInfo] = useState<ContextInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const chatId = getCurrentChatId();
      if (!chatId) {
        setContextInfo(null);
        return;
      }

      const chat = await loadChat(chatId);
      if (!chat) {
        setContextInfo(null);
        return;
      }

      const messages = chat.messages || [];
      
      // Simulate what would be sent to the API with a sample prompt
      const samplePrompt = "What do you think?";
      const optimized = getOptimizedContext(messages, samplePrompt);
      
      setContextInfo({
        chatId,
        messageCount: messages.length,
        messages,
        formattedContext: optimized.context,
        complexity: optimized.complexity,
        tokensUsed: optimized.tokensUsed,
        maxTokens: optimized.maxTokens,
        trimmedMessageCount: optimized.trimmedMessageCount,
      });
    } catch (error) {
      console.error("Failed to load context:", error);
      setContextInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadContext();
    }
  }, [open, loadContext]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const formatMessageForDisplay = (msg: Message, index: number) => {
    const tokens = estimateTextTokens(msg.content || "");
    const hasVideo = !!(msg.videoUrl || msg.videoS3Key || msg.videoFile);
    
    return (
      <Box
        key={msg.id || index}
        style={{
          padding: "var(--space-3)",
          backgroundColor: msg.role === "user" ? "var(--accent-a3)" : "var(--gray-a3)",
          borderRadius: "var(--radius-2)",
          marginBottom: "var(--space-2)",
        }}
      >
        <Flex justify="between" align="center" mb="2">
          <Flex gap="2" align="center">
            <Badge color={msg.role === "user" ? "blue" : "green"} size="1">
              {msg.role}
            </Badge>
            {hasVideo && (
              <Badge color="orange" size="1">
                📹 video
              </Badge>
            )}
            <Text size="1" color="gray">
              ~{tokens} tokens
            </Text>
          </Flex>
          <Button
            variant="ghost"
            size="1"
            onClick={() => copyToClipboard(msg.content || "", `msg-${index}`)}
          >
            {copied === `msg-${index}` ? (
              <CheckIcon width="14" height="14" />
            ) : (
              <CopyIcon width="14" height="14" />
            )}
          </Button>
        </Flex>
        <Text
          size="1"
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: "150px",
            overflow: "auto",
            display: "block",
            fontFamily: "monospace",
          }}
        >
          {msg.content?.slice(0, 500) || "(empty)"}
          {(msg.content?.length || 0) > 500 && "..."}
        </Text>
      </Box>
    );
  };

  const formatGeminiMessageForDisplay = (
    msg: { role: "user" | "model"; parts: Array<{ text: string }> },
    index: number
  ) => {
    const text = msg.parts[0]?.text || "";
    const tokens = estimateTextTokens(text);
    
    return (
      <Box
        key={index}
        style={{
          padding: "var(--space-3)",
          backgroundColor: msg.role === "user" ? "var(--accent-a3)" : "var(--gray-a3)",
          borderRadius: "var(--radius-2)",
          marginBottom: "var(--space-2)",
        }}
      >
        <Flex justify="between" align="center" mb="2">
          <Flex gap="2" align="center">
            <Badge color={msg.role === "user" ? "blue" : "green"} size="1">
              {msg.role}
            </Badge>
            <Text size="1" color="gray">
              ~{tokens} tokens
            </Text>
          </Flex>
          <Button
            variant="ghost"
            size="1"
            onClick={() => copyToClipboard(text, `gemini-${index}`)}
          >
            {copied === `gemini-${index}` ? (
              <CheckIcon width="14" height="14" />
            ) : (
              <CopyIcon width="14" height="14" />
            )}
          </Button>
        </Flex>
        <Text
          size="1"
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: "150px",
            overflow: "auto",
            display: "block",
            fontFamily: "monospace",
          }}
        >
          {text.slice(0, 500) || "(empty)"}
          {text.length > 500 && "..."}
        </Text>
      </Box>
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="700px" style={{ maxHeight: "80vh" }}>
        <Dialog.Title>
          <Flex justify="between" align="center">
            <Text>Chat Context Debug</Text>
            <Button
              variant="ghost"
              size="1"
              onClick={loadContext}
              disabled={loading}
            >
              <ReloadIcon width="14" height="14" />
            </Button>
          </Flex>
        </Dialog.Title>
        <Dialog.Description size="2" mb="4">
          View the current chat context that would be sent to the AI.
        </Dialog.Description>

        {loading ? (
          <Flex justify="center" align="center" py="6">
            <Text color="gray">Loading context...</Text>
          </Flex>
        ) : !contextInfo ? (
          <Flex justify="center" align="center" py="6">
            <Text color="gray">No active chat found</Text>
          </Flex>
        ) : (
          <Tabs.Root defaultValue="summary">
            <Tabs.List>
              <Tabs.Trigger value="summary">Summary</Tabs.Trigger>
              <Tabs.Trigger value="raw">Raw Messages ({contextInfo.messageCount})</Tabs.Trigger>
              <Tabs.Trigger value="formatted">API Context ({contextInfo.formattedContext.length})</Tabs.Trigger>
            </Tabs.List>

            <Box pt="3">
              <Tabs.Content value="summary">
                <Flex direction="column" gap="3">
                  <Box
                    style={{
                      padding: "var(--space-3)",
                      backgroundColor: "var(--gray-a3)",
                      borderRadius: "var(--radius-2)",
                    }}
                  >
                    <Text size="2" weight="bold" mb="2" style={{ display: "block" }}>
                      Chat Info
                    </Text>
                    <Flex direction="column" gap="1">
                      <Text size="1">
                        <strong>Chat ID:</strong>{" "}
                        <code style={{ fontSize: "11px" }}>{contextInfo.chatId}</code>
                      </Text>
                      <Text size="1">
                        <strong>Total Messages:</strong> {contextInfo.messageCount}
                      </Text>
                    </Flex>
                  </Box>

                  <Box
                    style={{
                      padding: "var(--space-3)",
                      backgroundColor: "var(--gray-a3)",
                      borderRadius: "var(--radius-2)",
                    }}
                  >
                    <Text size="2" weight="bold" mb="2" style={{ display: "block" }}>
                      Context Analysis (for simple follow-up)
                    </Text>
                    <Flex direction="column" gap="1">
                      <Flex gap="2" align="center">
                        <Text size="1">
                          <strong>Detected Complexity:</strong>
                        </Text>
                        <Badge
                          color={contextInfo.complexity === "simple" ? "green" : "orange"}
                          size="1"
                        >
                          {contextInfo.complexity}
                        </Badge>
                      </Flex>
                      <Text size="1">
                        <strong>Messages in Context:</strong> {contextInfo.trimmedMessageCount} / {contextInfo.messageCount}
                      </Text>
                      <Text size="1">
                        <strong>Tokens Used:</strong> {contextInfo.tokensUsed} / {contextInfo.maxTokens}
                      </Text>
                      <Box mt="2">
                        <Box
                          style={{
                            height: "8px",
                            backgroundColor: "var(--gray-5)",
                            borderRadius: "4px",
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            style={{
                              height: "100%",
                              width: `${Math.min((contextInfo.tokensUsed / contextInfo.maxTokens) * 100, 100)}%`,
                              backgroundColor: contextInfo.tokensUsed > contextInfo.maxTokens * 0.8 
                                ? "var(--orange-9)" 
                                : "var(--green-9)",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </Box>
                      </Box>
                    </Flex>
                  </Box>

                  <Flex gap="2">
                    <Button
                      variant="soft"
                      size="1"
                      onClick={() => copyToClipboard(JSON.stringify(contextInfo, null, 2), "summary")}
                    >
                      {copied === "summary" ? (
                        <>
                          <CheckIcon width="14" height="14" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <CopyIcon width="14" height="14" />
                          Copy Summary JSON
                        </>
                      )}
                    </Button>
                    <Button
                      variant="soft"
                      size="1"
                      onClick={() => copyToClipboard(JSON.stringify(contextInfo.formattedContext, null, 2), "context")}
                    >
                      {copied === "context" ? (
                        <>
                          <CheckIcon width="14" height="14" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <CopyIcon width="14" height="14" />
                          Copy API Context
                        </>
                      )}
                    </Button>
                  </Flex>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="raw">
                <ScrollArea style={{ height: "400px" }}>
                  <Flex direction="column">
                    {contextInfo.messages.length === 0 ? (
                      <Text color="gray" size="2">No messages in chat</Text>
                    ) : (
                      contextInfo.messages.map((msg, i) => formatMessageForDisplay(msg, i))
                    )}
                  </Flex>
                </ScrollArea>
              </Tabs.Content>

              <Tabs.Content value="formatted">
                <ScrollArea style={{ height: "400px" }}>
                  <Flex direction="column">
                    <Text size="1" color="gray" mb="2">
                      This is what would be sent to the Gemini API as conversation history:
                    </Text>
                    {contextInfo.formattedContext.length === 0 ? (
                      <Text color="gray" size="2">No context to send (first message)</Text>
                    ) : (
                      contextInfo.formattedContext.map((msg, i) => formatGeminiMessageForDisplay(msg, i))
                    )}
                  </Flex>
                </ScrollArea>
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        )}

        <Flex gap="3" justify="end" mt="4">
          <Dialog.Close>
            <Button className={buttonStyles.actionButtonSquareSecondary}>
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}









