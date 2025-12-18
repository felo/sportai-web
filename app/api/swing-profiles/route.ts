import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { logger } from "@/lib/logger";
import type {
  SwingProfileData,
  SwingProfile,
  SwingProfileResponse,
} from "@/types/swing-profile";

// Use Gemini Flash for fast profile generation
const MODEL_NAME = "gemini-2.0-flash";

// Ensure this route uses Node.js runtime
export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds for profile generation

/**
 * JSON Schema for structured output - enforces consistent profile format
 */
const PROFILE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    profiles: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          swingId: { type: SchemaType.STRING },
          swingIndex: { type: SchemaType.NUMBER },
          swingType: { type: SchemaType.STRING },
          attributes: {
            type: SchemaType.OBJECT,
            properties: {
              power: { type: SchemaType.NUMBER },
              agility: { type: SchemaType.NUMBER },
              footwork: { type: SchemaType.NUMBER },
              hip: { type: SchemaType.NUMBER },
              rotation: { type: SchemaType.NUMBER },
            },
            required: ["power", "agility", "footwork", "hip", "rotation"],
          },
          summary: { type: SchemaType.STRING },
          techniqueName: { type: SchemaType.STRING },
          strengths: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          focusAreas: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: [
          "swingId",
          "swingIndex",
          "swingType",
          "attributes",
          "summary",
          "techniqueName",
          "strengths",
          "focusAreas",
        ],
      },
    },
  },
  required: ["profiles"],
};

/**
 * Build the analysis prompt for swing profile generation
 */
function buildSwingProfilePrompt(
  swings: SwingProfileData[],
  sport: string
): string {
  const lines: string[] = [];

  lines.push(
    `You are an expert ${sport} biomechanics coach and technique analyst. Analyze these swing movements and create a technique profile for each based on their biomechanical data.`
  );
  lines.push("");
  lines.push("## Understanding the Metrics");
  lines.push("");
  lines.push("The data comes from pose detection analysis during swings:");
  lines.push(
    "- **Power (wrist velocity)**: Peak wrist speed during swing - higher = more racket head speed"
  );
  lines.push(
    "- **Agility (acceleration)**: Peak acceleration - shows explosiveness and quick transitions"
  );
  lines.push(
    "- **Footwork (knee bend)**: Lower body positioning - good knee bend indicates proper athletic stance"
  );
  lines.push(
    "- **Hip (hip velocity)**: Rotational power from hips - foundation of kinetic chain"
  );
  lines.push(
    "- **Rotation (shoulder velocity)**: Upper body rotation - transfers power through the chain"
  );
  lines.push("");
  lines.push("## Important Context");
  lines.push("");
  lines.push(
    "- The normalized metrics (0-100) are already calculated from raw values"
  );
  lines.push(
    "- SAI Score is the overall technique rating (already computed weighted average)"
  );
  lines.push(
    "- Use the ATTRIBUTES PROVIDED - don't recalculate them, just use them as-is"
  );
  lines.push(
    "- Focus your analysis on interpreting what these metrics mean for technique"
  );
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Swing Data");
  lines.push("");

  swings.forEach((swing, idx) => {
    lines.push(
      `### Swing ${idx + 1}: ${swing.swingType} (swingId: "${swing.swingId}")`
    );
    lines.push("");
    lines.push(
      `**IMPORTANT:** Use swingId="${swing.swingId}" and swingIndex=${swing.swingIndex} for this swing in the output.`
    );
    lines.push("");
    lines.push("**Normalized Metrics (0-100 scale):**");
    lines.push(`- Power: ${Math.round(swing.metrics.power)}`);
    lines.push(`- Agility: ${Math.round(swing.metrics.agility)}`);
    lines.push(`- Footwork: ${Math.round(swing.metrics.footwork)}`);
    lines.push(`- Hip: ${Math.round(swing.metrics.hip)}`);
    lines.push(`- Rotation: ${Math.round(swing.metrics.rotation)}`);
    lines.push(`- **SAI Score: ${Math.round(swing.saiScore)}**`);
    lines.push("");
    lines.push("**Raw Measurements:**");
    lines.push(
      `- Peak wrist velocity: ${swing.rawMetrics.peakWristVelocityKmh.toFixed(1)} km/h`
    );
    lines.push(
      `- Peak shoulder velocity: ${swing.rawMetrics.peakShoulderVelocityKmh.toFixed(1)} km/h`
    );
    lines.push(
      `- Peak hip velocity: ${swing.rawMetrics.peakHipVelocityKmh.toFixed(1)} km/h`
    );
    lines.push(`- X-factor (hip-shoulder separation): ${Math.abs(swing.rawMetrics.peakXFactor).toFixed(1)}°`);
    lines.push(
      `- Peak acceleration: ${Math.abs(swing.rawMetrics.peakAcceleration).toFixed(1)} m/s²`
    );
    if (swing.rawMetrics.kneeBend !== null) {
      lines.push(`- Knee bend score: ${swing.rawMetrics.kneeBend.toFixed(1)}`);
    }
    lines.push("");
  });

  lines.push("---");
  lines.push("");
  lines.push("## Output Requirements");
  lines.push("");
  lines.push("For each swing provide:");
  lines.push(
    "1. **swingId**: Use the EXACT swingId string provided (critical for matching)"
  );
  lines.push("2. **swingIndex**: Use the exact swingIndex number provided");
  lines.push("3. **swingType**: Use the exact swingType provided");
  lines.push(
    "4. **attributes**: Use the SAME normalized metric values provided (power, agility, footwork, hip, rotation) - do NOT change them"
  );
  lines.push(
    "5. **techniqueName**: A creative, POSITIVE 2-4 word technique descriptor. Always encouraging - higher scores get more impressive names, but ALL scores should feel good. Examples: 'Explosive Drive' (high), 'Smooth Flow' (mid), 'Building Momentum' (lower). NEVER use negative-sounding names like 'Work in Progress' or 'Needs Work'."
  );
  lines.push(
    "6. **summary**: A 1-2 sentence analysis of the technique quality based on the metrics"
  );
  lines.push(
    "7. **strengths**: 2-3 specific technique strengths based on the highest metrics (short phrases like 'Strong hip rotation', 'Explosive acceleration')"
  );
  lines.push(
    "8. **focusAreas**: 1-2 opportunities for growth based on lower metrics. Use positive, coaching-style phrases like 'Unlock more power with deeper knee bend' or 'Add hip drive for extra speed'. Frame as potential gains, not weaknesses."
  );
  lines.push("");
  lines.push("## Analysis Guidelines");
  lines.push("");
  lines.push("- Be specific about biomechanics, not generic");
  lines.push(
    "- Reference the actual numbers when relevant ('With 45 km/h wrist speed...')"
  );
  lines.push("- Consider the kinetic chain: feet → hips → shoulders → wrist");
  lines.push(
    "- Higher metrics (70+) are clear strengths, lower metrics are growth opportunities"
  );
  lines.push(
    "- X-factor (hip-shoulder separation) indicates rotational efficiency"
  );
  lines.push("");
  lines.push("## IMPORTANT: Positive Coaching Tone");
  lines.push("");
  lines.push("- ALL technique names must be positive and encouraging");
  lines.push("- Scale enthusiasm with score: higher scores = more impressive names");
  lines.push("- Lower scores still get positive names that feel like the player is on a good path");
  lines.push("- Focus areas should feel like unlocking potential, not fixing problems");
  lines.push("- Every player should feel good reading their analysis");

  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  const requestId = `swing_profile_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const startTime = Date.now();

  logger.info(`[${requestId}] Received swing profile request`);

  try {
    const body = await request.json();
    const { swings, sport = "padel" } = body as {
      swings: SwingProfileData[];
      sport?: string;
    };

    // Validate input
    if (!swings || !Array.isArray(swings) || swings.length === 0) {
      return NextResponse.json({ error: "No swings provided" }, { status: 400 });
    }

    // Get API key
    if (!process.env.GEMINI_API_KEY) {
      logger.error(`[${requestId}] GEMINI_API_KEY not set`);
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    // Initialize Gemini Flash
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.7, // Balance creativity with consistency
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: PROFILE_SCHEMA as Schema,
      },
    });

    const prompt = buildSwingProfilePrompt(swings, sport);
    logger.debug(
      `[${requestId}] Prompt: ${prompt.length} chars for ${swings.length} swings`
    );

    // Generate profiles
    const result = await model.generateContent([{ text: prompt }]);
    const responseText = result.response.text();

    logger.debug(
      `[${requestId}] Raw response: ${responseText.substring(0, 500)}...`
    );

    // Parse JSON response
    let profiles: SwingProfile[] = [];

    try {
      const parsed = JSON.parse(responseText) as { profiles: SwingProfile[] };
      profiles = parsed.profiles || [];

      // Validate and ensure attribute values match input (don't let LLM change them)
      profiles = profiles.map((profile) => {
        // Find matching input swing
        const inputSwing = swings.find((s) => s.swingId === profile.swingId);

        return {
          ...profile,
          // Use input metrics, not LLM-generated ones
          attributes: inputSwing
            ? {
                power: Math.round(inputSwing.metrics.power),
                agility: Math.round(inputSwing.metrics.agility),
                footwork: Math.round(inputSwing.metrics.footwork),
                hip: Math.round(inputSwing.metrics.hip),
                rotation: Math.round(inputSwing.metrics.rotation),
              }
            : profile.attributes,
          strengths: profile.strengths?.slice(0, 3) || [],
          focusAreas: profile.focusAreas?.slice(0, 2) || [],
        };
      });
    } catch (parseError) {
      logger.warn(
        `[${requestId}] Failed to parse swing profile JSON, using fallback`
      );

      // Fallback: generate basic profiles based on metrics
      profiles = swings.map((swing) => {
        // Find highest and lowest metrics
        const metricEntries = Object.entries(swing.metrics) as [string, number][];
        const sorted = [...metricEntries].sort((a, b) => b[1] - a[1]);
        const highest = sorted.slice(0, 2);
        const lowest = sorted.slice(-1);

        const metricLabels: Record<string, string> = {
          power: "wrist speed",
          agility: "acceleration",
          footwork: "knee bend",
          hip: "hip rotation",
          rotation: "shoulder rotation",
        };

        return {
          swingId: swing.swingId,
          swingIndex: swing.swingIndex,
          swingType: swing.swingType,
          attributes: {
            power: Math.round(swing.metrics.power),
            agility: Math.round(swing.metrics.agility),
            footwork: Math.round(swing.metrics.footwork),
            hip: Math.round(swing.metrics.hip),
            rotation: Math.round(swing.metrics.rotation),
          },
          summary: `This ${swing.swingType.toLowerCase()} shows ${swing.saiScore >= 70 ? "excellent" : swing.saiScore >= 50 ? "solid" : "promising"} technique fundamentals.`,
          techniqueName:
            swing.saiScore >= 85
              ? "Elite Power"
              : swing.saiScore >= 70
                ? "Strong Drive"
                : swing.saiScore >= 55
                  ? "Smooth Flow"
                  : swing.saiScore >= 40
                    ? "Rising Form"
                    : "Building Momentum",
          strengths: highest.map(
            ([key, val]) =>
              `${val >= 70 ? "Strong" : "Good"} ${metricLabels[key]}`
          ),
          focusAreas: lowest.map(
            ([key]) => `Unlock more ${metricLabels[key]}`
          ),
        };
      });
    }

    const duration = Date.now() - startTime;
    logger.info(
      `[${requestId}] Generated ${profiles.length} swing profiles in ${duration}ms`
    );

    return NextResponse.json({
      profiles,
      modelUsed: MODEL_NAME,
    } as SwingProfileResponse);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Request failed after ${duration}ms:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate profiles";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

