/**
 * Utility for generating contextual help questions based on term type
 */

import {
  sharedSwings, tennisSwings, pickleballSwings, padelSwings,
  sharedTerminology, tennisTerminology, pickleballTerminology, padelTerminology,
  sharedTechnique, tennisCourts, pickleballCourts, padelCourts,
} from "@/database";

const allSwings = { ...sharedSwings, ...tennisSwings, ...pickleballSwings, ...padelSwings };
const allCourts = { ...tennisCourts, ...pickleballCourts, ...padelCourts };
const allTerminology = { ...sharedTerminology, ...tennisTerminology, ...pickleballTerminology, ...padelTerminology };

/**
 * Generate a contextual help question based on the term type
 */
export function generateHelpQuestion(termName: string): string {
  const lowerTermName = termName.toLowerCase();
  
  const isSwing = Object.keys(allSwings).some(key => key.toLowerCase() === lowerTermName);
  const isTechnique = Object.keys(sharedTechnique).some(key => key.toLowerCase() === lowerTermName);
  const isCourt = Object.keys(allCourts).some(key => key.toLowerCase() === lowerTermName);
  const isTerminology = Object.keys(allTerminology).some(key => key.toLowerCase() === lowerTermName);
  
  if (isSwing) {
    return `Can you give me tips for improving my ${termName.toLowerCase()} swing?`;
  } else if (isTechnique) {
    return `Can you explain how to improve my ${termName.toLowerCase()} technique?`;
  } else if (isCourt) {
    return `What strategies should I use when playing on a ${termName.toLowerCase()}?`;
  } else if (isTerminology) {
    return `Can you explain more about ${termName.toLowerCase()} and how to use it effectively in my game?`;
  }
  
  return `Can you give me tips about ${termName.toLowerCase()} in game?`;
}














