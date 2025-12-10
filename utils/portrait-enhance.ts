/**
 * Portrait Enhancement Utility
 * 
 * Provides multiple enhancement strategies:
 * 1. Server-side Sharp enhancement (free, for data URLs)
 * 2. Cloudinary fetch (for HTTP URLs, costs credits)
 * 3. CSS fallback (instant, no API call)
 */

// Cloudinary cloud name from environment or default
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "sportai";

// Enable debug logging
const DEBUG = true;

function logEnhancement(message: string, data?: Record<string, unknown>) {
  if (DEBUG) {
    console.log(`[PortraitEnhance] ${message}`, data ? data : "");
  }
}

/**
 * Enhance a portrait using server-side Sharp processing
 * This is FREE - no external API costs!
 * 
 * @param dataUrl - Base64 data URL of the image
 * @param options - Enhancement options
 * @returns Enhanced image data URL
 */
export async function enhancePortraitWithSharp(
  dataUrl: string,
  options: {
    width?: number;
    height?: number;
    preset?: "subtle" | "standard" | "premium";
  } = {}
): Promise<string> {
  const { width = 400, height = 400, preset = "standard" } = options;

  logEnhancement("🔧 Sending to Sharp enhancement API", { width, height, preset });

  try {
    const response = await fetch("/api/enhance-portrait", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: dataUrl,
        width,
        height,
        preset,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Enhancement failed");
    }

    const result = await response.json();
    
    logEnhancement("✅ Sharp enhancement complete", {
      originalSize: result.originalSize,
      outputSize: result.outputSize,
      processingTime: `${result.processingTime}ms`,
    });

    return result.enhancedImage;
  } catch (error) {
    logEnhancement("❌ Sharp enhancement failed, returning original", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return dataUrl; // Fallback to original
  }
}

/**
 * Enhancement presets for different use cases
 */
export const ENHANCEMENT_PRESETS = {
  // Standard enhancement - good balance of quality and speed
  standard: "f_auto,q_auto:best,e_sharpen:80",
  
  // High quality - AI upscale + face enhancement (uses more Cloudinary credits)
  premium: "f_auto,q_auto:best,e_upscale,e_sharpen:60",
  
  // Face-focused - best for profile pictures
  portrait: "f_auto,q_auto:best,c_fill,g_face,e_sharpen:100,e_improve",
  
  // Minimal - just optimize format and quality
  minimal: "f_auto,q_auto:good",
} as const;

export type EnhancementPreset = keyof typeof ENHANCEMENT_PRESETS;

interface EnhancePortraitOptions {
  /** Width of the output image */
  width?: number;
  /** Height of the output image */
  height?: number;
  /** Enhancement preset to use */
  preset?: EnhancementPreset;
  /** Custom transformations (overrides preset) */
  customTransform?: string;
  /** Crop mode: 'fill' for cover, 'fit' for contain */
  crop?: "fill" | "fit" | "thumb";
  /** Focus on face when cropping */
  focusFace?: boolean;
}

/**
 * Enhance a portrait image using Cloudinary's fetch transformation
 * 
 * @param imageUrl - The source image URL (S3, HTTP, or data URL)
 * @param options - Enhancement options
 * @returns Enhanced image URL via Cloudinary
 * 
 * @example
 * ```ts
 * // Basic usage
 * const enhanced = enhancePortrait(s3Url);
 * 
 * // With size and preset
 * const enhanced = enhancePortrait(s3Url, { 
 *   width: 200, 
 *   height: 200, 
 *   preset: 'portrait' 
 * });
 * ```
 */
export function enhancePortrait(
  imageUrl: string,
  options: EnhancePortraitOptions = {}
): string {
  const {
    width,
    height,
    preset = "standard",
    customTransform,
    crop = "fill",
    focusFace = true,
  } = options;

  // Data URLs can't be processed by Cloudinary fetch
  // Return as-is (CSS enhancements can be applied in the component)
  if (imageUrl.startsWith("data:")) {
    logEnhancement("Skipping enhancement for data URL (using CSS fallback)", {
      urlLength: imageUrl.length,
      isDataUrl: true,
    });
    return imageUrl;
  }

  // Build transformation string
  const transforms: string[] = [];

  // Size transformations
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) {
    transforms.push(`c_${crop}`);
    if (focusFace) transforms.push("g_face");
  }

  // Enhancement transformations
  if (customTransform) {
    transforms.push(customTransform);
  } else {
    transforms.push(ENHANCEMENT_PRESETS[preset]);
  }

  const transformString = transforms.join(",");

  // Encode the source URL for Cloudinary fetch
  const encodedUrl = encodeURIComponent(imageUrl);

  // Return Cloudinary fetch URL
  const enhancedUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/${transformString}/${encodedUrl}`;

  logEnhancement("✅ Enhanced portrait URL generated", {
    cloudName: CLOUDINARY_CLOUD_NAME,
    preset,
    width,
    height,
    originalUrl: imageUrl.substring(0, 100) + (imageUrl.length > 100 ? "..." : ""),
    enhancedUrl: enhancedUrl.substring(0, 150) + "...",
    transforms: transformString,
  });

  return enhancedUrl;
}

/**
 * Check if an image URL is already enhanced (going through Cloudinary)
 */
export function isEnhancedUrl(url: string): boolean {
  return url.includes("res.cloudinary.com");
}

/**
 * Get CSS styles for enhancing low-res images client-side
 * Use these as fallback when server-side enhancement isn't available
 * 
 * This is an aggressive enhancement combo that works well for portraits
 */
export const CSS_ENHANCEMENT_STYLES: React.CSSProperties = {
  // Smooth rendering for upscaled images
  imageRendering: "auto",
  // Aggressive enhancement: sharpen + boost contrast/saturation + subtle shadow for depth
  filter: "contrast(1.08) saturate(1.12) brightness(1.02) drop-shadow(0 0 1px rgba(0,0,0,0.1))",
};

/**
 * Create an enhanced portrait URL optimized for player cards
 * 
 * @param imageUrl - Source image URL
 * @param size - Size in pixels (square)
 * @returns Enhanced URL ready for use in img src
 */
export function getPlayerCardPortrait(
  imageUrl: string | undefined,
  size: number = 180
): string | undefined {
  if (!imageUrl) {
    logEnhancement("⚠️ getPlayerCardPortrait called with no image URL");
    return undefined;
  }
  
  logEnhancement("🎴 Enhancing player card portrait", { size, preset: "portrait" });
  
  return enhancePortrait(imageUrl, {
    width: size,
    height: size,
    preset: "portrait",
    crop: "fill",
    focusFace: true,
  });
}

/**
 * Create an enhanced portrait URL for the FIFA-style card back
 * Larger size with premium enhancement
 * 
 * @param imageUrl - Source image URL  
 * @param size - Size in pixels (square)
 * @returns Enhanced URL
 */
export function getFIFACardPortrait(
  imageUrl: string | undefined,
  size: number = 400
): string | undefined {
  if (!imageUrl) {
    logEnhancement("⚠️ getFIFACardPortrait called with no image URL");
    return undefined;
  }
  
  logEnhancement("🏆 Enhancing FIFA card portrait", { size, preset: "premium" });
  
  return enhancePortrait(imageUrl, {
    width: size,
    height: size,
    preset: "premium",
    crop: "fill",
    focusFace: true,
  });
}

