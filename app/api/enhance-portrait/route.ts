import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { logger } from "@/lib/logger";

/**
 * Portrait Enhancement API
 * 
 * Accepts a base64 image and returns an enhanced version using Sharp.
 * This is completely free (no external API costs).
 */

interface EnhanceRequest {
  /** Base64 encoded image (with or without data URL prefix) */
  image: string;
  /** Output width (default: 400) */
  width?: number;
  /** Output height (default: 400) */
  height?: number;
  /** Enhancement preset */
  preset?: "standard" | "premium" | "subtle";
}

interface EnhanceResponse {
  /** Enhanced image as base64 data URL */
  enhancedImage: string;
  /** Original dimensions */
  originalSize: { width: number; height: number };
  /** Output dimensions */
  outputSize: { width: number; height: number };
  /** Processing time in ms */
  processingTime: number;
}

// Enhancement presets
const PRESETS = {
  subtle: {
    sharpen: { sigma: 1.0 },
    modulate: { brightness: 1.02, saturation: 1.08 },
    quality: 85,
  },
  standard: {
    sharpen: { sigma: 1.5 },
    modulate: { brightness: 1.03, saturation: 1.15 },
    quality: 88,
  },
  premium: {
    sharpen: { sigma: 2.0, m1: 1.5, m2: 0.7 },
    modulate: { brightness: 1.05, saturation: 1.2 },
    quality: 92,
  },
};

export async function POST(request: NextRequest) {
  const requestId = `enhance_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startTime = Date.now();

  try {
    const body: EnhanceRequest = await request.json();
    const { image, width = 400, height = 400, preset = "standard" } = body;

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    logger.info(`[${requestId}] Enhancing portrait`, { width, height, preset });

    // Extract base64 data (remove data URL prefix if present)
    let base64Data = image;
    let mimeType = "image/jpeg";
    
    if (image.startsWith("data:")) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    // Convert base64 to buffer
    const inputBuffer = Buffer.from(base64Data, "base64");

    // Get original image metadata
    const metadata = await sharp(inputBuffer).metadata();
    const originalSize = {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };

    // Get preset settings
    const settings = PRESETS[preset] || PRESETS.standard;

    // Process with Sharp
    const enhancedBuffer = await sharp(inputBuffer)
      // Resize with smart cropping and high-quality upscaling
      .resize(width, height, {
        fit: "cover",
        position: "top",
        kernel: "lanczos3",  // Best quality upscaling algorithm
      })
      // Apply sharpening (extra important after upscaling)
      .sharpen(settings.sharpen)
      // Adjust brightness and saturation
      .modulate(settings.modulate)
      // Slight gamma correction for better contrast
      .gamma(1.1)
      // Output as JPEG with good quality
      .jpeg({ 
        quality: settings.quality,
        mozjpeg: true, // Better compression
      })
      .toBuffer();

    // Convert back to base64 data URL
    const enhancedBase64 = enhancedBuffer.toString("base64");
    const enhancedDataUrl = `data:image/jpeg;base64,${enhancedBase64}`;

    const processingTime = Date.now() - startTime;
    
    logger.info(`[${requestId}] Portrait enhanced successfully`, {
      originalSize,
      outputSize: { width, height },
      processingTime,
      inputBytes: inputBuffer.length,
      outputBytes: enhancedBuffer.length,
    });

    const response: EnhanceResponse = {
      enhancedImage: enhancedDataUrl,
      originalSize,
      outputSize: { width, height },
      processingTime,
    };

    return NextResponse.json(response);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Portrait enhancement failed after ${duration}ms:`, error);

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Enhancement failed",
        requestId,
      },
      { status: 500 }
    );
  }
}

