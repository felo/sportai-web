"use client";

/**
 * Debug dialog for checking Redis/rate limiting connection status
 * Only visible in developer mode
 */

import { useEffect, useState, useCallback } from "react";
import { Box, Flex, Button, Dialog, Text, Badge, Spinner } from "@radix-ui/themes";
import { ReloadIcon, CheckCircledIcon, CrossCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";

interface RedisDebugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RedisHealth {
  status: "connected" | "disconnected" | "error";
  provider: "upstash" | "memory" | "none";
  latency?: number;
  timestamp: string;
  error?: string;
  details?: {
    url?: string;
    hasToken: boolean;
    testKey?: string;
    testValue?: string;
  };
}

export function RedisDebugDialog({ open, onOpenChange }: RedisDebugDialogProps) {
  const [health, setHealth] = useState<RedisHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [rateLimitTest, setRateLimitTest] = useState<{
    tested: boolean;
    requestCount: number;
    rateLimited: boolean;
    statusCodes: number[];
  } | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug/redis");
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      setHealth({
        status: "error",
        provider: "none",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Failed to check health",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const testRateLimit = useCallback(async () => {
    setRateLimitTest({ tested: false, requestCount: 0, rateLimited: false, statusCodes: [] });
    const statusCodes: number[] = [];
    
    // Send 15 rapid requests to test rate limiting
    for (let i = 0; i < 15; i++) {
      try {
        const formData = new FormData();
        formData.append("prompt", "rate limit test");
        
        const response = await fetch("/api/llm", {
          method: "POST",
          body: formData,
        });
        statusCodes.push(response.status);
        
        setRateLimitTest(prev => ({
          tested: false,
          requestCount: i + 1,
          rateLimited: statusCodes.includes(429),
          statusCodes: [...statusCodes],
        }));
      } catch {
        statusCodes.push(0);
      }
    }
    
    setRateLimitTest({
      tested: true,
      requestCount: 15,
      rateLimited: statusCodes.includes(429),
      statusCodes,
    });
  }, []);

  useEffect(() => {
    if (open) {
      checkHealth();
      setRateLimitTest(null);
    }
  }, [open, checkHealth]);

  const getStatusIcon = () => {
    if (!health) return null;
    switch (health.status) {
      case "connected":
        return <CheckCircledIcon width={20} height={20} color="var(--green-9)" />;
      case "disconnected":
        return <ExclamationTriangleIcon width={20} height={20} color="var(--orange-9)" />;
      case "error":
        return <CrossCircledIcon width={20} height={20} color="var(--red-9)" />;
    }
  };

  const getStatusColor = (): "green" | "orange" | "red" => {
    if (!health) return "orange";
    switch (health.status) {
      case "connected":
        return "green";
      case "disconnected":
        return "orange";
      case "error":
        return "red";
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="500px">
        <Dialog.Title>
          <Flex justify="between" align="center">
            <Flex gap="2" align="center">
              <Text>Redis / Rate Limiting</Text>
              {getStatusIcon()}
            </Flex>
            <Button
              variant="ghost"
              size="1"
              onClick={checkHealth}
              disabled={loading}
            >
              <ReloadIcon width="14" height="14" />
            </Button>
          </Flex>
        </Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Check the connection status of Redis for rate limiting.
        </Dialog.Description>

        {loading && !health ? (
          <Flex justify="center" align="center" py="6">
            <Spinner size="2" />
            <Text color="gray" ml="2">Checking connection...</Text>
          </Flex>
        ) : !health ? (
          <Flex justify="center" align="center" py="6">
            <Text color="gray">Unable to check status</Text>
          </Flex>
        ) : (
          <Flex direction="column" gap="4">
            {/* Connection Status */}
            <Box
              style={{
                padding: "var(--space-4)",
                backgroundColor: "var(--gray-a3)",
                borderRadius: "var(--radius-3)",
              }}
            >
              <Flex direction="column" gap="3">
                <Flex justify="between" align="center">
                  <Text size="2" weight="bold">Connection Status</Text>
                  <Badge color={getStatusColor()} size="2">
                    {health.status.toUpperCase()}
                  </Badge>
                </Flex>
                
                <Flex direction="column" gap="2">
                  <Flex justify="between">
                    <Text size="2" color="gray">Provider:</Text>
                    <Text size="2">{health.provider}</Text>
                  </Flex>
                  
                  {health.latency !== undefined && (
                    <Flex justify="between">
                      <Text size="2" color="gray">Latency:</Text>
                      <Text size="2">{health.latency}ms</Text>
                    </Flex>
                  )}
                  
                  {health.details?.url && (
                    <Flex justify="between">
                      <Text size="2" color="gray">URL:</Text>
                      <Text size="1" style={{ fontFamily: "monospace" }}>
                        {health.details.url}
                      </Text>
                    </Flex>
                  )}
                  
                  <Flex justify="between">
                    <Text size="2" color="gray">Token configured:</Text>
                    <Text size="2">{health.details?.hasToken ? "Yes" : "No"}</Text>
                  </Flex>
                  
                  <Flex justify="between">
                    <Text size="2" color="gray">Checked at:</Text>
                    <Text size="1" style={{ fontFamily: "monospace" }}>
                      {new Date(health.timestamp).toLocaleTimeString()}
                    </Text>
                  </Flex>
                </Flex>
                
                {health.error && (
                  <Box
                    style={{
                      padding: "var(--space-2)",
                      backgroundColor: "var(--red-a3)",
                      borderRadius: "var(--radius-2)",
                      marginTop: "var(--space-2)",
                    }}
                  >
                    <Text size="1" color="red" style={{ fontFamily: "monospace" }}>
                      {health.error}
                    </Text>
                  </Box>
                )}
              </Flex>
            </Box>

            {/* Rate Limit Test */}
            <Box
              style={{
                padding: "var(--space-4)",
                backgroundColor: "var(--gray-a3)",
                borderRadius: "var(--radius-3)",
              }}
            >
              <Flex direction="column" gap="3">
                <Flex justify="between" align="center">
                  <Text size="2" weight="bold">Rate Limit Test</Text>
                  <Button
                    variant="soft"
                    size="1"
                    onClick={testRateLimit}
                    disabled={rateLimitTest ? !rateLimitTest.tested : false}
                  >
                    {rateLimitTest && !rateLimitTest.tested ? (
                      <>
                        <Spinner size="1" />
                        Testing ({rateLimitTest.requestCount}/15)
                      </>
                    ) : (
                      "Run Test"
                    )}
                  </Button>
                </Flex>
                
                <Text size="1" color="gray">
                  Sends 15 rapid requests to /api/llm to verify rate limiting is working.
                  Guest limit is 12/minute, so requests 13-15 should return 429.
                </Text>
                
                {rateLimitTest?.tested && (
                  <Box>
                    <Flex gap="2" align="center" mb="2">
                      {rateLimitTest.rateLimited ? (
                        <>
                          <CheckCircledIcon color="var(--green-9)" />
                          <Text size="2" color="green">Rate limiting is working!</Text>
                        </>
                      ) : (
                        <>
                          <CrossCircledIcon color="var(--red-9)" />
                          <Text size="2" color="red">Rate limiting NOT triggered</Text>
                        </>
                      )}
                    </Flex>
                    
                    <Flex gap="1" wrap="wrap">
                      {rateLimitTest.statusCodes.map((code, i) => (
                        <Badge
                          key={i}
                          size="1"
                          color={code === 200 ? "green" : code === 429 ? "orange" : "red"}
                        >
                          {code}
                        </Badge>
                      ))}
                    </Flex>
                  </Box>
                )}
              </Flex>
            </Box>

            {/* Environment Info */}
            <Box
              style={{
                padding: "var(--space-3)",
                backgroundColor: "var(--gray-a2)",
                borderRadius: "var(--radius-2)",
              }}
            >
              <Text size="1" color="gray">
                <strong>Note:</strong> In development, rate limiting uses in-memory storage 
                (resets on server restart). In production with Upstash Redis, limits persist 
                across serverless function instances.
              </Text>
            </Box>
          </Flex>
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

