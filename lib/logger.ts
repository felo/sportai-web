/**
 * Development-only logger utility
 * All logs are automatically excluded in production builds (except errors)
 * 
 * Usage:
 *   import { logger, createLogger } from '@/lib/logger';
 *   
 *   // Default logger (no namespace)
 *   logger.info('Something happened');
 *   
 *   // Namespaced logger
 *   const chatLogger = createLogger('Chat');
 *   chatLogger.info('Message sent'); // outputs: [Chat] Message sent
 */

const isDevelopment = process.env.NODE_ENV === "development";

interface Logger {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
}

/**
 * Creates a namespaced logger instance
 * @param namespace - Optional namespace prefix for log messages (e.g., "Chat", "API", "Storage")
 */
export function createLogger(namespace?: string): Logger {
  const prefix = namespace ? `[${namespace}]` : "";
  const timerPrefix = namespace ? `[${namespace}] ` : "";

  return {
    info: (...args: unknown[]) => {
      if (isDevelopment) {
        console.log(prefix, ...args);
      }
    },

    error: (...args: unknown[]) => {
      // Always log errors, even in production
      const errorPrefix = namespace ? `[${namespace} Error]` : "[Error]";
      console.error(errorPrefix, ...args);
    },

    debug: (...args: unknown[]) => {
      if (isDevelopment) {
        const debugPrefix = namespace ? `[${namespace} Debug]` : "[Debug]";
        console.debug(debugPrefix, ...args);
      }
    },

    warn: (...args: unknown[]) => {
      if (isDevelopment) {
        const warnPrefix = namespace ? `[${namespace} Warning]` : "[Warning]";
        console.warn(warnPrefix, ...args);
      }
    },

    time: (label: string) => {
      if (isDevelopment) {
        console.time(`${timerPrefix}${label}`);
      }
    },

    timeEnd: (label: string) => {
      if (isDevelopment) {
        console.timeEnd(`${timerPrefix}${label}`);
      }
    },
  };
}

// Default logger instance (no namespace)
export const logger = createLogger();

// Pre-configured loggers for common use cases
export const chatLogger = createLogger("Chat");
export const apiLogger = createLogger("API");
export const storageLogger = createLogger("Storage");
export const videoLogger = createLogger("Video");
export const analysisLogger = createLogger("Analysis");
export const authLogger = createLogger("Auth");
export const profileLogger = createLogger("Profile");
export const detectionLogger = createLogger("Detection");
export const audioLogger = createLogger("Audio");
export const feedbackLogger = createLogger("Feedback");
