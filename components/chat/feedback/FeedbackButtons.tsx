"use client";

import { useState } from "react";
import { Flex, IconButton } from "@radix-ui/themes";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { feedbackLogger } from "@/lib/logger";
import { FeedbackModal, type FeedbackData } from "./FeedbackModal";
import { supabase, getUser } from "@/lib/supabase";

interface FeedbackButtonsProps {
  messageId: string;
  chatId?: string;
  messageContent?: string;
  onFeedback?: (messageId: string, feedback: "up" | "down") => void;
}

export function FeedbackButtons({ 
  messageId, 
  chatId,
  messageContent,
  onFeedback 
}: FeedbackButtonsProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<"up" | "down" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingFeedbackType, setPendingFeedbackType] = useState<"up" | "down" | null>(null);

  const handleFeedbackClick = (feedback: "up" | "down") => {
    setPendingFeedbackType(feedback);
    setIsModalOpen(true);
  };

  const handleFeedbackSubmit = async (data: FeedbackData) => {
    try {
      // Get current user (may be null for anonymous)
      const user = await getUser();
      
      // Submit feedback to database
      const insertData = {
        message_id: messageId,
        user_id: user?.id || null,
        feedback_type: data.feedbackType,
        reasons: data.reasons,
        comment: data.comment || null,
        chat_id: chatId || null,
        message_content: messageContent || null,
      };
      
      feedbackLogger.debug("Submitting feedback:", insertData);
      
      const { data: result, error } = await supabase
        .from("message_feedback")
        .insert(insertData)
        .select();

      if (error) {
        feedbackLogger.error("Failed to save feedback:", {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }
      
      feedbackLogger.debug("Feedback saved successfully:", result);

      // Update UI state
      setSelectedFeedback(data.feedbackType);
      
      if (data.feedbackType === "up") {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 600);
      }
      
      // Notify parent component
      onFeedback?.(messageId, data.feedbackType);
    } catch (error) {
      feedbackLogger.error("Error submitting feedback:", error);
      throw error;
    }
  };

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setPendingFeedbackType(null);
    }
  };

  return (
    <>
      <Flex gap="3" align="center">
        <IconButton
          size="1"
          variant="ghost"
          color="gray"
          onClick={() => handleFeedbackClick("up")}
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
          onClick={() => handleFeedbackClick("down")}
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

      {pendingFeedbackType && (
        <FeedbackModal
          open={isModalOpen}
          onOpenChange={handleModalClose}
          feedbackType={pendingFeedbackType}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </>
  );
}
