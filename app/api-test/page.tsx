"use client";

/**
 * External API Test Page
 *
 * Hidden test page for validating the external pickleball technique chat API.
 * Access at: /api-test
 */

import { useState, useRef } from "react";
import { Box, Flex, Text, Heading, TextArea, Button, TextField, Card, Code, Badge } from "@radix-ui/themes";

// Sample swing context from samples/swing_coach_context.json
const SAMPLE_SWING_CONTEXT = {
  "dominant_hand": "right",
  "player_height_mm": 1800,
  "summary": {
    "top_priorities": [
      {
        "value": 145.3611687499433,
        "feature_name": "stance_open_closed",
        "event": "load_position",
        "observation": "Your stance is 145 degrees open.",
        "human_name": "Stance before swinging",
        "timestamp": 2.066666666666669,
        "level": "beginner",
        "unit": "°",
        "suggestion": "Try to keep your stance about 45 degrees open to have better balance and.",
        "description": "The openness angle of the player's stance before swinging.",
        "score": 0
      },
      {
        "level": "beginner",
        "score": 2.103232066327592,
        "value": -12.26579831377413,
        "event": "ball_hit",
        "description": "How far your dominant wrist is in front of your non-dominant hip when you hit the ball.",
        "feature_name": "horizontal_wrist_position_at_ball_hit",
        "unit": "cm",
        "timestamp": 2.283061224489796,
        "human_name": "Wrist position at ball hit (front-behind)",
        "observation": "Your right wrist is just above your left hip",
        "suggestion": "Try getting your right wrist in front of your left hip."
      }
    ],
    "strengths": [
      {
        "event": "ball_hit",
        "feature_name": "cog_direction",
        "value": -15.032681297852426,
        "suggestion": "Almost there! Try to keep your body moving straight forward.",
        "level": "professional",
        "timestamp": 2.283061224489796,
        "description": "Which direction your body is moving when you hit the ball.",
        "human_name": "Body movement at ball hit",
        "observation": "Your body is leaning mostly forward and slightly to one side.",
        "score": 92.48365935107378,
        "unit": "°"
      }
    ]
  },
  "playerLevel": "intermediate",
  "swing_type": "forehand_drive",
  "progress": 72.72727272727273,
  "metrics": {
    "wrist_speed": {
      "unit": "m/s",
      "min": 0,
      "observation": "Your wrist speed is 3.5 km/h or 2.2 mph.",
      "player_wrist_velocity": 0.9784043488397587,
      "max": 15,
      "description": "The speed of the dominant wrist at ball hit."
    },
    "kinetic_chain": {
      "description": "The timing and sequencing of peak speeds during the swing.",
      "suggestion": "Try initiating your hip rotation first, then shoulder rotation, and finally wrist speed.",
      "observation": "Your hip rotation and wrist speed peaks at the same time, after your shoulder rotation.",
      "peaks": {
        "hip_peak_index": 3,
        "wrist_peak_index": 3,
        "hip_success": "false",
        "shoulder_success": "false",
        "wrist_success": "true",
        "shoulder_peak_index": 2
      }
    }
  },
  "context_version": "1.0",
  "domain": "swing_coaching",
  "sport": "pickleball",
  "categories": [
    { "name": "balance", "average_score": 47.51, "features": ["leg_width_at_load", "stance_open_closed"] },
    { "name": "power", "average_score": 63.01, "features": ["unit_turn", "leg_bend"] },
    { "name": "stability", "average_score": 54.01, "features": ["leg_width_at_load", "cog_direction"] }
  ],
  "all_features": [
    {
      "unit": "cm",
      "human_name": "Stance width before swinging",
      "suggestion": "Try to widen your stance to be more stable and powerful.",
      "score": 53.41,
      "feature_name": "leg_width_at_load",
      "event": "load_position",
      "value": -5.12,
      "observation": "Your leg width is 5 cm narrower than your shoulder width.",
      "description": "How wide your stance is compared to your shoulder width.",
      "level": "intermediate"
    },
    {
      "unit": "°",
      "human_name": "Body rotation before ball hit",
      "value": -88.73,
      "level": "advanced",
      "score": 75.11,
      "description": "The rotation of the player during the backswing.",
      "feature_name": "unit_turn",
      "event": "load_position",
      "observation": "You have rotated your shoulders -89 degrees compared to your hips.",
      "suggestion": "Try to rotate your shoulders about 45 degrees more than your hips."
    }
  ]
};

export default function ApiTestPage() {
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("What should I focus on to improve my forehand?");
  const [agentName, setAgentName] = useState("Shark");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestTime, setRequestTime] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }
    if (!prompt.trim()) {
      setError("Prompt is required");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse("");
    setRequestTime(null);

    const startTime = Date.now();
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/external/pickleball/technique-chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          agentName: agentName.trim() || "Coach",
          swingContext: SAMPLE_SWING_CONTEXT,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || `Request failed with status ${res.status}`);
      }

      // Handle streaming response
      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullResponse += chunk;
        setResponse(fullResponse);
      }

      setRequestTime(Date.now() - startTime);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request cancelled");
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <Box p="6" style={{ maxWidth: 900, margin: "0 auto" }}>
      <Flex direction="column" gap="4">
        <Flex justify="between" align="center">
          <Heading size="6">External API Test</Heading>
          <Badge color="orange" variant="soft">Hidden Test Page</Badge>
        </Flex>

        <Text color="gray" size="2">
          Test the <Code>/api/external/pickleball/technique-chat</Code> endpoint with sample swing data.
        </Text>

        <Card>
          <Flex direction="column" gap="3" p="3">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">API Key</Text>
              <TextField.Root
                placeholder="sk_live_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
              />
            </Flex>

            <Flex gap="3">
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text size="2" weight="medium">Agent Name</Text>
                <TextField.Root
                  placeholder="Coach"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                />
              </Flex>
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">Prompt</Text>
              <TextArea
                placeholder="Ask about the swing..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
            </Flex>

            <Flex gap="2">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="action-button"
              >
                {loading ? "Streaming..." : "Send Request"}
              </Button>
              {loading && (
                <Button variant="soft" color="red" onClick={handleStop}>
                  Stop
                </Button>
              )}
            </Flex>
          </Flex>
        </Card>

        {error && (
          <Card style={{ borderColor: "var(--red-6)" }}>
            <Flex p="3" gap="2" align="center">
              <Text color="red" weight="medium">Error:</Text>
              <Text color="red">{error}</Text>
            </Flex>
          </Card>
        )}

        {(response || loading) && (
          <Card>
            <Flex direction="column" gap="2" p="3">
              <Flex justify="between" align="center">
                <Text size="2" weight="medium">Response from {agentName || "Coach"}</Text>
                {requestTime && (
                  <Badge color="green" variant="soft">{requestTime}ms</Badge>
                )}
              </Flex>
              <Box
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "var(--default-font-family)",
                  lineHeight: 1.6,
                  minHeight: 100,
                }}
              >
                <Text size="2">{response || "Waiting for response..."}</Text>
                {loading && <Text color="gray">▊</Text>}
              </Box>
            </Flex>
          </Card>
        )}

        <Card>
          <Flex direction="column" gap="2" p="3">
            <Text size="2" weight="medium">Sample Swing Context (from samples/swing_coach_context.json)</Text>
            <Box
              style={{
                maxHeight: 200,
                overflow: "auto",
                fontSize: 11,
                fontFamily: "monospace",
                backgroundColor: "var(--gray-2)",
                borderRadius: 4,
                padding: 8,
              }}
            >
              <pre style={{ margin: 0 }}>
                {JSON.stringify(SAMPLE_SWING_CONTEXT, null, 2)}
              </pre>
            </Box>
          </Flex>
        </Card>
      </Flex>
    </Box>
  );
}
