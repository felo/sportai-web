"use client";

import { useState, useEffect } from "react";
import { Flex, Text, Box } from "@radix-ui/themes";

interface ThinkingIndicatorProps {
  message: string;
  showProgressBar?: boolean;
  uploadProgress?: number; // Actual upload progress (0-100), overrides time-based estimate
}

/**
 * Animated thinking indicator with rotating dots and optional progress bar
 */
export function ThinkingIndicator({ message, showProgressBar = false, uploadProgress }: ThinkingIndicatorProps) {
  const [progress, setProgress] = useState(5);
  
  // Progress bar animation - use actual uploadProgress if available, otherwise time-based estimate
  useEffect(() => {
    // If we have actual upload progress, use it directly
    if (uploadProgress !== undefined) {
      setProgress(uploadProgress);
      return;
    }
    
    // Time-based estimate for analyzing stage (30 second estimate)
    if (!showProgressBar) return;
    
    const startTime = Date.now();
    const ESTIMATED_DURATION = 30; // seconds
    
    const interval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const linearProgress = Math.min(elapsedSeconds / ESTIMATED_DURATION, 1);
      
      // Linear progression - bar fills proportionally to time elapsed
      // Starts at 5%, caps at 95% (leaves room for completion surprise)
      const displayProgress = 5 + (linearProgress * 90);
      
      setProgress(displayProgress);
      
      if (linearProgress >= 1) {
        clearInterval(interval);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [showProgressBar, uploadProgress]);

  return (
    <Box style={{ width: "100%" }}>
      {/* Progress Bar - shown for video analysis */}
      {showProgressBar && (
        <Box style={{ marginBottom: "16px" }}>
          {/* Progress Bar Container - fixed 320px width */}
          <div
            style={{
              position: "relative",
              width: "320px",
              height: "12px",
              borderRadius: "6px",
              backgroundColor: "#374151",
              overflow: "hidden",
              marginBottom: "8px",
            }}
          >
            {/* Progress Fill */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: `${progress}%`,
                minWidth: "12px",
                background: "linear-gradient(90deg, #10b981, #34d399, #6ee7b7)",
                borderRadius: "6px",
                transition: "width 0.1s linear",
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.6), 0 0 10px rgba(16, 185, 129, 0.4)",
              }}
            />
            
            {/* Animated shine effect */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                animation: "shine 2s infinite",
              }}
            />
          </div>
        </Box>
      )}

      {/* Thinking dots and message */}
      <Flex gap="2" align="center">
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          marginRight: "4px",
        }}>
          <span className="thinking-dot" style={{ animationDelay: "0s" }}></span>
          <span className="thinking-dot" style={{ animationDelay: "0.2s" }}></span>
          <span className="thinking-dot" style={{ animationDelay: "0.4s" }}></span>
        </div>
        <Text color="gray">{message}</Text>
      </Flex>

      <style jsx>{`
        .thinking-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--accent-9);
          animation: thinkingPulse 1.4s ease-in-out infinite;
          display: block;
        }

        @keyframes thinkingPulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1) translateY(0);
          }
          30% {
            opacity: 1;
            transform: scale(1.2) translateY(-6px);
          }
          60% {
            opacity: 0.4;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </Box>
  );
}

