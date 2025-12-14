/**
 * Shared Color Utilities
 *
 * Provides color manipulation and accessibility functions.
 */

// ============================================================================
// Contrast Text Color
// ============================================================================

/**
 * Determines if text should be dark or light based on background color brightness.
 * Uses relative luminance calculation for accessibility (WCAG 2.0).
 *
 * @param hexColor - Hex color string (with or without #)
 * @returns "rgba(0, 0, 0, 0.9)" for light backgrounds, "white" for dark backgrounds
 *
 * @example
 * getContrastTextColor("#FFFFFF") // "rgba(0, 0, 0, 0.9)"
 * getContrastTextColor("#000000") // "white"
 * getContrastTextColor("FFD700")  // "rgba(0, 0, 0, 0.9)"
 */
export function getContrastTextColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? "rgba(0, 0, 0, 0.9)" : "white";
}

// ============================================================================
// Color Parsing
// ============================================================================

/**
 * Parse a hex color string into RGB components.
 *
 * @param hexColor - Hex color string (with or without #)
 * @returns Object with r, g, b values (0-255)
 */
export function hexToRgb(hexColor: string): { r: number; g: number; b: number } {
  const hex = hexColor.replace("#", "");
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

/**
 * Convert RGB values to a hex color string.
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Hex color string with #
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ============================================================================
// Color Manipulation
// ============================================================================

/**
 * Lighten or darken a color by a percentage.
 *
 * @param hexColor - Hex color string
 * @param percent - Positive to lighten, negative to darken (-100 to 100)
 * @returns Modified hex color string
 */
export function adjustBrightness(hexColor: string, percent: number): string {
  const { r, g, b } = hexToRgb(hexColor);
  const amount = (percent / 100) * 255;
  return rgbToHex(r + amount, g + amount, b + amount);
}

/**
 * Create a semi-transparent version of a color.
 *
 * @param hexColor - Hex color string
 * @param alpha - Opacity (0-1)
 * @returns RGBA color string
 */
export function withAlpha(hexColor: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hexColor);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
