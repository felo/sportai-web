import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors using CSS variables
        background: "hsl(var(--color-background))",
        foreground: "hsl(var(--color-foreground))",
        card: {
          DEFAULT: "hsl(var(--color-card))",
          foreground: "hsl(var(--color-cardForeground))",
        },
        primary: {
          DEFAULT: "hsl(var(--color-primary))",
          foreground: "hsl(var(--color-primaryForeground))",
          hover: "hsl(var(--color-primaryHover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--color-secondary))",
          foreground: "hsl(var(--color-secondaryForeground))",
        },
        accent: {
          DEFAULT: "hsl(var(--color-accent))",
          foreground: "hsl(var(--color-accentForeground))",
        },
        muted: {
          DEFAULT: "hsl(var(--color-muted))",
          foreground: "hsl(var(--color-mutedForeground))",
        },
        border: "hsl(var(--color-border))",
        input: "hsl(var(--color-input))",
        success: {
          DEFAULT: "hsl(var(--color-success))",
          foreground: "hsl(var(--color-successForeground))",
        },
        error: {
          DEFAULT: "hsl(var(--color-error))",
          foreground: "hsl(var(--color-errorForeground))",
        },
        warning: {
          DEFAULT: "hsl(var(--color-warning))",
          foreground: "hsl(var(--color-warningForeground))",
        },
        hover: {
          DEFAULT: "hsl(var(--color-hover))",
          foreground: "hsl(var(--color-hoverForeground))",
        },
        overlay: "hsl(var(--color-overlay))",
        tooltip: {
          DEFAULT: "hsl(var(--color-tooltip))",
          foreground: "hsl(var(--color-tooltipForeground))",
        },
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
};
export default config;

