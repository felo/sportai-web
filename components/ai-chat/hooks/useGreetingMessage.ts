"use client";

import { useEffect, useRef, useState } from "react";
import type { Message, CandidateOption } from "@/types/chat";
import { getCurrentChatId } from "@/utils/storage-unified";

// =============================================================================
// Shared message content - defined once, reused across options
// =============================================================================

const MESSAGES = {
  showExamples: "I have a few demo analyses ready for you to explore. Pick one to see what SportAI can do:",
  howItWorks: "Upload a tennis, padel, or pickleball video and I'll break it down frame by frame.\n\nI use the SportAI AI Platform to track players and the ball, then provide specific feedback on what you're doing well and what to improve.\n\nReady to try it? Don't be shy. Drop a video below, or check out the examples.",
  uploadVideo: "Perfect! Drag and drop your video here or click the **+** button below.\n\nFor best results, use a video where the player or the full court is clearly visible (see examples). I'll analyze technique, movement, and tactics automatically.\n\nI'm best with racket sports like Tennis, Padel and Pickleball, but able to analyze other sports as well.",
  greeting: "Greetings! Upload a sports video and get instant AI analysis.",
} as const;

// =============================================================================
// Demo video options
// =============================================================================

const DEMO_VIDEO_OPTIONS: CandidateOption[] = [
  {
    id: "demo-tennis-serve",
    text: "Tennis serve technique analysis",
    premadeResponse: "Analyzing the tennis serve demo...",
    demoVideoUrl: "https://res.cloudinary.com/djtxhrly7/video/upload/v1763677270/Serve.mp4",
  },
  {
    id: "demo-padel-match",
    text: "Padel match (10 min, back camera)",
    premadeResponse: "Analyzing the padel match demo...\n\nThis 10-minute doubles match will show tactical analysis including court positioning, shot selection, and movement patterns.",
    demoVideoS3Key: "test/1765293768560_nthug5r97_3g2AQVBSF1M_003.mp4",
  },
  {
    id: "demo-tennis-match",
    text: "Tennis match (10 min, back camera)",
    premadeResponse: "Great choice! Loading the Tennis match analysis...\n\nThis demo shows full match analysis including rally patterns, court coverage, and strategic insights.",
    // TODO: Add demoVideoUrl when ready
  },
];

// =============================================================================
// Reusable option builders
// =============================================================================

const createUploadVideoOption = (
  id: string,
  followUpOptions?: CandidateOption[]
): CandidateOption => ({
  id,
  text: "I have a video to upload",
  premadeResponse: MESSAGES.uploadVideo,
  followUpOptions,
});

const createShowExamplesOption = (id: string): CandidateOption => ({
  id,
  text: "Show me some examples",
  premadeResponse: MESSAGES.showExamples,
  followUpOptions: DEMO_VIDEO_OPTIONS,
});

const createHowItWorksOption = (
  id: string,
  followUpOptions?: CandidateOption[]
): CandidateOption => ({
  id,
  text: "How does it work?",
  premadeResponse: MESSAGES.howItWorks,
  followUpOptions,
});

// =============================================================================
// Composed option sets
// =============================================================================

// Terminal follow-up options (no further nesting to avoid circular references)
// After 2 levels of follow-up, users can type or use the main input
const TERMINAL_FOLLOW_UP_OPTIONS: CandidateOption[] = [
  createUploadVideoOption("upload-video-terminal"),
  createShowExamplesOption("show-examples-terminal"),
];

// Follow-up options shown after "How does it work?"
const HOW_IT_WORKS_FOLLOW_UP_OPTIONS: CandidateOption[] = [
  createUploadVideoOption("upload-video-followup", [
    createShowExamplesOption("show-examples-followup-3"),
  ]),
  createShowExamplesOption("show-examples-followup-2"),
];

// Follow-up options shown after "I have a video to upload"
const UPLOAD_FOLLOW_UP_OPTIONS: CandidateOption[] = [
  createShowExamplesOption("show-examples-followup"),
  // Use terminal options instead of circular reference
  createHowItWorksOption("how-it-works-followup", TERMINAL_FOLLOW_UP_OPTIONS),
];

// The greeting options for new chats
const GREETING_OPTIONS: CandidateOption[] = [
  createUploadVideoOption("upload-video", UPLOAD_FOLLOW_UP_OPTIONS),
  createShowExamplesOption("show-examples"),
  createHowItWorksOption("how-it-works", HOW_IT_WORKS_FOLLOW_UP_OPTIONS),
];

interface UseGreetingMessageProps {
  messages: Message[];
  isHydrated: boolean;
  loading: boolean;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
}

/**
 * Adds an initial greeting message with candidate responses when the chat is empty.
 * The greeting has a typewriter effect for a polished feel.
 */
export function useGreetingMessage({
  messages,
  isHydrated,
  loading,
  addMessage,
  updateMessage,
}: UseGreetingMessageProps) {
  // Track current chat ID to detect changes
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  // Track which chat we've added a greeting to
  const greetingAddedForChatRef = useRef<string | null>(null);
  // Use ref for messages length to avoid re-triggering effect
  const messagesLengthRef = useRef(messages.length);
  
  // Keep messages length ref updated
  useEffect(() => {
    messagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Listen for chat changes
  useEffect(() => {
    const updateChatId = () => {
      const chatId = getCurrentChatId();
      setCurrentChatId(chatId ?? null);
    };

    // Set initial chat ID
    updateChatId();

    // Listen for chat changes
    window.addEventListener("chat-storage-change", updateChatId);
    return () => {
      window.removeEventListener("chat-storage-change", updateChatId);
    };
  }, []);

  // Effect to add the greeting when chat is empty
  useEffect(() => {
    // Don't proceed if not ready
    if (!isHydrated || loading || !currentChatId) {
      return;
    }

    // Skip if messages already exist
    if (messagesLengthRef.current > 0) {
      return;
    }

    // Skip if we already added greeting for this chat
    if (greetingAddedForChatRef.current === currentChatId) {
      return;
    }

    // Mark that we're adding greeting for this chat
    greetingAddedForChatRef.current = currentChatId;

    // Add the intro text with typewriter effect
    const introMessageId = crypto.randomUUID();
    const fullGreeting = MESSAGES.greeting;
    const typingSpeed = 15; // ms per character
    
    // Start with first character to avoid ThinkingIndicator
    const introMessage: Message = {
      id: introMessageId,
      role: "assistant",
      content: fullGreeting.charAt(0),
      isGreeting: true,
      isStreaming: true,
    };
    addMessage(introMessage);

    // Typewriter effect for greeting
    let charIndex = 1;
    const typeNextChar = () => {
      if (charIndex < fullGreeting.length) {
        updateMessage(introMessageId, {
          content: fullGreeting.substring(0, charIndex + 1),
          isStreaming: charIndex + 1 < fullGreeting.length,
        });
        charIndex++;
        setTimeout(typeNextChar, typingSpeed);
      } else {
        // After typing completes, add the candidate options
        setTimeout(() => {
          const optionsMessageId = crypto.randomUUID();
          const optionsMessage: Message = {
            id: optionsMessageId,
            role: "assistant",
            content: "", // Empty content = right-aligned options
            messageType: "candidate_responses",
            isGreeting: true,
            candidateResponses: {
              options: GREETING_OPTIONS,
              selectedIndex: undefined,
            },
          };
          addMessage(optionsMessage);
        }, 200); // Small delay after typing completes before showing options
      }
    };
    
    setTimeout(typeNextChar, typingSpeed);
  }, [isHydrated, loading, currentChatId, addMessage, updateMessage]);
}

// Export the options for use elsewhere if needed
export { GREETING_OPTIONS };
