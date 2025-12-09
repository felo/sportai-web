import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

// Ensure this route uses Node.js runtime
export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds max for quick detection

// Use Gemini Flash for fastest response
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

// Valid sport responses
const VALID_SPORTS = ["tennis", "pickleball", "padel", "other"] as const;
type DetectedSport = typeof VALID_SPORTS[number];

/**
 * Detect sport from an image frame
 * POST /api/detect-sport
 * 
 * Expects FormData with:
 * - image: File (JPEG/PNG image of video frame)
 * 
 * Returns:
 * - { sport: "tennis" | "pickleball" | "padel" | "other" }
 */
export async function POST(request: NextRequest) {
  const requestId = `sport_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startTime = Date.now();
  
  logger.info(`[${requestId}] Sport detection request received`);
  
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
    
    // Create model with minimal configuration for speed
    const model = getGenAI().getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        maxOutputTokens: 10, // We only need one word
        temperature: 0.1, // Low temperature for consistent responses
      },
    });
    
    // Simple, direct prompt for sport classification
    const prompt = `Look at this image and identify the racket sport being played.
Reply with ONLY ONE of these exact words:
- tennis
- pickleball  
- padel
- other

If you see a tennis court (larger court, net in middle), say "tennis".
If you see a pickleball court (smaller court, often with kitchen/non-volley zone), say "pickleball".
If you see a padel court (enclosed with glass walls), say "padel".
If unsure or no sport visible, say "other".

Your response (one word only):`;
    
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
    const responseText = response.text().toLowerCase().trim();
    
    logger.debug(`[${requestId}] Raw response: "${responseText}"`);
    
    // Parse the response to extract sport
    let detectedSport: DetectedSport = "other";
    
    // Check for each valid sport in the response
    for (const sport of VALID_SPORTS) {
      if (responseText.includes(sport)) {
        detectedSport = sport;
        break;
      }
    }
    
    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Sport detected: ${detectedSport} (${duration}ms)`);
    
    return NextResponse.json({ sport: detectedSport });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Sport detection failed after ${duration}ms:`, error);
    
    // Return "other" on error so the UI doesn't break
    return NextResponse.json(
      { sport: "other", error: error instanceof Error ? error.message : "Detection failed" },
      { status: 200 } // Return 200 so client still gets a usable response
    );
  }
}






