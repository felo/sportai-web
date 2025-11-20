/**
 * Development-only logger utility
 * All logs are automatically excluded in production builds
 */

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log("[Gemini]", ...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error("[Gemini Error]", ...args);
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug("[Gemini Debug]", ...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn("[Gemini Warning]", ...args);
    }
  },
  
  time: (label: string) => {
    if (isDevelopment) {
      console.time(`[Gemini] ${label}`);
    }
  },
  
  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(`[Gemini] ${label}`);
    }
  },
};

