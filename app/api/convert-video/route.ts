import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Allow up to 5 minutes for video conversion
export const maxDuration = 300;

const CONVERSION_API_URL = process.env.CONVERSION_API_URL;
const CONVERSION_API_SECRET = process.env.CONVERSION_API_SECRET;

export interface ConversionResponse {
  success: boolean;
  originalKey?: string;
  convertedKey?: string;
  publicUrl?: string;
  downloadUrl?: string;
  size?: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ConversionResponse>> {
  const requestId = `convert_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  logger.info(`[${requestId}] Video conversion request received`);
  
  // Check if conversion service is configured
  if (!CONVERSION_API_URL) {
    logger.error(`[${requestId}] CONVERSION_API_URL not configured`);
    return NextResponse.json(
      { 
        success: false, 
        error: "Video conversion service not configured. Please set CONVERSION_API_URL environment variable." 
      },
      { status: 503 }
    );
  }
  
  try {
    const body = await request.json();
    const { key } = body;
    
    if (!key) {
      logger.error(`[${requestId}] Missing required field: key`);
      return NextResponse.json(
        { success: false, error: "Missing required field: key" },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Converting video: ${key}`);
    
    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (CONVERSION_API_SECRET) {
      headers["Authorization"] = `Bearer ${CONVERSION_API_SECRET}`;
    }
    
    // Call the conversion service
    const response = await fetch(`${CONVERSION_API_URL}/convert`, {
      method: "POST",
      headers,
      body: JSON.stringify({ key }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      logger.error(`[${requestId}] Conversion service error: ${result.error}`);
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || `Conversion service returned ${response.status}` 
        },
        { status: response.status }
      );
    }
    
    logger.info(`[${requestId}] Conversion successful: ${result.convertedKey}`);
    
    return NextResponse.json({
      success: true,
      originalKey: result.originalKey,
      convertedKey: result.convertedKey,
      publicUrl: result.publicUrl,
      downloadUrl: result.downloadUrl,
      size: result.size,
    });
    
  } catch (error) {
    logger.error(`[${requestId}] Conversion request failed:`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}






