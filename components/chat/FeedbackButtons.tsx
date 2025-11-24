"use client";

import { useState } from "react";
import { Flex, IconButton } from "@radix-ui/themes";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface FeedbackButtonsProps {
  messageId: string;
  onFeedback?: (messageId: string, feedback: "up" | "down") => void;
}

export function FeedbackButtons({ messageId, onFeedback }: FeedbackButtonsProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<"up" | "down" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleFeedback = (feedback: "up" | "down") => {
    setSelectedFeedback(feedback);
    
    if (feedback === "up") {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }
    
    onFeedback?.(messageId, feedback);
  };

  return (
    <Flex gap="3" align="center">
      <IconButton
        size="1"
        variant="ghost"
        color="gray"
        onClick={() => handleFeedback("up")}
        disabled={selectedFeedback !== null}
        style={{
          cursor: selectedFeedback !== null ? "default" : "pointer",
          opacity: selectedFeedback === "down" ? 0.3 : 1,
          color: selectedFeedback === "up" ? "var(--mint-11)" : undefined,
          transition: "opacity 0.2s ease, color 0.2s ease",
        }}
        className={isAnimating ? "feedback-bounce" : ""}
        aria-label="Thumbs up"
      >
        <ThumbsUp 
          size={15} 
          fill={selectedFeedback === "up" ? "currentColor" : "none"}
          strokeWidth={1.5}
        />
      </IconButton>

      <IconButton
        size="1"
        variant="ghost"
        color="gray"
        onClick={() => handleFeedback("down")}
        disabled={selectedFeedback !== null}
        style={{
          cursor: selectedFeedback !== null ? "default" : "pointer",
          opacity: selectedFeedback === "up" ? 0.3 : 1,
          color: selectedFeedback === "down" ? "var(--mint-11)" : undefined,
          transition: "opacity 0.2s ease, color 0.2s ease",
        }}
        aria-label="Thumbs down"
      >
        <ThumbsDown 
          size={15} 
          strokeWidth={1.5}
        />
      </IconButton>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.2);
          }
          50% {
            transform: scale(0.9);
          }
          75% {
            transform: scale(1.1);
          }
        }

        :global(.feedback-bounce) {
          animation: bounce 0.6s ease;
        }
      `}</style>
    </Flex>
  );
}

