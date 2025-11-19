/**
 * Centralized configuration for URLs and external resources
 * Update these values to easily maintain and replace URLs across the application
 */

export const URLs = {
  /**
   * Logo image URL (white SVG version for dark theme)
   */
  logo: "https://res.cloudinary.com/djtxhrly7/image/upload/v1763583512/logo-white_xteexa.svg",
} as const;

/**
 * Styleguide colors
 * Centralized color palette for consistent styling across the application
 */
export const Colors = {
  /**
   * Light mint green
   */
  lightMint: "#D7F4DD",
  /**
   * Darker mint green
   */
  darkMint: "#74BC9C",
  /**
   * Very dark green (almost black)
   */
  darkGreen: "#002B1A",
  /**
   * White
   */
  white: "#FFFFFF",
} as const;

/**
 * Radix UI Theme configuration
 * Default theme settings for the application
 */
export const ThemeConfig = {
  /**
   * Default accent color - uses "mint" which is customized with brand colors
   */
  accentColor: "mint" as const,
  /**
   * Default gray scale
   */
  grayColor: "gray" as const,
  /**
   * Default appearance mode
   */
  appearance: "dark" as const,
} as const;

