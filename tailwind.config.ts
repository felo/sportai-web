import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'], // Use data-attribute instead of prefers-color-scheme
  theme: {
    extend: {
      // Use CSS variable for optimized font
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      keyframes: {
        slideIn: {
          from: { transform: "translateX(calc(100% + 16px))" },
          to: { transform: "translateX(0)" },
        },
        hide: {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        overlayShow: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        contentShow: {
          from: { opacity: "0", transform: "translate(-50%, -48%) scale(0.96)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
      },
      animation: {
        slideIn: "slideIn 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        hide: "hide 100ms ease-in",
        overlayShow: "overlayShow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        contentShow: "contentShow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
  // Production optimizations
  future: {
    hoverOnlyWhenSupported: true, // Only apply hover styles on devices that support hover
  },
};
export default config;

