import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { logger } from "@/lib/logger";
import type {
  AnalysisType,
  CourtAnalysisResult,
  CameraAngleResult,
  FrameAnalysisResult,
} from "@/types/frame-analysis";

// Ensure this route uses Node.js runtime
export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds max for frame analysis

// Use Gemini 3 Pro - same model used for main chat, best reasoning
const PRO_MODEL = "gemini-3-pro-preview";

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

// ============================================================================
// Response Schemas (for structured output)
// ============================================================================

const COURT_DETECTION_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    found: { type: SchemaType.BOOLEAN },
    courtType: { 
      type: SchemaType.STRING, 
      enum: ["tennis", "pickleball", "padel", "unknown"] 
    },
    corners: {
      type: SchemaType.OBJECT,
      properties: {
        topLeft: { 
          type: SchemaType.OBJECT, 
          properties: { x: { type: SchemaType.NUMBER }, y: { type: SchemaType.NUMBER } },
          required: ["x", "y"],
        },
        topRight: { 
          type: SchemaType.OBJECT, 
          properties: { x: { type: SchemaType.NUMBER }, y: { type: SchemaType.NUMBER } },
          required: ["x", "y"],
        },
        bottomLeft: { 
          type: SchemaType.OBJECT, 
          properties: { x: { type: SchemaType.NUMBER }, y: { type: SchemaType.NUMBER } },
          required: ["x", "y"],
        },
        bottomRight: { 
          type: SchemaType.OBJECT, 
          properties: { x: { type: SchemaType.NUMBER }, y: { type: SchemaType.NUMBER } },
          required: ["x", "y"],
        },
      },
    },
    boundingBox: {
      type: SchemaType.OBJECT,
      properties: {
        x: { type: SchemaType.NUMBER },
        y: { type: SchemaType.NUMBER },
        width: { type: SchemaType.NUMBER },
        height: { type: SchemaType.NUMBER },
      },
    },
    confidence: { type: SchemaType.NUMBER },
  },
  required: ["found", "confidence"],
};

const CAMERA_ANGLE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    angle: { 
      type: SchemaType.STRING, 
      enum: ["behind", "side", "overhead", "diagonal", "other"] 
    },
    confidence: { type: SchemaType.NUMBER },
    description: { type: SchemaType.STRING },
  },
  required: ["angle", "confidence"],
};

// ============================================================================
// Prompt Handlers
// ============================================================================

function getCourtDetectionPrompt(sport?: string): string {
  const sportContext = sport && sport !== "unknown" 
    ? `This is a ${sport.toUpperCase()} court. ` 
    : "";
  
  return `Analyze this image and find the COURT LINES - the painted/marked lines that define the playing area.

${sportContext}

YOUR TASK: Find the 4 corners where the BASELINE and SIDELINE meet. These are the corners of the rectangular playing court marked by WHITE or COLORED LINES on the court surface.

DO NOT detect:
- The edges of the image
- Fencing or barriers around the court
- The entire facility or building
- Areas outside the painted court lines

DO detect:
- The exact corners where court lines intersect
- The painted baseline (back line) at each end
- The painted sidelines (side boundaries)

Use NORMALIZED coordinates (0.0 to 1.0) where:
- (0, 0) = top-left corner of IMAGE
- (1, 1) = bottom-right corner of IMAGE

For a typical "behind the player" camera angle:
- topLeft/topRight = corners of the FAR baseline (near the net, HIGHER in the image, smaller y value ~0.3-0.5)
- bottomLeft/bottomRight = corners of the NEAR baseline (close to camera, LOWER in the image, larger y value ~0.7-0.95)

Court types:
- Tennis: White lines on green/blue/clay surface
- Pickleball: White lines on blue surface, smaller court with kitchen line near net
- Padel: White lines inside glass-walled enclosure

Look for the WHITE LINE INTERSECTIONS at each corner of the playing rectangle.`;
}

const CAMERA_ANGLE_PROMPT = `Analyze this sports video frame and classify the camera angle.

Return a JSON object (respond with ONLY valid JSON, no markdown):
{
  "angle": "behind" | "side" | "overhead" | "diagonal" | "other",
  "confidence": number between 0 and 1,
  "description": "brief description of camera position"
}

Camera angle definitions:
- "behind": Camera is behind one of the players, looking down the court
- "side": Camera is on the side of the court, perpendicular to the net
- "overhead": Camera is above the court looking down (bird's eye view)
- "diagonal": Camera is at a corner or angled position
- "other": Camera position doesn't fit the above categories

Consider the perspective of the court lines and net when determining the angle.`;

async function analyzeCourtDetection(
  base64Image: string,
  mimeType: string,
  requestId: string,
  sport?: string
): Promise<CourtAnalysisResult> {
  console.log(`\n🎾 [${requestId}] ========== COURT DETECTION START ==========`);
  console.log(`🎾 [${requestId}] Model: ${PRO_MODEL}`);
  console.log(`🎾 [${requestId}] Sport context: ${sport || "none"}`);
  console.log(`🎾 [${requestId}] Image size: ${(base64Image.length * 0.75 / 1024).toFixed(1)}KB`);
  
  const prompt = getCourtDetectionPrompt(sport);
  console.log(`🎾 [${requestId}] Prompt:\n${prompt.substring(0, 200)}...`);
  
  const model = getGenAI().getGenerativeModel({
    model: PRO_MODEL,
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: COURT_DETECTION_SCHEMA as any,
    },
  });

  console.log(`🎾 [${requestId}] Calling Gemini API...`);
  const apiStartTime = Date.now();
  
  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    },
  ]);

  const apiDuration = Date.now() - apiStartTime;
  console.log(`🎾 [${requestId}] Gemini API responded in ${apiDuration}ms`);

  const response = result.response;
  const responseText = response.text();
  
  console.log(`🎾 [${requestId}] Raw response:\n${responseText}`);

  try {
    const parsed = JSON.parse(responseText);
    
    console.log(`🎾 [${requestId}] ========== PARSED RESULT ==========`);
    console.log(`🎾 [${requestId}] Found: ${parsed.found}`);
    console.log(`🎾 [${requestId}] Court Type: ${parsed.courtType}`);
    console.log(`🎾 [${requestId}] Confidence: ${(parsed.confidence * 100).toFixed(1)}%`);
    if (parsed.corners) {
      console.log(`🎾 [${requestId}] Corners:`);
      console.log(`   topLeft:     (${parsed.corners.topLeft?.x?.toFixed(3)}, ${parsed.corners.topLeft?.y?.toFixed(3)})`);
      console.log(`   topRight:    (${parsed.corners.topRight?.x?.toFixed(3)}, ${parsed.corners.topRight?.y?.toFixed(3)})`);
      console.log(`   bottomLeft:  (${parsed.corners.bottomLeft?.x?.toFixed(3)}, ${parsed.corners.bottomLeft?.y?.toFixed(3)})`);
      console.log(`   bottomRight: (${parsed.corners.bottomRight?.x?.toFixed(3)}, ${parsed.corners.bottomRight?.y?.toFixed(3)})`);
    }
    if (parsed.boundingBox) {
      console.log(`🎾 [${requestId}] Bounding Box: x=${parsed.boundingBox.x?.toFixed(3)}, y=${parsed.boundingBox.y?.toFixed(3)}, w=${parsed.boundingBox.width?.toFixed(3)}, h=${parsed.boundingBox.height?.toFixed(3)}`);
    }
    console.log(`🎾 [${requestId}] ========== COURT DETECTION END ==========\n`);
    
    return {
      type: "court",
      found: parsed.found ?? false,
      courtType: parsed.courtType,
      corners: parsed.corners,
      boundingBox: parsed.boundingBox,
      confidence: parsed.confidence ?? 0,
    };
  } catch (parseError) {
    console.error(`🎾 [${requestId}] ❌ Failed to parse response:`, parseError);
    console.error(`🎾 [${requestId}] Raw text was: ${responseText}`);
    return {
      type: "court",
      found: false,
      confidence: 0,
      error: "Failed to parse response",
    };
  }
}

async function analyzeCameraAngle(
  base64Image: string,
  mimeType: string,
  requestId: string
): Promise<CameraAngleResult> {
  console.log(`\n📷 [${requestId}] ========== CAMERA ANGLE DETECTION START ==========`);
  console.log(`📷 [${requestId}] Model: ${PRO_MODEL}`);
  console.log(`📷 [${requestId}] Image size: ${(base64Image.length * 0.75 / 1024).toFixed(1)}KB`);
  
  const model = getGenAI().getGenerativeModel({
    model: PRO_MODEL,
    generationConfig: {
      maxOutputTokens: 200,
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: CAMERA_ANGLE_SCHEMA as any,
    },
  });

  console.log(`📷 [${requestId}] Calling Gemini API...`);
  const apiStartTime = Date.now();

  const result = await model.generateContent([
    { text: CAMERA_ANGLE_PROMPT },
    {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    },
  ]);

  const apiDuration = Date.now() - apiStartTime;
  console.log(`📷 [${requestId}] Gemini API responded in ${apiDuration}ms`);

  const response = result.response;
  const responseText = response.text();
  
  console.log(`📷 [${requestId}] Raw response:\n${responseText}`);

  try {
    const parsed = JSON.parse(responseText);
    
    console.log(`📷 [${requestId}] ========== PARSED RESULT ==========`);
    console.log(`📷 [${requestId}] Angle: ${parsed.angle}`);
    console.log(`📷 [${requestId}] Confidence: ${(parsed.confidence * 100).toFixed(1)}%`);
    console.log(`📷 [${requestId}] Description: ${parsed.description || "none"}`);
    console.log(`📷 [${requestId}] ========== CAMERA ANGLE DETECTION END ==========\n`);
    
    return {
      type: "camera-angle",
      angle: parsed.angle ?? "other",
      confidence: parsed.confidence ?? 0,
      description: parsed.description,
    };
  } catch (parseError) {
    console.error(`📷 [${requestId}] ❌ Failed to parse response:`, parseError);
    console.error(`📷 [${requestId}] Raw text was: ${responseText}`);
    return {
      type: "camera-angle",
      angle: "other",
      confidence: 0,
      error: "Failed to parse response",
    };
  }
}

// ============================================================================
// Main Route Handler
// ============================================================================

/**
 * Analyze a single frame with Gemini
 * POST /api/analyze-frame
 * 
 * Expects FormData with:
 * - image: File (JPEG/PNG image)
 * - analysisType: "court" | "camera-angle"
 * 
 * Returns:
 * - { success: true, result: CourtAnalysisResult | CameraAngleResult, processingTimeMs }
 * - { success: false, error: string }
 */
export async function POST(request: NextRequest) {
  const requestId = `frame_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startTime = Date.now();
  
  console.log(`\n🔍 ============================================================`);
  console.log(`🔍 [${requestId}] FRAME ANALYSIS REQUEST RECEIVED`);
  console.log(`🔍 ============================================================`);
  
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const analysisType = formData.get("analysisType") as AnalysisType | null;
    const sport = formData.get("sport") as string | null;
    
    console.log(`🔍 [${requestId}] Analysis type: ${analysisType}`);
    console.log(`🔍 [${requestId}] Sport hint: ${sport || "none"}`);
    console.log(`🔍 [${requestId}] Image file: ${imageFile ? `${imageFile.name} (${imageFile.type}, ${(imageFile.size / 1024).toFixed(1)}KB)` : "MISSING"}`);
    
    // Validate inputs
    if (!imageFile) {
      console.error(`🔍 [${requestId}] ❌ No image provided`);
      return NextResponse.json(
        { success: false, error: "Image is required" },
        { status: 400 }
      );
    }
    
    if (!imageFile.type.startsWith("image/")) {
      console.error(`🔍 [${requestId}] ❌ Invalid file type: ${imageFile.type}`);
      return NextResponse.json(
        { success: false, error: "File must be an image" },
        { status: 400 }
      );
    }
    
    if (!analysisType || !["court", "camera-angle"].includes(analysisType)) {
      console.error(`🔍 [${requestId}] ❌ Invalid analysis type: ${analysisType}`);
      return NextResponse.json(
        { success: false, error: "Valid analysisType is required (court, camera-angle)" },
        { status: 400 }
      );
    }
    
    // Convert image to base64
    console.log(`🔍 [${requestId}] Converting image to base64...`);
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    console.log(`🔍 [${requestId}] Base64 length: ${base64Image.length} chars (~${(base64Image.length * 0.75 / 1024).toFixed(1)}KB)`);
    
    // Dispatch to appropriate handler
    let result: FrameAnalysisResult;
    
    switch (analysisType) {
      case "court":
        result = await analyzeCourtDetection(base64Image, imageFile.type, requestId, sport || undefined);
        break;
      case "camera-angle":
        result = await analyzeCameraAngle(base64Image, imageFile.type, requestId);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown analysis type: ${analysisType}` },
          { status: 400 }
        );
    }
    
    const processingTimeMs = Date.now() - startTime;
    
    console.log(`🔍 [${requestId}] ============================================================`);
    console.log(`🔍 [${requestId}] ✅ FRAME ANALYSIS COMPLETE`);
    console.log(`🔍 [${requestId}] Total time: ${processingTimeMs}ms`);
    console.log(`🔍 [${requestId}] Result: ${JSON.stringify(result, null, 2)}`);
    console.log(`🔍 ============================================================\n`);
    
    return NextResponse.json({
      success: true,
      result,
      processingTimeMs,
    });
    
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    console.error(`🔍 [${requestId}] ❌ FRAME ANALYSIS FAILED after ${processingTimeMs}ms`);
    console.error(`🔍 [${requestId}] Error:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Analysis failed",
        processingTimeMs,
      },
      { status: 500 }
    );
  }
}

