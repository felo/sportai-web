"use client";

import { chatLogger } from "@/lib/logger";

/**
 * StreamingIndicator Component
 * 
 * Displays a ChatGPT-style animated indicator while AI is streaming text.
 * Shows three pulsing dots that fade in and out sequentially.
 */
export function StreamingIndicator() {
  chatLogger.debug("[StreamingIndicator] Component rendered");
  
  return (
    <div 
      style={{
        display: "flex",
        alignItems: "center",
        marginTop: "12px",
        padding: "8px 0",
        minHeight: "24px",
      }}
      role="status"
      aria-label="AI is typing"
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        height: "24px",
      }}>
        <span className="streaming-dot" style={{ animationDelay: "0s" }}></span>
        <span className="streaming-dot" style={{ animationDelay: "0.2s" }}></span>
        <span className="streaming-dot" style={{ animationDelay: "0.4s" }}></span>
      </div>

      <style jsx>{`
        .streaming-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: var(--accent-9);
          animation: streamingPulse 1.4s ease-in-out infinite;
          display: block;
        }

        @keyframes streamingPulse {
          0%, 60%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          30% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}

