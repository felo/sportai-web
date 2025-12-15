"use client";

import { useState, useEffect, useMemo } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";

// =============================================================================
// Follow-up question suggestions after video analysis
// Organized by sport and category (technique vs tactics)
// =============================================================================

type Sport = "tennis" | "pickleball" | "padel" | "other";

// -----------------------------------------------------------------------------
// TENNIS QUESTIONS
// -----------------------------------------------------------------------------

const TENNIS_TECHNIQUE_QUESTIONS = [
  "How's the serve technique?",
  "Analyze the forehand swing path",
  "What about the backhand?",
  "How's the volley technique?",
  "Check the overhead smash",
  "Is the grip correct?",
  "How's the follow-through?",
  "What's happening at contact point?",
  "Is there enough shoulder rotation?",
  "How's the racket preparation?",
  "Is the stance correct?",
  "Check the wrist position",
  "How's the trophy position on serve?",
  "Analyze the ball toss",
  "Create a 3-week training plan",
];

const TENNIS_TACTICS_QUESTIONS = [
  "What patterns do you see in the play?",
  "How's the court positioning?",
  "Where are points being lost?",
  "How can consistency be improved?",
  "What's the shot selection like?",
  "Is recovery good after shots?",
  "How's the footwork between shots?",
  "Where should serves be aimed?",
  "Is the net approach correct?",
  "What's causing the unforced errors?",
  "How can more winners be generated?",
  "Check the split step timing",
  "Create a 3-week training plan",
];

// -----------------------------------------------------------------------------
// PICKLEBALL QUESTIONS
// -----------------------------------------------------------------------------

const PICKLEBALL_TECHNIQUE_QUESTIONS = [
  "How's the dink technique?",
  "Analyze the third shot drop",
  "Check the paddle position",
  "How's the drive technique?",
  "Is the grip pressure right?",
  "How's the soft game?",
  "Check the volley form",
  "Is the paddle being kept up?",
  "How's the backhand dink?",
  "Analyze the reset shots",
  "Is the follow-through correct?",
  "Check the body rotation",
  "Create a 3-week training plan",
];

const PICKLEBALL_TACTICS_QUESTIONS = [
  "How's the kitchen line positioning?",
  "Is stacking being done correctly?",
  "When should they speed up vs reset?",
  "How's the transition game?",
  "Where are openings being left?",
  "Check the court coverage",
  "Is there enough patience at the net?",
  "How's the serve placement?",
  "When should they attack?",
  "Are opponents being read well?",
  "How's the partner communication?",
  "Where should returns be aimed?",
  "Create a 3-week training plan",
];

// -----------------------------------------------------------------------------
// PADEL QUESTIONS
// -----------------------------------------------------------------------------

const PADEL_TECHNIQUE_QUESTIONS = [
  "How's the bandeja technique?",
  "Analyze the vibora",
  "Check the smash form",
  "How's the wall play?",
  "Is the volley technique good?",
  "How's the lob execution?",
  "Check the chiquita shot",
  "Are the walls being used correctly?",
  "How's the forehand bajada?",
  "Analyze the glass rebounds",
  "Is the grip right for padel?",
  "Check the continental grip",
  "Create a 3-week training plan",
];

const PADEL_TACTICS_QUESTIONS = [
  "How's the net positioning?",
  "Are the walls being used strategically?",
  "Where should lobs be aimed?",
  "How's the defensive positioning?",
  "When should bandeja vs vibora be played?",
  "Check recovery after smash",
  "Is side switching done correctly?",
  "How's the serving strategy?",
  "Where are points being lost?",
  "How can more pressure be put on opponents?",
  "Are the glass plays being read?",
  "Check the doubles communication",
  "Create a 3-week training plan",
];

// -----------------------------------------------------------------------------
// GENERIC QUESTIONS (when sport is "other" or unknown)
// -----------------------------------------------------------------------------

const GENERIC_TECHNIQUE_QUESTIONS = [
  "What technique improvements are needed?",
  "How's the form looking?",
  "How can more power be generated?",
  "Is there enough rotation?",
  "Check the body position",
  "How's the timing?",
  "Create a 3-week training plan",
];

const GENERIC_TACTICS_QUESTIONS = [
  "What patterns do you see?",
  "How's the positioning?",
  "Where are points being lost?",
  "How can consistency be improved?",
  "What's causing the errors?",
  "How's the footwork?",
  "Is recovery good after shots?",
  "What should be focused on first?",
  "Suggest one drill to practice",
  "What's the biggest weakness?",
  "How does this compare to pros?",
  "What's an easy win here?",
  "Create a 3-week training plan",
];

// -----------------------------------------------------------------------------
// Question selector by sport
// -----------------------------------------------------------------------------

function getQuestionsForSport(sport: Sport): string[] {
  switch (sport) {
    case "tennis":
      return [...TENNIS_TECHNIQUE_QUESTIONS, ...TENNIS_TACTICS_QUESTIONS];
    case "pickleball":
      return [...PICKLEBALL_TECHNIQUE_QUESTIONS, ...PICKLEBALL_TACTICS_QUESTIONS];
    case "padel":
      return [...PADEL_TECHNIQUE_QUESTIONS, ...PADEL_TACTICS_QUESTIONS];
    default:
      return [...GENERIC_TECHNIQUE_QUESTIONS, ...GENERIC_TACTICS_QUESTIONS];
  }
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

interface FollowUpSuggestionsProps {
  onSelect: (question: string) => void;
  sport?: Sport;
  maxSuggestions?: number;
}

/**
 * Vertical list of follow-up question suggestions
 * Appears after video analysis to encourage deeper exploration
 * Questions are tailored to the detected sport
 */
export function FollowUpSuggestions({
  onSelect,
  sport = "other",
  maxSuggestions = 3,
}: FollowUpSuggestionsProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Get sport-specific questions, randomize, and limit
  const randomizedQuestions = useMemo(() => {
    const questions = getQuestionsForSport(sport);
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, maxSuggestions);
  }, [sport, maxSuggestions]);

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // TEMPORARILY DISABLED - remove this block to re-enable
  if (true) {
    return null;
  }

  return (
    <Box style={{ marginTop: "var(--space-3)", width: "100%", paddingRight: "var(--space-4)" }}>
      <Flex 
        direction="column"
        align="end"
        gap="2"
        style={{
          width: "100%",
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.4s ease-out",
        }}
      >
        {randomizedQuestions.map((question, index) => (
          <Box
            key={`${question}-${index}`}
            onClick={() => onSelect(question)}
            style={{
              cursor: "pointer",
              borderRadius: "24px 8px 24px 24px",
              padding: "var(--space-3) var(--space-4)",
              border: "2px solid white",
              backgroundColor: "#7ADB8F",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2)",
              transition: "all 0.3s ease-out",
            }}
            className="follow-up-suggestion-card"
          >
            <Text 
              size="2"
              weight="medium"
              style={{ color: "#1C1C1C" }}
            >
              {question}
            </Text>
          </Box>
        ))}
      </Flex>

      <style jsx>{`
        :global(.follow-up-suggestion-card) {
          transition: all 0.3s ease-out;
        }
        :global(.follow-up-suggestion-card:hover) {
          transform: translateY(-2px);
          background-color: #95E5A6 !important;
          box-shadow: 
            0 0 20px rgba(122, 219, 143, 0.6),
            0 0 40px rgba(122, 219, 143, 0.4),
            0 4px 16px rgba(122, 219, 143, 0.5) !important;
        }
      `}</style>
    </Box>
  );
}

// Export questions for testing or external use
export {
  TENNIS_TECHNIQUE_QUESTIONS,
  TENNIS_TACTICS_QUESTIONS,
  PICKLEBALL_TECHNIQUE_QUESTIONS,
  PICKLEBALL_TACTICS_QUESTIONS,
  PADEL_TECHNIQUE_QUESTIONS,
  PADEL_TACTICS_QUESTIONS,
  GENERIC_TECHNIQUE_QUESTIONS,
  GENERIC_TACTICS_QUESTIONS,
};

