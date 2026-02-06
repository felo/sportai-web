import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { logger } from "@/lib/logger";
import { DETECTED_SPORTS, type DetectedSport } from "@/types/chat";

// Ensure this route uses Node.js runtime
export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds max for quick detection

// Use Gemini 2 Flash for fastest response
const MODEL_NAME = "gemini-2.0-flash";

// Lazy initialization
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

// Camera angle types
const CAMERA_ANGLES = [
  "elevated_back_court",  // High behind baseline, full court visible - ideal for PRO
  "ground_behind",        // Ground level behind a player
  "side",                 // From the side of the court
  "overhead",             // Bird's eye view from directly above
  "diagonal",             // Corner angle
  "other"                 // Any other angle
] as const;
type CameraAngle = typeof CAMERA_ANGLES[number];

// Response schema for structured output
// Note: Using type assertion because the library types are overly strict with enum schemas
const ELIGIBILITY_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    sport: {
      type: SchemaType.STRING,
      enum: [...DETECTED_SPORTS],
      description: "The sport being played"
    },
    cameraAngle: {
      type: SchemaType.STRING,
      enum: ["elevated_back_court", "ground_behind", "side", "overhead", "diagonal", "other"],
      description: "The camera position and angle"
    },
    fullCourtVisible: {
      type: SchemaType.BOOLEAN,
      description: "Whether both sides of the court/field are visible in the frame"
    },
    confidence: {
      type: SchemaType.NUMBER,
      description: "Confidence score from 0 to 1"
    }
  },
  required: ["sport", "cameraAngle", "fullCourtVisible", "confidence"]
} satisfies Record<string, unknown> as Schema;

export interface VideoEligibilityResult {
  sport: DetectedSport;
  cameraAngle: CameraAngle;
  fullCourtVisible: boolean;
  confidence: number;
  isProEligible: boolean;
  proEligibilityReason?: string;
}

/**
 * Analyze video frame for sport and PRO analysis eligibility
 * POST /api/analyze-video-eligibility
 *
 * Expects FormData with:
 * - image: File (JPEG/PNG image of video frame)
 *
 * Returns:
 * - { sport, cameraAngle, fullCourtVisible, confidence, isProEligible, proEligibilityReason }
 */
export async function POST(request: NextRequest) {
  const requestId = `eligibility_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startTime = Date.now();

  logger.info(`[${requestId}] Video eligibility analysis request received`);

  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      logger.error(`[${requestId}] No image provided`);
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!imageFile.type.startsWith("image/")) {
      logger.error(`[${requestId}] Invalid file type: ${imageFile.type}`);
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Convert image to buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");

    logger.debug(`[${requestId}] Image size: ${(buffer.length / 1024).toFixed(1)}KB`);

    // Create model with structured output for reliable parsing
    const model = getGenAI().getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.1, // Low temperature for consistent responses
        responseMimeType: "application/json",
        responseSchema: ELIGIBILITY_SCHEMA,
      },
    });

    // Comprehensive prompt for sport and camera angle detection
    const prompt = `Analyze this sports video frame and determine:

1. SPORT: What sport is being played?
   RACKET SPORTS:
   - tennis: Large court with net, green/blue/clay surface
   - pickleball: Smaller court, kitchen/non-volley zone near net
   - padel: Enclosed court with glass walls
   - badminton: Indoor court with high net, shuttlecock
   - table_tennis: Small table with net, ping pong paddles
   - squash: Enclosed court with walls, small rubber ball, rackets

   TEAM BALL SPORTS:
   - soccer: Large grass field, goals at each end (football)
   - basketball: Indoor/outdoor court with hoops
   - volleyball: Court with high net, 6 players per side
   - baseball: Diamond-shaped field, pitcher's mound
   - cricket: Oval field with pitch in center, wickets
   - rugby: Large grass field, H-shaped goalposts
   - american_football: Field with yard lines, goalposts
   - hockey: Ice rink or grass field with goals

   INDIVIDUAL SPORTS:
   - golf: Green course, holes with flags
   - swimming: Pool with lanes
   - athletics: Track and field events
   - cycling: Road or velodrome racing
   - gymnastics: Apparatus or floor exercises
   - weightlifting: Barbell, squat rack, gym, powerlifting, strength training
   - hyrox: HYROX race, running plus functional stations (rower, sled push, burpees, sandbag, etc.)
   - yoga: Yoga mat, poses, studio or outdoor practice
   - pilates: Reformer, mat pilates, studio
   - surfing: Ocean waves, surfboard, beach
   - climbing: Rock wall, climbing gym, harness, ropes or bouldering
   - skiing: Cross country or downhill skiing, skis, snow slopes
   - snowboarding: Snowboard, snow slopes, halfpipe
   - skating: Ice skating, skateboard, roller skates, skate park or rink

   COMBAT SPORTS:
   - boxing: Ring with ropes, boxing gloves
   - martial_arts: MMA cage, dojo, wrestling mat

   - other: Cannot identify or not a sport

2. CAMERA ANGLE: Where is the camera positioned?
   - elevated_back_court: Camera is HIGH behind one baseline, looking DOWN toward the playing area
   - ground_behind: Camera is at GROUND LEVEL behind a player
   - side: Camera is on the SIDE, perpendicular to play
   - overhead: Bird's eye view from DIRECTLY ABOVE
   - diagonal: Corner or angled position
   - other: Any other position

3. FULL COURT VISIBLE: Can you see the FULL playing area (both halves)?
   - true: Full court/field/ring visible
   - false: Only partial view

4. CONFIDENCE: How confident are you? (0.0 to 1.0)`;

    // Build request with image
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          data: base64Image,
          mimeType: imageFile.type,
        },
      },
    ]);

    const response = result.response;
    const responseText = response.text();

    logger.debug(`[${requestId}] Raw response: "${responseText}"`);

    // Parse JSON response
    let parsed: {
      sport: string;
      cameraAngle: string;
      fullCourtVisible: boolean;
      confidence: number;
    };

    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      logger.error(`[${requestId}] Failed to parse JSON response:`, parseError);
      // Return defaults on parse error
      return NextResponse.json({
        sport: "other",
        cameraAngle: "other",
        fullCourtVisible: false,
        confidence: 0,
        isProEligible: false,
        proEligibilityReason: "Could not analyze video frame"
      });
    }

    // Validate and normalize values
    const sport: DetectedSport = DETECTED_SPORTS.includes(parsed.sport as DetectedSport)
      ? parsed.sport as DetectedSport
      : "other";

    const cameraAngle: CameraAngle = CAMERA_ANGLES.includes(parsed.cameraAngle as CameraAngle)
      ? parsed.cameraAngle as CameraAngle
      : "other";

    const fullCourtVisible = Boolean(parsed.fullCourtVisible);
    const confidence = typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5;

    // Determine PRO eligibility
    // Padel and Tennis with elevated back-court view and full court visible qualify
    const isProEligible = (sport === "padel" || sport === "tennis") &&
                          cameraAngle === "elevated_back_court" &&
                          fullCourtVisible;

    let proEligibilityReason: string | undefined;

    if (sport === "padel" || sport === "tennis") {
      if (isProEligible) {
        proEligibilityReason = "Perfect! Your video has the ideal camera angle for PRO analysis.";
      } else if (!fullCourtVisible) {
        proEligibilityReason = "PRO analysis requires the full court to be visible.";
      } else if (cameraAngle !== "elevated_back_court") {
        proEligibilityReason = "PRO analysis works best with an elevated back-court camera angle (like from the top of the back glass).";
      }
    } else if (sport === "pickleball") {
      proEligibilityReason = `PRO analysis for ${sport} is coming soon!`;
    }

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Eligibility analysis complete: sport=${sport}, camera=${cameraAngle}, fullCourt=${fullCourtVisible}, proEligible=${isProEligible} (${duration}ms)`);

    const responseData: VideoEligibilityResult = {
      sport,
      cameraAngle,
      fullCourtVisible,
      confidence,
      isProEligible,
      proEligibilityReason,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Eligibility analysis failed after ${duration}ms:`, error);

    // Return safe defaults on error
    return NextResponse.json({
      sport: "other",
      cameraAngle: "other",
      fullCourtVisible: false,
      confidence: 0,
      isProEligible: false,
      proEligibilityReason: error instanceof Error ? error.message : "Analysis failed"
    }, { status: 200 }); // Return 200 so client still gets a usable response
  }
}
