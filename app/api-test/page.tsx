"use client";

/**
 * External API Test Page
 *
 * Hidden test page for validating:
 * - External pickleball technique chat API
 * - Shark technique analysis API (video upload)
 * Access at: /api-test
 */

import { useState, useRef, useCallback } from "react";
import { Box, Flex, Text, Heading, TextArea, Button, TextField, Card, Code, Badge, Select, Checkbox, Tooltip, Separator, Progress } from "@radix-ui/themes";
import { formatH36MJoints, formatLimbName, formatH36MJoint } from "@/types/h36m-joints";

/**
 * Generate a short UID with fallback for older browsers (iOS < 15.4)
 */
function generateShortUid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  // Fallback for older browsers
  return "xxxxxxxx".replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

// Type for the racket recommendation from SSE
interface RacketRecommendation {
  racket: {
    name: string;
    price_usd: number;
    focus: string;
    target_players: string[];
    characteristics: string[];
    strengths: string[];
    limitations: string[];
  };
  confidence: "high" | "medium" | "low";
  primary_reasons: string[];
}

// Types for Shark technique analysis response
interface SharkFeature {
  feature_name: string;
  feature_human_readable_name?: string;
  human_name?: string;
  level: string;
  score: number;
  value: number;
  observation: string;
  suggestion: string;
  feature_categories?: string[];
  unit?: string;
  event?: {
    name: string;
    timestamp: number;
    frame_nr: number;
  };
  highlight_joints?: number[];
  highlight_limbs?: Record<string, [number, number]>;
}

interface SharkFeatureCategory {
  average_score: number;
  feature_count: number;
  features: string[];
}

interface SharkAnalysisResult {
  status: "processing" | "done" | "error" | "failed";
  uid: string;
  warnings?: string[];
  errors?: string[];
  result?: {
    features: SharkFeature[];
    feature_categories: Record<string, SharkFeatureCategory>;
    kinetic_chain?: {
      speed_dict?: Record<string, {
        plot_values: number[];
        peak_index: number;
        peak_speed: number;
      }>;
    };
    wrist_speed?: {
      peak_speed?: number;
      unit?: string;
    };
  };
  video_entry_2D_json?: unknown;
  video_entry_3D_json?: unknown;
}

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

// Swing type options
const SWING_TYPES = [
  "forehand_drive",
  "backhand_drive",
  "forehand_volley",
  "backhand_volley",
  "serve",
  "dink",
  "lob",
  "drop_shot",
];

export default function ApiTestPage() {
  // === Technique Chat State ===
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("What should I focus on to improve my forehand?");
  const [agentName, setAgentName] = useState("Shark");
  const [insightLevel, setInsightLevel] = useState<"beginner" | "developing" | "advanced">("developing");
  const [racketRecommendation, setRacketRecommendation] = useState(false);
  const [response, setResponse] = useState("");
  const [recommendedRacket, setRecommendedRacket] = useState<RacketRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestTime, setRequestTime] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Editable swing context fields (prefilled from sample)
  const [playerLevel, setPlayerLevel] = useState<"beginner" | "intermediate" | "advanced">(
    SAMPLE_SWING_CONTEXT.playerLevel as "beginner" | "intermediate" | "advanced"
  );
  const [swingType, setSwingType] = useState(SAMPLE_SWING_CONTEXT.swing_type);
  const [dominantHand, setDominantHand] = useState<"right" | "left">(
    SAMPLE_SWING_CONTEXT.dominant_hand as "right" | "left"
  );
  const [progress, setProgress] = useState(Math.round(SAMPLE_SWING_CONTEXT.progress));
  const [sport, setSport] = useState(SAMPLE_SWING_CONTEXT.sport || "pickleball");

  // === Shark Technique Analysis State ===
  const [sharkVideoFile, setSharkVideoFile] = useState<File | null>(null);
  const [sharkSport, setSharkSport] = useState<"pickleball" | "tennis" | "padel">("pickleball");
  const [sharkSwingType, setSharkSwingType] = useState("forehand_drive");
  const [sharkDominantHand, setSharkDominantHand] = useState<"left" | "right">("right");
  const [sharkPlayerHeight, setSharkPlayerHeight] = useState(1800);
  const [sharkLoading, setSharkLoading] = useState(false);
  const [sharkError, setSharkError] = useState<string | null>(null);
  const [sharkStatus, setSharkStatus] = useState<string | null>(null);
  const [sharkResult, setSharkResult] = useState<SharkAnalysisResult | null>(null);
  const [sharkRequestTime, setSharkRequestTime] = useState<number | null>(null);
  const sharkAbortControllerRef = useRef<AbortController | null>(null);
  const sharkFileInputRef = useRef<HTMLInputElement | null>(null);

  // Build the swing context with overridden values
  const buildSwingContext = useCallback(() => {
    return {
      ...SAMPLE_SWING_CONTEXT,
      playerLevel,
      swing_type: swingType,
      dominant_hand: dominantHand,
      progress,
      sport,
    };
  }, [playerLevel, swingType, dominantHand, progress, sport]);

  /**
   * Parse SSE stream for racket recommendation mode
   */
  const parseSSEStream = useCallback(async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";
    let explanation = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (currentEvent === "recommendation") {
            try {
              const recommendation = JSON.parse(data) as RacketRecommendation;
              setRecommendedRacket(recommendation);
            } catch (e) {
              console.error("Failed to parse recommendation:", e);
            }
          } else if (currentEvent === "text") {
            explanation += data;
            setResponse(explanation);
          } else if (currentEvent === "error") {
            try {
              const errorData = JSON.parse(data);
              throw new Error(errorData.error || "Unknown SSE error");
            } catch (e) {
              if (e instanceof SyntaxError) {
                throw new Error(data);
              }
              throw e;
            }
          }
        }
      }
    }
  }, []);

  /**
   * Parse plain text stream for standard mode
   */
  const parsePlainTextStream = useCallback(async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      fullResponse += chunk;
      setResponse(fullResponse);
    }
  }, []);

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
    setRecommendedRacket(null);
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
          insightLevel,
          swingContext: buildSwingContext(),
          racketRecommendation,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || `Request failed with status ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      // Use appropriate parser based on mode
      if (racketRecommendation) {
        await parseSSEStream(reader);
      } else {
        await parsePlainTextStream(reader);
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

  // === Shark Technique Analysis Handlers ===
  const handleSharkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSharkVideoFile(file);
      setSharkError(null);
    }
  };

  const handleSharkSubmit = async () => {
    if (!sharkVideoFile) {
      setSharkError("Please select a video file");
      return;
    }

    setSharkLoading(true);
    setSharkError(null);
    setSharkStatus("Uploading video...");
    setSharkResult(null);
    setSharkRequestTime(null);

    const startTime = Date.now();
    sharkAbortControllerRef.current = new AbortController();

    try {
      // Generate a unique ID
      const uid = `webapp_${generateShortUid()}`;

      // Build metadata
      const metadata = {
        uid,
        sport: sharkSport,
        swing_type: sharkSwingType,
        dominant_hand: sharkDominantHand,
        player_height_mm: sharkPlayerHeight,
        store_data: false,
        timestamp: new Date().toISOString(),
      };

      // Create form data
      const formData = new FormData();
      formData.append("file", sharkVideoFile, sharkVideoFile.name);
      formData.append("metadata", JSON.stringify(metadata));

      setSharkStatus("Processing video... (this may take 30-120 seconds)");

      const res = await fetch("/api/shark/analyze", {
        method: "POST",
        body: formData,
        signal: sharkAbortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || `Request failed with status ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      // Parse streaming JSON response
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Try to parse complete JSON lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const result = JSON.parse(line) as SharkAnalysisResult;

              if (result.status === "processing") {
                setSharkStatus("Processing video... (analyzing poses and technique)");
              } else if (result.status === "done") {
                setSharkResult(result);
                setSharkStatus("Analysis complete!");
                setSharkRequestTime(Date.now() - startTime);
              } else if (result.status === "error" || result.status === "failed") {
                throw new Error(result.errors?.join(", ") || "Analysis failed");
              }
            } catch (parseError) {
              // Not valid JSON, might be partial data
              console.log("Partial data received, continuing...");
            }
          }
        }
      }

      // Try to parse any remaining buffer content
      if (buffer.trim()) {
        try {
          const result = JSON.parse(buffer) as SharkAnalysisResult;
          if (result.status === "done") {
            setSharkResult(result);
            setSharkStatus("Analysis complete!");
            setSharkRequestTime(Date.now() - startTime);
          } else if (result.status === "error" || result.status === "failed") {
            throw new Error(result.errors?.join(", ") || "Analysis failed");
          }
        } catch {
          // Ignore parse errors for remaining buffer
        }
      }

    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setSharkError("Request cancelled");
      } else {
        setSharkError(err instanceof Error ? err.message : "Unknown error");
      }
      setSharkStatus(null);
    } finally {
      setSharkLoading(false);
      sharkAbortControllerRef.current = null;
    }
  };

  const handleSharkStop = () => {
    if (sharkAbortControllerRef.current) {
      sharkAbortControllerRef.current.abort();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box
      style={{
        position: "fixed",
        inset: 0,
        overflow: "auto",
        backgroundColor: "var(--gray-1)",
      }}
    >
      <Box p="6" style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 48 }}>
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
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text size="2" weight="medium">Insight Level</Text>
                <Select.Root value={insightLevel} onValueChange={(v) => setInsightLevel(v as typeof insightLevel)}>
                  <Select.Trigger placeholder="Select level..." />
                  <Select.Content>
                    <Select.Item value="beginner">Beginner (Simple, encouraging)</Select.Item>
                    <Select.Item value="developing">Developing (Balanced)</Select.Item>
                    <Select.Item value="advanced">Advanced (Technical)</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Flex>

            {/* Swing Context Controls */}
            <Box
              style={{
                backgroundColor: "var(--gray-2)",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text size="2" weight="medium" style={{ marginBottom: 12, display: "block" }}>
                Swing Context (editable)
              </Text>
              <Flex gap="3" wrap="wrap">
                <Flex direction="column" gap="1" style={{ minWidth: 140 }}>
                  <Text size="1" color="gray">Player Level</Text>
                  <Select.Root value={playerLevel} onValueChange={(v) => setPlayerLevel(v as typeof playerLevel)}>
                    <Select.Trigger placeholder="Level..." />
                    <Select.Content>
                      <Select.Item value="beginner">Beginner</Select.Item>
                      <Select.Item value="intermediate">Intermediate</Select.Item>
                      <Select.Item value="advanced">Advanced</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>
                <Flex direction="column" gap="1" style={{ minWidth: 140 }}>
                  <Text size="1" color="gray">Swing Type</Text>
                  <Select.Root value={swingType} onValueChange={setSwingType}>
                    <Select.Trigger placeholder="Type..." />
                    <Select.Content>
                      {SWING_TYPES.map((type) => (
                        <Select.Item key={type} value={type}>
                          {type.replace(/_/g, " ")}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Flex>
                <Flex direction="column" gap="1" style={{ minWidth: 100 }}>
                  <Text size="1" color="gray">Dominant Hand</Text>
                  <Select.Root value={dominantHand} onValueChange={(v) => setDominantHand(v as typeof dominantHand)}>
                    <Select.Trigger placeholder="Hand..." />
                    <Select.Content>
                      <Select.Item value="right">Right</Select.Item>
                      <Select.Item value="left">Left</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>
                <Flex direction="column" gap="1" style={{ minWidth: 100 }}>
                  <Text size="1" color="gray">Sport</Text>
                  <Select.Root value={sport} onValueChange={setSport}>
                    <Select.Trigger placeholder="Sport..." />
                    <Select.Content>
                      <Select.Item value="pickleball">Pickleball</Select.Item>
                      <Select.Item value="tennis">Tennis</Select.Item>
                      <Select.Item value="padel">Padel</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>
                <Flex direction="column" gap="1" style={{ minWidth: 120 }}>
                  <Text size="1" color="gray">Progress: {progress}%</Text>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    style={{ width: "100%", marginTop: 4 }}
                  />
                </Flex>
              </Flex>
            </Box>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">Prompt</Text>
              <TextArea
                placeholder="Ask about the swing..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
            </Flex>

            <Flex align="center" gap="2">
              <Checkbox
                id="racket-recommendation"
                checked={racketRecommendation}
                onCheckedChange={(checked) => setRacketRecommendation(checked === true)}
              />
              <label htmlFor="racket-recommendation">
                <Text size="2" weight="medium" style={{ cursor: "pointer" }}>
                  Include Racket Recommendation
                </Text>
              </label>
              {racketRecommendation && (
                <Tooltip content="Server-Sent Events: Returns structured racket data first, then streams the explanation text">
                  <Badge color="blue" variant="soft" size="1" style={{ cursor: "help" }}>SSE Mode</Badge>
                </Tooltip>
              )}
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

        {recommendedRacket && (
          <Card style={{ borderColor: "var(--blue-6)", backgroundColor: "var(--blue-2)" }}>
            <Flex direction="column" gap="3" p="3">
              <Flex justify="between" align="center">
                <Flex gap="2" align="center">
                  <Text size="3" weight="bold">{recommendedRacket.racket.name}</Text>
                  <Badge color="green" variant="soft">${recommendedRacket.racket.price_usd.toFixed(2)}</Badge>
                </Flex>
                <Badge
                  color={
                    recommendedRacket.confidence === "high" ? "green" :
                    recommendedRacket.confidence === "medium" ? "yellow" : "orange"
                  }
                  variant="soft"
                >
                  {recommendedRacket.confidence} confidence
                </Badge>
              </Flex>

              <Text size="2" color="gray">{recommendedRacket.racket.focus}</Text>

              <Flex direction="column" gap="1">
                <Text size="1" weight="medium" color="gray">Why this racket:</Text>
                <Flex direction="column" gap="1">
                  {recommendedRacket.primary_reasons.map((reason, i) => (
                    <Text key={i} size="2">• {reason}</Text>
                  ))}
                </Flex>
              </Flex>

              <Flex gap="4" wrap="wrap">
                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 150 }}>
                  <Text size="1" weight="medium" color="gray">Target Players</Text>
                  <Text size="1">{recommendedRacket.racket.target_players.join(", ")}</Text>
                </Flex>
                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 150 }}>
                  <Text size="1" weight="medium" color="gray">Characteristics</Text>
                  <Text size="1">{recommendedRacket.racket.characteristics.join(", ")}</Text>
                </Flex>
              </Flex>

              <Flex gap="4" wrap="wrap">
                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 150 }}>
                  <Text size="1" weight="medium" color="green">Strengths</Text>
                  <Text size="1">{recommendedRacket.racket.strengths.join(", ")}</Text>
                </Flex>
                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 150 }}>
                  <Text size="1" weight="medium" color="orange">Limitations</Text>
                  <Text size="1">{recommendedRacket.racket.limitations.join(", ")}</Text>
                </Flex>
              </Flex>
            </Flex>
          </Card>
        )}

        {(response || loading) && (
          <Card>
            <Flex direction="column" gap="2" p="3">
              <Flex justify="between" align="center">
                <Text size="2" weight="medium">
                  {recommendedRacket ? "Recommendation Explanation" : `Response from ${agentName || "Coach"}`}
                </Text>
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
            <Flex justify="between" align="center">
              <Text size="2" weight="medium">Swing Context Being Sent</Text>
              <Badge color="gray" variant="soft" size="1">Based on sample + your edits</Badge>
            </Flex>
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
                {JSON.stringify(buildSwingContext(), null, 2)}
              </pre>
            </Box>
          </Flex>
        </Card>

        {/* Shark Technique Analysis Section */}
        <Separator size="4" style={{ margin: "16px 0" }} />

        <Flex justify="between" align="center">
          <Heading size="5">Shark Technique Analysis</Heading>
          <Badge color="purple" variant="soft">Video Upload</Badge>
        </Flex>

        <Text color="gray" size="2">
          Upload a video to analyze technique using the <Code>/api/shark/analyze</Code> endpoint.
          Supports tennis, padel, and pickleball. Recommended: 3-10 second clips filmed from ground level.
        </Text>

        <Card>
          <Flex direction="column" gap="3" p="3">
            {/* Video Upload */}
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">Video File</Text>
              <input
                ref={sharkFileInputRef}
                type="file"
                accept=".mp4,.mov,.avi,.mkv,video/*"
                onChange={handleSharkFileChange}
                style={{ display: "none" }}
              />
              <Flex gap="2" align="center">
                <Button
                  variant="soft"
                  onClick={() => sharkFileInputRef.current?.click()}
                >
                  {sharkVideoFile ? "Change Video" : "Select Video"}
                </Button>
                {sharkVideoFile && (
                  <Flex gap="2" align="center">
                    <Text size="2">{sharkVideoFile.name}</Text>
                    <Badge color="gray" variant="soft" size="1">
                      {formatFileSize(sharkVideoFile.size)}
                    </Badge>
                  </Flex>
                )}
              </Flex>
              <Text size="1" color="gray">Supported: .mp4, .mov, .avi, .mkv</Text>
            </Flex>

            {/* Metadata Fields */}
            <Box
              style={{
                backgroundColor: "var(--gray-2)",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text size="2" weight="medium" style={{ marginBottom: 12, display: "block" }}>
                Analysis Parameters
              </Text>
              <Flex gap="3" wrap="wrap">
                <Flex direction="column" gap="1" style={{ minWidth: 140 }}>
                  <Text size="1" color="gray">Sport</Text>
                  <Select.Root value={sharkSport} onValueChange={(v) => setSharkSport(v as typeof sharkSport)}>
                    <Select.Trigger placeholder="Sport..." />
                    <Select.Content>
                      <Select.Item value="pickleball">Pickleball</Select.Item>
                      <Select.Item value="tennis">Tennis</Select.Item>
                      <Select.Item value="padel">Padel</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>
                <Flex direction="column" gap="1" style={{ minWidth: 160 }}>
                  <Text size="1" color="gray">Swing Type</Text>
                  <Select.Root value={sharkSwingType} onValueChange={setSharkSwingType}>
                    <Select.Trigger placeholder="Type..." />
                    <Select.Content>
                      {SWING_TYPES.map((type) => (
                        <Select.Item key={type} value={type}>
                          {type.replace(/_/g, " ")}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Flex>
                <Flex direction="column" gap="1" style={{ minWidth: 120 }}>
                  <Text size="1" color="gray">Dominant Hand</Text>
                  <Select.Root value={sharkDominantHand} onValueChange={(v) => setSharkDominantHand(v as typeof sharkDominantHand)}>
                    <Select.Trigger placeholder="Hand..." />
                    <Select.Content>
                      <Select.Item value="right">Right</Select.Item>
                      <Select.Item value="left">Left</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>
                <Flex direction="column" gap="1" style={{ minWidth: 140 }}>
                  <Text size="1" color="gray">Player Height (mm)</Text>
                  <TextField.Root
                    type="number"
                    value={sharkPlayerHeight}
                    onChange={(e) => setSharkPlayerHeight(Number(e.target.value))}
                    min={1000}
                    max={2500}
                  />
                </Flex>
              </Flex>
            </Box>

            <Flex gap="2">
              <Button
                onClick={handleSharkSubmit}
                disabled={sharkLoading || !sharkVideoFile}
              >
                {sharkLoading ? "Processing..." : "Analyze Video"}
              </Button>
              {sharkLoading && (
                <Button variant="soft" color="red" onClick={handleSharkStop}>
                  Stop
                </Button>
              )}
            </Flex>
          </Flex>
        </Card>

        {/* Shark Status */}
        {sharkStatus && (
          <Card>
            <Flex direction="column" gap="2" p="3">
              <Flex justify="between" align="center">
                <Text size="2" weight="medium">Status</Text>
                {sharkRequestTime && (
                  <Badge color="green" variant="soft">{(sharkRequestTime / 1000).toFixed(1)}s</Badge>
                )}
              </Flex>
              <Flex gap="2" align="center">
                {sharkLoading && <Progress size="1" style={{ width: 100 }} />}
                <Text size="2">{sharkStatus}</Text>
              </Flex>
            </Flex>
          </Card>
        )}

        {/* Shark Error */}
        {sharkError && (
          <Card style={{ borderColor: "var(--red-6)" }}>
            <Flex p="3" gap="2" align="center">
              <Text color="red" weight="medium">Error:</Text>
              <Text color="red">{sharkError}</Text>
            </Flex>
          </Card>
        )}

        {/* Shark Results */}
        {sharkResult && sharkResult.status === "done" && sharkResult.result && (
          <>
            {/* Warnings */}
            {sharkResult.warnings && sharkResult.warnings.length > 0 && (
              <Card style={{ borderColor: "var(--yellow-6)", backgroundColor: "var(--yellow-2)" }}>
                <Flex direction="column" gap="1" p="3">
                  <Text size="2" weight="medium" color="yellow">Warnings</Text>
                  {sharkResult.warnings.map((warning, i) => (
                    <Text key={i} size="2">• {warning}</Text>
                  ))}
                </Flex>
              </Card>
            )}

            {/* Feature Categories Summary */}
            {sharkResult.result.feature_categories && Object.keys(sharkResult.result.feature_categories).length > 0 && (
              <Card>
                <Flex direction="column" gap="3" p="3">
                  <Text size="2" weight="medium">Category Scores</Text>
                  <Flex gap="3" wrap="wrap">
                    {Object.entries(sharkResult.result.feature_categories).map(([name, category]) => (
                      <Box
                        key={name}
                        style={{
                          backgroundColor: "var(--gray-2)",
                          borderRadius: 8,
                          padding: 12,
                          minWidth: 120,
                        }}
                      >
                        <Text size="1" color="gray" style={{ textTransform: "capitalize" }}>{name}</Text>
                        <Flex align="baseline" gap="1">
                          <Text size="4" weight="bold">{category.average_score.toFixed(0)}</Text>
                          <Text size="1" color="gray">/ 100</Text>
                        </Flex>
                        <Text size="1" color="gray">{category.feature_count} features</Text>
                      </Box>
                    ))}
                  </Flex>
                </Flex>
              </Card>
            )}

            {/* Features List */}
            {sharkResult.result.features && sharkResult.result.features.length > 0 && (
              <Card>
                <Flex direction="column" gap="3" p="3">
                  <Flex justify="between" align="center">
                    <Text size="2" weight="medium">Technique Features</Text>
                    <Badge color="gray" variant="soft" size="1">{sharkResult.result.features.length} features</Badge>
                  </Flex>
                  <Flex direction="column" gap="2">
                    {sharkResult.result.features.slice(0, 10).map((feature, i) => (
                      <Box
                        key={i}
                        style={{
                          backgroundColor: "var(--gray-2)",
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <Flex justify="between" align="start" gap="2">
                          <Flex direction="column" gap="1" style={{ flex: 1 }}>
                            <Flex gap="2" align="center">
                              <Text size="2" weight="medium">
                                {feature.feature_human_readable_name || feature.human_name || feature.feature_name.replace(/_/g, " ")}
                              </Text>
                              <Badge
                                color={
                                  feature.level === "professional" ? "green" :
                                  feature.level === "advanced" ? "blue" :
                                  feature.level === "intermediate" ? "yellow" : "orange"
                                }
                                variant="soft"
                                size="1"
                              >
                                {feature.level}
                              </Badge>
                            </Flex>
                            <Text size="1" color="gray">{feature.observation}</Text>
                            {feature.suggestion && (
                              <Text size="1" color="blue">{feature.suggestion}</Text>
                            )}
                            {/* Highlight information */}
                            {(feature.highlight_joints || feature.highlight_limbs) && (
                              <Flex gap="2" wrap="wrap" style={{ marginTop: 4 }}>
                                {feature.highlight_joints && feature.highlight_joints.length > 0 && (
                                  <Tooltip content={formatH36MJoints(feature.highlight_joints)}>
                                    <Badge color="purple" variant="outline" size="1" style={{ cursor: "help" }}>
                                      Joints: {formatH36MJoints(feature.highlight_joints)}
                                    </Badge>
                                  </Tooltip>
                                )}
                                {feature.highlight_limbs && Object.keys(feature.highlight_limbs).length > 0 && (
                                  <Tooltip content={Object.entries(feature.highlight_limbs).map(([name, joints]) => `${formatLimbName(name)}: ${formatH36MJoint(joints[0])} → ${formatH36MJoint(joints[1])}`).join("\n")}>
                                    <Badge color="cyan" variant="outline" size="1" style={{ cursor: "help" }}>
                                      Limbs: {Object.keys(feature.highlight_limbs).map(formatLimbName).join(", ")}
                                    </Badge>
                                  </Tooltip>
                                )}
                              </Flex>
                            )}
                          </Flex>
                          <Flex direction="column" align="end" gap="1">
                            <Text size="3" weight="bold">{feature.score.toFixed(0)}</Text>
                            <Text size="1" color="gray">
                              {feature.value.toFixed(1)}{feature.unit || ""}
                            </Text>
                          </Flex>
                        </Flex>
                      </Box>
                    ))}
                    {sharkResult.result.features.length > 10 && (
                      <Text size="1" color="gray" style={{ textAlign: "center" }}>
                        ...and {sharkResult.result.features.length - 10} more features
                      </Text>
                    )}
                  </Flex>
                </Flex>
              </Card>
            )}

            {/* Raw Response */}
            <Card>
              <Flex direction="column" gap="2" p="3">
                <Flex justify="between" align="center">
                  <Text size="2" weight="medium">Raw Response</Text>
                  <Badge color="gray" variant="soft" size="1">JSON</Badge>
                </Flex>
                <Box
                  style={{
                    maxHeight: 300,
                    overflow: "auto",
                    fontSize: 11,
                    fontFamily: "monospace",
                    backgroundColor: "var(--gray-2)",
                    borderRadius: 4,
                    padding: 8,
                  }}
                >
                  <pre style={{ margin: 0 }}>
                    {JSON.stringify(sharkResult, null, 2)}
                  </pre>
                </Box>
              </Flex>
            </Card>
          </>
        )}
      </Flex>
      </Box>
    </Box>
  );
}
