/**
 * External API: Pickleball Technique Chat
 *
 * POST /api/external/pickleball/technique-chat
 *
 * Streaming endpoint for external developers (e.g., Pickleball apps)
 * to get AI coaching responses based on swing analysis data.
 *
 * Authentication: API Key (Bearer sk_live_...)
 * Rate Limiting: 30 requests/minute per API key
 *
 * Racket Recommendation Mode:
 * When racketRecommendation: true, returns SSE format with:
 * - event: recommendation (structured racket data)
 * - event: text (streamed explanation)
 * - event: done (end of stream)
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { logger } from "@/lib/logger";
import {
  validateApiKey,
  trackApiKeyUsage,
  apiKeyUnauthorizedResponse,
  hasPermission,
  apiKeyForbiddenResponse,
} from "@/lib/api-key-auth";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { formatSwingContextForLLM, validateSwingContext } from "@/lib/swing-context-formatter";
import {
  buildExternalPickleballSystemPrompt,
  buildMinimalExternalPrompt,
  buildRacketRecommendationPrompt,
  buildRacketExplanationPrompt,
} from "@/lib/prompts-external";
import { encodeSSEEvent, createSSEHeaders } from "@/lib/sse-utils";
import { getRacketByName, getAllRacketNames } from "@/database/pickleball/rackets";
import type {
  TechniqueChatRequest,
  ConversationMessage,
  InsightLevel,
  RacketRecommendationResult,
  SSERacketRecommendation,
} from "@/types/external-api";

// Use Node.js runtime for streaming
export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute max for technique chat

// Gemini Flash for fast responses
const MODEL_NAME = "gemini-2.5-flash";
const REQUIRED_PERMISSION = "pickleball:chat";

// Lazy initialization of Gemini client
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Convert conversation history to Gemini format
 */
function convertHistoryToGeminiFormat(history: ConversationMessage[]): Array<{ role: string; parts: Array<{ text: string }> }> {
  return history.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
}

/**
 * Get JSON schema for racket recommendation structured output
 * Built as a function to ensure getAllRacketNames() is called at runtime
 */
function getRacketRecommendationSchema(): Schema {
  // Using 'as unknown as Schema' to work around strict Gemini SDK type definitions
  // The schema is valid but the TypeScript types are overly restrictive for enum properties
  return {
    type: SchemaType.OBJECT,
    properties: {
      recommended_racket: {
        type: SchemaType.STRING,
        description: "The name of the recommended racket",
        enum: getAllRacketNames(),
      },
      confidence: {
        type: SchemaType.STRING,
        description: "Confidence level in the recommendation",
        enum: ["high", "medium", "low"],
      },
      primary_reasons: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Top 2-3 reasons for this recommendation",
      },
    },
    required: ["recommended_racket", "confidence", "primary_reasons"],
  } as unknown as Schema;
}

/**
 * Handle racket recommendation request with parallel LLM calls
 * Returns SSE-formatted streaming response
 */
async function handleRacketRecommendation(
  swingContextText: string,
  playerLevel: string | undefined,
  agentName: string,
  insightLevel: InsightLevel,
  requestId: string,
  startTime: number,
  apiKeyId: string
): Promise<Response> {
  const genAI = getGenAI();

  // Build the recommendation prompt
  const recommendationPrompt = buildRacketRecommendationPrompt(swingContextText, playerLevel);

  logger.debug(`[${requestId}] Starting parallel LLM calls for racket recommendation`);

  // Model for structured JSON output (recommendation)
  const jsonModel = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: getRacketRecommendationSchema(),
    },
  });

  // Start the JSON recommendation call
  const recommendationPromise = jsonModel.generateContent(recommendationPrompt);

  // Create SSE streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Wait for structured recommendation (typically 200-500ms)
        const recommendationResult = await recommendationPromise;
        const recommendationText = recommendationResult.response.text();

        logger.debug(`[${requestId}] Recommendation received: ${recommendationText}`);

        let recommendation: RacketRecommendationResult;
        try {
          recommendation = JSON.parse(recommendationText);
        } catch (parseError) {
          logger.error(`[${requestId}] Failed to parse recommendation JSON:`, parseError);
          controller.enqueue(encodeSSEEvent("error", { error: "Failed to parse recommendation" }));
          controller.close();
          return;
        }

        // Validate the recommended racket exists
        const racketProduct = getRacketByName(recommendation.recommended_racket);
        if (!racketProduct) {
          logger.error(`[${requestId}] Invalid racket recommended: ${recommendation.recommended_racket}`);
          controller.enqueue(encodeSSEEvent("error", { error: "Invalid racket recommendation" }));
          controller.close();
          return;
        }

        // 2. Send the recommendation event with full racket details
        const sseRecommendation: SSERacketRecommendation = {
          racket: {
            name: racketProduct.name,
            price_usd: racketProduct.price_usd,
            focus: racketProduct.focus,
            target_players: racketProduct.target_players,
            characteristics: racketProduct.characteristics,
            strengths: racketProduct.strengths,
            limitations: racketProduct.limitations,
          },
          confidence: recommendation.confidence,
          primary_reasons: recommendation.primary_reasons,
        };

        controller.enqueue(encodeSSEEvent("recommendation", sseRecommendation));

        // 3. Now start the explanation stream (after we know the recommendation)
        const explanationPrompt = buildRacketExplanationPrompt(
          swingContextText,
          recommendation.recommended_racket,
          recommendation.primary_reasons,
          agentName,
          insightLevel
        );

        const streamModel = genAI.getGenerativeModel({
          model: MODEL_NAME,
          systemInstruction: `You are ${agentName}, a friendly pickleball coach.`,
        });

        const explanationResult = await streamModel.generateContentStream(explanationPrompt);

        // 4. Stream the explanation text
        for await (const chunk of explanationResult.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encodeSSEEvent("text", text));
          }
        }

        // 5. Send done event
        controller.enqueue(encodeSSEEvent("done", {}));
        controller.close();

        const duration = Date.now() - startTime;
        logger.info(`[${requestId}] Racket recommendation stream completed in ${duration}ms`);

        // Track usage (non-blocking)
        trackApiKeyUsage(apiKeyId).catch((err: unknown) => {
          logger.error(`[${requestId}] Failed to track usage:`, err);
        });
      } catch (error) {
        logger.error(`[${requestId}] Racket recommendation error:`, error);
        const errorMessage = error instanceof Error ? error.message : "Recommendation failed";
        controller.enqueue(encodeSSEEvent("error", { error: errorMessage }));

        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
    cancel() {
      logger.info(`[${requestId}] Racket recommendation stream cancelled by client`);
    },
  });

  return new Response(stream, {
    headers: createSSEHeaders({
      "X-Request-Id": requestId,
      "X-Model-Used": MODEL_NAME,
      "X-Recommendation-Mode": "true",
    }),
  });
}

/**
 * POST /api/external/pickleball/technique-chat
 *
 * Request body:
 * - prompt: string (required) - User's question
 * - swingContext: object (required) - Swing analysis data
 * - agentName?: string - Custom agent name (default: "Coach")
 * - insightLevel?: "beginner" | "developing" | "advanced" - Response complexity (default: "developing")
 * - conversationHistory?: array - Previous messages
 * - racketRecommendation?: boolean - When true, returns SSE with racket recommendation
 *
 * Response:
 * - Default: Streaming text/plain
 * - With racketRecommendation: SSE (text/event-stream) with events:
 *   - "recommendation": Structured racket data
 *   - "text": Streamed explanation chunks
 *   - "done": End of stream
 *   - "error": Error message (if failed)
 */
export async function POST(request: NextRequest) {
  const requestId = `ext_pb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startTime = Date.now();

  logger.info(`[${requestId}] External pickleball technique-chat request`);

  try {
    // 1. Validate API key
    const apiKey = await validateApiKey(request);
    if (!apiKey) {
      logger.warn(`[${requestId}] Invalid or missing API key`);
      return apiKeyUnauthorizedResponse();
    }

    logger.debug(`[${requestId}] API key validated: ${apiKey.name} (${apiKey.id.slice(0, 8)}...)`);

    // 2. Check permission
    if (!hasPermission(apiKey, REQUIRED_PERMISSION) && !hasPermission(apiKey, "*")) {
      logger.warn(`[${requestId}] API key missing permission: ${REQUIRED_PERMISSION}`);
      return apiKeyForbiddenResponse(`Missing required permission: ${REQUIRED_PERMISSION}`);
    }

    // 3. Rate limit check (keyed by API key ID)
    const rateLimitResult = await checkRateLimit(
      `apikey:${apiKey.id}`,
      "external_standard"
    );

    if (!rateLimitResult.success) {
      logger.warn(`[${requestId}] Rate limit exceeded for API key: ${apiKey.name}`);
      return rateLimitedResponse(rateLimitResult);
    }

    // 4. Parse and validate request body
    let body: TechniqueChatRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate prompt
    if (!body.prompt || typeof body.prompt !== "string" || body.prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing required field: prompt" },
        { status: 400 }
      );
    }

    // Validate swing context
    const contextError = validateSwingContext(body.swingContext);
    if (contextError) {
      return NextResponse.json(
        { error: contextError },
        { status: 400 }
      );
    }

    const prompt = body.prompt.trim();
    const agentName = body.agentName || "Coach";
    const insightLevel: InsightLevel = body.insightLevel || "developing";
    const conversationHistory = body.conversationHistory || [];
    const racketRecommendation = body.racketRecommendation === true;

    logger.debug(`[${requestId}] Prompt: ${prompt.slice(0, 100)}...`);
    logger.debug(`[${requestId}] Agent: ${agentName}`);
    logger.debug(`[${requestId}] Insight level: ${insightLevel}`);
    logger.debug(`[${requestId}] History: ${conversationHistory.length} messages`);
    logger.debug(`[${requestId}] Swing type: ${body.swingContext.swing_type}`);
    logger.debug(`[${requestId}] Racket recommendation: ${racketRecommendation}`);

    // 5. Format swing context for LLM
    const swingContextText = formatSwingContextForLLM(body.swingContext);
    const hasRichContext = swingContextText.split("\n").length > 10;

    // 6. Handle racket recommendation mode (SSE response)
    if (racketRecommendation) {
      logger.info(`[${requestId}] Processing racket recommendation request`);
      return handleRacketRecommendation(
        swingContextText,
        body.swingContext.playerLevel,
        agentName,
        insightLevel,
        requestId,
        startTime,
        apiKey.id
      );
    }

    // 7. Standard coaching chat (text/plain streaming)
    // Build system prompt
    const systemPrompt = hasRichContext
      ? buildExternalPickleballSystemPrompt(swingContextText, agentName, insightLevel)
      : buildMinimalExternalPrompt(body.swingContext.swing_type, agentName);

    logger.debug(`[${requestId}] System prompt: ${systemPrompt.length} chars`);

    // 8. Initialize Gemini model
    const model = getGenAI().getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemPrompt,
    });

    // 9. Prepare content parts
    const parts = [{ text: prompt }];

    // 10. Generate streaming response
    let result;
    if (conversationHistory.length > 0) {
      const chat = model.startChat({
        history: convertHistoryToGeminiFormat(conversationHistory),
      });
      result = await chat.sendMessageStream(parts);
    } else {
      result = await model.generateContentStream(parts);
    }

    // 11. Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }

          controller.close();

          const duration = Date.now() - startTime;
          logger.info(`[${requestId}] Stream completed in ${duration}ms`);

          // Track usage (non-blocking)
          trackApiKeyUsage(apiKey.id).catch((err: unknown) => {
            logger.error(`[${requestId}] Failed to track usage:`, err);
          });
        } catch (error) {
          logger.error(`[${requestId}] Stream error:`, error);

          const errorMessage = error instanceof Error ? error.message : "Stream failed";
          controller.enqueue(new TextEncoder().encode(`\n\nError: ${errorMessage}`));

          try {
            controller.close();
          } catch {
            // Already closed
          }
        }
      },
      cancel() {
        logger.info(`[${requestId}] Stream cancelled by client`);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Request-Id": requestId,
        "X-Model-Used": MODEL_NAME,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Request failed after ${duration}ms:`, error);

    const errorMessage = error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
