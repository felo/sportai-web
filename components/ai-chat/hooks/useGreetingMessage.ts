"use client";

import { useEffect, useRef, useState } from "react";
import type { Message, CandidateOption } from "@/types/chat";
import { getCurrentChatId } from "@/utils/storage-unified";
import { useAuth } from "@/components/auth/AuthProvider";
import { hasCompletedInsightOnboarding } from "@/utils/storage";
import { generateMessageId } from "../utils";

// =============================================================================
// Shared message content - defined once, reused across options
// =============================================================================

const MESSAGES = {
  showExamples: "I have a few demo analyses ready for you to explore. Pick one to see what SportAI can do:",
  howItWorks: "Upload a tennis, padel, or pickleball video and I'll break it down frame by frame.\n\nI use the SportAI AI Platform to track players and the ball, then provide specific feedback on what you're doing well and what to improve.\n\nReady to try it? Don't be shy. Drop a video below, or check out the examples.",
  uploadVideo: "Perfect! Drag and drop your video here or click the **+** button below.\n\nFor best results, use a video where the player or the full court is clearly visible (see examples). I'll analyze technique, movement, and tactics automatically.\n\nI'm best with racket sports like Tennis, Padel and Pickleball, but able to analyze other sports as well.",
  greetingSignedOut: "Greetings! Upload a sports video and get instant AI analysis, and remember to create a free account to store videos, access advanced features, and tailor the AI to you.",
  // Onboarding responses for each insight level
  onboardingBeginnerResponse: "Perfect! I'll keep things simple and focus on one tip at a time. No jargon, just clear advice you can use right away.\n\nNow let's get started!",
  onboardingDevelopingResponse: "Great! I'll give you more detailed breakdowns with some technical terms explained along the way.\n\nLet's dive in!",
  onboardingAdvancedResponse: "You got it! Expect comprehensive analysis with angles, timing, and pro-level comparisons.\n\nLet's get technical!",
} as const;

// Dynamic greeting for signed-in users
const getSignedInGreeting = (name: string) => 
  `Hi ${name}! Ready to analyze some more videos?`;

// Onboarding greeting for first-time signed-in users
const getOnboardingGreeting = (name: string) =>
  `Hi ${name}, now that you've signed in, let me tailor my responses better to your needs.\n\nHow detailed would you like me to be when answering?`;

// =============================================================================
// Demo video options
// =============================================================================

const DEMO_VIDEO_OPTIONS: CandidateOption[] = [
  {
    id: "demo-tennis-serve",
    text: "Technique Analysis of a Tennis Serve",
    premadeResponse: "Analyzing the Tennis Serve Demo video...",
    demoVideoUrl: "https://res.cloudinary.com/djtxhrly7/video/upload/v1763677270/Serve.mp4",
  },
  {
    id: "demo-padel-match",
    text: "Padel Match (Back-Mounted Camera)",
    premadeResponse: "Analyzing the Padel Match Demo video…",
    demoVideoUrl: "https://sportai-llm-uploads-public.s3.eu-north-1.amazonaws.com/samples/padel-analysis-match-sample.mp4",
    demoPoseDataUrl: "https://sportai-llm-uploads-public.s3.eu-north-1.amazonaws.com/samples/padel-analysis-match-sample.json",
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

const createSignInOption = (id: string): CandidateOption => ({
  id,
  text: "Sign In",
  premadeResponse: "", // Not used - action will trigger auth modal
  action: "sign_in",
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
// Insight Level Onboarding Options
// =============================================================================

// These are shown to first-time signed-in users to set their preferred detail level
// After selecting, they see the regular signed-in greeting options as follow-ups
const createInsightLevelOptions = (followUpOptions: CandidateOption[]): CandidateOption[] => [
  {
    id: "insight-beginner",
    text: "Let's keep it basic",
    description: "Simple tips, no jargon",
    premadeResponse: MESSAGES.onboardingBeginnerResponse,
    action: "set_insight_beginner",
    followUpOptions,
  },
  {
    id: "insight-developing",
    text: "I know the game",
    description: "More detail, some technical terms",
    premadeResponse: MESSAGES.onboardingDevelopingResponse,
    action: "set_insight_developing",
    followUpOptions,
  },
  {
    id: "insight-advanced",
    text: "Don't hold back, give me what you know",
    description: "Full analysis with all the metrics",
    premadeResponse: MESSAGES.onboardingAdvancedResponse,
    action: "set_insight_advanced",
    followUpOptions,
  },
];

// =============================================================================
// Composed option sets
// =============================================================================

// Terminal follow-up options (no further nesting to avoid circular references)
// After 2 levels of follow-up, users can type or use the main input
const TERMINAL_FOLLOW_UP_OPTIONS: CandidateOption[] = [
  createSignInOption("sign-in-terminal"),
  createShowExamplesOption("show-examples-terminal"),
];

// Follow-up options shown after "How does it work?"
const HOW_IT_WORKS_FOLLOW_UP_OPTIONS: CandidateOption[] = [
  createSignInOption("sign-in-followup-1"),
  createShowExamplesOption("show-examples-followup-2"),
];

// Follow-up options shown after "I have a video to upload"
const UPLOAD_FOLLOW_UP_OPTIONS: CandidateOption[] = [
  createShowExamplesOption("show-examples-followup"),
  // Use terminal options instead of circular reference
  createHowItWorksOption("how-it-works-followup", TERMINAL_FOLLOW_UP_OPTIONS),
];

// Terminal follow-up options for signed-in users (no sign-in needed)
const TERMINAL_FOLLOW_UP_OPTIONS_SIGNED_IN: CandidateOption[] = [
  createUploadVideoOption("upload-video-terminal"),
  createShowExamplesOption("show-examples-terminal-signed-in"),
];

// Follow-up options for signed-in users after "How does it work?"
const HOW_IT_WORKS_FOLLOW_UP_OPTIONS_SIGNED_IN: CandidateOption[] = [
  createUploadVideoOption("upload-video-followup-signed-in", [
    createShowExamplesOption("show-examples-followup-3"),
  ]),
  createShowExamplesOption("show-examples-followup-2-signed-in"),
];

// The greeting options for signed-out users (includes sign-in)
const GREETING_OPTIONS_SIGNED_OUT: CandidateOption[] = [
  createSignInOption("sign-in"),
  createShowExamplesOption("show-examples"),
  createHowItWorksOption("how-it-works", HOW_IT_WORKS_FOLLOW_UP_OPTIONS),
];

// The greeting options for signed-in users (no sign-in needed)
const GREETING_OPTIONS_SIGNED_IN: CandidateOption[] = [
  createUploadVideoOption("upload-video", UPLOAD_FOLLOW_UP_OPTIONS),
  createShowExamplesOption("show-examples-signed-in"),
  createHowItWorksOption("how-it-works-signed-in", HOW_IT_WORKS_FOLLOW_UP_OPTIONS_SIGNED_IN),
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
 * Personalizes the greeting for signed-in users.
 */
export function useGreetingMessage({
  messages,
  isHydrated,
  loading,
  addMessage,
  updateMessage,
}: UseGreetingMessageProps) {
  // Get auth state
  const { user, profile, loading: authLoading } = useAuth();
  
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
    // Don't proceed if not ready - wait for both chat and auth to be ready
    if (!isHydrated || loading || authLoading || !currentChatId) {
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

    // Determine greeting and options based on auth state and onboarding status
    const isSignedIn = !!user;
    const userName = profile?.full_name?.split(" ")[0] || "there"; // Use first name or "there"
    const needsOnboarding = isSignedIn && !hasCompletedInsightOnboarding();
    
    // Choose greeting and options based on state
    let fullGreeting: string;
    let greetingOptions: CandidateOption[];
    
    if (needsOnboarding) {
      // First-time signed-in user: show onboarding to set insight level
      fullGreeting = getOnboardingGreeting(userName);
      greetingOptions = createInsightLevelOptions(GREETING_OPTIONS_SIGNED_IN);
    } else if (isSignedIn) {
      // Returning signed-in user: show regular greeting
      fullGreeting = getSignedInGreeting(userName);
      greetingOptions = GREETING_OPTIONS_SIGNED_IN;
    } else {
      // Signed-out user
      fullGreeting = MESSAGES.greetingSignedOut;
      greetingOptions = GREETING_OPTIONS_SIGNED_OUT;
    }

    // Add the intro text with typewriter effect
    const introMessageId = generateMessageId();
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
          const optionsMessageId = generateMessageId();
          const optionsMessage: Message = {
            id: optionsMessageId,
            role: "assistant",
            content: "", // Empty content = right-aligned options
            messageType: "candidate_responses",
            isGreeting: true,
            candidateResponses: {
              options: greetingOptions,
              selectedIndex: undefined,
            },
          };
          addMessage(optionsMessage);
          
          // If user is signed in but has no name, add profile completion prompt
          const needsProfileCompletion = isSignedIn && !profile?.full_name;
          if (needsProfileCompletion) {
            setTimeout(() => {
              const profilePromptId = generateMessageId();
              const profilePromptMessage: Message = {
                id: profilePromptId,
                role: "assistant",
                content: "",
                messageType: "profile_completion_prompt",
                isGreeting: true,
              };
              addMessage(profilePromptMessage);
            }, 300); // Small delay after options appear
          }
        }, 200); // Small delay after typing completes before showing options
      }
    };
    
    setTimeout(typeNextChar, typingSpeed);
  }, [isHydrated, loading, authLoading, currentChatId, addMessage, updateMessage, user, profile]);
}

// Export the options for use elsewhere if needed
export { GREETING_OPTIONS_SIGNED_IN, GREETING_OPTIONS_SIGNED_OUT };
