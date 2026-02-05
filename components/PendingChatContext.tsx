"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { ThinkingMode, MediaResolution, DomainExpertise } from "@/utils/storage";
import type { VideoPreAnalysis } from "@/types/chat";

/**
 * Pending submission data that needs to survive navigation from home to chat page.
 * This allows the home page to collect user input, then navigate to /chat
 * where the actual chat creation and submission happens.
 */
export interface PendingSubmission {
  prompt: string;
  videoFile?: File;
  videoPreview?: string;
  detectedVideoUrl?: string;
  /** Pre-analysis data from home page - avoids re-analyzing on /chat */
  videoPreAnalysis?: VideoPreAnalysis | null;
  /** Whether the video needs server-side conversion (MOV, HEVC, etc.) */
  needsServerConversion?: boolean;
  settings?: {
    thinkingMode: ThinkingMode;
    mediaResolution: MediaResolution;
    domainExpertise: DomainExpertise;
  };
}

interface PendingChatContextType {
  pendingSubmission: PendingSubmission | null;
  setPendingSubmission: (submission: PendingSubmission) => void;
  clearPendingSubmission: () => void;
}

const PendingChatContext = createContext<PendingChatContextType | undefined>(undefined);

export function PendingChatProvider({ children }: { children: ReactNode }) {
  const [pendingSubmission, setPendingSubmissionState] = useState<PendingSubmission | null>(null);

  const setPendingSubmission = useCallback((submission: PendingSubmission) => {
    setPendingSubmissionState(submission);
  }, []);

  const clearPendingSubmission = useCallback(() => {
    setPendingSubmissionState(null);
  }, []);

  return (
    <PendingChatContext.Provider
      value={{
        pendingSubmission,
        setPendingSubmission,
        clearPendingSubmission,
      }}
    >
      {children}
    </PendingChatContext.Provider>
  );
}

export function usePendingChat() {
  const context = useContext(PendingChatContext);
  if (context === undefined) {
    throw new Error("usePendingChat must be used within a PendingChatProvider");
  }
  return context;
}
