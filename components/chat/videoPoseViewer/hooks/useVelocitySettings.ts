import { useState } from "react";

interface UseVelocitySettingsProps {
  initialShowVelocity?: boolean;
  initialVelocityWrist?: "left" | "right";
}

/**
 * useVelocitySettings - Manages velocity measurement display settings
 * 
 * Simple hook for velocity display toggles and wrist selection.
 * Works alongside useVelocityTracking which handles the calculations.
 */
export function useVelocitySettings({
  initialShowVelocity = false,
  initialVelocityWrist = "right",
}: UseVelocitySettingsProps = {}) {
  const [showVelocity, setShowVelocity] = useState(initialShowVelocity);
  const [velocityWrist, setVelocityWrist] = useState<"left" | "right">(initialVelocityWrist);

  return {
    showVelocity,
    setShowVelocity,
    velocityWrist,
    setVelocityWrist,
  };
}

